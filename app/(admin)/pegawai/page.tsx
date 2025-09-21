/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Employee, Unit, StatusPegawai } from '@/types'

type Row = Employee & { units?: { name: string } | null } // relasi alias

export default function PegawaiPage() {
  // data
  const [employees, setEmployees] = useState<Row[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filter/search
  const [q, setQ] = useState('')
  const [unitFilter, setUnitFilter] = useState<string>('Semua Unit')
  const [statusFilter, setStatusFilter] = useState<string>('Semua Status')

  // ADD dialog
  const [openAdd, setOpenAdd] = useState(false)
  const [nama, setNama] = useState('')
  const [nip, setNip] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [unitId, setUnitId] = useState<string>('') // unit_id (uuid)
  const [statusPg, setStatusPg] = useState<StatusPegawai | ''>('')

  // EDIT dialog
  const [openEdit, setOpenEdit] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editNama, setEditNama] = useState('')
  const [editNip, setEditNip] = useState('')
  const [editJabatan, setEditJabatan] = useState('')
  const [editUnitId, setEditUnitId] = useState('')
  const [editStatusPg, setEditStatusPg] = useState<StatusPegawai | ''>('')

  // ===== LOAD DATA =====
  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true); setError(null)

      // Units
      const unitsQ = supabase.from('units').select('*').order('name', { ascending: true })
      // Employees + relasi unit (alias 'units:unit_id')
      const empQ = supabase
        .from('employees')
        .select('id,nama,nip,jabatan,unit_id,status_pg,active,created_at,updated_at, units:unit_id ( name )')
        .order('nama', { ascending: true })

      const [{ data: unitsData, error: unitsErr }, { data: empData, error: empErr }] = await Promise.all([unitsQ, empQ])

      if (!alive) return
      if (unitsErr) { setError(unitsErr.message); setLoading(false); return }
      if (empErr)   { setError(empErr.message); setLoading(false); return }

      setUnits(unitsData || [])
      setEmployees((empData as unknown as Row[]) || [])
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [])

  // Helpers
  const unitNameById = useMemo(() => {
    const m = new Map<string, string>()
    units.forEach(u => m.set(u.id, u.name))
    return m
  }, [units])

  const filtered = useMemo(() => {
    return employees.filter((p) => {
      const unitName = unitNameById.get(p.unit_id) || p.units?.name || ''
      if (unitFilter !== 'Semua Unit' && unitName !== unitFilter) return false
      if (statusFilter !== 'Semua Status' && p.status_pg !== (statusFilter === 'ASN' ? 'ASN' : 'NON_ASN')) return false
      if (q && !(`${p.nama} ${p.nip} ${p.jabatan} ${unitName}`.toLowerCase().includes(q.toLowerCase()))) return false
      return true
    })
  }, [employees, unitFilter, statusFilter, q, unitNameById])

  function resetAddForm() {
    setNama(''); setNip(''); setJabatan(''); setUnitId(''); setStatusPg('')
  }

  // ===== ADD (API POST) =====
  async function onSubmitAdd() {
    if (!nama || !nip || !jabatan || !unitId || !statusPg) return
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama, nip, jabatan, unit_id: unitId, status_pg: statusPg, active: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'Gagal menambah pegawai')

      // refresh list (atau push json ke state)
      setEmployees(prev => [{ ...(json as Row) }, ...prev])
      resetAddForm()
      setOpenAdd(false)
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan')
    }
  }

  // ===== EDIT (API PATCH) =====
  function openEditDialog(p: Row) {
    setEditId(p.id)
    setEditNama(p.nama)
    setEditNip(p.nip)
    setEditJabatan(p.jabatan)
    setEditUnitId(p.unit_id)
    setEditStatusPg(p.status_pg)
    setOpenEdit(true)
  }

  async function onSubmitEdit() {
    if (!editId || !editNama || !editNip || !editJabatan || !editUnitId || !editStatusPg) return
    try {
      const res = await fetch(`/api/employees/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: editNama,
          nip: editNip,
          jabatan: editJabatan,
          unit_id: editUnitId,
          status_pg: editStatusPg,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'Gagal memperbarui pegawai')

      setEmployees(prev => prev.map(p => p.id === editId ? { ...(json as Row) } : p))
      setOpenEdit(false)
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan')
    }
  }

  // ===== TOGGLE AKTIF (API PATCH) =====
  async function toggleAktif(id: string, next: boolean) {
    // optimistic UI
    setEmployees(prev => prev.map(p => p.id === id ? { ...p, active: next } as Row : p))
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      })
      if (!res.ok) {
        // revert jika gagal
        setEmployees(prev => prev.map(p => p.id === id ? { ...p, active: !next } as Row : p))
      }
    } catch {
      setEmployees(prev => prev.map(p => p.id === id ? { ...p, active: !next } as Row : p))
    }
  }

  // Skeleton Component untuk tabel
  const TableSkeleton = () => (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-12 rounded-full" />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-3 w-10" />
            </div>
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-8 w-16 ml-auto" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )

  // ===== UI =====
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pegawai</h1>
          <p className="text-sm text-slate-500">Semua data pegawai. Tambah, cari, filter, edit & toggle aktif.</p>
        </div>

        {/* ADD */}
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button className="bg-[#003A70] hover:opacity-95">
              <Plus className="h-4 w-4 mr-1" /> Tambah Pegawai
            </Button>
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
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder={units.length ? "Pilih unit kerja" : "Memuat unit..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status Pegawai</Label>
                <Select value={statusPg} onValueChange={(v: StatusPegawai) => setStatusPg(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASN">ASN</SelectItem>
                    <SelectItem value="NON_ASN">non-ASN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAdd(false)}>Batal</Button>
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
          {/* search & filter */}
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
                  {units.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
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

          {/* table */}
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
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableSkeleton />}
                {!loading && filtered.map((p) => {
                  const unitName = unitNameById.get(p.unit_id) || p.units?.name || "-"
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">{p.nama}</TableCell>
                      <TableCell>{p.nip}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.jabatan}</TableCell>
                      <TableCell className="whitespace-nowrap">{unitName}</TableCell>
                      <TableCell>
                        {p.status_pg === 'ASN' ? (
                          <Badge className="bg-[#0E5AAE]">ASN</Badge>
                        ) : (
                          <Badge variant="secondary">non-ASN</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={p.active}
                            onCheckedChange={(v) => toggleAktif(p.id, Boolean(v))}
                          />
                          <span className="text-xs text-slate-600">{p.active ? 'Aktif' : 'Nonaktif'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(p)}>
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-slate-500">Tidak ada data.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
          <Separator className="my-3" />
          <div className="text-xs text-slate-500">Total: {filtered.length} dari {employees.length} pegawai</div>
        </CardContent>
      </Card>

      {/* EDIT */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Pegawai</DialogTitle>
            <DialogDescription>Ubah data pegawai, lalu simpan.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-nama">Nama</Label>
              <Input id="edit-nama" value={editNama} onChange={(e) => setEditNama(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-nip">NIP</Label>
              <Input id="edit-nip" value={editNip} onChange={(e) => setEditNip(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-jabatan">Jabatan</Label>
              <Input id="edit-jabatan" value={editJabatan} onChange={(e) => setEditJabatan(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Unit Kerja</Label>
              <Select value={editUnitId} onValueChange={setEditUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih unit kerja" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status Pegawai</Label>
              <Select value={editStatusPg} onValueChange={(v: StatusPegawai) => setEditStatusPg(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASN">ASN</SelectItem>
                  <SelectItem value="NON_ASN">non-ASN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>Batal</Button>
            <Button className="bg-[#003A70] hover:opacity-95" onClick={onSubmitEdit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}