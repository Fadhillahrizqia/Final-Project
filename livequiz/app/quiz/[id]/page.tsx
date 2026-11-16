"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Question = {
  id: string;
  text: string;
  options: string[];
  correct_index: number;
  position: number;
};

const emptyOptions = ["", "", "", ""];

function QuizEditor() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[]>(emptyOptions);
  const [correct, setCorrect] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data: quiz } = await supabase
      .from("quizzes")
      .select("title")
      .eq("id", id)
      .single();
    if (quiz) setQuizTitle(quiz.title);

    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", id)
      .order("position", { ascending: true });
    if (error) setError(error.message);
    else setQuestions(data as Question[]);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else load();
    });
  }, []);

  function resetForm() {
    setText("");
    setOptions(emptyOptions);
    setCorrect(0);
    setEditingId(null);
  }

  async function saveQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!text.trim()) return setError("Teks soal wajib diisi");
    if (options.some((o) => !o.trim()))
      return setError("Keempat opsi jawaban wajib diisi");

    setSaving(true);
    const payload = {
      text: text.trim(),
      options: options.map((o) => o.trim()),
      correct_index: correct,
    };
    const nextPosition =
      Math.max(0, ...questions.map((q) => q.position)) + 1;

    const { error } = editingId
      ? await supabase.from("questions").update(payload).eq("id", editingId)
      : await supabase.from("questions").insert({
          ...payload,
          quiz_id: id,
          position: nextPosition,
        });
    setSaving(false);

    if (error) return setError(error.message);
    setError("");
    resetForm();
    load();
  }

  function startEdit(q: Question) {
    setEditingId(q.id);
    setText(q.text);
    setOptions(q.options);
    setCorrect(q.correct_index);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteQuestion(qid: string) {
    if (!confirm("Hapus soal ini?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", qid);
    if (error) return setError(error.message);
    if (editingId === qid) resetForm();
    load();
  }

  return (
    <main className="min-h-screen w-full">
      <header className="bg-ink text-white">
        <div className="mx-auto max-w-2xl space-y-2 p-6">
          <Link href="/dashboard" className="text-sm text-white/70 underline">
            ← Kembali ke dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1.5 rounded bg-gold" />
            <h1 className="text-2xl font-bold">Soal: {quizTitle}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <form
          onSubmit={saveQuestion}
          className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold">
            {editingId ? "Edit soal" : "Tambah soal"}
          </h2>
          <textarea
            className="w-full rounded-lg border border-gray-300 p-3"
            placeholder="Tulis pertanyaan..."
            aria-label="Teks pertanyaan"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="radio"
                name="correct"
                className="h-5 w-5 accent-[#1f5fbf]"
                checked={correct === i}
                onChange={() => setCorrect(i)}
                aria-label={`Tandai opsi ${String.fromCharCode(65 + i)} sebagai jawaban benar`}
              />
              <input
                className="flex-1 rounded-lg border border-gray-300 p-3"
                placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                aria-label={`Opsi ${String.fromCharCode(65 + i)}`}
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
              />
            </div>
          ))}
          <p className="text-xs text-gray-600">
            Pilih tombol bulat di sebelah opsi yang menjadi jawaban benar.
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              disabled={saving}
              className="rounded-lg bg-ink px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving
                ? "Menyimpan..."
                : editingId
                ? "Simpan perubahan"
                : "Tambah soal"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-5 py-3"
              >
                Batal
              </button>
            )}
          </div>
        </form>

        <ol className="space-y-3">
          {questions.map((q, idx) => (
            <li
              key={q.id}
              className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <p className="font-semibold">
                {idx + 1}. {q.text}
              </p>
              <ul className="space-y-1 text-sm">
                {q.options.map((o, i) => (
                  <li
                    key={i}
                    className={
                      i === q.correct_index
                        ? "font-bold text-green-800"
                        : "text-gray-700"
                    }
                  >
                    {String.fromCharCode(65 + i)}. {o}
                    {i === q.correct_index && " ✓"}
                  </li>
                ))}
              </ul>
              <div className="flex gap-4 text-sm">
                <button
                  onClick={() => startEdit(q)}
                  className="font-medium text-brand underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteQuestion(q.id)}
                  className="text-red-700"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
          {questions.length === 0 && (
            <p className="text-gray-600">Belum ada soal.</p>
          )}
        </ol>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={<main className="min-h-screen p-6 text-gray-600">Memuat...</main>}
    >
      <QuizEditor />
    </Suspense>
  );
}