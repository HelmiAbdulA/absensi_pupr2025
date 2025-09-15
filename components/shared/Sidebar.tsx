"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NAV_ITEMS } from "@/constants";


export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="bg-white">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="h-8 w-8 rounded-md bg-[#F4C542]" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">
              Presensi PUPR
            </p>
            <p className="text-xs text-slate-500">Admin Panel</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={!!active}>
                    <Link
                      href={item.href}
                      className={active ? "text-[#003A70]" : ""}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-2 text-xs text-slate-500">
          © {new Date().getFullYear()} PUPR
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
