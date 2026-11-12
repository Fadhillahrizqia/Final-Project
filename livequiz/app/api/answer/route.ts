import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";

const POINTS_CORRECT = 100;

export async function POST(req: Request) {
  let body: { participantId?: string; sessionId?: string; chosenIndex?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  const { participantId, sessionId, chosenIndex } = body;
  if (
    !participantId ||
    !sessionId ||
    typeof chosenIndex !== "number" ||
    chosenIndex < 0 ||
    chosenIndex > 3
  )
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });

  const { data: participant } = await supabaseAdmin
    .from("participants")
    .select("id, score, session_id")
    .eq("id", participantId)
    .maybeSingle();
  if (!participant || participant.session_id !== sessionId)
    return NextResponse.json({ error: "Peserta tidak valid" }, { status: 403 });

  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("quiz_id, status, current_question")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.status !== "live")
    return NextResponse.json({ error: "Sesi tidak sedang berlangsung" }, { status: 400 });

  const { data: questions } = await supabaseAdmin
    .from("questions")
    .select("id, correct_index, position")
    .eq("quiz_id", session.quiz_id)
    .order("position", { ascending: true });
  const q = questions?.[session.current_question];
  if (!q)
    return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });

  const isCorrect = chosenIndex === q.correct_index;

  const { error: insertError } = await supabaseAdmin.from("answers").insert({
    participant_id: participantId,
    question_id: q.id,
    chosen_index: chosenIndex,
    is_correct: isCorrect,
  });
  if (insertError) {
    if (insertError.code === "23505")
      return NextResponse.json({ error: "Kamu sudah menjawab soal ini" }, { status: 409 });
    return NextResponse.json({ error: "Gagal menyimpan jawaban" }, { status: 500 });
  }

  const newScore = participant.score + (isCorrect ? POINTS_CORRECT : 0);
  if (isCorrect)
    await supabaseAdmin
      .from("participants")
      .update({ score: newScore })
      .eq("id", participantId);

  return NextResponse.json({
    questionId: q.id,
    isCorrect,
    correctIndex: q.correct_index,
    score: newScore,
  });
}