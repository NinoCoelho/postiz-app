import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { PromptTemplatesService } from '@gitroom/nestjs-libraries/database/prisma/prompt-templates/prompt-templates.service';

@Injectable()
export class InitTemplatesCommand {
  constructor(
    private _promptTemplatesService: PromptTemplatesService
  ) {}

  @Command({
    command: 'init:templates <orgId>',
    describe: 'Initialize default prompt templates for an organization',
  })
  async execute(
    orgId: string,
  ): Promise<void> {
    try {
      console.log(`Initializing templates for organization: ${orgId}`);
      await this._promptTemplatesService.createDefaultTemplatesForOrganization(orgId);
      
      const templates = await this._promptTemplatesService.getAllTemplatesByOrganization(orgId);
      console.log(`✅ Created ${templates.length} templates successfully!`);
      
      templates.forEach((template: any) => {
        console.log(`  - ${template.templateKey}: ${template.name}`);
      });
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
} 