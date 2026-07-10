import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jmmlncqtukxvwicueahl.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbWxuY3F0dWt4dndpY3VlYWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTQyMjEsImV4cCI6MjA5OTI3MDIyMX0.7Y4ve4x4uN5hEnik75Uuq-0_aBWvyOrh622pvzW5Vx8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
