'use client'

import React, { useEffect, useState } from 'react'

export default function DateHeaderWidget({ energyPct }: { energyPct: number }) {
  const [mounted, setMounted] = useState(false)
  const now = new Date()
  const dateStr = now.getDate().toString()
  const dayStr = now.toLocaleDateString('en-US', { weekday: 'long' })
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const getDaysOfWeek = () => {
    const today = new Date()
    // In JS, 0 is Sunday, 1 is Monday.
    const currentDayOfWeek = today.getDay() 
    // Make Monday = 0 and Sunday = 6
    const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1
    
    const monday = new Date(today)
    monday.setDate(today.getDate() - distanceToMonday)
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push(d)
    }
    return days
  }
  
  const daysOfWeek = getDaysOfWeek()
  
  const strokeWidth = 3.5
  const radius = 22
  const circumference = 2 * Math.PI * radius
  // Animate progress to loaded value once mounted
  const strokeDashoffset = mounted ? circumference - (energyPct / 100) * circumference : circumference

  return (
    <div style={{ marginBottom: '28px', padding: '0 4px', animation: 'fadeUp 0.3s var(--ease) both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Circular Progress */}
          <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="56" height="56" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
              <circle
                cx="28" cy="28" r={radius}
                fill="none"
                stroke="var(--bg-3)"
                strokeWidth={strokeWidth}
              />
              <circle
                cx="28" cy="28" r={radius}
                fill="none"
                stroke="var(--sage)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1) 0.1s' }}
              />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-0)' }}>
              {Math.round(energyPct)}
            </span>
          </div>
          
          {/* Date & Day */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '38px', fontWeight: 700, color: 'var(--text-0)', lineHeight: 1, letterSpacing: '-0.02em' }}>{dateStr}</span>
            <span style={{ fontSize: '26px', fontWeight: 600, color: 'var(--text-2)', lineHeight: 1, letterSpacing: '-0.01em' }}>{dayStr}</span>
          </div>
        </div>
        
        {/* Menu Icon */}
        <div style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-1)', cursor: 'pointer', transition: 'background 0.2s' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
          </svg>
        </div>
      </div>
      
      {/* Weekly Calendar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        backgroundColor: 'var(--bg-1)', 
        border: '1px solid var(--border)', 
        borderRadius: '20px', 
        padding: '16px 20px',
        boxShadow: '0 4px 24px -8px rgba(0,0,0,0.1)'
      }}>
        {daysOfWeek.map((date, i) => {
          const isToday = date.toDateString() === now.toDateString()
          // e.g. M, T, W, T...
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })[0]
          const dayNum = date.getDate()
          
          return (
            <div key={i} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '12px 0px',
              borderRadius: '16px',
              backgroundColor: isToday ? 'var(--bg-3)' : 'transparent',
              position: 'relative',
              width: '44px'
            }}>
              <span style={{ 
                fontSize: '13px', 
                fontWeight: 600, 
                color: isToday ? 'var(--text-1)' : 'var(--text-3)',
                textTransform: 'uppercase'
              }}>
                {dayName}
              </span>
              <span style={{ 
                fontSize: '15px', 
                fontWeight: isToday ? 700 : 500, 
                color: isToday ? 'var(--text-0)' : 'var(--text-2)' 
              }}>
                {dayNum}
              </span>
              {isToday && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-4px', 
                  width: '5px', 
                  height: '5px', 
                  borderRadius: '50%', 
                  backgroundColor: '#f35d56' // iOS-style red dot
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
