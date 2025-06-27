import { PrismaClient } from '@prisma/client';
import { PromptTemplatesRepository } from '@gitroom/nestjs-libraries/database/prisma/prompt-templates/prompt-templates.repository';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

const prisma = new PrismaClient();

async function initializeTemplates() {
  const organizationId = process.argv[2];
  
  if (!organizationId) {
    console.error('Usage: ts-node scripts/init-prompt-templates.ts <organizationId>');
    process.exit(1);
  }

  // Check if organization exists
  const org = await prisma.organization.findUnique({
    where: { id: organizationId }
  });

  if (!org) {
    console.error(`Organization with id ${organizationId} not found`);
    process.exit(1);
  }

  console.log(`Initializing prompt templates for organization: ${org.name} (${organizationId})`);

  // Create repository instance
  const prismaRepository = new PrismaRepository(prisma as any);
  const repository = new PromptTemplatesRepository(prismaRepository as any);

  try {
    // Create default templates
    await repository.createDefaultTemplatesForOrganization(organizationId);
    
    console.log('✅ Default prompt templates created successfully!');
    
    // List created templates
    const templates = await repository.getAllTemplatesByOrganization(organizationId);
    console.log(`\n${templates.length} templates created:`);
    
    templates.forEach(template => {
      console.log(`- ${template.templateKey}: ${template.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating templates:', error);
    process.exit(1);
  }
}

initializeTemplates()
  .finally(async () => {
    await prisma.$disconnect();
  }); 