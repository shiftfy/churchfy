# Churchfy - Sistema de Gestão para Igrejas

Plataforma SaaS moderna para gestão de visitantes e atendimento automatizado via WhatsApp para igrejas.

## 🚀 Stack Tecnológica

- **Frontend:** React 19 + TypeScript + Vite
- **Routing:** React Router v6
- **Styling:** Tailwind CSS 3.4
- **UI Components:** ShadCN UI + Radix UI
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **State:** Zustand + TanStack Query
- **Icons:** Lucide React

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

## 🛠️ Configuração do Projeto

### 1. Clone e Instalação

```bash
# Instalar dependências
npm install
```

### 2. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

3. Preencha as variáveis de ambiente em `.env.local`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 3. Executar Migrations do Banco

No painel do Supabase:

1. Vá em **SQL Editor**
2. Execute o arquivo `supabase/migrations/001_initial_schema.sql`
3. Execute o arquivo `supabase/migrations/002_rls_policies.sql`

### 4. Iniciar Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:5173

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── ui/              # Componentes ShadCN UI
│   ├── layout/          # Layout (Sidebar, Header)
│   └── auth/            # ProtectedRoute
├── pages/
│   ├── auth/            # Login, Signup, ForgotPassword
│   ├── dashboard/       # Dashboard principal
│   ├── visitors/        # Módulo de visitantes
│   ├── whatsapp/        # Módulo WhatsApp
│   └── branches/        # Gestão de filiais
├── hooks/               # useAuth
├── lib/                 # Supabase client, utils
├── stores/              # Zustand stores
└── types/               # TypeScript types
```

## 🔐 Autenticação

### Fluxo de Cadastro

1. Acesse `/cadastro`
2. Preencha: Nome, Email, Nome da Igreja, Senha
3. Sistema cria automaticamente:
   - Usuário no Supabase Auth
   - Organização (igreja)
   - Registro de usuário com role `org_admin`
4. Redirecionamento automático para `/dashboard`

### Fluxo de Login

1. Acesse `/login`
2. Digite email e senha
3. Redirecionamento para `/dashboard` após autenticação

### Recuperação de Senha

1. Acesse `/esqueci-senha`
2. Digite seu email
3. Receba link de recuperação por email

## 👥 Níveis de Acesso

- **super_admin:** Acesso total a todas organizações
- **org_admin:** Acesso à organização e todas filiais
- **branch_admin:** Acesso apenas à filial específica

## 🗄️ Banco de Dados

### Tabelas Principais

- `organizations` - Igrejas principais
- `branches` - Filiais
- `users` - Usuários do sistema
- `forms` - Formulários customizados
- `visitor_responses` - Respostas de visitantes
- `whatsapp_configs` - Configurações WhatsApp
- `whatsapp_conversations` - Conversas
- `whatsapp_messages` - Mensagens
- `knowledge_base` - Base de conhecimento para IA

### Row Level Security (RLS)

Todas as tabelas possuem políticas RLS configuradas para garantir:
- Super admins veem tudo
- Org admins veem apenas sua organização e filiais
- Branch admins veem apenas sua filial
- Formulários públicos acessíveis sem autenticação

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint
```

## 🎨 Design System

### Cores

- **Background:** `#FAFAFA`
- **Primary:** `#3B82F6` (azul vibrante)
- **Secondary:** `#1E293B` (azul escuro)
- **Muted:** `#F1F5F9` (cinza claro)

### Tipografia

- **Fonte:** Inter (Google Fonts)
- **Pesos:** 300, 400, 500, 600, 700, 800

### Componentes

- Cards com sombras sutis
- Botões com estados hover/active
- Inputs com validação visual
- Animações suaves (200-300ms)

## 🚧 Roadmap

### ✅ Fase 1 - MVP (Concluído)
- [x] Setup inicial do projeto
- [x] Design system e componentes base
- [x] Sistema de autenticação completo
- [x] Dashboard básico
- [x] Migrations do banco de dados
- [x] RLS policies
- [x] **FIX**: Corrigido erro de RLS no signup via Database Function
- [x] **FIX**: Corrigido erro de recursão infinita no login
- [x] **FIX**: Corrigido erro de slug duplicado no cadastro
- [x] CRUD de filiais (Branches)
- [x] **Form builder** (Drag & drop, custom fields)
- [x] **Public form page** (Responsive, dynamic rendering)
- [x] **Form enhancements** (Branch connection, locked fields, live preview)
- [x] **Visitor list** (Table, filters, pagination)
- [x] **Visitor dashboard** (Charts, metrics)
- [x] **WhatsApp integration** (Settings page)
- [ ] **WhatsApp integration** (Messaging logic)

> **⚠️ IMPORTANTE**: Se encontrar erros de login ou cadastro, certifique-se de ter aplicado as correções:
> - [FIX_LOGIN_ERROR.md](./FIX_LOGIN_ERROR.md) (Erro de recursão no login)
> - [FIX_RPC_ERROR.md](./FIX_RPC_ERROR.md) (Erro de cadastro/slug)


### 📅 Fase 2 - Expansão
- [ ] Dashboard avançado com gráficos
- [ ] Form builder avançado (drag-and-drop)
- [ ] Exportação de dados
- [ ] Base de conhecimento para IA
- [ ] Dashboard de conversas WhatsApp
- [ ] Integração OpenAI

### 🔮 Fase 3 - Otimização
- [ ] Testes de performance
- [ ] Sistema de notificações
- [ ] Relatórios agendados
- [ ] Onboarding interativo
- [ ] Melhorias de acessibilidade

## 🤝 Contribuindo

Este projeto está em desenvolvimento ativo. Contribuições são bem-vindas!

## 📄 Licença

Propriedade da Equipe Churchfy - Todos os direitos reservados

---

**Versão:** 1.0.0  
**Última Atualização:** Dezembro 2024
