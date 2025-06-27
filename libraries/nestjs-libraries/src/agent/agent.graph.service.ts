import { Injectable } from '@nestjs/common';
import {
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI, DallEAPIWrapper } from '@langchain/openai';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import dayjs from 'dayjs';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { z } from 'zod';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { GeneratorDto } from '@gitroom/nestjs-libraries/dtos/generator/generator.dto';
import { PromptTemplatesService } from '@gitroom/nestjs-libraries/database/prisma/prompt-templates/prompt-templates.service';

const tools = !process.env.TAVILY_API_KEY
  ? []
  : [new TavilySearchResults({ maxResults: 3 })];
const toolNode = new ToolNode(tools);

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
  model: 'gpt-4.1',
  temperature: 0.7,
});

const dalle = new DallEAPIWrapper({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
  model: 'dall-e-3',
});

interface WorkflowChannelsState {
  messages: BaseMessage[];
  orgId: string;
  question: string;
  hook?: string;
  fresearch?: string;
  category?: string;
  topic?: string;
  date?: string;
  templateKey: 
    | 'one_short_personal'
    | 'one_short_company' 
    | 'one_long_personal'
    | 'one_long_company'
    | 'thread_short_personal'
    | 'thread_short_company'
    | 'thread_long_personal'
    | 'thread_long_company';
  content?: {
    content: string;
    website?: string;
    prompt?: string;
    image?: string;
  }[];
  isPicture?: boolean;
  popularPosts?: { content: string; hook: string }[];
}

const category = z.object({
  category: z.string().describe('The category for the post'),
});

const topic = z.object({
  topic: z.string().describe('The topic for the post'),
});

const hook = z.object({
  hook: z
    .string()
    .describe(
      'Hook for the new post, don\'t take it from "the request of the user"'
    ),
});

const contentZod = (
  isPicture: boolean,
  format: 'one_short' | 'one_long' | 'thread_short' | 'thread_long'
) => {
  const content = z.object({
    content: z.string().describe('Content for the new post'),
    website: z
      .string()
      .nullable()
      .optional()
      .describe(
        "Website for the new post if exists, If one of the post present a brand, website link must be to the root domain of the brand or don't include it, website url should contain the brand name"
      ),
    ...(isPicture
      ? {
          prompt: z
            .string()
            .describe(
              "Prompt to generate a picture for this post later, make sure it doesn't contain brand names and make it very descriptive in terms of style"
            ),
        }
      : {}),
  });

  return z.object({
    content:
      format === 'one_short' || format === 'one_long'
        ? content
        : z.array(content).min(2).describe(`Content for the new post`),
  });
};

@Injectable()
export class AgentGraphService {
  private storage = UploadFactory.createStorage();
  constructor(
    private _postsService: PostsService,
    private _mediaService: MediaService,
    private _promptTemplatesService: PromptTemplatesService
  ) {}

  private getFormatFromTemplateKey(templateKey: string): string {
    // Extract format from templateKey (e.g., 'one_short_personal' -> 'one_short')
    const parts = templateKey.split('_');
    return parts.slice(0, -1).join('_');
  }

  private getToneFromTemplateKey(templateKey: string): string {
    // Extract tone from templateKey (e.g., 'one_short_personal' -> 'personal')
    const parts = templateKey.split('_');
    return parts[parts.length - 1];
  }
  static state = () =>
    new StateGraph<WorkflowChannelsState>({
      channels: {
        messages: {
          reducer: (currentState: any, updateValue: any) =>
            currentState.concat(updateValue),
          default: (): any[] => [],
        },
        fresearch: null,
        templateKey: null,
        question: null,
        orgId: null,
        hook: null,
        content: null,
        date: null,
        category: null,
        popularPosts: null,
        topic: null,
        isPicture: null,
      },
    });

  async startCall(state: WorkflowChannelsState) {
    const runTools = model.bindTools(tools);
    
    // Ensure default templates exist
    await this._promptTemplatesService.ensureDefaultTemplatesExist(state.orgId);
    
    // Get the research prompt from template
    const format = this.getFormatFromTemplateKey(state.templateKey);
    const tone = this.getToneFromTemplateKey(state.templateKey);
    const promptTemplate = await this._promptTemplatesService.getResearchPrompt(
      state.orgId,
      format,
      tone,
      {
        request: String(state.messages[state.messages.length - 1].content),
        research: '',
        currentDate: dayjs().format(),
      }
    );
    
    const response = await ChatPromptTemplate.fromTemplate(promptTemplate)
      .pipe(runTools)
      .invoke({
        text: state.messages[state.messages.length - 1].content,
      });

    return { messages: [response] };
  }

  async saveResearch(state: WorkflowChannelsState) {
    const content = state.messages.filter((f) => f instanceof ToolMessage);
    return { fresearch: content };
  }

  async findCategories(state: WorkflowChannelsState) {
    const allCategories = await this._postsService.findAllExistingCategories();
    const structuredOutput = model.withStructuredOutput(category);
    const { category: outputCategory } = await ChatPromptTemplate.fromTemplate(
      `
        You are an assistant that gets a text that will be later summarized into a social media post
        and classify it to one of the following categories: {categories}
        text: {text}
      `
    )
      .pipe(structuredOutput)
      .invoke({
        categories: allCategories.map((p) => p.category).join(', '),
        text: state.fresearch,
      });

    return {
      category: outputCategory,
    };
  }

