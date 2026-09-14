# Modelo de Dados

## Entidades principais

### Crop
Representa uma cultura agrícola.

### Cultivar
Representa cultivar ou linhagem vinculada a uma cultura.

### DescriptorDefinition
Define uma característica avaliável, como cor da flor ou hábito de crescimento.

### CultivarDescriptorValue
Armazena o padrão esperado do descritor para uma cultivar.

### GeneticMaterial
Representa um material genético recebido, mantido ou multiplicado.

### SeedLot
Representa um lote físico e permite genealogia através de relação lote pai/lote filho.

## Regra central
O padrão varietal e a observação de campo são dados distintos. Exemplo: padrão = flor roxa; observado = flor branca; resultado = possível divergência/off-type.
