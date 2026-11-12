import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export async function POST(req: Request) {
  let body: { code?: string; nickname?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  const code = String(body.code ?? "").trim().toUpperCase();
  const nickname = String(body.nickname ?? "").trim();

  if (code.length !== 6)
    return NextResponse.json({ error: "Kode harus 6 karakter" }, { status: 400 });
  if (nickname.length < 1 || nickname.length > 20)
    return NextResponse.json(
      { error: "Nama panggilan 1-20 karakter" },
      { status: 400 }
    );

  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("id, status")
    .eq("join_code", code)
    .maybeSingle();

  if (!session)
    return NextResponse.json({ error: "Kode tidak ditemukan" }, { status: 404 });
  if (session.status !== "waiting")
    return NextResponse.json(
      { error: "Sesi sudah dimulai atau selesai, tidak bisa bergabung" },
      { status: 400 }
    );

  const { data: existing } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq("session_id", session.id)
    .eq("nickname", nickname)
    .limit(1);
  if (existing && existing.length > 0)
    return NextResponse.json(
      { error: "Nama panggilan sudah dipakai, pilih yang lain" },
      { status: 409 }
    );

  const { data: participant, error } = await supabaseAdmin
    .from("participants")
    .insert({ session_id: session.id, nickname })
    .select("id")
    .single();

  if (error || !participant)
    return NextResponse.json({ error: "Gagal bergabung" }, { status: 500 });

  return NextResponse.json({
    participantId: participant.id,
    sessionId: session.id,
  });
}