/**
 * Extracts a short mood word from a free-text mood note.
 * Strips common prefixes like "feeling", "I'm", "I feel", etc.
 * Returns up to 2 words, or '—' if empty.
 */
export function moodWord(note: string | null): string {
  if (!note) return '—'
  const cleaned = note.replace(/^(feeling|i('m| am|feel)\s+)/i, '').trim()
  const words   = cleaned.split(/[\s,;.]+/).filter(Boolean)
  return words.slice(0, 2).join(' ') || '—'
}
