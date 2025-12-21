# Guia de Deploy - Integração WhatsApp

A integração com a Evolution API utiliza uma Supabase Edge Function (`whatsapp-manager`) para gerenciar as credenciais de forma segura.

## 1. Variáveis de Ambiente (Secrets)

Para que a função funcione, você precisa configurar os segredos no Supabase.

### Obter Credenciais
1. **EVOLUTION_API_URL**: A URL da sua instância Evolution API (ex: `https://api.evolution.com`).
2. **EVOLUTION_API_KEY**: A API Key global do Evolution API.

### Configurar no Supabase
**IMPORTANTE**: Você precisa estar logado na CLI do Supabase.

1. Faça login (se não estiver):
```bash
npx supabase login
```

2. Configure os segredos (use o Project Reference ID `vgpiowqyxhqgzawieymu`):
```bash
npx supabase secrets set --env-file .env --project-ref vgpiowqyxhqgzawieymu
```

Ou configure manualmente via Dashboard do Supabase.
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `SUPABASE_URL` 
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (usada para atualizar a tabela de configs com permissão de admin)

## 2. Deploy da Função

Se você ainda não fez o deploy, rode:

```bash
npx supabase functions deploy whatsapp-manager
```

## 3. Webhooks

O sistema está configurado para receber notificações da Evolution API, mas para isso seu servidor N8N deve estar configurado para receber estas mensagens através do campo `n8n_webhook_url` na tela de configurações (`/whatsapp`).

## 4. Testando

1. Acesse `/whatsapp` no Churchfy.
2. Insira a URL do seu Webhook do N8N.
3. Clique em "Conectar WhatsApp Agora".
4. Se tudo estiver correto, um QR Code será gerado.
5. Leia o QR Code e aguarde a confirmação.
