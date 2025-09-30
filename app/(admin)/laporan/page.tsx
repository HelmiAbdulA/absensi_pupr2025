'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, FileDown, Printer, Search, Eye } from 'lucide-react'
import {
  PieChart as RePieChart, Pie, Cell,
  BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

import { supabase } from '@/lib/supabaseClient'
import type { StatusKehadiran } from '@/types'

// =================== Types/Consts ===================
type Status = StatusKehadiran // 'HADIR'|'IZIN'|'SAKIT'|'DL'|'TK'

type EntryRow = {
  id: string
  tanggal: string      // YYYY-MM-DD (from session)
  jam_mulai: string    // HH:mm:ss
  unit: string         // units.name
  nama: string         // employees.nama
  nip: string          // employees.nip
  status: Status       // attendance_entries.status
  deskripsi: string    // session.deskripsi
  session_id: string   // ID dari sesi presensi
}

const COLORS = ['#0E5AAE', '#F4C542', '#10B981', '#6366F1', '#EF4444'] // HADIR, IZIN, SAKIT, DL, TK

// util kecil
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

// ====================================================
export default function LaporanPage() {
  // periode & filter
  const [range, setRange] = useState<'custom'>('custom')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [unit, setUnit] = useState('Semua Unit')
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')

  // data
  const [rows, setRows] = useState<EntryRow[]>([])
  const [units, setUnits] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // kontrol tampilan data
  const [showData, setShowData] = useState(false)
  const [hasTriggeredFetch, setHasTriggeredFetch] = useState(false)

  // helper validasi UI
  const isCustom = range === 'custom'
  const isCustomValid = !isCustom || (dateFrom && dateTo && dateFrom <= dateTo)
  const canShowData = isCustomValid && !loading

  // hitung range tanggal
  function computeDateRange() {
    return { from: dateFrom || '1970-01-01', to: dateTo || '2999-12-31' }
  }
  const { from, to } = computeDateRange()

  // =============== debounce input pencarian ===============
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  // =============== load units (dropdown) ===============
  useEffect(() => {
    let alive = true
    supabase
      .from('units')
      .select('name')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) {
          setErr(error.message)
          return
        }
        setUnits((data || []).map(d => d.name))
      })
    return () => { alive = false }
  }, [])

  // =============== fetch entries berdasarkan date range ===============
  useEffect(() => {
    if (!hasTriggeredFetch) return
    let alive = true

    async function fetchData() {
      setLoading(true); setErr(null)

      const { data, error } = await supabase
        .from('attendance_entries')
        .select(`
          id,
          status,
          session:attendance_sessions!inner ( id, tanggal, jam_mulai, deskripsi ),
          employee:employees!inner ( nama, nip, unit:unit_id ( name ) )
        `)
        .gte('attendance_sessions.tanggal', from)
        .lte('attendance_sessions.tanggal', to)
        .order('id', { ascending: false })

      if (!alive) return

      if (error) {
        setErr(error.message); setLoading(false); return
      }

      const flat: EntryRow[] = (data || []).map((r: any) => ({
        id: r.id,
        status: r.status as Status,
        tanggal: r.session?.tanggal || '',
        jam_mulai: r.session?.jam_mulai || '',
        deskripsi: r.session?.deskripsi || '',
        nama: r.employee?.nama || '-',
        nip: r.employee?.nip || '-',
        unit: r.employee?.unit?.name || '-',
        session_id: r.session?.id || '',
      }))

      setRows(flat)
      setLoading(false)
      setShowData(true)
    }

    fetchData()
    return () => { alive = false }
  }, [from, to, hasTriggeredFetch])

  // handler tombol tampilkan data
  const handleShowData = () => {
    setHasTriggeredFetch(true)
  }

  // handler reset filter
  const handleResetFilter = () => {
    setRange('custom')
    setDateFrom('')
    setDateTo('')
    setUnit('Semua Unit')
    setQ('')
    setQDebounced('')
    setShowData(false)
    setHasTriggeredFetch(false)
    setRows([])
    setErr(null)
    setPage(1)
  }

  // =============== filter client-side tambahan ===============
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (unit !== 'Semua Unit' && r.unit !== unit) return false
      if (qDebounced) {
        const text = `${r.nama} ${r.nip} ${r.unit} ${r.deskripsi}`.toLowerCase()
        if (!text.includes(qDebounced.toLowerCase())) return false
      }
      return true
    })
  }, [rows, unit, qDebounced])
  
  // =============== [PERBAIKAN LOGIKA FINAL] agregasi ===============
  
  const totalHariInRange = useMemo(() => {
    const uniqueDates = new Set(rows.map(r => r.tanggal));
    return uniqueDates.size;
  }, [rows]);

  const byPerson = useMemo(() => {
    // Peta untuk menyimpan status final per orang per hari
    // key: nip|tanggal, value: status
    const dailyFinalStatus = new Map<string, Status>();
    const statusPriority: Record<Status, number> = { 'TK': 5, 'SAKIT': 4, 'IZIN': 3, 'DL': 2, 'HADIR': 1 };

    filtered.forEach(r => {
      const key = `${r.nip}|${r.tanggal}`;
      const currentStatus = dailyFinalStatus.get(key);
      // Jika belum ada status untuk hari itu, atau status baru lebih "penting" (nilainya lebih tinggi)
      if (!currentStatus || statusPriority[r.status] > statusPriority[currentStatus]) {
        dailyFinalStatus.set(key, r.status);
      }
    });

    // Peta untuk agregasi final
    const map: Record<string, { nama: string; nip: string; unit: string; hadir: number; izin: number; sakit: number; dl: number; tk: number }> = {};

    dailyFinalStatus.forEach((status, key) => {
      const [nip, tanggal] = key.split('|');
      const originalEntry = filtered.find(r => r.nip === nip); // Ambil data statis (nama, unit)
      if (!originalEntry) return;

      if (!map[nip]) {
        map[nip] = { nama: originalEntry.nama, nip: originalEntry.nip, unit: originalEntry.unit, hadir: 0, izin: 0, sakit: 0, dl: 0, tk: 0 };
      }
      
      if (status === 'HADIR') map[nip].hadir++;
      if (status === 'IZIN')  map[nip].izin++;
      if (status === 'SAKIT') map[nip].sakit++;
      if (status === 'DL')    map[nip].dl++;
      if (status === 'TK')    map[nip].tk++;
    });
    
    const personRows = Object.values(map).map((p) => ({
      ...p,
      total: totalHariInRange,
      persenHadir: totalHariInRange > 0 ? Math.round((p.hadir / totalHariInRange) * 100) : 0,
    }));

    return personRows.sort((a,b) => b.persenHadir - a.persenHadir);
  }, [filtered, totalHariInRange]);


  // Agregasi untuk Pie Chart dan Bar Chart juga harus mengikuti logika "satu status per hari per orang"
  const dist = useMemo(() => {
    const dailyFinalStatus = new Map<string, Status>();
    const statusPriority: Record<Status, number> = { 'TK': 5, 'SAKIT': 4, 'IZIN': 3, 'DL': 2, 'HADIR': 1 };

    filtered.forEach(r => {
      const key = `${r.nip}|${r.tanggal}`;
      const currentStatus = dailyFinalStatus.get(key);
      if (!currentStatus || statusPriority[r.status] > statusPriority[currentStatus]) {
        dailyFinalStatus.set(key, r.status);
      }
    });

    const base: Record<Status, number> = { HADIR: 0, IZIN: 0, SAKIT: 0, DL: 0, TK: 0 };
    dailyFinalStatus.forEach(status => {
      base[status]++;
    });

    const total = dailyFinalStatus.size || 1;
    const pct = {
      HADIR: Math.round((base.HADIR / total) * 100),
      IZIN: Math.round((base.IZIN / total) * 100),
      SAKIT: Math.round((base.SAKIT / total) * 100),
      DL: Math.round((base.DL / total) * 100),
      TK: Math.round((base.TK / total) * 100),
    }
    return { base, pct };
  }, [filtered]);

  const pieData = useMemo(() => ([
    { name: 'Hadir', value: dist.base.HADIR },
    { name: 'Izin',  value: dist.base.IZIN  },
    { name: 'Sakit', value: dist.base.SAKIT },
    { name: 'DL',    value: dist.base.DL    },
    { name: 'TK',    value: dist.base.TK    },
  ]), [dist])

  const byUnit = useMemo(() => {
    const dailyFinalStatus = new Map<string, {status: Status, unit: string}>();
    const statusPriority: Record<Status, number> = { 'TK': 5, 'SAKIT': 4, 'IZIN': 3, 'DL': 2, 'HADIR': 1 };

    filtered.forEach(r => {
      const key = `${r.nip}|${r.tanggal}`;
      const current = dailyFinalStatus.get(key);
      if (!current || statusPriority[r.status] > statusPriority[current.status]) {
        dailyFinalStatus.set(key, { status: r.status, unit: r.unit });
      }
    });

    const map: Record<string, { unit: string; HADIR: number; IZIN: number; SAKIT: number; DL: number; TK: number }> = {}
    dailyFinalStatus.forEach(({status, unit}) => {
      if (!map[unit]) map[unit] = { unit: unit, HADIR: 0, IZIN: 0, SAKIT: 0, DL: 0, TK: 0 }
      map[unit][status]++;
    });

    return Object.values(map).sort((a, b) => a.unit.localeCompare(b.unit));
  }, [filtered])

  // =============== pagination untuk tabel per pegawai ===============
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(byPerson.length / pageSize)), [byPerson.length, pageSize])
  useEffect(() => {
    setPage(1)
  }, [unit, qDebounced, pageSize, from, to, showData])

  const pageStart = (page - 1) * pageSize
  const pageEnd = Math.min(page * pageSize, byPerson.length)
  const byPersonPage = useMemo(() => byPerson.slice(pageStart, pageEnd), [byPerson, pageStart, pageEnd])

  // =============== export CSV ===============
  function exportCSVPersons() {
    const header = ['Nama','NIP','Unit','Total Hari','Hadir','Izin','Sakit','DL','TK','% Hadir']
    const items = byPerson.map(p => [p.nama, p.nip, p.unit, p.total, p.hadir, p.izin, p.sakit, p.dl, p.tk, p.persenHadir])
    const csv = [header, ...items].map(r => r.join(',')).join('\n')
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
    const items = byUnit.map(u => [u.unit, u.HADIR, u.IZIN, u.SAKIT, u.DL, u.TK])
    const csv = [header, ...items].map(r => r.join(',')).join('\n')
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

  // =============== UI ===============
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Laporan</h1>
          <p className="text-sm text-slate-500">Rekap persentase harian, mingguan, bulanan, atau rentang kustom.</p>
        </div>
        {showData && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSVUnits}><Download className="h-4 w-4 mr-1"/> Ekspor Per Unit</Button>
            <Button variant="outline" size="sm" onClick={exportCSVPersons}><FileDown className="h-4 w-4 mr-1"/> Ekspor Per Pegawai</Button>
            <Button variant="outline" size="sm" onClick={printReport}><Printer className="h-4 w-4 mr-1"/> Cetak</Button>
          </div>
        )}
      </div>

      {/* Error state */}
      {err && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Terjadi kesalahan saat memuat data: <span className="font-medium">{err}</span>
        </div>
      )}

      {/* Kartu Filter */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Filter</CardTitle>

            <div className="flex items-center gap-2">
              {showData && (
                <Button variant="outline" size="sm" onClick={handleResetFilter}>
                  Reset Filter
                </Button>
              )}
              {!showData && (
                <Button
                  onClick={handleShowData}
                  disabled={!canShowData}
                  className="px-6"
                  title={!isCustomValid ? 'Isi tanggal dulu (Dari & Sampai) dan pastikan benar' : undefined}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {loading ? 'Memuat...' : 'Tampilkan Data'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">

            {/* Dari */}
            <div className={isCustom ? '' : 'opacity-60 pointer-events-none'}>
              <Label className="text-xs text-slate-500 flex items-center justify-between">
                <span>Dari</span>
                {isCustom && !dateFrom && (
                  <span className="text-[10px] text-rose-600">wajib</span>
                )}
              </Label>
              <Input
                type="date"
                className="mt-1"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-invalid={Boolean(isCustom && !dateFrom)}
              />
              {isCustom && !dateFrom && (
                <p className="mt-1 text-[11px] text-rose-600">Isi tanggal mulai.</p>
              )}
            </div>

            {/* Sampai */}
            <div className={isCustom ? '' : 'opacity-60 pointer-events-none'}>
              <Label className="text-xs text-slate-500 flex items-center justify-between">
                <span>Sampai</span>
                {isCustom && !dateTo && (
                  <span className="text-[10px] text-rose-600">wajib</span>
                )}
              </Label>
              <Input
                type="date"
                className="mt-1"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-invalid={Boolean(isCustom && (!dateTo || (dateFrom && dateTo < dateFrom)))}
              />
              {isCustom && dateFrom && dateTo && dateTo < dateFrom && (
                <p className="mt-1 text-[11px] text-rose-600">Tanggal “Sampai” tidak boleh lebih awal dari “Dari”.</p>
              )}
              {isCustom && !dateTo && (
                <p className="mt-1 text-[11px] text-rose-600">Isi tanggal akhir.</p>
              )}
            </div>

            {/* Unit */}
            <div>
              <Label className="text-xs text-slate-500">Unit</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Unit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Unit">Semua Unit</SelectItem>
                  {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Pencarian */}
            <div className="xl:col-span-2">
              <Label className="text-xs text-slate-500">Pencarian</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-8"
                  placeholder="Cari nama / NIP / unit / deskripsi"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Info kecil di bawah filter saat custom */}
          {isCustom && (
            <div className="mt-2 text-[11px] text-slate-500">
              Isi tanggal <span className="font-medium">Dari</span> dan <span className="font-medium">Sampai</span> lalu klik <span className="font-medium">Tampilkan Data</span>.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info periode setelah data tampil */}
      {showData && (
        <div className="mt-0 p-3 bg-blue-50 rounded-md border">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-blue-700">
              <span className="font-medium">Periode:</span> {from} s/d {to}
              {unit !== 'Semua Unit' && <span className="ml-2">• <span className="font-medium">Unit:</span> {unit}</span>}
              {qDebounced && <span className="ml-2">• <span className="font-medium">Filter:</span> “{qDebounced}”</span>}
            </div>
            <div className="text-sm text-blue-600">Total: {byPerson.length} pegawai dalam {totalHariInRange} hari kerja</div>
          </div>
        </div>
      )}

      {/* Hanya tampilkan data jika showData true */}
      {showData && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-base">Distribusi Status Harian</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                    <Pie dataKey="value" data={pieData} outerRadius={100} label>
                      {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
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
              <CardHeader className="pb-2"><CardTitle className="text-base">Rekap Harian Per Unit</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={byUnit}>
                    <XAxis dataKey="unit" interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="HADIR" fill={COLORS[0]} radius={[6,6,0,0]} />
                    <Bar dataKey="IZIN"  fill={COLORS[1]} radius={[6,6,0,0]} />
                    <Bar dataKey="SAKIT" fill={COLORS[2]} radius={[6,6,0,0]} />
                    <Bar dataKey="DL"    fill={COLORS[3]} radius={[6,6,0,0]} />
                    <Bar dataKey="TK"    fill={COLORS[4]} radius={[6,6,0,0]} />
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
              {/* Controls: page size & info */}
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600">
                <div>
                  {byPerson.length > 0 ? (
                    <>Menampilkan <b>{pageStart + 1}</b>–<b>{pageEnd}</b> dari <b>{byPerson.length}</b> pegawai</>
                  ) : 'Tidak ada data.'}
                </div>
                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <select
                    className="h-8 rounded-md border px-2 text-sm"
                    value={String(pageSize)}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <div className="ml-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                    >
                      {'<<'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => clamp(p - 1, 1, totalPages))}
                      disabled={page === 1}
                    >
                      {'<'}
                    </Button>
                    <span className="px-1">Hal {page} / {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => clamp(p + 1, 1, totalPages))}
                      disabled={page === totalPages}
                    >
                      {'>'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                    >
                      {'>>'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>NIP</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Total Hari</TableHead>
                      <TableHead>Hadir</TableHead>
                      <TableHead>Izin</TableHead>
                      <TableHead>Sakit</TableHead>
                      <TableHead>DL</TableHead>
                      <TableHead>TK</TableHead>
                      <TableHead>% Hadir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-sm text-slate-500 py-10">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full"></div>
                            Memuat data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : byPersonPage.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-sm text-slate-500 py-10">Tidak ada data pada periode ini.</TableCell>
                      </TableRow>
                    ) : (
                      byPersonPage.map((p) => (
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state ketika belum ada data */}
      {!showData && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <Eye className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Belum Ada Data Ditampilkan</h3>
              <p className="text-slate-500 mb-4">
                Pilih periode dan filter yang diinginkan, lalu klik <span className="font-medium">“Tampilkan Data”</span>.
                Untuk <span className="font-medium">Custom</span>, isi tanggal <em>Dari</em> dan <em>Sampai</em>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}