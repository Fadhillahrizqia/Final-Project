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
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard Kuis</h1>
        <button onClick={logout} className="text-sm underline">
          Keluar
        </button>
      </div>

      <form onSubmit={createQuiz} className="flex gap-2">
        <input
          className="flex-1 border rounded p-2"
          placeholder="Judul kuis baru"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="bg-black text-white rounded px-4">Buat</button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <ul className="space-y-2">
        {quizzes.map((q) => (
          <li
            key={q.id}
            className="border rounded p-3 flex justify-between items-center gap-3"
          >
            <Link href={`/quiz/${q.id}`} className="underline">
              {q.title}
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <button
                onClick={() => startSession(q.id)}
                disabled={starting === q.id}
                className="bg-green-600 text-white rounded px-3 py-1 disabled:opacity-50"
              >
                {starting === q.id ? "Membuat..." : "Mulai sesi"}
              </button>
              <button
                onClick={() => deleteQuiz(q.id)}
                className="text-red-600"
              >
                Hapus
              </button>
            </div>
          </li>
        ))}
        {quizzes.length === 0 && (
          <p className="text-gray-500">Belum ada kuis.</p>
        )}
      </ul>
    </main>
  );
}