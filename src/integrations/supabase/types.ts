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
      cellar_invitation: {
        Row: {
          cellar_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          invitee_email: string
          invitee_user_id: string | null
          inviter_id: string
          role: Database["public"]["Enums"]["cellar_role"]
          status: string
          token: string
        }
        Insert: {
          cellar_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invitee_email: string
          invitee_user_id?: string | null
          inviter_id: string
          role?: Database["public"]["Enums"]["cellar_role"]
          status?: string
          token: string
        }
        Update: {
          cellar_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invitee_email?: string
          invitee_user_id?: string | null
          inviter_id?: string
          role?: Database["public"]["Enums"]["cellar_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "cellar_invitation_cellar_id_fkey"
            columns: ["cellar_id"]
            isOneToOne: false
            referencedRelation: "cellar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cellar_invitation_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cellar_invitation_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cellar_invitation_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cellar_invitation_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cellar_wine: {
        Row: {
          added_at: string | null
          cellar_id: string
          description: string | null
          domain_id: string | null
          label_url: string | null
          price: number | null
          quantity: number | null
          wine_id: string
        }
        Insert: {
          added_at?: string | null
          cellar_id: string
          description?: string | null
          domain_id?: string | null
          label_url?: string | null
          price?: number | null
          quantity?: number | null
          wine_id: string
        }
        Update: {
          added_at?: string | null
          cellar_id?: string
          description?: string | null
          domain_id?: string | null
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
            foreignKeyName: "cellar_wine_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain"
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
          appellations: string | null
          banner_url: string | null
          communes: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          normalized_name: string | null
          phone: string | null
          region: Database["public"]["Enums"]["domain_region"] | null
          regions: string | null
          subregions: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          appellations?: string | null
          banner_url?: string | null
          communes?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          normalized_name?: string | null
          phone?: string | null
          region?: Database["public"]["Enums"]["domain_region"] | null
          regions?: string | null
          subregions?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          appellations?: string | null
          banner_url?: string | null
          communes?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          normalized_name?: string | null
          phone?: string | null
          region?: Database["public"]["Enums"]["domain_region"] | null
          regions?: string | null
          subregions?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      domain_enrichment_status: {
        Row: {
          ai_analysis: Json | null
          applied_at: string | null
          approved_at: string | null
          approved_by: string | null
          confidence_score: number | null
          created_at: string | null
          domain_id: string
          error_message: string | null
          id: string
          manual_edits: Json | null
          original_data: Json | null
          processed_at: string | null
          search_results: Json | null
          status: string
          suggested_address: string | null
          suggested_appellations: string | null
          suggested_communes: string | null
          suggested_description: string | null
          suggested_email: string | null
          suggested_name: string | null
          suggested_phone: string | null
          suggested_region: string | null
          suggested_regions: string | null
          suggested_subregions: string | null
          suggested_website_url: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number | null
          created_at?: string | null
          domain_id: string
          error_message?: string | null
          id?: string
          manual_edits?: Json | null
          original_data?: Json | null
          processed_at?: string | null
          search_results?: Json | null
          status?: string
          suggested_address?: string | null
          suggested_appellations?: string | null
          suggested_communes?: string | null
          suggested_description?: string | null
          suggested_email?: string | null
          suggested_name?: string | null
          suggested_phone?: string | null
          suggested_region?: string | null
          suggested_regions?: string | null
          suggested_subregions?: string | null
          suggested_website_url?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number | null
          created_at?: string | null
          domain_id?: string
          error_message?: string | null
          id?: string
          manual_edits?: Json | null
          original_data?: Json | null
          processed_at?: string | null
          search_results?: Json | null
          status?: string
          suggested_address?: string | null
          suggested_appellations?: string | null
          suggested_communes?: string | null
          suggested_description?: string | null
          suggested_email?: string | null
          suggested_name?: string | null
          suggested_phone?: string | null
          suggested_region?: string | null
          suggested_regions?: string | null
          suggested_subregions?: string | null
          suggested_website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_enrichment_status_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_enrichment_status_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_enrichment_status_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "event_organizer_id_fkey1"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_organizer_id_fkey1"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
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
      event_invitation: {
        Row: {
          created_at: string | null
          event_id: string
          expires_at: string | null
          id: string
          invitee_email: string
          invitee_user_id: string | null
          inviter_id: string
          role: Database["public"]["Enums"]["event_role"]
          status: string
          token: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          expires_at?: string | null
          id?: string
          invitee_email: string
          invitee_user_id?: string | null
          inviter_id: string
          role?: Database["public"]["Enums"]["event_role"]
          status?: string
          token: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          expires_at?: string | null
          id?: string
          invitee_email?: string
          invitee_user_id?: string | null
          inviter_id?: string
          role?: Database["public"]["Enums"]["event_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invitation_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitation_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitation_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      game_question: {
        Row: {
          answer_type: number
          apply_to_color: Database["public"]["Enums"]["quiz_wine_color"]
          apply_to_region: Database["public"]["Enums"]["domain_region"] | null
          fact_key: string | null
          id: number
          is_fun: boolean | null
          question: string | null
        }
        Insert: {
          answer_type: number
          apply_to_color?: Database["public"]["Enums"]["quiz_wine_color"]
          apply_to_region?: Database["public"]["Enums"]["domain_region"] | null
          fact_key?: string | null
          id?: number
          is_fun?: boolean | null
          question?: string | null
        }
        Update: {
          answer_type?: number
          apply_to_color?: Database["public"]["Enums"]["quiz_wine_color"]
          apply_to_region?: Database["public"]["Enums"]["domain_region"] | null
          fact_key?: string | null
          id?: number
          is_fun?: boolean | null
          question?: string | null
        }
        Relationships: []
      }
      game_wine_facts: {
        Row: {
          correct_answers: Json
          fact_key: string
          id: number
          incorrect_answers: Json
          region: Database["public"]["Enums"]["domain_region"]
          wine_type: Database["public"]["Enums"]["quiz_wine_color"]
        }
        Insert: {
          correct_answers: Json
          fact_key: string
          id?: number
          incorrect_answers: Json
          region: Database["public"]["Enums"]["domain_region"]
          wine_type: Database["public"]["Enums"]["quiz_wine_color"]
        }
        Update: {
          correct_answers?: Json
          fact_key?: string
          id?: number
          incorrect_answers?: Json
          region?: Database["public"]["Enums"]["domain_region"]
          wine_type?: Database["public"]["Enums"]["quiz_wine_color"]
        }
        Relationships: []
      }
      lesson_completion: {
        Row: {
          completed_at: string
          counted_for_unlock: boolean
          lesson_id: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          counted_for_unlock?: boolean
          lesson_id: number
          user_id: string
        }
        Update: {
          completed_at?: string
          counted_for_unlock?: boolean
          lesson_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completion_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completion_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completion_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_quiz_result: {
        Row: {
          answers: Json
          created_at: string
          id: string
          lesson_id: number
          max_score: number
          score: number
          submitted_at: string
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          lesson_id: number
          max_score: number
          score: number
          submitted_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          lesson_id?: number
          max_score?: number
          score?: number
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_quiz_result_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_quiz_result_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_quiz_result_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          baner_url: string | null
          course_id: number
          created_at: string
          difficulty: number | null
          estimated_time: string | null
          global_order: number
          id: number
          lesson_number: number
          pages: Json
          quizzes: Json | null
          title: string | null
          updated_at: string
        }
        Insert: {
          baner_url?: string | null
          course_id: number
          created_at?: string
          difficulty?: number | null
          estimated_time?: string | null
          global_order: number
          id?: number
          lesson_number: number
          pages: Json
          quizzes?: Json | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          baner_url?: string | null
          course_id?: number
          created_at?: string
          difficulty?: number | null
          estimated_time?: string | null
          global_order?: number
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
          user_id: string
          wine_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          updated_at?: string | null
          user_id: string
          wine_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          updated_at?: string | null
          user_id?: string
          wine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "post_comment_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
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
          {
            foreignKeyName: "post_like_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_like_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cellar: {
        Row: {
          created_at: string | null
          role: Database["public"]["Enums"]["cellar_role"]
          user_cellar_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["cellar_role"]
          user_cellar_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["cellar_role"]
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
          {
            foreignKeyName: "user_cellar_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cellar_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
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
          {
            foreignKeyName: "user_domain_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
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
          {
            foreignKeyName: "user_domain_application_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_event: {
        Row: {
          created_at: string
          event_id: string
          role: Database["public"]["Enums"]["event_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          role?: Database["public"]["Enums"]["event_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          role?: Database["public"]["Enums"]["event_role"]
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
          {
            foreignKeyName: "user_event_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
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
            foreignKeyName: "user_favorite_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
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
        Relationships: [
          {
            foreignKeyName: "user_follow_follower_id_fkey1"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follow_follower_id_fkey1"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follow_following_id_fkey1"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follow_following_id_fkey1"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lesson_unlock: {
        Row: {
          lesson_id: number
          unlocked_at: string
          user_id: string
        }
        Insert: {
          lesson_id: number
          unlocked_at?: string
          user_id: string
        }
        Update: {
          lesson_id?: number
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_unlock_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_unlock_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_unlock_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          address: string | null
          allow_adress: boolean
          allow_email: boolean
          allow_phone: boolean
          allow_xp: boolean
          city: string | null
          created_at: string | null
          description: string | null
          email: string | null
          full_name: string | null
          id: string
          last_name: string | null
          latitude: number | null
          level: number | null
          logo_adress: string | null
          longitude: number | null
          phone_number: number | null
          slug: string | null
          updated_at: string | null
          xp: number
        }
        Insert: {
          address?: string | null
          allow_adress?: boolean
          allow_email?: boolean
          allow_phone?: boolean
          allow_xp?: boolean
          city?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          latitude?: number | null
          level?: number | null
          logo_adress?: string | null
          longitude?: number | null
          phone_number?: number | null
          slug?: string | null
          updated_at?: string | null
          xp?: number
        }
        Update: {
          address?: string | null
          allow_adress?: boolean
          allow_email?: boolean
          allow_phone?: boolean
          allow_xp?: boolean
          city?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          latitude?: number | null
          level?: number | null
          logo_adress?: string | null
          longitude?: number | null
          phone_number?: number | null
          slug?: string | null
          updated_at?: string | null
          xp?: number
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
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles_public"
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
            foreignKeyName: "user_wine_comment_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
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
          {
            foreignKeyName: "user_comment_reaction_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
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
          {
            foreignKeyName: "user_wine_notice_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wine_notice_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_public"
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
          normalized_name: string | null
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
          normalized_name?: string | null
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
          normalized_name?: string | null
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
          normalized_nom: string | null
          region: string | null
        }
        Insert: {
          description?: string | null
          id?: number
          nom: string
          normalized_nom?: string | null
          region?: string | null
        }
        Update: {
          description?: string | null
          id?: number
          nom?: string
          normalized_nom?: string | null
          region?: string | null
        }
        Relationships: []
      }
      wine_type: {
        Row: {
          id: number
          normalized_type: string | null
          type: Database["public"]["Enums"]["wine_type_enum"]
        }
        Insert: {
          id?: number
          normalized_type?: string | null
          type: Database["public"]["Enums"]["wine_type_enum"]
        }
        Update: {
          id?: number
          normalized_type?: string | null
          type?: Database["public"]["Enums"]["wine_type_enum"]
        }
        Relationships: []
      }
      xp_history: {
        Row: {
          created_at: string
          id: string
          lesson_id: number
          reason: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: number
          reason: string
          user_id: string
          xp_earned: number
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: number
          reason?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_history_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_profiles_public: {
        Row: {
          address: string | null
          city: string | null
          description: string | null
          email: string | null
          experience: number | null
          full_name: string | null
          id: string | null
          level: number | null
          logo_adress: string | null
          phone_number: number | null
          slug: string | null
        }
        Insert: {
          address?: never
          city?: string | null
          description?: string | null
          email?: never
          experience?: never
          full_name?: string | null
          id?: string | null
          level?: number | null
          logo_adress?: string | null
          phone_number?: never
          slug?: string | null
        }
        Update: {
          address?: never
          city?: string | null
          description?: string | null
          email?: never
          experience?: never
          full_name?: string | null
          id?: string | null
          level?: number | null
          logo_adress?: string | null
          phone_number?: never
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_user_unlock_lesson: { Args: { p_user_id: string }; Returns: boolean }
      cleanup_expired_event_invitations: { Args: never; Returns: undefined }
      cleanup_expired_invitations: { Args: never; Returns: undefined }
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
      get_user_accessible_lessons: {
        Args: { p_user_id: string }
        Returns: {
          completed_at: string
          course_id: number
          estimated_time: string
          global_order: number
          is_completed: boolean
          is_unlocked: boolean
          lesson_id: number
          lesson_number: number
          title: string
          unlocked_at: string
        }[]
      }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_user_role: { Args: never; Returns: string }
      get_weekly_lesson_slots: {
        Args: { p_user_id: string }
        Returns: {
          available_unlocks: number
          total_completions: number
          week_number: number
        }[]
      }
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
          region: string
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
      unlock_next_lesson: { Args: { p_user_id: string }; Returns: number }
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
      cellar_role: "owner" | "co-owner" | "admin" | "co_owner"
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
      event_role: "organizer" | "co_organizer" | "admin"
      quiz_wine_color: "red" | "white" | "rose" | "eff" | "all"
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
      cellar_role: ["owner", "co-owner", "admin", "co_owner"],
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
      event_role: ["organizer", "co_organizer", "admin"],
      quiz_wine_color: ["red", "white", "rose", "eff", "all"],
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
