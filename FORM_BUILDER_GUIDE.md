# Guia do Módulo de Visitantes (Form Builder)

Este guia explica como utilizar o novo módulo de **Formulários de Visitantes** implementado no Churchfy.

## 📋 Visão Geral

O módulo permite criar formulários personalizados para coleta de dados de visitantes, gerar links públicos e gerenciar as respostas.

### Funcionalidades Implementadas

1.  **Listagem de Formulários**: Visualize todos os seus formulários, status (ativo/inativo) e ações rápidas.
2.  **Construtor de Formulários (Form Builder)**:
    -   Defina título, descrição e URL amigável (slug).
    -   Adicione campos dinamicamente (Texto, Email, Telefone, Data, Seleção, etc.).
    -   Configure obrigatoriedade e largura dos campos.
3.  **Página Pública**: Link acessível para visitantes preencherem o formulário (sem login).
4.  **Coleta de Respostas**: As respostas são salvas automaticamente no banco de dados.

## 🚀 Como Usar

### 1. Criar um Novo Formulário

1.  Acesse o menu **Visitantes** no painel lateral.
2.  Clique no botão **"Novo Formulário"**.
3.  Preencha as **Configurações Gerais**:
    -   **Título**: Ex: "Culto de Domingo - 19h".
    -   **Slug**: Será gerado automaticamente (ex: `culto-domingo-19h`), mas você pode alterar.
    -   **Descrição**: Uma mensagem de boas-vindas para o visitante.
4.  Adicione **Campos**:
    -   Clique em "Adicionar Campo".
    -   Defina o rótulo (ex: "Qual seu nome?").
    -   Escolha o tipo (Texto, Email, WhatsApp, etc.).
    -   Marque se é obrigatório.
5.  Clique em **Salvar Formulário**.

### 2. Compartilhar o Formulário

1.  Na lista de formulários, encontre o formulário desejado.
2.  Clique no ícone de **Copiar** (📋) para copiar o link público.
3.  Ou clique no ícone de **Olho** (👁️) para abrir a página pública.
4.  Envie o link para seus visitantes ou gere um QR Code (funcionalidade futura).

### 3. Visualizar Respostas

*Atualmente, as respostas são salvas no banco de dados (`visitor_responses`). O dashboard de visualização de métricas será implementado na próxima fase.*

## 🛠️ Detalhes Técnicos

-   **Tabelas**: `forms` e `visitor_responses`.
-   **Segurança**:
    -   Formulários públicos são acessíveis por qualquer pessoa (anon).
    -   Apenas administradores da organização podem criar/editar formulários e ver respostas.
-   **Rotas**:
    -   `/visitantes`: Listagem (Privada)
    -   `/visitantes/novo`: Criação (Privada)
    -   `/visitantes/editar/:id`: Edição (Privada)
    -   `/f/:slug`: Página Pública (Pública)

## 🔜 Próximos Passos (Roadmap)

-   [ ] Geração automática de QR Code para cada formulário.
-   [ ] Dashboard com gráficos de visitantes (Novos vs Recorrentes).
-   [ ] Integração com WhatsApp para envio de mensagem automática ao visitante.
