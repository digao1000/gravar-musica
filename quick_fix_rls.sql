-- Script rápido para corrigir RLS e login admin
-- Execute no Supabase Dashboard -> SQL Editor

-- 1. DESABILITAR RLS TEMPORARIAMENTE PARA CORREÇÃO
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. LIMPAR POLÍTICAS PROBLEMÁTICAS
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.users;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.users;

-- 3. VERIFICAR E CORRIGIR USUÁRIO ADMIN
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Buscar usuário admin existente
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'rodrigomucuri@hotmail.com'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        RAISE NOTICE 'Usuário admin encontrado com ID: %', admin_user_id;
        
        -- Atualizar senha do usuário
        UPDATE auth.users 
        SET 
            encrypted_password = crypt('admin123', gen_salt('bf')),
            email_confirmed_at = NOW(),
            updated_at = NOW()
        WHERE id = admin_user_id;
        
        -- Garantir que existe na tabela public.users
        INSERT INTO public.users (id, name, email, role, is_active, created_at, updated_at)
        VALUES (
            admin_user_id,
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
            
        RAISE NOTICE 'Usuário admin configurado com sucesso!';
    ELSE
        RAISE NOTICE 'Usuário admin não encontrado no auth.users';
    END IF;
END $$;

-- 4. CRIAR POLÍTICAS RLS SIMPLES E SEGURAS
CREATE POLICY "Allow authenticated users to read users" 
ON public.users FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow users to update own profile" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Allow service role full access" 
ON public.users FOR ALL 
TO service_role 
USING (true);

-- 5. REABILITAR RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. VERIFICAR RESULTADO
SELECT 
    'Verificação final:' as status,
    au.id,
    au.email,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    pu.name,
    pu.role,
    pu.is_active
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'rodrigomucuri@hotmail.com';