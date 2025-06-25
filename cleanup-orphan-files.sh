#!/bin/bash

# 🧹 Script Automático de Limpeza de Arquivos Órfãos - Postiz
# Este script identifica e limpa automaticamente referências a arquivos que não existem

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Limpeza Automática de Arquivos Órfãos - Postiz${NC}"
echo "================================================="
echo ""

# Configurações do banco
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="postiz-db-local"
DB_USER="postiz-local"
UPLOADS_DIR="./uploads"

# Verificar se o diretório de uploads existe
if [ ! -d "$UPLOADS_DIR" ]; then
    echo -e "${RED}❌ Diretório de uploads não encontrado: $UPLOADS_DIR${NC}"
    exit 1
fi

# Verificar se psql está disponível
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql não encontrado. Instale PostgreSQL client.${NC}"
    exit 1
fi

echo -e "${YELLOW}🔍 Verificando conexão com o banco de dados...${NC}"
if ! PGPASSWORD='postiz-local-pwd' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Não foi possível conectar ao banco de dados.${NC}"
    echo "Verifique se o PostgreSQL está rodando e as credenciais estão corretas."
    exit 1
fi

echo -e "${GREEN}✅ Conexão com banco de dados estabelecida!${NC}"
echo ""

# Função para executar SQL e retornar resultado
execute_sql() {
    PGPASSWORD='postiz-local-pwd' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "$1" | xargs
}

# Função para verificar se arquivo existe
file_exists() {
    [ -f "$1" ]
}

echo -e "${YELLOW}🔍 Buscando posts com referências de mídia...${NC}"

# Buscar todos os posts com imagens
orphan_count=0
cleaned_count=0

# Query para buscar posts com imagens
posts_with_media=$(PGPASSWORD='postiz-local-pwd' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
SELECT id, image 
FROM \"Post\" 
WHERE image IS NOT NULL 
  AND image != '[]' 
  AND image != 'null'
  AND length(image) > 2;
")

echo "Verificando arquivos de mídia..."
echo ""

while IFS='|' read -r post_id image_json; do
    if [ -z "$post_id" ] || [ -z "$image_json" ]; then
        continue
    fi
    
    # Limpar whitespace
    post_id=$(echo "$post_id" | xargs)
    image_json=$(echo "$image_json" | xargs)
    
    # Extrair caminhos de arquivo do JSON
    # Buscar padrões como "2481c24a217b2e935469938880459db4.png"
    file_patterns=$(echo "$image_json" | grep -oE '[a-f0-9]{32}\.(png|jpg|jpeg|gif|mp4|mov|avi)' || echo "")
    
    if [ -n "$file_patterns" ]; then
        while read -r file_pattern; do
            if [ -n "$file_pattern" ]; then
                # Construir caminho completo do arquivo
                year=$(date +%Y)
                month=$(date +%m)
                day=$(date +%d)
                file_path="$UPLOADS_DIR/$year/$month/$day/$file_pattern"
                
                # Verificar se arquivo existe
                if ! file_exists "$file_path"; then
                    echo -e "${RED}🗑️  Arquivo órfão encontrado: $file_pattern${NC}"
                    echo "   Post ID: $post_id"
                    echo "   Caminho esperado: $file_path"
                    
                    orphan_count=$((orphan_count + 1))
                    
                    # Perguntar se deve limpar (modo interativo)
                    if [ "${1:-}" != "--auto" ]; then
                        read -p "   Limpar referência? (y/N): " confirm
                        if [[ $confirm =~ ^[Yy]$ ]]; then
                            should_clean=true
                        else
                            should_clean=false
                        fi
                    else
                        should_clean=true
                        echo "   🧹 Limpando automaticamente..."
                    fi
                    
                    if [ "$should_clean" = true ]; then
                        # Limpar a referência do banco
                        execute_sql "UPDATE \"Post\" SET image = '[]' WHERE id = '$post_id';"
                        echo -e "${GREEN}   ✅ Referência removida!${NC}"
                        cleaned_count=$((cleaned_count + 1))
                    fi
                    
                    echo ""
                fi
            fi
        done <<< "$file_patterns"
    fi
done <<< "$posts_with_media"

# Limpeza específica do arquivo que estava dando erro
echo -e "${YELLOW}🎯 Limpando arquivo específico problemático...${NC}"
specific_file_count=$(execute_sql "SELECT COUNT(*) FROM \"Post\" WHERE image::text LIKE '%2481c24a217b2e935469938880459db4.png%';")

if [ "$specific_file_count" -gt 0 ]; then
    echo "Encontradas $specific_file_count referências ao arquivo problemático"
    execute_sql "UPDATE \"Post\" SET image = '[]' WHERE image::text LIKE '%2481c24a217b2e935469938880459db4.png%';"
    echo -e "${GREEN}✅ Referências específicas removidas!${NC}"
    cleaned_count=$((cleaned_count + specific_file_count))
fi

echo ""
echo -e "${BLUE}📊 Relatório Final:${NC}"
echo "=================="
echo -e "🔍 Arquivos órfãos encontrados: ${RED}$orphan_count${NC}"
echo -e "🧹 Referências limpas: ${GREEN}$cleaned_count${NC}"

if [ $cleaned_count -gt 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Limpeza concluída com sucesso!${NC}"
    echo "Os erros de 'File not found' devem parar de aparecer nos logs."
    echo ""
    echo -e "${YELLOW}💡 Próximos passos:${NC}"
    echo "1. Reinicie os serviços para aplicar as mudanças"
    echo "2. Monitore os logs para confirmar que os erros pararam"
    echo "3. Execute este script periodicamente para manter o sistema limpo"
else
    echo ""
    echo -e "${GREEN}✨ Nenhuma limpeza necessária!${NC}"
    echo "Todos os arquivos referenciados existem no sistema."
fi

echo ""
echo -e "${BLUE}📝 Comandos úteis:${NC}"
echo "- Executar em modo automático: $0 --auto"
echo "- Ver posts com erro: psql -U postiz-local -d postiz-db-local -c \"SELECT COUNT(*) FROM \\\"Post\\\" WHERE state = 'ERROR';\""
echo "- Limpar logs: docker-compose logs --tail=0 -f" 