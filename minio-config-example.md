# 🪣 Configuração MinIO/S3 para Postiz

Este guia mostra como configurar MinIO (ou qualquer serviço compatível com S3) como storage provider no Postiz.

## 📋 **Pré-requisitos**

- ✅ MinIO rodando em seu servidor
- ✅ Bucket criado e configurado
- ✅ Chaves de acesso (Access Key e Secret Key)
- ✅ URL pública para acesso aos arquivos

## ⚙️ **Variáveis de Ambiente**

Adicione as seguintes variáveis no seu arquivo `.env`:

```bash
# Storage Provider - usar 's3' para MinIO/S3
STORAGE_PROVIDER=s3

# Configurações S3/MinIO
S3_ENDPOINT=https://minio.seudominio.com
S3_REGION=us-east-1
S3_ACCESS_KEY=seu_access_key_aqui
S3_SECRET_KEY=sua_secret_key_aqui
S3_BUCKET_NAME=postiz-uploads
S3_PUBLIC_URL=https://minio.seudominio.com/postiz-uploads
S3_FORCE_PATH_STYLE=true

# Para AWS S3 (caso queira usar AWS em vez de MinIO)
# S3_FORCE_PATH_STYLE=false
```

## 🔧 **Configuração MinIO**

### **1. Criação do Bucket**

```bash
# Via MinIO Client (mc)
mc mb myminio/postiz-uploads

# Configurar política pública para leitura
mc policy set public myminio/postiz-uploads
```

### **2. Configuração de Políticas**

Exemplo de política JSON para o bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::postiz-uploads/*"]
    }
  ]
}
```

### **3. Configuração de CORS (se necessário)**

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

## 🌐 **Configurações por Ambiente**

### **MinIO Local (Desenvolvimento)**
```bash
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_PUBLIC_URL=http://localhost:9000/postiz-uploads
S3_FORCE_PATH_STYLE=true
```

### **MinIO Produção**
```bash
S3_ENDPOINT=https://minio.seudominio.com
S3_REGION=us-east-1
S3_PUBLIC_URL=https://minio.seudominio.com/postiz-uploads
S3_FORCE_PATH_STYLE=true
```

### **AWS S3**
```bash
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_PUBLIC_URL=https://seu-bucket.s3.amazonaws.com
S3_FORCE_PATH_STYLE=false
```

### **DigitalOcean Spaces**
```bash
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_REGION=nyc3
S3_PUBLIC_URL=https://seu-space.nyc3.digitaloceanspaces.com
S3_FORCE_PATH_STYLE=false
```

## ✅ **Testando a Configuração**

1. **Reinicie o Postiz** após adicionar as variáveis
2. **Faça upload de uma imagem** ou vídeo
3. **Verifique se o arquivo aparece** no seu bucket MinIO
4. **Teste o acesso público** à URL gerada

## 🚀 **Vantagens do MinIO**

- ✅ **Auto-hospedado** - controle total dos seus dados
- ✅ **Compatível com S3** - usa as mesmas APIs
- ✅ **Performance** - otimizado para alta velocidade
- ✅ **Escalabilidade** - suporta clusters distribuídos
- ✅ **Economia** - sem custos de egress/bandwidth
- ✅ **Privacidade** - dados ficam no seu servidor

## 🔧 **Configuração Docker Compose MinIO**

Exemplo de `docker-compose.yml` para MinIO:

```yaml
version: '3.8'
services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: password123
    volumes:
      - minio_data:/data
    networks:
      - postiz-network

volumes:
  minio_data:

networks:
  postiz-network:
    external: true
```

## 📝 **Exemplo de Configuração Completa**

Arquivo `.env` completo para MinIO:

```bash
# Database
DATABASE_URL="postgresql://postiz-local:postiz-local-pwd@localhost:5432/postiz-db-local"

# Upload Storage - MinIO
STORAGE_PROVIDER=s3
UPLOAD_DIRECTORY="/caminho/para/uploads/local"

# MinIO Configuration
S3_ENDPOINT=https://minio.seudominio.com
S3_REGION=us-east-1
S3_ACCESS_KEY=postiz_access_key
S3_SECRET_KEY=postiz_secret_key_super_segura
S3_BUCKET_NAME=postiz-uploads
S3_PUBLIC_URL=https://minio.seudominio.com/postiz-uploads
S3_FORCE_PATH_STYLE=true

# Frontend URL
FRONTEND_URL=http://localhost:4200

# JWT
JWT_SECRET=sua_jwt_secret_aqui

# Other required variables...
```

## 🆘 **Resolução de Problemas**

### **Erro de Conexão**
- Verifique se o MinIO está rodando
- Confirme o endpoint e porta
- Teste conectividade: `telnet minio.seudominio.com 9000`

### **Erro de Permissão**
- Verifique se as chaves de acesso estão corretas
- Confirme se o bucket existe
- Verifique as políticas de acesso

### **Arquivos não acessíveis**
- Confirme se `S3_PUBLIC_URL` está correto
- Verifique se o bucket tem política pública de leitura
- Teste acesso direto: `curl https://minio.seudominio.com/postiz-uploads/arquivo.jpg`

### **Path Style vs Virtual Hosted**
- MinIO: sempre use `S3_FORCE_PATH_STYLE=true`
- AWS S3: use `S3_FORCE_PATH_STYLE=false`
- Outros provedores: varie conforme documentação

---

🎉 **Pronto!** Agora o Postiz está configurado para usar seu MinIO como storage provider! 