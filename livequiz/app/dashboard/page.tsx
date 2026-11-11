"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

type Quiz = { id: string; title: string; created_at: string };

export default function Dashboard() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

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
    await supabase.from("quizzes").delete().eq("id", id);
    load();
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
            className="border rounded p-3 flex justify-between items-center"
          >
               <Link href={`/quiz/${q.id}`} className="underline">
                 {q.title}
              </Link>
            <button
              onClick={() => deleteQuiz(q.id)}
              className="text-red-600 text-sm"
            >
              Hapus
            </button>
          </li>
        ))}
        {quizzes.length === 0 && (
          <p className="text-gray-500">Belum ada kuis.</p>
        )}
      </ul>
    </main>
  );
}