  async findTopic(state: WorkflowChannelsState) {
    const allTopics = await this._postsService.findAllExistingTopicsOfCategory(
      state?.category!
    );
    if (allTopics.length === 0) {
      return { topic: null };
    }

    const structuredOutput = model.withStructuredOutput(topic);
    const { topic: outputTopic } = await ChatPromptTemplate.fromTemplate(
      `
        You are an assistant that gets a text that will be later summarized into a social media post
        and classify it to one of the following topics: {topics}
        text: {text}
      `
    )
      .pipe(structuredOutput)
      .invoke({
        topics: allTopics.map((p) => p.topic).join(', '),
        text: state.fresearch,
      });

    return {
      topic: outputTopic,
    };
  }

  async findPopularPosts(state: WorkflowChannelsState) {
    const popularPosts = await this._postsService.findPopularPosts(
      state.category!,
      state.topic
    );
    return { popularPosts };
  }

  async generateHook(state: WorkflowChannelsState) {
    const structuredOutput = model.withStructuredOutput(hook);
    
    // Get the hook prompt from template
    const format = this.getFormatFromTemplateKey(state.templateKey);
    const tone = this.getToneFromTemplateKey(state.templateKey);
    const promptTemplate = await this._promptTemplatesService.getHookPrompt(
      state.orgId,
      format,
      tone,
      {
        request: String(state.messages[0].content),
        research: String(state.fresearch),
        popularHooks: state.popularPosts!.map((p) => p.hook).join('\n'),
        currentDate: dayjs().format(),
      }
    );
    
    const { hook: outputHook } = await ChatPromptTemplate.fromTemplate(promptTemplate)
      .pipe(structuredOutput)
      .invoke({
        request: state.messages[0].content,
        hooks: state.popularPosts!.map((p) => p.hook).join('\n'),
        text: state.fresearch,
      });

    return {
      hook: outputHook,
    };
  }

  async generateContent(state: WorkflowChannelsState) {
    const format = this.getFormatFromTemplateKey(state.templateKey);
    const tone = this.getToneFromTemplateKey(state.templateKey);
    const structuredOutput = model.withStructuredOutput(
      contentZod(!!state.isPicture, format as any)
    );
    
    // Get the content prompt from template
    const promptTemplate = await this._promptTemplatesService.getContentPrompt(
      state.orgId,
      format,
      tone,
      {
        request: String(state.messages[0].content),
        research: String(state.fresearch),
        hook: state.hook!,
        currentDate: dayjs().format(),
      }
    );
    
    const { content: outputContent } = await ChatPromptTemplate.fromTemplate(promptTemplate)
      .pipe(structuredOutput)
      .invoke({
        hook: state.hook,
        request: state.messages[0].content,
        information: state.fresearch,
      });

    return {
      content: outputContent,
    };
  }

  async fixArray(state: WorkflowChannelsState) {
    const format = this.getFormatFromTemplateKey(state.templateKey);
    if (format === 'one_short' || format === 'one_long') {
      return {
        content: [state.content],
      };
    }

    return {};
  }

  async generatePictures(state: WorkflowChannelsState) {
    if (!state.isPicture) {
      return {};
    }

    const newContent = await Promise.all(
      (state.content || []).map(async (p) => {
        const image = await dalle.invoke(p.prompt!);
        return {
          ...p,
          image,
        };
      })
    );

    return {
      content: newContent,
    };
  }

  async uploadPictures(state: WorkflowChannelsState) {
    const all = await Promise.all(
      (state.content || []).map(async (p) => {
        if (p.image) {
          const upload = await this.storage.uploadSimple(p.image);
          const name = upload.split('/').pop()!;
          const uploadWithId = await this._mediaService.saveFile(
            state.orgId,
            name,
            upload
          );

          return {
            ...p,
            image: uploadWithId,
          };
        }

        return p;
      })
    );

    return { content: all };
  }

  async isGeneratePicture(state: WorkflowChannelsState) {
    if (state.isPicture) {
      return 'generate-picture';
    }

    return 'post-time';
  }

  async postDateTime(state: WorkflowChannelsState) {
    return { date: await this._postsService.findFreeDateTime(state.orgId) };
  }

  start(orgId: string, body: GeneratorDto) {
    const state = AgentGraphService.state();
    const workflow = state
      .addNode('agent', this.startCall.bind(this))
      .addNode('research', toolNode)
      .addNode('save-research', this.saveResearch.bind(this))
      .addNode('find-category', this.findCategories.bind(this))
      .addNode('find-topic', this.findTopic.bind(this))
      .addNode('find-popular-posts', this.findPopularPosts.bind(this))
      .addNode('generate-hook', this.generateHook.bind(this))
      .addNode('generate-content', this.generateContent.bind(this))
      .addNode('generate-content-fix', this.fixArray.bind(this))
      .addNode('generate-picture', this.generatePictures.bind(this))
      .addNode('upload-pictures', this.uploadPictures.bind(this))
      .addNode('post-time', this.postDateTime.bind(this))
      .addEdge(START, 'agent')
      .addEdge('agent', 'research')
      .addEdge('research', 'save-research')
      .addEdge('save-research', 'find-category')
      .addEdge('find-category', 'find-topic')
      .addEdge('find-topic', 'find-popular-posts')
      .addEdge('find-popular-posts', 'generate-hook')
      .addEdge('generate-hook', 'generate-content')
      .addEdge('generate-content', 'generate-content-fix')
      .addConditionalEdges(
        'generate-content-fix',
        this.isGeneratePicture.bind(this)
      )
      .addEdge('generate-picture', 'upload-pictures')
      .addEdge('upload-pictures', 'post-time')
      .addEdge('post-time', END);

    const app = workflow.compile();

    return app.streamEvents(
      {
        messages: [new HumanMessage(body.research)],
        isPicture: body.isPicture,
        templateKey: body.templateKey,
        orgId,
      },
      {
        streamMode: 'values',
        version: 'v2',
      }
    );
  }
}
