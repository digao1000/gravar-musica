-- Script de correção radical para Supabase
-- Execute no Supabase Dashboard -> SQL Editor
-- ATENÇÃO: Este script faz mudanças drásticas no banco

-- 1. VERIFICAR E INSTALAR EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. DESABILITAR RLS COMPLETAMENTE
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- 3. REMOVER TODAS AS POLÍTICAS EXISTENTES
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.users';
        RAISE NOTICE 'Removida política: %', policy_record.policyname;
    END LOOP;
END $$;

-- 4. VERIFICAR E CORRIGIR ESTRUTURA DA TABELA USERS
DO $$
BEGIN
    -- Verificar se a tabela existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        -- Criar tabela se não existir
        CREATE TABLE public.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('ADMIN', 'FUNCIONARIO')),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela public.users criada';
    ELSE
        RAISE NOTICE 'Tabela public.users já existe';
    END IF;
END $$;

-- 5. LIMPAR E RECRIAR USUÁRIO ADMIN
DO $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT := 'rodrigomucuri@hotmail.com';
    admin_password TEXT := 'admin123';
BEGIN
    -- Remover usuário admin existente de public.users
    DELETE FROM public.users WHERE email = admin_email;
    RAISE NOTICE 'Usuário admin removido de public.users';
    
    -- Buscar ou criar usuário em auth.users
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = admin_email
    LIMIT 1;
    
    IF admin_user_id IS NULL THEN
        -- Criar novo usuário em auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            admin_email,
            crypt(admin_password, gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            false,
            'authenticated'
        ) RETURNING id INTO admin_user_id;
        
        RAISE NOTICE 'Novo usuário admin criado em auth.users com ID: %', admin_user_id;
    ELSE
        -- Atualizar usuário existente
        UPDATE auth.users 
        SET 
            encrypted_password = crypt(admin_password, gen_salt('bf')),
            email_confirmed_at = NOW(),
            updated_at = NOW(),
            raw_app_meta_data = '{"provider": "email", "providers": ["email"]}',
            role = 'authenticated'
        WHERE id = admin_user_id;
        
        RAISE NOTICE 'Usuário admin atualizado em auth.users com ID: %', admin_user_id;
    END IF;
    
    -- Criar usuário em public.users
    INSERT INTO public.users (
        id,
        name,
        email,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        admin_user_id,
        'Administrador',
        admin_email,
        'ADMIN',
        true,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Usuário admin criado em public.users';
END $$;

-- 6. CRIAR POLÍTICAS RLS EXTREMAMENTE SIMPLES
CREATE POLICY "allow_all_authenticated" 
ON public.users 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "allow_all_service_role" 
ON public.users 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 7. REABILITAR RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 8. CRIAR FUNÇÃO DE SINCRONIZAÇÃO SIMPLES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, role, is_active)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
        NEW.email,
        'FUNCIONARIO',
        true
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. CRIAR TRIGGER PARA SINCRONIZAÇÃO
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. VERIFICAÇÃO FINAL
SELECT 
    'VERIFICAÇÃO FINAL:' as status,
    (
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    ) as total_policies,
    (
        SELECT COUNT(*) 
        FROM public.users 
        WHERE email = 'rodrigomucuri@hotmail.com'
    ) as admin_users_public,
    (
        SELECT COUNT(*) 
        FROM auth.users 
        WHERE email = 'rodrigomucuri@hotmail.com'
    ) as admin_users_auth;

-- 11. MOSTRAR RESULTADO FINAL
SELECT 
    'USUÁRIO ADMIN FINAL:' as info,
    au.id,
    au.email,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    pu.name,
    pu.role,
    pu.is_active
FROM auth.users au
JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'rodrigomucuri@hotmail.com';

-- Script de correção radical executado com sucesso!