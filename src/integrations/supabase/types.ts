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
      cellar: {
        Row: {
          banner_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          is_seller: boolean | null
          latitude: number | null
          location: string | null
          logo_url: string | null
          longitude: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_seller?: boolean | null
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_seller?: boolean | null
          latitude?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cellar_wine: {
        Row: {
          added_at: string | null
          cellar_id: string
          description: string | null
          label_url: string | null
          price: number | null
          quantity: number | null
          wine_id: string
        }
        Insert: {
          added_at?: string | null
          cellar_id: string
          description?: string | null
          label_url?: string | null
          price?: number | null
          quantity?: number | null
          wine_id: string
        }
        Update: {
          added_at?: string | null
          cellar_id?: string
          description?: string | null
          label_url?: string | null
          price?: number | null
          quantity?: number | null
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cav_vin_cave_id_fkey"
            columns: ["cellar_id"]
            isOneToOne: false
            referencedRelation: "cellar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cellar_wine_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wine"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          icon_emoji: string
          icon_url: string | null
          id: number
          is_available: boolean
          keywords: string[] | null
          lesson_count: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon_emoji: string
          icon_url?: string | null
          id?: number
          is_available?: boolean
          keywords?: string[] | null
          lesson_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon_emoji?: string
          icon_url?: string | null
          id?: number
          is_available?: boolean
          keywords?: string[] | null
          lesson_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      domain: {
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
          region: Database["public"]["Enums"]["domain_region"] | null
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
          region?: Database["public"]["Enums"]["domain_region"] | null
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
          region?: Database["public"]["Enums"]["domain_region"] | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      event: {
        Row: {
          address: string | null
          banner_url: string | null
          category: string | null
          cellar_id: string | null
          city: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_public: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          organizer_id: string | null
          registration_link: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          category?: string | null
          cellar_id?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          organizer_id?: string | null
          registration_link?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          category?: string | null
          cellar_id?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          organizer_id?: string | null
          registration_link?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_cellar_id_fkey"
            columns: ["cellar_id"]
            isOneToOne: false
            referencedRelation: "cellar"
            referencedColumns: ["id"]
          },
        ]
      }
      event_domain: {
        Row: {
          domain_id: string
          event_id: string
          notes: string | null
          stand_number: string | null
        }
        Insert: {
          domain_id: string
          event_id: string
          notes?: string | null
          stand_number?: string | null
        }
        Update: {
          domain_id?: string
          event_id?: string
          notes?: string | null
          stand_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_domaine_domaine_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain"
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
      event_domain_wine: {
        Row: {
          domain_id: string
          event_id: string
          notice: string | null
          price: number | null
          quantity: number | null
          tasting_available: boolean | null
          wine_id: string
        }
        Insert: {
          domain_id: string
          event_id: string
          notice?: string | null
          price?: number | null
          quantity?: number | null
          tasting_available?: boolean | null
          wine_id: string
        }
        Update: {
          domain_id?: string
          event_id?: string
          notice?: string | null
          price?: number | null
          quantity?: number | null
          tasting_available?: boolean | null
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_domaine_vin_domaine_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain"
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
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wine"
            referencedColumns: ["id"]
          },
        ]
      }
      game_question: {
        Row: {
          created_at: string
          id: number
          question: string | null
          reply: Json | null
        }
        Insert: {
          created_at?: string
          id?: number
          question?: string | null
          reply?: Json | null
        }
        Update: {
          created_at?: string
          id?: number
          question?: string | null
          reply?: Json | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          course_id: number
          created_at: string
          estimated_time: string | null
          id: number
          lesson_number: number
          pages: Json
          quizzes: Json | null
          title: string | null
          updated_at: string
        }
        Insert: {
          course_id: number
          created_at?: string
          estimated_time?: string | null
          id?: number
          lesson_number: number
          pages: Json
          quizzes?: Json | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: number
          created_at?: string
          estimated_time?: string | null
          id?: number
          lesson_number?: number
          pages?: Json
          quizzes?: Json | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      mode_culture: {
        Row: {
          description: string | null
          id: number
          nom: string
        }
        Insert: {
          description?: string | null
          id?: number
          nom: string
        }
        Update: {
          description?: string | null
          id?: number
          nom?: string
        }
        Relationships: []
      }
      post: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          image_url: string | null
          updated_at: string | null
          user_id: string | null
          wine_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          wine_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          wine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_vin_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wine"
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
      user_cellar: {
        Row: {
          created_at: string | null
          role: string | null
          user_cellar_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: string | null
          user_cellar_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string | null
          user_cellar_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cave_cave_id_fkey"
            columns: ["user_cellar_id"]
            isOneToOne: false
            referencedRelation: "cellar"
            referencedColumns: ["id"]
          },
        ]
      }
      user_domain: {
        Row: {
          created_at: string
          domain_id: string
          role: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          domain_id: string
          role?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          domain_id?: string
          role?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_domain_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_domain_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_domain_application: {
        Row: {
          created_at: string
          domain_id: string
          role: number
          user_id: string
        }
        Insert: {
          created_at?: string
          domain_id: string
          role?: number
          user_id: string
        }
        Update: {
          created_at?: string
          domain_id?: string
          role?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_domain_application_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_domain_application_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_event: {
        Row: {
          created_at: string
          event_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_event_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_event_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite: {
        Row: {
          created_at: string
          domain_id: string
          user_id: string
          wine_id: string
        }
        Insert: {
          created_at?: string
          domain_id: string
          user_id: string
          wine_id?: string
        }
        Update: {
          created_at?: string
          domain_id?: string
          user_id?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wine"
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
          city: string | null
          created_at: string | null
          description: string | null
          full_name: string | null
          id: string
          last_name: string | null
          latitude: number | null
          logo_adress: string | null
          longitude: number | null
          téléphone: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          latitude?: number | null
          logo_adress?: string | null
          longitude?: number | null
          téléphone?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          latitude?: number | null
          logo_adress?: string | null
          longitude?: number | null
          téléphone?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wine_comment: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          user_id: string
          wine_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          user_id: string
          wine_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          user_id?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wine_comment_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wine_comment_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wine"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wine_comment_reaction: {
        Row: {
          comment_id: string
          created_at: string
          reaction: number
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          reaction: number
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          reaction?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_comment_reaction_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "user_wine_comment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_comment_reaction_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wine_notice: {
        Row: {
          comment: string | null
          created_at: string | null
          details: Json | null
          id: string
          liked: number
          rating: number | null
          updated_at: string | null
          user_id: string
          wine_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          liked?: number
          rating?: number | null
          updated_at?: string | null
          user_id: string
          wine_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          liked?: number
          rating?: number | null
          updated_at?: string | null
          user_id?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vin_note_vin_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wine"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wine_notice_cellar: {
        Row: {
          cellar_id: string
          created_at: string
          id: number
          user_wine_notice_id: string
        }
        Insert: {
          cellar_id: string
          created_at?: string
          id?: number
          user_wine_notice_id: string
        }
        Update: {
          cellar_id?: string
          created_at?: string
          id?: number
          user_wine_notice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wine_notice_cellar_cellar_id_fkey"
            columns: ["cellar_id"]
            isOneToOne: false
            referencedRelation: "cellar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wine_notice_cellar_user_wine_notice_id_fkey"
            columns: ["user_wine_notice_id"]
            isOneToOne: false
            referencedRelation: "user_wine_notice"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wine_notice_event: {
        Row: {
          created_at: string
          event_id: string
          id: number
          user_wine_notice_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: number
          user_wine_notice_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: number
          user_wine_notice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wine_notice_event_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wine_notice_event_user_wine_notice_id_fkey"
            columns: ["user_wine_notice_id"]
            isOneToOne: false
            referencedRelation: "user_wine_notice"
            referencedColumns: ["id"]
          },
        ]
      }
      wine: {
        Row: {
          alcohol_percentage: number | null
          cepages: Json | null
          characteristics: Json | null
          created_at: string | null
          description: string | null
          domain_id: string | null
          id: string
          is_playable: boolean
          label_url: string
          mode_culture: number | null
          name: string
          price: number | null
          type: number | null
          updated_at: string | null
          volume_ml: number | null
          website_order_url: string | null
          wine_classification: number | null
          year: number | null
        }
        Insert: {
          alcohol_percentage?: number | null
          cepages?: Json | null
          characteristics?: Json | null
          created_at?: string | null
          description?: string | null
          domain_id?: string | null
          id?: string
          is_playable?: boolean
          label_url?: string
          mode_culture?: number | null
          name: string
          price?: number | null
          type?: number | null
          updated_at?: string | null
          volume_ml?: number | null
          website_order_url?: string | null
          wine_classification?: number | null
          year?: number | null
        }
        Update: {
          alcohol_percentage?: number | null
          cepages?: Json | null
          characteristics?: Json | null
          created_at?: string | null
          description?: string | null
          domain_id?: string | null
          id?: string
          is_playable?: boolean
          label_url?: string
          mode_culture?: number | null
          name?: string
          price?: number | null
          type?: number | null
          updated_at?: string | null
          volume_ml?: number | null
          website_order_url?: string | null
          wine_classification?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wine_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wine_mode_culture_fkey"
            columns: ["mode_culture"]
            isOneToOne: false
            referencedRelation: "mode_culture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wine_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "wine_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wine_wine_classification_fkey"
            columns: ["wine_classification"]
            isOneToOne: false
            referencedRelation: "wine_classification"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_classification: {
        Row: {
          description: string | null
          id: number
          nom: string
          region: string | null
        }
        Insert: {
          description?: string | null
          id?: number
          nom: string
          region?: string | null
        }
        Update: {
          description?: string | null
          id?: number
          nom?: string
          region?: string | null
        }
        Relationships: []
      }
      wine_type: {
        Row: {
          id: number
          type: Database["public"]["Enums"]["wine_type_enum"]
        }
        Insert: {
          id?: number
          type: Database["public"]["Enums"]["wine_type_enum"]
        }
        Update: {
          id?: number
          type?: Database["public"]["Enums"]["wine_type_enum"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_cellar_with_owner: {
        Args: {
          p_banner_url: string
          p_description: string
          p_is_public: boolean
          p_is_seller: boolean
          p_latitude: number
          p_location: string
          p_logo_url: string
          p_longitude: number
          p_name: string
        }
        Returns: string
      }
      event_is_public: { Args: { _event_id: string }; Returns: boolean }
      get_team_applications_without_owner: {
        Args: never
        Returns: {
          created_at: string
          domain: Json
          domain_id: string
          role: number
          user_id: string
          user_profiles: Json
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      search_domains: {
        Args: { query: string }
        Returns: {
          description: string
          id: string
          logo_url: string
          name: string
          website_url: string
        }[]
      }
      search_wines: {
        Args: { query: string }
        Returns: {
          alcohol_percentage: number
          characteristics: Json
          created_at: string
          description: string
          domain: Json
          domain_id: string
          id: string
          label_url: string
          name: string
          price: number
          updated_at: string
          volume_ml: number
          website_order_url: string
          wine_classification: Json
          wine_type: Json
          year: number
        }[]
      }
      search_wines_game: {
        Args: { query: string }
        Returns: {
          domain_name: string
          id: string
          similarity_score: number
          wine_name: string
          wine_year: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
      upsert_wine_notice_with_event: {
        Args: {
          p_details: Json
          p_event_id: string
          p_liked: number
          p_user_id: string
          p_wine_id: string
        }
        Returns: string
      }
      user_is_event_organizer: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_wine_notice: {
        Args: { _notice_id: string; _user_id: string }
        Returns: boolean
      }
      user_participates_in_event: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin"
      domain_region:
        | "Champagne"
        | "Loire"
        | "Rhône"
        | "Alsace"
        | "Bourgogne"
        | "Bordeaux"
        | "Jura"
        | "Beaujolais"
        | "Languedoc-Roussillon"
        | "Sud-Ouest"
        | "Corse"
        | "Provence"
      wine_type_enum:
        | "champagne"
        | "crémant"
        | "blanc"
        | "rouge"
        | "prosecco"
        | "rosé"
        | "autre"
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
      app_role: ["user", "admin", "super_admin"],
      domain_region: [
        "Champagne",
        "Loire",
        "Rhône",
        "Alsace",
        "Bourgogne",
        "Bordeaux",
        "Jura",
        "Beaujolais",
        "Languedoc-Roussillon",
        "Sud-Ouest",
        "Corse",
        "Provence",
      ],
      wine_type_enum: [
        "champagne",
        "crémant",
        "blanc",
        "rouge",
        "prosecco",
        "rosé",
        "autre",
      ],
    },
  },
} as const
