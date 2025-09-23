/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();

  // form state
  const [email, setEmail] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // ui state
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // load current user email
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;
      if (error) {
        setErr(error.message);
        return;
      }
      const mail = data.session?.user?.email ?? '';
      setEmail(mail);
      // kalau belum login, lempar ke /login
      if (!data.session) router.replace('/login');
    })();
    return () => { alive = false; };
  }, [router]);

  function validate(): string | null {
    if (!currentPassword || !newPassword || !confirm) return 'Semua kolom wajib diisi.';
    if (newPassword.length < 8) return 'Password baru minimal 8 karakter.';
    if (newPassword !== confirm) return 'Konfirmasi password tidak cocok.';
    if (newPassword === currentPassword) return 'Password baru tidak boleh sama dengan password saat ini.';
    return null;
    // tambahkan aturan lain jika perlu (angka, huruf besar, dsb)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    try {
      setLoading(true);

      // 1) re-authenticate (pastikan current password benar)
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthErr) {
        throw new Error('Password saat ini salah.');
      }

      // 2) update password
      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) throw updErr;

      setOk('Password berhasil diubah. Kamu akan keluar dan perlu login kembali.');
      // 3) sign out & redirect
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.replace('/login');
      }, 1200);
    } catch (e: any) {
      setErr(e?.message || 'Gagal mengubah password.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pengaturan</h1>
          <p className="text-sm text-slate-500">Ganti password akun kamu.</p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-1" /> Keluar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ganti Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={email} readOnly className="bg-slate-50" />
            </div>
            <div className="grid gap-2">
              <Label>Password saat ini</Label>
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="grid gap-2">
              <Label>Password baru</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
              />
            </div>
            <div className="grid gap-2">
              <Label>Konfirmasi password baru</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Ulangi password baru"
              />
            </div>

            {err && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}
            {ok && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {ok}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="submit"
                className="bg-[#003A70] hover:opacity-95"
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-1" />
                {loading ? 'Menyimpan…' : 'Simpan Password'}
              </Button>
            </div>
          </form>

          <p className="mt-3 text-xs text-slate-500">
            Setelah password diubah, kamu akan diminta untuk login ulang.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
