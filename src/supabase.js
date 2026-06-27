import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://blwzdhanxpydodbbcrvp.supabase.co"
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsd3pkaGFueHB5ZG9kYmJjcnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODIxMTIsImV4cCI6MjA5ODA1ODExMn0.-imQ-iVvy54fYVBTe82Qi-hMtRyxjyeM6n8zCE-O7JQ"

export const supabase = createClient(supabaseUrl, supabaseKey)