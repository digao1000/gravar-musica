-- APLICAR MANUALMENTE NO DASHBOARD DO SUPABASE
-- SQL Editor > New Query > Cole este código e execute

-- Função para sincronizar automaticamente usuários do auth.users para public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir novo usuário na tabela public.users quando um usuário se cadastra no auth.users
  INSERT INTO public.users (id, name, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), -- Usar nome do metadata ou email como fallback
    NEW.email,
    'FUNCIONARIO', -- Role padrão para novos usuários
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Evitar duplicatas
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função quando um novo usuário for criado no auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar dados do usuário quando alterado no auth.users
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar dados do usuário na tabela public.users quando alterado no auth.users
  UPDATE public.users
  SET 
    name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função quando um usuário for atualizado no auth.users
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- Função para remover usuário da tabela public.users quando deletado do auth.users
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Marcar usuário como inativo em vez de deletar (soft delete)
  UPDATE public.users
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Criar trigger para executar a função quando um usuário for deletado do auth.users
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_delete();

-- Comentários explicativos
COMMENT ON FUNCTION public.handle_new_user() IS 'Sincroniza automaticamente novos usuários do auth.users para public.users';
COMMENT ON FUNCTION public.handle_user_update() IS 'Atualiza dados do usuário na tabela public.users quando alterado no auth.users';
COMMENT ON FUNCTION public.handle_user_delete() IS 'Marca usuário como inativo na tabela public.users quando deletado do auth.users';

-- INSTRUÇÕES:
-- 1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard/project/jwyukeakgoideixxuwte
-- 2. Vá em SQL Editor
-- 3. Clique em "New Query"
-- 4. Cole todo este código SQL
-- 5. Clique em "Run" para executar
-- 6. Verifique se não há erros na execução
-- 7. Teste criando um novo usuário para verificar se é inserido automaticamente na tabela public.users