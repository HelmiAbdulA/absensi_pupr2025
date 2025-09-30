/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tambahkan baris ini
  eslint: {
    // Peringatan: Ini akan sepenuhnya menonaktifkan ESLint selama proses build.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig