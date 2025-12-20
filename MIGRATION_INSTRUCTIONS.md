# Como Executar a Migration 003 no Supabase

## 🔴 AÇÃO NECESSÁRIA: Execute esta migration antes de testar o cadastro

### Problema Identificado

O sistema estava apresentando erro de **Row Level Security (RLS)** ao tentar criar uma nova conta:

```
new row violates row-level security policy for table "organizations"
```

### Solução

Criamos uma **Database Function** que permite criar organizações e usuários de forma segura durante o cadastro, bypassando as políticas RLS de maneira controlada.

### Passos para Executar a Migration

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Entre no seu projeto Churchfy

2. **Abra o SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "+ New query"

3. **Cole e Execute a Migration**
   - Copie todo o conteúdo do arquivo: `supabase/migrations/003_fix_signup_rls.sql`
   - Cole no editor SQL
   - Clique em "Run" ou pressione Ctrl+Enter

4. **Verifique o Sucesso**
   - Você verá a mensagem: "Success. No rows returned"
   - Isso significa que a function foi criada com sucesso

### O que a Migration Faz

1. Remove a política RLS antiga que estava bloqueando inserts
2. Cria a função `handle_signup()` com privilégios elevados (`SECURITY DEFINER`)
3. Esta função:
   - Cria a organização
   - Cria o usuário com role `org_admin`
   - Retorna sucesso ou erro em formato JSON
4. Concede permissão de execução para usuários autenticados

### Após Executar a Migration

Você poderá:
- ✅ Criar novas contas sem erro de RLS
- ✅ Testar o fluxo completo de cadastro
- ✅ Continuar o desenvolvimento das features

### Testando

1. Acesse: http://localhost:5173/cadastro
2. Preencha o formulário com:
   - Nome: "Usuario Teste"
   - Email: "teste@churchfy.com"
   - Nome da Igreja: "Igreja Teste"
   - Senha: "123456"
3. Clique em "Criar conta"
4. O sistema deve redirecionar para `/dashboard` automaticamente

---

**Importante**: Esta migration já foi criada no diretório `supabase/migrations/`, mas precisa ser executada manualmente no Supabase Dashboard.
