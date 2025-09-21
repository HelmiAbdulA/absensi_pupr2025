/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, Search, SortAsc, SortDesc } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabaseClient";
import type { StatusKehadiran } from "@/types";

// =================== Types ===================
type Status = StatusKehadiran; // 'HADIR' | 'IZIN' | 'SAKIT' | 'DL' | 'TK'

type Row = {
  id: string;
  tanggal: string;  // 'YYYY-MM-DD'
  jam: string;      // jam_mulai
  unit: string;     // unit name
  nama: string;
  nip: string;
  status: Status;
  deskripsi: string;
  admin: string;    // admin_profiles.full_name atau '-'
};

type SortKey = "unit" | "nama" | null;
enum Dir { ASC = "asc", DESC = "desc" }

// =================== Page ===================
export default function SemuaPresensiPage() {
  // data
  const [rows, setRows] = useState<Row[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filter
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("Semua Unit");
  const [status, setStatus] = useState("Semua Status");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // sort
  const [sortKey, setSortKey] = useState<SortKey>("unit");
  const [sortDir, setSortDir] = useState<Dir>(Dir.ASC);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // =============== Load from Supabase ===============
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErr(null);

      // 1) ambil entries + relasi session + employee + unit
      const { data, error } = await supabase
        .from("attendance_entries")
        .select(`
          id,
          status,
          created_at,
          session:attendance_sessions (
            id, tanggal, jam_mulai, jam_akhir, deskripsi, created_by
          ),
          employee:employees (
            id, nama, nip, jabatan, unit_id,
            unit:unit_id ( name )
          )
        `)
        .order("created_at", { ascending: false });

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      // 2) siapkan mapping admin full_name
      const creatorIds = Array.from(
        new Set(
          (data ?? [])
            .map((r: any) => r.session?.created_by as string | undefined)
            .filter(Boolean)
        )
      );

      let adminMap = new Map<string, string>();
      if (creatorIds.length) {
        const { data: admins } = await supabase
          .from("admin_profiles")
          .select("user_id, full_name")
          .in("user_id", creatorIds);

        adminMap = new Map((admins || []).map((a) => [a.user_id, a.full_name || "Admin"]));
      }

      // 3) transform ke Row[]
      const flat: Row[] = (data || []).map((r: any) => {
        const session = r.session || {};
        const emp = r.employee || {};
        const unitName = emp.unit?.name || "-";
        return {
          id: r.id,
          tanggal: session.tanggal || "", // 'YYYY-MM-DD'
          jam: session.jam_mulai || "",
          unit: unitName,
          nama: emp.nama || "-",
          nip: emp.nip || "-",
          status: r.status as Status,
          deskripsi: session.deskripsi || "",
          admin: adminMap.get(session.created_by) || "-",
        };
      });

      // 4) units untuk filter dropdown
      const unitList = Array.from(new Set(flat.map((r) => r.unit))).filter(Boolean).sort((a,b)=>a.localeCompare(b));

      setRows(flat);
      setUnits(unitList);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, []);

  // =============== Filtering & sorting (client-side) ===============
  const filtered = useMemo(() => {
    const res = rows.filter((r) => {
      if (unit !== "Semua Unit" && r.unit !== unit) return false;
      if (status !== "Semua Status" && r.status !== (status as Status)) return false;
      if (dateFrom && r.tanggal < dateFrom) return false;
      if (dateTo && r.tanggal > dateTo) return false;
      if (q) {
        const text = `${r.nama} ${r.nip} ${r.unit} ${r.deskripsi}`.toLowerCase();
        if (!text.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    if (!sortKey) return res;
    return res.sort((a: Row, b: Row) => {
      const va = a[sortKey] as string;
      const vb = b[sortKey] as string;
      const cmp = va.localeCompare(vb);
      return sortDir === Dir.ASC ? cmp : -cmp;
    });
  }, [rows, q, unit, status, dateFrom, dateTo, sortKey, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = filtered.slice(start, end);

  function resetFilters() {
    setQ(""); setUnit("Semua Unit"); setStatus("Semua Status"); setDateFrom(""); setDateTo(""); setPage(1);
    setSortKey("unit"); setSortDir(Dir.ASC);
  }

  function toggleSort(key: SortKey) {
    if (sortKey !== key) { setSortKey(key); setSortDir(Dir.ASC); setPage(1); return; }
    setSortDir((d) => (d === Dir.ASC ? Dir.DESC : Dir.ASC)); setPage(1);
  }

  // =============== Export helpers ===============
  function getFilteredForExport() {
    return filtered.map((r) => ({
      Tanggal: r.tanggal,
      Jam: r.jam,
      Unit: r.unit,
      Nama: r.nama,
      NIP: r.nip,
      Status: r.status,
      Deskripsi: r.deskripsi,
      Admin: r.admin,
    }));
  }

  function exportCSV() {
    const rows = getFilteredForExport();
    const header = Object.keys(rows[0] || { Tanggal: "", Jam: "", Unit: "", Nama: "", NIP: "", Status: "", Deskripsi: "", Admin: "" });
    const csv = [header.join(","), ...rows.map((r) => header.map((h) => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `semua-presensi_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportXLSX() {
    const rows = getFilteredForExport();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Presensi");
    XLSX.writeFile(wb, `semua-presensi_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function exportPDF() {
    const rows = getFilteredForExport();
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Semua Presensi (hasil filter)", 14, 14);
    autoTable(doc, {
      head: [["Tanggal","Jam","Unit","Nama","NIP","Status","Deskripsi","Admin"]],
      body: rows.map((r) => [r.Tanggal, r.Jam, r.Unit, r.Nama, r.NIP, r.Status, r.Deskripsi, r.Admin]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [14, 90, 174] },
      startY: 20,
    });
    doc.save(`semua-presensi_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  // =============== UI ===============
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Semua Presensi</h1>
          <p className="text-sm text-slate-500">Filter, sorting Unit atau Nama, pagination, dan ekspor.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1"/> CSV</Button>
          <Button variant="outline" onClick={exportXLSX}><FileSpreadsheet className="h-4 w-4 mr-1"/> XLSX</Button>
          <Button variant="outline" onClick={exportPDF}><FileText className="h-4 w-4 mr-1"/> PDF</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <div className="xl:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input className="pl-8" placeholder="Cari nama / NIP / unit / deskripsi" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Unit</Label>
              <Select value={unit} onValueChange={(v) => { setUnit(v); setPage(1); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Unit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Unit">Semua Unit</SelectItem>
                  {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Status</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Status">Semua Status</SelectItem>
                  <SelectItem value="HADIR">Hadir</SelectItem>
                  <SelectItem value="IZIN">Izin</SelectItem>
                  <SelectItem value="SAKIT">Sakit</SelectItem>
                  <SelectItem value="DL">DL</SelectItem>
                  <SelectItem value="TK">TK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Dari</Label>
              <Input type="date" className="mt-1" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Sampai</Label>
              <Input type="date" className="mt-1" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Urutkan</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant={sortKey === "unit" ? "default" : "outline"} onClick={() => toggleSort("unit")} className={sortKey === "unit" ? "bg-[#003A70]" : ""}>
                  Unit {sortKey === "unit" && (sortDir === Dir.ASC ? <SortAsc className="ml-1 h-4 w-4"/> : <SortDesc className="ml-1 h-4 w-4"/>)}
                </Button>
                <Button type="button" variant={sortKey === "nama" ? "default" : "outline"} onClick={() => toggleSort("nama")} className={sortKey === "nama" ? "bg-[#003A70]" : ""}>
                  Nama {sortKey === "nama" && (sortDir === Dir.ASC ? <SortAsc className="ml-1 h-4 w-4"/> : <SortDesc className="ml-1 h-4 w-4"/>)}
                </Button>
              </div>
            </div>
            <div className="flex items-end">
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
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
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
                {loading && (
                  <TableRow><TableCell colSpan={8} className="text-sm text-slate-500">Memuat data…</TableCell></TableRow>
                )}
                {!loading && pageRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{r.tanggal}</TableCell>
                    <TableCell>{r.jam}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.unit}</TableCell>
                    <TableCell>{r.nama}</TableCell>
                    <TableCell>{r.nip}</TableCell>
                    <TableCell>
                      {r.status === "HADIR" && <Badge className="bg-[#0E5AAE]">Hadir</Badge>}
                      {r.status === "IZIN"  && <Badge variant="secondary">Izin</Badge>}
                      {r.status === "SAKIT" && <Badge variant="outline">Sakit</Badge>}
                      {r.status === "DL"    && <Badge variant="outline">DL</Badge>}
                      {r.status === "TK"    && <Badge variant="destructive">TK</Badge>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{r.deskripsi}</TableCell>
                    <TableCell>{r.admin}</TableCell>
                  </TableRow>
                ))}
                {!loading && pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-slate-500 py-10">Tidak ada data sesuai filter.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-3">
            <div className="text-xs text-slate-500">
              Menampilkan {pageRows.length} dari {total} data • Halaman {currentPage} dari {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={currentPage === 1}>Awal</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Sebelumnya</Button>
              <div className="px-3 py-1 rounded-md border text-sm">{currentPage}</div>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Berikutnya</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>Akhir</Button>
            </div>
          </div>

          {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
