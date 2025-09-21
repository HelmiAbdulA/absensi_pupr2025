// app/api/employees/route.ts
import { NextResponse } from "next/server";
import { insertEmployeeAdmin } from "@/lib/db";
import type { EmployeeInsert } from "@/types";

export async function POST(req: Request) {
  const body = (await req.json()) as EmployeeInsert;

  if (!body?.nama || !body?.nip || !body?.jabatan || !body?.unit_id) {
    return NextResponse.json({ error: "Data wajib tidak lengkap." }, { status: 400 });
  }

  // normalisasi optional
  const payload: EmployeeInsert = {
    nama: body.nama.trim(),
    nip: body.nip.trim(),
    jabatan: body.jabatan.trim(),
    unit_id: body.unit_id,
    status_pg: body.status_pg ?? "ASN",
    active: body.active ?? true,
  };

  const { data, error } = await insertEmployeeAdmin(payload);
  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json(data);
}
