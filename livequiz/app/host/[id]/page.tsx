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

export default function HostPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState("");

  async function loadSession() {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .single();
    if (error) setError(error.message);
    else setSession(data as Session);
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

  async function endSession() {
    if (!confirm("Akhiri sesi ini?")) return;
    const { error } = await supabase
      .from("sessions")
      .update({ status: "ended" })
      .eq("id", id);
    if (error) setError(error.message);
  }

  if (!session) {
    return (
      <main className="p-6">
        {error ? <p className="text-red-600">{error}</p> : <p>Memuat sesi...</p>}
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href="/dashboard" className="text-sm underline">
        ← Kembali ke dashboard
      </Link>

      <div className="text-center border rounded p-6 space-y-2">
        <p className="text-gray-500">Gabung di halaman utama dengan kode:</p>
        <p className="text-6xl font-bold tracking-widest">
          {session.join_code}
        </p>
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

      <section className="space-y-2">
        <h2 className="font-semibold">Peserta ({participants.length})</h2>
        <ul className="space-y-1">
          {participants.map((p) => (
            <li key={p.id} className="border rounded px-3 py-2 flex justify-between">
              <span>{p.nickname}</span>
              <span className="text-gray-500">{p.score} poin</span>
            </li>
          ))}
          {participants.length === 0 && (
            <p className="text-gray-500">Belum ada peserta yang bergabung.</p>
          )}
        </ul>
      </section>

      {session.status !== "ended" && (
        <button
          onClick={endSession}
          className="border border-red-600 text-red-600 rounded px-4 py-2"
        >
          Akhiri sesi
        </button>
      )}
    </main>
  );
}