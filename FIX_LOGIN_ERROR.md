# Correção do Erro de Login (Infinite Recursion)

Você encontrou o erro `infinite recursion detected in policy for relation "users"`. Isso acontece porque as regras de segurança da tabela de usuários estavam criando um "loop infinito" ao tentar verificar as permissões.

Para corrigir e liberar o login, siga os passos abaixo:

## 1. Copie o Código SQLLL

Copie todo o conteúdo do código abaixo:

```sql
-- Fix infinite recursion in users table RLS policies

-- 1. Create helper functions to check roles securely (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin_of(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND organization_id = org_id
    AND role = 'org_admin'
  );
END;
$$;

-- 2. Drop existing problematic policies on users table
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Org admins can view organization users" ON users;

-- 3. Recreate policies using the secure functions
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING ( is_super_admin() );

CREATE POLICY "Org admins can view organization users"
  ON users FOR SELECT
  TO authenticated
  USING ( is_org_admin_of(organization_id) );
```

## 2. Execute no Supabase

1.  Acesse o painel do seu projeto no [Supabase](https://supabase.com/dashboard).
2.  No menu lateral esquerdo, clique em **SQL Editor**.
3.  Clique em **+ New Query** (ou use uma aba em branco).
4.  Cole o código que você copiou.
5.  Clique no botão **Run** (canto inferior direito ou superior).

## 3. Teste o Login

Após ver a mensagem "Success" no Supabase:

1.  Volte para a aplicação (`http://localhost:5173/login`).
2.  Tente fazer login novamente.
3.  O erro deve ter desaparecido e você será redirecionado para o Dashboard.
