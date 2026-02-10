# Novo Horizonte CMMS

Sistema de Gerenciamento de Manutenção Computadorizada (CMMS) para a indústria Novo Horizonte.

## Funcionalidades

- Gestão de Ordens de Serviço
- Controle de Ativos e Máquinas
- Gerenciamento de Estoque
- Controle de Técnicos
- Relatórios e Dashboards
- Configurações do Sistema (Logo, Tema, etc.)

## Como Rodar Localmente

1. Instale as dependências:
   `npm install`

2. Configure as variáveis de ambiente:
   Crie um arquivo `.env` na raiz do projeto com as chaves necessárias (Supabase, etc).

3. Rode o projeto:
   `npm run dev`

## Deploy na Vercel

Este projeto já está configurado para deploy na Vercel.

1. Faça o push do código para o GitHub.
2. Importe o projeto na Vercel.
3. A Vercel detectará automaticamente que é um projeto Vite.
4. Configure as variáveis de ambiente no painel da Vercel.
5. O arquivo `vercel.json` incluído garante que o roteamento SPA funcione corretamente.
