"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ClipboardList,
  Users,
  CheckCircle2,
  SortAsc,
  SortDesc,
} from "lucide-react";

// ------------------------------------------------------------
// DUMMY MASTER DATA
// ------------------------------------------------------------
const UNITS = [
  "Sekretariat",
  "Bid. Bina Marga",
  "Bid. Penataan Ruang",
  "Bid. SDA",
  "Bid. Bangunan",
  "Bid. Jasa Konstruksi",
  "Bid. AMPIP",
  "UPT. Kecamatan",
];

type Status = "HADIR" | "IZIN" | "SAKIT" | "DL" | "TK";

type Pegawai = {
  id: string;
  nama: string;
  nip: string;
  unit: string;
  jabatan: string;
};

function makeDummyPegawai(): Pegawai[] {
  const names = [
    "Budi Santoso",
    "Ani Lestari",
    "Rina Kurnia",
    "Andi Wijaya",
    "Dewi Pertiwi",
    "Joko Pratama",
    "Siti Rahma",
    "Rudi Hartono",
    "Wati Sulastri",
    "Tono Hidayat",
  ];
  const roles = ["Staf", "Analis", "Koordinator", "Pengawas", "Kasubag"];
  const list: Pegawai[] = [];
  for (let i = 0; i < 60; i++) {
    list.push({
      id: `emp-${i + 1}`,
      nama: names[i % names.length] + (i >= names.length ? ` ${i}` : ""),
      nip: `19790${100 + i}`,
      unit: UNITS[i % UNITS.length],
      jabatan: roles[i % roles.length],
    });
  }
  // default urut unit lalu nama
  return list.sort((a, b) =>
    a.unit === b.unit ? a.nama.localeCompare(b.nama) : a.unit.localeCompare(b.unit)
  );
}

const ALL_PEGAWAI = makeDummyPegawai();

enum Dir {
  ASC = "asc",
  DESC = "desc",
}

type SortBy = "nama" | "jabatan";

