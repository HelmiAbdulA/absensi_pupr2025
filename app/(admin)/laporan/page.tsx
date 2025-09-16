'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, FileDown, Printer, Search } from 'lucide-react'
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const UNITS = [
  'Sekretariat',
  'Bid. Bina Marga',
  'Bid. Penataan Ruang',
  'Bid. SDA',
  'Bid. Bangunan',
  'Bid. Jasa Konstruksi',
  'Bid. AMPIP',
  'UPT. Kecamatan',
]

type Status = 'HADIR' | 'IZIN' | 'SAKIT' | 'DL' | 'TK'

type Row = {
  id: string
  tanggal: string // yyyy-mm-dd
  jam: string // HH:mm
  unit: string
  nama: string
  nip: string
  status: Status
  deskripsi: string
}

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function makeDummy(n = 360): Row[] {
  const names = ['Budi','Siti','Andi','Rina','Tono','Dewi','Joko','Wati','Rudi','Lina','Farhan','Nadia','Asep','Yuni','Yoga']
  const statuses: Status[] = ['HADIR','IZIN','SAKIT','DL','TK']
  const out: Row[] = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - Math.floor(Math.random() * 35))
    const tanggal = d.toISOString().slice(0,10)
    const jam = `${String(8 + (i % 9)).padStart(2,'0')}:${String(i % 60).padStart(2,'0')}`
    out.push({
      id: `LP-${i+1}`,
      tanggal,
      jam,
      unit: rand(UNITS),
      nama: rand(names) + (i % 8 === 0 ? ' ' + (i+1) : ''),
      nip: `1979${String(1000 + i)}`,
      status: rand(statuses),
      deskripsi: i % 3 === 0 ? 'Rapat Koordinasi' : 'Kegiatan rutin',
    })
  }
  return out
}

const ALL = makeDummy()
const COLORS = ['#0E5AAE', '#F4C542', '#10B981', '#6366F1', '#EF4444'] // HADIR, IZIN, SAKIT, DL, TK

