-- Fix delete operations by creating admin functions that bypass RLS
-- These functions will be called from the Dashboard with proper authentication

-- Function to clear all pastas (admin only)
CREATE OR REPLACE FUNCTION public.admin_clear_pastas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF public.get_current_user_role() != 'ADMIN' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Delete all pastas
  DELETE FROM public.pastas;
END;
$$;

-- Function to clear all pedidos (admin only)
CREATE OR REPLACE FUNCTION public.admin_clear_pedidos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF public.get_current_user_role() != 'ADMIN' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Delete pedido_itens first (foreign key constraint)
  DELETE FROM public.pedido_itens;
  
  -- Then delete pedidos
  DELETE FROM public.pedidos;
END;
$$;

-- Function to clear all data (admin only)
CREATE OR REPLACE FUNCTION public.admin_clear_all_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF public.get_current_user_role() != 'ADMIN' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Delete in order to respect foreign keys
  DELETE FROM public.pedido_itens;
  DELETE FROM public.pedidos;
  DELETE FROM public.pastas;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_clear_pastas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_pedidos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_all_data() TO authenticated;