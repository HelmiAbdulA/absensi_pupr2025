import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Table2,
  PieChart,
  History,
  Settings,
} from "lucide-react";

export const DUMMY_ADMIN = {
  email: 'admin@pupr.go.id',
  password: 'PUPRadmin!2025',
  name: 'Admin PUPR',
  role: 'superadmin' as const,
}

export const NAV_ITEMS = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Pegawai", href: "/pegawai", icon: Users },
  { title: "Presensi", href: "/presensi", icon: ClipboardList },
  { title: "Laporan", href: "/laporan", icon: PieChart },
  { title: "Log Aktivitas", href: "/log", icon: History },
  { title: "Pengaturan", href: "/settings", icon: Settings },
];
// variable
export const UNITS = [
  'Sekretariat',
  'Bid. Bina Marga',
  'Bid. Penataan Ruang',
  'Bid. SDA',
  'Bid. Bangunan',
  'Bid. Jasa Konstruksi',
  'Bid. AMPIP',
  'UPT. Kecamatan',
]