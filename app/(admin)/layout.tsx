"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/Sidebar";
import { Input } from "@/components/ui/input";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const raw =
      typeof window !== "undefined"
        ? localStorage.getItem("pupr_admin_session")
        : null;
    if (!raw) {
      router.replace("/auth/login");
    }
  }, [router]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top bar sederhana */}
        <div className="sticky top-0 z-40 h-14 border-b bg-white/80 backdrop-blur flex justify-between items-center px-4">
          <p className="text-sm font-medium text-slate-700">
            Sistem Presensi PUPR
          </p>
          <div className="w-46 flex justify-end">
            <Input placeholder="search...."/>
          </div>
        </div>
        <main className="p-4 lg:p-6 bg-slate-50 min-h-[calc(100vh-56px)]">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
