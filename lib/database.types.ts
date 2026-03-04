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
          board_emails: string | null
          company_email: string | null
          company_logo: string | null
          company_name: string
          created_at: string | null
          critical_alerts: boolean | null
          daily_report: boolean | null
          email_notifications: boolean | null
          id: string
          report_frequency: string | null
          theme: string | null
          updated_at: string | null
          webhook_enabled: boolean | null
          webhook_url: string | null
          whatsapp_notifications: boolean | null
          work_order_alerts: boolean | null
        }
        Insert: {
          board_emails?: string | null
          company_email?: string | null
          company_logo?: string | null
          company_name?: string
          created_at?: string | null
          critical_alerts?: boolean | null
          daily_report?: boolean | null
          email_notifications?: boolean | null
          id?: string
          report_frequency?: string | null
          theme?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_url?: string | null
          whatsapp_notifications?: boolean | null
          work_order_alerts?: boolean | null
        }
        Update: {
          board_emails?: string | null
          company_email?: string | null
          company_logo?: string | null
          company_name?: string
          created_at?: string | null
          critical_alerts?: boolean | null
          daily_report?: boolean | null
          email_notifications?: boolean | null
          id?: string
          report_frequency?: string | null
          theme?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_url?: string | null
          whatsapp_notifications?: boolean | null
          work_order_alerts?: boolean | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          id: string
          image_url: string | null
          manufacturer: string | null
          model: string
          name: string
          sector: string
          status: string
          updated_at: string | null
          warranty_expires_at: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          manufacturer?: string | null
          model: string
          name: string
          sector: string
          status: string
          updated_at?: string | null
          warranty_expires_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          manufacturer?: string | null
          model?: string
          name?: string
          sector?: string
          status?: string
          updated_at?: string | null
          warranty_expires_at?: string | null
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
      technician_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          technician_id: string
          third_party_company_id: string | null
          user_id: string
          work_order_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          technician_id: string
          third_party_company_id?: string | null
          user_id: string
          work_order_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          technician_id?: string
          third_party_company_id?: string | null
          user_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technician_ratings_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_ratings_third_party_company_id_fkey"
            columns: ["third_party_company_id"]
            isOneToOne: false
            referencedRelation: "third_party_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_ratings_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          avatar: string | null
          contact: string
          created_at: string | null
          employee_id: string | null
          hourly_rate: number | null
          id: string
          name: string
          on_night_shift: boolean | null
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
          employee_id?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          on_night_shift?: boolean | null
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
          employee_id?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          on_night_shift?: boolean | null
          performance_closed?: number | null
          performance_open?: number | null
          specialty?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      third_party_companies: {
        Row: {
          cnpj: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          specialty: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          specialty?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          specialty?: string | null
          status?: string | null
          updated_at?: string
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
          daily_report: boolean | null
          email: string
          email_notifications: boolean | null
          id: string
          last_login: string | null
          manage_equipment: boolean | null
          manage_others: boolean | null
          manage_predial: boolean | null
          name: string
          password_hash: string
          phone: string | null
          push_notifications: boolean | null
          report_frequency: string | null
          requested_role: Database["public"]["Enums"]["user_role"] | null
          reset_token: string | null
          reset_token_expires_at: string | null
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
          daily_report?: boolean | null
          email: string
          email_notifications?: boolean | null
          id?: string
          last_login?: string | null
          manage_equipment?: boolean | null
          manage_others?: boolean | null
          manage_predial?: boolean | null
          name: string
          password_hash: string
          phone?: string | null
          push_notifications?: boolean | null
          report_frequency?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"] | null
          reset_token?: string | null
          reset_token_expires_at?: string | null
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
          daily_report?: boolean | null
          email?: string
          email_notifications?: boolean | null
          id?: string
          last_login?: string | null
          manage_equipment?: boolean | null
          manage_others?: boolean | null
          manage_predial?: boolean | null
          name?: string
          password_hash?: string
          phone?: string | null
          push_notifications?: boolean | null
          report_frequency?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"] | null
          reset_token?: string | null
          reset_token_expires_at?: string | null
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
      work_order_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          user_id: string | null
          user_name: string
          work_order_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          user_id?: string | null
          user_name: string
          work_order_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          user_id?: string | null
          user_name?: string
          work_order_id: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_activities_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
          work_order_id: string
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
      work_order_sequences: {
        Row: {
          last_value: number
          year: number
        }
        Insert: {
          last_value?: number
          year: number
        }
        Update: {
          last_value?: number
          year?: number
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          asset_id: string | null
          created_at: string | null
          date: string | null
          downtime_hours: number | null
          estimated_hours: number | null
          failure_type: string | null
          hourly_rate: number | null
          id: string
          issue: string
          maintenance_category: string
          maintenance_type: string | null
          order_number: string
          parts_cost: number | null
          priority: string
          repair_hours: number | null
          requester_id: string | null
          resolved_at: string | null
          responded_at: string | null
          response_hours: number | null
          scheduled_at: string | null
          sector: string
          status: string
          technical_report: string | null
          technician_id: string | null
          third_party_company_id: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          date?: string | null
          downtime_hours?: number | null
          estimated_hours?: number | null
          failure_type?: string | null
          hourly_rate?: number | null
          id?: string
          issue: string
          maintenance_category?: string
          maintenance_type?: string | null
          order_number: string
          parts_cost?: number | null
          priority: string
          repair_hours?: number | null
          requester_id?: string | null
          resolved_at?: string | null
          responded_at?: string | null
          response_hours?: number | null
          scheduled_at?: string | null
          sector: string
          status: string
          technical_report?: string | null
          technician_id?: string | null
          third_party_company_id?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          date?: string | null
          downtime_hours?: number | null
          estimated_hours?: number | null
          failure_type?: string | null
          hourly_rate?: number | null
          id?: string
          issue?: string
          maintenance_category?: string
          maintenance_type?: string | null
          order_number?: string
          parts_cost?: number | null
          priority?: string
          repair_hours?: number | null
          requester_id?: string | null
          resolved_at?: string | null
          responded_at?: string | null
          response_hours?: number | null
          scheduled_at?: string | null
          sector?: string
          status?: string
          technical_report?: string | null
          technician_id?: string | null
          third_party_company_id?: string | null
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
          {
            foreignKeyName: "work_orders_third_party_company_id_fkey"
            columns: ["third_party_company_id"]
            isOneToOne: false
            referencedRelation: "third_party_companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_work_order: {
        Args: { p_admin_name: string; p_work_order_id: string }
        Returns: undefined
      }
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
      | {
        Args: {
          p_company_logo: string
          p_company_name: string
          p_critical_alerts: boolean
          p_daily_report: boolean
          p_email_notifications: boolean
          p_report_frequency?: string
          p_theme: string
          p_webhook_enabled: boolean
          p_webhook_url: string
          p_whatsapp_notifications: boolean
          p_work_order_alerts: boolean
        }
        Returns: undefined
      }
      | {
        Args: {
          p_company_email?: string
          p_company_logo: string
          p_company_name: string
          p_critical_alerts: boolean
          p_daily_report: boolean
          p_email_notifications: boolean
          p_report_frequency?: string
          p_theme: string
          p_webhook_enabled: boolean
          p_webhook_url: string
          p_whatsapp_notifications: boolean
          p_work_order_alerts: boolean
        }
        Returns: undefined
      }
      | {
        Args: {
          p_board_emails?: string
          p_company_email: string
          p_company_logo: string
          p_company_name: string
          p_critical_alerts: boolean
          p_daily_report: boolean
          p_email_notifications: boolean
          p_report_frequency: string
          p_theme: string
          p_webhook_enabled: boolean
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
