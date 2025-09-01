-- Script para corrigir problemas de login admin
-- Execute este script no Supabase Dashboard -> SQL Editor

-- 1. CORRIGIR POLÍTICAS RLS COM RECURSÃO INFINITA
-- Primeiro, vamos dropar as políticas problemáticas e recriar sem recursão

-- Dropar políticas existentes da tabela users
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- Criar políticas simples sem recursão
CREATE POLICY "Enable read for authenticated users" ON public.users
    FOR SELECT USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Enable insert for service role" ON public.users
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Enable update for own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'service_role');

-- 2. VERIFICAR E CORRIGIR USUÁRIO ADMIN
DO $$
DECLARE
    existing_user_id UUID;
    target_user_id UUID := 'e165a899-0b5b-42b8-8693-d274903672ec';
BEGIN
    -- Verificar se já existe um usuário com este email
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE email = 'rodrigomucuri@hotmail.com';
    
    IF existing_user_id IS NOT NULL THEN
        -- Se existe mas com ID diferente, atualizar o ID na tabela public.users
        IF existing_user_id != target_user_id THEN
            RAISE NOTICE 'Usuário encontrado com ID diferente: %. Atualizando public.users...', existing_user_id;
            
            -- Atualizar ou inserir na tabela public.users com o ID correto
            INSERT INTO public.users (id, name, email, role, is_active, created_at, updated_at)
            VALUES (
                existing_user_id,
                'Administrador',
                'rodrigomucuri@hotmail.com',
                'ADMIN',
                true,
                NOW(),
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                is_active = EXCLUDED.is_active,
                updated_at = NOW();
                
            -- Remover entrada antiga se existir
            DELETE FROM public.users WHERE id = target_user_id AND id != existing_user_id;
            
            -- Atualizar senha do usuário existente
            UPDATE auth.users 
            SET encrypted_password = crypt('admin123', gen_salt('bf')),
                updated_at = NOW()
            WHERE id = existing_user_id;
            
            RAISE NOTICE 'Usuário admin atualizado com ID: %', existing_user_id;
        ELSE
            -- Usuário já existe com ID correto, apenas atualizar senha
            UPDATE auth.users 
            SET encrypted_password = crypt('admin123', gen_salt('bf')),
                updated_at = NOW()
            WHERE id = existing_user_id;
            
            RAISE NOTICE 'Senha do usuário admin atualizada';
        END IF;
    ELSE
        -- Usuário não existe, criar novo
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
            role,
            aud
        ) VALUES (
            target_user_id,
            '00000000-0000-0000-0000-000000000000',
            'rodrigomucuri@hotmail.com',
            crypt('admin123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"name": "Administrador"}',
            false,
            'authenticated',
            'authenticated'
        );
        
        -- Inserir identidade no auth.identities (apenas se não existir)
        IF NOT EXISTS (
            SELECT 1 FROM auth.identities 
            WHERE user_id = target_user_id AND provider = 'email'
        ) THEN
            INSERT INTO auth.identities (
                provider_id,
                user_id,
                identity_data,
                provider,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                target_user_id,
                target_user_id,
                jsonb_build_object('sub', target_user_id::text, 'email', 'rodrigomucuri@hotmail.com'),
                'email',
                NOW(),
                NOW(),
                NOW()
            );
        END IF;
        
        -- Garantir que existe na tabela public.users
        INSERT INTO public.users (id, name, email, role, is_active, created_at, updated_at)
        VALUES (
            target_user_id,
            'Administrador',
            'rodrigomucuri@hotmail.com',
            'ADMIN',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
            
        RAISE NOTICE 'Novo usuário admin criado com ID: %', target_user_id;
    END IF;
END $$;

-- 3. VERIFICAR SE TUDO ESTÁ FUNCIONANDO
SELECT 
    'auth.users' as tabela,
    au.id, 
    au.email, 
    au.created_at,
    au.email_confirmed_at IS NOT NULL as email_confirmado
FROM auth.users au
WHERE au.email = 'rodrigomucuri@hotmail.com'

UNION ALL

SELECT 
    'public.users' as tabela,
    pu.id, 
    pu.email, 
    pu.created_at::timestamptz,
    pu.is_active::boolean
FROM public.users pu
WHERE pu.email = 'rodrigomucuri@hotmail.com';

-- 4. TESTAR POLÍTICA RLS
SELECT 'Teste de política RLS - deve retornar dados' as teste;
DO $$
DECLARE
    user_id_found UUID;
BEGIN
    SELECT id INTO user_id_found FROM auth.users WHERE email = 'rodrigomucuri@hotmail.com';
    
    SET LOCAL role = 'authenticated';
    EXECUTE format('SET LOCAL request.jwt.claims = ''{"sub": "%s", "role": "authenticated"}''', user_id_found);
    
    PERFORM id, name, email, role FROM public.users WHERE id = user_id_found;
    
    RESET role;
    RESET request.jwt.claims;
    
    RAISE NOTICE 'Teste de RLS concluído para usuário: %', user_id_found;
END $$;