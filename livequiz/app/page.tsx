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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
      <form onSubmit={handleJoin} className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-bold text-center">LiveQuiz</h1>
        <input
          required
          maxLength={6}
          placeholder="Kode sesi (6 karakter)"
          className="w-full border rounded p-3 text-center text-xl tracking-widest uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <input
          required
          maxLength={20}
          placeholder="Nama panggilan"
          className="w-full border rounded p-3"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        <button
          disabled={loading}
          className="w-full bg-black text-white rounded p-3 disabled:opacity-50"
        >
          {loading ? "Bergabung..." : "Gabung"}
        </button>
      </form>
      <Link href="/login" className="text-sm underline">
        Login Pengajar
      </Link>
    </main>
  );
}