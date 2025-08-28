import z from "zod";

// Pasta Schema
export const PastaSchema = z.object({
  id: z.string(),
  nome: z.string(),
  codigo: z.string().nullable().optional(),
  qtd_musicas: z.number().int().positive(),
  tamanho_gb: z.number().positive(),
  preco: z.number().min(0),
  capa_url: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
  genero: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

export type Pasta = z.infer<typeof PastaSchema>;

// Pedido Schema
export const PedidoStatusSchema = z.enum(['ENVIADO', 'EM_SEPARACAO', 'PRONTO', 'ENTREGUE', 'CANCELADO']);
export const FormaPagamentoSchema = z.enum(['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO']);

export const PedidoSchema = z.object({
  id: z.string(),
  cliente_nome: z.string(),
  cliente_contato: z.string(),
  pendrive_gb: z.number().int().positive(),
  status: PedidoStatusSchema,
  forma_pagamento: FormaPagamentoSchema.optional(),
  observacoes: z.string().optional(),
  total_gb: z.number().positive(),
  total_itens: z.number().int().positive(),
  total_musicas: z.number().int().positive(),
  total_valor: z.number().min(0),
  historico_status: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

export type Pedido = z.infer<typeof PedidoSchema>;
export type PedidoStatus = z.infer<typeof PedidoStatusSchema>;
export type FormaPagamento = z.infer<typeof FormaPagamentoSchema>;

// Pedido Item Schema
export const PedidoItemSchema = z.object({
  id: z.string(),
  pedido_id: z.string(),
  pasta_id: z.string(),
  nome_pasta: z.string(),
  qtd_musicas: z.number().int().positive(),
  tamanho_gb: z.number().positive(),
  preco_unit: z.number().min(0),
  created_at: z.string(),
  updated_at: z.string()
});

export type PedidoItem = z.infer<typeof PedidoItemSchema>;

// User Schema
export const UserRoleSchema = z.enum(['ADMIN', 'FUNCIONARIO']);

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  is_active: z.boolean(),
  last_login_at: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

export type User = z.infer<typeof UserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;

// API Request/Response Schemas
export const CreatePastaSchema = z.object({
  nome: z.string().min(1),
  codigo: z.string().optional(),
  qtd_musicas: z.number().int().positive(),
  tamanho_gb: z.number().positive(),
  preco: z.number().min(0),
  capa_url: z.string().optional(),
  descricao: z.string().optional(),
  genero: z.string().optional(),
  is_active: z.boolean().default(true)
});

export const CreatePedidoSchema = z.object({
  cliente_nome: z.string().min(1),
  cliente_contato: z.string().min(1),
  pendrive_gb: z.number().int().positive(),
  observacoes: z.string().optional(),
  forma_pagamento: FormaPagamentoSchema.optional(),
  itens: z.array(z.object({
    pasta_id: z.string(),
    quantidade: z.number().int().positive()
  })).min(1)
});

export const UpdatePedidoStatusSchema = z.object({
  status: PedidoStatusSchema
});

// Cart Item for frontend
export const CartItemSchema = z.object({
  pasta: PastaSchema,
  quantidade: z.number().int().positive()
});

export type CartItem = z.infer<typeof CartItemSchema>;

// Pendrive sizes
export const PENDRIVE_SIZES = [2, 4, 8, 16, 32, 64, 128] as const;
export type PendriveSize = typeof PENDRIVE_SIZES[number];