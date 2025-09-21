import { cookies } from "next/headers";
import { createServerComponentClient, createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export function getServerClient() {
  return createServerComponentClient({ cookies });
}

export function getRouteClient() {
  return createRouteHandlerClient({ cookies });
}
