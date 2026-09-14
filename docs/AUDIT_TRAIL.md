# Trilha de Auditoria — SeedTrace PF

## Objetivo

Manter um histórico imutável das alterações realizadas em dados críticos de Pre-Foundation.

A auditoria deve permitir responder:

1. quem realizou a alteração;
2. quando ela ocorreu;
3. qual entidade foi afetada;
4. qual registro foi alterado;
5. quais campos mudaram;
6. qual era o conteúdo anterior;
7. qual passou a ser o conteúdo após a alteração.

## Estrutura

A migração `database/003_audit_log.sql` cria a tabela `audit_logs` e triggers de banco.

Cada evento armazena:

- `occurred_at`;
- `actor_user_id`;
- `actor_email`;
- `entity_type`;
- `entity_id`;
- `action`;
- `changed_fields`;
- `before_data`;
- `after_data`.

## Entidades auditadas na Build 001

- culturas;
- cultivares;
- descritores varietais;
- valores esperados por cultivar;
- materiais genéticos;
- lotes;
- perfis de usuários.

## Imutabilidade

A tabela de auditoria é append-only. Um trigger impede `UPDATE` e `DELETE` em eventos já registrados.

## Autoria

As rotas de escrita do backend associam o usuário autenticado aos campos `created_by` e `updated_by`. Os triggers utilizam esses campos para criar o evento de auditoria com autoria.

Alterações automáticas sem um ator de aplicação identificável podem aparecer como eventos de sistema.

## Acesso

Somente os perfis `admin` e `manager` podem consultar a trilha de auditoria pela API e pela interface web.

## Interface

A tela **Auditoria** permite filtrar por entidade e ação. Cada evento apresenta data, ator, campos alterados e comparação entre os estados anterior e posterior.

## Uso futuro

As Builds seguintes devem manter o mesmo padrão para:

- fazendas, campos, talhões e parcelas;
- inspeções de campo;
- off-types;
- roguing;
- colheita;
- beneficiamento;
- movimentações e genealogia de lotes.
