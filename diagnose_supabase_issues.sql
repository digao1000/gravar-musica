-- Script de diagnóstico avançado para problemas do Supabase
-- Execute no Supabase Dashboard -> SQL Editor

-- 1. VERIFICAR ESTADO ATUAL DAS POLÍTICAS RLS
SELECT 
    'Políticas RLS atuais:' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users';

-- 2. VERIFICAR SE RLS ESTÁ HABILITADO
SELECT 
    'Status RLS:' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 3. VERIFICAR ESTRUTURA DA TABELA USERS
SELECT 
    'Estrutura da tabela users:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. VERIFICAR USUÁRIOS NA TABELA AUTH.USERS
SELECT 
    'Usuários em auth.users:' as info,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    created_at,
    updated_at
FROM auth.users 
WHERE email LIKE '%rodrigomucuri%' OR email LIKE '%admin%'
ORDER BY created_at DESC;

-- 5. VERIFICAR USUÁRIOS NA TABELA PUBLIC.USERS
SELECT 
    'Usuários em public.users:' as info,
    id,
    name,
    email,
    role,
    is_active,
    created_at
FROM public.users 
WHERE email LIKE '%rodrigomucuri%' OR email LIKE '%admin%'
ORDER BY created_at DESC;

-- 6. VERIFICAR INCONSISTÊNCIAS ENTRE AS TABELAS
SELECT 
    'Inconsistências entre tabelas:' as info,
    CASE 
        WHEN au.id IS NULL THEN 'Usuário existe em public.users mas não em auth.users'
        WHEN pu.id IS NULL THEN 'Usuário existe em auth.users mas não em public.users'
        ELSE 'Usuário existe em ambas as tabelas'
    END as status,
    COALESCE(au.email, pu.email) as email,
    au.id as auth_id,
    pu.id as public_id
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE '%rodrigomucuri%' OR pu.email LIKE '%rodrigomucuri%' 
   OR au.email LIKE '%admin%' OR pu.email LIKE '%admin%';

-- 7. VERIFICAR TRIGGERS E FUNÇÕES
SELECT 
    'Triggers na tabela users:' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' AND event_object_schema = 'public';

-- 8. VERIFICAR FUNÇÕES RELACIONADAS A USUÁRIOS
SELECT 
    'Funções relacionadas a usuários:' as info,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%users%' 
   OR routine_name ILIKE '%user%'
   OR routine_name ILIKE '%auth%'
ORDER BY routine_name;

-- 9. TESTAR ACESSO DIRETO À TABELA (SEM RLS)
BEGIN;
    -- Temporariamente desabilitar RLS para teste
    ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
    
    SELECT 
        'Teste de acesso direto (RLS desabilitado):' as info,
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admin_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
    FROM public.users;
    
    -- Reabilitar RLS
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ROLLBACK;

-- 10. VERIFICAR LOGS DE ERRO (se disponível)
SELECT 
    'Status final do diagnóstico:' as info,
    'Diagnóstico completo - verifique os resultados acima' as message,
    NOW() as timestamp;