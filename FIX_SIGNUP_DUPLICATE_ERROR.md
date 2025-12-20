# Correção do Erro de Cadastro (Slug Duplicado)

Você encontrou o erro `duplicate key value violates unique constraint "organizations_slug_key"`. Isso acontece porque o sistema tentou criar uma organização com um nome (slug) que já existe no banco de dados.

Para corrigir isso e permitir que nomes repetidos sejam tratados automaticamente (ex: "Minha Igreja" vira "minha-igreja-1"), siga os passos abaixo:

## 1. Copie o Código SQL

Copie todo o conteúdo do código abaixo:

```sql
-- Fix signup slug collision issue
CREATE OR REPLACE FUNCTION public.handle_signup(
  p_auth_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_organization_name TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_org_slug TEXT;
  v_base_slug TEXT;
  v_counter INTEGER := 0;
  v_result jsonb;
BEGIN
  -- Generate base slug: replace non-alphanumeric chars with hyphens, lowercase
  v_base_slug := lower(regexp_replace(p_organization_name, '[^a-zA-Z0-9]+', '-', 'g'));
  -- Remove leading/trailing hyphens
  v_base_slug := trim(both '-' from v_base_slug);
  
  -- Ensure slug is not empty
  IF v_base_slug IS NULL OR v_base_slug = '' THEN
    v_base_slug := 'org-' || substring(md5(random()::text) from 1 for 6);
  END IF;
  
  v_org_slug := v_base_slug;

  -- Check for collision and append counter if necessary
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = v_org_slug) LOOP
    v_counter := v_counter + 1;
    v_org_slug := v_base_slug || '-' || v_counter;
  END LOOP;
  
  -- Insert organization
  INSERT INTO organizations (name, slug, email, plan)
  VALUES (p_organization_name, v_org_slug, p_email, 'free')
  RETURNING id INTO v_org_id;
  
  -- Insert user with org_admin role
  INSERT INTO users (id, email, full_name, role, organization_id)
  VALUES (p_auth_user_id, p_email, p_full_name, 'org_admin', v_org_id);
  
  -- Return success with organization ID
  v_result := jsonb_build_object(
    'success', true,
    'organization_id', v_org_id
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN v_result;
END;
$$;
```

## 2. Execute no Supabase

1.  Acesse o painel do seu projeto no [Supabase](https://supabase.com/dashboard).
2.  Vá em **SQL Editor**.
3.  Crie uma **New Query**.
4.  Cole o código e clique em **Run**.

## 3. Teste o Cadastro Novamente

Volte para a página de cadastro (`http://localhost:5173/cadastro`) e tente criar a conta novamente. Agora o sistema deve aceitar o nome da organização mesmo que ele já exista, adicionando um número ao final do link (slug).
