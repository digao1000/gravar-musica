-- Criar tabelas principais para a loja de música
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'FUNCIONARIO')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.pastas (
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

CREATE TABLE public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_nome TEXT NOT NULL,
  cliente_contato TEXT NOT NULL,
  pendrive_gb INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ENVIADO' CHECK (status IN ('ENVIADO', 'EM_SEPARACAO', 'PRONTO', 'ENTREGUE', 'CANCELADO')),
  forma_pagamento TEXT,
  observacoes TEXT,
  total_gb REAL NOT NULL,
  total_itens INTEGER NOT NULL,
  total_musicas INTEGER NOT NULL,
  total_valor REAL NOT NULL,
  historico_status JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.pedido_itens (
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

-- Habilitar RLS nas tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

-- Políticas para users (apenas admins podem gerenciar)
CREATE POLICY "Permitir leitura para usuários autenticados" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir operações para administradores" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Políticas para pastas (públicas para leitura, admin para modificação)
CREATE POLICY "Permitir leitura pública de pastas ativas" ON public.pastas
  FOR SELECT USING (is_active = true);

CREATE POLICY "Permitir operações para administradores" ON public.pastas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'FUNCIONARIO')
    )
  );

-- Políticas para pedidos (todos podem criar, funcionários podem gerenciar)
CREATE POLICY "Permitir criação de pedidos" ON public.pedidos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura e modificação para funcionários" ON public.pedidos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'FUNCIONARIO')
    )
  );

-- Políticas para pedido_itens (acompanham os pedidos)
CREATE POLICY "Permitir criação de itens de pedido" ON public.pedido_itens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura e modificação para funcionários" ON public.pedido_itens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'FUNCIONARIO')
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pastas_updated_at 
  BEFORE UPDATE ON public.pastas 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at 
  BEFORE UPDATE ON public.pedidos 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedido_itens_updated_at 
  BEFORE UPDATE ON public.pedido_itens 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais de pastas
INSERT INTO public.pastas (nome, qtd_musicas, tamanho_gb, preco, capa_url, descricao, genero, codigo, is_active) VALUES
('Rock Clássico dos Anos 80', 250, 1.2, 15.99, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'As melhores do rock nacional e internacional dos anos 80', 'Rock', 'MUS0001', true),
('Sertanejo Raiz', 180, 0.9, 12.99, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', 'Sertanejo tradicional e raiz para todas as idades', 'Sertanejo', 'MUS0002', true),
('MPB Romântica', 200, 1.1, 14.99, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'As mais belas canções da MPB para momentos especiais', 'MPB', 'MUS0003', true),
('Pop Internacional', 300, 1.5, 18.99, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', 'Sucessos pop internacionais de todos os tempos', 'Pop', 'MUS0004', true),
('Eletrônica Dance', 150, 0.8, 11.99, 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'As melhores batidas eletrônicas para dançar', 'Eletrônica', 'MUS0005', true),
('Reggae Roots', 120, 0.7, 10.99, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'Reggae raiz e conscious para relaxar', 'Reggae', 'MUS0006', true),
('Hip Hop Nacional', 160, 0.9, 13.99, 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', 'O melhor do hip hop brasileiro', 'Hip Hop', 'MUS0007', true),
('Jazz Smooth', 100, 0.6, 9.99, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'Jazz suave para momentos de contemplação', 'Jazz', 'MUS0008', true),
('Clássica Brasileira', 80, 0.5, 8.99, 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400', 'Música clássica brasileira e erudita', 'Clássica', 'MUS0009', true),
('Forró Pé de Serra', 220, 1.0, 13.99, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', 'Forró tradicional do nordeste brasileiro', 'Sertanejo', 'MUS0010', true);