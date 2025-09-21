import { NextResponse } from "next/server";
import { createSessionAdmin } from "@/lib/db";
import type { RpcCreateSessionArgs } from "@/types";

export async function POST(req: Request) {
  const body = (await req.json()) as RpcCreateSessionArgs;

  const { data, error } = await createSessionAdmin(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  return NextResponse.json({ id: data });
}
