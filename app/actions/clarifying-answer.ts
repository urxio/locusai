'use server'

import { createClient } from '@/lib/supabase/server'
import { readUserMemory, patchUserMemory } from '@/lib/ai/memory'
import type { ClarifyingAnswer } from '@/lib/ai/memory'

export async function saveClarifyingAnswer(
  question: string,
  answer: string,
  briefDate: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const current  = await readUserMemory(user.id)
  const newEntry: ClarifyingAnswer = {
    question,
    answer:      answer.trim(),
    answered_at: new Date().toISOString(),
    brief_date:  briefDate,
  }
  const updatedQA          = [...(current?.clarifying_qa ?? []), newEntry].slice(-30)
  const pending            = current?.pending_clarifications
  const remainingQuestions = pending?.questions.filter(q => q !== question) ?? []

  await patchUserMemory(user.id, {
    clarifying_qa: updatedQA,
    pending_clarifications: remainingQuestions.length
      ? { ...pending!, questions: remainingQuestions }
      : undefined,
  })
}

export async function skipClarifyingQuestion(question: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const current = await readUserMemory(user.id)
  const pending = current?.pending_clarifications
  if (!pending) return

  const remainingQuestions = pending.questions.filter(q => q !== question)
  await patchUserMemory(user.id, {
    pending_clarifications: remainingQuestions.length
      ? { ...pending, questions: remainingQuestions }
      : undefined,
  })
}
