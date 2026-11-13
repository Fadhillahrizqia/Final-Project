# LiveQuiz

Platform kuis live real-time untuk pembelajaran. Pengajar membuat kuis dan memulai sesi, peserta bergabung dengan kode tanpa akun, lalu menjawab soal yang tampil serentak dengan skor yang dihitung server.

**Live demo:** https://final-project-blush-pi-36.vercel.app
**Proyek:** Proyek Akhir MSIB Mandiri VINIX7, Divisi Web Development (Jalur VIP, Web EdTech)

## Masalah dan solusi
Pembelajaran daring cenderung satu arah. LiveQuiz memberi pengajar umpan balik pemahaman peserta secara langsung lewat kuis interaktif.

## Fitur
- Autentikasi pengajar (daftar dan login)
- CRUD kuis dan soal pilihan ganda
- Sesi live dengan kode join 6 karakter
- Lobi real-time (peserta muncul tanpa refresh)
- Soal tampil serentak, dikontrol pengajar
- Penilaian di server (kunci jawaban tidak dikirim ke browser peserta)
- Skor dan papan peringkat akhir

## Tech stack
Next.js (App Router, TypeScript), Tailwind CSS, Supabase (PostgreSQL, Auth, Realtime, Row Level Security), Vercel.

## Arsitektur singkat
- Pengajar: login lewat Supabase Auth, mengelola data lewat Supabase dengan RLS (hanya pemilik yang bisa mengubah).
- Peserta: tanpa akun, semua aksi (join, ambil soal, kirim jawaban) lewat API route Next.js yang memakai service role key di sisi server.
- Realtime: Supabase Realtime pada tabel `sessions` dan `participants`.

## Skema database
Tabel: `quizzes`, `questions`, `sessions`, `participants`, `answers`.
<tempel gambar ERD dari Schema Visualizer di sini>

## Menjalankan secara lokal
1. `git clone <url-repo>` lalu `cd livequiz`
2. `npm install`
3. Buat `.env.local`:
