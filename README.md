# SeedTrace PF

Sistema web para **gestão, rastreabilidade e acompanhamento de materiais Pre-Foundation na produção de sementes**, desenvolvido como projeto de portfólio com foco em identidade varietal, genealogia de lotes e controle de experimentos de campo.

> **Status atual:** Build 002 · `0.2.0-alpha`

## Visão geral

O SeedTrace PF organiza o fluxo técnico desde o cadastro da cultura e da cultivar até a avaliação de parcelas experimentais.

Fluxo principal:

```text
Cultura
  ↓
Cultivar
  ↓
Ficha de identidade varietal
  ↓
Material genético
  ↓
Lote de sementes
  ↓
Experimento
  ↓
Bloco
  ↓
Parcela
  ↓
Avaliação de campo
```

A aplicação mantém rastreabilidade entre os registros e uma trilha de auditoria para alterações relevantes.

## Objetivos do projeto

O SeedTrace PF foi pensado para apoiar rotinas de Pré-Fundação e pesquisa agrícola, permitindo:

- centralizar cadastros de culturas, cultivares e materiais genéticos;
- registrar características varietais por descritores;
- rastrear lotes e sua genealogia;
- vincular parcelas experimentais aos lotes de origem;
- estruturar experimentos em blocos e parcelas;
- registrar avaliações de campo;
- controlar usuários e papéis de acesso;
- manter histórico de alterações por meio de auditoria.

## Funcionalidades implementadas

### Identidade varietal

- cadastro de culturas;
- cadastro de cultivares;
- cadastro de descritores;
- tipos de descritores:
  - texto;
  - inteiro;
  - decimal;
  - booleano;
  - lista controlada;
  - faixa numérica;
- registro dos valores varietais por cultivar;
- validação entre cultivar e descritor da mesma cultura.

### Materiais e lotes

- cadastro de materiais genéticos;
- vínculo do material com a cultivar;
- origem e responsável;
- cadastro de lotes de sementes;
- genealogia por lote pai;
- quantidade, unidade, safra e status;
- proteção contra ciclos na genealogia;
- desativação lógica de materiais e lotes.

### Build 002 · Experimentos

A Build 002 amplia a rastreabilidade do lote para o campo experimental.

Inclui:

- cadastro de experimentos;
- cultura e safra;
- local;
- objetivo;
- delineamento experimental;
- número de repetições;
- data de semeadura e colheita;
- responsável;
- status do experimento;
- organização em blocos;
- cadastro de parcelas;
- identificação e numeração das parcelas;
- vínculo opcional da parcela ao lote de sementes de origem;
- tratamento/material da parcela;
- número de linhas;
- comprimento de parcela;
- espaçamento entre linhas;
- quantidade planejada de sementes;
- status da parcela;
- registro de avaliações por parcela;
- estágio fenológico;
- avaliação usando os descritores cadastrados;
- histórico das avaliações.

## Perfis de acesso

A aplicação utiliza Supabase Auth e papéis próprios em `user_profiles`.

| Papel | Consulta | Cadastros | Auditoria | Usuários |
|---|---:|---:|---:|---:|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `manager` | ✅ | ✅ | ✅ | — |
| `technician` | ✅ | ✅ | — | — |
| `field_operator` | ✅ | — | — | — |
| `viewer` | ✅ | — | — | — |

> Na implementação atual, operações de escrita da API são permitidas para `admin`, `manager` e `technician`. O papel `field_operator` ainda está em modo consulta e deverá receber permissões específicas de campo em uma etapa futura.

## Stack

### Backend

- Node.js
- TypeScript
- Fastify 5
- Supabase JS
- PostgreSQL / Supabase

### Frontend

- React 19
- TypeScript
- Vite 8
- Supabase Auth

### Banco de dados

- PostgreSQL
- Supabase
- Row Level Security
- triggers
- constraints
- trilha de auditoria

## Arquitetura

```text
┌──────────────────────────────┐
│          React + Vite        │
│            Frontend          │
└──────────────┬───────────────┘
               │ JWT do usuário
               ▼
┌──────────────────────────────┐
│      Fastify + TypeScript    │
│            Backend           │
└──────────────┬───────────────┘
               │ acesso servidor
               ▼
┌──────────────────────────────┐
│          Supabase            │
│ Auth + PostgreSQL + RLS      │
│ Auditoria + validações       │
└──────────────────────────────┘
```

O frontend autentica o usuário pelo Supabase Auth e envia o token JWT ao backend.

O backend valida a sessão, carrega o perfil da aplicação e aplica as permissões antes de acessar as tabelas de domínio.

## Estrutura do repositório

```text
SeedTrace-PF/
├── backend/
│   ├── src/
│   │   ├── lib/
│   │   ├── routes/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
├── database/
│   ├── schema.sql
│   ├── 002_auth_roles.sql
│   ├── 003_audit_log.sql
│   ├── 004_domain_validation.sql
│   ├── 005_editable_catalogs.sql
│   ├── 006_experiments.sql
│   ├── 007_security_hardening.sql
│   └── seed_soy.sql
├── docs/
│   └── BOOTSTRAP_ADMIN.md
├── web/
│   ├── src/
│   ├── .env.example
│   └── package.json
└── README.md
```

## Banco de dados

O projeto Supabase dedicado ao SeedTrace PF utiliza a região `sa-east-1`.

Migrações aplicadas no ambiente atual:

