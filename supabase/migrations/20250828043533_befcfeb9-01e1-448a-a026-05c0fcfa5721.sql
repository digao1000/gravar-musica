-- Criar usuário admin na tabela users
INSERT INTO public.users (id, name, email, role, is_active, created_at, updated_at)
VALUES (
  'e165a899-0b5b-42b8-8693-d274903672ec',
  'Administrador',
  'rodrigomucuri@hotmail.com',
  'ADMIN',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) 
DO UPDATE SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();