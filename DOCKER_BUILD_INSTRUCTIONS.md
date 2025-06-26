# 🐳 Postiz Docker Build & Deploy Guide

Este guia explica como fazer build e deploy das imagens Docker do Postiz.

## 📋 Scripts Disponíveis

### 1. `build-and-push-simple.sh` - Single-platform Build (Recomendado)
- ✅ Build direto para amd64 + push para DockerHub
- ✅ Mais rápido e simples
- ✅ Ideal para produção
- ✅ Não mantém cópia local

### 2. `build-and-push-dockerhub.sh` - Multi-platform Build
- ✅ Constrói para múltiplas plataformas (amd64, arm64)
- ✅ Faz push automaticamente para DockerHub
- ⚠️ Requer Docker Buildx
- ⚠️ Mais lento devido ao multi-platform

### 3. `build-and-deploy.sh` - Deploy via SCP
- ✅ Constrói e transfere via SCP
- ✅ Para deploy em servidores específicos

## 🚀 Como Usar

### Preparação Inicial

1. **Login no DockerHub**
   ```bash
   docker login
   ```

2. **Editar Configurações**
   
   Abra o script desejado e altere estas linhas:
   ```bash
   DOCKERHUB_USERNAME="seunome"  # ⚠️ ALTERE AQUI
   IMAGE_NAME="postiz-app"       # Nome da sua imagem
   VERSION_TAG="latest"          # Tag da versão
   ```

### Opção 1: Build Simples - amd64 (Recomendado)

```bash
./build-and-push-simple.sh
```

**Vantagens:**
- Build direto + push para DockerHub
- Mais rápido e eficiente
- Ideal para produção
- Sem armazenamento local

### Opção 2: Build Multi-platform

```bash
./build-and-push-dockerhub.sh
```

**Vantagens:**
- Funciona em servidores Intel e ARM
- Máxima compatibilidade
- Para casos especiais que requerem ARM

### Opção 3: Deploy via SCP

```bash
./build-and-deploy.sh
```

**Para usar:**
1. Configure as variáveis do servidor no script
2. Execute o script

## 🛠️ Resolução de Problemas

### Build Cancelado/Timeout

Se o build for cancelado como mostrado nos logs:
```
CANCELED [12/12] RUN pnpm run build
```

**Soluções:**

1. **Aumentar Memória do Docker**
   - Docker Desktop → Settings → Resources
   - Aumentar RAM para 8GB+

2. **Build Manual (se script falhar)**
   ```bash
   # Build e push manual
   docker build --platform linux/amd64 -t idemir/postiz-app:latest -f Dockerfile.dev .
   docker push idemir/postiz-app:latest
   ```

3. **Limpar Cache Docker**
   ```bash
   docker system prune -a --volumes
   docker builder prune -a
   ```

### Erro de Memória

Se aparecer erro `JavaScript heap out of memory`:

1. **Verificar NODE_OPTIONS no Dockerfile**
   ```dockerfile
   ENV NODE_OPTIONS="--max-old-space-size=8192"
   ```

2. **Build com mais memória**
   ```bash
   docker build --memory 8g -t seunome/postiz-app -f Dockerfile.dev .
   ```

### Erro de Login DockerHub

```bash
# Fazer logout e login novamente
docker logout
docker login
```

## 📦 Após o Push

### Verificar no DockerHub
Acesse: `https://hub.docker.com/r/idemir/postiz-app`

### Testar a Imagem (opcional)
```bash
# Pull da imagem no servidor de produção
docker pull idemir/postiz-app:latest

# Rodar container de teste
docker run -d \
  --name postiz-test \
  -p 4200:4200 \
  idemir/postiz-app:latest

# Verificar logs
docker logs postiz-test -f
```

### Deploy em Produção
```bash
# No servidor de produção
docker pull idemir/postiz-app:latest
docker stop postiz-old || true
docker rm postiz-old || true
docker run -d \
  --name postiz \
  --restart unless-stopped \
  -p 4200:4200 \
  -v /path/to/uploads:/app/uploads \
  -e DATABASE_URL="your-db-url" \
  idemir/postiz-app:latest
```

## 🏷️ Versionamento

Para criar versões específicas:

```bash
# Altere VERSION_TAG no script para:
VERSION_TAG="v1.0.0"

# Ou use múltiplas tags:
docker tag seunome/postiz-app:latest seunome/postiz-app:v1.0.0
docker push seunome/postiz-app:v1.0.0
```

## 🔧 Otimizações Avançadas

### Build com BuildKit
```bash
export DOCKER_BUILDKIT=1
docker build -t seunome/postiz-app -f Dockerfile.dev .
```

### Build com Cache
```bash
docker build \
  --cache-from seunome/postiz-app:latest \
  -t seunome/postiz-app:latest \
  -f Dockerfile.dev .
```

### Multi-stage Build (Para reduzir tamanho)
```dockerfile
# Exemplo de Dockerfile otimizado
FROM node:20-alpine3.19 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine3.19 AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

## 📊 Monitoramento

### Verificar Tamanho da Imagem
```bash
docker images seunome/postiz-app
```

### Histórico da Imagem
```bash
docker history seunome/postiz-app:latest
```

### Informações Detalhadas
```bash
docker inspect seunome/postiz-app:latest
```

---

## 🆘 Suporte

Se encontrar problemas:

1. ✅ Verifique os logs do Docker
2. ✅ Confirme login no DockerHub
3. ✅ Verifique espaço em disco
4. ✅ Teste build local primeiro
5. ✅ Consulte a documentação do Docker 