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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          color: string
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["account_type"]
          user_id: string
        }
        Insert: {
          balance?: number
          color?: string
          created_at?: string
          id?: string
          name: string
          type?: Database["public"]["Enums"]["account_type"]
          user_id: string
        }
        Update: {
          balance?: number
          color?: string
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["asset_kind"]
          name: string
          ticker: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["asset_kind"]
          name: string
          ticker: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          name?: string
          ticker?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          kind: Database["public"]["Enums"]["tx_kind"]
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          kind: Database["public"]["Enums"]["tx_kind"]
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          brand: string | null
          closing_day: number
          color: string
          created_at: string
          due_day: number
          id: string
          limit_total: number
          name: string
          next_due_date: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          closing_day?: number
          color?: string
          created_at?: string
          due_day?: number
          id?: string
          limit_total?: number
          name: string
          next_due_date?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          closing_day?: number
          color?: string
          created_at?: string
          due_day?: number
          id?: string
          limit_total?: number
          name?: string
          next_due_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dividends: {
        Row: {
          asset_id: string
          broker: string | null
          created_at: string
          gross: number
          id: string
          net: number
          notes: string | null
          payment_date: string
          type: Database["public"]["Enums"]["dividend_type"]
          user_id: string
        }
        Insert: {
          asset_id: string
          broker?: string | null
          created_at?: string
          gross: number
          id?: string
          net: number
          notes?: string | null
          payment_date: string
          type?: Database["public"]["Enums"]["dividend_type"]
          user_id: string
        }
        Update: {
          asset_id?: string
          broker?: string | null
          created_at?: string
          gross?: number
          id?: string
          net?: number
          notes?: string | null
          payment_date?: string
          type?: Database["public"]["Enums"]["dividend_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dividends_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings_lots: {
        Row: {
          asset_id: string
          broker: string | null
          created_at: string
          date: string
          fees: number
          id: string
          quantity: number
          unit_price: number
          user_id: string
        }
        Insert: {
          asset_id: string
          broker?: string | null
          created_at?: string
          date: string
          fees?: number
          id?: string
          quantity: number
          unit_price: number
          user_id: string
        }
        Update: {
          asset_id?: string
          broker?: string | null
          created_at?: string
          date?: string
          fees?: number
          id?: string
          quantity?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_lots_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_purchases: {
        Row: {
          card_id: string
          category_id: string | null
          created_at: string
          description: string
          first_date: string
          id: string
          installments_total: number
          total_amount: number
          user_id: string
        }
        Insert: {
          card_id: string
          category_id?: string | null
          created_at?: string
          description: string
          first_date: string
          id?: string
          installments_total: number
          total_amount: number
          user_id: string
        }
        Update: {
          card_id?: string
          category_id?: string | null
          created_at?: string
          description?: string
          first_date?: string
          id?: string
          installments_total?: number
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_purchases_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_purchases_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ongoing_expenses: {
        Row: {
          created_at: string
          description: string
          due_day: number | null
          id: string
          kind: Database["public"]["Enums"]["ongoing_kind"]
          monthly_value: number
          months_paid: number
          months_total: number | null
          notes: string | null
          paid_amount: number
          start_date: string
          total_amount: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          due_day?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["ongoing_kind"]
          monthly_value: number
          months_paid?: number
          months_total?: number | null
          notes?: string | null
          paid_amount?: number
          start_date: string
          total_amount?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          due_day?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["ongoing_kind"]
          monthly_value?: number
          months_paid?: number
          months_total?: number | null
          notes?: string | null
          paid_amount?: number
          start_date?: string
          total_amount?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotes_cache: {
        Row: {
          change_pct: number | null
          price: number
          ticker: string
          updated_at: string
        }
        Insert: {
          change_pct?: number | null
          price: number
          ticker: string
          updated_at?: string
        }
        Update: {
          change_pct?: number | null
          price?: number
          ticker?: string
          updated_at?: string
        }
        Relationships: []
      }
      receivable_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string
          receivable_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          receivable_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          receivable_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivable_payments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          created_at: string
          debtor_name: string
          due_date: string | null
          id: string
          notes: string | null
          received_amount: number
          status: Database["public"]["Enums"]["receivable_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          debtor_name: string
          due_date?: string | null
          id?: string
          notes?: string | null
          received_amount?: number
          status?: Database["public"]["Enums"]["receivable_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          debtor_name?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          received_amount?: number
          status?: Database["public"]["Enums"]["receivable_status"]
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          card_id: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          due_date: string | null
          id: string
          installment_index: number | null
          installment_purchase_id: string | null
          is_installment: boolean
          is_paid: boolean
          kind: Database["public"]["Enums"]["tx_kind"]
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          date: string
          description?: string | null
          due_date?: string | null
          id?: string
          installment_index?: number | null
          installment_purchase_id?: string | null
          is_installment?: boolean
          is_paid?: boolean
          kind: Database["public"]["Enums"]["tx_kind"]
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          due_date?: string | null
          id?: string
          installment_index?: number | null
          installment_purchase_id?: string | null
          is_installment?: boolean
          is_paid?: boolean
          kind?: Database["public"]["Enums"]["tx_kind"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_installment_purchase_id_fkey"
            columns: ["installment_purchase_id"]
            isOneToOne: false
            referencedRelation: "installment_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_type: "checking" | "savings" | "wallet" | "other"
      asset_kind: "stock" | "fii"
      dividend_type: "dividend" | "jcp" | "rendimento"
      ongoing_kind: "subscription" | "installment"
      receivable_status: "pending" | "paid" | "overdue"
      tx_kind: "income" | "expense"
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
    Enums: {
      account_type: ["checking", "savings", "wallet", "other"],
      asset_kind: ["stock", "fii"],
      dividend_type: ["dividend", "jcp", "rendimento"],
      ongoing_kind: ["subscription", "installment"],
      receivable_status: ["pending", "paid", "overdue"],
      tx_kind: ["income", "expense"],
    },
  },
} as const
