-- Fix security issue: Remove confusing public order creation policies
-- These policies with 'WITH CHECK false' are confusing and potentially dangerous

-- Drop the problematic public policies that have false conditions
DROP POLICY IF EXISTS "Allow public order creation via function" ON public.pedidos;
DROP POLICY IF EXISTS "Allow public order item creation via function" ON public.pedido_itens;

-- The create_order function already handles secure order creation
-- Staff and admin policies remain for proper access control

-- Verify that only authorized users can access order data
-- Admins can view all orders
-- Staff can view orders with masked contact info (already properly configured)

-- Add a more restrictive policy comment for clarity
COMMENT ON TABLE public.pedidos IS 'Customer order data - restricted access only via authorized staff and secure functions';
COMMENT ON TABLE public.pedido_itens IS 'Order items - restricted access only via authorized staff and secure functions';

-- Ensure the create_order function remains the only way for public order creation
-- This function already includes proper validation and security checks