export default function PresensiPage() {
  // step 1 fields
  const [tanggal, setTanggal] = useState<string>("");
  const [jamMulai, setJamMulai] = useState<string>("08:00");
  const [jamAkhir, setJamAkhir] = useState<string>("09:00");
  const [deskripsi, setDeskripsi] = useState<string>("");

  // step controls
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // step 2: unit + pegawai selection
  const [unitChecked, setUnitChecked] = useState<Record<string, boolean>>({});
  const [statusGlobal, setStatusGlobal] = useState<Status | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<Record<string, boolean>>({});

  // sort kolom
  const [sortBy, setSortBy] = useState<SortBy>("nama");
  const [sortNamaDir, setSortNamaDir] = useState<Dir>(Dir.ASC);
  const [sortJabatanDir, setSortJabatanDir] = useState<Dir>(Dir.ASC);

  const unitsSelected = useMemo(
    () => Object.keys(unitChecked).filter((u) => unitChecked[u]),
    [unitChecked]
  );

  const pegawaiByUnit = useMemo(() => {
    if (unitsSelected.length === 0) return [];
    const rows = ALL_PEGAWAI.filter((p) => unitsSelected.includes(p.unit));
    rows.sort((a, b) => {
      if (sortBy === "nama") {
        const cmp = a.nama.localeCompare(b.nama);
        if (cmp !== 0) return sortNamaDir === Dir.ASC ? cmp : -cmp;
        // tie-breaker selalu A-Z di kolom lain
        return a.jabatan.localeCompare(b.jabatan);
      } else {
        const cmp = a.jabatan.localeCompare(b.jabatan);
        if (cmp !== 0) return sortJabatanDir === Dir.ASC ? cmp : -cmp;
        return a.nama.localeCompare(b.nama);
      }
    });
    return rows;
  }, [unitsSelected, sortBy, sortNamaDir, sortJabatanDir]);

  const totalSelected = useMemo(
    () => Object.values(selectedEmp).filter(Boolean).length,
    [selectedEmp]
  );

  function nextFromStep1() {
    if (!tanggal || !jamMulai || !jamAkhir) return;
    setStep(2);
  }

  function toggleUnit(u: string, checked: boolean) {
    setUnitChecked((prev) => ({ ...prev, [u]: checked }));
    setSelectedEmp({});
    if (!checked && unitsSelected.length <= 1) setStatusGlobal(null);
  }

  function toggleSelectAllEmployees(checked: boolean) {
    const next: Record<string, boolean> = {};
    if (checked) {
      pegawaiByUnit.forEach((p) => {
        next[p.id] = true;
      });
    }
    setSelectedEmp(next);
  }

  function toggleSortNama() {
    setSortBy("nama");
    setSortNamaDir((d) => (d === Dir.ASC ? Dir.DESC : Dir.ASC));
  }
  function toggleSortJabatan() {
    setSortBy("jabatan");
    setSortJabatanDir((d) => (d === Dir.ASC ? Dir.DESC : Dir.ASC));
  }

  // step 3: hasil simpan dummy
  const [saved, setSaved] = useState<{
    sesiId: string;
    count: number;
    status: Status | null;
  } | null>(null);

  function handleSave() {
    if (unitsSelected.length === 0 || totalSelected === 0 || !statusGlobal) return;
    const sesiId = `S-${Date.now()}`;
    setSaved({ sesiId, count: totalSelected, status: statusGlobal });
    setStep(3);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Presensi</h1>
        <p className="text-sm text-slate-500">Alur 2 langkah: detail sesi lalu pilih unit dan pegawai.</p>
      </div>

      {/* Step indicator */}
      <div className="grid grid-cols-3 gap-2">
        <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-2", step === 1 ? "bg-[#F4F7FB] border-[#003A70]" : "")}>
          <CalendarDays className="h-4 w-4" />
          <span className="text-sm">Langkah 1. Detail Sesi</span>
        </div>
        <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-2", step === 2 ? "bg-[#F4F7FB] border-[#003A70]" : "")}>
          <Users className="h-4 w-4" />
          <span className="text-sm">Langkah 2. Unit & Pegawai</span>
        </div>
        <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-2", step === 3 ? "bg-[#F4F7FB] border-[#003A70]" : "")}>
          <ClipboardList className="h-4 w-4" />
          <span className="text-sm">Ringkasan</span>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Detail Sesi</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tanggal">Tanggal</Label>
                <Input id="tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jamMulai">Jam Mulai</Label>
                <Input id="jamMulai" type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jamAkhir">Jam Akhir</Label>
                <Input id="jamAkhir" type="time" value={jamAkhir} onChange={(e) => setJamAkhir(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea id="deskripsi" placeholder="Contoh: Rapat koordinasi proyek" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setTanggal(""); setJamMulai("08:00"); setJamAkhir("09:00"); setDeskripsi("") }}>Reset</Button>
              <Button className="bg-[#003A70] hover:opacity-95" onClick={nextFromStep1} disabled={!tanggal || !jamMulai || !jamAkhir}>Lanjut</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Pilih Unit Kerja</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {UNITS.map((u) => (
                  <label key={u} className={cn("flex items-center gap-2 rounded-xl border p-3 cursor-pointer", unitChecked[u] ? "border-[#003A70] bg-[#F4F7FB]" : "")}>
                    <Checkbox checked={!!unitChecked[u]} onCheckedChange={(v) => toggleUnit(u, Boolean(v))} />
                    <span className="text-sm">{u}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500">Status kehadiran di bawah akan aktif setelah memilih minimal satu unit.</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">Pilih Pegawai</CardTitle></CardHeader>
              <CardContent>
                {unitsSelected.length === 0 ? (
                  <p className="text-sm text-slate-500">Pilih unit dahulu untuk menampilkan pegawai.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={pegawaiByUnit.length > 0 && pegawaiByUnit.every((p) => selectedEmp[p.id])}
                                onCheckedChange={(v) => toggleSelectAllEmployees(Boolean(v))}
                                aria-label="Pilih semua"
                              />
                            </div>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" className="px-0 h-auto font-medium" onClick={toggleSortNama} title="Urut Nama">
                              Nama {sortNamaDir === Dir.ASC ? <SortDesc className="ml-1 h-4 w-4"/> : <SortAsc className="ml-1 h-4 w-4"/>}
                            </Button>
                          </TableHead>
                          <TableHead>NIP</TableHead>
                          <TableHead>
                            <Button variant="ghost" className="px-0 h-auto font-medium" onClick={toggleSortJabatan} title="Urut Jabatan">
                              Jabatan {sortJabatanDir === Dir.ASC ? <SortDesc className="ml-1 h-4 w-4"/> : <SortAsc className="ml-1 h-4 w-4"/>}
                            </Button>
                          </TableHead>
                          <TableHead>Unit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pegawaiByUnit.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <Checkbox checked={!!selectedEmp[p.id]} onCheckedChange={(v) => setSelectedEmp((prev) => ({ ...prev, [p.id]: Boolean(v) }))} />
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{p.nama}</TableCell>
                            <TableCell>{p.nip}</TableCell>
                            <TableCell className="whitespace-nowrap">{p.jabatan}</TableCell>
                            <TableCell className="whitespace-nowrap">{p.unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-2">Dipilih: {totalSelected} pegawai</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Status Kehadiran</CardTitle></CardHeader>
              <CardContent>
                <div className={cn("grid gap-2", unitsSelected.length ? "" : "opacity-50 pointer-events-none")}>
                  <label className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer">
                    <Checkbox checked={statusGlobal === "HADIR"} onCheckedChange={(v) => v && setStatusGlobal("HADIR")} />
                    <span className="text-sm">Hadir</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer">
                    <Checkbox checked={statusGlobal === "IZIN"} onCheckedChange={(v) => v && setStatusGlobal("IZIN")} />
                    <span className="text-sm">Izin</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer">
                    <Checkbox checked={statusGlobal === "SAKIT"} onCheckedChange={(v) => v && setStatusGlobal("SAKIT")} />
                    <span className="text-sm">Sakit</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer">
                    <Checkbox checked={statusGlobal === "TK"} onCheckedChange={(v) => v && setStatusGlobal("TK")} />
                    <span className="text-sm">TK</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer">
                    <Checkbox checked={statusGlobal === "DL"} onCheckedChange={(v) => v && setStatusGlobal("DL")} />
                    <span className="text-sm">DL</span>
                  </label>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Status akan diterapkan ke semua pegawai yang dipilih.</span>
                  {statusGlobal && <Badge variant="secondary">Terpilih: {statusGlobal}</Badge>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Kembali</Button>
            <Button className="bg-[#003A70] hover:opacity-95" onClick={handleSave} disabled={unitsSelected.length === 0 || totalSelected === 0 || !statusGlobal}>Simpan Presensi</Button>
          </div>
        </>
      )}

      {step === 3 && saved && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Ringkasan Presensi</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5"/> <span>Presensi tersimpan.</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 text-sm">
                <div><span className="text-slate-500">ID Sesi:</span> <span className="font-medium">{saved.sesiId}</span></div>
                <div><span className="text-slate-500">Tanggal:</span> <span className="font-medium">{tanggal}</span></div>
                <div><span className="text-slate-500">Waktu:</span> <span className="font-medium">{jamMulai} - {jamAkhir}</span></div>
              </div>
              <div className="space-y-1 text-sm">
                <div><span className="text-slate-500">Unit dipilih:</span> <span className="font-medium">{unitsSelected.join(', ')}</span></div>
                <div><span className="text-slate-500">Jumlah pegawai:</span> <span className="font-medium">{saved.count}</span></div>
                <div><span className="text-slate-500">Status diterapkan:</span> <Badge>{saved.status}</Badge></div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" onClick={() => { setStep(2); }}>Kembali</Button>
              <Button className="bg-[#003A70] hover:opacity-95" onClick={() => { setTanggal(''); setJamMulai('08:00'); setJamAkhir('09:00'); setDeskripsi(''); setUnitChecked({}); setSelectedEmp({}); setStatusGlobal(null); setSaved(null); setStep(1) }}>Buat Sesi Baru</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
