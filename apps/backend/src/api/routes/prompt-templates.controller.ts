import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PromptTemplatesService } from '@gitroom/nestjs-libraries/database/prisma/prompt-templates/prompt-templates.service';
import { CreatePromptTemplateDto, UpdatePromptTemplateDto } from '@gitroom/nestjs-libraries/database/prisma/prompt-templates/prompt-templates.repository';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permissions.service';

@Controller('/prompt-templates')
export class PromptTemplatesController {
  constructor(
    private _promptTemplatesService: PromptTemplatesService
  ) {}

  @Get()
  async getAllTemplates(@GetOrgFromRequest() organization: Organization) {
    return this._promptTemplatesService.getAllTemplatesByOrganization(organization.id);
  }

  @Get('/:templateKey')
  async getTemplate(
    @GetOrgFromRequest() organization: Organization,
    @Param('templateKey') templateKey: string
  ) {
    return this._promptTemplatesService.getTemplateByKey(organization.id, templateKey);
  }

  @Post()
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createTemplate(
    @GetOrgFromRequest() organization: Organization,
    @Body() body: CreatePromptTemplateDto
  ) {
    return this._promptTemplatesService.createTemplate(organization.id, body);
  }

  @Put('/:templateKey')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async updateTemplate(
    @GetOrgFromRequest() organization: Organization,
    @Param('templateKey') templateKey: string,
    @Body() body: UpdatePromptTemplateDto
  ) {
    return this._promptTemplatesService.updateTemplate(organization.id, templateKey, body);
  }

  @Delete('/:templateKey')
  @CheckPolicies([AuthorizationActions.Delete, Sections.ADMIN])
  async deleteTemplate(
    @GetOrgFromRequest() organization: Organization,
    @Param('templateKey') templateKey: string
  ) {
    return this._promptTemplatesService.deleteTemplate(organization.id, templateKey);
  }

  @Post('/initialize')
  async initializeDefaultTemplates(@GetOrgFromRequest() organization: Organization) {
    return this._promptTemplatesService.createDefaultTemplatesForOrganization(organization.id);
  }

  @Get('/:templateKey/default')
  async getDefaultTemplate(@Param('templateKey') templateKey: string) {
    return this._promptTemplatesService.getDefaultTemplate(templateKey);
  }

  @Post('/:templateKey/reset')
  async resetTemplateToDefault(
    @GetOrgFromRequest() organization: Organization,
    @Param('templateKey') templateKey: string
  ) {
    return this._promptTemplatesService.resetTemplateToDefault(organization.id, templateKey);
  }
} 