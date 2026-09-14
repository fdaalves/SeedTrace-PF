# Data Validation

## Objetivo

A Build 001 usa duas camadas complementares de validação:

1. **API**: rejeita entradas inválidas antes de gravar e retorna mensagens de erro mais claras.
2. **PostgreSQL**: mantém constraints e triggers para impedir que dados inconsistentes entrem por outro caminho.

## Regras principais

### Códigos

- obrigatórios quando a entidade exige código;
- sem espaços;
- caracteres aceitos: letras, números, ponto, underscore, barra e hífen;
- tamanho máximo de acordo com a coluna;
- códigos duplicados são tratados como conflito (`409`).

### Cultivares e materiais

- cultivar precisa apontar para uma cultura ativa;
- material genético, quando associado a uma cultivar, precisa apontar para uma cultivar ativa;
- referências inexistentes são rejeitadas antes da gravação.

### Descritores varietais

Tipos permitidos:

- `text`
- `integer`
- `decimal`
- `boolean`
- `option`
- `range`

Criticidade permitida:

- `low`
- `medium`
- `high`
- `critical`

Descritores do tipo `option` precisam possuir pelo menos duas opções únicas. Outros tipos não aceitam `allowed_values`.

### Valor esperado por cultivar

O valor precisa ser compatível com o tipo do descritor:

- `text`: usa `value_text`;
- `option`: usa uma das opções cadastradas;
- `integer`: usa número inteiro;
- `decimal`: usa número finito;
- `range`: exige mínimo e máximo com `min <= max`;
- `boolean`: usa `true` ou `false` em `value_text`.

A cultivar e o descritor precisam pertencer à mesma cultura.

### Lotes e genealogia

- quantidade não pode ser negativa;
- material genético precisa existir;
- lote pai precisa existir;
- lote pai e lote filho não podem apontar para cultivares diferentes quando ambos possuem cultivar definida;
- um lote não pode ser pai de si próprio;
- ciclos de genealogia são bloqueados no PostgreSQL.

## Banco de dados

A migração `database/004_domain_validation.sql` adiciona constraints e triggers de proteção. As constraints são criadas como `NOT VALID` para não impedir a migração caso existam dados legados de demonstração, mas passam a ser aplicadas em todas as novas inclusões e alterações.

## Testes

`backend/src/lib/validation.test.ts` cobre as regras puras de validação, incluindo códigos, opções, compatibilidade de tipos e faixas numéricas.
