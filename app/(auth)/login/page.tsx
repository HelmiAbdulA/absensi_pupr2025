'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { DUMMY_ADMIN } from '@/constants'


export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    await new Promise((r) => setTimeout(r, 500))

    const ok = email.trim().toLowerCase() === DUMMY_ADMIN.email && password === DUMMY_ADMIN.password
    if (!ok) {
      setLoading(false)
      setError('Email atau kata sandi salah.')
      return
    }

    const session = {
      user: { email: DUMMY_ADMIN.email, name: DUMMY_ADMIN.name, role: DUMMY_ADMIN.role },
      issued_at: new Date().toISOString(),
    }
    try {
      localStorage.setItem('pupr_admin_session', JSON.stringify(session))
    } catch {}

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50">
      {/* Panel branding kiri */}
      <div className="relative hidden lg:flex items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#003A70] via-[#0B4A8F] to-[#0E5AAE] opacity-90" />
        <div className="relative z-10 w-full max-w-md text-white">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-[#F4C542] flex items-center justify-center shadow-lg">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 21V9l8-5 8 5v12H4z" stroke="#1A2A44" strokeWidth="1.5"/>
                <path d="M9 21v-6h6v6" stroke="#1A2A44" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold leading-tight">Sistem Presensi PUPR</h1>
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
              <h2 className="text-xl font-semibold text-slate-900">Sistem Presensi PUPR</h2>
              <p className="text-slate-500">Admin Panel</p>
            </div>
          </div>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Masuk Admin</CardTitle>
              <p className="text-sm text-slate-500">Gunakan kredensial admin untuk melanjutkan</p>
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
                        <span className="inline-flex items-center gap-1"><EyeOff className="h-4 w-4"/> Sembunyikan</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4"/> Tampilkan</span>
                      )}
                    </Button>
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
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

                <Button type="submit" className="w-full bg-[#003A70] hover:opacity-95" disabled={loading}>
                  {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Memproses</span> : 'Masuk'}
                </Button>

                <Separator className="my-2" />
                <div className="text-xs text-slate-500">
                  <p>Demo admin: {DUMMY_ADMIN.email}</p>
                  <p>Kata sandi: {DUMMY_ADMIN.password}</p>
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} PUPR · Prototipe internal
          </p>
        </div>
      </div>
    </div>
  )
}
