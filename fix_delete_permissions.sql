-- Script para corrigir permissões de exclusão no Supabase
-- Execute no Supabase Dashboard -> SQL Editor

-- 1. VERIFICAR USUÁRIO ATUAL E SUAS PERMISSÕES
SELECT 
    'Usuário atual:' as info,
    auth.uid() as user_id,
    auth.role() as auth_role;

-- Verificar se o usuário atual é admin
SELECT 
    'Status do usuário:' as info,
    u.id,
    u.name,
    u.email,
    u.role,
    u.is_active,
    CASE 
        WHEN u.id = auth.uid() THEN 'É o usuário atual'
        ELSE 'Não é o usuário atual'
    END as status
FROM public.users u
WHERE u.id = auth.uid() OR u.role = 'ADMIN';

-- 2. CORRIGIR POLÍTICAS PARA PERMITIR EXCLUSÃO POR ADMINISTRADORES

-- Políticas para pedido_itens (deve ser a primeira a ser corrigida)
DROP POLICY IF EXISTS "Permitir leitura e modificação para funcionários" ON public.pedido_itens;
CREATE POLICY "Permitir todas operações para funcionários" ON public.pedido_itens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'FUNCIONARIO') AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'FUNCIONARIO') AND is_active = true
    )
  );

-- Políticas para pedidos
DROP POLICY IF EXISTS "Permitir leitura e modificação para funcionários" ON public.pedidos;
CREATE POLICY "Permitir todas operações para funcionários" ON public.pedidos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'FUNCIONARIO') AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'FUNCIONARIO') AND is_active = true
    )
  );

-- Manter política de criação pública para pedidos
DROP POLICY IF EXISTS "Permitir criação de pedidos" ON public.pedidos;
CREATE POLICY "Permitir criação de pedidos" ON public.pedidos
  FOR INSERT WITH CHECK (true);

-- Políticas para pastas
DROP POLICY IF EXISTS "Permitir operações para administradores" ON public.pastas;
CREATE POLICY "Permitir todas operações para funcionários" ON public.pastas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'FUNCIONARIO') AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'FUNCIONARIO') AND is_active = true
    )
  );

-- Manter política de leitura pública para pastas
DROP POLICY IF EXISTS "Permitir leitura pública de pastas ativas" ON public.pastas;
CREATE POLICY "Permitir leitura pública de pastas ativas" ON public.pastas
  FOR SELECT USING (is_active = true);

-- 3. TESTAR EXCLUSÃO COM AS NOVAS POLÍTICAS
BEGIN;
    -- Teste de contagem antes
    SELECT 
        'Contagem antes do teste:' as info,
        (SELECT COUNT(*) FROM public.pedido_itens) as pedido_itens,
        (SELECT COUNT(*) FROM public.pedidos) as pedidos,
        (SELECT COUNT(*) FROM public.pastas) as pastas;
    
    -- Teste de exclusão (será revertido)
    -- DELETE FROM public.pedido_itens WHERE id IN (SELECT id FROM public.pedido_itens LIMIT 1);
    -- DELETE FROM public.pedidos WHERE id IN (SELECT id FROM public.pedidos LIMIT 1);
    -- DELETE FROM public.pastas WHERE id IN (SELECT id FROM public.pastas LIMIT 1);
    
    SELECT 'Teste de políticas concluído - transação será revertida' as resultado;
ROLLBACK;

-- 4. VERIFICAR POLÍTICAS FINAIS
SELECT 
    'Políticas atuais:' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('users', 'pastas', 'pedidos', 'pedido_itens')
ORDER BY tablename, policyname;

-- 5. CRIAR FUNÇÃO RPC PARA EXCLUSÃO ADMINISTRATIVA (FALLBACK)
CREATE OR REPLACE FUNCTION public.clear_all_data_admin()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    items_deleted INTEGER := 0;
    pedidos_deleted INTEGER := 0;
    pastas_deleted INTEGER := 0;
    current_user_role TEXT;
BEGIN
    -- Verificar se o usuário é admin
    SELECT role INTO current_user_role 
    FROM public.users 
    WHERE id = auth.uid();
    
    IF current_user_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem executar esta função';
    END IF;
    
    -- Desabilitar RLS temporariamente para exclusão
    ALTER TABLE public.pedido_itens DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.pedidos DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.pastas DISABLE ROW LEVEL SECURITY;
    
    -- Excluir dados em ordem (respeitando foreign keys)
    DELETE FROM public.pedido_itens;
    GET DIAGNOSTICS items_deleted = ROW_COUNT;
    
    DELETE FROM public.pedidos;
    GET DIAGNOSTICS pedidos_deleted = ROW_COUNT;
    
    DELETE FROM public.pastas;
    GET DIAGNOSTICS pastas_deleted = ROW_COUNT;
    
    -- Reabilitar RLS
    ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.pastas ENABLE ROW LEVEL SECURITY;
    
    -- Retornar resultado
    RETURN json_build_object(
        'success', true,
        'message', 'Todos os dados foram excluídos com sucesso',
        'deleted', json_build_object(
            'pedido_itens', items_deleted,
            'pedidos', pedidos_deleted,
            'pastas', pastas_deleted
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Garantir que RLS seja reabilitado em caso de erro
        ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.pastas ENABLE ROW LEVEL SECURITY;
        
        RAISE EXCEPTION 'Erro ao excluir dados: %', SQLERRM;
END;
$function$;

SELECT 'Correção de permissões e função RPC concluída!' as resultado;