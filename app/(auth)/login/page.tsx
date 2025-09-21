"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { DUMMY_ADMIN } from "@/constants";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return; // belum login → tetap di login

      // cek admin dulu
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (mounted && isAdmin) {
        router.replace("/dashboard");
        router.refresh(); // sinkronkan RSC dengan cookie baru
      }
    }
    checkSession();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1) Login ke Supabase
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (signInError) {
        setError(
          signInError.message || "Gagal masuk. Periksa email/kata sandi."
        );
        setLoading(false);
        return;
      }

      // 2) Cek admin via RPC is_admin()
      const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin");
      if (adminErr) {
        // kalau ada error saat cek admin, kita aman-kan dengan sign out
        await supabase.auth.signOut();
        setError(adminErr.message || "Gagal memverifikasi hak akses admin.");
        setLoading(false);
        return;
      }

      if (!isAdmin) {
        await supabase.auth.signOut();
        setError(
          "Akun Anda bukan admin. Hubungi administrator untuk mendapatkan akses."
        );
        setLoading(false);
        return;
      }

      // 3) Sukses → redirect
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50">
      {/* Panel branding kiri */}
      <div className="relative hidden lg:flex items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#003A70] via-[#0B4A8F] to-[#0E5AAE] opacity-90" />
        <div className="relative z-10 w-full max-w-md text-white">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 flex items-center justify-center shadow-lg">
              <Image
                src="/logo.jpg"
                alt="logo"
                width={65}
                height={65}
                className=""
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold leading-tight">
                Sistem Presensi PUPR
              </h1>
              <p className="opacity-90">Admin Panel</p>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#F4C542]" />
              <p>Keamanan akses hanya untuk admin</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#F4C542]" />
              <p>Input presensi terpusat dan terkontrol</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#F4C542]" />
              <p>Laporan cepat dengan ekspor data</p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel form kanan */}
      <div className="flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#003A70] flex items-center justify-center">
              <div className="h-5 w-5 rounded-sm bg-[#F4C542]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Sistem Presensi PUPR
              </h2>
              <p className="text-slate-500">Admin Panel</p>
            </div>
          </div>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-2">
              <div>
                <CardTitle className="text-xl">Masuk Admin</CardTitle>
                <p className="text-sm text-slate-500">
                  Gunakan kredensial admin untuk melanjutkan
                </p>
              </div>
              
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="mt-2 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@pupr.go.id"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Kata sandi</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword((s) => !s)}
                      className="h-8 px-2 text-[#0E5AAE]"
                    >
                      {showPassword ? (
                        <span className="inline-flex items-center gap-1">
                          <EyeOff className="h-4 w-4" /> Sembunyikan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-4 w-4" /> Tampilkan
                        </span>
                      )}
                    </Button>
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#003A70] hover:opacity-95"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Memproses
                    </span>
                  ) : (
                    "Masuk"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} PUPR · Prototipe internal
          </p>
        </div>
      </div>
    </div>
  );
}
