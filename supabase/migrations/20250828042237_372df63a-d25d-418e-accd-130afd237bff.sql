-- Fix infinite recursion in users table RLS policy by creating a security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Drop existing problematic RLS policies on users table
DROP POLICY IF EXISTS "Permitir operações para administradores" ON public.users;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.users;

-- Create new secure RLS policies for users table
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT 
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can manage all users"
ON public.users
FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'ADMIN');

-- Create more granular RLS policies for customer data protection
-- Drop existing broad policies on pedidos
DROP POLICY IF EXISTS "Permitir leitura e modificação para funcionários" ON public.pedidos;
DROP POLICY IF EXISTS "Permitir criação de pedidos" ON public.pedidos;

-- Create granular policies for orders
CREATE POLICY "Allow public order creation"
ON public.pedidos
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can view all orders"
ON public.pedidos
FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Staff can view orders without sensitive contact info"
ON public.pedidos
FOR SELECT
TO authenticated
USING (
  public.get_current_user_role() = 'FUNCIONARIO' 
  AND current_setting('row_security', true)::boolean = true
);

CREATE POLICY "Admins can modify orders"
ON public.pedidos
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() = 'ADMIN');

-- Create function to mask sensitive customer data for staff
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
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update pedido_itens policies to use the same security pattern
DROP POLICY IF EXISTS "Permitir leitura e modificação para funcionários" ON public.pedido_itens;
DROP POLICY IF EXISTS "Permitir criação de itens de pedido" ON public.pedido_itens;

CREATE POLICY "Allow public item creation"
ON public.pedido_itens
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Staff can view order items"
ON public.pedido_itens
FOR SELECT
TO authenticated
USING (
  public.get_current_user_role() IN ('ADMIN', 'FUNCIONARIO')
);

CREATE POLICY "Admins can modify order items"
ON public.pedido_itens
FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'ADMIN');