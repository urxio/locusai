/** Derives a human-readable frequency label and weekly target_count from days_of_week */
export function deriveFrequencyMeta(days: number[]): { frequency: string; target_count: number } {
  const sorted = [...days].sort((a, b) => a - b)
  if (sorted.length === 0 || sorted.length === 7) return { frequency: 'Daily', target_count: 7 }
  if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5])) return { frequency: 'Weekdays', target_count: 5 }
  if (JSON.stringify(sorted) === JSON.stringify([0, 6])) return { frequency: 'Weekends', target_count: 2 }
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return {
    frequency: sorted.map(d => names[d]).join(' · '),
    target_count: sorted.length,
  }
}
