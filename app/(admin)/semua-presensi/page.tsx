'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, Search } from 'lucide-react'
import { Row } from '@/types'
import { UNITS } from '@/constants'

type Status = 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPHA'



function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function makeDummy(n = 200): Row[] {
  const names = ['Budi','Siti','Andi','Rina','Tono','Dewi','Joko','Wati','Rudi','Lina','Farhan','Nadia','Asep','Yuni','Yoga']
  const statuses: Status[] = ['HADIR','IZIN','SAKIT','ALPHA']
  const out: Row[] = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - Math.floor(Math.random() * 28))
    const tanggal = d.toISOString().slice(0,10)
    const jam = `${String(8 + (i % 9)).padStart(2,'0')}:${String(i % 60).padStart(2,'0')}`
    out.push({
      id: `PR-${i+1}`,
      tanggal,
      jam,
      unit: rand(UNITS),
      nama: rand(names) + (i % 7 === 0 ? ' ' + (i+1) : ''),
      nip: `1979${String(1000 + i)}`,
      status: rand(statuses),
      deskripsi: i % 3 === 0 ? 'Rapat Koordinasi' : 'Kegiatan rutin',
      admin: 'Admin PUPR',
    })
  }
  // urut terbaru di atas
  return out.sort((a,b) => (b.tanggal + b.jam).localeCompare(a.tanggal + a.jam))
}

const ALL = makeDummy(220)

export default function SemuaPresensiPage() {
  // filter state
  const [q, setQ] = useState('')
  const [unit, setUnit] = useState('Semua Unit')
  const [status, setStatus] = useState('Semua Status')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const filtered = useMemo(() => {
    return ALL.filter((r) => {
      if (unit !== 'Semua Unit' && r.unit !== unit) return false
      if (status !== 'Semua Status' && r.status !== (status as Status)) return false
      if (dateFrom && r.tanggal < dateFrom) return false
      if (dateTo && r.tanggal > dateTo) return false
      if (q) {
        const text = `${r.nama} ${r.nip} ${r.unit} ${r.deskripsi}`.toLowerCase()
        if (!text.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [q, unit, status, dateFrom, dateTo])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  const pageRows = filtered.slice(start, end)

  function resetFilters() {
    setQ(''); setUnit('Semua Unit'); setStatus('Semua Status'); setDateFrom(''); setDateTo(''); setPage(1)
  }

  function exportCSV() {
    const header = ['Tanggal','Jam','Unit','Nama','NIP','Status','Deskripsi','Admin']
    const rows = filtered.map(r => [r.tanggal, r.jam, r.unit, r.nama, r.nip, r.status, r.deskripsi, r.admin])
    const csv = [header, ...rows].map(r => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `semua-presensi_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Semua Presensi</h1>
          <p className="text-sm text-slate-500">Lihat semua data presensi dengan filter dan pagination.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1"/> Unduh CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input className="pl-8" placeholder="Cari nama / NIP / unit / deskripsi" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Unit</Label>
              <Select value={unit} onValueChange={(v) => { setUnit(v); setPage(1) }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Unit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Unit">Semua Unit</SelectItem>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Status</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Status">Semua Status</SelectItem>
                  <SelectItem value="HADIR">Hadir</SelectItem>
                  <SelectItem value="IZIN">Izin</SelectItem>
                  <SelectItem value="SAKIT">Sakit</SelectItem>
                  <SelectItem value="ALPHA">Alpha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Dari Tanggal</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Sampai Tanggal</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
              </div>
            </div>
            <div className="flex items-end justify-start">
              <Button variant="outline" onClick={resetFilters}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Tabel Presensi</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500">Baris per halaman</Label>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
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
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r) => (
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
                    <TableCell className="whitespace-nowrap">{r.deskripsi}</TableCell>
                    <TableCell>{r.admin}</TableCell>
                  </TableRow>
                ))}
                {pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-slate-500 py-10">Tidak ada data sesuai filter.</TableCell>
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
