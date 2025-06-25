#!/bin/bash

# 📧 Script de Configuração de Email - Postiz
# Execute: chmod +x setup-email.sh && ./setup-email.sh

echo "📧 Configuração de Email - Postiz"
echo "================================="
echo ""

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "Por favor, execute este script na raiz do projeto Postiz."
    exit 1
fi

echo "🔧 Escolha o provedor de email:"
echo "1) Resend (Recomendado - Fácil configuração)"
echo "2) Gmail (SMTP)"
echo "3) Outlook/Hotmail (SMTP)"
echo "4) Yahoo (SMTP)"
echo "5) SMTP Personalizado"
echo ""

read -p "Escolha uma opção (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Configurando Resend..."
        echo ""
        echo "1. Acesse: https://resend.com"
        echo "2. Crie uma conta gratuita"
        echo "3. Vá em: https://resend.com/api-keys"
        echo "4. Crie uma nova API Key"
        echo ""
        read -p "Cole sua API Key do Resend: " resend_key
        read -p "Nome do remetente (ex: Postiz Alerts): " from_name
        read -p "Email do remetente (ex: alerts@seudominio.com): " from_email
        
        echo "" >> .env
        echo "# 📧 Email Configuration - Resend" >> .env
        echo "EMAIL_PROVIDER=resend" >> .env
        echo "EMAIL_FROM_NAME=\"$from_name\"" >> .env
        echo "EMAIL_FROM_ADDRESS=$from_email" >> .env
        echo "RESEND_API_KEY=$resend_key" >> .env
        
        echo ""
        echo "✅ Configuração Resend adicionada ao .env!"
        ;;
    2)
        echo ""
        echo "📧 Configurando Gmail..."
        echo ""
        echo "⚠️  IMPORTANTE:"
        echo "1. Ative 2FA na sua conta Google"
        echo "2. Acesse: https://myaccount.google.com/apppasswords"
        echo "3. Gere uma senha de app para 'Mail'"
        echo "4. Use a senha gerada abaixo (não sua senha normal)"
        echo ""
        read -p "Seu email Gmail: " gmail_user
        read -p "Senha de app do Gmail: " gmail_pass
        read -p "Nome do remetente (ex: Postiz Notifications): " from_name
        
        echo "" >> .env
        echo "# 📧 Email Configuration - Gmail" >> .env
        echo "EMAIL_PROVIDER=nodemailer" >> .env
        echo "EMAIL_HOST=smtp.gmail.com" >> .env
        echo "EMAIL_PORT=587" >> .env
        echo "EMAIL_SECURE=true" >> .env
        echo "EMAIL_USER=$gmail_user" >> .env
        echo "EMAIL_PASS=$gmail_pass" >> .env
        echo "EMAIL_FROM_NAME=\"$from_name\"" >> .env
        echo "EMAIL_FROM_ADDRESS=$gmail_user" >> .env
        
        echo ""
        echo "✅ Configuração Gmail adicionada ao .env!"
        ;;
    3)
        echo ""
        echo "🏢 Configurando Outlook/Hotmail..."
        echo ""
        read -p "Seu email Outlook: " outlook_user
        read -p "Sua senha: " outlook_pass
        read -p "Nome do remetente (ex: Postiz Notifications): " from_name
        
        echo "" >> .env
        echo "# 📧 Email Configuration - Outlook" >> .env
        echo "EMAIL_PROVIDER=nodemailer" >> .env
        echo "EMAIL_HOST=smtp-mail.outlook.com" >> .env
        echo "EMAIL_PORT=587" >> .env
        echo "EMAIL_SECURE=false" >> .env
        echo "EMAIL_USER=$outlook_user" >> .env
        echo "EMAIL_PASS=$outlook_pass" >> .env
        echo "EMAIL_FROM_NAME=\"$from_name\"" >> .env
        echo "EMAIL_FROM_ADDRESS=$outlook_user" >> .env
        
        echo ""
        echo "✅ Configuração Outlook adicionada ao .env!"
        ;;
    4)
        echo ""
        echo "📫 Configurando Yahoo..."
        echo ""
        echo "⚠️  IMPORTANTE:"
        echo "Para Yahoo, você precisa gerar uma senha de app:"
        echo "1. Vá em Configurações > Segurança da conta"
        echo "2. Ative verificação em duas etapas"
        echo "3. Gere senha para aplicativos"
        echo ""
        read -p "Seu email Yahoo: " yahoo_user
        read -p "Senha de app do Yahoo: " yahoo_pass
        read -p "Nome do remetente (ex: Postiz Notifications): " from_name
        
        echo "" >> .env
        echo "# 📧 Email Configuration - Yahoo" >> .env
        echo "EMAIL_PROVIDER=nodemailer" >> .env
        echo "EMAIL_HOST=smtp.mail.yahoo.com" >> .env
        echo "EMAIL_PORT=587" >> .env
        echo "EMAIL_SECURE=false" >> .env
        echo "EMAIL_USER=$yahoo_user" >> .env
        echo "EMAIL_PASS=$yahoo_pass" >> .env
        echo "EMAIL_FROM_NAME=\"$from_name\"" >> .env
        echo "EMAIL_FROM_ADDRESS=$yahoo_user" >> .env
        
        echo ""
        echo "✅ Configuração Yahoo adicionada ao .env!"
        ;;
    5)
        echo ""
        echo "🏢 Configurando SMTP Personalizado..."
        echo ""
        read -p "Host SMTP (ex: smtp.seuservidor.com): " smtp_host
        read -p "Porta SMTP (ex: 587): " smtp_port
        read -p "Usar SSL/TLS? (true/false): " smtp_secure
        read -p "Usuário SMTP: " smtp_user
        read -p "Senha SMTP: " smtp_pass
        read -p "Nome do remetente: " from_name
        read -p "Email do remetente: " from_email
        
        echo "" >> .env
        echo "# 📧 Email Configuration - Custom SMTP" >> .env
        echo "EMAIL_PROVIDER=nodemailer" >> .env
        echo "EMAIL_HOST=$smtp_host" >> .env
        echo "EMAIL_PORT=$smtp_port" >> .env
        echo "EMAIL_SECURE=$smtp_secure" >> .env
        echo "EMAIL_USER=$smtp_user" >> .env
        echo "EMAIL_PASS=$smtp_pass" >> .env
        echo "EMAIL_FROM_NAME=\"$from_name\"" >> .env
        echo "EMAIL_FROM_ADDRESS=$from_email" >> .env
        
        echo ""
        echo "✅ Configuração SMTP personalizada adicionada ao .env!"
        ;;
    *)
        echo "❌ Opção inválida!"
        exit 1
        ;;
esac

echo ""
echo "🔄 Próximos passos:"
echo "1. Reinicie os serviços: npm run dev"
echo "2. Verifique os logs para confirmar a configuração"
echo "3. Teste postando algo que gere erro"
echo ""
echo "📖 Para mais detalhes, veja: email-config-example.md"
echo ""
echo "✅ Configuração concluída!" 