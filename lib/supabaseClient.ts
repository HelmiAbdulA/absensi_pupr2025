"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client Supabase (browser, pakai anon key, tunduk ke RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
