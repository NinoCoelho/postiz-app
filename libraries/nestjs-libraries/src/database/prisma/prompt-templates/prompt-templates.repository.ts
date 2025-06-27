import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

export interface CreatePromptTemplateDto {
  templateKey: string;
  name: string;
  researchPrompt: string;
  hookPrompt: string;
  contentPrompt: string;
  imagePrompt?: string;
}

export interface UpdatePromptTemplateDto extends Partial<CreatePromptTemplateDto> {
  active?: boolean;
}

@Injectable()
export class PromptTemplatesRepository {
  constructor(
    private _prisma: PrismaRepository<'promptTemplates'>
  ) {}

  async getTemplateByKey(organizationId: string, templateKey: string) {
    return this._prisma.model.promptTemplates.findFirst({
      where: {
        organizationId,
        templateKey,
        deletedAt: null,
        active: true,
      },
    });
  }

  async getAllTemplatesByOrganization(organizationId: string) {
    return this._prisma.model.promptTemplates.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      orderBy: {
        templateKey: 'asc',
      },
    });
  }

  async createTemplate(
    organizationId: string,
    data: CreatePromptTemplateDto
  ) {
    return this._prisma.model.promptTemplates.create({
      data: {
        ...data,
        organizationId,
      },
    });
  }

  async updateTemplate(
    organizationId: string,
    templateKey: string,
    data: UpdatePromptTemplateDto
  ) {
    return this._prisma.model.promptTemplates.updateMany({
      where: {
        organizationId,
        templateKey,
        deletedAt: null,
      },
      data,
    });
  }

  async deleteTemplate(organizationId: string, templateKey: string) {
    return this._prisma.model.promptTemplates.updateMany({
      where: {
        organizationId,
        templateKey,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async createDefaultTemplatesForOrganization(organizationId: string) {
    const defaultTemplates = this.getDefaultTemplates();
    
    const templates = defaultTemplates.map(template => ({
      ...template,
      organizationId,
    }));

    return this._prisma.model.promptTemplates.createMany({
      data: templates,
      skipDuplicates: true,
    });
  }

  private getDefaultTemplates(): CreatePromptTemplateDto[] {
    return [
      {
        templateKey: 'one_short_personal',
        name: 'Post Curto - Tom Pessoal',
        researchPrompt: `Hoje é {{currentDate}}. Você é um assistente que recebe solicitações para posts de redes sociais.
Sua pesquisa deve ser baseada nos dados mais recentes possíveis.
Concatene o texto da solicitação junto com uma pesquisa na internet baseada no texto.

Solicitação do usuário:
{{request}}`,
        hookPrompt: `Você é um assistente que cria ganchos para posts pessoais.
O gancho são as 1-2 primeiras frases do post que serão usadas para capturar a atenção do leitor.
Você receberá ganchos existentes como inspiração.

Instruções:
- Evite ganchos estranhos que começam com "Descubra o segredo...", "O melhor...", "O mais...", "O top..."
- Use tom pessoal (primeira pessoa)
- Seja envolvente, mas não exagerado
- Use inglês simples
- Adicione "\\n" entre as linhas
- NÃO tire o gancho da "solicitação do usuário"

<!-- INÍCIO solicitação do usuário -->
{{request}}
<!-- FIM solicitação do usuário -->

<!-- INÍCIO ganchos existentes -->
{{popularHooks}}
<!-- FIM ganchos existentes -->

<!-- INÍCIO conteúdo atual -->
{{research}}
<!-- FIM conteúdo atual -->`,
        contentPrompt: `Você é um assistente que recebe um gancho existente de mídia social e gera apenas o conteúdo.

Instruções:
- NÃO adicione hashtags
- Use tom pessoal (primeira pessoa)
- Post deve ter máximo 200 caracteres para caber no Twitter
- Post deve ter apenas 1 item
- Use o gancho como inspiração
- Seja envolvente, mas não exagerado
- Use inglês simples
- O conteúdo NÃO deve conter o gancho
- Tente colocar algum call-to-action no final do post
- Adicione "\\n" entre as linhas
- Adicione "\\n" após cada "."

Gancho:
{{hook}}

Solicitação do usuário:
{{request}}

Informações do conteúdo atual:
{{research}}`,
        imagePrompt: `Gere uma descrição para criar uma imagem para este post.
Certifique-se de que não contenha nomes de marcas e seja muito descritiva em termos de estilo.

Instruções:
- Seja muito descritivo visualmente
- Inclua estilo artístico (fotografia, ilustração, etc.)
- Descreva cores, iluminação, composição
- NÃO inclua nomes de marcas ou pessoas específicas
- Foque em elementos visuais que complementem o conteúdo

Conteúdo do post:
{{content}}

Contexto da solicitação:
{{request}}`,
      },
      {
        templateKey: 'one_long_personal',
        name: 'Post Longo - Tom Pessoal',
        researchPrompt: `Hoje é {{currentDate}}. Você é um assistente que recebe solicitações para posts de redes sociais.
Sua pesquisa deve ser baseada nos dados mais recentes possíveis.
Concatene o texto da solicitação junto com uma pesquisa na internet baseada no texto.

Solicitação do usuário:
{{request}}`,
        hookPrompt: `Você é um assistente que cria ganchos para posts pessoais longos.
O gancho são as 1-2 primeiras frases do post que serão usadas para capturar a atenção do leitor.
Você receberá ganchos existentes como inspiração.

Instruções:
- Evite ganchos estranhos que começam com "Descubra o segredo...", "O melhor...", "O mais...", "O top..."
- Use tom pessoal (primeira pessoa)
- Seja envolvente, mas não exagerado
- Use inglês simples
- Adicione "\\n" entre as linhas
- NÃO tire o gancho da "solicitação do usuário"

<!-- INÍCIO solicitação do usuário -->
{{request}}
<!-- FIM solicitação do usuário -->

<!-- INÍCIO ganchos existentes -->
{{popularHooks}}
<!-- FIM ganchos existentes -->

<!-- INÍCIO conteúdo atual -->
{{research}}
<!-- FIM conteúdo atual -->`,
        contentPrompt: `Você é um assistente que recebe um gancho existente de mídia social e gera apenas o conteúdo.

Instruções:
- NÃO adicione hashtags
- Use tom pessoal (primeira pessoa)
- Post deve ser longo e detalhado
- Post deve ter apenas 1 item
- Use o gancho como inspiração
- Seja envolvente, mas não exagerado
- Use inglês simples
- O conteúdo NÃO deve conter o gancho
- Tente colocar algum call-to-action no final do post
- Adicione "\\n" entre as linhas
- Adicione "\\n" após cada "."

Gancho:
{{hook}}

Solicitação do usuário:
{{request}}

Informações do conteúdo atual:
{{research}}`,
        imagePrompt: `Gere uma descrição para criar uma imagem para este post.
Certifique-se de que não contenha nomes de marcas e seja muito descritiva em termos de estilo.

Instruções:
- Seja muito descritivo visualmente
- Inclua estilo artístico (fotografia, ilustração, etc.)
- Descreva cores, iluminação, composição
- NÃO inclua nomes de marcas ou pessoas específicas
- Foque em elementos visuais que complementem o conteúdo

Conteúdo do post:
{{content}}

Contexto da solicitação:
{{request}}`,
      },
      {
        templateKey: 'thread_short_personal',
        name: 'Thread Curta - Tom Pessoal',
        researchPrompt: `Hoje é {{currentDate}}. Você é um assistente que recebe solicitações para posts de redes sociais.
Sua pesquisa deve ser baseada nos dados mais recentes possíveis.
Concatene o texto da solicitação junto com uma pesquisa na internet baseada no texto.

Solicitação do usuário:
{{request}}`,
        hookPrompt: `Você é um assistente que cria ganchos para threads pessoais com posts curtos.
O gancho são as 1-2 primeiras frases do post que serão usadas para capturar a atenção do leitor.
Você receberá ganchos existentes como inspiração.

Instruções:
- Evite ganchos estranhos que começam com "Descubra o segredo...", "O melhor...", "O mais...", "O top..."
- Use tom pessoal (primeira pessoa)
- Seja envolvente, mas não exagerado
- Use inglês simples
- Adicione "\\n" entre as linhas
- NÃO tire o gancho da "solicitação do usuário"

<!-- INÍCIO solicitação do usuário -->
{{request}}
<!-- FIM solicitação do usuário -->

<!-- INÍCIO ganchos existentes -->
{{popularHooks}}
<!-- FIM ganchos existentes -->

<!-- INÍCIO conteúdo atual -->
{{research}}
<!-- FIM conteúdo atual -->`,
        contentPrompt: `Você é um assistente que recebe um gancho existente de mídia social e gera apenas o conteúdo.

Instruções:
- NÃO adicione hashtags
- Use tom pessoal (primeira pessoa)
- Cada post deve ter máximo 200 caracteres para caber no Twitter
- Thread deve ter mínimo 2 itens
- Use o gancho como inspiração
- Seja envolvente, mas não exagerado
- Use inglês simples
- O conteúdo NÃO deve conter o gancho
- Tente colocar algum call-to-action no final do último post
- Adicione "\\n" entre as linhas
- Adicione "\\n" após cada "."

Gancho:
{{hook}}

Solicitação do usuário:
{{request}}

Informações do conteúdo atual:
{{research}}`,
        imagePrompt: `Gere uma descrição para criar uma imagem para este post.
Certifique-se de que não contenha nomes de marcas e seja muito descritiva em termos de estilo.

Instruções:
- Seja muito descritivo visualmente
- Inclua estilo artístico (fotografia, ilustração, etc.)
- Descreva cores, iluminação, composição
- NÃO inclua nomes de marcas ou pessoas específicas
- Foque em elementos visuais que complementem o conteúdo

Conteúdo do post:
{{content}}

Contexto da solicitação:
{{request}}`,
      },
      {
        templateKey: 'thread_long_personal',
        name: 'Thread Longa - Tom Pessoal',
        researchPrompt: `Hoje é {{currentDate}}. Você é um assistente que recebe solicitações para posts de redes sociais.
Sua pesquisa deve ser baseada nos dados mais recentes possíveis.
Concatene o texto da solicitação junto com uma pesquisa na internet baseada no texto.

Solicitação do usuário:
{{request}}`,
        hookPrompt: `Você é um assistente que cria ganchos para threads pessoais com posts longos.
O gancho são as 1-2 primeiras frases do post que serão usadas para capturar a atenção do leitor.
Você receberá ganchos existentes como inspiração.

Instruções:
- Evite ganchos estranhos que começam com "Descubra o segredo...", "O melhor...", "O mais...", "O top..."
- Use tom pessoal (primeira pessoa)
- Seja envolvente, mas não exagerado
- Use inglês simples
- Adicione "\\n" entre as linhas
- NÃO tire o gancho da "solicitação do usuário"

<!-- INÍCIO solicitação do usuário -->
{{request}}
<!-- FIM solicitação do usuário -->

<!-- INÍCIO ganchos existentes -->
{{popularHooks}}
<!-- FIM ganchos existentes -->

<!-- INÍCIO conteúdo atual -->
{{research}}
<!-- FIM conteúdo atual -->`,
        contentPrompt: `Você é um assistente que recebe um gancho existente de mídia social e gera apenas o conteúdo.

Instruções:
- NÃO adicione hashtags
- Use tom pessoal (primeira pessoa)
- Cada post deve ser longo e detalhado
- Thread deve ter mínimo 2 itens
- Use o gancho como inspiração
- Seja envolvente, mas não exagerado
- Use inglês simples
- O conteúdo NÃO deve conter o gancho
- Tente colocar algum call-to-action no final do último post
- Adicione "\\n" entre as linhas
- Adicione "\\n" após cada "."

Gancho:
{{hook}}

Solicitação do usuário:
{{request}}

Informações do conteúdo atual:
{{research}}`,
        imagePrompt: `Gere uma descrição para criar uma imagem para este post.
Certifique-se de que não contenha nomes de marcas e seja muito descritiva em termos de estilo.

Instruções:
- Seja muito descritivo visualmente
- Inclua estilo artístico (fotografia, ilustração, etc.)
- Descreva cores, iluminação, composição
- NÃO inclua nomes de marcas ou pessoas específicas
- Foque em elementos visuais que complementem o conteúdo

Conteúdo do post:
{{content}}

Contexto da solicitação:
{{request}}`,
      },
      {
        templateKey: 'one_short_company',
        name: 'Post Curto - Tom Empresarial',
        researchPrompt: `Hoje é {{currentDate}}. Você é um assistente que recebe solicitações para posts de redes sociais.
Sua pesquisa deve ser baseada nos dados mais recentes possíveis.
Concatene o texto da solicitação junto com uma pesquisa na internet baseada no texto.

Solicitação do usuário:
{{request}}`,
        hookPrompt: `Você é um assistente que cria ganchos para posts empresariais.
O gancho são as 1-2 primeiras frases do post que serão usadas para capturar a atenção do leitor.
Você receberá ganchos existentes como inspiração.

Instruções:
- Evite ganchos estranhos que começam com "Descubra o segredo...", "O melhor...", "O mais...", "O top..."
- Use tom empresarial (terceira pessoa)
- Seja envolvente, mas não exagerado
- Use inglês simples
- Adicione "\\n" entre as linhas
- NÃO tire o gancho da "solicitação do usuário"

<!-- INÍCIO solicitação do usuário -->
{{request}}
<!-- FIM solicitação do usuário -->

<!-- INÍCIO ganchos existentes -->
{{popularHooks}}
<!-- FIM ganchos existentes -->

<!-- INÍCIO conteúdo atual -->
{{research}}
<!-- FIM conteúdo atual -->`,
        contentPrompt: `Você é um assistente que recebe um gancho existente de mídia social e gera apenas o conteúdo.

Instruções:
- NÃO adicione hashtags
- Use tom empresarial (terceira pessoa)
- Post deve ter máximo 200 caracteres para caber no Twitter
- Post deve ter apenas 1 item
- Use o gancho como inspiração
- Seja envolvente, mas não exagerado
- Use inglês simples
- O conteúdo NÃO deve conter o gancho
- Tente colocar algum call-to-action no final do post
- Adicione "\\n" entre as linhas
- Adicione "\\n" após cada "."

Gancho:
{{hook}}

Solicitação do usuário:
{{request}}

Informações do conteúdo atual:
{{research}}`,
        imagePrompt: `Gere uma descrição para criar uma imagem para este post.
Certifique-se de que não contenha nomes de marcas e seja muito descritiva em termos de estilo.

Instruções:
- Seja muito descritivo visualmente
- Inclua estilo artístico (fotografia, ilustração, etc.)
- Descreva cores, iluminação, composição
- NÃO inclua nomes de marcas ou pessoas específicas
- Foque em elementos visuais que complementem o conteúdo

Conteúdo do post:
{{content}}

Contexto da solicitação:
{{request}}`,
      },
      {
        templateKey: 'one_long_company',
        name: 'Post Longo - Tom Empresarial',
        researchPrompt: `Hoje é {{currentDate}}. Você é um assistente que recebe solicitações para posts de redes sociais.
Sua pesquisa deve ser baseada nos dados mais recentes possíveis.
Concatene o texto da solicitação junto com uma pesquisa na internet baseada no texto.

Solicitação do usuário:
{{request}}`,
        hookPrompt: `Você é um assistente que cria ganchos para posts empresariais longos.
O gancho são as 1-2 primeiras frases do post que serão usadas para capturar a atenção do leitor.
Você receberá ganchos existentes como inspiração.

Instruções:
- Evite ganchos estranhos que começam com "Descubra o segredo...", "O melhor...", "O mais...", "O top..."
- Use tom empresarial (terceira pessoa)
- Seja envolvente, mas não exagerado
- Use inglês simples
- Adicione "\\n" entre as linhas
- NÃO tire o gancho da "solicitação do usuário"

<!-- INÍCIO solicitação do usuário -->
{{request}}
<!-- FIM solicitação do usuário -->

<!-- INÍCIO ganchos existentes -->
{{popularHooks}}
<!-- FIM ganchos existentes -->

<!-- INÍCIO conteúdo atual -->
{{research}}
<!-- FIM conteúdo atual -->`,
        contentPrompt: `Você é um assistente que recebe um gancho existente de mídia social e gera apenas o conteúdo.

Instruções:
- NÃO adicione hashtags
- Use tom empresarial (terceira pessoa)
- Post deve ser longo e detalhado
- Post deve ter apenas 1 item
- Use o gancho como inspiração
- Seja envolvente, mas não exagerado
- Use inglês simples
- O conteúdo NÃO deve conter o gancho
- Tente colocar algum call-to-action no final do post
- Adicione "\\n" entre as linhas
- Adicione "\\n" após cada "."

Gancho:
{{hook}}

Solicitação do usuário:
{{request}}

Informações do conteúdo atual:
{{research}}`,
        imagePrompt: `Gere uma descrição para criar uma imagem para este post.
Certifique-se de que não contenha nomes de marcas e seja muito descritiva em termos de estilo.

Instruções:
- Seja muito descritivo visualmente
- Inclua estilo artístico (fotografia, ilustração, etc.)
- Descreva cores, iluminação, composição
- NÃO inclua nomes de marcas ou pessoas específicas
- Foque em elementos visuais que complementem o conteúdo

Conteúdo do post:
{{content}}

Contexto da solicitação:
{{request}}`,
      },
      {
        templateKey: 'thread_short_company',
        name: 'Thread Curta - Tom Empresarial',
        researchPrompt: `Hoje é {{currentDate}}. Você é um assistente que recebe solicitações para posts de redes sociais.
Sua pesquisa deve ser baseada nos dados mais recentes possíveis.
Concatene o texto da solicitação junto com uma pesquisa na internet baseada no texto.

Solicitação do usuário:
{{request}}`,
        hookPrompt: `Você é um assistente que cria ganchos para threads empresariais com posts curtos.
O gancho são as 1-2 primeiras frases do post que serão usadas para capturar a atenção do leitor.
Você receberá ganchos existentes como inspiração.

Instruções:
- Evite ganchos estranhos que começam com "Descubra o segredo...", "O melhor...", "O mais...", "O top..."
- Use tom empresarial (terceira pessoa)
- Seja envolvente, mas não exagerado
- Use inglês simples
- Adicione "\\n" entre as linhas
- NÃO tire o gancho da "solicitação do usuário"

<!-- INÍCIO solicitação do usuário -->
{{request}}
<!-- FIM solicitação do usuário -->

<!-- INÍCIO ganchos existentes -->
{{popularHooks}}
<!-- FIM ganchos existentes -->

<!-- INÍCIO conteúdo atual -->
{{research}}
<!-- FIM conteúdo atual -->`,
        contentPrompt: `Você é um assistente que recebe um gancho existente de mídia social e gera apenas o conteúdo.

Instruções:
- NÃO adicione hashtags
- Use tom empresarial (terceira pessoa)
- Cada post deve ter máximo 200 caracteres para caber no Twitter
- Thread deve ter mínimo 2 itens
- Use o gancho como inspiração
- Seja envolvente, mas não exagerado
- Use inglês simples
- O conteúdo NÃO deve conter o gancho
- Tente colocar algum call-to-action no final do último post
- Adicione "\\n" entre as linhas
- Adicione "\\n" após cada "."

Gancho:
{{hook}}

Solicitação do usuário:
{{request}}

Informações do conteúdo atual:
{{research}}`,
        imagePrompt: `Gere uma descrição para criar uma imagem para este post.
Certifique-se de que não contenha nomes de marcas e seja muito descritiva em termos de estilo.

Instruções:
- Seja muito descritivo visualmente
- Inclua estilo artístico (fotografia, ilustração, etc.)
- Descreva cores, iluminação, composição
- NÃO inclua nomes de marcas ou pessoas específicas
- Foque em elementos visuais que complementem o conteúdo

Conteúdo do post:
{{content}}

Contexto da solicitação:
{{request}}`,
      },
      {
        templateKey: 'thread_long_company',
        name: 'Thread Longa - Tom Empresarial',
        researchPrompt: `Hoje é {{currentDate}}. Você é um assistente que recebe solicitações para posts de redes sociais.
Sua pesquisa deve ser baseada nos dados mais recentes possíveis.
Concatene o texto da solicitação junto com uma pesquisa na internet baseada no texto.

Solicitação do usuário:
{{request}}`,
        hookPrompt: `Você é um assistente que cria ganchos para threads empresariais com posts longos.
O gancho são as 1-2 primeiras frases do post que serão usadas para capturar a atenção do leitor.
Você receberá ganchos existentes como inspiração.

Instruções:
- Evite ganchos estranhos que começam com "Descubra o segredo...", "O melhor...", "O mais...", "O top..."
- Use tom empresarial (terceira pessoa)
- Seja envolvente, mas não exagerado
- Use inglês simples
- Adicione "\\n" entre as linhas
- NÃO tire o gancho da "solicitação do usuário"

<!-- INÍCIO solicitação do usuário -->
{{request}}
<!-- FIM solicitação do usuário -->

<!-- INÍCIO ganchos existentes -->
{{popularHooks}}
<!-- FIM ganchos existentes -->

<!-- INÍCIO conteúdo atual -->
{{research}}
<!-- FIM conteúdo atual -->`,
        contentPrompt: `Você é um assistente que recebe um gancho existente de mídia social e gera apenas o conteúdo.

Instruções:
- NÃO adicione hashtags
- Use tom empresarial (terceira pessoa)
- Cada post deve ser longo e detalhado
- Thread deve ter mínimo 2 itens
- Use o gancho como inspiração
- Seja envolvente, mas não exagerado
- Use inglês simples
- O conteúdo NÃO deve conter o gancho
- Tente colocar algum call-to-action no final do último post
- Adicione "\\n" entre as linhas
- Adicione "\\n" após cada "."

Gancho:
{{hook}}

Solicitação do usuário:
{{request}}

Informações do conteúdo atual:
{{research}}`,
        imagePrompt: `Gere uma descrição para criar uma imagem para este post.
Certifique-se de que não contenha nomes de marcas e seja muito descritiva em termos de estilo.

Instruções:
- Seja muito descritivo visualmente
- Inclua estilo artístico (fotografia, ilustração, etc.)
- Descreva cores, iluminação, composição
- NÃO inclua nomes de marcas ou pessoas específicas
- Foque em elementos visuais que complementem o conteúdo

Conteúdo do post:
{{content}}

Contexto da solicitação:
{{request}}`,
      },
    ];
  }
} 