import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Client sem tipagem para tabelas não geradas (ex: work_order_activities)
const supabaseUntyped = createClient(supabaseUrl, supabaseAnonKey);

export { supabase, supabaseUntyped };
