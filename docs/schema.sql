-- =====================================================
-- LiveQuiz - Skema Database (PostgreSQL / Supabase)
-- Proyek Akhir MSIB Mandiri VINIX7, Divisi Web Development
-- Jalankan di Supabase: SQL Editor
-- =====================================================

-- ---------- TABEL ----------

-- Kuis milik pengajar
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users not null default auth.uid(),
  title text not null,
  created_at timestamptz default now()
);

-- Soal pilihan ganda di dalam kuis
create table questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes on delete cascade not null,
  text text not null,
  options jsonb not null,            -- contoh: ["A","B","C","D"]
  correct_index int not null,        -- indeks jawaban benar (0-3)
  position int not null              -- urutan soal
);

-- Sesi kuis live
create table sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes on delete cascade not null,
  join_code text unique not null,    -- kode join 6 karakter
  status text not null default 'waiting'
    check (status in ('waiting', 'live', 'ended')),
  current_question int not null default 0
);

-- Peserta dalam sesi (tanpa akun)
create table participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions on delete cascade not null,
  nickname text not null,
  score int not null default 0
);

-- Jawaban peserta
create table answers (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants on delete cascade not null,
  question_id uuid references questions on delete cascade not null,
  chosen_index int not null,
  is_correct boolean not null,
  unique (participant_id, question_id)  -- satu soal hanya dapat dijawab sekali
);

-- ---------- ROW LEVEL SECURITY ----------

alter table quizzes enable row level security;
alter table questions enable row level security;
alter table sessions enable row level security;
alter table participants enable row level security;
alter table answers enable row level security;

-- Pengajar hanya mengelola kuis miliknya sendiri
create policy "owner kelola kuis" on quizzes
  for all using (owner_id = auth.uid());

-- Pengajar hanya mengelola soal dari kuis miliknya
create policy "owner kelola soal" on questions
  for all using (
    exists (
      select 1 from quizzes q
      where q.id = quiz_id and q.owner_id = auth.uid()
    )
  );

-- Pengajar hanya mengelola sesi dari kuis miliknya
create policy "owner kelola sesi" on sessions
  for all using (
    exists (
      select 1 from quizzes q
      where q.id = quiz_id and q.owner_id = auth.uid()
    )
  );

-- Sesi dan daftar peserta boleh dibaca publik (tidak berisi data rahasia)
-- agar Realtime berjalan di layar peserta dan lobi.
create policy "baca sesi" on sessions for select using (true);
create policy "baca peserta" on participants for select using (true);
 
 