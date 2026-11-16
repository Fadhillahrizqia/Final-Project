"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Question = { id: string; text: string; options: string[] };
type State = {
  status: "waiting" | "live" | "ended";
  index?: number;
  total?: number;
  question?: Question | null;
};
type Result = {
  questionId: string;
  chosen: number;
  isCorrect: boolean;
  correctIndex: number;
};
type Row = { id: string; nickname: string; score: number };

function PlayPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [me, setMe] = useState<Row | null>(null);
  const [state, setState] = useState<State>({ status: "waiting" });
  const [result, setResult] = useState<Result | null>(null);
  const [board, setBoard] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/question?sessionId=${id}`, {
        cache: "no-store",
      });
      if (res.ok) setState(await res.json());
    } catch {
      /* abaikan, akan dicoba lagi oleh polling */
    }
  }, [id]);

  useEffect(() => {
    const pid = sessionStorage.getItem(`participant-${id}`);
    if (!pid) {
      router.replace("/");
      return;
    }
    setParticipantId(pid);

    supabase
      .from("participants")
      .select("id, nickname, score")
      .eq("id", pid)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setMe(data as Row);
      });

    fetchState();

    const channel = supabase
      .channel(`play-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${id}` },
        () => fetchState()
      )
      .subscribe();

    // cadangan jika koneksi realtime sempat putus
    const timer = setInterval(fetchState, 3000);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [id, fetchState, router]);

  useEffect(() => {
    if (state.status !== "ended") return;
    supabase
      .from("participants")
      .select("id, nickname, score")
      .eq("session_id", id)
      .order("score", { ascending: false })
      .then(({ data }) => {
        if (data) setBoard(data as Row[]);
      });
  }, [state.status, id]);

  async function answer(chosen: number) {
    if (!participantId || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          sessionId: id,
          chosenIndex: chosen,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim jawaban");
      } else {
        setResult({
          questionId: data.questionId,
          chosen,
          isCorrect: data.isCorrect,
          correctIndex: data.correctIndex,
        });
        setMe((m) => (m ? { ...m, score: data.score } : m));
      }
    } catch {
      setError("Tidak bisa terhubung ke server");
    }
    setSending(false);
  }

  const q = state.question;
  const answered = result && q && result.questionId === q.id ? result : null;
  const progress = state.total
    ? (((state.index ?? 0) + 1) / state.total) * 100
    : 0;
  const myRow = board.find((p) => p.id === participantId);
  const myRank = board.findIndex((p) => p.id === participantId) + 1;

  return (
    <main className="min-h-screen w-full bg-ink text-white">
      <div className="mx-auto w-full max-w-md space-y-6 p-6">
        <header className="flex items-center justify-between">
          <span className="text-white/70">{me?.nickname ?? "..."}</span>
          <span className="rounded-full bg-gold px-4 py-1 text-sm font-bold text-ink">
            {me?.score ?? 0} poin
          </span>
        </header>

        {state.status === "waiting" && (
          <div className="space-y-4 pt-24 text-center">
            <div className="mx-auto h-4 w-4 animate-pulse rounded-full bg-gold" />
            <p className="text-2xl font-bold">Kamu sudah masuk</p>
            <p className="text-white/70">Menunggu pengajar memulai kuis...</p>
          </div>
        )}

        {state.status === "live" && !q && (
          <p className="pt-24 text-center text-white/70">Menyiapkan soal...</p>
        )}

        {state.status === "live" && q && (
          <section className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-white/70">
                Soal {(state.index ?? 0) + 1} dari {state.total}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gold transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <h1 className="text-2xl font-bold leading-snug">{q.text}</h1>

            <div className="space-y-3">
              {q.options.map((opt, i) => {
                let style = "border-white/20 bg-white/5";
                if (answered) {
                  if (i === answered.correctIndex)
                    style = "border-green-400 bg-green-500/20";
                  else if (i === answered.chosen)
                    style = "border-red-400 bg-red-500/20";
                  else style = "border-white/10 bg-white/5 opacity-50";
                }
                return (
                  <button
                    key={i}
                    disabled={!!answered || sending}
                    onClick={() => answer(i)}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left text-lg active:scale-[0.98] ${style}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}

            {answered && (
              <div className="space-y-1 pt-2 text-center">
                <p
                  className={`text-2xl font-bold ${
                    answered.isCorrect ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {answered.isCorrect ? "Benar! +100" : "Salah"}
                </p>
                <p className="text-white/70">
                  Menunggu soal berikutnya dari pengajar...
                </p>
              </div>
            )}
          </section>
        )}

        {state.status === "ended" && (
          <section className="space-y-6">
            <h1 className="text-center text-3xl font-bold">Kuis selesai</h1>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <p className="text-white/70">Skor kamu</p>
              <p className="text-6xl font-bold text-gold">
                {myRow?.score ?? me?.score ?? 0}
              </p>
              {myRank > 0 && (
                <p className="mt-1 text-white/70">
                  Peringkat {myRank} dari {board.length}
                </p>
              )}
            </div>
            <ol className="space-y-2">
              {board.map((p, i) => (
                <li
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    p.id === participantId
                      ? "bg-gold font-bold text-ink"
                      : "bg-white/5"
                  }`}
                >
                  <span>
                    {i + 1}. {p.nickname}
                  </span>
                  <span>{p.score} poin</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={<main className="min-h-screen bg-ink p-6 text-white/70">Memuat...</main>}
    >
      <PlayPage />
    </Suspense>
  );
}