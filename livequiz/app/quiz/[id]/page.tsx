"use client";
import { useEffect, useState } from "react";
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

export default function QuizEditor() {
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
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href="/dashboard" className="text-sm underline">
        ← Kembali ke dashboard
      </Link>
      <h1 className="text-2xl font-bold">Soal: {quizTitle}</h1>

      <form onSubmit={saveQuestion} className="space-y-3 border rounded p-4">
        <h2 className="font-semibold">
          {editingId ? "Edit soal" : "Tambah soal"}
        </h2>
        <textarea
          className="w-full border rounded p-2"
          placeholder="Tulis pertanyaan..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={correct === i}
              onChange={() => setCorrect(i)}
              title="Tandai sebagai jawaban benar"
            />
            <input
              className="flex-1 border rounded p-2"
              placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                setOptions(next);
              }}
            />
          </div>
        ))}
        <p className="text-xs text-gray-500">
          Pilih tombol bulat di sebelah opsi yang menjadi jawaban benar.
        </p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={saving}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
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
              className="border rounded px-4 py-2"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      <ol className="space-y-3">
        {questions.map((q, idx) => (
          <li key={q.id} className="border rounded p-3 space-y-2">
            <p className="font-medium">
              {idx + 1}. {q.text}
            </p>
            <ul className="text-sm space-y-1">
              {q.options.map((o, i) => (
                <li
                  key={i}
                  className={
                    i === q.correct_index ? "font-bold text-green-700" : ""
                  }
                >
                  {String.fromCharCode(65 + i)}. {o}
                  {i === q.correct_index && " ✓"}
                </li>
              ))}
            </ul>
            <div className="flex gap-4 text-sm">
              <button onClick={() => startEdit(q)} className="underline">
                Edit
              </button>
              <button
                onClick={() => deleteQuestion(q.id)}
                className="text-red-600"
              >
                Hapus
              </button>
            </div>
          </li>
        ))}
        {questions.length === 0 && (
          <p className="text-gray-500">Belum ada soal.</p>
        )}
      </ol>
    </main>
  );
}