-- Verificar usuários admin na tabela public.users
SELECT id, name, email, role, is_active, created_at 
FROM public.users 
WHERE role = 'ADMIN' OR role = 'admin'
ORDER BY created_at DESC;

-- Verificar todos os usuários
SELECT id, name, email, role, is_active, created_at 
FROM public.users 
ORDER BY created_at DESC;