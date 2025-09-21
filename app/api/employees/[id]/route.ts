// app/api/employees/[id]/route.ts
import { NextResponse } from "next/server";
import { updateEmployeeAdmin } from "@/lib/db";
import type { EmployeeUpdate } from "@/types";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const patch = (await req.json()) as EmployeeUpdate;

  if (!id) return NextResponse.json({ error: "ID diperlukan." }, { status: 400 });

  // izinkan update parsial
  const { data, error } = await updateEmployeeAdmin(id, patch);
  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json(data);
}
