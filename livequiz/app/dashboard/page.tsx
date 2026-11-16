"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Quiz = { id: string; title: string; created_at: string };

// tanpa huruf/angka yang mirip (O/0, I/1)
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode() {
  return Array.from(
    { length: 6 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
}

export default function Dashboard() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setQuizzes(data as Quiz[]);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else load();
    });
  }, []);

  async function createQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Judul kuis wajib diisi");
    const { error } = await supabase
      .from("quizzes")
      .insert({ title: title.trim() });
    if (error) return setError(error.message);
    setTitle("");
    setError("");
    load();
  }

  async function deleteQuiz(id: string) {
    if (!confirm("Hapus kuis ini beserta semua soalnya?")) return;
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) return setError(error.message);
    load();
  }

  async function startSession(quizId: string) {
    if (starting) return;
    setStarting(quizId);
    setError("");

    const { count } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId);
    if (!count) {
      setStarting(null);
      return setError("Kuis ini belum punya soal. Tambahkan soal dulu.");
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabase
        .from("sessions")
        .insert({ quiz_id: quizId, join_code: generateCode() })
        .select("id")
        .single();
      if (!error && data) {
        setStarting(null); // reset agar tombol tidak macet saat kembali ke halaman ini
        router.push(`/host/${data.id}`);
        return;
      }
      if (error?.code !== "23505") {
        setStarting(null);
        return setError(error?.message ?? "Gagal membuat sesi");
      }
      // 23505 = kode bentrok, coba kode lain
    }
    setStarting(null);
    setError("Gagal membuat kode unik, coba lagi.");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen w-full">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1.5 rounded bg-gold" />
            <h1 className="text-2xl font-bold">Dashboard Kuis</h1>
          </div>
          <button onClick={logout} className="text-sm text-white/70 underline">
            Keluar
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <form onSubmit={createQuiz} className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-300 p-3"
            placeholder="Judul kuis baru"
            aria-label="Judul kuis baru"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button className="rounded-lg bg-ink px-5 font-semibold text-white">
            Buat
          </button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <ul className="space-y-3">
          {quizzes.map((q) => (
            <li
              key={q.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <Link
                href={`/quiz/${q.id}`}
                className="font-semibold text-ink hover:underline"
              >
                {q.title}
              </Link>
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => startSession(q.id)}
                  disabled={starting === q.id}
                  className="rounded-lg bg-green-700 px-3 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {starting === q.id ? "Membuat..." : "Mulai sesi"}
                </button>
                <button
                  onClick={() => deleteQuiz(q.id)}
                  className="text-red-700"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
          {quizzes.length === 0 && (
            <p className="text-gray-600">Belum ada kuis. Buat yang pertama di atas.</p>
          )}
        </ul>
      </div>
    </main>
  );
}