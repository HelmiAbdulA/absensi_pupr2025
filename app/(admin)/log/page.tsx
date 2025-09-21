/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Eye, Download, Search } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

// ================= Types =================
type DbAction = 'CREATE_SESSION' | 'SET_STATUS' | 'EXPORT' | string

type LogRow = {
  id: string
  waktu: string   // ISO
  admin: string   // full_name atau '-'
  aksi: DbAction
  target: string  // target_id (ringkas)
  ringkas: string // dari meta/action
  lama?: Record<string, any> | null
  baru?: Record<string, any> | null
  raw?: any
}

// =============== Helpers ===============
function formatWaktu(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function actionBadge(a: DbAction) {
  const map: Record<string, { label: string; variant?: 'secondary'|'outline'|'destructive' }> = {
    CREATE_SESSION: { label: 'Buat Sesi', variant: 'secondary' },
    SET_STATUS:     { label: 'Ubah Presensi', variant: 'outline' },
    EXPORT:         { label: 'Ekspor', variant: 'outline' },
  }
  const cfg = map[a] ?? { label: a, variant: 'outline' }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

function ringkasFrom(action: DbAction, meta: any): string {
  if (action === 'CREATE_SESSION') {
    const tgl = meta?.tanggal ?? meta?.tgl ?? ''
    return `Buat sesi presensi ${tgl}`
  }
  if (action === 'SET_STATUS') {
    const s = meta?.status ?? meta?.sts ?? '-'
    const n = meta?.count ?? meta?.jumlah ?? ''
    return `Set status ${s}${n ? ` (${n} pegawai)` : ''}`
  }
  if (action === 'EXPORT') {
    const what = meta?.type ?? meta?.what ?? 'data'
    return `Ekspor ${what}`
  }
  // fallback
  return meta ? JSON.stringify(meta) : ''
}

// ================= Page =================
export default function LogPage() {
  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // filter state
  const [q, setQ] = useState('')
  const [aksi, setAksi] = useState<'Semua' | DbAction>('Semua')
  const [admin, setAdmin] = useState<'Semua' | string>('Semua')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // load from Supabase
  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true); setErr(null)

      // 1) ambil log mentah
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, at, actor_id, action, target_id, meta')
        .order('at', { ascending: false })
        .limit(2000) // batasi agar aman di client

      if (!alive) return
      if (error) { setErr(error.message); setLoading(false); return }

      const actorIds = Array.from(new Set((data || []).map(r => r.actor_id).filter(Boolean))) as string[]

      // 2) mapping actor_id -> full_name (admin_profiles)
      let nameMap = new Map<string, string>()
      if (actorIds.length) {
        const { data: admins } = await supabase
          .from('admin_profiles')
          .select('user_id, full_name')
          .in('user_id', actorIds)
        nameMap = new Map((admins || []).map(a => [a.user_id, a.full_name || 'Admin']))
      }

      // 3) transform ke bentuk UI
      const flat: LogRow[] = (data || []).map((r: any) => ({
        id: String(r.id),
        waktu: r.at,
        admin: nameMap.get(r.actor_id) || '-',
        aksi: r.action as DbAction,
        target: r.target_id ?? '-',
        ringkas: ringkasFrom(r.action, r.meta),
        lama: r.meta?.old ?? null,
        baru: r.meta?.new ?? null,
        raw: r,
      }))

      setRows(flat)
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [])

  // dropdown dinamis dari data
  const allActions = useMemo<DbAction[]>(() => Array.from(new Set(rows.map(r => r.aksi))), [rows])
  const allAdmins = useMemo<string[]>(() => Array.from(new Set(rows.map(r => r.admin).filter(Boolean))), [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (aksi !== 'Semua' && r.aksi !== aksi) return false
      if (admin !== 'Semua' && r.admin !== admin) return false
      const tgl = r.waktu.slice(0,10)
      if (dateFrom && tgl < dateFrom) return false
      if (dateTo && tgl > dateTo) return false
      if (q) {
        const text = `${r.admin} ${r.aksi} ${r.target} ${r.ringkas}`.toLowerCase()
        if (!text.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [rows, q, aksi, admin, dateFrom, dateTo])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  const pageRows = filtered.slice(start, end)

  function resetFilters() {
    setQ(''); setAksi('Semua'); setAdmin('Semua'); setDateFrom(''); setDateTo(''); setPage(1)
  }

  function exportCSV() {
    const header = ['Waktu','Admin','Aksi','Target','Ringkasan']
    const rowsCsv = filtered.map(r => [formatWaktu(r.waktu), r.admin, r.aksi, r.target, r.ringkas])
    const csv = [header, ...rowsCsv].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `log_aktivitas_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Log Aktivitas</h1>
          <p className="text-sm text-slate-500">Jejak aksi admin dari database.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1"/> Ekspor CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <Label className="text-xs text-slate-500">Pencarian</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input className="pl-8" placeholder="Cari admin / aksi / target" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Aksi</Label>
              <Select value={aksi} onValueChange={(v: DbAction | 'Semua') => { setAksi(v); setPage(1) }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua</SelectItem>
                  {allActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Admin</Label>
              <Select value={admin} onValueChange={(v) => { setAdmin(v); setPage(1) }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua</SelectItem>
                  {allAdmins.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Dari Tanggal</Label>
              <Input type="date" className="mt-1" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Sampai Tanggal</Label>
              <Input type="date" className="mt-1" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters}>Reset</Button>
            </div>
          </div>
          {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Daftar Log</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500">Baris per halaman</Label>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Ringkasan</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={6} className="text-sm text-slate-500">Memuat data…</TableCell></TableRow>
                )}
                {!loading && pageRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{formatWaktu(r.waktu)}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.admin}</TableCell>
                    <TableCell className="whitespace-nowrap">{actionBadge(r.aksi)}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.target}</TableCell>
                    <TableCell>{r.ringkas}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1"/> Lihat</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Detail Log #{r.id}</DialogTitle>
                          </DialogHeader>
                          <div className="text-sm space-y-2">
                            <div><span className="text-slate-500">Waktu:</span> {formatWaktu(r.waktu)}</div>
                            <div><span className="text-slate-500">Admin:</span> {r.admin}</div>
                            <div><span className="text-slate-500">Aksi:</span> {r.aksi}</div>
                            <div><span className="text-slate-500">Target:</span> {r.target}</div>
                            <Separator className="my-2" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Sebelum</p>
                                <pre className="text-xs bg-slate-50 border rounded-md p-2 overflow-auto">{JSON.stringify(r.lama ?? {}, null, 2)}</pre>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Sesudah</p>
                                <pre className="text-xs bg-slate-50 border rounded-md p-2 overflow-auto">{JSON.stringify(r.baru ?? {}, null, 2)}</pre>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-slate-500 py-10">Tidak ada data sesuai filter.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-3">
            <div className="text-xs text-slate-500">Menampilkan {pageRows.length} dari {total} data • Halaman {currentPage} dari {totalPages}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={currentPage === 1}>Awal</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Sebelumnya</Button>
              <div className="px-3 py-1 rounded-md border text-sm">{currentPage}</div>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Berikutnya</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>Akhir</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
