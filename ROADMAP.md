# Roadmap

## Build 001 — Foundation
**Status:** núcleo funcional concluído; hardening em andamento

Escopo concluído:
- [x] cadastro de culturas;
- [x] cadastro de cultivares;
- [x] descritores varietais por tipo;
- [x] listas controladas de descritores;
- [x] valores esperados por cultivar;
- [x] materiais genéticos;
- [x] lotes e vínculo com lote pai;
- [x] esquema PostgreSQL inicial;
- [x] API em TypeScript/Fastify;
- [x] integração preparada para Supabase;
- [x] interface web React/Vite;
- [x] telas de Culturas e Cultivares;
- [x] Ficha de Identidade Varietal;
- [x] telas de Materiais Genéticos e Lotes;
- [x] autenticação de usuários com Supabase Auth;
- [x] perfis e autorização de leitura/escrita no backend;
- [x] modo consulta no frontend;
- [x] gestão administrativa de usuários, papéis e status pela interface;
- [x] proteção contra auto-desativação e ausência de administrador ativo;
- [x] trilha de auditoria imutável no banco;
- [x] autoria de criação e alteração por usuário autenticado;
- [x] histórico antes/depois e campos alterados;
- [x] consulta de auditoria para Administrador e Gestor;
- [x] filtros de auditoria por entidade e ação;
- [x] CI separado para backend e frontend;
- [x] teste de saúde da API.

Hardening antes de encerrar a Build 001:
- [ ] validação avançada dos dados;
- [ ] testes dos endpoints de domínio e autorização;
- [ ] edição e inativação de cadastros.

## Build 002 — Field Structure
Campos, propriedades, talhões, parcelas e safras.

## Build 003 — Field Inspection
Inspeções, comparação esperado x observado, off-types, fotos, roguing e revisão.

## Build 004 — Traceability
QR Code, colheita, beneficiamento e genealogia ampliada.

## Build 005 — Dashboard
Indicadores, mapas, alertas e relatórios.
