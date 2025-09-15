'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Halaman root kosong -> redirect ke /dashboard jika login, atau ke /auth/login jika belum
export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('pupr_admin_session') : null
    if (raw) {
      router.replace('/dashboard')
    } else {
      router.replace('/auth/login')
    }
  }, [router])

  return null
}
