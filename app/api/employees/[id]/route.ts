// app/api/employees/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { updateEmployeeAdmin } from "@/lib/db";
import type { EmployeeUpdate } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params; // ✅ params adalah Promise, wajib di-await
  if (!id) return NextResponse.json({ error: "ID diperlukan." }, { status: 400 });

  const patch = (await req.json()) as EmployeeUpdate;

  const { data, error } = await updateEmployeeAdmin(id, patch);
  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json(data);
}
