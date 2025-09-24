/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableHeader, TableRow, TableHead, TableCell, TableBody,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Download, Plus, UserPlus, FileDown, Filter, RefreshCw,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from 'lucide-react';
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
} from 'recharts';

/* =========================================================
 * TYPES
 * =======================================================*/
type UUID = string;
type Status = 'HADIR' | 'IZIN' | 'SAKIT' | 'DL' | 'TK';

type Unit = { id: UUID; name: string };
type Employee = {
  id: UUID; nama: string; nip: string; jabatan: string;
  unit_id: UUID; active: boolean;
};

type SessionLite = {
  id: UUID;
  tanggal: string;            // 'YYYY-MM-DD'
  jam_mulai: string;          // 'HH:mm:ss' (pgsql time)
  jam_akhir: string;          // 'HH:mm:ss'
  deskripsi: string | null;
  created_at: string;         // ISO
};

type EntryJoined = {
  id: UUID;
  status: Status;
  created_at: string;
  session: { tanggal: string; jam_mulai: string } | null;
  employee: {
    nama: string; nip: string;
    unit_id: UUID;
    unit: { name: string } | null;
  } | null;
};

/* =========================================================
 * SMALL UTILS
 * =======================================================*/
function fmtTimeHHmm(t?: string | null) {
  if (!t) return '';
  return t.slice(0, 5);
}
function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function ymdNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* =========================================================
 * COMPONENT
 * =======================================================*/
const COLORS = ['#0E5AAE', '#F4C542', '#9CA3AF', '#22C55E', '#EF4444']; // HADIR, IZIN, SAKIT, DL, TK

