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

## Banco de dados

O projeto Supabase dedicado **SeedTrace-PF** foi criado na região `sa-east-1`.

Migrações aplicadas:

1. `001_build_001_core`
2. `002_auth_roles`
3. `003_audit_log`
4. `004_domain_validation`
5. `005_editable_catalogs`
6. `006_experiments`
7. `007_security_hardening`

A migração `007_security_hardening.sql` mantém as tabelas de domínio acessíveis apenas pelo backend com `service_role`, ativa RLS e remove a exposição direta das funções de trigger via RPC.

O arquivo `database/seed_soy.sql` fornece a cultura Soja e os descritores varietais iniciais para desenvolvimento e testes.
