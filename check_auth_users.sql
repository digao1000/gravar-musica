-- Verificar usuários na tabela auth.users
SELECT id, email, created_at, email_confirmed_at, last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC;

-- Verificar se há usuários em auth.users que não estão em public.users
SELECT au.id, au.email, au.created_at as auth_created_at, pu.id as public_user_id
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;