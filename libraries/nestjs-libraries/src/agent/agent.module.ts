import { Global, Module } from '@nestjs/common';
import { AgentGraphService } from '@gitroom/nestjs-libraries/agent/agent.graph.service';
import { AgentGraphInsertService } from '@gitroom/nestjs-libraries/agent/agent.graph.insert.service';
import { PromptTemplatesService } from '@gitroom/nestjs-libraries/database/prisma/prompt-templates/prompt-templates.service';
import { PromptTemplatesRepository } from '@gitroom/nestjs-libraries/database/prisma/prompt-templates/prompt-templates.repository';

@Global()
@Module({
  providers: [
    AgentGraphService, 
    AgentGraphInsertService, 
    PromptTemplatesService, 
    PromptTemplatesRepository
  ],
  get exports() {
    return this.providers;
  },
})
export class AgentModule {}
