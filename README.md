This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



Absensi PUPR 2025

Aplikasi Absensi PUPR 2025 adalah sistem presensi berbasis web dengan stack Next.js (App Router) dan Supabase. Proyek ini ditujukan untuk pengelolaan sesi absensi, pencatatan kehadiran pegawai, dan rekap sederhana.

Catatan: README ini menjelaskan cara menjalankan aplikasi tanpa membocorkan nilai variabel rahasia. Hanya nama variabel yang dicantumkan agar pengguna paham cara menyiapkan lingkungan.


🚀 Fitur Utama

Autentikasi & penyimpanan data via Supabase

Manajemen sesi absensi

Pencatatan kehadiran per pegawai

Rekap/daftar absensi (tampilan tabel)

Siap untuk deploy ke Vercel


🧰 Teknologi

Next.js (App Router)

TypeScript

Tailwind CSS / shadcn/ui (opsional)

Supabase (Database + Auth + Storage)


✅ Prasyarat

Sebelum mulai, pastikan sudah terpasang:

Node.js (disarankan v18+ atau LTS terbaru)

npm atau pnpm/yarn

Akun Supabase untuk membuat Project & mendapatkan kredensial


📦 Instalasi

Clone repo:

git clone https://github.com/HelmiAbdulA/absensi_pupr2025.git
cd absensi_pupr2025


Install dependensi:

# pilih salah satu
npm install
# atau
yarn
# atau
pnpm install


🔐 Konfigurasi Environment (.env)

Buat file .env di root proyek (sejajar dengan package.json). Jangan commit nilai aslinya. Isi hanya nama variabel berikut, lalu isilah nilainya sendiri di lingkungan lokal/deploy:
# Supabase (Client)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Supabase (Server – gunakan dengan hati-hati, hanya di server)
SUPABASE_SERVICE_ROLE_KEY=


Dari mana mendapatkan nilainya?
Masuk ke Supabase Dashboard → Project kamu → Project Settings → API

NEXT_PUBLIC_SUPABASE_URL = Project URL

NEXT_PUBLIC_SUPABASE_ANON_KEY = anon public api key

SUPABASE_SERVICE_ROLE_KEY = service_role key (jangan gunakan di client/browser)


Daftar variabel .env di atas mengacu pada catatan yang kamu berikan. 

CATATAN
▶️ Menjalankan Secara Lokal
Jalankan development server:
npm run dev
# http://localhost:3000


Build & start (mode produksi):
npm run build
npm start

🗂️ Struktur Direktori (contoh)
absensi_pupr2025/
├─ app/                # App Router (route, layout, API routes)
├─ components/         # Komponen UI
├─ lib/                # Helper (client Supabase, utils)
├─ public/             # Asset publik
├─ styles/             # Tailwind / global CSS
├─ .env                # Variabel lingkungan (jangan commit)
└─ package.json


Struktur bisa sedikit berbeda tergantung implementasi di repo.

🔌 Skrip NPM (umum)

Beberapa skrip umum (cek package.json di proyekmu):

{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}

🗄️ Persiapan Database di Supabase (Garis Besar)

Buat Project baru di Supabase.

Buat tabel yang diperlukan (mis. employees, attendance_sessions, attendance_data, dsb).

(Opsional) Atur RLS (Row Level Security) & Policies sesuai kebutuhan.

(Opsional) Import seed data jika tersedia.

Skema dan seed tidak dicantumkan di sini agar aman. Jika kamu butuh contoh skema, tambahkan file SQL terpisah di repo dan rujuk di README.

☁️ Deploy ke Vercel (Opsional)

Push repo ke GitHub (public/private sesuai kebutuhan).

Hubungkan repo di Vercel.

Pada Project Settings → Environment Variables di Vercel, tambahkan variabel:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY (hanya jika benar-benar diperlukan untuk server actions/API)

Deploy.

Penting: Pastikan JANGAN mengekspos SUPABASE_SERVICE_ROLE_KEY ke client. Simpan hanya sebagai Server Environment Variable.

🧪 Pengujian Cepat

Buka http://localhost:3000

Coba buat Sesi Absensi, lalu catat kehadiran pada sesi tersebut

Periksa data masuk di Supabase Table Editor

🧯 Troubleshooting

Blank page / 500 saat build
Cek kembali variabel .env. Pastikan URL & keys tidak kosong di lingkungan yang sesuai.

Tidak bisa tulis data
Cek RLS policies di Supabase atau role key yang digunakan pada API Route (server).

CORS/Network error
Pastikan URL Supabase benar (gunakan Project URL, bukan studio URL).

Auth error
Aktifkan & konfigurasi Auth Providers di Supabase sesuai kebutuhan aplikasi.

👐 Kontribusi

Buat branch dari main

Lakukan perubahan

Buka Pull Request dengan deskripsi perubahan yang jelas
