'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useModals } from '@mantine/modals';
import { FormProvider, useForm } from 'react-hook-form';
import { Input } from '@gitroom/react/form/input';
import { Textarea } from '@gitroom/react/form/textarea';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';

interface PromptTemplate {
  id: string;
  templateKey: string;
  name: string;
  researchPrompt: string;
  hookPrompt: string;
  contentPrompt: string;
  imagePrompt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EditPromptModalProps {
  template: PromptTemplate | null;
  onSave: () => void;
  onClose: () => void;
}

const EditPromptModal: FC<EditPromptModalProps> = ({ template, onSave, onClose }) => {
  const fetch = useFetch();
  const toast = useToaster();
  const t = useT();
  const [defaultTemplate, setDefaultTemplate] = useState<any>(null);
  const [isLoadingDefault, setIsLoadingDefault] = useState(false);
  
  const form = useForm({
    defaultValues: {
      templateKey: template?.templateKey || '',
      name: template?.name || '',
      researchPrompt: template?.researchPrompt || '',
      hookPrompt: template?.hookPrompt || '',
      contentPrompt: template?.contentPrompt || '',
      imagePrompt: template?.imagePrompt || '',
      active: template?.active ?? true,
    },
  });

  // Carregar template padrão se estiver criando um novo
  useEffect(() => {
    if (!template) {
      loadDefaultTemplate();
    }
  }, [template]);

  const loadDefaultTemplate = async () => {
    try {
      setIsLoadingDefault(true);
      
      // Template padrão hardcoded como fallback
      const hardcodedDefault = {
        templateKey: 'default_template',
        name: 'Novo Template',
        researchPrompt: `Hoje é {{currentDate}}. Você é um assistente que recebe solicitações para posts de redes sociais.
Sua pesquisa deve ser baseada nos dados mais recentes possíveis.
Concatene o texto da solicitação junto com uma pesquisa na internet baseada no texto.

Solicitação do usuário:
{{request}}`,
        hookPrompt: `Você é um assistente que cria ganchos para posts.
O gancho são as 1-2 primeiras frases do post que serão usadas para capturar a atenção do leitor.
Você receberá ganchos existentes como inspiração.

Instruções:
- Evite ganchos estranhos que começam com "Descubra o segredo...", "O melhor...", "O mais...", "O top..."
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
      };

      try {
        // Tentar carregar da API primeiro
        const response = await fetch('/prompt-templates/one_short_personal/default');
        if (response.ok) {
          const data = await response.json();
          setDefaultTemplate(data);
          form.reset({
            templateKey: '',
            name: '',
            researchPrompt: data.researchPrompt || hardcodedDefault.researchPrompt,
            hookPrompt: data.hookPrompt || hardcodedDefault.hookPrompt,
            contentPrompt: data.contentPrompt || hardcodedDefault.contentPrompt,
            imagePrompt: data.imagePrompt || hardcodedDefault.imagePrompt,
            active: true,
          });
        } else {
          throw new Error('API não respondeu');
        }
      } catch (apiError) {
        // Usar template hardcoded como fallback
        console.log('Usando template padrão hardcoded como fallback');
        setDefaultTemplate(hardcodedDefault);
        form.reset({
          templateKey: '',
          name: '',
          researchPrompt: hardcodedDefault.researchPrompt,
          hookPrompt: hardcodedDefault.hookPrompt,
          contentPrompt: hardcodedDefault.contentPrompt,
          imagePrompt: hardcodedDefault.imagePrompt,
          active: true,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar template padrão:', error);
    } finally {
      setIsLoadingDefault(false);
    }
  };

  const handleSave = useCallback(async (data: any) => {
    try {
      if (template) {
        // Editando template existente
        await fetch(`/prompt-templates/${template.templateKey}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        toast.show('Template atualizado com sucesso!', 'success');
      } else {
        // Criando novo template
        await fetch('/prompt-templates', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        toast.show('Template criado com sucesso!', 'success');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.show(template ? 'Erro ao salvar template' : 'Erro ao criar template', 'error');
    }
  }, [template, fetch, toast, onSave, onClose]);

  const handleResetToDefault = useCallback(async () => {
    try {
      if (template) {
        // Resetar template existente
        await fetch(`/prompt-templates/${template.templateKey}/reset`, {
          method: 'POST',
        });
        toast.show('Template resetado para padrão!', 'success');
        onSave();
        onClose();
      } else {
        // Resetar form para template padrão durante criação
        if (defaultTemplate) {
          form.reset({
            templateKey: '',
            name: '',
            researchPrompt: defaultTemplate.researchPrompt || '',
            hookPrompt: defaultTemplate.hookPrompt || '',
            contentPrompt: defaultTemplate.contentPrompt || '',
            imagePrompt: defaultTemplate.imagePrompt || '',
            active: true,
          });
          toast.show('Formulário resetado para padrão!', 'success');
        } else {
          // Recarregar template padrão se não existir
          await loadDefaultTemplate();
        }
      }
    } catch (error) {
      toast.show('Erro ao resetar template', 'error');
    }
  }, [template, defaultTemplate, form, fetch, toast, onSave, onClose]);

  const placeholderInfo = [
    '{{request}} - Solicitação do usuário',
    '{{research}} - Resultado da pesquisa',
    '{{hook}} - Gancho gerado',
    '{{popularHooks}} - Ganchos populares como inspiração',
    '{{content}} - Conteúdo final',
    '{{currentDate}} - Data atual',
  ];

  return (
    <FormProvider {...form}>
      <div className="w-full max-w-4xl mx-auto bg-sixth p-6 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {template ? `Editar: ${template.name}` : 'Novo Template'}
          </h2>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleResetToDefault}
              className="bg-yellow-600 hover:bg-yellow-700"
              disabled={!template && isLoadingDefault}
            >
              {isLoadingDefault ? 'Carregando...' : 'Resetar para Padrão'}
            </Button>
            <Button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700">
              Cancelar
            </Button>
          </div>
        </div>

        {!template && isLoadingDefault && (
          <div className="bg-customColor6 p-4 rounded-lg mb-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-sm">Carregando template padrão...</span>
            </div>
          </div>
        )}

        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informações básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações Básicas</h3>
              
              {!template && (
                <Input
                  label="Chave do Template"
                  {...form.register('templateKey')}
                  placeholder="Ex: my_custom_template"
                  required
                />
              )}
              
              <Input
                label="Nome do Template"
                {...form.register('name')}
                placeholder="Ex: Post Curto - Tom Pessoal"
                required
              />

              <div className="flex items-center space-x-2">
                <Checkbox
                  {...form.register('active')}
                  label="Template Ativo"
                />
              </div>

              {!template && defaultTemplate && !isLoadingDefault && (
                <div className="bg-green-900 bg-opacity-30 border border-green-600 p-3 rounded-lg mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-300">
                      Template pré-populado com valores padrão. Customize conforme necessário.
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-customColor6 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Placeholders Disponíveis:</h4>
                <ul className="text-sm space-y-1">
                  {placeholderInfo.map((info, index) => (
                    <li key={index} className="text-gray-300">
                      <code className="bg-gray-800 px-1 rounded text-xs">
                        {info.split(' - ')[0]}
                      </code>
                      {' - '}
                      {info.split(' - ')[1]}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Prompts */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-medium">Prompts</h3>
              
                             <Textarea
                 label="Prompt de Pesquisa"
                 className="min-h-[120px]"
                 {...form.register('researchPrompt')}
                 placeholder="Prompt usado para pesquisar conteúdo na internet..."
               />

               <Textarea
                 label="Prompt de Gancho"
                 className="min-h-[180px]"
                 {...form.register('hookPrompt')}
                 placeholder="Prompt usado para gerar o gancho do post..."
               />

               <Textarea
                 label="Prompt de Conteúdo"
                 className="min-h-[180px]"
                 {...form.register('contentPrompt')}
                 placeholder="Prompt usado para gerar o conteúdo final do post..."
               />

               <Textarea
                 label="Prompt de Imagem (Opcional)"
                 className="min-h-[100px]"
                 {...form.register('imagePrompt')}
                 placeholder="Prompt usado para gerar descrição da imagem..."
               />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-customColor6">
            <Button type="submit" className="bg-red-600 hover:bg-red-700">
              Salvar Template
            </Button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
};

export const PromptsComponent: FC = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const fetch = useFetch();
  const toast = useToaster();
  const modals = useModals();
  const t = useT();

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/prompt-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        throw new Error('Failed to load templates');
      }
    } catch (error) {
      toast.show('Erro ao carregar templates', 'error');
    } finally {
      setLoading(false);
    }
  }, []); // Remove dependencies to prevent infinite loop

  const initializeTemplates = useCallback(async () => {
    try {
      await fetch('/prompt-templates/initialize', {
        method: 'POST',
      });
      toast.show('Templates padrão criados!', 'success');
      loadTemplates();
    } catch (error) {
      toast.show('Erro ao criar templates padrão', 'error');
    }
  }, []); // Remove dependencies to prevent infinite loop

  const openEditModal = useCallback((template: PromptTemplate) => {
    modals.openModal({
      children: (
        <EditPromptModal
          template={template}
          onSave={loadTemplates}
          onClose={() => modals.closeAll()}
        />
      ),
      size: 'calc(100vw - 40px)',
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      withCloseButton: false,
    });
  }, []); // Remove dependencies to prevent infinite loop

  const openCreateModal = useCallback(() => {
    modals.openModal({
      children: (
        <EditPromptModal
          template={null}
          onSave={loadTemplates}
          onClose={() => modals.closeAll()}
        />
      ),
      size: 'calc(100vw - 40px)',
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      withCloseButton: false,
    });
  }, []);

  const deleteTemplate = useCallback(async (template: PromptTemplate) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja deletar o template "${template.name}"? Esta ação não pode ser desfeita.`
    );
    
    if (!confirmed) return;

    try {
      await fetch(`/prompt-templates/${template.templateKey}`, {
        method: 'DELETE',
      });
      toast.show('Template deletado com sucesso!', 'success');
      loadTemplates();
    } catch (error) {
      toast.show('Erro ao deletar template', 'error');
    }
  }, []);

  const toggleTemplateActive = useCallback(async (template: PromptTemplate) => {
    try {
      await fetch(`/prompt-templates/${template.templateKey}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !template.active }),
      });
      toast.show(`Template ${template.active ? 'desativado' : 'ativado'}!`, 'success');
      loadTemplates();
    } catch (error) {
      toast.show('Erro ao alterar status do template', 'error');
    }
  }, []); // Remove dependencies to prevent infinite loop

  const formatTemplateKey = (key: string) => {
    const parts = key.split('_');
    const format = parts.slice(0, -1).join(' ');
    const tone = parts[parts.length - 1];
    
    const formatMap: Record<string, string> = {
      'one short': 'Post Curto',
      'one long': 'Post Longo',
      'thread short': 'Thread Curta',
      'thread long': 'Thread Longa',
    };
    
    const toneMap: Record<string, string> = {
      'personal': 'Tom Pessoal',
      'company': 'Tom Empresarial',
    };
    
    return `${formatMap[format] || format} - ${toneMap[tone] || tone}`;
  };

  useEffect(() => {
    loadTemplates();
  }, []); // Execute only once when component mounts

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando templates...</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-2">Templates de Prompts</h2>
          <p className="text-gray-400">
            Configure os prompts usados pelo AI para gerar diferentes tipos de conteúdo.
          </p>
        </div>
        
        <div className="flex gap-2">
          {templates.length === 0 ? (
            <Button onClick={initializeTemplates}>
              Criar Templates Padrão
            </Button>
          ) : (
            <Button 
              onClick={openCreateModal}
              className="bg-green-600 hover:bg-green-700"
            >
              Criar Novo Template
            </Button>
          )}
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            Nenhum template encontrado. Crie os templates padrão para começar.
          </div>
        </div>
      ) : (
        <div className="bg-sixth rounded-lg border border-customColor6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-customColor6">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Última Atualização
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-customColor6">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-customColor6 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {template.templateKey}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatTemplateKey(template.templateKey)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {template.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer',
                          template.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        )}
                        onClick={() => toggleTemplateActive(template)}
                      >
                        {template.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(template.updatedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => openEditModal(template)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
                        >
                          Editar
                        </Button>
                        <Button
                          onClick={() => deleteTemplate(template)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs"
                        >
                          Deletar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {templates.length > 0 && (
        <div className="text-sm text-gray-400">
          <strong>Dica:</strong> Use os placeholders (como &#123;&#123;request&#125;&#125;, &#123;&#123;research&#125;&#125;) nos prompts para inserir dinamicamente o conteúdo. 
          Clique no status para ativar/desativar um template.
        </div>
      )}
    </div>
  );
}; 