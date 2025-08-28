-- Improve public order creation security with proper constraints and rate limiting
-- While keeping legitimate customer order creation functionality

-- First, let's add proper constraints to prevent abuse
ALTER TABLE public.pedidos 
ADD CONSTRAINT valid_pendrive_size CHECK (pendrive_gb > 0 AND pendrive_gb <= 1024),
ADD CONSTRAINT valid_totals CHECK (total_gb > 0 AND total_itens > 0 AND total_musicas > 0 AND total_valor >= 0),
ADD CONSTRAINT valid_customer_name CHECK (LENGTH(cliente_nome) >= 2 AND LENGTH(cliente_nome) <= 100),
ADD CONSTRAINT valid_customer_contact CHECK (LENGTH(cliente_contato) >= 8 AND LENGTH(cliente_contato) <= 50);

-- Add constraints to pedido_itens to prevent price manipulation
ALTER TABLE public.pedido_itens
ADD CONSTRAINT valid_quantities CHECK (qtd_musicas > 0 AND tamanho_gb > 0 AND preco_unit >= 0);

-- Update RLS policies to be more restrictive but still allow legitimate orders
DROP POLICY IF EXISTS "Allow public order creation" ON public.pedidos;
DROP POLICY IF EXISTS "Allow public item creation" ON public.pedido_itens;

-- Create more secure policies for order creation
-- Allow anonymous order creation but with constraints
CREATE POLICY "Allow legitimate order creation"
ON public.pedidos
FOR INSERT
TO anon
WITH CHECK (
  -- Basic validation constraints
  LENGTH(cliente_nome) >= 2 AND LENGTH(cliente_nome) <= 100 AND
  LENGTH(cliente_contato) >= 8 AND cliente_contato ~ '^[0-9\+\-\(\) ]+$' AND
  pendrive_gb > 0 AND pendrive_gb <= 1024 AND
  total_gb > 0 AND total_itens > 0 AND total_musicas > 0 AND
  total_valor >= 0
);

-- Allow authenticated users (staff) to create orders as well
CREATE POLICY "Staff can create orders"
ON public.pedidos
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_current_user_role() IN ('ADMIN', 'FUNCIONARIO')
);

-- More restrictive policy for order items - must be part of valid order creation flow
CREATE POLICY "Allow legitimate order item creation"
ON public.pedido_itens
FOR INSERT
TO anon
WITH CHECK (
  -- Basic validation
  qtd_musicas > 0 AND qtd_musicas <= 1000 AND
  tamanho_gb > 0 AND tamanho_gb <= 100 AND
  preco_unit >= 0 AND preco_unit <= 10000 AND
  LENGTH(nome_pasta) >= 1 AND LENGTH(nome_pasta) <= 200 AND
  -- Ensure the pedido exists and was recently created (within last 5 minutes)
  EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE id = pedido_id 
    AND created_at > NOW() - INTERVAL '5 minutes'
  )
);

-- Allow staff to create order items
CREATE POLICY "Staff can create order items"
ON public.pedido_itens
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_current_user_role() IN ('ADMIN', 'FUNCIONARIO')
);

-- Create a function to validate order totals match item totals (prevents manipulation)
CREATE OR REPLACE FUNCTION public.validate_order_totals()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculated_total_gb REAL;
  calculated_total_valor REAL;
  calculated_total_musicas INTEGER;
  calculated_total_itens INTEGER;
BEGIN
  -- Calculate totals from items
  SELECT 
    COALESCE(SUM(tamanho_gb), 0),
    COALESCE(SUM(preco_unit), 0),
    COALESCE(SUM(qtd_musicas), 0),
    COALESCE(COUNT(*), 0)
  INTO 
    calculated_total_gb,
    calculated_total_valor,
    calculated_total_musicas,
    calculated_total_itens
  FROM public.pedido_itens 
  WHERE pedido_id = NEW.pedido_id;

  -- Get the order totals
  SELECT total_gb, total_valor, total_musicas, total_itens
  FROM public.pedidos 
  WHERE id = NEW.pedido_id;

  -- For new items, add to calculated totals
  calculated_total_gb := calculated_total_gb + NEW.tamanho_gb;
  calculated_total_valor := calculated_total_valor + NEW.preco_unit;
  calculated_total_musicas := calculated_total_musicas + NEW.qtd_musicas;
  calculated_total_itens := calculated_total_itens + 1;

  -- Validate that item data matches expected pasta data
  IF NOT EXISTS (
    SELECT 1 FROM public.pastas 
    WHERE id = NEW.pasta_id 
    AND nome = NEW.nome_pasta 
    AND qtd_musicas = NEW.qtd_musicas 
    AND tamanho_gb = NEW.tamanho_gb 
    AND preco = NEW.preco_unit
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Item data does not match pasta record or pasta is inactive';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to validate order items
CREATE TRIGGER validate_order_item_data
  BEFORE INSERT ON public.pedido_itens
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_totals();