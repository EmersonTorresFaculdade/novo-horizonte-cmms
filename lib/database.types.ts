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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          company_logo: string | null
          company_name: string
          created_at: string | null
          critical_alerts: boolean | null
          daily_report: boolean | null
          email_notifications: boolean | null
          id: string
          theme: string | null
          updated_at: string | null
          webhook_enabled: boolean | null
          webhook_url: string | null
          whatsapp_notifications: boolean | null
          work_order_alerts: boolean | null
        }
        Insert: {
          company_logo?: string | null
          company_name?: string
          created_at?: string | null
          critical_alerts?: boolean | null
          daily_report?: boolean | null
          email_notifications?: boolean | null
          id?: string
          theme?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_url?: string | null
          whatsapp_notifications?: boolean | null
          work_order_alerts?: boolean | null
        }
        Update: {
          company_logo?: string | null
          company_name?: string
          created_at?: string | null
          critical_alerts?: boolean | null
          daily_report?: boolean | null
          email_notifications?: boolean | null
          id?: string
          theme?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_url?: string | null
          whatsapp_notifications?: boolean | null
          work_order_alerts?: boolean | null
        }
        Relationships: []
      }
      third_party_companies: {
        Row: {
          id: string
          name: string
          cnpj: string | null
          contact_name: string
          phone: string
          email: string | null
          specialty: string
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          cnpj?: string | null
          contact_name: string
          phone: string
          email?: string | null
          specialty: string
          status: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          cnpj?: string | null
          contact_name?: string
          phone?: string
          email?: string | null
          specialty?: string
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          code: string
          created_at: string | null
          id: string
          updated_at: string | null
          manufacturer: string | null
          category: string | null
          image_url: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          manufacturer?: string | null
          model?: string
          name: string
          sector: string
          status: string
          updated_at?: string | null
          category?: string | null
          image_url?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          manufacturer?: string | null
          model?: string
          name?: string
          sector?: string
          status?: string
          updated_at?: string | null
          category?: string | null
          image_url?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          created_at: string | null
          id: string
          min_stock: number | null
          name: string
          quantity: number
          sku: string
          status: string
          unit_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          min_stock?: number | null
          name: string
          quantity?: number
          sku: string
          status: string
          unit_value?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          min_stock?: number | null
          name?: string
          quantity?: number
          sku?: string
          status?: string
          unit_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          recipient_role: Database["public"]["Enums"]["user_role"]
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          recipient_role: Database["public"]["Enums"]["user_role"]
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          recipient_role?: Database["public"]["Enums"]["user_role"]
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          avatar: string | null
          contact: string
          created_at: string | null
          hourly_rate: number | null
          id: string
          name: string
          performance_closed: number | null
          performance_open: number | null
          specialty: string
          status: string
          updated_at: string | null
        }
        Insert: {
          avatar?: string | null
          contact: string
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          performance_closed?: number | null
          performance_open?: number | null
          specialty: string
          status: string
          updated_at?: string | null
        }
        Update: {
          avatar?: string | null
          contact?: string
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          performance_closed?: number | null
          performance_open?: number | null
          specialty?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar: string | null
          created_at: string | null
          department: string | null
          email: string
          id: string
          location: string | null
          name: string
          phone: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          email_notifications: boolean | null
          id: string
          last_login: string | null
          name: string
          password_hash: string
          phone: string | null
          requested_role: Database["public"]["Enums"]["user_role"] | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          username: string | null
          whatsapp_notifications: boolean | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          email_notifications?: boolean | null
          id?: string
          last_login?: string | null
          name: string
          password_hash: string
          phone?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"] | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          username?: string | null
          whatsapp_notifications?: boolean | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          email_notifications?: boolean | null
          id?: string
          last_login?: string | null
          name?: string
          password_hash?: string
          phone?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"] | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          username?: string | null
          whatsapp_notifications?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "users_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_parts: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          quantity: number
          work_order_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          quantity?: number
          work_order_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          quantity?: number
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          asset_id: string | null
          created_at: string | null
          date: string | null
          downtime_hours: number | null
          hourly_rate: number | null
          id: string
          issue: string
          order_number: string
          priority: string
          repair_hours: number | null
          requester_id: string | null
          sector: string
          status: string
          technician_id: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          date?: string | null
          downtime_hours?: number | null
          hourly_rate?: number | null
          id?: string
          issue: string
          order_number: string
          priority: string
          repair_hours?: number | null
          requester_id?: string | null
          sector: string
          status: string
          technician_id?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          date?: string | null
          downtime_hours?: number | null
          hourly_rate?: number | null
          id?: string
          issue?: string
          order_number?: string
          priority?: string
          repair_hours?: number | null
          requester_id?: string | null
          sector?: string
          status?: string
          technician_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      ensure_admin_root_exists: { Args: never; Returns: undefined }
      update_app_settings:
      | {
        Args: {
          p_company_logo: string
          p_company_name: string
          p_theme: string
        }
        Returns: undefined
      }
      | {
        Args: {
          p_company_logo: string
          p_company_name: string
          p_theme: string
          p_webhook_url?: string
        }
        Returns: undefined
      }
      | {
        Args: {
          p_company_logo: string
          p_company_name: string
          p_critical_alerts?: boolean
          p_daily_report?: boolean
          p_email_notifications?: boolean
          p_theme: string
          p_webhook_url: string
          p_whatsapp_notifications?: boolean
          p_work_order_alerts?: boolean
        }
        Returns: undefined
      }
      | {
        Args: {
          p_company_logo: string
          p_company_name: string
          p_critical_alerts: boolean
          p_daily_report: boolean
          p_email_notifications: boolean
          p_theme: string
          p_webhook_enabled?: boolean
          p_webhook_url: string
          p_whatsapp_notifications: boolean
          p_work_order_alerts: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "admin_root" | "admin" | "user"
      user_status: "pending" | "active" | "inactive"
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
      user_role: ["admin_root", "admin", "user"],
      user_status: ["pending", "active", "inactive"],
    },
  },
} as const
