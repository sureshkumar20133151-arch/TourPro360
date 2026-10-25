import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ebjjrkefogdytnyaapbc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_GC7XDyM5tvEfc3wO2gXcJQ_kObRgQtx'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
