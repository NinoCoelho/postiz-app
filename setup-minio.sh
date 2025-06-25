#!/bin/bash

# 🪣 Setup MinIO/S3 Storage para Postiz
# Este script configura automaticamente o MinIO como storage provider

set -e

echo "🪣 Configuração MinIO/S3 para Postiz"
echo "===================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se .env existe
if [ ! -f ".env" ]; then
    print_error "Arquivo .env não encontrado!"
    echo "Criando arquivo .env..."
    touch .env
fi

# Função para ler input com valor padrão
read_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    echo -n "$prompt [$default]: "
    read value
    if [ -z "$value" ]; then
        value="$default"
    fi
    
    # Usar eval para definir a variável dinamicamente
    eval "$var_name='$value'"
}

echo ""
print_info "Por favor, forneça as informações de configuração do seu MinIO/S3:"
echo ""

# Coletar informações
read_with_default "🌐 Endpoint do MinIO/S3" "https://minio.seudominio.com" "S3_ENDPOINT"
read_with_default "🌍 Região" "us-east-1" "S3_REGION"  
read_with_default "🔑 Access Key" "postiz_access_key" "S3_ACCESS_KEY"
read_with_default "🔐 Secret Key" "postiz_secret_key" "S3_SECRET_KEY"
read_with_default "🪣 Nome do Bucket" "postiz-uploads" "S3_BUCKET_NAME"
read_with_default "🔗 URL Pública" "https://minio.seudominio.com/postiz-uploads" "S3_PUBLIC_URL"

# Perguntar sobre path style
echo ""
echo "🔧 Tipo de endereçamento:"
echo "1) Path Style (MinIO, DigitalOcean Spaces) - padrão"
echo "2) Virtual Hosted (AWS S3)"
echo -n "Escolha [1]: "
read path_style_choice

if [ "$path_style_choice" = "2" ]; then
    S3_FORCE_PATH_STYLE="false"
else
    S3_FORCE_PATH_STYLE="true"
fi

echo ""
print_info "Configurações coletadas:"
echo "  Endpoint: $S3_ENDPOINT"
echo "  Região: $S3_REGION"
echo "  Bucket: $S3_BUCKET_NAME"
echo "  URL Pública: $S3_PUBLIC_URL"
echo "  Path Style: $S3_FORCE_PATH_STYLE"
echo ""

echo -n "Confirma as configurações? [y/N]: "
read confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    print_warning "Configuração cancelada."
    exit 0
fi

echo ""
print_info "Atualizando arquivo .env..."

# Backup do .env atual
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
print_success "Backup criado: .env.backup.$(date +%Y%m%d_%H%M%S)"

# Função para atualizar ou adicionar variável no .env
update_env_var() {
    local key="$1"
    local value="$2"
    
    if grep -q "^${key}=" .env; then
        # Substituir linha existente
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^${key}=.*|${key}=${value}|" .env
        else
            # Linux
            sed -i "s|^${key}=.*|${key}=${value}|" .env
        fi
        print_success "Atualizado: $key"
    else
        # Adicionar nova linha
        echo "${key}=${value}" >> .env
        print_success "Adicionado: $key"
    fi
}

# Atualizar variáveis do S3/MinIO
update_env_var "STORAGE_PROVIDER" "s3"
update_env_var "S3_ENDPOINT" "$S3_ENDPOINT"
update_env_var "S3_REGION" "$S3_REGION"
update_env_var "S3_ACCESS_KEY" "$S3_ACCESS_KEY"
update_env_var "S3_SECRET_KEY" "$S3_SECRET_KEY"
update_env_var "S3_BUCKET_NAME" "$S3_BUCKET_NAME"
update_env_var "S3_PUBLIC_URL" "$S3_PUBLIC_URL"
update_env_var "S3_FORCE_PATH_STYLE" "$S3_FORCE_PATH_STYLE"

echo ""
print_success "Configuração do MinIO/S3 concluída!"

echo ""
print_info "Próximos passos:"
echo "1. 🪣 Verifique se o bucket '$S3_BUCKET_NAME' existe no seu MinIO"
echo "2. 🔓 Configure políticas públicas de leitura no bucket"
echo "3. 🔄 Reinicie o Postiz para aplicar as mudanças"
echo "4. 📤 Teste fazendo upload de uma imagem/vídeo"

echo ""
print_warning "Exemplo de comandos MinIO Client (mc):"
echo "  mc mb myminio/$S3_BUCKET_NAME"
echo "  mc policy set public myminio/$S3_BUCKET_NAME"

echo ""
print_info "Para testar a conectividade:"
echo "  curl -I $S3_ENDPOINT"

# Verificar se há processo Postiz rodando
if pgrep -f "postiz\|nest\|pm2" > /dev/null; then
    echo ""
    print_warning "⚠️  Postiz parece estar rodando. Considere reiniciar:"
    echo "  • Se usando pnpm dev: Ctrl+C e execute 'pnpm dev' novamente"
    echo "  • Se usando Docker: docker-compose restart"
    echo "  • Se usando PM2: pm2 restart all"
fi

echo ""
print_success "🎉 Setup do MinIO/S3 finalizado com sucesso!"

# Criar arquivo de teste se solicitado
echo ""
echo -n "Deseja criar um arquivo de teste para validar a configuração? [y/N]: "
read create_test

if [ "$create_test" = "y" ] || [ "$create_test" = "Y" ]; then
    echo ""
    print_info "Criando script de teste..."
    
    cat > test-s3-connection.sh << 'EOF'
#!/bin/bash

# 🧪 Teste de Conexão S3/MinIO para Postiz

source .env

echo "🧪 Testando conexão S3/MinIO..."
echo "Endpoint: $S3_ENDPOINT"
echo "Bucket: $S3_BUCKET_NAME"
echo ""

# Teste 1: Conectividade básica
echo "1. Testando conectividade básica..."
if curl -s -I "$S3_ENDPOINT" > /dev/null; then
    echo "   ✅ Endpoint acessível"
else
    echo "   ❌ Endpoint não acessível"
    exit 1
fi

# Teste 2: Verificar se bucket é acessível publicamente
echo "2. Testando acesso público ao bucket..."
if curl -s -I "$S3_PUBLIC_URL" > /dev/null; then
    echo "   ✅ Bucket acessível publicamente"
else
    echo "   ⚠️  Bucket pode não estar configurado para acesso público"
fi

# Teste 3: Verificar variáveis essenciais
echo "3. Verificando variáveis de ambiente..."
if [ -z "$S3_ACCESS_KEY" ] || [ -z "$S3_SECRET_KEY" ]; then
    echo "   ❌ Access Key ou Secret Key não configurados"
    exit 1
else
    echo "   ✅ Credenciais configuradas"
fi

echo ""
echo "🎉 Testes básicos concluídos!"
echo "💡 Para teste completo, faça upload via interface do Postiz"
EOF

    chmod +x test-s3-connection.sh
    print_success "Script de teste criado: test-s3-connection.sh"
    
    echo ""
    echo -n "Executar teste agora? [y/N]: "
    read run_test
    
    if [ "$run_test" = "y" ] || [ "$run_test" = "Y" ]; then
        echo ""
        ./test-s3-connection.sh
    fi
fi

echo ""
print_info "📋 Para mais informações, consulte: minio-config-example.md"
print_success "✨ Configuração finalizada! Bom uso do Postiz com MinIO!" 