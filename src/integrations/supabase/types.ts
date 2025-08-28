export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      pastas: {
        Row: {
          capa_url: string | null
          codigo: string | null
          created_at: string
          descricao: string | null
          genero: string | null
          id: string
          is_active: boolean
          nome: string
          preco: number
          qtd_musicas: number
          tamanho_gb: number
          updated_at: string
        }
        Insert: {
          capa_url?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          genero?: string | null
          id?: string
          is_active?: boolean
          nome: string
          preco: number
          qtd_musicas: number
          tamanho_gb: number
          updated_at?: string
        }
        Update: {
          capa_url?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          genero?: string | null
          id?: string
          is_active?: boolean
          nome?: string
          preco?: number
          qtd_musicas?: number
          tamanho_gb?: number
          updated_at?: string
        }
        Relationships: []
      }
      pedido_itens: {
        Row: {
          created_at: string
          id: string
          nome_pasta: string
          pasta_id: string
          pedido_id: string
          preco_unit: number
          qtd_musicas: number
          tamanho_gb: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_pasta: string
          pasta_id: string
          pedido_id: string
          preco_unit: number
          qtd_musicas: number
          tamanho_gb: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_pasta?: string
          pasta_id?: string
          pedido_id?: string
          preco_unit?: number
          qtd_musicas?: number
          tamanho_gb?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pasta_id_fkey"
            columns: ["pasta_id"]
            isOneToOne: false
            referencedRelation: "pastas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_contato: string
          cliente_nome: string
          created_at: string
          forma_pagamento: string | null
          historico_status: Json | null
          id: string
          observacoes: string | null
          pendrive_gb: number
          status: string
          total_gb: number
          total_itens: number
          total_musicas: number
          total_valor: number
          updated_at: string
        }
        Insert: {
          cliente_contato: string
          cliente_nome: string
          created_at?: string
          forma_pagamento?: string | null
          historico_status?: Json | null
          id?: string
          observacoes?: string | null
          pendrive_gb: number
          status?: string
          total_gb: number
          total_itens: number
          total_musicas: number
          total_valor: number
          updated_at?: string
        }
        Update: {
          cliente_contato?: string
          cliente_nome?: string
          created_at?: string
          forma_pagamento?: string | null
          historico_status?: Json | null
          id?: string
          observacoes?: string | null
          pendrive_gb?: number
          status?: string
          total_gb?: number
          total_itens?: number
          total_musicas?: number
          total_valor?: number
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order: {
        Args: {
          p_cliente_contato: string
          p_cliente_nome: string
          p_forma_pagamento: string
          p_itens: Json
          p_observacoes: string
          p_pendrive_gb: number
        }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_orders_for_staff: {
        Args: Record<PropertyKey, never>
        Returns: {
          cliente_contato_masked: string
          cliente_nome: string
          created_at: string
          forma_pagamento: string
          id: string
          observacoes: string
          pendrive_gb: number
          status: string
          total_gb: number
          total_itens: number
          total_musicas: number
          total_valor: number
          updated_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
