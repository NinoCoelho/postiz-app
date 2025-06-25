# 📧 Configuração de Email - Postiz

## 🎯 **Resumo Rápido**

Para receber notificações de erro por email, adicione estas variáveis ao seu arquivo `.env`:

```bash
# Provedor de email (escolha um)
EMAIL_PROVIDER=resend

# Informações do remetente
EMAIL_FROM_NAME="Postiz Notifications"
EMAIL_FROM_ADDRESS=noreply@seudominio.com

# Chave da API do Resend (recomendado)
RESEND_API_KEY=re_sua_chave_aqui
```

---

## 🔧 **Configuração Detalhada**

### **Variáveis Obrigatórias:**

```bash
# ===========================================
# 📧 CONFIGURAÇÃO BASE DE EMAIL
# ===========================================

# Provedor: 'resend', 'nodemailer', ou vazio para desabilitar
EMAIL_PROVIDER=resend

# Informações do remetente (obrigatório para todos)
EMAIL_FROM_NAME="Postiz Notifications"
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
```

---

## 🚀 **OPÇÃO 1: Resend (Recomendado)**

**Vantagens:** Fácil configuração, alta entregabilidade, gratuito até 3.000 emails/mês

```bash
# 1. Cadastre-se em: https://resend.com
# 2. Vá em: https://resend.com/api-keys
# 3. Crie uma nova API Key
# 4. Adicione ao .env:

EMAIL_PROVIDER=resend
RESEND_API_KEY=re_sua_chave_api_aqui
EMAIL_FROM_NAME="Postiz Alerts"
EMAIL_FROM_ADDRESS=alerts@seudominio.com
```

**Domínio:** Você precisa verificar seu domínio no Resend ou usar o domínio de teste deles.

---

## 📮 **OPÇÃO 2: SMTP/NodeMailer**

### **📧 Gmail (mais comum):**

```bash
EMAIL_PROVIDER=nodemailer
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=sua_senha_de_app
EMAIL_FROM_NAME="Postiz Notifications"
EMAIL_FROM_ADDRESS=seuemail@gmail.com
```

**⚠️ IMPORTANTE - Configuração Gmail:**
1. **Ative 2FA** na sua conta Google
2. **Gere senha de app:** https://myaccount.google.com/apppasswords
3. **Use a senha gerada** no `EMAIL_PASS` (não sua senha normal)

### **🏢 Outlook/Hotmail:**

```bash
EMAIL_PROVIDER=nodemailer
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seuemail@outlook.com
EMAIL_PASS=sua_senha
EMAIL_FROM_NAME="Postiz Notifications"
EMAIL_FROM_ADDRESS=seuemail@outlook.com
```

### **📫 Yahoo:**

```bash
EMAIL_PROVIDER=nodemailer
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seuemail@yahoo.com
EMAIL_PASS=sua_senha_de_app
EMAIL_FROM_NAME="Postiz Notifications"
EMAIL_FROM_ADDRESS=seuemail@yahoo.com
```

### **🏢 SMTP Personalizado:**

```bash
EMAIL_PROVIDER=nodemailer
EMAIL_HOST=smtp.seuservidor.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=seu_usuario
EMAIL_PASS=sua_senha
EMAIL_FROM_NAME="Postiz Notifications"
EMAIL_FROM_ADDRESS=noreply@seudominio.com
```

---

## 🔍 **Como Verificar se Está Funcionando**

### **1. Logs de Inicialização:**
```bash
# No console, você deve ver:
Email service provider: resend
# ou
Email service provider: nodemailer
```

### **2. Teste de Erro:**
- Poste um vídeo com formato inválido
- Verifique se recebeu email de notificação

### **3. Logs de Debug:**
```bash
# Se houver problema, você verá:
Missing environment variable: EMAIL_HOST
Email sender information not found in environment variables
```

---

## 🚨 **Exemplo de Email de Erro que Será Enviado:**

```html
🚨 Postiz Alert - Critical Error Detected

⚠️ Error posting to instagram:

🔹 Platform: instagram
🔹 Channel: Minha Conta Instagram  
🔹 Error: 🎥 Video format not supported. Please try a different video format

🔧 Next Steps:
• Check your media format and specifications
• Verify your account connection is active
• Review platform-specific requirements
• Contact support if the issue persists

🔗 [Go to Dashboard]
```

---

## ⚙️ **Configuração no Arquivo .env**

Adicione essas linhas ao final do seu arquivo `.env`:

```bash
# Email Configuration
EMAIL_PROVIDER=resend
EMAIL_FROM_NAME="Postiz Notifications"
EMAIL_FROM_ADDRESS=alerts@yourdomain.com
RESEND_API_KEY=re_your_api_key_here
```

---

## 🔄 **Após Configurar:**

1. **Reinicie os serviços:** `npm run dev` (ou docker restart)
2. **Verifique logs:** Deve aparecer o provider configurado
3. **Teste:** Poste algo que gere erro para testar

---

## 💡 **Dicas Importantes:**

- ✅ **Use Resend** se possível (mais fácil e confiável)
- ✅ **Verifique domínio** no Resend para melhor entregabilidade
- ✅ **Use senhas de app** para Gmail (não senha normal)
- ✅ **Configure EMAIL_FROM_ADDRESS** com um email válido
- ❌ **Não use senhas normais** para Gmail/Yahoo
- ❌ **Não deixe variáveis vazias** se quiser receber emails 