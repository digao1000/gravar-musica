-- =====================================================
-- SCRIPT COMPLETO DE CONFIGURAÇÃO DO SUPABASE
-- MusicaDrive - Sistema de Loja de Músicas
-- =====================================================

-- 1. CRIAR TABELAS PRINCIPAIS
-- =====================================================

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'FUNCIONARIO')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de pastas de música
CREATE TABLE IF NOT EXISTS public.pastas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  qtd_musicas INTEGER NOT NULL,
  tamanho_gb REAL NOT NULL,
  preco REAL NOT NULL,
  capa_url TEXT,
  descricao TEXT,
  genero TEXT,
  codigo TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_nome TEXT NOT NULL,
  cliente_contato TEXT NOT NULL,
  pendrive_gb INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ENVIADO' CHECK (status IN ('ENVIADO', 'EM_SEPARACAO', 'PRONTO', 'ENTREGUE', 'CANCELADO')),
  forma_pagamento TEXT CHECK (forma_pagamento IN ('DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO')),
  observacoes TEXT,
  total_gb REAL NOT NULL,
  total_itens INTEGER NOT NULL,
  total_musicas INTEGER NOT NULL,
  total_valor REAL NOT NULL,
  historico_status JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS public.pedido_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  pasta_id UUID NOT NULL REFERENCES public.pastas(id) ON DELETE CASCADE,
  nome_pasta TEXT NOT NULL,
  qtd_musicas INTEGER NOT NULL,
  tamanho_gb REAL NOT NULL,
  preco_unit REAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR FUNÇÕES AUXILIARES
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

-- Função para criar pedidos (pública)
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

-- 4. CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Políticas para users
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.users;
CREATE POLICY "Permitir leitura para usuários autenticados" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir operações para administradores" ON public.users;
CREATE POLICY "Permitir operações para administradores" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Políticas para pastas
DROP POLICY IF EXISTS "Permitir leitura pública de pastas ativas" ON public.pastas;
CREATE POLICY "Permitir leitura pública de pastas ativas" ON public.pastas
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Permitir operações para administradores" ON public.pastas;
CREATE POLICY "Permitir operações para administradores" ON public.pastas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'FUNCIONARIO')
    )
  );

-- Políticas para pedidos
DROP POLICY IF EXISTS "Permitir criação de pedidos" ON public.pedidos;
CREATE POLICY "Permitir criação de pedidos" ON public.pedidos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura e modificação para funcionários" ON public.pedidos;
CREATE POLICY "Permitir leitura e modificação para funcionários" ON public.pedidos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'FUNCIONARIO')
    )
  );

-- Políticas para pedido_itens
DROP POLICY IF EXISTS "Permitir criação de itens de pedido" ON public.pedido_itens;
CREATE POLICY "Permitir criação de itens de pedido" ON public.pedido_itens
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura e modificação para funcionários" ON public.pedido_itens;
CREATE POLICY "Permitir leitura e modificação para funcionários" ON public.pedido_itens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'FUNCIONARIO')
    )
  );

-- 5. CRIAR TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pastas_updated_at ON public.pastas;
CREATE TRIGGER update_pastas_updated_at
    BEFORE UPDATE ON public.pastas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER update_pedidos_updated_at
    BEFORE UPDATE ON public.pedidos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pedido_itens_updated_at ON public.pedido_itens;
CREATE TRIGGER update_pedido_itens_updated_at
    BEFORE UPDATE ON public.pedido_itens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 6. INSERIR DADOS INICIAIS
-- =====================================================

-- Inserir usuário admin padrão (senha: admin123)
INSERT INTO public.users (name, email, role, is_active) 
VALUES ('Administrador', 'admin@musicadrive.com', 'ADMIN', true)
ON CONFLICT (email) DO NOTHING;

-- Inserir algumas pastas de exemplo
INSERT INTO public.pastas (nome, qtd_musicas, tamanho_gb, preco, genero, descricao) 
VALUES 
  ('Rock Clássico', 150, 2.5, 25.00, 'Rock', 'Melhores do rock clássico'),
  ('MPB', 200, 3.2, 30.00, 'MPB', 'Música Popular Brasileira'),
  ('Sertanejo', 180, 2.8, 28.00, 'Sertanejo', 'Sertanejo universitário e raiz'),
  ('Eletrônica', 120, 1.8, 22.00, 'Eletrônica', 'House, Techno e Trance'),
  ('Gospel', 160, 2.4, 26.00, 'Gospel', 'Músicas gospel e de louvor')
ON CONFLICT (codigo) DO NOTHING;

-- 7. CONFIGURAR PERMISSÕES
-- =====================================================

-- Dar permissões para o usuário anon e authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Configurar permissões futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;

-- 8. VERIFICAR CONFIGURAÇÃO
-- =====================================================

-- Verificar tabelas criadas
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar funções criadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

PRINT 'Configuração do Supabase MusicaDrive concluída com sucesso!';
PRINT 'Usuário admin criado: admin@musicadrive.com';
PRINT 'Tabelas, funções e políticas configuradas.';
PRINT 'Sistema pronto para uso!';
