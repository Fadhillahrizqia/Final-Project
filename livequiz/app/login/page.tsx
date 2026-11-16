"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setMsg(error.message);
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-ink p-6 text-white">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-1.5 w-16 rounded bg-gold" />
        <h1 className="text-4xl font-bold tracking-tight">
          {mode === "login" ? "Login Pengajar" : "Daftar Pengajar"}
        </h1>
        <p className="text-white/70">Kelola kuis dan mulai sesi live</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <input
          type="email"
          required
          placeholder="Email"
          aria-label="Email"
          className="w-full rounded-lg bg-white p-4 text-ink placeholder:text-gray-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min. 6 karakter)"
          aria-label="Password"
          className="w-full rounded-lg bg-white p-4 text-ink placeholder:text-gray-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {msg && (
          <p role="alert" className="text-sm text-red-300">
            {msg}
          </p>
        )}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-gold p-4 text-lg font-bold text-ink disabled:opacity-50"
        >
          {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
        </button>
        <button
          type="button"
          className="w-full text-sm text-white/70 underline"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "Belum punya akun? Daftar"
            : "Sudah punya akun? Login"}
        </button>
      </form>

      <Link href="/" className="text-sm text-white/70 underline">
        ← Kembali ke halaman join
      </Link>
    </main>
  );
}