import { NextResponse } from "next/server";
import { setAttendanceBulkAdmin } from "@/lib/db";
import type { RpcSetAttendanceBulkArgs } from "@/types";

export async function POST(req: Request) {
  const body = (await req.json()) as RpcSetAttendanceBulkArgs;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data, error } = await setAttendanceBulkAdmin(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json({ ok: true });
}
