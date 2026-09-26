# SeedTrace PF

Projeto de portfólio para gestão e rastreabilidade de materiais Pre-Foundation em produção de sementes.

## Build 002 · Experimentos

A Build 002 amplia a rastreabilidade do lote para o campo experimental:

- cadastro de experimentos por cultura, safra, local, delineamento e responsável;
- organização em blocos e parcelas;
- vínculo opcional da parcela ao lote de sementes de origem;
- registro de avaliações por parcela usando os descritores cadastrados;
- trilha de auditoria para experimentos, blocos, parcelas e avaliações;
- API protegida por autenticação e papéis;
- interface web integrada ao fluxo existente.

A migração da Build 002 está em `database/006_experiments.sql`. Antes de aplicá-la, confirme qual projeto Supabase pertence ao SeedTrace PF.
