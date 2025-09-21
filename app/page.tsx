"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let unsub = () => {};

    (async () => {
      // cek session saat mount
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }

      // dengarkan perubahan auth (mis. setelah login/logout)
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) router.replace("/dashboard");
        else router.replace("/login");
      });
      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => unsub();
  }, [router]);

  return null;
}
