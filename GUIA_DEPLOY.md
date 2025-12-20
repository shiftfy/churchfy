# Guia de Implantação do Sistema de Assinaturas

Para finalizar a configuração, siga estes passos:

## 1. Banco de Dados (Migration)
O arquivo `migration_017.sql` foi criado na raiz do projeto.
1. Vá para o [Supabase Dashboard](https://supabase.com/dashboard).
2. Abra seu projeto e váa em **SQL Editor**.
3. Copie o conteúdo do arquivo `migration_017.sql` e execute.

## 2. Variáveis de Ambiente
1. Renomeie o arquivo `.env.example` para `.env.local`.
2. Preencha as chaves:
   - `VITE_SUPABASE_URL`: URL do seu projeto Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Chave pública (anon) do Supabase.
   - `VITE_STRIPE_PUBLISHABLE_KEY`: Sua chave pública de teste do Stripe (`pk_test_...`).

## 3. Edge Function (Backend)
Para conectar com o Stripe, precisamos implantar a função `create-subscription`.
No terminal, execute:

```bash
# 1. Login no Supabase (se ainda não fez)
npx supabase login

# 2. Deploy da função
# Você precisará do Reference ID do seu projeto (ex: abcd123)
npx supabase functions deploy create-subscription --project-ref SEU_PROJECT_REF
```

> **Importante**: Após o deploy, vá na aba **Edge Functions** no Supabase Dashboard, selecione `create-subscription` e adicione a variável de ambiente secreta `STRIPE_SECRET_KEY` (sua chave secreta `sk_test_...` do Stripe).

## 4. Testar
Agora você pode rodar o projeto (`npm run dev`) e testar o fluxo de cadastro!
Use os cartões de teste do Stripe (ex: `4242 4242...`).
