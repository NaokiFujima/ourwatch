# OurWatch

Web app streaming pribadi untuk dua pengguna (React + Vite + Tailwind + Supabase). Responsif dan bisa dipasang di Android (Chrome > menu ⋮ > "Tambahkan ke layar utama").

## Setup
1. Buat project di supabase.com. Buka **SQL Editor**, jalankan isi `supabase/schema.sql`.
2. Auth > Providers > Email: matikan **Allow new users to sign up**. Lalu Auth > Users > **Add user** untuk dua akun (centang auto-confirm). Akun ketiga otomatis ditolak oleh database.
3. Salin `.env.example` ke `.env`, isi URL dan anon key dari Project Settings > API.
4. `npm install` lalu `npm run dev` (buka dari HP lewat IP laptop, satu Wi-Fi).

## Deploy ke GitHub Pages
Push ke repo GitHub (branch `main`). Settings > Pages > Source: **GitHub Actions**. Tambahkan secrets `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di Settings > Secrets > Actions.

## Catatan penting
- Paket gratis Supabase membatasi ukuran file (default 50 MB per file). Untuk film 1-1,5 GB, naikkan batas di Storage settings (butuh paket berbayar) atau pakai storage lain (mis. Cloudflare R2 / Backblaze B2) dan ganti bagian upload di `src/App.jsx`.
- Upload memakai upload standar tanpa bar progres dan tanpa resume (PRD FR-04/NFR-06 belum penuh). Untuk file besar, gunakan resumable upload (TUS).
- Format video: MP4 H.264/AAC agar bisa diputar di Android.
- Keputusan terbuka PRD (subtitle, retensi chat, hak hapus) belum diimplementasikan; saat ini kedua akun boleh menghapus semua film/room.
