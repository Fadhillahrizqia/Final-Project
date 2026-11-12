import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId)
    return NextResponse.json({ error: "sessionId wajib" }, { status: 400 });

  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("id, quiz_id, status, current_question")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session)
    return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });

  if (session.status !== "live")
    return NextResponse.json({ status: session.status });

  const { data: questions } = await supabaseAdmin
    .from("questions")
    .select("id, text, options, position")
    .eq("quiz_id", session.quiz_id)
    .order("position", { ascending: true });

  const total = questions?.length ?? 0;
  const q = questions?.[session.current_question];
  if (!q) return NextResponse.json({ status: "live", total, question: null });

  // correct_index SENGAJA tidak dikirim ke peserta
  return NextResponse.json({
    status: "live",
    index: session.current_question,
    total,
    question: { id: q.id, text: q.text, options: q.options },
  });
}