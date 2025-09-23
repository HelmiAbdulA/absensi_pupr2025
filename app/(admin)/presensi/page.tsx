/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  CalendarDays, ClipboardList, History as HistoryIcon, Users,
  SortAsc, SortDesc, CheckCircle2, RefreshCcw, PlusCircle, Download,
} from 'lucide-react';

/** =========================================================
 *  TYPES (ringan, cukup untuk komponen ini)
 *  =======================================================*/
type UUID = string;

type Status = 'HADIR' | 'IZIN' | 'SAKIT' | 'DL' | 'TK';
const NON_HADIR: Status[] = ['IZIN', 'SAKIT', 'DL', 'TK'];
const ALL_STATUS: Status[] = ['HADIR', 'IZIN', 'SAKIT', 'DL', 'TK'];

type Unit = {
  id: UUID;
  name: string;
};

type Employee = {
  id: UUID;
  nama: string;
  nip: string;
  jabatan: string;
  unit_id: UUID;
  status_pg: 'ASN' | 'NON_ASN';
  active: boolean;
};

type SessionLite = {
  id: UUID;
  tanggal: string;       // date (YYYY-MM-DD)
  jam_mulai: string;     // HH:mm:ss
  jam_akhir: string;     // HH:mm:ss
  deskripsi: string | null;
  created_at: string;    // ISO
};

type SessionWithCounts = SessionLite & {
  counts: Record<Status, number>;
  total: number;
};

type AttendanceRow = {
  id: UUID;
  session_id: UUID;
  employee_id: UUID;
  status: Status;
};

/** =========================================================
 *  SMALL UTILS
 *  =======================================================*/
function fmtTime(t: string) {
  // terima "08:00" atau "08:00:00" → balikin "08:00"
  return (t || '').slice(0, 5);
}

/** =========================================================
 *  STATUS CONTROL COMPONENT
 *  =======================================================*/
