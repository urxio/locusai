'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserMemory, ClarifyingAnswer } from '@/lib/ai/memory'

async function patchMemory(
  userId: string,
  patchFn: (current: UserMemory) => UserMemory
): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_memory')
    .select('data')
    .eq('user_id', userId)
    .single()
  const current = (data?.data ?? {}) as UserMemory
  const updated = patchFn(current)
  await supabase
    .from('user_memory')
    .upsert({ user_id: userId, data: updated }, { onConflict: 'user_id' })
}

export async function saveClarifyingAnswer(
  question: string,
  answer: string,
  briefDate: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await patchMemory(user.id, current => {
    const newEntry: ClarifyingAnswer = {
      question,
      answer: answer.trim(),
      answered_at: new Date().toISOString(),
      brief_date: briefDate,
    }
    const updatedQA = [...(current.clarifying_qa ?? []), newEntry].slice(-30)
    const pending = current.pending_clarifications
    const remainingQuestions = pending?.questions.filter(q => q !== question) ?? []
    return {
      ...current,
      clarifying_qa: updatedQA,
      pending_clarifications: remainingQuestions.length
        ? { ...pending!, questions: remainingQuestions }
        : undefined,
    }
  })
}

export async function skipClarifyingQuestion(question: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await patchMemory(user.id, current => {
    const pending = current.pending_clarifications
    if (!pending) return current
    const remainingQuestions = pending.questions.filter(q => q !== question)
    return {
      ...current,
      pending_clarifications: remainingQuestions.length
        ? { ...pending, questions: remainingQuestions }
        : undefined,
    }
  })
}
