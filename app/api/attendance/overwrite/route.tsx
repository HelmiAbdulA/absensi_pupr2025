/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Status = 'HADIR' | 'IZIN' | 'SAKIT' | 'DL' | 'TK';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId: string = body?.p_session_id;
    if (!sessionId) {
      return NextResponse.json({ error: { message: 'p_session_id wajib' } }, { status: 400 });
    }

    const buckets: Record<Status, string[]> = {
      HADIR: body?.p_hadir || [],
      IZIN: body?.p_izin || [],
      SAKIT: body?.p_sakit || [],
      DL: body?.p_dl || [],
      TK: body?.p_tk || [],
    };

    // DELETE lama
    const del = await supabaseAdmin
      .from('attendance_entries')
      .delete()
      .eq('session_id', sessionId);
    if (del.error) return NextResponse.json({ error: del.error }, { status: 400 });

    // INSERT ulang
    const rows = [] as Array<{ session_id: string; employee_id: string; status: Status }>;
    (Object.keys(buckets) as Status[]).forEach((st) => {
      for (const empId of buckets[st]) rows.push({ session_id: sessionId, employee_id: empId, status: st });
    });

    if (rows.length) {
      const ins = await supabaseAdmin.from('attendance_entries').insert(rows);
      if (ins.error) return NextResponse.json({ error: ins.error }, { status: 400 });
    }

    return NextResponse.json({
      session_id: sessionId,
      counts: Object.fromEntries((Object.keys(buckets) as Status[]).map(k => [k, buckets[k].length])),
    });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message || 'Gagal overwrite attendance' } }, { status: 500 });
  }
}