export default function LaporanPage() {
  const [range, setRange] = useState<'hari' | 'minggu' | 'bulan' | 'custom'>('hari')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [unit, setUnit] = useState('Semua Unit')
  const [q, setQ] = useState('')

  function computeDateRange() {
    const now = new Date()
    if (range === 'hari') {
      const d = now.toISOString().slice(0,10)
      return { from: d, to: d }
    }
    if (range === 'minggu') {
      const to = now.toISOString().slice(0,10)
      const past = new Date(now)
      past.setDate(now.getDate() - 6)
      const from = past.toISOString().slice(0,10)
      return { from, to }
    }
    if (range === 'bulan') {
      const to = now.toISOString().slice(0,10)
      const past = new Date(now)
      past.setDate(now.getDate() - 29)
      const from = past.toISOString().slice(0,10)
      return { from, to }
    }
    return { from: dateFrom || '1970-01-01', to: dateTo || '2999-12-31' }
  }

  const { from, to } = computeDateRange()

  const filtered = useMemo(() => {
    return ALL.filter((r) => {
      if (unit !== 'Semua Unit' && r.unit !== unit) return false
      if (r.tanggal < from || r.tanggal > to) return false
      if (q) {
        const text = `${r.nama} ${r.nip} ${r.unit} ${r.deskripsi}`.toLowerCase()
        if (!text.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [unit, from, to, q])

  const dist = useMemo(() => {
    const base: Record<Status, number> = { HADIR: 0, IZIN: 0, SAKIT: 0, DL: 0, TK: 0 }
    filtered.forEach((r) => { base[r.status] += 1 })
    const total = filtered.length || 1
    const pct = {
      HADIR: Math.round((base.HADIR / total) * 100),
      IZIN: Math.round((base.IZIN / total) * 100),
      SAKIT: Math.round((base.SAKIT / total) * 100),
      DL: Math.round((base.DL / total) * 100),
      TK: Math.round((base.TK / total) * 100),
    }
    return { base, pct }
  }, [filtered])

  const pieData = useMemo(() => ([
    { name: 'Hadir', value: dist.base.HADIR },
    { name: 'Izin', value: dist.base.IZIN },
    { name: 'Sakit', value: dist.base.SAKIT },
    { name: 'DL', value: dist.base.DL },
    { name: 'TK', value: dist.base.TK },
  ]), [dist])

  const byUnit = useMemo(() => {
    const map: Record<string, { unit: string; HADIR: number; IZIN: number; SAKIT: number; DL: number; TK: number }> = {}
    filtered.forEach((r) => {
      if (!map[r.unit]) map[r.unit] = { unit: r.unit, HADIR: 0, IZIN: 0, SAKIT: 0, DL: 0, TK: 0 }
      map[r.unit][r.status] += 1
    })
    return Object.values(map)
  }, [filtered])

  const byPerson = useMemo(() => {
    const map: Record<string, { nama: string; nip: string; unit: string; total: number; hadir: number; izin: number; sakit: number; dl: number; tk: number }> = {}
    filtered.forEach((r) => {
      const key = r.nip
      if (!map[key]) map[key] = { nama: r.nama, nip: r.nip, unit: r.unit, total: 0, hadir: 0, izin: 0, sakit: 0, dl: 0, tk: 0 }
      map[key].total++
      if (r.status === 'HADIR') map[key].hadir++
      if (r.status === 'IZIN') map[key].izin++
      if (r.status === 'SAKIT') map[key].sakit++
      if (r.status === 'DL') map[key].dl++
      if (r.status === 'TK') map[key].tk++
    })
    const rows = Object.values(map).map((p) => ({
      ...p,
      persenHadir: p.total ? Math.round((p.hadir / p.total) * 100) : 0,
    }))
    return rows.sort((a,b) => b.persenHadir - a.persenHadir)
  }, [filtered])

  function exportCSVPersons() {
    const header = ['Nama','NIP','Unit','Total','Hadir','Izin','Sakit','DL','TK','% Hadir']
    const rows = byPerson.map(p => [p.nama, p.nip, p.unit, p.total, p.hadir, p.izin, p.sakit, p.dl, p.tk, p.persenHadir])
    const csv = [header, ...rows].map(r => r.join(',')).join('')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan_per_pegawai_${from}_sd_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCSVUnits() {
    const header = ['Unit','Hadir','Izin','Sakit','DL','TK']
    const rows = byUnit.map(u => [u.unit, u.HADIR, u.IZIN, u.SAKIT, u.DL, u.TK])
    const csv = [header, ...rows].map(r => r.join(',')).join('')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan_per_unit_${from}_sd_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printReport() {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Laporan</h1>
          <p className="text-sm text-slate-500">Rekap persentase harian, mingguan, bulanan, atau rentang kustom.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSVUnits}><Download className="h-4 w-4 mr-1"/> Ekspor Per Unit</Button>
          <Button variant="outline" onClick={exportCSVPersons}><FileDown className="h-4 w-4 mr-1"/> Ekspor Per Pegawai</Button>
          <Button variant="outline" onClick={printReport}><Printer className="h-4 w-4 mr-1"/> Cetak</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div>
              <Label className="text-xs text-slate-500">Periode</Label>
              <Select value={range} onValueChange={(v: 'hari'|'minggu'|'bulan'|'custom') => { setRange(v) }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hari">Hari ini</SelectItem>
                  <SelectItem value="minggu">7 hari terakhir</SelectItem>
                  <SelectItem value="bulan">30 hari terakhir</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={range === 'custom' ? '' : 'opacity-50 pointer-events-none'}>
              <Label className="text-xs text-slate-500">Dari</Label>
              <Input type="date" className="mt-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className={range === 'custom' ? '' : 'opacity-50 pointer-events-none'}>
              <Label className="text-xs text-slate-500">Sampai</Label>
              <Input type="date" className="mt-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Unit</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Unit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Unit">Semua Unit</SelectItem>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="xl:col-span-2">
              <Label className="text-xs text-slate-500">Pencarian</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input className="pl-8" placeholder="Cari nama / NIP / unit / deskripsi" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">Distribusi Status</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
                <Pie dataKey="value" data={pieData} outerRadius={100} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </RePieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-5 gap-2 mt-3 text-center">
              <div className="text-xs">Hadir<br/><span className="font-medium">{dist.pct.HADIR}%</span></div>
              <div className="text-xs">Izin<br/><span className="font-medium">{dist.pct.IZIN}%</span></div>
              <div className="text-xs">Sakit<br/><span className="font-medium">{dist.pct.SAKIT}%</span></div>
              <div className="text-xs">DL<br/><span className="font-medium">{dist.pct.DL}%</span></div>
              <div className="text-xs">TK<br/><span className="font-medium">{dist.pct.TK}%</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Rekap Per Unit</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={byUnit}>
                <XAxis dataKey="unit" interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="HADIR" fill={COLORS[0]} radius={[6,6,0,0]} />
                <Bar dataKey="IZIN" fill={COLORS[1]} radius={[6,6,0,0]} />
                <Bar dataKey="SAKIT" fill={COLORS[2]} radius={[6,6,0,0]} />
                <Bar dataKey="DL" fill={COLORS[3]} radius={[6,6,0,0]} />
                <Bar dataKey="TK" fill={COLORS[4]} radius={[6,6,0,0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Rekap Per Pegawai</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSVPersons}><Download className="h-4 w-4 mr-1"/> Ekspor CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Hadir</TableHead>
                  <TableHead>Izin</TableHead>
                  <TableHead>Sakit</TableHead>
                  <TableHead>DL</TableHead>
                  <TableHead>TK</TableHead>
                  <TableHead>% Hadir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPerson.map((p) => (
                  <TableRow key={p.nip}>
                    <TableCell className="whitespace-nowrap">{p.nama}</TableCell>
                    <TableCell>{p.nip}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.unit}</TableCell>
                    <TableCell>{p.total}</TableCell>
                    <TableCell>{p.hadir}</TableCell>
                    <TableCell>{p.izin}</TableCell>
                    <TableCell>{p.sakit}</TableCell>
                    <TableCell>{p.dl}</TableCell>
                    <TableCell>{p.tk}</TableCell>
                    <TableCell>
                      <Badge variant={p.persenHadir >= 80 ? 'secondary' : p.persenHadir >= 50 ? 'outline' : 'destructive'}>
                        {p.persenHadir}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {byPerson.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-sm text-slate-500 py-10">Tidak ada data pada periode ini.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
