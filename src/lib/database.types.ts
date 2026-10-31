// Generated from the memba-dev schema (migrations 0001-0006) via the Supabase
// connector. Regenerate after every migration; don't edit by hand.

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          created_at: string
          default_language: string
          id: string
          large_amount_warning_minor: number
          name: string
          pay_instructions: string | null
          phone: string | null
          segment: string
        }
        Insert: {
          created_at?: string
          default_language?: string
          id?: string
          large_amount_warning_minor?: number
          name: string
          pay_instructions?: string | null
          phone?: string | null
          segment: string
        }
        Update: {
          created_at?: string
          default_language?: string
          id?: string
          large_amount_warning_minor?: number
          name?: string
          pay_instructions?: string | null
          phone?: string | null
          segment?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          archived_at: string | null
          business_id: string
          created_at: string
          group_label: string | null
          id: string
          language: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          archived_at?: string | null
          business_id: string
          created_at?: string
          group_label?: string | null
          id?: string
          language?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          archived_at?: string | null
          business_id?: string
          created_at?: string
          group_label?: string | null
          id?: string
          language?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actor_id: string | null
          business_id: string | null
          created_at: string
          data: Json
          entity_id: string | null
          id: number
          type: string
        }
        Insert: {
          actor_id?: string | null
          business_id?: string | null
          created_at?: string
          data?: Json
          entity_id?: string | null
          id?: never
          type: string
        }
        Update: {
          actor_id?: string | null
          business_id?: string | null
          created_at?: string
          data?: Json
          entity_id?: string | null
          id?: never
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_minor: number
          business_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          description: string
          due_date: string
          id: string
          reference: string
          schedule_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          business_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          description: string
          due_date: string
          id?: string
          reference: string
          schedule_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string
          due_date?: string
          id?: string
          reference?: string
          schedule_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_customer_id_fkey"
            columns: ["business_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_business_id_schedule_id_fkey"
            columns: ["business_id", "schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      memberships: {
        Row: {
          business_id: string
          role: string
          user_id: string
        }
        Insert: {
          business_id: string
          role?: string
          user_id: string
        }
        Update: {
          business_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_minor: number
          business_id: string
          created_at: string
          id: string
          invoice_id: string
          method: string
          paid_on: string
          recorded_by: string | null
          reference: string | null
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount_minor: number
          business_id: string
          created_at?: string
          id?: string
          invoice_id: string
          method: string
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_minor?: number
          business_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_invoice_id_fkey"
            columns: ["business_id", "invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "payments_business_id_invoice_id_fkey"
            columns: ["business_id", "invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      reminders: {
        Row: {
          actioned_by: string | null
          business_id: string
          created_at: string
          due_on: string
          id: string
          invoice_id: string
          message_body: string | null
          opened_at: string | null
          sent_at: string | null
          skip_reason: string | null
          status: string
          step: number
          tone: string
        }
        Insert: {
          actioned_by?: string | null
          business_id: string
          created_at?: string
          due_on: string
          id?: string
          invoice_id: string
          message_body?: string | null
          opened_at?: string | null
          sent_at?: string | null
          skip_reason?: string | null
          status?: string
          step: number
          tone: string
        }
        Update: {
          actioned_by?: string | null
          business_id?: string
          created_at?: string
          due_on?: string
          id?: string
          invoice_id?: string
          message_body?: string | null
          opened_at?: string | null
          sent_at?: string | null
          skip_reason?: string | null
          status?: string
          step?: number
          tone?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_business_id_invoice_id_fkey"
            columns: ["business_id", "invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "reminders_business_id_invoice_id_fkey"
            columns: ["business_id", "invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      schedules: {
        Row: {
          business_id: string
          id: string
          is_default: boolean
          name: string
          offsets_days: number[]
          tones: string[]
        }
        Insert: {
          business_id: string
          id?: string
          is_default?: boolean
          name: string
          offsets_days?: number[]
          tones?: string[]
        }
        Update: {
          business_id?: string
          id?: string
          is_default?: boolean
          name?: string
          offsets_days?: number[]
          tones?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          body: string
          business_id: string
          id: string
          language: string
          tone: string
        }
        Insert: {
          body: string
          business_id: string
          id?: string
          language: string
          tone: string
        }
        Update: {
          body?: string
          business_id?: string
          id?: string
          language?: string
          tone?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      invoice_balances: {
        Row: {
          amount_minor: number | null
          balance_minor: number | null
          business_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string | null
          paid_minor: number | null
          reference: string | null
          schedule_id: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_customer_id_fkey"
            columns: ["business_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_business_id_schedule_id_fkey"
            columns: ["business_id", "schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
    }
    Functions: {
      generate_due_reminders: { Args: { p_today?: string }; Returns: number }
      is_member: { Args: { b: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
