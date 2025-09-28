/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/sessions/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// PATCH /api/sessions/:id
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // <-- wajib await
  try {
    const body = await req.json();
    const { p_tanggal, p_mulai, p_akhir, p_deskripsi } = body || {};
    if (!id || !p_tanggal || !p_mulai || !p_akhir) {
      return NextResponse.json({ error: { message: 'Param/Body tidak lengkap' } }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('attendance_sessions')
      .update({
        tanggal: p_tanggal,
        jam_mulai: p_mulai.length === 5 ? `${p_mulai}:00` : p_mulai,
        jam_akhir: p_akhir.length === 5 ? `${p_akhir}:00` : p_akhir,
        deskripsi: p_deskripsi ?? null,
      })
      .eq('id', id);

    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message || 'Gagal PATCH sesi' } }, { status: 500 });
  }
}

// DELETE /api/sessions/:id
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // <-- wajib await
  try {
    // Hapus entries (kalau FK CASCADE, langkah ini opsional)
    const delEntries = await supabaseAdmin.from('attendance_entries').delete().eq('session_id', id);
    if (delEntries.error) return NextResponse.json({ error: delEntries.error }, { status: 400 });

    const delSession = await supabaseAdmin.from('attendance_sessions').delete().eq('id', id);
    if (delSession.error) return NextResponse.json({ error: delSession.error }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message || 'Gagal DELETE sesi' } }, { status: 500 });
  }
}
