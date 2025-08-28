
-- Gerar códigos únicos para pastas existentes
UPDATE pastas SET codigo = 'MUS' || PRINTF('%04d', id) WHERE codigo IS NULL;
