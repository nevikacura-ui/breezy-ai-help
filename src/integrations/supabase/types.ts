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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      action_audit: {
        Row: {
          approved: boolean
          created_at: string
          id: string
          input: Json | null
          output: Json | null
          status: string
          tool: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id?: string
          input?: Json | null
          output?: Json | null
          status?: string
          tool: string
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          id?: string
          input?: Json | null
          output?: Json | null
          status?: string
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: string
          path: string
          properties: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          path?: string
          properties?: Json
          session_id?: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          path?: string
          properties?: Json
          session_id?: string
        }
        Relationships: []
      }
      automation_specs: {
        Row: {
          created_at: string
          cubix_review_url: string | null
          cubix_workflow_id: string | null
          error: string | null
          id: string
          spec: Json
          status: string
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cubix_review_url?: string | null
          cubix_workflow_id?: string | null
          error?: string | null
          id?: string
          spec: Json
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cubix_review_url?: string | null
          cubix_workflow_id?: string | null
          error?: string | null
          id?: string
          spec?: Json
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_memory: {
        Row: {
          bot_id: string
          facts: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_id: string
          facts?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_id?: string
          facts?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      openrouter_spend: {
        Row: {
          completion_tokens: number
          cost_usd: number
          id: string
          model: string
          month: string
          prompt_tokens: number
          updated_at: string
        }
        Insert: {
          completion_tokens?: number
          cost_usd?: number
          id?: string
          model: string
          month: string
          prompt_tokens?: number
          updated_at?: string
        }
        Update: {
          completion_tokens?: number
          cost_usd?: number
          id?: string
          model?: string
          month?: string
          prompt_tokens?: number
          updated_at?: string
        }
        Relationships: []
      }
      otp_audit: {
        Row: {
          action: string
          context: string | null
          created_at: string
          error: string | null
          id: string
          ip: string | null
          phone: string
          status: string
          user_agent: string | null
        }
        Insert: {
          action: string
          context?: string | null
          created_at?: string
          error?: string | null
          id?: string
          ip?: string | null
          phone: string
          status: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          context?: string | null
          created_at?: string
          error?: string | null
          id?: string
          ip?: string | null
          phone?: string
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          cashfree_order_id: string
          created_at: string
          currency: string
          id: string
          payment_session_id: string | null
          raw: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          cashfree_order_id: string
          created_at?: string
          currency?: string
          id?: string
          payment_session_id?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cashfree_order_id?: string
          created_at?: string
          currency?: string
          id?: string
          payment_session_id?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          is_pro: boolean
          pro_until: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          is_pro?: boolean
          pro_until?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          is_pro?: boolean
          pro_until?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          bot_id: string | null
          created_at: string
          due_at: string | null
          id: string
          notes: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          bot_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          bot_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_permissions: {
        Row: {
          allowed: boolean
          always_ask: boolean
          created_at: string
          id: string
          permission: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          always_ask?: boolean
          created_at?: string
          id?: string
          permission: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          always_ask?: boolean
          created_at?: string
          id?: string
          permission?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_daily: {
        Row: {
          day: string
          media_count: number
          text_count: number
          user_id: string
          voice_count: number
        }
        Insert: {
          day?: string
          media_count?: number
          text_count?: number
          user_id: string
          voice_count?: number
        }
        Update: {
          day?: string
          media_count?: number
          text_count?: number
          user_id?: string
          voice_count?: number
        }
        Relationships: []
      }
      user_context: {
        Row: {
          approved_contacts: Json
          business_context: string | null
          created_at: string
          facts: Json
          preferred_language: string | null
          role: string | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_contacts?: Json
          business_context?: string | null
          created_at?: string
          facts?: Json
          preferred_language?: string | null
          role?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_contacts?: Json
          business_context?: string | null
          created_at?: string
          facts?: Json
          preferred_language?: string | null
          role?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          access_token_enc: string | null
          account_email: string | null
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          refresh_token_enc: string | null
          scopes: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_enc?: string | null
          account_email?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token_enc?: string | null
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_enc?: string | null
          account_email?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token_enc?: string | null
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          event_id: string | null
          event_type: string | null
          id: string
          payload: Json | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          source: string
          status: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          source?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_openrouter_spend: {
        Args: {
          _completion_tokens: number
          _cost: number
          _model: string
          _prompt_tokens: number
        }
        Returns: number
      }
      bump_usage: {
        Args: { _kind: string; _n?: number }
        Returns: {
          day: string
          media_count: number
          text_count: number
          user_id: string
          voice_count: number
        }
        SetofOptions: {
          from: "*"
          to: "usage_daily"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_and_bump_usage: {
        Args: { _kind: string; _limit?: number; _n?: number }
        Returns: boolean
      }
      get_openrouter_spend_month: { Args: never; Returns: number }
      start_language_trial: { Args: never; Returns: string }
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
