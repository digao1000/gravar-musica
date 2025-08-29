-- =====================================================
-- SCRIPT APENAS PARA FUNÇÕES RPC - SUPABASE
-- MusicaDrive - Sistema de Loja de Músicas
-- =====================================================
-- NOTA: As tabelas e políticas RLS já existem, este script cria apenas as funções RPC

-- 1. CRIAR FUNÇÕES AUXILIARES
-- =====================================================

-- Função para obter role do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.users WHERE id = auth.uid();
$function$;

-- Função para obter pedidos para funcionários
CREATE OR REPLACE FUNCTION public.get_orders_for_staff()
RETURNS TABLE(
  id uuid, 
  cliente_nome text, 
  cliente_contato_masked text, 
  pendrive_gb integer, 
  status text, 
  forma_pagamento text, 
  observacoes text, 
  total_gb real, 
  total_itens integer, 
  total_musicas integer, 
  total_valor real, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.cliente_nome,
    CASE 
      WHEN public.get_current_user_role() = 'ADMIN' THEN p.cliente_contato
      ELSE '***-***-' || RIGHT(p.cliente_contato, 4)
    END as cliente_contato_masked,
    p.pendrive_gb,
    p.status,
    p.forma_pagamento,
    p.observacoes,
    p.total_gb,
    p.total_itens,
    p.total_musicas,
    p.total_valor,
    p.created_at,
    p.updated_at
  FROM public.pedidos p
  WHERE (
    public.get_current_user_role() = 'ADMIN' 
    OR public.get_current_user_role() = 'FUNCIONARIO'
  );
$function$;

-- Função para criar pedidos (pública) - ESTA RESOLVE O ERRO 404!
CREATE OR REPLACE FUNCTION public.create_order(
  p_cliente_nome text,
  p_cliente_contato text, 
  p_pendrive_gb integer,
  p_forma_pagamento text,
  p_observacoes text,
  p_itens jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_id uuid;
  item jsonb;
  pasta_record public.pastas%ROWTYPE;
  total_gb real := 0;
  total_valor real := 0;
  total_musicas integer := 0;
  total_itens integer := 0;
BEGIN
  -- Validate input parameters
  IF length(trim(p_cliente_nome)) < 2 OR length(trim(p_cliente_nome)) > 100 THEN
    RAISE EXCEPTION 'Cliente nome deve ter entre 2 e 100 caracteres';
  END IF;
  
  IF p_cliente_nome !~ '^[A-Za-zÀ-ÿ\s''.-]+$' THEN
    RAISE EXCEPTION 'Cliente nome contém caracteres inválidos';
  END IF;
  
  IF length(p_cliente_contato) < 8 OR p_cliente_contato !~ '^[0-9\+\-\(\) ]+$' THEN
    RAISE EXCEPTION 'Cliente contato inválido';
  END IF;
  
  IF p_pendrive_gb <= 0 OR p_pendrive_gb > 1024 THEN
    RAISE EXCEPTION 'Tamanho do pendrive inválido';
  END IF;
  
  IF p_forma_pagamento NOT IN ('DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida';
  END IF;
  
  IF length(coalesce(p_observacoes, '')) > 500 THEN
    RAISE EXCEPTION 'Observações não podem exceder 500 caracteres';
  END IF;

  -- Validate and calculate totals from items
  FOR item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    -- Get pasta details
    SELECT * INTO pasta_record 
    FROM public.pastas 
    WHERE id = (item->>'pasta_id')::uuid 
    AND is_active = true;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pasta não encontrada ou inativa: %', item->>'pasta_id';
    END IF;
    
    -- Validate quantity
    IF (item->>'quantidade')::integer <= 0 OR (item->>'quantidade')::integer > 100 THEN
      RAISE EXCEPTION 'Quantidade inválida para pasta %', pasta_record.nome;
    END IF;
    
    -- Add to totals
    total_gb := total_gb + (pasta_record.tamanho_gb * (item->>'quantidade')::integer);
    total_valor := total_valor + (pasta_record.preco * (item->>'quantidade')::integer);
    total_musicas := total_musicas + (pasta_record.qtd_musicas * (item->>'quantidade')::integer);
    total_itens := total_itens + (item->>'quantidade')::integer;
  END LOOP;
  
  -- Validate totals
  IF total_gb > p_pendrive_gb THEN
    RAISE EXCEPTION 'Tamanho total (%.2f GB) excede capacidade do pendrive (%GB)', total_gb, p_pendrive_gb;
  END IF;
  
  -- Create order
  INSERT INTO public.pedidos (
    cliente_nome, cliente_contato, pendrive_gb, forma_pagamento, 
    observacoes, total_gb, total_itens, total_musicas, total_valor
  ) 
  VALUES (
    trim(p_cliente_nome), p_cliente_contato, p_pendrive_gb, p_forma_pagamento,
    nullif(trim(p_observacoes), ''), total_gb, total_itens, total_musicas, total_valor
  )
  RETURNING id INTO order_id;
  
  -- Create order items
  FOR item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    SELECT * INTO pasta_record 
    FROM public.pastas 
    WHERE id = (item->>'pasta_id')::uuid;
    
    INSERT INTO public.pedido_itens (
      pedido_id, pasta_id, nome_pasta, qtd_musicas, tamanho_gb, preco_unit
    )
    VALUES (
      order_id, pasta_record.id, pasta_record.nome, 
      pasta_record.qtd_musicas, pasta_record.tamanho_gb, pasta_record.preco
    );
  END LOOP;
  
  RETURN order_id;
END;
$function$;

-- 2. VERIFICAR CONFIGURAÇÃO
-- =====================================================

-- Verificar funções criadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- Configuração concluída!
-- Funções RPC criadas: get_current_user_role, get_orders_for_staff, create_order
-- A função create_order resolve o erro 404!
-- Sistema pronto para uso!
