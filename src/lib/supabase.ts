import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  // Client-side environment variables or server process variables
  const supabaseUrl = 
    (typeof process !== 'undefined' && (process.env.ERA_SUPABASE_URL || process.env.VITE_ERA_SUPABASE_URL)) ||
    (import.meta as any).env?.VITE_ERA_SUPABASE_URL ||
    'https://baveqvslzycurtrztdza.supabase.co';

  const supabaseAnonKey = 
    (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_ERA_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ERA_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_ERA_SUPABASE_ANON_KEY)) ||
    (import.meta as any).env?.VITE_ERA_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdmVxdnNsenljdXJ0cnp0ZHphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwOTM1NjcsImV4cCI6MjEwMTY2OTU2N30.sJsRfBxyf0J5aSoKgQqEErH_S-hVwijaph6FMEmBDk4';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials are missing');
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }

  return supabaseClient;
}
