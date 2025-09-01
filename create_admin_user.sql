-- Script para criar usuário admin no Supabase Auth
-- Este script deve ser executado no Supabase Dashboard -> SQL Editor

-- 1. Primeiro, verificar se o usuário já existe no auth.users
SELECT id, email, created_at FROM auth.users WHERE email = 'rodrigomucuri@hotmail.com';

-- 2. Se não existir, criar o usuário no auth.users
-- IMPORTANTE: Execute este INSERT apenas se o usuário não existir
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
  'e165a899-0b5b-42b8-8693-d274903672ec',
  '00000000-0000-0000-0000-000000000000',
  'rodrigomucuri@hotmail.com',
  crypt('admin123', gen_salt('bf')), -- Senha: admin123
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Administrador"}',
  false,
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Verificar se o usuário foi criado corretamente
SELECT 
  au.id, 
  au.email, 
  au.created_at as auth_created,
  pu.name,
  pu.role,
  pu.is_active
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'rodrigomucuri@hotmail.com';