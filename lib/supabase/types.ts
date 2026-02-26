export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string;
          passcode: string;
          status: "collecting" | "ready" | "closed";
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          passcode: string;
          status?: "collecting" | "ready" | "closed";
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          passcode?: string;
          status?: "collecting" | "ready" | "closed";
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          selected_area: string | null;
          selected_purpose: string | null;
          selected_value: string | null;
          is_ready: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          selected_area?: string | null;
          selected_purpose?: string | null;
          selected_value?: string | null;
          is_ready?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          selected_area?: string | null;
          selected_purpose?: string | null;
          selected_value?: string | null;
          is_ready?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_group_with_unique_passcode: {
        Args: Record<PropertyKey, never>;
        Returns: {
          group_id: string;
          passcode: string;
        }[];
      };
      find_group_by_passcode: {
        Args: {
          input_passcode: string;
        };
        Returns: {
          group_id: string;
          passcode: string;
          status: string;
          created_at: string;
        }[];
      };
      join_group_by_passcode: {
        Args: {
          input_passcode: string;
        };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
