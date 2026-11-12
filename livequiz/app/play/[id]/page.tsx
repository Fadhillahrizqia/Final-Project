"use client";
import { useCallback, useEffect, useState } from "react";
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

export default function PlayPage() {
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

  return (
    <main className="min-h-screen max-w-md mx-auto p-6 space-y-6">
      <header className="flex justify-between text-sm text-gray-600">
        <span>{me?.nickname ?? "..."}</span>
        <span className="font-semibold">{me?.score ?? 0} poin</span>
      </header>

      {state.status === "waiting" && (
        <div className="text-center pt-20 space-y-2">
          <p className="text-2xl font-bold">Kamu sudah masuk!</p>
          <p className="text-gray-500">Menunggu pengajar memulai kuis...</p>
        </div>
      )}

      {state.status === "live" && !q && (
        <p className="text-center pt-20 text-gray-500">Menyiapkan soal...</p>
      )}

      {state.status === "live" && q && (
        <section className="space-y-4">
          <p className="text-sm text-gray-500">
            Soal {(state.index ?? 0) + 1} dari {state.total}
          </p>
          <h1 className="text-xl font-bold">{q.text}</h1>

          <div className="space-y-3">
            {q.options.map((opt, i) => {
              let style = "border";
              if (answered) {
                if (i === answered.correctIndex)
                  style = "border-green-600 bg-green-100";
                else if (i === answered.chosen)
                  style = "border-red-600 bg-red-100";
                else style = "border opacity-50";
              }
              return (
                <button
                  key={i}
                  disabled={!!answered || sending}
                  onClick={() => answer(i)}
                  className={`w-full text-left rounded p-4 text-lg ${style}`}
                >
                  <span className="font-bold mr-2">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          {answered && (
            <div className="text-center space-y-1 pt-2">
              <p
                className={`text-xl font-bold ${
                  answered.isCorrect ? "text-green-700" : "text-red-700"
                }`}
              >
                {answered.isCorrect ? "Benar! +100" : "Salah"}
              </p>
              <p className="text-gray-500">
                Menunggu soal berikutnya dari pengajar...
              </p>
            </div>
          )}
        </section>
      )}

      {state.status === "ended" && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold text-center">Kuis selesai</h1>
          <ol className="space-y-2">
            {board.map((p, i) => (
              <li
                key={p.id}
                className={`border rounded px-3 py-2 flex justify-between ${
                  p.id === participantId ? "bg-yellow-100 font-semibold" : ""
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
    </main>
  );
}