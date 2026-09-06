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
      ad_spends: {
        Row: {
          amount: number
          campaign: string | null
          created_at: string
          id: string
          platform: string
          spent_on: string
          user_id: string
        }
        Insert: {
          amount?: number
          campaign?: string | null
          created_at?: string
          id?: string
          platform?: string
          spent_on?: string
          user_id: string
        }
        Update: {
          amount?: number
          campaign?: string | null
          created_at?: string
          id?: string
          platform?: string
          spent_on?: string
          user_id?: string
        }
        Relationships: []
      }
      courier_accounts: {
        Row: {
          api_key: string
          auto_send: boolean
          created_at: string
          id: string
          provider: string
          secret_key: string
          updated_at: string
          user_id: string
          webhook_token: string | null
        }
        Insert: {
          api_key: string
          auto_send?: boolean
          created_at?: string
          id?: string
          provider?: string
          secret_key: string
          updated_at?: string
          user_id: string
          webhook_token?: string | null
        }
        Update: {
          api_key?: string
          auto_send?: boolean
          created_at?: string
          id?: string
          provider?: string
          secret_key?: string
          updated_at?: string
          user_id?: string
          webhook_token?: string | null
        }
        Relationships: []
      }
      courier_events: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          payload: Json | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          payload?: Json | null
          provider?: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          payload?: Json | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          blacklisted: boolean
          created_at: string
          email: string | null
          email_subscribed: boolean
          id: string
          name: string
          notes: string | null
          phone: string | null
          subscribed_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          blacklisted?: boolean
          created_at?: string
          email?: string | null
          email_subscribed?: boolean
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          subscribed_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          blacklisted?: boolean
          created_at?: string
          email?: string | null
          email_subscribed?: boolean
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          subscribed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_entries: {
        Row: {
          ad_cost: number
          created_at: string
          entry_date: string
          id: string
          manual_cogs: number | null
          manual_parcels: number | null
          manual_revenue: number | null
          note: string | null
          other_cost: number
          packaging_cost: number
          shipping_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_cost?: number
          created_at?: string
          entry_date?: string
          id?: string
          manual_cogs?: number | null
          manual_parcels?: number | null
          manual_revenue?: number | null
          note?: string | null
          other_cost?: number
          packaging_cost?: number
          shipping_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_cost?: number
          created_at?: string
          entry_date?: string
          id?: string
          manual_cogs?: number | null
          manual_parcels?: number | null
          manual_revenue?: number | null
          note?: string | null
          other_cost?: number
          packaging_cost?: number
          shipping_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          body: string | null
          created_at: string
          customer_id: string | null
          error: string | null
          id: string
          order_id: string | null
          status: string
          subject: string
          to_email: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          error?: string | null
          id?: string
          order_id?: string | null
          status?: string
          subject: string
          to_email: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          error?: string | null
          id?: string
          order_id?: string | null
          status?: string
          subject?: string
          to_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          note: string | null
          spent_on: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          spent_on?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          spent_on?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_image_url: string | null
          product_image_urls: string[]
          product_name: string
          qty: number
          unit_cost: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_image_url?: string | null
          product_image_urls?: string[]
          product_name: string
          qty?: number
          unit_cost?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_image_url?: string | null
          product_image_urls?: string[]
          product_name?: string
          qty?: number
          unit_cost?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          advance_paid: number
          cod_amount: number | null
          consignment_id: string | null
          courier_last_error: string | null
          courier_provider: string | null
          courier_sent_at: string | null
          courier_status: string | null
          courier_status_updated_at: string | null
          created_at: string
          customer_address: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_zone: string
          discount: number
          id: string
          note: string | null
          order_no: number
          other_cost: number
          packaging_cost: number
          shipping_charge: number
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          tracking_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          advance_paid?: number
          cod_amount?: number | null
          consignment_id?: string | null
          courier_last_error?: string | null
          courier_provider?: string | null
          courier_sent_at?: string | null
          courier_status?: string | null
          courier_status_updated_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_zone?: string
          discount?: number
          id?: string
          note?: string | null
          order_no?: number
          other_cost?: number
          packaging_cost?: number
          shipping_charge?: number
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          tracking_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          advance_paid?: number
          cod_amount?: number | null
          consignment_id?: string | null
          courier_last_error?: string | null
          courier_provider?: string | null
          courier_sent_at?: string | null
          courier_status?: string | null
          courier_status_updated_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_zone?: string
          discount?: number
          id?: string
          note?: string | null
          order_no?: number
          other_cost?: number
          packaging_cost?: number
          shipping_charge?: number
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          tracking_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      parcel_returns: {
        Row: {
          courier_cost: number
          created_at: string
          id: string
          note: string | null
          order_id: string | null
          qty: number
          returned_on: string
          sent_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          courier_cost?: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          qty?: number
          returned_on?: string
          sent_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          courier_cost?: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          qty?: number
          returned_on?: string
          sent_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcel_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          buy_price: number
          category: string | null
          created_at: string
          expiry_date: string | null
          id: string
          image_url: string | null
          image_urls: string[]
          low_stock_threshold: number
          name: string
          sell_price: number
          sku: string | null
          stock: number
          user_id: string
        }
        Insert: {
          brand?: string | null
          buy_price?: number
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          low_stock_threshold?: number
          name: string
          sell_price?: number
          sku?: string | null
          stock?: number
          user_id: string
        }
        Update: {
          brand?: string | null
          buy_price?: number
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          low_stock_threshold?: number
          name?: string
          sell_price?: number
          sku?: string | null
          stock?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          onboarding_completed_at: string | null
          onboarding_done: boolean
          onboarding_step: number
          shop_name: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_completed_at?: string | null
          onboarding_done?: boolean
          onboarding_step?: number
          shop_name?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          onboarding_done?: boolean
          onboarding_step?: number
          shop_name?: string | null
        }
        Relationships: []
      }
      shop_settings: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          daily_report_enabled: boolean
          email: string | null
          inside_dhaka_charge: number
          logo_url: string | null
          outside_dhaka_charge: number
          phone: string | null
          report_email: string | null
          tagline: string | null
          thank_you_message: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name?: string
          created_at?: string
          daily_report_enabled?: boolean
          email?: string | null
          inside_dhaka_charge?: number
          logo_url?: string | null
          outside_dhaka_charge?: number
          phone?: string | null
          report_email?: string | null
          tagline?: string | null
          thank_you_message?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          daily_report_enabled?: boolean
          email?: string | null
          inside_dhaka_charge?: number
          logo_url?: string | null
          outside_dhaka_charge?: number
          phone?: string | null
          report_email?: string | null
          tagline?: string | null
          thank_you_message?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          change: number
          created_at: string
          id: string
          note: string | null
          product_id: string
          reason: string
          user_id: string
        }
        Insert: {
          change: number
          created_at?: string
          id?: string
          note?: string | null
          product_id: string
          reason?: string
          user_id: string
        }
        Update: {
          change?: number
          created_at?: string
          id?: string
          note?: string | null
          product_id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "manager" | "staff"
      order_source:
        | "facebook"
        | "whatsapp"
        | "walkin"
        | "instagram"
        | "phone"
        | "other"
      order_status:
        | "pending"
        | "confirmed"
        | "packed"
        | "shipped"
        | "delivered"
        | "returned"
        | "cancelled"
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
    Enums: {
      app_role: ["owner", "manager", "staff"],
      order_source: [
        "facebook",
        "whatsapp",
        "walkin",
        "instagram",
        "phone",
        "other",
      ],
      order_status: [
        "pending",
        "confirmed",
        "packed",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
      ],
    },
  },
} as const