export default function DashboardPage() {
  // filters
  const [unitFilter, setUnitFilter] = useState<string>('Semua Unit');
  const [statusFilter, setStatusFilter] = useState<string>('Semua Status');
  const [q, setQ] = useState('');

  // master/derived data
  const [units, setUnits] = useState<Unit[]>([]);
  const [totalEmployees, setTotalEmployees] = useState<number>(0);

  // sessions today
  const [sessionsToday, setSessionsToday] = useState<SessionLite[]>([]);

  // recent attendance entries (joined)
  const [recentEntries, setRecentEntries] = useState<EntryJoined[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  // trend
  const [trendData, setTrendData] = useState<Array<{ day: string; hadir: number }>>([]);

  // ========= NEW: Pagination state for "Presensi Terbaru" =========
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1); // 1-based

  // load all widgets concurrently
  useEffect(() => {
    let alive = true;

    async function load() {
      setErr(null);
      setLoading(true);

      const YMD = todayYMD();
      const from7 = ymdNDaysAgo(6); // 6 hari ke belakang + hari ini = 7 titik

      try {
        // 1) units
        const uQ = supabase.from('units').select('id,name').order('name', { ascending: true });

        // 2) total employees active
        const eCountQ = supabase.from('employees').select('*', { count: 'exact', head: true }).eq('active', true);

        // 3) sessions today
        const sTodayQ = supabase
          .from('attendance_sessions')
          .select('id,tanggal,jam_mulai,jam_akhir,deskripsi,created_at')
          .eq('tanggal', YMD)
          .order('jam_mulai', { ascending: true });

        // 4) recent entries (limit 100), joined with session + employee + unit
        const entriesQ = supabase
          .from('attendance_entries')
          .select(`
            id,
            status,
            created_at,
            session:session_id ( tanggal, jam_mulai ),
            employee:employee_id (
              nama, nip, unit_id,
              unit:unit_id ( name )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        // 5) trend hadir 7 hari
        const sRangeQ = supabase
          .from('attendance_sessions')
          .select('id,tanggal')
          .gte('tanggal', from7)
          .lte('tanggal', YMD);

        const [{ data: unitsData, error: uErr },
               { count: empCount, error: eErr },
               { data: sToday, error: sTodayErr },
               { data: entriesData, error: entErr },
               { data: sRange, error: sRangeErr },
        ] = await Promise.all([uQ, eCountQ, sTodayQ, entriesQ, sRangeQ]);

        if (!alive) return;

        if (uErr) throw uErr;
        if (eErr) throw eErr;
        if (sTodayErr) throw sTodayErr;
        if (entErr) throw entErr;
        if (sRangeErr) throw sRangeErr;

        setUnits(unitsData || []);
        setTotalEmployees(empCount ?? 0);
        setSessionsToday((sToday || []) as SessionLite[]);
        setRecentEntries((entriesData || []) as EntryJoined[]);

        // trend hadir
        const sessionIds = (sRange || []).map((s) => s.id);
        let trend: Array<{ day: string; hadir: number }> = [];
        if (sessionIds.length > 0) {
          const entHadirQ = await supabase
            .from('attendance_entries')
            .select('session_id,status')
            .eq('status', 'HADIR')
            .in('session_id', sessionIds);

          if (entHadirQ.error) throw entHadirQ.error;

          const sid2date = new Map<string, string>();
          (sRange || []).forEach((s) => sid2date.set(s.id, s.tanggal));

          const tally = new Map<string, number>();
          (entHadirQ.data || []).forEach((r) => {
            const tgl = sid2date.get(r.session_id);
            if (!tgl) return;
            tally.set(tgl, (tally.get(tgl) || 0) + 1);
          });

          const labels: string[] = [];
          for (let i = 6; i >= 0; i--) labels.push(ymdNDaysAgo(i));
          trend = labels.map((tgl) => {
            const d = new Date(tgl);
            const label = d.toLocaleDateString('id-ID', { weekday: 'short' });
            return { day: label, hadir: tally.get(tgl) || 0 };
          });
        }
        setTrendData(trend);
      } catch (e: any) {
        setErr(e?.message || 'Gagal memuat dashboard.');
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  // summary hari ini
  const todaySummary = useMemo(() => {
    const YMD = todayYMD();
    const rows = recentEntries.filter(r => r.session?.tanggal === YMD);
    const total = rows.length;
    const count: Record<Status, number> = { HADIR: 0, IZIN: 0, SAKIT: 0, DL: 0, TK: 0 };
    rows.forEach((r) => { count[r.status] += 1; });
    const hadir = count.HADIR;
    const hadirPct = total ? Math.round((hadir / total) * 100) : 0;
    return { total, hadir, hadirPct, count };
  }, [recentEntries]);

  // unit list for filter
  const unitOptions = useMemo(() => ['Semua Unit', ...units.map(u => u.name)], [units]);

  // filter recentEntries by filter UI
  const filtered = useMemo(() => {
    return recentEntries.filter((r) => {
      const unitName = r.employee?.unit?.name || '-';
      if (unitFilter !== 'Semua Unit' && unitName !== unitFilter) return false;
      if (statusFilter !== 'Semua Status' && r.status !== statusFilter) return false;
      if (q) {
        const text = `${r.employee?.nama || ''} ${r.employee?.nip || ''} ${unitName}`.toLowerCase();
        if (!text.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [recentEntries, unitFilter, statusFilter, q]);

  // ========= NEW: Pagination derived =========
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pageSize)),
    [filtered.length, pageSize]
  );

  useEffect(() => {
    // reset ke page 1 saat filter/search/pageSize berubah
    setCurrentPage(1);
  }, [unitFilter, statusFilter, q, pageSize]);

  useEffect(() => {
    // clamp jika currentPage > totalPages
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // pie data from today summary
  const pieData = useMemo(
    () => [
      { name: 'Hadir', value: todaySummary.count.HADIR },
      { name: 'Izin', value: todaySummary.count.IZIN },
      { name: 'Sakit', value: todaySummary.count.SAKIT },
      { name: 'DL', value: todaySummary.count.DL },
      { name: 'TK', value: todaySummary.count.TK },
    ],
    [todaySummary]
  );

  // csv export for filtered
  function exportCSV() {
    const header = ['Tanggal', 'Jam', 'Unit', 'Nama', 'NIP', 'Status'];
    const rows = filtered.map((r) => [
      r.session?.tanggal ?? '',
      fmtTimeHHmm(r.session?.jam_mulai),
      r.employee?.unit?.name ?? '-',
      r.employee?.nama ?? '-',
      r.employee?.nip ?? '-',
      r.status,
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presensi_terbaru_${todayYMD()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sesiHariIniCount = sessionsToday.length;
  const sesiHariIniList = sessionsToday.map(s => fmtTimeHHmm(s.jam_mulai)).filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      {/* ACTION BAR */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button className="bg-[#003A70] hover:opacity-95" onClick={() => location.assign('/presensi')}>
            <Plus className="h-4 w-4 mr-1" /> Buat Presensi
          </Button>
          <Button variant="outline" onClick={() => location.assign('/pegawai')}>
            <UserPlus className="h-4 w-4 mr-1" /> Tambah Pegawai
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <FileDown className="h-4 w-4 mr-1" /> Ekspor
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Cari nama / NIP / unit"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-64"
          />
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map((u) => (
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
              <SelectItem value="DL">DL</SelectItem>
              <SelectItem value="TK">TK</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" aria-label="Refresh" onClick={() => location.reload()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ERROR/LOADING */}
      {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Total Pegawai Aktif</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{totalEmployees}</p>
            <p className="text-xs text-slate-500 mt-1">Terdata pada sistem</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Sesi Hari Ini</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{sesiHariIniCount}</p>
            <p className="text-xs text-slate-500 mt-1">{sesiHariIniList ? `Mulai ${sesiHariIniList}` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Hadir Hari Ini</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{todaySummary.hadir}</p>
            <p className="text-xs text-slate-500 mt-1">Dari {todaySummary.total} entri</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Persentase Hadir</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{todaySummary.hadirPct}%</p>
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
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
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
              <ReBarChart data={trendData}>
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
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Unduh CSV
            </Button>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-slate-500 py-10">
                      Memuat data…
                    </TableCell>
                  </TableRow>
                )}

                {!loading && paginated.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{r.session?.tanggal ?? ''}</TableCell>
                    <TableCell>{fmtTimeHHmm(r.session?.jam_mulai)}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.employee?.unit?.name ?? '-'}</TableCell>
                    <TableCell>{r.employee?.nama ?? '-'}</TableCell>
                    <TableCell>{r.employee?.nip ?? '-'}</TableCell>
                    <TableCell>
                      {r.status === 'HADIR' && <Badge className="bg-[#0E5AAE]">Hadir</Badge>}
                      {r.status === 'IZIN' && <Badge variant="secondary">Izin</Badge>}
                      {r.status === 'SAKIT' && <Badge variant="outline">Sakit</Badge>}
                      {r.status === 'DL'    && <Badge variant="secondary">DL</Badge>}
                      {r.status === 'TK'    && <Badge variant="destructive">TK</Badge>}
                    </TableCell>
                  </TableRow>
                ))}

                {!loading && paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-slate-500 py-10">
                      Tidak ada data sesuai filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* ========= NEW: Pagination controls ========= */}
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Total: {filtered.length} entri
              {filtered.length > 0 && (
                <>
                  {' · '}Menampilkan {((currentPage - 1) * pageSize) + 1}
                  {'–'}{Math.min(currentPage * pageSize, filtered.length)}
                  {' '}dari {filtered.length}
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Rows per page</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue placeholder={String(pageSize)} />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50, 100].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || loading || filtered.length === 0}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading || filtered.length === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="mx-2 text-xs text-slate-600">
                  Page {currentPage} / {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || loading || filtered.length === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || loading || filtered.length === 0}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LOG AKTIVITAS TERAKHIR */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Log Aktivitas</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Lihat detail rekam jejak admin di halaman <b>Log Aktivitas</b>.
          </p>
          <Separator className="my-3" />
          <Button variant="outline" size="sm" onClick={() => location.assign('/log')}>
            <Filter className="h-4 w-4 mr-1" /> Lihat semua log
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
