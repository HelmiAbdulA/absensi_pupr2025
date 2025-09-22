export type Status = 'HADIR' | 'IZIN' | 'SAKIT' | 'DL' | 'TK'

export type AttendanceRow = {
  id: string
  tanggal: string
  jam: string
  unit: string
  nama: string
  nip: string
  status: Status
  admin: string
}

export type Pegawai = {
  id: string
  nama: string
  nip: string
  jabatan: string
  unit: string
  statusPegawai: 'ASN' | 'non-ASN'
  aktif: boolean
}

export type Row = {
  id: string
  tanggal: string // yyyy-mm-dd
  jam: string // HH:mm
  unit: string
  nama: string
  nip: string
  status: Status
  deskripsi: string
  admin: string
}

// lib/types.ts

/** Primitives */
export type UUID = string;            // e.g. '8d8c8d01-...'
export type TimestampString = string; // ISO timestamp
export type DateString = string;      // 'YYYY-MM-DD'
export type TimeString = string;      // 'HH:mm:ss' or 'HH:mm'

/** ENUMS (harus match ENUM di DB) */
export type StatusKehadiran = 'HADIR' | 'IZIN' | 'SAKIT' | 'DL' | 'TK';
export const STATUS_KEHADIRAN: StatusKehadiran[] = ['HADIR','IZIN','SAKIT','DL','TK'];

export type StatusPegawai = 'ASN' | 'NON_ASN';
export const STATUS_PEGAWAI: StatusPegawai[] = ['ASN','NON_ASN'];

/** TABLE ROW TYPES */
// public.units
export interface Unit {
  id: UUID;
  name: string;
  created_at: TimestampString;
}

// public.employees
export interface Employee {
  id: UUID;
  nama: string;
  nip: string;
  jabatan: string;
  unit_id: UUID;
  status_pg: StatusPegawai;
  active: boolean;
  created_at: TimestampString;
  updated_at: TimestampString;
  // generated column (read-only)
  // search_tsv: tsvector (tidak diekspos di TypeScript)
}

// public.admin_profiles  (tanpa RLS untuk pemeriksaan admin)
export interface AdminProfile {
  user_id: UUID;       // references auth.users(id)
  full_name: string | null;
  is_admin: boolean;
  created_at: TimestampString;
}

// public.attendance_sessions
export interface AttendanceSession {
  id: UUID;
  tanggal: DateString;
  jam_mulai: TimeString;
  jam_akhir: TimeString;
  deskripsi: string | null;
  created_by: UUID | null; // bisa null saat seed via SQL editor
  created_at: TimestampString;
}

// public.attendance_entries
export interface AttendanceEntry {
  id: UUID;
  session_id: UUID;
  employee_id: UUID;
  status: StatusKehadiran;
  note: string | null;
  created_at: TimestampString;
}

// public.settings (singleton id=1)
export interface Setting {
  id: number; // 1
  default_status: StatusKehadiran;
  template_catatan: string | null;
  updated_at: TimestampString;
}

// public.activity_logs
export interface ActivityLog {
  id: number; // bigserial
  at: TimestampString;
  actor_id: UUID | null;
  action: string; // 'CREATE_SESSION' | 'SET_STATUS' | 'EXPORT' | ...
  target_id: UUID | null;
  meta: Record<string, unknown>;
}

/** VIEW ROW TYPES */
// public.v_rekap_harian_per_unit
export interface VRekapHarianPerUnit {
  tanggal: DateString;
  unit_id: UUID;
  unit_name: string;
  hadir: number;
  izin: number;
  sakit: number;
  dl: number;
  tk: number;
  total: number;
}

// public.v_rekap_pegawai
export interface VRekapPegawai {
  id: UUID;         // employee id
  nama: string;
  nip: string;
  jabatan: string;
  unit_id: UUID;
  hadir: number;
  izin: number;
  sakit: number;
  dl: number;
  tk: number;
  total: number;
}

/** INSERT / UPDATE payload helpers
 *  (biar jelas mana field yang wajib saat insert/update)
 */
