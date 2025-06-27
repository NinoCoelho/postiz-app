import { Injectable } from '@nestjs/common';
import { PromptTemplatesRepository, CreatePromptTemplateDto, UpdatePromptTemplateDto } from './prompt-templates.repository';
import dayjs from 'dayjs';

export interface PromptPlaceholders {
  request: string;
  research: string;
  category?: string;
  topic?: string;
  hook?: string;
  popularHooks?: string;
  content?: string;
  currentDate: string;
}

@Injectable()
export class PromptTemplatesService {
  constructor(
    private _promptTemplatesRepository: PromptTemplatesRepository
  ) {}

  async getTemplateByKey(organizationId: string, templateKey: string) {
    return this._promptTemplatesRepository.getTemplateByKey(organizationId, templateKey);
  }

  async getAllTemplatesByOrganization(organizationId: string) {
    return this._promptTemplatesRepository.getAllTemplatesByOrganization(organizationId);
  }

  async createTemplate(organizationId: string, data: CreatePromptTemplateDto) {
    return this._promptTemplatesRepository.createTemplate(organizationId, data);
  }

  async updateTemplate(organizationId: string, templateKey: string, data: UpdatePromptTemplateDto) {
    return this._promptTemplatesRepository.updateTemplate(organizationId, templateKey, data);
  }

  async deleteTemplate(organizationId: string, templateKey: string) {
    return this._promptTemplatesRepository.deleteTemplate(organizationId, templateKey);
  }

  async createDefaultTemplatesForOrganization(organizationId: string) {
    return this._promptTemplatesRepository.createDefaultTemplatesForOrganization(organizationId);
  }

  async getResearchPrompt(organizationId: string, format: string, tone: string, placeholders: Partial<PromptPlaceholders>) {
    const templateKey = `${format}_${tone}`;
    const template = await this.getTemplateByKey(organizationId, templateKey);
    
    if (!template) {
      throw new Error(`Template not found for key: ${templateKey}`);
    }

    return this.replacePlaceholders(template.researchPrompt, {
      ...placeholders,
      currentDate: dayjs().format(),
    });
  }

  async getHookPrompt(organizationId: string, format: string, tone: string, placeholders: Partial<PromptPlaceholders>) {
    const templateKey = `${format}_${tone}`;
    const template = await this.getTemplateByKey(organizationId, templateKey);
    
    if (!template) {
      throw new Error(`Template not found for key: ${templateKey}`);
    }

    return this.replacePlaceholders(template.hookPrompt, {
      ...placeholders,
      currentDate: dayjs().format(),
    });
  }

  async getContentPrompt(organizationId: string, format: string, tone: string, placeholders: Partial<PromptPlaceholders>) {
    const templateKey = `${format}_${tone}`;
    const template = await this.getTemplateByKey(organizationId, templateKey);
    
    if (!template) {
      throw new Error(`Template not found for key: ${templateKey}`);
    }

    return this.replacePlaceholders(template.contentPrompt, {
      ...placeholders,
      currentDate: dayjs().format(),
    });
  }

  async getImagePrompt(organizationId: string, format: string, tone: string, placeholders: Partial<PromptPlaceholders>) {
    const templateKey = `${format}_${tone}`;
    const template = await this.getTemplateByKey(organizationId, templateKey);
    
    if (!template || !template.imagePrompt) {
      throw new Error(`Image prompt not found for key: ${templateKey}`);
    }

    return this.replacePlaceholders(template.imagePrompt, {
      ...placeholders,
      currentDate: dayjs().format(),
    });
  }

  private replacePlaceholders(template: string, placeholders: Partial<PromptPlaceholders>): string {
    let result = template;

    // Replace all placeholders
    Object.entries(placeholders).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const placeholder = `{{${key}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), String(value));
      }
    });

    // Remove any unreplaced placeholders (optional)
    result = result.replace(/\{\{[^}]+\}\}/g, '');

    return result;
  }

  async ensureDefaultTemplatesExist(organizationId: string) {
    const existingTemplates = await this.getAllTemplatesByOrganization(organizationId);
    
    if (existingTemplates.length === 0) {
      await this.createDefaultTemplatesForOrganization(organizationId);
    }
  }

  getDefaultTemplate(templateKey: string): CreatePromptTemplateDto | null {
    const defaultTemplates = this._promptTemplatesRepository['getDefaultTemplates']();
    return defaultTemplates.find(t => t.templateKey === templateKey) || null;
  }

  async resetTemplateToDefault(organizationId: string, templateKey: string) {
    const defaultTemplate = this.getDefaultTemplate(templateKey);
    
    if (!defaultTemplate) {
      throw new Error(`Default template not found for key: ${templateKey}`);
    }

    return this.updateTemplate(organizationId, templateKey, defaultTemplate);
  }
} 