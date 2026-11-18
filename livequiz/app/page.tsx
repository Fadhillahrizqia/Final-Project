"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal bergabung");
        setLoading(false);
        return;
      }
      sessionStorage.setItem(`participant-${data.sessionId}`, data.participantId);
      router.push(`/play/${data.sessionId}`);
    } catch {
      setError("Tidak bisa terhubung ke server");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink text-white flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center space-y-3">
        <div className="mx-auto h-1.5 w-16 rounded bg-gold" />
        <h1 className="text-5xl font-bold tracking-tight">LiveQuiz</h1>
        <p className="text-white/70">
          Masukkan kode dari pengajar untuk bergabung
        </p>
      </div>

      <form
        onSubmit={handleJoin}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <input
          required
          maxLength={6}
          placeholder="Kode sesi"
          aria-label="Kode sesi"
          className="w-full rounded-lg bg-white p-4 text-center text-2xl font-bold uppercase tracking-[0.4em] text-ink placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-500"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <input
          required
          maxLength={20}
          placeholder="Nama panggilan"
          aria-label="Nama panggilan"
          className="w-full rounded-lg bg-white p-4 text-ink placeholder:text-gray-500"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-center text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-gold p-4 text-lg font-bold text-ink disabled:opacity-50"
        >
          {loading ? "Bergabung..." : "Gabung"}
        </button>
      </form>

      <Link href="/login" className="text-sm text-white/70 underline">
        Login Pengajar
      </Link>
    </main>
  );
}