1. `001_build_001_core`
2. `002_auth_roles`
3. `003_audit_log`
4. `004_domain_validation`
5. `005_editable_catalogs`
6. `006_experiments`
7. `007_security_hardening`

### Principais tabelas

```text
crops
cultivars
descriptor_definitions
cultivar_descriptor_values
genetic_materials
seed_lots
experiments
experiment_blocks
experiment_plots
plot_assessments
user_profiles
audit_logs
```

## Segurança

O projeto inclui:

- autenticação via Supabase Auth;
- autorização baseada em papéis;
- validação de sessão no backend;
- Row Level Security nas tabelas públicas;
- tabelas de domínio protegidas contra acesso direto do cliente;
- acesso privilegiado restrito ao backend;
- funções internas de trigger removidas da exposição RPC;
- trilha de auditoria imutável;
- atribuição do usuário responsável por alterações;
- validações de domínio no PostgreSQL;
- proteção da genealogia contra ciclos.

### Segredos

Nunca versione:

- `SUPABASE_SERVICE_ROLE_KEY`;
- secret keys do Supabase;
- senhas;
- arquivos `.env`.

A chave privilegiada deve existir somente no backend.

## Dados iniciais de soja

O arquivo:

```text
database/seed_soy.sql
```

cria a cultura **Soja (`Glycine max`)** e descritores iniciais de identidade varietal, incluindo:

- cor da flor;
- cor da pubescência;
- hábito de crescimento;
- formato da folha;
- cor do hilo;
- grupo de maturidade;
- altura de planta;
- dias até florescimento;
- dias até maturação.

## Executando localmente

### Pré-requisitos

- Node.js instalado;
- npm;
- projeto Supabase configurado;
- usuário criado no Supabase Auth;
- migrations aplicadas.

### 1. Clone

```bash
git clone https://github.com/fdaalves/SeedTrace-PF.git
cd SeedTrace-PF
git checkout build-002-experiments
```

### 2. Backend

Entre na pasta:

```bash
cd backend
```

Crie o arquivo `.env` com base em `.env.example`:

```env
SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SECRETA
PORT=3333
```

Instale as dependências:

```bash
npm install
```

Inicie em desenvolvimento:

```bash
npm run dev
```

Por padrão, o backend fica disponível em:

```text
http://localhost:3333
```

Health check:

```text
GET /health
```

### 3. Frontend

Em outro terminal:

```bash
cd web
```

Crie o arquivo `.env`:

```env
VITE_API_URL=http://localhost:3333
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
```

Instale e execute:

```bash
npm install
npm run dev
```

O Vite normalmente disponibiliza a interface em:

```text
http://localhost:5173
```

## Primeiro administrador

O primeiro usuário deve ser criado no Supabase Auth.

O trigger de autenticação cria automaticamente seu registro em `user_profiles` com papel inicial `viewer`.

Depois, o primeiro administrador pode ser promovido diretamente no banco.

A sequência completa está documentada em:

```text
docs/BOOTSTRAP_ADMIN.md
```

## Testes e validação

### Backend

```bash
cd backend
npm run typecheck
npm test
npm run build
```

### Frontend

```bash
cd web
npm run typecheck
npm run build
```

Antes de integrar uma nova build, também devem ser validados:

- login e logout;
- autorização por papel;
- culturas;
- cultivares;
- descritores;
- valores varietais;
- materiais genéticos;
- lotes;
- genealogia;
- experimentos;
- blocos;
- parcelas;
- avaliações;
- usuários;
- auditoria.

## API

Principais grupos de endpoints:

```text
/api/account
/api/crops
/api/cultivars
/api/descriptors
/api/varietal-values
/api/materials
/api/lots
/api/experiments
```

Todos os endpoints sob `/api/` exigem autenticação.

Operações de escrita também exigem papel autorizado.

## Auditoria

Alterações nas principais entidades geram registros em `audit_logs`.

A auditoria armazena:

- data e hora;
- usuário;
- e-mail do usuário;
- entidade;
- registro afetado;
- ação;
- campos alterados;
- estado anterior;
- estado posterior.

A tabela de auditoria é protegida contra atualização e exclusão.

## Status da Build 002

Implementado:

- [x] culturas;
- [x] cultivares;
- [x] descritores;
- [x] identidade varietal;
- [x] materiais genéticos;
- [x] lotes;
- [x] genealogia;
- [x] autenticação;
- [x] papéis;
- [x] administração de usuários;
- [x] auditoria;
- [x] experimentos;
- [x] blocos;
- [x] parcelas;
- [x] avaliações por parcela;
- [x] hardening de segurança;
- [x] interface web integrada.

Em validação:

- [ ] testes funcionais completos da Build 002;
- [ ] revisão final antes do merge da PR.

## Roadmap

Próximas evoluções previstas:

- geração automática de delineamentos;
- randomização de tratamentos e parcelas;
- mapa/layout visual do experimento;
- registro de off-types;
- roguing;
- acompanhamento da implantação à colheita;
- avaliações específicas de estande, florescimento, maturação, acamamento e produtividade;
- anexos de campo;
- fotos;
- coordenadas/GPS;
- relatórios técnicos;
- exportação de dados;
- melhorias das permissões do operador de campo.

## Licença e uso

Projeto em desenvolvimento e atualmente mantido como **portfólio técnico**.

Antes de uso comercial ou implantação em produção, recomenda-se concluir os testes funcionais, revisar as políticas de acesso e definir formalmente a licença do projeto.

---

**SeedTrace PF**  
Rastreabilidade genética, controle de lotes e experimentação de campo para produção de sementes.
