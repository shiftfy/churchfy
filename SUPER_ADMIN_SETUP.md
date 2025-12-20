# Configuração do Super Admin - Churchfy

## Passo 1: Criar Conta Super Admin

Antes de aplicar a migração do super admin, você precisa criar a conta via signup normal:

1. Acesse: `http://localhost:5173/cadastro`
2. Preencha o formulário com:
   - **Email:** `shitfy.gestao@gmail.com`
   - **Senha:** `Lorena@1108`
   - **Nome:** Qualquer nome (será atualizado para "Super Admin")
   - **Nome da Igreja:** Qualquer nome (pode ser "Admin")
   - **Username:** Qualquer username disponível (ex: `admin-platform`)

3. Complete o cadastro normalmente

## Passo 2: Aplicar Migração do Super Admin

Após criar a conta, execute a migração SQL no Supabase:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **+ New query**
4. Cole o conteúdo do arquivo `migration_create_super_admin.sql`
5. Clique em **Run** (Ctrl+Enter)

Você verá mensagens de sucesso:
```
NOTICE:  Created Platform Admin organization with ID: ...
NOTICE:  Updated existing user to super_admin role
```

## Passo 3: Acessar o Painel Super Admin

1. Faça logout se estiver logado
2. Faça login com:
   - **Email:** `shitfy.gestao@gmail.com`
   - **Senha:** `Lorena@1108`

3. Acesse: `http://localhost:5173/super-admin`

## Funcionalidades Disponíveis

### Dashboard (`/super-admin`)
- Estatísticas gerais da plataforma
- Total de usuários, organizações, jornadas, visitantes, formulários e respostas
- Links rápidos para gerenciamento

### Gerenciamento de Usuários (`/super-admin/users`)
- Listar todos os usuários da plataforma
- Buscar por nome, email ou organização
- Editar informações do usuário (nome, email, role, organização)
- Deletar usuários

### Gerenciamento de Organizações (`/super-admin/organizations`)
- Ranking de organizações por visitantes cadastrados
- Estatísticas por organização (usuários, jornadas, formulários)
- Bloquear/Desbloquear acesso de organizações
- Deletar organizações (com todos os dados relacionados)

## Segurança

- Apenas usuários com `role = 'super_admin'` podem acessar o painel
- Usuários normais são redirecionados para `/dashboard` se tentarem acessar
- Todas as operações são protegidas por RLS policies no banco de dados
- Não é possível deletar a própria conta de super admin
- Não é possível bloquear ou deletar a organização "Platform Admin"

## Troubleshooting

### Erro: "Super admin user not found in auth.users"
**Solução:** Você precisa criar a conta via signup primeiro (Passo 1)

### Erro: "Access denied. Super admin privileges required"
**Solução:** A migração não foi aplicada corretamente. Execute o Passo 2 novamente

### Não consigo acessar `/super-admin`
**Solução:** 
1. Verifique se está logado com o email correto
2. Confirme que a migração foi aplicada
3. Verifique no banco se o usuário tem `role = 'super_admin'`:
   ```sql
   SELECT email, role FROM users WHERE email = 'shitfy.gestao@gmail.com';
   ```
