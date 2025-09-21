import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin Supabase (server only, bypass RLS, HANYA untuk API routes / server actions)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
