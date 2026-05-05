'use client'

import { useState, useRef, useEffect } from 'react'
import type { GoalStep } from '@/lib/types'

export default function StepRow({ step, onToggle, onUpdate, onDelete }: {
  step: GoalStep
  onToggle: (completed: boolean) => void
  onUpdate: (updates: { title?: string; due_date?: string | null }) => void
  onDelete: () => void
}) {
  const [editing,  setEditing]  = useState(false)
  const [title,    setTitle]    = useState(step.title)
  const [hovered,  setHovered]  = useState(false)
  const [editDate, setEditDate] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const isOverdue = step.due_date && !step.completed &&
    new Date(step.due_date + 'T23:59:59') < new Date()
  const daysLeft = step.due_date
    ? Math.ceil((new Date(step.due_date).getTime() - Date.now()) / 86400000)
    : null

  const saveTitle = () => {
    if (title.trim() && title.trim() !== step.title) onUpdate({ title: title.trim() })
    setEditing(false)
  }

  const formattedDate = step.due_date
    ? new Date(step.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setEditDate(false) }}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid var(--border)' }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(!step.completed)}
        className="icon-btn"
        style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${step.completed ? 'var(--sage)' : 'var(--border-bright)'}`, background: step.completed ? 'var(--sage)' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', padding: 0 }}
      >
        {step.completed && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title */}
      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitle(step.title); setEditing(false) } }}
          style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border-md)', borderRadius: '6px', padding: '4px 8px', fontSize: '13px', color: 'var(--text-0)', outline: 'none', fontFamily: 'inherit' }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{ flex: 1, fontSize: '13px', color: step.completed ? 'var(--text-3)' : 'var(--text-1)', textDecoration: step.completed ? 'line-through' : 'none', cursor: 'text', lineHeight: 1.4 }}
        >
          {step.title}
        </span>
      )}

      {/* Due date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {editDate ? (
          <input
            type="date"
            defaultValue={step.due_date ?? ''}
            autoFocus
            onBlur={e => { onUpdate({ due_date: e.target.value || null }); setEditDate(false) }}
            onChange={e => { if (e.target.value) onUpdate({ due_date: e.target.value }) }}
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border-md)', borderRadius: '6px', padding: '2px 6px', fontSize: '11px', color: 'var(--text-0)', outline: 'none', colorScheme: 'dark', fontFamily: 'inherit' }}
          />
        ) : formattedDate ? (
          <button
            onClick={() => setEditDate(true)}
            title="Edit due date"
            className="icon-btn"
            style={{ fontSize: '11px', color: isOverdue ? '#e07060' : step.completed ? 'var(--text-3)' : daysLeft !== null && daysLeft <= 3 ? '#e0a060' : 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', fontFamily: 'inherit' }}
          >
            {isOverdue ? '⚠ ' : ''}{formattedDate}
          </button>
        ) : hovered ? (
          <button onClick={() => setEditDate(true)} className="icon-btn" style={{ fontSize: '10px', color: 'var(--text-3)', background: 'none', border: '1px dashed var(--border-md)', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', fontFamily: 'inherit' }}>+ date</button>
        ) : null}

        {hovered && !editing && (
          <button onClick={onDelete} className="icon-btn" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', borderRadius: '4px' }} title="Remove step">×</button>
        )}
      </div>
    </div>
  )
}
