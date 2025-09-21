import { supabase } from "./supabaseClient";
import { supabaseAdmin } from "./supabaseAdmin";
import type {
  Employee, EmployeeInsert, EmployeeUpdate,
  Unit, AttendanceSession, AttendanceSessionInsert, AttendanceSessionUpdate,
  AttendanceEntry, AttendanceEntryInsert, AttendanceEntryUpdate,
  VRekapHarianPerUnit, VRekapPegawai,
  RpcCreateSessionArgs, RpcCreateSessionResult,
  RpcSetAttendanceBulkArgs, RpcSetAttendanceBulkResult,
  SearchGlobalRow, RpcSearchGlobalArgs
} from "@/types";

/** ========= READ (client-safe) ========= */

/** Ambil daftar pegawai (client) */
export async function getEmployees() {
  return supabase
    .from("employees")
    .select("*")
    .order("nama", { ascending: true })
    .returns<Employee[]>();
}

/** Ambil units (client) */
export async function getUnits() {
  return supabase
    .from("units")
    .select("*")
    .order("name", { ascending: true })
    .returns<Unit[]>();
}

/** Rekap harian per unit (client, view) */
export async function getRekapHarianPerUnit(params?: { tanggal?: string }) {
  let query = supabase.from("v_rekap_harian_per_unit").select("*");

  if (params?.tanggal) {
    query = query.eq("tanggal", params.tanggal);
  }

  query = query.order("unit_name", { ascending: true });

  const { data, error } = await query.returns<VRekapHarianPerUnit[]>();
  return { data, error };
}

/** Rekap per pegawai (client, view) */
export async function getRekapPegawai() {
  return supabase
    .from("v_rekap_pegawai")
    .select("*")
    .order("nama", { ascending: true })
    .returns<VRekapPegawai[]>();
}

/** Pencarian global (client) */
export async function searchGlobal(args: RpcSearchGlobalArgs) {
  return supabase
    .rpc("search_global", args)
    .returns<SearchGlobalRow[]>();
}

/** ========= WRITE (server-only / admin) ========= */

/** Buat sesi presensi (admin) */
export async function createSessionAdmin(args: RpcCreateSessionArgs) {
  // pakai service role → bypass RLS
  return supabaseAdmin
    .rpc("create_session", args)
    .returns<RpcCreateSessionResult>();
}

/** Set attendance massal (admin) */
export async function setAttendanceBulkAdmin(args: RpcSetAttendanceBulkArgs) {
  return supabaseAdmin
    .rpc("set_attendance_bulk", args)
  // void → null
    .returns<RpcSetAttendanceBulkResult>();
}

/** CRUD pegawai (admin) */
export async function insertEmployeeAdmin(payload: EmployeeInsert) {
  return supabaseAdmin
    .from("employees")
    .insert(payload)
    .select("*")
    .single()
    .returns<Employee>();
}

export async function updateEmployeeAdmin(id: string, patch: EmployeeUpdate) {
  return supabaseAdmin
    .from("employees")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single()
    .returns<Employee>();
}

export async function deleteEmployeeAdmin(id: string) {
  return supabaseAdmin
    .from("employees")
    .delete()
    .eq("id", id);
}

/** CRUD sesi (admin) */
export async function insertSessionAdmin(payload: AttendanceSessionInsert) {
  return supabaseAdmin
    .from("attendance_sessions")
    .insert(payload)
    .select("*")
    .single()
    .returns<AttendanceSession>();
}

export async function updateSessionAdmin(id: string, patch: AttendanceSessionUpdate) {
  return supabaseAdmin
    .from("attendance_sessions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single()
    .returns<AttendanceSession>();
}

/** CRUD entries (admin) */
export async function insertEntryAdmin(payload: AttendanceEntryInsert) {
  return supabaseAdmin
    .from("attendance_entries")
    .insert(payload)
    .select("*")
    .single()
    .returns<AttendanceEntry>();
}

export async function updateEntryAdmin(id: string, patch: AttendanceEntryUpdate) {
  return supabaseAdmin
    .from("attendance_entries")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single()
    .returns<AttendanceEntry>();
}
