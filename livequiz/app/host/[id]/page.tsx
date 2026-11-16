"use client";
import { Suspense, useEffect, useState } from "react";
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

function HostPage() {
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
      <main className="min-h-screen bg-ink p-6 text-white">
        {error ? (
          <p role="alert" className="text-red-300">{error}</p>
        ) : (
          <p className="text-white/70">Memuat sesi...</p>
        )}
      </main>
    );
  }

  const current = questions[session.current_question];
  const isLast = session.current_question + 1 >= questions.length;
  const statusLabel =
    session.status === "waiting"
      ? "Menunggu peserta"
      : session.status === "live"
      ? "Sedang berlangsung"
      : "Selesai";
  const statusStyle =
    session.status === "live"
      ? "bg-green-500/20 text-green-300"
      : "bg-white/10 text-white";

  return (
    <main className="min-h-screen w-full bg-ink text-white">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Link href="/dashboard" className="text-sm text-white/70 underline">
          ← Kembali ke dashboard
        </Link>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/70">Gabung di halaman utama dengan kode</p>
          <p className="text-7xl font-bold tracking-[0.25em] text-gold sm:text-8xl">
            {session.join_code}
          </p>
          <span
            className={`inline-block rounded-full px-4 py-1 text-sm font-semibold ${statusStyle}`}
          >
            {statusLabel}
          </span>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}

        {session.status === "live" && current && (
          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/70">
              Soal {session.current_question + 1} dari {questions.length}
            </p>
            <h2 className="text-2xl font-bold">{current.text}</h2>
            <ul className="space-y-1 text-lg">
              {current.options.map((o, i) => (
                <li
                  key={i}
                  className={
                    i === current.correct_index
                      ? "font-bold text-green-300"
                      : "text-white/80"
                  }
                >
                  {String.fromCharCode(65 + i)}. {o}
                  {i === current.correct_index && " ✓"}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            {session.status === "ended" ? "Hasil akhir" : "Peserta"} (
            {participants.length})
          </h2>
          <ol className="space-y-2">
            {participants.map((p, i) => (
              <li
                key={p.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  session.status === "ended" && i === 0
                    ? "bg-gold font-bold text-ink"
                    : "bg-white/5"
                }`}
              >
                <span>
                  {session.status !== "waiting" && `${i + 1}. `}
                  {p.nickname}
                </span>
                <span>{p.score} poin</span>
              </li>
            ))}
            {participants.length === 0 && (
              <p className="text-white/70">Belum ada peserta yang bergabung.</p>
            )}
          </ol>
        </section>

        <div className="flex flex-wrap gap-3">
          {session.status === "waiting" && (
            <button
              onClick={startQuiz}
              className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white"
            >
              Mulai kuis
            </button>
          )}
          {session.status === "live" && (
            <button
              onClick={nextQuestion}
              className="rounded-lg bg-gold px-5 py-3 font-bold text-ink"
            >
              {isLast ? "Selesai & lihat hasil" : "Soal berikutnya"}
            </button>
          )}
          {session.status !== "ended" && (
            <button
              onClick={endSession}
              className="rounded-lg border border-red-300 px-5 py-3 font-semibold text-red-300"
            >
              Akhiri sesi
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={<main className="min-h-screen bg-ink p-6 text-white/70">Memuat...</main>}
    >
      <HostPage />
    </Suspense>
  );
}