function RowStatusControl({
  value,
  onChange,
}: {
  value?: Status;                     // undefined = UNSET
  onChange: (s?: Status) => void;    // undefined untuk UNSET
}) {
  const isHadir = value === 'HADIR';
  const isUnset = value === undefined;
  const isTidakHadir = !isHadir && !isUnset;

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex rounded-md border p-0.5">
        <Button
          size="sm"
          variant={isHadir ? 'default' : 'ghost'}
          className={isHadir ? 'bg-[#003A70]' : ''}
          onClick={() => onChange('HADIR')}
        >
          Hadir
        </Button>
        <Button
          size="sm"
          variant={isTidakHadir ? 'default' : 'ghost'}
          onClick={() => onChange('IZIN')} // default ke IZIN saat toggle ke tidak hadir
        >
          Tidak hadir
        </Button>
      </div>

      {!isHadir && (
        <div className="inline-flex items-center gap-1">
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={isTidakHadir ? value : ''}
            onChange={(e) => {
              const val = e.target.value as Status | '';
              if (!val) onChange(undefined);
              else onChange(val as Status);
            }}
          >
            <option value="" disabled>
              {isUnset ? '—' : 'Pilih alasan'}
            </option>
            {NON_HADIR.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {!isUnset && <option value="">Kosongkan</option>}
          </select>

          {!isUnset && (
            <Button size="sm" variant="ghost" onClick={() => onChange(undefined)}>
              Hapus
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** =========================================================
 *  SUMMARY BOX
 *  =======================================================*/
function SummaryCounts({
  baseRows,
  statusByEmp,
}: {
  baseRows: Array<{ id: string }>;
  statusByEmp: Record<string, string>;
}) {
  const tally = useMemo(() => {
    const t: Record<'UNSET' | Status, number> = {
      UNSET: 0,
      HADIR: 0,
      IZIN: 0,
      SAKIT: 0,
      DL: 0,
      TK: 0,
    };
    baseRows.forEach((p) => {
      const raw = statusByEmp[p.id] as Status | undefined;
      const key = (raw ?? 'UNSET') as 'UNSET' | Status;
      t[key] += 1;
    });
    return t;
  }, [baseRows, statusByEmp]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {ALL_STATUS.map((s) => (
        <div key={s} className="inline-flex gap-2 items-center">
          <span>{s}</span>
          <Badge variant="secondary">{tally[s]}</Badge>
        </div>
      ))}
      <div className="inline-flex gap-2 items-center">
        <span>Belum dipilih</span>
        <Badge variant="secondary">{tally.UNSET}</Badge>
      </div>
    </div>
  );
}

/** =========================================================
 *  PAGE
 *  =======================================================*/
type Dir = 'asc' | 'desc';
type SortBy = 'nama' | 'jabatan';

export default function PresensiPage() {
  /** ---------- Stepper: SEKARANG 4 LANGKAH ---------- */
  // 1. Sumber data (Buat baru / Gunakan dari riwayat)
  // 2. Detail sesi
  // 3. Unit & Pegawai
  // 4. Ringkasan
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  /** ---------- Step 2: Detail sesi ---------- */
  const [tanggal, setTanggal] = useState<string>('');
  const [jamMulai, setJamMulai] = useState<string>('08:00');
  const [jamAkhir, setJamAkhir] = useState<string>('09:00');
  const [deskripsi, setDeskripsi] = useState<string>('');

  /** ---------- Master data ---------- */
  const [units, setUnits] = useState<Unit[]>([]);
  const [employees, setEmployees] = useState<(Employee & { units?: { name: string } | null })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  /** ---------- Riwayat sesi ---------- */
  const [sessions, setSessions] = useState<SessionWithCounts[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);

  /** ---------- Unit & status selection ---------- */
  const [unitChecked, setUnitChecked] = useState<Record<string, boolean>>({});
  const [statusByEmp, setStatusByEmp] = useState<Record<string, Status | undefined>>({});

  /** ---------- Sorting ---------- */
  const [sortBy, setSortBy] = useState<SortBy>('nama');
  const [sortNamaDir, setSortNamaDir] = useState<Dir>('asc');
  const [sortJabatanDir, setSortJabatanDir] = useState<Dir>('asc');

  /** ---------- Load master (units, employees) ---------- */
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErrMsg(null);
      const unitsQ = supabase.from('units').select('*').order('name', { ascending: true });
      const empQ = supabase
        .from('employees')
        .select('id,nama,nip,jabatan,unit_id,status_pg,active, units:unit_id(name)')
        .order('nama', { ascending: true });

      const [{ data: unitsData, error: unitsErr }, { data: empData, error: empErr }] = await Promise.all([unitsQ, empQ]);
      if (!alive) return;

      if (unitsErr) {
        setErrMsg(unitsErr.message);
        setLoading(false);
        return;
      }
      if (empErr) {
        setErrMsg(empErr.message);
        setLoading(false);
        return;
      }

      setUnits(unitsData || []);
      setEmployees((empData as any[]) || []);
      setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  /** ---------- Load sessions history (with counts) ---------- */
  useEffect(() => {
    let alive = true;
    async function loadSessions() {
      setLoadingSessions(true);
      setErrMsg(null);

      // 1) Ambil semua sesi (batasi 100 biar enteng)
      const sQ = await supabase
        .from('attendance_sessions')
        .select('id,tanggal,jam_mulai,jam_akhir,deskripsi,created_at')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (!alive) return;

      if (sQ.error) {
        setErrMsg(sQ.error.message);
        setLoadingSessions(false);
        return;
      }

      const sessionsRaw = (sQ.data || []) as SessionLite[];

      if (sessionsRaw.length === 0) {
        setSessions([]);
        setLoadingSessions(false);
        return;
      }

      // 2) Ambil semua entries untuk sesi-sesi ini, lalu agregasi client-side (1 query)
      const ids = sessionsRaw.map((s) => s.id);
      const eQ = await supabase
        .from('attendance_entries')
        .select('session_id,status')
        .in('session_id', ids);

      if (eQ.error) {
        setErrMsg(eQ.error.message);
        setLoadingSessions(false);
        return;
      }

      const countsMap = new Map<string, { counts: Record<Status, number>; total: number }>();
      sessionsRaw.forEach((s) => {
        countsMap.set(s.id, {
          counts: { HADIR: 0, IZIN: 0, SAKIT: 0, DL: 0, TK: 0 },
          total: 0,
        });
      });

      (eQ.data as { session_id: string; status: Status }[]).forEach((r) => {
        const obj = countsMap.get(r.session_id);
        if (obj) {
          obj.counts[r.status] += 1;
          obj.total += 1;
        }
      });

      const withCounts: SessionWithCounts[] = sessionsRaw.map((s) => {
        const agg = countsMap.get(s.id)!;
        return { ...s, counts: agg.counts, total: agg.total };
      });

      setSessions(withCounts);
      setLoadingSessions(false);
    }

    loadSessions();
    return () => {
      alive = false;
    };
  }, []);

  /** ---------- Derived ---------- */
  const unitMap = useMemo(() => {
    const m = new Map<string, string>();
    units.forEach((u) => m.set(u.id, u.name));
    return m;
  }, [units]);

  const unitsSelected = useMemo(() => Object.keys(unitChecked).filter((id) => unitChecked[id]), [unitChecked]);

  const baseRows = useMemo(() => {
    if (unitsSelected.length === 0) return [] as (Employee & { units?: { name: string } | null })[];
    return employees.filter((p) => unitsSelected.includes(p.unit_id));
  }, [employees, unitsSelected]);

  /** ---------- Step helpers ---------- */
  function resetDetail() {
    setTanggal('');
    setJamMulai('08:00');
    setJamAkhir('09:00');
    setDeskripsi('');
  }
  function startFromScratch() {
    // dipanggil dari Step 1 (Buat Baru)
    resetDetail();
    setUnitChecked({});
    setStatusByEmp({});
    setStep(2);
  }
  function goStep3() {
    if (!tanggal || !jamMulai || !jamAkhir) return;
    setStep(3);
  }

  /** ---------- Load status dari sesi lama (digunakan di Step 1) ---------- */
  async function useFromHistory(sid: string) {
    setErrMsg(null);
    // 1) ambil sesi untuk prefill detail
    const sQ = await supabase
      .from('attendance_sessions')
      .select('id,tanggal,jam_mulai,jam_akhir,deskripsi')
      .eq('id', sid)
      .maybeSingle();

    if (sQ.error || !sQ.data) {
      setErrMsg(sQ.error?.message || 'Sesi tidak ditemukan.');
      return;
    }

    // set detail (bisa diedit di Step 2)
    setTanggal(sQ.data.tanggal);
    setJamMulai(fmtTime(sQ.data.jam_mulai));
    setJamAkhir(fmtTime(sQ.data.jam_akhir));
    setDeskripsi(sQ.data.deskripsi ?? '');

    // 2) ambil entries-nya, mapping employee_id -> status
    const eQ = await supabase
      .from('attendance_entries')
      .select('employee_id,status')
      .eq('session_id', sid);

    if (eQ.error) {
      setErrMsg(eQ.error.message);
      return;
    }

    const map: Record<string, Status> = {};
    const unitIds = new Set<string>();
    (eQ.data as { employee_id: string; status: Status }[]).forEach((r) => {
      map[r.employee_id] = r.status;
      const emp = employees.find((e) => e.id === r.employee_id);
      if (emp) unitIds.add(emp.unit_id);
    });

    // centang unit yang diperlukan
    const uChecked: Record<string, boolean> = {};
    unitIds.forEach((uid) => (uChecked[uid] = true));
    setUnitChecked(uChecked);

    // set statusByEmp
    setStatusByEmp(map);

    // lanjut ke Step 2 untuk cek/ubah detail
    setStep(2);
  }

  /** ---------- Save (create session + bulk set) ---------- */
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ sesiId: string; tally: Record<Status, number> } | null>(null);

  async function handleSave() {
    setErrMsg(null);
    const selections = Object.entries(statusByEmp).filter(([_, b]) => !!b) as [string, Status][];
    if (selections.length === 0) return;

    try {
      setSaving(true);

      // 1) Create session via API
      const resCreate = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_tanggal: tanggal,
          p_mulai: jamMulai,
          p_akhir: jamAkhir,
          p_deskripsi: deskripsi || null,
        }),
      });
      const jsonCreate = await resCreate.json();
      if (!resCreate.ok) throw new Error(jsonCreate?.error?.message || 'Gagal membuat sesi');
      const sessionId: string = jsonCreate.id;

      // 2) bucket per status
      const bucketMap: Record<Status, string[]> = { HADIR: [], IZIN: [], SAKIT: [], DL: [], TK: [] };
      for (const [empId, s] of selections) bucketMap[s].push(empId);

      // 3) POST bulk per status
      const calls = (Object.keys(bucketMap) as Status[]).map(async (s) => {
        const arr = bucketMap[s];
        if (arr.length === 0) return null;
        const res = await fetch('/api/attendance/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

      // tally ringkasan
      const tally: Record<Status, number> = { HADIR: 0, IZIN: 0, SAKIT: 0, DL: 0, TK: 0 };
      selections.forEach(([_, s]) => {
        tally[s] += 1;
      });

      setSaved({ sesiId: sessionId, tally });
      setStep(4);
    } catch (e: any) {
      setErrMsg(e?.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  function resetAll() {
    resetDetail();
    setUnitChecked({});
    setStatusByEmp({});
    setSaved(null);
    setStep(1);
  }

  /** ---------- Render ---------- */
  const unitsSelectedCount = unitsSelected.length;

  const sortedRows = useMemo(() => {
    let rows = baseRows.slice();
    rows = rows.sort((a, b) => {
      if (sortBy === 'nama') {
        const cmp = a.nama.localeCompare(b.nama);
        if (cmp !== 0) return sortNamaDir === 'asc' ? cmp : -cmp;
        return a.jabatan.localeCompare(b.jabatan);
      } else {
        const cmp = a.jabatan.localeCompare(b.jabatan);
        if (cmp !== 0) return sortJabatanDir === 'asc' ? cmp : -cmp;
        return a.nama.localeCompare(b.nama);
      }
    });
    return rows;
  }, [baseRows, sortBy, sortNamaDir, sortJabatanDir]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Presensi</h1>
        <p className="text-sm text-slate-500">
          Buat sesi baru atau gunakan riwayat lama, atur status per pegawai, lalu simpan.
        </p>
      </div>

      {/* Stepper indikator (4 langkah) */}
      <div className="grid grid-cols-4 gap-2">
        <div className={cn('flex items-center gap-2 rounded-xl border px-3 py-2', step === 1 ? 'bg-[#F4F7FB] border-[#003A70]' : '')}>
          <HistoryIcon className="h-4 w-4" />
          <span className="text-sm">1. Sumber Data</span>
        </div>
        <div className={cn('flex items-center gap-2 rounded-xl border px-3 py-2', step === 2 ? 'bg-[#F4F7FB] border-[#003A70]' : '')}>
          <CalendarDays className="h-4 w-4" />
          <span className="text-sm">2. Detail Sesi</span>
        </div>
        <div className={cn('flex items-center gap-2 rounded-xl border px-3 py-2', step === 3 ? 'bg-[#F4F7FB] border-[#003A70]' : '')}>
          <Users className="h-4 w-4" />
          <span className="text-sm">3. Unit & Pegawai</span>
        </div>
        <div className={cn('flex items-center gap-2 rounded-xl border px-3 py-2', step === 4 ? 'bg-[#F4F7FB] border-[#003A70]' : '')}>
          <ClipboardList className="h-4 w-4" />
          <span className="text-sm">4. Ringkasan</span>
        </div>
      </div>

      {/* STEP 1: Sumber Data */}
      {step === 1 && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mulai dari Kosong</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Buat sesi presensi baru dengan mengisi tanggal, jam, dan deskripsi secara manual.
                </p>
                <Button className="bg-[#003A70] hover:opacity-95" onClick={startFromScratch}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Buat Sesi Baru
                </Button>
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader className="pb-2 flex items-center justify-between">
                <CardTitle className="text-base inline-flex items-center gap-2">
                  <HistoryIcon className="h-4 w-4" />
                  Gunakan dari Riwayat
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => location.reload()}>
                  <RefreshCcw className="h-4 w-4 mr-1" /> Muat Ulang
                </Button>
              </CardHeader>
              <CardContent>
                {loadingSessions ? (
                  <p className="text-sm text-slate-500">Memuat riwayat…</p>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada sesi.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Waktu</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead className="text-right">Hadir</TableHead>
                          <TableHead className="text-right">Izin</TableHead>
                          <TableHead className="text-right">Sakit</TableHead>
                          <TableHead className="text-right">DL</TableHead>
                          <TableHead className="text-right">TK</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="whitespace-nowrap">{s.tanggal}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {fmtTime(s.jam_mulai)} - {fmtTime(s.jam_akhir)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{s.deskripsi || '-'}</TableCell>
                            <TableCell className="text-right">{s.counts.HADIR}</TableCell>
                            <TableCell className="text-right">{s.counts.IZIN}</TableCell>
                            <TableCell className="text-right">{s.counts.SAKIT}</TableCell>
                            <TableCell className="text-right">{s.counts.DL}</TableCell>
                            <TableCell className="text-right">{s.counts.TK}</TableCell>
                            <TableCell className="text-right">{s.total}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => useFromHistory(s.id)}>
                                Gunakan
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  Klik <b>Gunakan</b> untuk memuat status dari sesi terpilih, lalu kamu bisa ubah detailnya di langkah berikutnya.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* STEP 2: Detail Sesi */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detail Sesi</CardTitle>
          </CardHeader>
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
              <Textarea
                id="deskripsi"
                placeholder="Contoh: Rapat koordinasi proyek"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
              />
            </div>
            {errMsg && <div className="text-sm text-red-600">{errMsg}</div>}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Kembali
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={resetDetail}>
                  Reset
                </Button>
                <Button className="bg-[#003A70] hover:opacity-95" onClick={goStep3} disabled={!tanggal || !jamMulai || !jamAkhir}>
                  Lanjut ke Unit & Pegawai
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Unit & Pegawai (tanpa tabs, aksi per baris) */}
      {step === 3 && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pilih Unit Kerja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p className="text-sm text-slate-500">Memuat unit…</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {units.map((u) => (
                    <label
                      key={u.id}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border p-3 cursor-pointer',
                        unitChecked[u.id] ? 'border-[#003A70] bg-[#F4F7FB]' : ''
                      )}
                    >
                      <Checkbox
                        checked={!!unitChecked[u.id]}
                        onCheckedChange={(v) => setUnitChecked((prev) => ({ ...prev, [u.id]: Boolean(v) }))}
                      />
                      <span className="text-sm">{u.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500">Centang 1 atau beberapa unit. Pegawai di unit terpilih akan muncul di tabel.</p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-600">
              <b>{baseRows.length}</b> pegawai pada unit terpilih.
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const next = { ...statusByEmp };
                  baseRows.forEach((p) => {
                    next[p.id] = 'HADIR';
                  });
                  setStatusByEmp(next);
                }}
              >
                Set semua → Hadir
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const next = { ...statusByEmp };
                  baseRows.forEach((p) => {
                    delete next[p.id];
                  });
                  setStatusByEmp(next);
                }}
              >
                Kosongkan semua
              </Button>

              <div className="hidden sm:block h-6 w-px bg-slate-200" />

              <Button
                size="sm"
                variant="ghost"
                className="px-2"
                onClick={() => {
                  setSortBy('nama');
                  setSortNamaDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                }}
                title="Urut Nama"
              >
                Urut Nama {sortNamaDir === 'asc' ? <SortDesc className="ml-1 h-4 w-4" /> : <SortAsc className="ml-1 h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="px-2"
                onClick={() => {
                  setSortBy('jabatan');
                  setSortJabatanDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                }}
                title="Urut Jabatan"
              >
                Urut Jabatan {sortJabatanDir === 'asc' ? <SortDesc className="ml-1 h-4 w-4" /> : <SortAsc className="ml-1 h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Ringkasan Sementara</CardTitle>
              <SummaryCounts baseRows={baseRows} statusByEmp={statusByEmp as Record<string, string>} />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>NIP</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unitsSelectedCount === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-slate-500 py-8">
                          Pilih setidaknya 1 unit untuk menampilkan pegawai.
                        </TableCell>
                      </TableRow>
                    ) : loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-slate-500 py-8">
                          Memuat pegawai…
                        </TableCell>
                      </TableRow>
                    ) : sortedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-slate-500 py-8">
                          Tidak ada pegawai pada unit terpilih.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedRows.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="whitespace-nowrap">{p.nama}</TableCell>
                          <TableCell>{p.nip}</TableCell>
                          <TableCell className="whitespace-nowrap">{p.jabatan}</TableCell>
                          <TableCell className="whitespace-nowrap">{unitMap.get(p.unit_id) || p.units?.name || '-'}</TableCell>
                          <TableCell className="text-right">
                            <RowStatusControl
                              value={statusByEmp[p.id]}
                              onChange={(next) => {
                                setStatusByEmp((prev) => {
                                  const copy = { ...prev };
                                  if (!next) delete copy[p.id];
                                  else copy[p.id] = next;
                                  return copy;
                                });
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="text-xs text-slate-500">
                Tip: klik “Set semua → Hadir”, lalu ubah baris yang tidak hadir dengan dropdown.
              </div>
            </CardContent>
          </Card>

          {errMsg && <div className="text-sm text-red-600">{errMsg}</div>}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Kembali
            </Button>
            <Button
              className="bg-[#003A70] hover:opacity-95"
              onClick={handleSave}
              disabled={saving || Object.values(statusByEmp).every((v) => !v)}
            >
              {saving ? 'Menyimpan...' : 'Simpan Presensi'}
            </Button>
          </div>
        </>
      )}

      {/* STEP 4: Ringkasan */}
      {step === 4 && saved && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ringkasan Presensi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" /> <span>Presensi tersimpan.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-slate-500">ID Sesi:</span>{' '}
                  <span className="font-medium">{saved.sesiId}</span>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal:</span>{' '}
                  <span className="font-medium">{tanggal}</span>
                </div>
                <div>
                  <span className="text-slate-500">Waktu:</span>{' '}
                  <span className="font-medium">
                    {jamMulai} - {jamAkhir}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Deskripsi:</span>{' '}
                  <span className="font-medium">{deskripsi || '-'}</span>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {ALL_STATUS.map((s) => (
                  <div key={s} className="flex items-center justify-between">
                    <span>{s}</span>
                    <Badge>{saved.tally[s]}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                Kembali
              </Button>
              <Button className="bg-[#003A70] hover:opacity-95" onClick={resetAll}>
                Buat Sesi Baru
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
