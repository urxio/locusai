'use client'

export default function WeeklyCalendarStrip() {
  const now = new Date()

  const getDaysOfWeek = () => {
    const today = new Date()
    const currentDayOfWeek = today.getDay()
    const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - distanceToMonday)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }

  const days = getDaysOfWeek()

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      padding: '14px 16px',
      marginBottom: '20px',
      animation: 'fadeUp 0.3s var(--ease) both',
    }}>
      {days.map((date, i) => {
        const isToday = date.toDateString() === now.toDateString()
        // First letter of weekday abbreviation e.g. "M", "T", "W"
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })[0]
        const dayNum = date.getDate()

        return (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 0',
            borderRadius: '14px',
            background: isToday ? 'var(--bg-3)' : 'transparent',
            position: 'relative',
            width: '42px',
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: isToday ? 'var(--text-1)' : 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {dayName}
            </span>
            <span style={{
              fontSize: '15px',
              fontWeight: isToday ? 700 : 500,
              color: isToday ? 'var(--text-0)' : 'var(--text-2)',
            }}>
              {dayNum}
            </span>
            {isToday && (
              <div style={{
                position: 'absolute',
                bottom: '-5px',
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#f35d56',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
