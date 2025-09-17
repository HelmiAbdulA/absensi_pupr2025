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
