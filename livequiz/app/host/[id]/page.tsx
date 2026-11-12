"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type Session = {
  id: string;
  quiz_id: string;
  join_code: string;
  status: "waiting" | "live" | "ended";
  current_question: number;
};
type Participant = { id: string; nickname: string; score: number };
type Question = {
  id: string;
  text: string;
  options: string[];
  correct_index: number;
  position: number;
};

export default function HostPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState("");

  async function loadSession() {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return setError(error.message);
    setSession(data as Session);

    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", data.quiz_id)
      .order("position", { ascending: true });
    if (qs) setQuestions(qs as Question[]);
  }

  async function loadParticipants() {
    const { data } = await supabase
      .from("participants")
      .select("id, nickname, score")
      .eq("session_id", id)
      .order("score", { ascending: false });
    if (data) setParticipants(data as Participant[]);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      loadSession();
      loadParticipants();
    });

    const channel = supabase
      .channel(`host-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `session_id=eq.${id}`,
        },
        () => loadParticipants()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${id}`,
        },
        (payload) => setSession(payload.new as Session)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  async function updateSession(values: Partial<Session>) {
    setError("");
    const { error } = await supabase
      .from("sessions")
      .update(values)
      .eq("id", id);
    if (error) setError(error.message);
  }

  function startQuiz() {
    if (participants.length === 0 && !confirm("Belum ada peserta. Tetap mulai?"))
      return;
    updateSession({ status: "live", current_question: 0 });
  }

  function nextQuestion() {
    if (!session) return;
    const next = session.current_question + 1;
    if (next >= questions.length) updateSession({ status: "ended" });
    else updateSession({ current_question: next });
  }

  function endSession() {
    if (confirm("Akhiri sesi ini sekarang?")) updateSession({ status: "ended" });
  }

  if (!session) {
    return (
      <main className="p-6">
        {error ? <p className="text-red-600">{error}</p> : <p>Memuat sesi...</p>}
      </main>
    );
  }

  const current = questions[session.current_question];
  const isLast = session.current_question + 1 >= questions.length;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href="/dashboard" className="text-sm underline">
        ← Kembali ke dashboard
      </Link>

      <div className="text-center border rounded p-6 space-y-2">
        <p className="text-gray-500">Gabung di halaman utama dengan kode:</p>
        <p className="text-6xl font-bold tracking-widest">{session.join_code}</p>
        <p className="text-sm">
          Status:{" "}
          <span className="font-semibold">
            {session.status === "waiting"
              ? "Menunggu peserta"
              : session.status === "live"
              ? "Sedang berlangsung"
              : "Selesai"}
          </span>
        </p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {session.status === "live" && current && (
        <section className="border rounded p-4 space-y-3">
          <p className="text-sm text-gray-500">
            Soal {session.current_question + 1} dari {questions.length}
          </p>
          <h2 className="text-xl font-bold">{current.text}</h2>
          <ul className="space-y-1">
            {current.options.map((o, i) => (
              <li
                key={i}
                className={
                  i === current.correct_index ? "font-bold text-green-700" : ""
                }
              >
                {String.fromCharCode(65 + i)}. {o}
                {i === current.correct_index && " ✓"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">
          {session.status === "ended" ? "Hasil akhir" : "Peserta"} (
          {participants.length})
        </h2>
        <ol className="space-y-1">
          {participants.map((p, i) => (
            <li
              key={p.id}
              className="border rounded px-3 py-2 flex justify-between"
            >
              <span>
                {session.status !== "waiting" && `${i + 1}. `}
                {p.nickname}
              </span>
              <span className="text-gray-500">{p.score} poin</span>
            </li>
          ))}
          {participants.length === 0 && (
            <p className="text-gray-500">Belum ada peserta yang bergabung.</p>
          )}
        </ol>
      </section>

      <div className="flex gap-3">
        {session.status === "waiting" && (
          <button
            onClick={startQuiz}
            className="bg-green-600 text-white rounded px-4 py-2"
          >
            Mulai kuis
          </button>
        )}
        {session.status === "live" && (
          <button
            onClick={nextQuestion}
            className="bg-black text-white rounded px-4 py-2"
          >
            {isLast ? "Selesai & lihat hasil" : "Soal berikutnya"}
          </button>
        )}
        {session.status !== "ended" && (
          <button
            onClick={endSession}
            className="border border-red-600 text-red-600 rounded px-4 py-2"
          >
            Akhiri sesi
          </button>
        )}
      </div>
    </main>
  );
}