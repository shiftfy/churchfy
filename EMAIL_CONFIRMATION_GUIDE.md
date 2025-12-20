# Configuração de Email Confirmation no Supabase

## 🔍 Problema Identificado

Após o signup, o sistema está redirecionando para `/login` ao invés de `/dashboard`, indicando que o Supabase está com **confirmação de email habilitada**.

## ✅ Opções de Solução

### Opção 1: Desabilitar Confirmação de Email (Recomendado para Desenvolvimento)

**Passos:**

1. Acesse o **Supabase Dashboard**
2. Vá em **Authentication** → **Settings** → **Email Auth**
3. Encontre a opção **"Enable email confirmations"**
4. **Desmarque** esta opção
5. Salve as alterações

**Após fazer isso:**
- Novos usuários poderão logar imediatamente após o signup
- Não será necessário confirmar email
- Perfeito para desenvolvimento e testes

### Opção 2: Usar Auto-confirm no Signup (Código)

Podemos modificar o código para usar a opção `emailRedirectTo` e `data`:

```typescript
const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
        data: {
            full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
    }
});
```

### Opção 3: Auto Sign-in Após Signup (Melhor Solução)

Vamos modificar o código para fazer login automático após criar a conta:

```typescript
// Após criar usuário, fazer login automático
const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
});

if (signInError) throw signInError;
```

## 🎯 Solução Recomendada

Para ambiente de **desenvolvimento**, recomendo:

1. **Desabilitar confirmação de email no Supabase** (Opção 1)
2. **Testar com uma nova conta** (a conta `admin@churchfy.com` pode continuar pendente de confirmação)

Para **produção**, manter a confirmação de email habilitada é importante para segurança.

## 📝 Verificando o Status Atual

Para verificar se o usuário foi criado com sucesso:

1. Vá em **Supabase Dashboard** → **Authentication** → **Users**
2. Procure pelo email: `admin@churchfy.com`
3. Verifique o status:
   - ✅ Se estiver lá = Signup funcionou!
   - ⏳ Se tiver status "Unconfirmed" = Precisa confirmar email
   - ❌ Se não estiver = Signup falhou

## 🔍 Verificando Dados no Banco

Vá em **Supabase Dashboard** → **Table Editor**:

1. **Tabela `organizations`**: Verifique se "Igreja Central" foi criada
2. **Tabela `users`**: Verifique se o usuário com role `org_admin` foi criado

Se ambas as tabelas tiverem os registros, significa que a **migration funcionou perfeitamente!** 🎉

---

**Próximo passo**: Desabilite a confirmação de email e teste novamente com um novo email (ex: `admin2@churchfy.com`).
