"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CalendarDays, ClipboardList, Users, CheckCircle2, SortAsc, SortDesc } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Employee, Unit, StatusKehadiran } from "@/types";

// ======================================================
// TYPES & CONST
// ======================================================
type Status = StatusKehadiran; // 'HADIR' | 'IZIN' | 'SAKIT' | 'DL' | 'TK'
const STATUSES: Status[] = ["HADIR", "IZIN", "SAKIT", "DL", "TK"];

type Bucket = "UNSET" | Status;

enum Dir { ASC = "asc", DESC = "desc" }
type SortBy = "nama" | "jabatan";

// Row dari DB + relasi unit (opsional)
type Row = Employee & { units?: { name: string } | null };

// ======================================================
// PAGE
// ======================================================
export default function PresensiPage() {
  // step 1 fields
  const [tanggal, setTanggal] = useState<string>("");
  const [jamMulai, setJamMulai] = useState<string>("08:00");
  const [jamAkhir, setJamAkhir] = useState<string>("09:00");
  const [deskripsi, setDeskripsi] = useState<string>("");

  // step controls
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // master data
  const [units, setUnits] = useState<Unit[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // seleksi unit & pegawai
  const [unitChecked, setUnitChecked] = useState<Record<string, boolean>>({});
  const [selectedEmp, setSelectedEmp] = useState<Record<string, boolean>>({});

  // multi-bucket status
  const [activeTab, setActiveTab] = useState<Bucket>("UNSET");
  const [statusByEmp, setStatusByEmp] = useState<Record<string, Bucket>>({});

  // sort
  const [sortBy, setSortBy] = useState<SortBy>("nama");
  const [sortNamaDir, setSortNamaDir] = useState<Dir>(Dir.ASC);
  const [sortJabatanDir, setSortJabatanDir] = useState<Dir>(Dir.ASC);

  // hasil simpan
  const [saved, setSaved] = useState<{
    sesiId: string;
    tally: Record<Status, number>;
  } | null>(null);

  // ======================================================
  // LOAD REAL DATA (units + employees)
  // ======================================================
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErrMsg(null);

      const unitsQ = supabase.from("units").select("*").order("name", { ascending: true });
      const empQ = supabase
        .from("employees")
        .select("id,nama,nip,jabatan,unit_id,status_pg,active,created_at,updated_at, units:unit_id ( name )")
        .order("nama", { ascending: true });

      const [{ data: unitsData, error: unitsErr }, { data: empData, error: empErr }] = await Promise.all([unitsQ, empQ]);

      if (!alive) return;

      if (unitsErr) { setErrMsg(unitsErr.message); setLoading(false); return; }
      if (empErr)   { setErrMsg(empErr.message);   setLoading(false); return; }

      setUnits(unitsData || []);
      setEmployees((empData as Row[]) || []);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, []);

  // ======================================================
  // DERIVED
  // ======================================================
  const unitMap = useMemo(() => {
    const m = new Map<string, string>();
    units.forEach(u => m.set(u.id, u.name));
    return m;
  }, [units]);

  const unitsSelected = useMemo(
    () => Object.keys(unitChecked).filter((id) => unitChecked[id]),
    [unitChecked]
  );

  // reset pilihan saat unit berubah, kunci ke tab UNSET
  useEffect(() => {
    setSelectedEmp({});
    setActiveTab("UNSET");
  }, [unitsSelected.join(",")]);

  // semua pegawai yang termasuk unit terpilih
  const baseRows = useMemo(() => {
    if (unitsSelected.length === 0) return [] as Row[];
    return employees.filter((p) => unitsSelected.includes(p.unit_id));
  }, [employees, unitsSelected]);

  // hitung counter per bucket di unit terpilih
  const bucketCount = useMemo(() => {
    const count: Record<Bucket, number> = { UNSET: 0, HADIR: 0, IZIN: 0, SAKIT: 0, DL: 0, TK: 0 };
    baseRows.forEach((p) => {
      const b = statusByEmp[p.id] ?? "UNSET";
      count[b] += 1;
    });
    return count;
  }, [baseRows, statusByEmp]);

  // data tabel = hanya bucket aktif
  const pegawaiByUnit = useMemo(() => {
    let rows = baseRows.filter((p) => (statusByEmp[p.id] ?? "UNSET") === activeTab);
    rows = rows.sort((a, b) => {
      if (sortBy === "nama") {
        const cmp = a.nama.localeCompare(b.nama);
        if (cmp !== 0) return sortNamaDir === Dir.ASC ? cmp : -cmp;
        return a.jabatan.localeCompare(b.jabatan);
      } else {
        const cmp = a.jabatan.localeCompare(b.jabatan);
        if (cmp !== 0) return sortJabatanDir === Dir.ASC ? cmp : -cmp;
        return a.nama.localeCompare(b.nama);
      }
    });
    return rows;
  }, [baseRows, statusByEmp, activeTab, sortBy, sortNamaDir, sortJabatanDir]);

  const totalSelected = useMemo(
    () => Object.values(selectedEmp).filter(Boolean).length,
    [selectedEmp]
  );

  // ======================================================
  // HANDLERS
  // ======================================================
  function nextFromStep1() {
    if (!tanggal || !jamMulai || !jamAkhir) return;
    setStep(2);
  }

  function toggleUnit(unitId: string, checked: boolean) {
    setUnitChecked((prev) => ({ ...prev, [unitId]: checked }));
  }

  function toggleSelectAllEmployees(checked: boolean) {
    const next: Record<string, boolean> = {};
    if (checked) {
      pegawaiByUnit.forEach((p) => { next[p.id] = true; });
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

  // apply status ke tab aktif (kecuali UNSET = kosongkan status)
  function applyToActiveTab() {
    const ids = Object.keys(selectedEmp).filter((k) => selectedEmp[k]);
    if (ids.length === 0) return;
    setStatusByEmp((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { next[id] = activeTab; });
      return next;
    });
    setSelectedEmp({});
  }

  // ======================================================
  // SAVE -> CREATE SESSION + BULK SET
  // ======================================================
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setErrMsg(null);

    // minimal ada 1 yang bukan UNSET
    const selections = Object.entries(statusByEmp).filter(([_, b]) => b && b !== "UNSET") as [string, Status][];
    if (selections.length === 0) return;

    try {
      setSaving(true);

      // 1) Create session (server API)
      const resCreate = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_tanggal: tanggal,
          p_mulai: jamMulai,
          p_akhir: jamAkhir,
          p_deskripsi: deskripsi || null,
        }),
      });
      const jsonCreate = await resCreate.json();
      if (!resCreate.ok) throw new Error(jsonCreate?.error?.message || "Gagal membuat sesi");
      const sessionId: string = jsonCreate.id;

      // 2) Kelompokkan employees per status
      const bucketMap: Record<Status, string[]> = { HADIR: [], IZIN: [], SAKIT: [], DL: [], TK: [] };
      for (const [id, b] of selections) bucketMap[b as Status].push(id);

      // 3) Panggil bulk untuk setiap status yang punya isi
      const calls = (Object.keys(bucketMap) as Status[]).map(async (s) => {
        const arr = bucketMap[s];
        if (arr.length === 0) return null;
        const res = await fetch("/api/attendance/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            p_session_id: sessionId,
            p_rows: arr,
            p_status: s,
            p_note: null,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error?.message || `Gagal set status ${s}`);
        }
        return true;
      });

      await Promise.all(calls);

      // 4) tally untuk ringkasan
      const tally: Record<Status, number> = { HADIR: 0, IZIN: 0, SAKIT: 0, DL: 0, TK: 0 };
      selections.forEach(([_, s]) => { tally[s] += 1; });

      setSaved({ sesiId: sessionId, tally });
      setStep(3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setErrMsg(e?.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  // reset state untuk buat baru
  function resetAll() {
    setTanggal("");
    setJamMulai("08:00");
    setJamAkhir("09:00");
    setDeskripsi("");
    setUnitChecked({});
    setSelectedEmp({});
    setStatusByEmp({});
    setActiveTab("UNSET");
    setSaved(null);
    setStep(1);
  }

  // ======================================================
  // UI
  // ======================================================
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Presensi</h1>
        <p className="text-sm text-slate-500">Atur status per pegawai dalam beberapa bucket lalu simpan.</p>
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

      {/* STEP 1 */}
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
            {errMsg && <div className="text-sm text-red-600">{errMsg}</div>}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setTanggal(""); setJamMulai("08:00"); setJamAkhir("09:00"); setDeskripsi(""); }}>Reset</Button>
              <Button className="bg-[#003A70] hover:opacity-95" onClick={nextFromStep1} disabled={!tanggal || !jamMulai || !jamAkhir}>Lanjut</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Pilih Unit Kerja</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p className="text-sm text-slate-500">Memuat unit…</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {units.map((u) => (
                    <label key={u.id} className={cn("flex items-center gap-2 rounded-xl border p-3 cursor-pointer", unitChecked[u.id] ? "border-[#003A70] bg-[#F4F7FB]" : "")}>
                      <Checkbox checked={!!unitChecked[u.id]} onCheckedChange={(v) => toggleUnit(u.id, Boolean(v))} />
                      <span className="text-sm">{u.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500">Pilih unit untuk menampilkan pegawai. Kelompokkan ke tab status di bawah.</p>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Bucket)} className="w-full">
            <TabsList className="flex flex-wrap gap-2">
              <TabsTrigger value="UNSET">Belum dipilih <Badge className="ml-2" variant="secondary">{bucketCount.UNSET}</Badge></TabsTrigger>
              {STATUSES.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {s} <Badge className="ml-2" variant="secondary">{bucketCount[s]}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2 flex items-center justify-between">
                <CardTitle className="text-base">Daftar Pegawai</CardTitle>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Tab aktif: <b>{activeTab}</b></span>
                  <Button size="sm" variant="outline" onClick={() => setSelectedEmp({})}>Bersihkan pilihan</Button>
                  <Button size="sm" className="bg-[#003A70] hover:opacity-95" onClick={applyToActiveTab}>
                    {activeTab === "UNSET" ? "Kosongkan status" : `Set ke ${activeTab}`}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {unitsSelected.length === 0 ? (
                  <p className="text-sm text-slate-500">Pilih unit dahulu untuk menampilkan pegawai.</p>
                ) : loading ? (
                  <p className="text-sm text-slate-500">Memuat pegawai…</p>
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
                            <TableCell className="whitespace-nowrap">{unitMap.get(p.unit_id) || p.units?.name || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-2">Dipilih di tab {activeTab}: {totalSelected} pegawai</div>
              </CardContent>
            </Card>

            {/* Ringkas per status di sisi kanan */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Ringkasan Sementara</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {STATUSES.map((s) => (
                  <div key={s} className="flex items-center justify-between">
                    <span>{s}</span>
                    <Badge variant="secondary">{bucketCount[s]}</Badge>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <span>Belum dipilih</span>
                  <Badge variant="secondary">{bucketCount.UNSET}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {errMsg && <div className="text-sm text-red-600">{errMsg}</div>}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Kembali</Button>
            <Button
              className="bg-[#003A70] hover:opacity-95"
              onClick={handleSave}
              disabled={saving || Object.values(statusByEmp).every((v) => !v || v === "UNSET")}
            >
              {saving ? "Menyimpan..." : "Simpan Presensi"}
            </Button>
          </div>
        </>
      )}

      {/* STEP 3 */}
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
                <div><span className="text-slate-500">Deskripsi:</span> <span className="font-medium">{deskripsi || "-"}</span></div>
              </div>
              <div className="space-y-1 text-sm">
                {STATUSES.map((s) => (
                  <div key={s} className="flex items-center justify-between">
                    <span>{s}</span>
                    <Badge>{saved.tally[s]}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" onClick={() => { setStep(2); }}>Kembali</Button>
              <Button className="bg-[#003A70] hover:opacity-95" onClick={resetAll}>Buat Sesi Baru</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
