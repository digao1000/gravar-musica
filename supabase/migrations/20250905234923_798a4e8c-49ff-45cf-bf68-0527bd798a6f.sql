-- Criar tabela de categorias de músicas
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT DEFAULT '#8B5CF6', -- cor padrão roxa
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias
CREATE POLICY "Permitir leitura pública de categorias ativas" 
ON public.categorias 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Permitir operações para administradores categorias" 
ON public.categorias 
FOR ALL 
USING (EXISTS ( 
  SELECT 1 FROM users 
  WHERE users.id = auth.uid() 
  AND users.role = ANY (ARRAY['ADMIN'::text, 'FUNCIONARIO'::text])
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_categorias_updated_at
BEFORE UPDATE ON public.categorias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir categorias padrão
INSERT INTO public.categorias (nome, descricao, cor) VALUES 
('Rock', 'Músicas de Rock Nacional e Internacional', '#EF4444'),
('Pop', 'Músicas Pop Nacionais e Internacionais', '#F59E0B'),
('MPB', 'Música Popular Brasileira', '#10B981'),
('Sertanejo', 'Sertanejo Universitário e Raiz', '#8B5CF6'),
('Eletrônica', 'Música Eletrônica e House', '#06B6D4'),
('Reggae', 'Reggae Nacional e Internacional', '#84CC16'),
('Hip Hop', 'Hip Hop e Rap Nacional e Internacional', '#6B7280'),
('Jazz', 'Jazz Clássico e Contemporâneo', '#F97316'),
('Clássica', 'Música Clássica e Erudita', '#EC4899');