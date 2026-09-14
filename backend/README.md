# SeedTrace PF Backend

Backend inicial da Build 001, responsável pelo cadastro mestre e pela rastreabilidade básica de materiais.

## Stack

- Node.js
- TypeScript
- Fastify
- Supabase
- PostgreSQL

## Configuração

1. Crie um projeto no Supabase.
2. Execute `database/schema.sql` no SQL Editor.
3. Opcionalmente execute `database/seed_soy.sql` para carregar descritores iniciais de soja.
4. Copie `.env.example` para `.env` e informe as credenciais do projeto.
5. Instale as dependências com `npm install`.
6. Rode `npm run dev`.

## Endpoints iniciais

- `GET /health`
- `GET /api/crops`
- `POST /api/crops`
- `GET /api/cultivars`
- `POST /api/cultivars`
- `GET /api/descriptors`
- `POST /api/descriptors`
- `POST /api/descriptors/values`
- `GET /api/materials`
- `POST /api/materials`
- `GET /api/lots`
- `POST /api/lots`
- `GET /api/lots/:id`

## Segurança

A chave `SUPABASE_SERVICE_ROLE_KEY` é exclusiva do backend e nunca deve ser enviada para aplicações mobile ou web no cliente.

## Estado atual

Esta API é um esqueleto funcional da Build 001. Autenticação, permissões, validação avançada, testes automatizados e trilha de auditoria ainda serão adicionados.
