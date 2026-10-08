# Execução local no Windows — Build 002

Use a branch `build-002-experiments`. A PR #1 continua draft até a validação funcional ser concluída.

## Requisitos

- Node.js 24 LTS e npm.
- Supabase SeedTrace-PF com as migrações 001–007 já aplicadas.
- Usuário administrador existente. Não execute novamente o bootstrap ou o seed nesse projeto.

## Ambiente

Na raiz do repositório, usando PowerShell:

```powershell
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path web/.env)) { Copy-Item web/.env.example web/.env }
```

Preencha os arquivos localmente. Não cole credenciais em comandos ou mensagens.

- `backend/.env`: URL do Supabase e `SUPABASE_SERVICE_ROLE_KEY`, exclusivamente no servidor. `PORT=3333`, `HOST=127.0.0.1` e `CORS_ORIGIN=http://localhost:5173`.
- `web/.env`: `VITE_API_URL=http://localhost:3333`, URL do mesmo Supabase e `VITE_SUPABASE_PUBLISHABLE_KEY` com uma chave `sb_publishable_...`.

Os `.env` são ignorados pelo Git. Verifique com `git check-ignore backend/.env web/.env`. Nunca use a chave privilegiada em variável `VITE_*`.

## Instalação e validação

```powershell
npm.cmd ci --prefix backend
npm.cmd ci --prefix web
npm.cmd run typecheck --prefix backend
npm.cmd test --prefix backend
npm.cmd run build --prefix web
```

Os testes compilam o TypeScript e usam o runner nativo do Node no JavaScript gerado. O glob está entre aspas para funcionar igualmente no Windows e no Linux. Os testes de contrato e autorização usam autenticação injetada; não substituem os testes com login e banco reais.

## Iniciar

Terminal 1:

```powershell
Set-Location backend
npm.cmd run build
npm.cmd start
```

Terminal 2:

```powershell
Set-Location web
npm.cmd run dev -- --host localhost --strictPort
```

Abra http://localhost:5173. A saúde da API fica em http://localhost:3333/health.

`npm.cmd start` carrega o `.env` do diretório backend quando existir, preservando variáveis já definidas no ambiente. Para recarga do backend durante desenvolvimento, use `npm.cmd run dev`. Se `tsx` falhar com `uv_os_get_passwd` em um ambiente Windows restrito, use build + start e reinicie após compilar alterações. Não é necessário desativar proteções do Windows.

O uso de `npm.cmd` evita depender da política de execução de scripts PowerShell. Se o cache padrão do npm não tiver permissão de escrita, use `--cache` apontando para uma pasta autorizada.

## Por que a chave privilegiada permanece

O frontend autentica no Supabase com a publishable key. O backend valida o token do usuário, consulta `user_profiles` e verifica papel e status ativo. As migrações 006 e 007 revogam o acesso direto de `anon` e `authenticated` às tabelas de domínio. As rotas dependem de `service_role` para ler e gravar essas tabelas, administrar perfis e registrar `created_by` / `updated_by` usados nos triggers de auditoria. Trocar essa chave pela publishable quebraria esse fluxo; mudar a arquitetura exigiria uma revisão conjunta das rotas, grants, RLS e autoria.

## Roteiro de aceite

Use registros identificados por `QA-B002-*` para distinguir a validação de dados operacionais. A auditoria é permanente; não apague seu histórico.

1. Entrar com o administrador existente e confirmar seu papel.
2. Criar cultura e cultivar; verificar atualização das listas e erro para código duplicado.
3. Criar material e lote; verificar vínculo e genealogia.
4. Criar experimento, bloco e parcela vinculada ao lote.
5. Registrar avaliação com descritor compatível com a cultura e confirmar o valor após recarregar.
6. Consultar auditoria, filtrar as entidades da Build 002 e conferir ator e conteúdo gravado.
7. Consultar Usuários e verificar proteção contra auto-inativação e remoção do último administrador.
8. Verificar edição/inativação em Manutenção e os bloqueios de dependências.
9. Confirmar que requisições sem autenticação são rejeitadas e que a chave privilegiada não aparece no frontend ou nos arquivos versionados.

Somente considerar a Build 002 validada quando os testes locais e funcionais forem concluídos. Não fazer merge enquanto houver falhas ou etapas pendentes.
