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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cave: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cave_vin: {
        Row: {
          added_at: string | null
          cave_id: string
          notes: string | null
          quantity: number | null
          vin_id: string
        }
        Insert: {
          added_at?: string | null
          cave_id: string
          notes?: string | null
          quantity?: number | null
          vin_id: string
        }
        Update: {
          added_at?: string | null
          cave_id?: string
          notes?: string | null
          quantity?: number | null
          vin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cav_vin_cave_id_fkey"
            columns: ["cave_id"]
            isOneToOne: false
            referencedRelation: "cave"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cav_vin_vin_id_fkey"
            columns: ["vin_id"]
            isOneToOne: false
            referencedRelation: "vin"
            referencedColumns: ["id"]
          },
        ]
      }
      domaine: {
        Row: {
          address: string | null
          banner_url: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      event: {
        Row: {
          banner_url: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          location: string
          name: string
          organizer_id: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location: string
          name: string
          organizer_id?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string
          name?: string
          organizer_id?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      event_domaine: {
        Row: {
          domaine_id: string
          event_id: string
          notes: string | null
          stand_number: string | null
        }
        Insert: {
          domaine_id: string
          event_id: string
          notes?: string | null
          stand_number?: string | null
        }
        Update: {
          domaine_id?: string
          event_id?: string
          notes?: string | null
          stand_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_domaine_domaine_id_fkey"
            columns: ["domaine_id"]
            isOneToOne: false
            referencedRelation: "domaine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_domaine_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event"
            referencedColumns: ["id"]
          },
        ]
      }
      event_domaine_vin: {
        Row: {
          domaine_id: string
          event_id: string
          notes: string | null
          quantity: number | null
          tasting_available: boolean | null
          vin_id: string
        }
        Insert: {
          domaine_id: string
          event_id: string
          notes?: string | null
          quantity?: number | null
          tasting_available?: boolean | null
          vin_id: string
        }
        Update: {
          domaine_id?: string
          event_id?: string
          notes?: string | null
          quantity?: number | null
          tasting_available?: boolean | null
          vin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_domaine_vin_domaine_id_fkey"
            columns: ["domaine_id"]
            isOneToOne: false
            referencedRelation: "domaine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_domaine_vin_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_domaine_vin_vin_id_fkey"
            columns: ["vin_id"]
            isOneToOne: false
            referencedRelation: "vin"
            referencedColumns: ["id"]
          },
        ]
      }
      post: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          image_url: string | null
          updated_at: string | null
          user_id: string | null
          vin_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          vin_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          vin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_vin_id_fkey"
            columns: ["vin_id"]
            isOneToOne: false
            referencedRelation: "vin"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comment: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comment_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comment_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_like: {
        Row: {
          liked_at: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          liked_at?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          liked_at?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_like_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cave: {
        Row: {
          cave_id: string
          created_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          cave_id: string
          created_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          cave_id?: string
          created_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cave_cave_id_fkey"
            columns: ["cave_id"]
            isOneToOne: false
            referencedRelation: "cave"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follow: {
        Row: {
          followed_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          followed_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          followed_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          address: string | null
          affiliate_link: string | null
          created_at: string | null
          description: string | null
          full_name: string | null
          id: string
          last_name: string | null
          logo_adress: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          affiliate_link?: string | null
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          logo_adress?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          affiliate_link?: string | null
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          logo_adress?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_vin_inventory: {
        Row: {
          location: string | null
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          quantity: number | null
          user_id: string
          vin_id: string
        }
        Insert: {
          location?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          user_id: string
          vin_id: string
        }
        Update: {
          location?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          user_id?: string
          vin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vin_inventory_vin_id_fkey"
            columns: ["vin_id"]
            isOneToOne: false
            referencedRelation: "vin"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vin_note: {
        Row: {
          comment: string | null
          created_at: string | null
          details: Json | null
          event_id: string | null
          id: string
          rating: number | null
          updated_at: string | null
          user_id: string | null
          vin_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          details?: Json | null
          event_id?: string | null
          id?: string
          rating?: number | null
          updated_at?: string | null
          user_id?: string | null
          vin_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          details?: Json | null
          event_id?: string | null
          id?: string
          rating?: number | null
          updated_at?: string | null
          user_id?: string | null
          vin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_vin_note_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_vin_note_vin_id_fkey"
            columns: ["vin_id"]
            isOneToOne: false
            referencedRelation: "vin"
            referencedColumns: ["id"]
          },
        ]
      }
      vin: {
        Row: {
          alcohol_percentage: number | null
          characteristics: Json | null
          created_at: string | null
          description: string | null
          domaine_id: string | null
          id: string
          label_url: string | null
          name: string
          price: number | null
          stock: number | null
          uber_order_url: string | null
          updated_at: string | null
          volume_ml: number | null
          website_order_url: string | null
          year: number | null
        }
        Insert: {
          alcohol_percentage?: number | null
          characteristics?: Json | null
          created_at?: string | null
          description?: string | null
          domaine_id?: string | null
          id?: string
          label_url?: string | null
          name: string
          price?: number | null
          stock?: number | null
          uber_order_url?: string | null
          updated_at?: string | null
          volume_ml?: number | null
          website_order_url?: string | null
          year?: number | null
        }
        Update: {
          alcohol_percentage?: number | null
          characteristics?: Json | null
          created_at?: string | null
          description?: string | null
          domaine_id?: string | null
          id?: string
          label_url?: string | null
          name?: string
          price?: number | null
          stock?: number | null
          uber_order_url?: string | null
          updated_at?: string | null
          volume_ml?: number | null
          website_order_url?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vin_domaine_id_fkey"
            columns: ["domaine_id"]
            isOneToOne: false
            referencedRelation: "domaine"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
