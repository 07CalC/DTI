
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "booking_events": {
                  Row: {
                    "action_source": Database["public"]['Enums']["booking_action_source"],"actor_profile_id": string | null,"booking_id": string,"created_at": string,"id": number,"new_status": Database["public"]['Enums']["booking_status"],"previous_status": Database["public"]['Enums']["booking_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action_source": Database["public"]['Enums']["booking_action_source"],"actor_profile_id"?: string | null,"booking_id": string,"created_at"?: string,"id"?: never,"new_status": Database["public"]['Enums']["booking_status"],"previous_status"?: Database["public"]['Enums']["booking_status"] | null
                  }
                  Update: {
                    "action_source"?: Database["public"]['Enums']["booking_action_source"],"actor_profile_id"?: string | null,"booking_id"?: string,"created_at"?: string,"id"?: never,"new_status"?: Database["public"]['Enums']["booking_status"],"previous_status"?: Database["public"]['Enums']["booking_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_events_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booking_events_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "meal_bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"booking_tokens": {
                  Row: {
                    "booking_id": string,"created_at": string,"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"created_at"?: string,"token"?: string
                  }
                  Update: {
                    "booking_id"?: string,"created_at"?: string,"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_tokens_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "meal_bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"meal_bookings": {
                  Row: {
                    "consumed_at": string | null,"created_at": string,"id": string,"initial_status": Database["public"]['Enums']["booking_status"],"meal_id": string,"status": Database["public"]['Enums']["booking_status"],"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consumed_at"?: string | null,"created_at"?: string,"id"?: string,"initial_status": Database["public"]['Enums']["booking_status"],"meal_id": string,"status": Database["public"]['Enums']["booking_status"],"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "consumed_at"?: string | null,"created_at"?: string,"id"?: string,"initial_status"?: Database["public"]['Enums']["booking_status"],"meal_id"?: string,"status"?: Database["public"]['Enums']["booking_status"],"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_bookings_meal_id_fkey"
      columns: ["meal_id"]
isOneToOne: false
      referencedRelation: "meals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_bookings_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"meal_scans": {
                  Row: {
                    "booking_id": string,"id": string,"scanned_at": string,"scanned_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"id"?: string,"scanned_at"?: string,"scanned_by"?: string | null
                  }
                  Update: {
                    "booking_id"?: string,"id"?: string,"scanned_at"?: string,"scanned_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_scans_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "meal_bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_scans_scanned_by_fkey"
      columns: ["scanned_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"meals": {
                  Row: {
                    "booking_cutoff_at": string,"category": Database["public"]['Enums']["meal_category"],"created_at": string,"created_by": string | null,"description": string | null,"end_time": string,"id": string,"meal_date": string,"mess_id": string,"start_time": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_cutoff_at": string,"category": Database["public"]['Enums']["meal_category"],"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"end_time": string,"id"?: string,"meal_date": string,"mess_id": string,"start_time": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "booking_cutoff_at"?: string,"category"?: Database["public"]['Enums']["meal_category"],"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"end_time"?: string,"id"?: string,"meal_date"?: string,"mess_id"?: string,"start_time"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meals_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meals_mess_id_fkey"
      columns: ["mess_id"]
isOneToOne: false
      referencedRelation: "messes"
      referencedColumns: ["id"]
    }
                  ]
                },"menu_items": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"meal_id": string,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"meal_id": string,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"meal_id"?: string,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "menu_items_meal_id_fkey"
      columns: ["meal_id"]
isOneToOne: false
      referencedRelation: "meals"
      referencedColumns: ["id"]
    }
                  ]
                },"messes": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "auth_user_id": string | null,"created_at": string,"email": string,"id": string,"is_active": boolean,"name": string,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_user_id"?: string | null,"created_at"?: string,"email": string,"id"?: string,"is_active"?: boolean,"name": string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "auth_user_id"?: string | null,"created_at"?: string,"email"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"staff_assignments": {
                  Row: {
                    "created_at": string,"id": string,"mess_id": string,"staff_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"mess_id": string,"staff_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"mess_id"?: string,"staff_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_assignments_mess_id_fkey"
      columns: ["mess_id"]
isOneToOne: false
      referencedRelation: "messes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_assignments_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"students": {
                  Row: {
                    "created_at": string,"default_booking_preference": Database["public"]['Enums']["booking_status"],"id": string,"mess_id": string,"profile_id": string,"roll_number": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"default_booking_preference"?: Database["public"]['Enums']["booking_status"],"id"?: string,"mess_id": string,"profile_id": string,"roll_number": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"default_booking_preference"?: Database["public"]['Enums']["booking_status"],"id"?: string,"mess_id"?: string,"profile_id"?: string,"roll_number"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "students_mess_id_fkey"
      columns: ["mess_id"]
isOneToOne: false
      referencedRelation: "messes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_consume_booking":
{ Args: { "p_actor": string,"p_booking_id": string }; Returns: Json
                           },
"admin_bulk_import_students":
{ Args: { "p_records": Json }; Returns: Json
                           },
"admin_create_staff":
{ Args: { "p_email": string,"p_mess_ids"?: (string)[],"p_name": string }; Returns: Json
                           },
"admin_create_student":
{ Args: { "p_email": string,"p_is_active"?: boolean,"p_mess_id": string,"p_name": string,"p_preference"?: Database["public"]['Enums']["booking_status"],"p_roll_number": string }; Returns: Json
                           },
"admin_report":
{ Args: { "p_category"?: Database["public"]['Enums']["meal_category"],"p_from"?: string,"p_mess_id"?: string,"p_student_id"?: string,"p_to"?: string }; Returns: {
              "booking_id": string,"consumed_at": string,"events": Json,"initial_status": Database["public"]['Enums']["booking_status"],"meal_category": Database["public"]['Enums']["meal_category"],"meal_date": string,"meal_id": string,"meal_title": string,"menu": string,"mess_id": string,"mess_name": string,"opt_in_at": string,"opt_out_at": string,"roll_number": string,"scanned_at": string,"status": Database["public"]['Enums']["booking_status"],"student_id": string,"student_name": string
            }[]
                           },
"admin_update_staff":
{ Args: { "p_is_active": boolean,"p_mess_ids"?: (string)[],"p_name": string,"p_profile_id": string }; Returns: Json
                           },
"admin_update_student":
{ Args: { "p_email": string,"p_is_active": boolean,"p_mess_id": string,"p_name": string,"p_preference": Database["public"]['Enums']["booking_status"],"p_roll_number": string,"p_student_id": string }; Returns: Json
                           },
"can_read_mess":
{ Args: { "p_mess_id": string }; Returns: boolean
                           },
"current_profile_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_user_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"generate_bookings_for_meal":
{ Args: { "p_meal_id": string }; Returns: number
                           },
"generate_bookings_for_student":
{ Args: { "p_student_id": string }; Returns: number
                           },
"get_my_context":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_my_meal_pass":
{ Args: { "p_booking_id": string }; Returns: Json
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff_for":
{ Args: { "p_mess_id": string }; Returns: boolean
                           },
"my_student_mess_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"scan_booking":
{ Args: { "p_token": string }; Returns: Json
                           },
"scan_booking_manual":
{ Args: { "p_meal_id": string,"p_roll_number": string }; Returns: Json
                           },
"set_my_booking_status":
{ Args: { "p_meal_id": string,"p_status": Database["public"]['Enums']["booking_status"] }; Returns: Json
                           },
"update_my_preference":
{ Args: { "p_preference": Database["public"]['Enums']["booking_status"] }; Returns: Json
                           }
          }
          Enums: {
            "booking_action_source": "student"|"system"|"staff"|"admin","booking_status": "opted_in"|"opted_out","meal_category": "breakfast"|"lunch"|"snacks"|"dinner","user_role": "student"|"staff"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "booking_action_source": ["student", "system", "staff", "admin"],"booking_status": ["opted_in", "opted_out"],"meal_category": ["breakfast", "lunch", "snacks", "dinner"],"user_role": ["student", "staff", "admin"]
          }
        }
} as const
