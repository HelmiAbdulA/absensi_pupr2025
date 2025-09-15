'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Search } from 'lucide-react'
import { UNITS } from '@/constants'
import { Pegawai } from '@/types'


function makeDummyPegawai(): Pegawai[] {
  const names = ['Budi Santoso','Ani Lestari','Rina Kurnia','Andi Wijaya','Dewi Pertiwi','Joko Pratama','Siti Rahma','Rudi Hartono','Wati Sulastri','Tono Hidayat']
  const list: Pegawai[] = []
  for (let i = 0; i < 24; i++) {
    list.push({
      id: `emp-${i+1}`,
      nama: names[i % names.length] + (i > names.length ? ` ${i}` : ''),
      nip: `19790${100 + i}`,
      jabatan: i % 4 === 0 ? 'Staf' : i % 4 === 1 ? 'Analis' : i % 4 === 2 ? 'Koordinator' : 'Kasubag',
      unit: UNITS[i % UNITS.length],
      statusPegawai: i % 5 === 0 ? 'non-ASN' : 'ASN',
      aktif: i % 9 !== 0,
    })
  }
  return list
}

export default function PegawaiPage() {
  const [data, setData] = useState<Pegawai[]>(makeDummyPegawai())
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [unitFilter, setUnitFilter] = useState<string>('Semua Unit')
  const [statusFilter, setStatusFilter] = useState<string>('Semua Status')

  // Form state
  const [nama, setNama] = useState('')
  const [nip, setNip] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [unit, setUnit] = useState('')
  const [statusPegawai, setStatusPegawai] = useState<'ASN' | 'non-ASN' | ''>('')

  const filtered = useMemo(() => {
    return data.filter((p) => {
      if (unitFilter !== 'Semua Unit' && p.unit !== unitFilter) return false
      if (statusFilter !== 'Semua Status' && p.statusPegawai !== (statusFilter as 'ASN' | 'non-ASN')) return false
      if (q && !(`${p.nama} ${p.nip} ${p.jabatan} ${p.unit}`.toLowerCase().includes(q.toLowerCase()))) return false
      return true
    })
  }, [data, unitFilter, statusFilter, q])

  function resetForm() {
    setNama('')
    setNip('')
    setJabatan('')
    setUnit('')
    setStatusPegawai('')
  }

  function onSubmitAdd() {
    if (!nama || !nip || !jabatan || !unit || !statusPegawai) return
    const newEmp: Pegawai = {
      id: `emp-${Date.now()}`,
      nama,
      nip,
      jabatan,
      unit,
      statusPegawai: statusPegawai as 'ASN' | 'non-ASN',
      aktif: true,
    }
    setData((prev) => [newEmp, ...prev])
    resetForm()
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pegawai</h1>
          <p className="text-sm text-slate-500">Semua data pegawai. Tambah, cari, dan filter.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#003A70] hover:opacity-95"><Plus className="h-4 w-4 mr-1"/> Tambah Pegawai</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Pegawai</DialogTitle>
              <DialogDescription>Isi data pegawai baru dengan lengkap.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="nama">Nama</Label>
                <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama pegawai" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nip">NIP</Label>
                <Input id="nip" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="1979xxxxxxxx" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="jabatan">Jabatan</Label>
                <Input id="jabatan" value={jabatan} onChange={(e) => setJabatan(e.target.value)} placeholder="Staf / Analis / Koordinator / ..." />
              </div>
              <div className="grid gap-2">
                <Label>Unit Kerja</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih unit kerja" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status Pegawai</Label>
                <Select value={statusPegawai} onValueChange={(v: 'ASN' | 'non-ASN') => setStatusPegawai(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASN">ASN</SelectItem>
                    <SelectItem value="non-ASN">non-ASN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button className="bg-[#003A70] hover:opacity-95" onClick={onSubmitAdd}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Semua Pegawai</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input className="pl-8 w-64" placeholder="Cari nama / NIP / unit / jabatan" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Unit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Unit">Semua Unit</SelectItem>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Status">Semua Status</SelectItem>
                  <SelectItem value="ASN">ASN</SelectItem>
                  <SelectItem value="non-ASN">non-ASN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{p.nama}</TableCell>
                    <TableCell>{p.nip}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.jabatan}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.unit}</TableCell>
                    <TableCell>
                      {p.statusPegawai === 'ASN' ? (
                        <Badge className="bg-[#0E5AAE]">ASN</Badge>
                      ) : (
                        <Badge variant="secondary">non-ASN</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.aktif ? <Badge variant="outline">Aktif</Badge> : <Badge variant="destructive">Nonaktif</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Separator className="my-3" />
          <div className="text-xs text-slate-500">Total: {filtered.length} dari {data.length} pegawai</div>
        </CardContent>
      </Card>
    </div>
  )
}
