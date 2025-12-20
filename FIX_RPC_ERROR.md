# Correção Final do Cadastro (Erro JSON)

O erro `Cannot coerce the result to a single JSON object` ocorre devido a uma incompatibilidade na forma como o Supabase lê o retorno da função de banco de dados.

Para resolver isso definitivamente, simplificamos a função para não retornar dados complexos, apenas sucesso ou erro.

## 1. Copie o Código SQL

Copie todo o conteúdo abaixo:

```sql
-- Simplify handle_signup function to return VOID and raise exceptions
DROP FUNCTION IF EXISTS public.handle_signup(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.handle_signup(
  p_auth_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_organization_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_org_slug TEXT;
  v_base_slug TEXT;
  v_counter INTEGER := 0;
BEGIN
  -- Generate base slug
  v_base_slug := lower(regexp_replace(p_organization_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  
  IF v_base_slug IS NULL OR v_base_slug = '' THEN
    v_base_slug := 'org-' || substring(md5(random()::text) from 1 for 6);
  END IF;
  
  v_org_slug := v_base_slug;

  -- Check for collision
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = v_org_slug) LOOP
    v_counter := v_counter + 1;
    v_org_slug := v_base_slug || '-' || v_counter;
  END LOOP;
  
  -- Insert organization
  INSERT INTO organizations (name, slug, email, plan)
  VALUES (p_organization_name, v_org_slug, p_email, 'free')
  RETURNING id INTO v_org_id;
  
  -- Insert user
  INSERT INTO users (id, email, full_name, role, organization_id)
  VALUES (p_auth_user_id, p_email, p_full_name, 'org_admin', v_org_id);
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_signup(UUID, TEXT, TEXT, TEXT) TO authenticated;
```

## 2. Execute no Supabase

1.  Vá ao **SQL Editor** no Supabase.
2.  Crie uma nova query.
3.  Cole o código e clique em **Run**.

## 3. Limpeza Importante (Recomendado)

Como houveram tentativas falhas, seu usuário pode ter ficado em um estado inconsistente (criado no Auth mas não no banco de dados).

1.  Vá em **Authentication** -> **Users** no painel do Supabase.
2.  Encontre o usuário que você tentou criar (pelo email).
3.  Clique nos três pontinhos e selecione **Delete user**.
4.  Confirme a exclusão.

## 4. Teste Final

Agora tente se cadastrar novamente em `http://localhost:5173/cadastro`. Deve funcionar perfeitamente!
