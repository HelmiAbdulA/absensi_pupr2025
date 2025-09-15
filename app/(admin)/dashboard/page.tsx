/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Plus, UserPlus, FileDown, Filter, RefreshCw } from 'lucide-react'
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { UNITS } from '@/constants'
import { Status, AttendanceRow } from '@/types'

// ------------------------------------------------------------
// DUMMY DATA UNTUK PROTOTIPE
// ------------------------------------------------------------


// generate 10 entri terbaru
function makeDummyAttendance(): AttendanceRow[] {
  const names = ['Budi', 'Siti', 'Andi', 'Rina', 'Tono', 'Dewi', 'Joko', 'Wati', 'Rudi', 'Lina']
  const statuses: Status[] = ['HADIR', 'IZIN', 'SAKIT', 'ALPHA']
  const rows: AttendanceRow[] = []
  for (let i = 0; i < 10; i++) {
    const day = new Date()
    day.setMinutes(day.getMinutes() - i * 17)
    rows.push({
      id: `row-${i}`,
      tanggal: day.toISOString().slice(0, 10),
      jam: day.toTimeString().slice(0, 5),
      unit: UNITS[i % UNITS.length],
      nama: names[i % names.length],
      nip: `19790${100 + i}`,
      status: statuses[(i * 3) % statuses.length],
      admin: 'Admin PUPR',
    })
  }
  return rows
}

const RECENT = makeDummyAttendance()

// rangkum status hari ini dari data dummy
function summarizeToday(rows: AttendanceRow[]) {
  const total = rows.length
  const count = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPHA: 0 } as Record<Status, number>
  rows.forEach((r) => (count[r.status] += 1))
  const hadir = count.HADIR
  const hadirPct = total ? Math.round((hadir / total) * 100) : 0
  return { total, hadir, hadirPct, count }
}

const COLORS = ['#0E5AAE', '#F4C542', '#9CA3AF', '#EF4444'] // biru, emas, abu, merah

// data tren 7 hari (dummy)
const TREND = Array.from({ length: 7 }).map((_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (6 - i))
  const label = d.toLocaleDateString('id-ID', { weekday: 'short' })
  const hadir = 40 + Math.floor(Math.random() * 20)
  return { day: label, hadir }
})

export default function DashboardPage() {
  const [unitFilter, setUnitFilter] = useState<string>('Semua Unit')
  const [statusFilter, setStatusFilter] = useState<string>('Semua Status')
  const [q, setQ] = useState('')

  const today = useMemo(() => summarizeToday(RECENT), [])

  const pieData = useMemo(
    () => [
      { name: 'Hadir', value: today.count.HADIR },
      { name: 'Izin', value: today.count.IZIN },
      { name: 'Sakit', value: today.count.SAKIT },
      { name: 'Alpha', value: today.count.ALPHA },
    ],
    [today]
  )

  const filtered = useMemo(() => {
    return RECENT.filter((r) => {
      if (unitFilter !== 'Semua Unit' && r.unit !== unitFilter) return false
      if (statusFilter !== 'Semua Status' && r.status !== statusFilter) return false
      if (q && !(`${r.nama} ${r.nip} ${r.unit}`.toLowerCase().includes(q.toLowerCase()))) return false
      return true
    })
  }, [unitFilter, statusFilter, q])

  return (
    <div className="space-y-6">
      {/* BAR ATAS: aksi cepat + filter ringkas */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button className="bg-[#003A70] hover:opacity-95">
            <Plus className="h-4 w-4 mr-1" /> Buat Presensi
          </Button>
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-1" /> Tambah Pegawai
          </Button>
          <Button variant="outline">
            <FileDown className="h-4 w-4 mr-1" /> Ekspor
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Cari nama / NIP / unit" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua Unit">Semua Unit</SelectItem>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua Status">Semua Status</SelectItem>
              <SelectItem value="HADIR">Hadir</SelectItem>
              <SelectItem value="IZIN">Izin</SelectItem>
              <SelectItem value="SAKIT">Sakit</SelectItem>
              <SelectItem value="ALPHA">Alpha</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KARTU RINGKASAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Total Pegawai Aktif</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">80</p>
            <p className="text-xs text-slate-500 mt-1">Data dummy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Sesi Hari Ini</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">3</p>
            <p className="text-xs text-slate-500 mt-1">Mulai 08.00, 13.00, 19.00</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Hadir Hari Ini</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{today.hadir}</p>
            <p className="text-xs text-slate-500 mt-1">Dari {today.total} entri</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Persentase Hadir</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{today.hadirPct}%</p>
            <Badge variant="secondary" className="mt-1">Hari ini</Badge>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">Distribusi Status Hari Ini</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Tooltip formatter={(v: any, n: any) => [`${v}`, n]} />
                <Pie dataKey="value" data={pieData} outerRadius={100} label>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Tren Hadir 7 Hari</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={TREND}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hadir" fill="#0E5AAE" radius={[6, 6, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* TABEL PRESENSI TERBARU */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Presensi Terbaru</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1"/> Unduh CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{r.tanggal}</TableCell>
                    <TableCell>{r.jam}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.unit}</TableCell>
                    <TableCell>{r.nama}</TableCell>
                    <TableCell>{r.nip}</TableCell>
                    <TableCell>
                      {r.status === 'HADIR' && <Badge className="bg-[#0E5AAE]">Hadir</Badge>}
                      {r.status === 'IZIN' && <Badge variant="secondary">Izin</Badge>}
                      {r.status === 'SAKIT' && <Badge variant="outline">Sakit</Badge>}
                      {r.status === 'ALPHA' && <Badge variant="destructive">Alpha</Badge>}
                    </TableCell>
                    <TableCell>{r.admin}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* LOG AKTIVITAS TERAKHIR */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Log Aktivitas Terakhir</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>09:15 Admin mengubah status Budi jadi Izin</li>
            <li>09:05 Admin menambah pegawai: Rina, NIP 1979002</li>
            <li>08:55 Admin membuat sesi presensi: Rapat Koordinasi</li>
            <li>08:40 Admin mengekspor laporan harian</li>
          </ul>
          <Separator className="my-3" />
          <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1"/> Lihat semua log</Button>
        </CardContent>
      </Card>
    </div>
  )
}
