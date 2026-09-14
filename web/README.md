# SeedTrace PF Web

Interface web da Build 001.

## Stack

- React 19.3
- Vite 8.1
- TypeScript 7
- Supabase Auth

## Pré-requisitos

Antes de iniciar a interface:

1. execute `database/schema.sql` no projeto Supabase, caso a estrutura principal ainda não exista;
2. execute `database/002_auth_roles.sql` para criar `user_profiles`, papéis e o gatilho de provisionamento;
3. execute `database/003_audit_log.sql` para criar a trilha de auditoria, autoria e gatilhos das tabelas críticas;
4. crie o primeiro usuário em Supabase Authentication;
5. promova esse usuário para administrador no SQL Editor:

```sql
update public.user_profiles
set role = 'admin'
where email = 'seu-email@exemplo.com';
```

A chave `SUPABASE_SERVICE_ROLE_KEY` pertence somente ao backend e nunca deve ser exposta no navegador.

## Variáveis de ambiente

Copie `.env.example` para `.env` e informe:

```env
VITE_API_URL=http://localhost:3333
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-publishable-key
```

## Executar

```bash
npm install
npm run dev
```

Por padrão, o frontend espera a API em `http://localhost:3333`.

## Autenticação e permissões

O frontend autentica por e-mail e senha usando Supabase Auth. O access token é enviado à API em cada requisição e validado novamente pelo backend.

Papéis atuais:

- `admin`: leitura, escrita, gestão de usuários e auditoria;
- `manager`: leitura, escrita e consulta da auditoria;
- `technician`: leitura e escrita;
- `field_operator`: consulta nesta build;
- `viewer`: somente consulta.

A autorização de escrita é aplicada no backend. Ocultar formulários no frontend serve apenas como interface e não substitui a proteção da API.

## Trilha de auditoria

A migração `003_audit_log.sql` cria um histórico append-only para culturas, cultivares, descritores, valores varietais, materiais genéticos, lotes e perfis de usuários.

Cada evento pode registrar:

- data e hora;
- usuário responsável;
- entidade e registro afetado;
- inclusão, alteração ou exclusão;
- campos alterados;
- estado anterior;
- estado posterior.

Registros de auditoria não podem ser alterados ou apagados pelo fluxo normal da aplicação. Administradores e Gestores podem consultar o histórico pela tela `Auditoria`.

## Telas atuais

- Login
- Visão geral
- Culturas
- Cultivares
- Ficha de identidade varietal
- Materiais genéticos
- Lotes e genealogia
- Auditoria
- Usuários e permissões para Administradores

## Próximos passos

- validações avançadas;
- testes automatizados dos endpoints de domínio e autorização;
- edição e inativação de registros.
