"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">
          {mode === "login" ? "Login Pengajar" : "Daftar Pengajar"}
        </h1>
        <input
          type="email"
          required
          placeholder="Email"
          className="w-full border rounded p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min. 6 karakter)"
          className="w-full border rounded p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {msg && <p className="text-red-600 text-sm">{msg}</p>}
        <button
          disabled={loading}
          className="w-full bg-black text-white rounded p-2"
        >
          {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
        </button>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "Belum punya akun? Daftar"
            : "Sudah punya akun? Login"}
        </button>
      </form>
    </main>
  );
}