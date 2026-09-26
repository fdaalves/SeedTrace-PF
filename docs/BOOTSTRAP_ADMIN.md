# Bootstrap do primeiro administrador

O SeedTrace PF usa Supabase Auth para autenticação e a tabela `public.user_profiles` para papéis da aplicação.

## 1. Criar o primeiro usuário

No projeto Supabase **SeedTrace-PF**, abra **Authentication → Users** e crie manualmente o primeiro usuário com e-mail e senha.

O trigger `public.handle_new_user()` criará automaticamente o registro correspondente em `public.user_profiles` com papel inicial `viewer`.

## 2. Promover o usuário para administrador

No SQL Editor do mesmo projeto, execute:

```sql
update public.user_profiles
set role = 'admin',
    is_active = true,
    updated_at = now()
where email = 'SEU_EMAIL_AQUI';
```

Confirme o resultado:

```sql
select id, email, full_name, role, is_active
from public.user_profiles
where email = 'SEU_EMAIL_AQUI';
```

## 3. Configurar o backend

Use variáveis de ambiente, nunca faça commit de chaves secretas:

```env
SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
PORT=3333
```

A `SUPABASE_SERVICE_ROLE_KEY` deve existir somente no backend.

## 4. Configurar o frontend

```env
VITE_API_URL=http://localhost:3333
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_PUBLISHABLE_KEY
```

A chave publishable pode ser usada pelo navegador. Não use a service role no frontend.

## 5. Testar

1. Inicie o backend.
2. Inicie o frontend.
3. Faça login com o administrador criado.
4. Confirme acesso a Culturas, Cultivares, Lotes, Experimentos, Auditoria e Usuários.
