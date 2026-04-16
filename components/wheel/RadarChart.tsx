'use client'

import { WHEEL_AREAS, type WheelScores } from '@/lib/types'

const SIZE = 300
const CX = SIZE / 2
const CY = SIZE / 2
const R = 108
const N = WHEEL_AREAS.length
const LEVELS = [2, 4, 6, 8, 10]

function angleFor(index: number) {
  // Start from top (-π/2), clockwise
  return (index / N) * 2 * Math.PI - Math.PI / 2
}

function toXY(index: number, value: number) {
  const angle = angleFor(index)
  const r = (value / 10) * R
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
}

function points(scores: WheelScores) {
  return WHEEL_AREAS.map((a, i) => {
    const { x, y } = toXY(i, scores[a.key] ?? 0)
    return `${x},${y}`
  }).join(' ')
}

function gridPoints(level: number) {
  return WHEEL_AREAS.map((_, i) => {
    const { x, y } = toXY(i, level)
    return `${x},${y}`
  }).join(' ')
}

export default function RadarChart({
  scores,
  suggested,
}: {
  scores: WheelScores
  suggested?: Partial<WheelScores>
}) {
  const hasScores = WHEEL_AREAS.some(a => (scores[a.key] ?? 0) > 0)

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}
    >
      {/* Grid */}
      {LEVELS.map(level => (
        <polygon
          key={level}
          points={gridPoints(level)}
          fill="none"
          stroke="var(--border)"
          strokeWidth={level === 10 ? 1.2 : 0.7}
          strokeDasharray={level === 10 ? undefined : '3 3'}
        />
      ))}

      {/* Axis lines */}
      {WHEEL_AREAS.map((_, i) => {
        const outer = toXY(i, 10)
        return (
          <line key={i} x1={CX} y1={CY} x2={outer.x} y2={outer.y}
            stroke="var(--border)" strokeWidth={0.7} />
        )
      })}

      {/* Suggested scores ghost polygon */}
      {suggested && (
        <polygon
          points={WHEEL_AREAS.map((a, i) => {
            const v = suggested[a.key]
            if (v == null) return `${CX},${CY}`
            const { x, y } = toXY(i, v)
            return `${x},${y}`
          }).join(' ')}
          fill="var(--sage)"
          fillOpacity={0.08}
          stroke="var(--sage)"
          strokeWidth={1.2}
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
      )}

      {/* User score polygon */}
      {hasScores && (
        <polygon
          points={points(scores)}
          fill="var(--gold)"
          fillOpacity={0.18}
          stroke="var(--gold)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}

      {/* Score dots */}
      {WHEEL_AREAS.map((a, i) => {
        const v = scores[a.key] ?? 0
        if (v === 0) return null
        const { x, y } = toXY(i, v)
        return (
          <circle key={a.key} cx={x} cy={y} r={4.5}
            fill="var(--gold)" stroke="var(--bg-1)" strokeWidth={1.5} />
        )
      })}

      {/* Labels */}
      {WHEEL_AREAS.map((a, i) => {
        const angle = angleFor(i)
        const lx = CX + (R + 26) * Math.cos(angle)
        const ly = CY + (R + 26) * Math.sin(angle)
        const anchor = Math.cos(angle) > 0.2 ? 'start' : Math.cos(angle) < -0.2 ? 'end' : 'middle'
        return (
          <text key={a.key} x={lx} y={ly}
            textAnchor={anchor} dominantBaseline="middle"
            fontSize={9.5} fontFamily="var(--font-sans)" fill="var(--text-2)"
            style={{ userSelect: 'none' }}>
            {a.label}
          </text>
        )
      })}

      {/* Level numbers along top axis */}
      {LEVELS.map(level => {
        const { y } = toXY(0, level)
        return (
          <text key={level} x={CX + 5} y={y - 1}
            fontSize={7} fontFamily="var(--font-sans)" fill="var(--text-3)"
            dominantBaseline="middle">
            {level}
          </text>
        )
      })}
    </svg>
  )
}
