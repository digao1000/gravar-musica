-- Script simples para corrigir login admin
-- Execute este script se o anterior não funcionar

-- 1. Corrigir políticas RLS primeiro
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- Criar política simples
CREATE POLICY "Enable read for users" ON public.users
    FOR SELECT USING (true); -- Temporariamente permitir leitura para todos

-- 2. Encontrar e atualizar usuário existente
DO $$
DECLARE
    user_id_found UUID;
BEGIN
    -- Encontrar o usuário pelo email
    SELECT id INTO user_id_found FROM auth.users WHERE email = 'rodrigomucuri@hotmail.com';
    
    IF user_id_found IS NOT NULL THEN
        -- Atualizar senha
        UPDATE auth.users 
        SET encrypted_password = crypt('admin123', gen_salt('bf'))
        WHERE id = user_id_found;
        
        -- Garantir que existe na tabela public.users
        INSERT INTO public.users (id, name, email, role, is_active, created_at, updated_at)
        VALUES (
            user_id_found,
            'Administrador',
            'rodrigomucuri@hotmail.com',
            'ADMIN',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'ADMIN',
            is_active = true,
            updated_at = NOW();
            
        RAISE NOTICE 'Usuário admin configurado com ID: %', user_id_found;
    ELSE
        RAISE NOTICE 'Usuário não encontrado no auth.users';
    END IF;
END $$;

-- 3. Verificar resultado
SELECT 
    au.id,
    au.email,
    pu.name,
    pu.role,
    pu.is_active
FROM auth.users au
JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'rodrigomucuri@hotmail.com';