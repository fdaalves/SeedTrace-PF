-- SeedTrace PF - Build 001
-- Dados demonstrativos para soja

with crop as (
  insert into crops (code, common_name, scientific_name)
  values ('SOY', 'Soja', 'Glycine max')
  on conflict (code) do update set common_name = excluded.common_name
  returning id
)
insert into descriptor_definitions (
  crop_id, code, name, data_type, unit, phenological_stage, criticality, allowed_values
)
select id, 'flower_color', 'Cor da flor', 'option', null, 'R1-R2', 'high', '["Branca","Roxa"]'::jsonb from crop
union all
select id, 'pubescence_color', 'Cor da pubescência', 'option', null, 'Reprodutivo', 'high', '["Cinza","Marrom"]'::jsonb from crop
union all
select id, 'growth_habit', 'Hábito de crescimento', 'option', null, 'Safra', 'high', '["Determinado","Semideterminado","Indeterminado"]'::jsonb from crop
union all
select id, 'leaf_shape', 'Formato da folha', 'option', null, 'Vegetativo', 'medium', '["Oval","Lanceolada","Intermediária"]'::jsonb from crop
union all
select id, 'hilum_color', 'Cor do hilo', 'text', null, 'Pós-colheita', 'high', null from crop
union all
select id, 'maturity_group', 'Grupo de maturidade', 'decimal', null, 'Cadastro', 'medium', null from crop
union all
select id, 'plant_height', 'Altura de planta', 'range', 'cm', 'Final do ciclo', 'medium', null from crop
union all
select id, 'flowering_days', 'Dias até florescimento', 'range', 'DAE', 'R1', 'medium', null from crop
union all
select id, 'maturity_days', 'Dias até maturação', 'range', 'DAE', 'R8', 'medium', null from crop
on conflict (crop_id, code) do nothing;