export type UnitInsert = Pick<Unit, 'name'>;
export type UnitUpdate = Partial<Pick<Unit, 'name'>>;

export type EmployeeInsert = Pick<Employee, 'nama' | 'nip' | 'jabatan' | 'unit_id'> & {
  status_pg?: StatusPegawai; // default 'ASN'
  active?: boolean;          // default true
};
export type EmployeeUpdate = Partial<
  Pick<Employee, 'nama' | 'nip' | 'jabatan' | 'unit_id' | 'status_pg' | 'active'>
>;

export type AdminProfileInsert = {
  user_id: UUID;
  full_name?: string | null;
  is_admin?: boolean; // default true
};
export type AdminProfileUpdate = Partial<Pick<AdminProfile, 'full_name' | 'is_admin'>>;

export type AttendanceSessionInsert = Pick<
  AttendanceSession,
  'tanggal' | 'jam_mulai' | 'jam_akhir'
> & {
  deskripsi?: string | null;
  created_by?: UUID | null; // biasanya otomatis via auth.uid() di RPC
};
export type AttendanceSessionUpdate = Partial<
  Pick<AttendanceSession, 'tanggal' | 'jam_mulai' | 'jam_akhir' | 'deskripsi'>
>;

export type AttendanceEntryInsert = Pick<
  AttendanceEntry,
  'session_id' | 'employee_id' | 'status'
> & {
  note?: string | null;
};
export type AttendanceEntryUpdate = Partial<Pick<AttendanceEntry, 'status' | 'note'>>;

export type SettingUpdate = Partial<Pick<Setting, 'default_status' | 'template_catatan'>>;

export type ActivityLogInsert = Pick<ActivityLog, 'action'> & {
  at?: TimestampString;
  actor_id?: UUID | null;
  target_id?: UUID | null;
  meta?: Record<string, unknown>;
};

/** RPC (FUNCTIONS) TYPES */
// create_session(p_tanggal date, p_mulai time, p_akhir time, p_deskripsi text) returns uuid
export interface RpcCreateSessionArgs {
  p_tanggal: DateString;
  p_mulai: TimeString;    // '08:00' atau '08:00:00'
  p_akhir: TimeString;    // '09:00' atau '09:00:00'
  p_deskripsi?: string | null;
}
export type RpcCreateSessionResult = UUID;

// set_attendance_bulk(p_session_id uuid, p_rows uuid[], p_status status_kehadiran, p_note text)
export interface RpcSetAttendanceBulkArgs {
  p_session_id: UUID;
  p_rows: UUID[];
  p_status: StatusKehadiran;
  p_note?: string | null;
}
export type RpcSetAttendanceBulkResult = null; // void

// search_global(q text) returns (source text, id uuid, title text, subtitle text)
export interface SearchGlobalRow {
  source: 'employee';
  id: UUID;
  title: string;
  subtitle: string;
}
export interface RpcSearchGlobalArgs {
  q: string;
}
export type RpcSearchGlobalResult = SearchGlobalRow[];

/** Helper untuk menghindari any pada Supabase response */
export interface QuerySuccess<T> {
  data: T;
  error: null;
}
export interface QueryFailure {
  data: null;
  error: { message: string; details?: string; hint?: string; code?: string };
}
export type QueryResult<T> = QuerySuccess<T> | QueryFailure;

/** Contoh pemakaian (hint):
 * const res = await supabase
 *   .from<Employee>('employees')
 *   .select('*')
 *   .returns<Employee[]>(); // supaya tidak any
 */


// === NEW: presensi map & entries lite ===
export type DataPresensi = Record<string, Status> // employee_id -> status

export type AttendanceEntryLite = {
  employee_id: string
  status: Status
  // opsional kalau mau tahu unit-nya saat hydrate:
  employees?: { unit_id: string } | null
}

// tambahkan ini kalau mau simpan ringkas jumlah status di list:
export type SessionLite = {
  id: string
  tanggal: string
  jam_mulai: string
  jam_akhir: string
  deskripsi: string | null
  created_at: string
  // optional ringkasan jumlah per status (tidak wajib)
  counts?: Partial<Record<Status, number>>
}