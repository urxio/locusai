'use client'

import { useEffect, useRef, useState } from 'react'

/* ─── Inline Locus logo — amber petals for dark background ─── */
function LocusLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Locus">
      <g fill="#c9a84c" opacity="0.65">
        <path d="M50,50 C36,46 34,19 50,7 C66,19 64,46 50,50" transform="rotate(45,50,50)" />
        <path d="M50,50 C36,46 34,19 50,7 C66,19 64,46 50,50" transform="rotate(135,50,50)" />
        <path d="M50,50 C36,46 34,19 50,7 C66,19 64,46 50,50" transform="rotate(225,50,50)" />
        <path d="M50,50 C36,46 34,19 50,7 C66,19 64,46 50,50" transform="rotate(315,50,50)" />
      </g>
      <g fill="#c9a84c">
        <path d="M50,50 C36,46 34,19 50,7 C66,19 64,46 50,50" />
        <path d="M50,50 C36,46 34,19 50,7 C66,19 64,46 50,50" transform="rotate(90,50,50)" />
        <path d="M50,50 C36,46 34,19 50,7 C66,19 64,46 50,50" transform="rotate(180,50,50)" />
        <path d="M50,50 C36,46 34,19 50,7 C66,19 64,46 50,50" transform="rotate(270,50,50)" />
      </g>
    </svg>
  )
}

/* ─── Scroll-fade hook ─── */
function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('.l-reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('l-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

/* ─── Brief mock card component (mirrors real app UI) ─── */
function BriefCard({ compact = false }: { compact?: boolean }) {
  const priorities = [
    {
      category: 'Fundraising',
      categoryColor: '#c9a84c',
      task: 'Draft the Series A deck introduction',
      time: '45 min',
      tod: 'Now',
      reason: "You flagged this urgent 6 days ago. Energy is right today — don't wait for perfect.",
    },
    {
      category: 'Habit',
      categoryColor: '#5a9e7a',
      task: '30-minute run',
      time: '30 min',
      tod: 'Afternoon',
      reason: 'Day 14 of your movement streak. Skipping today would be your first break.',
    },
    {
      category: 'Network',
      categoryColor: '#7a8fb5',
      task: "Reply to Maya's intro email",
      time: '10 min',
      tod: 'Evening',
      reason: "4 days since she reached out. A short reply is enough — the relationship matters.",
    },
  ]

  return (
    <div
      style={{
        background: 'var(--lc-surface)',
        border: '1px solid var(--lc-border)',
        borderRadius: '20px',
        padding: compact ? '28px' : '36px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        maxWidth: compact ? '480px' : '100%',
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: 'var(--lc-muted)', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
          Friday, May 16
        </p>
        <h3 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: compact ? '20px' : '24px', color: 'var(--lc-text)', fontWeight: 400, lineHeight: 1.3 }}>
          Hey Boris
        </h3>
      </div>

      {/* AI insight */}
      <p style={{ color: 'var(--lc-muted)', fontSize: '14px', lineHeight: 1.7, marginBottom: '20px' }}>
        Three low-energy days in a row — not a slump, just a pattern. Your writing habit is holding strong (day 14), but the investor outreach has been quiet since Tuesday. Today at 7/10 you have enough for one deep thing. Here&apos;s what actually matters.
      </p>

      {/* Energy bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: 'var(--lc-muted)', fontSize: '12px' }}>Energy today</span>
          <span style={{ color: 'var(--lc-accent)', fontSize: '13px', fontWeight: 500 }}>7 / 10</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
          <div
            className="lc-energy-fill"
            style={{
              height: '100%',
              width: '70%',
              background: 'linear-gradient(90deg, var(--lc-accent), rgba(201,168,76,0.6))',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>

      {/* Priority cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {priorities.map((p, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: p.categoryColor,
                  background: `${p.categoryColor}18`,
                  border: `1px solid ${p.categoryColor}30`,
                  borderRadius: '6px',
                  padding: '2px 8px',
                  letterSpacing: '0.03em',
                }}
              >
                {p.category}
              </span>
              <span style={{ color: 'var(--lc-muted)', fontSize: '11px' }}>{p.time}</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                }}
              >
                {p.tod}
              </span>
            </div>
            <p style={{ color: 'var(--lc-text)', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{p.task}</p>
            {!compact && (
              <p style={{ color: 'var(--lc-muted)', fontSize: '12px', lineHeight: 1.5 }}>{p.reason}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main page ─── */
export default function LandingPage() {
  useScrollReveal()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <>
      <style>{`
        /* ── Landing-scoped design tokens ── */
        .lc-root {
          --lc-bg:      #0d0c0b;
          --lc-surface: #1a1916;
          --lc-surface2: #221f1b;
          --lc-accent:  #c9a84c;
          --lc-text:    #f0ede8;
          --lc-muted:   #8a8580;
          --lc-border:  rgba(255,255,255,0.08);
          --lc-border-accent: rgba(201,168,76,0.2);

          background: var(--lc-bg);
          color: var(--lc-text);
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ── Scroll reveal ── */
        .l-reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .l-reveal.l-visible { opacity: 1; transform: translateY(0); }
        .l-reveal.l-delay-1 { transition-delay: 0.1s; }
        .l-reveal.l-delay-2 { transition-delay: 0.2s; }
        .l-reveal.l-delay-3 { transition-delay: 0.3s; }
        .l-reveal.l-delay-4 { transition-delay: 0.4s; }
        .l-reveal.l-delay-5 { transition-delay: 0.5s; }

        @media (prefers-reduced-motion: reduce) {
          .l-reveal { opacity: 1; transform: none; transition: none; }
        }

        /* ── Hero gradient orbs ── */
        @keyframes lc-orb1 {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.3; }
          50%      { transform: translate(-40px, 30px) scale(1.1); opacity: 0.5; }
        }
        @keyframes lc-orb2 {
          0%,100% { transform: translate(0,0) scale(1.05); opacity: 0.2; }
          50%      { transform: translate(30px, -20px) scale(0.95); opacity: 0.35; }
        }
        @keyframes lc-orb3 {
          0%,100% { transform: translate(0,0); opacity: 0.15; }
          33%     { transform: translate(-20px, -30px); opacity: 0.25; }
          66%     { transform: translate(20px, 10px); opacity: 0.18; }
        }
        .lc-orb1 { animation: lc-orb1 14s ease-in-out infinite; }
        .lc-orb2 { animation: lc-orb2 18s ease-in-out infinite; }
        .lc-orb3 { animation: lc-orb3 22s ease-in-out infinite; }

        /* ── Energy bar fill ── */
        @keyframes lc-bar {
          from { width: 0; }
          to   { width: 70%; }
        }
        .lc-energy-fill { animation: lc-bar 1.4s cubic-bezier(0.22,1,0.36,1) 0.8s both; }

        /* ── Step connector line ── */
        .lc-step-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(201,168,76,0.3), rgba(201,168,76,0.05));
        }

        /* ── CTA input ── */
        .lc-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          color: #f0ede8;
          font-family: inherit;
          font-size: 15px;
          padding: 14px 18px;
          outline: none;
          transition: border-color 0.2s ease;
          width: 100%;
          max-width: 320px;
        }
        .lc-input::placeholder { color: #8a8580; }
        .lc-input:focus { border-color: rgba(201,168,76,0.4); }

        .lc-btn-primary {
          background: var(--lc-accent, #c9a84c);
          border: none;
          border-radius: 10px;
          color: #0d0c0b;
          cursor: pointer;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          padding: 14px 28px;
          transition: filter 0.2s ease, transform 0.15s ease;
          white-space: nowrap;
        }
        .lc-btn-primary:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .lc-btn-primary:active { transform: translateY(0); filter: brightness(0.98); }

        .lc-btn-outline {
          background: transparent;
          border: 1px solid rgba(201,168,76,0.35);
          border-radius: 10px;
          color: #c9a84c;
          cursor: pointer;
          font-family: inherit;
          font-size: 15px;
          font-weight: 500;
          padding: 13px 28px;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .lc-btn-outline:hover {
          background: rgba(201,168,76,0.06);
          border-color: rgba(201,168,76,0.6);
        }

        /* ── Responsive helpers ── */
        @media (max-width: 900px) {
          .lc-hero-grid { flex-direction: column !important; }
          .lc-hero-card { max-width: 100% !important; }
          .lc-problem-grid { flex-direction: column !important; }
          .lc-steps-row { flex-direction: column !important; }
          .lc-step-line { display: none !important; }
          .lc-arc-grid { flex-direction: column !important; }
          .lc-quote-grid { flex-direction: column !important; }
          .lc-cta-row { flex-direction: column !important; align-items: stretch !important; }
          .lc-input { max-width: 100% !important; }
        }
        @media (max-width: 640px) {
          .lc-hero-h { font-size: clamp(36px, 10vw, 64px) !important; }
          .lc-section-title { font-size: clamp(24px, 6vw, 38px) !important; }
        }
      `}</style>

      <div className="lc-root">

        {/* ═══════════════ NAV ═══════════════ */}
        <nav
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            padding: '20px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(13,12,11,0.9) 0%, transparent 100%)',
          }}
        >
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', cursor: 'pointer' }}>
            <LocusLogo size={28} />
            <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '19px', color: '#f0ede8', letterSpacing: '0.01em' }}>
              Locus
            </span>
          </a>
          <a href="#cta" style={{ textDecoration: 'none' }}>
            <button className="lc-btn-outline" style={{ padding: '9px 20px', fontSize: '14px' }}>
              Start for free
            </button>
          </a>
        </nav>

        {/* ═══════════════ HERO ═══════════════ */}
        <section
          style={{
            minHeight: '100vh',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            padding: '120px 40px 80px',
            overflow: 'hidden',
          }}
        >
          {/* Animated gradient orbs */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div
              className="lc-orb1"
              style={{
                position: 'absolute',
                top: '15%',
                left: '20%',
                width: '500px',
                height: '500px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />
            <div
              className="lc-orb2"
              style={{
                position: 'absolute',
                top: '40%',
                right: '10%',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            <div
              className="lc-orb3"
              style={{
                position: 'absolute',
                bottom: '10%',
                left: '40%',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)',
                filter: 'blur(50px)',
              }}
            />
          </div>

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <div
              className="lc-hero-grid"
              style={{ display: 'flex', alignItems: 'center', gap: '80px', justifyContent: 'space-between' }}
            >
              {/* Left: copy */}
              <div style={{ flex: '1 1 480px', maxWidth: '560px' }}>
                <div
                  className="l-reveal"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(201,168,76,0.08)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    borderRadius: '100px',
                    padding: '6px 14px',
                    marginBottom: '32px',
                  }}
                >
                  <LocusLogo size={14} />
                  <span style={{ fontSize: '12px', color: '#c9a84c', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
                    Your AI life companion
                  </span>
                </div>

                <h1
                  className="l-reveal l-delay-1 lc-hero-h"
                  style={{
                    fontFamily: 'var(--font-serif, Georgia, serif)',
                    fontSize: 'clamp(44px, 5vw, 72px)',
                    fontWeight: 400,
                    color: '#f0ede8',
                    lineHeight: 1.1,
                    marginBottom: '24px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  The companion that actually knows you.
                </h1>

                <p
                  className="l-reveal l-delay-2"
                  style={{
                    fontSize: '18px',
                    color: '#8a8580',
                    lineHeight: 1.65,
                    marginBottom: '40px',
                    maxWidth: '440px',
                  }}
                >
                  Most apps track your habits. Locus understands what they mean.
                  Every check-in, every pattern — remembered, and put to work for you.
                </p>

                <div className="l-reveal l-delay-3">
                  <a href="#cta" style={{ textDecoration: 'none' }}>
                    <button className="lc-btn-primary" style={{ fontSize: '16px', padding: '16px 36px' }}>
                      Start for free
                    </button>
                  </a>
                  <p style={{ marginTop: '16px', fontSize: '13px', color: 'rgba(138,133,128,0.7)' }}>
                    No credit card. Just clarity.
                  </p>
                </div>
              </div>

              {/* Right: Daily Brief mock */}
              <div
                className="l-reveal l-delay-4 lc-hero-card"
                style={{ flex: '1 1 380px', maxWidth: '460px', width: '100%' }}
              >
                <BriefCard compact={true} />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ THE PROBLEM ═══════════════ */}
        <section style={{ padding: '100px 40px', position: 'relative' }}>
          {/* Subtle separator */}
          <div style={{ maxWidth: '1200px', margin: '0 auto 80px', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div
              className="lc-problem-grid"
              style={{ display: 'flex', gap: '24px' }}
            >
              {[
                {
                  setup: 'You set goals.',
                  punchline: 'They sit untouched after week 2.',
                  sub: 'Not because you forgot. Because nothing connected them to today.',
                },
                {
                  setup: 'You track habits.',
                  punchline: "But you don't know what they actually mean.",
                  sub: 'The streak number tells you nothing about how you feel.',
                },
                {
                  setup: 'You journal.',
                  punchline: 'It never talks back.',
                  sub: 'You write into the void. The patterns are there. No one sees them.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`l-reveal l-delay-${i + 1}`}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    padding: '32px 28px',
                  }}
                >
                  <p style={{ fontSize: '14px', color: '#8a8580', marginBottom: '12px', letterSpacing: '0.01em' }}>
                    {item.setup}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-serif, Georgia, serif)',
                      fontSize: '22px',
                      color: '#f0ede8',
                      fontWeight: 400,
                      lineHeight: 1.3,
                      marginBottom: '16px',
                    }}
                  >
                    {item.punchline}
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(138,133,128,0.7)', lineHeight: 1.6 }}>
                    {item.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ HOW IT WORKS ═══════════════ */}
        <section style={{ padding: '80px 40px 100px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '64px' }}>
              <h2
                className="l-reveal lc-section-title"
                style={{
                  fontFamily: 'var(--font-serif, Georgia, serif)',
                  fontSize: 'clamp(28px, 3.5vw, 46px)',
                  fontWeight: 400,
                  color: '#f0ede8',
                  lineHeight: 1.2,
                  maxWidth: '600px',
                }}
              >
                A brief that knows today is different from yesterday.
              </h2>
            </div>

            {/* Steps */}
            <div
              className="lc-steps-row"
              style={{ display: 'flex', alignItems: 'flex-start', gap: '0' }}
            >
              {[
                {
                  num: '01',
                  title: 'Check in',
                  body: "Rate your energy (1–10). Note what's in the way. 30 seconds.",
                  detail: '"Low energy. Investor email is weighing on me."',
                },
                {
                  num: '02',
                  title: 'Locus connects the dots',
                  body: 'Your goals × your habits × your energy pattern. Claude generates a brief specific to this exact day.',
                  detail: '"Your fundraising goal. Your 14-day streak. What you said yesterday."',
                },
                {
                  num: '03',
                  title: 'Three priorities',
                  body: 'Ranked by urgency × goal alignment × how much energy you actually have right now.',
                  detail: '"Not a to-do list. A sequence."',
                },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                  <div className={`l-reveal l-delay-${i + 1}`} style={{ flex: 1, padding: '0 32px 0 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-serif, Georgia, serif)',
                          fontSize: '13px',
                          color: '#c9a84c',
                          letterSpacing: '0.06em',
                          opacity: 0.8,
                        }}
                      >
                        {step.num}
                      </span>
                      <div style={{ height: '1px', flex: 1, background: 'rgba(201,168,76,0.2)' }} />
                    </div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-serif, Georgia, serif)',
                        fontSize: '22px',
                        fontWeight: 400,
                        color: '#f0ede8',
                        marginBottom: '12px',
                        lineHeight: 1.25,
                      }}
                    >
                      {step.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#8a8580', lineHeight: 1.65, marginBottom: '16px' }}>
                      {step.body}
                    </p>
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'rgba(201,168,76,0.7)',
                        fontStyle: 'italic',
                        lineHeight: 1.5,
                        background: 'rgba(201,168,76,0.06)',
                        border: '1px solid rgba(201,168,76,0.12)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                      }}
                    >
                      {step.detail}
                    </p>
                  </div>

                  {/* Arrow connector between steps */}
                  {i < 2 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        paddingTop: '52px',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="28" height="12" viewBox="0 0 28 12" fill="none" style={{ opacity: 0.25 }}>
                        <path d="M0 6h24M20 2l6 4-6 4" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ RELATIONSHIP ARC ═══════════════ */}
        <section
          style={{
            padding: '80px 40px 100px',
            background: 'linear-gradient(180deg, transparent 0%, rgba(26,25,22,0.6) 30%, rgba(26,25,22,0.6) 70%, transparent 100%)',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2
              className="l-reveal lc-section-title"
              style={{
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: 'clamp(28px, 3.5vw, 46px)',
                fontWeight: 400,
                color: '#f0ede8',
                marginBottom: '64px',
                lineHeight: 1.2,
              }}
            >
              It gets more valuable the longer you use it.
            </h2>

            {/* Arc cards */}
            <div
              className="lc-arc-grid"
              style={{ display: 'flex', gap: '20px', marginBottom: '64px' }}
            >
              {[
                {
                  era: 'Day 1',
                  eraColor: 'rgba(138,133,128,0.5)',
                  title: 'Locus knows what you shared.',
                  body: "It doesn't know you yet — and it says so. No false confidence. Just a first brief built on what you told it.",
                  accent: '#8a8580',
                },
                {
                  era: 'Week 2',
                  eraColor: 'rgba(201,168,76,0.5)',
                  title: 'Locus starts noticing.',
                  body: 'Energy dips on Thursdays. The writing habit holds, but the workout streak is softening. It starts to say so.',
                  accent: '#c9a84c',
                },
                {
                  era: 'Month 1+',
                  eraColor: 'rgba(201,168,76,0.9)',
                  title: 'Locus knows this person.',
                  body: "It catches when something's off before you name it. It references what you said three weeks ago. It remembers.",
                  accent: '#c9a84c',
                },
              ].map((arc, i) => (
                <div
                  key={i}
                  className={`l-reveal l-delay-${i + 1}`}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.025)',
                    border: `1px solid ${arc.accent}25`,
                    borderRadius: '16px',
                    padding: '28px 24px',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: arc.eraColor,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: '16px',
                    }}
                  >
                    {arc.era}
                  </span>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif, Georgia, serif)',
                      fontSize: '20px',
                      fontWeight: 400,
                      color: '#f0ede8',
                      marginBottom: '12px',
                      lineHeight: 1.3,
                    }}
                  >
                    {arc.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#8a8580', lineHeight: 1.65 }}>{arc.body}</p>
                </div>
              ))}
            </div>

            {/* Testimonials */}
            <div
              className="lc-quote-grid"
              style={{ display: 'flex', gap: '20px' }}
            >
              {[
                {
                  quote: "It told me I'd been avoiding the investor email for 11 days. I hadn't noticed.",
                  author: 'Boris',
                  context: 'Founder',
                },
                {
                  quote: "I said I was fine in the check-in. Locus said: 'Energy lower than usual three days running — what's actually in the way?' It was right.",
                  author: 'Sarah',
                  context: 'Product designer',
                },
                {
                  quote: "It remembered I had a hard month in March. In April, it adjusted what it asked of me. That felt like being known.",
                  author: 'Marcus',
                  context: 'Writer',
                },
              ].map((q, i) => (
                <div
                  key={i}
                  className={`l-reveal l-delay-${i + 1}`}
                  style={{
                    flex: 1,
                    padding: '24px',
                    borderLeft: '2px solid rgba(201,168,76,0.25)',
                    paddingLeft: '20px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-serif, Georgia, serif)',
                      fontSize: '17px',
                      color: 'rgba(240,237,232,0.85)',
                      fontStyle: 'italic',
                      lineHeight: 1.6,
                      marginBottom: '14px',
                    }}
                  >
                    &ldquo;{q.quote}&rdquo;
                  </p>
                  <p style={{ fontSize: '13px', color: '#8a8580' }}>
                    — {q.author}
                    <span style={{ color: 'rgba(138,133,128,0.5)', marginLeft: '6px' }}>{q.context}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ THE BRIEF (full preview) ═══════════════ */}
        <section style={{ padding: '80px 40px 100px' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <h2
                className="l-reveal lc-section-title"
                style={{
                  fontFamily: 'var(--font-serif, Georgia, serif)',
                  fontSize: 'clamp(28px, 3.5vw, 46px)',
                  fontWeight: 400,
                  color: '#f0ede8',
                  marginBottom: '16px',
                }}
              >
                Here&apos;s what Monday could look like.
              </h2>
              <p className="l-reveal l-delay-1" style={{ fontSize: '16px', color: '#8a8580' }}>
                A brief built for you — not for everyone.
              </p>
            </div>

            <div className="l-reveal l-delay-2">
              <BriefCard compact={false} />
            </div>
          </div>
        </section>

        {/* ═══════════════ CTA FOOTER ═══════════════ */}
        <section
          id="cta"
          style={{
            padding: '100px 40px 120px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Soft glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '600px',
              height: '300px',
              background: 'radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%)',
              filter: 'blur(40px)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto' }}>
            <div style={{ marginBottom: '40px' }}>
              <LocusLogo size={40} />
            </div>

            <h2
              className="l-reveal lc-section-title"
              style={{
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: 'clamp(32px, 4vw, 52px)',
                fontWeight: 400,
                color: '#f0ede8',
                lineHeight: 1.2,
                marginBottom: '16px',
              }}
            >
              Know yourself better.
              <br />
              <span style={{ color: '#c9a84c' }}>Start today.</span>
            </h2>

            <p
              className="l-reveal l-delay-1"
              style={{ fontSize: '16px', color: '#8a8580', marginBottom: '48px', lineHeight: 1.6 }}
            >
              The only place that knows this version of your life.
            </p>

            {submitted ? (
              <div
                className="l-reveal"
                style={{
                  background: 'rgba(201,168,76,0.08)',
                  border: '1px solid rgba(201,168,76,0.25)',
                  borderRadius: '12px',
                  padding: '24px 32px',
                  color: '#c9a84c',
                }}
              >
                <p style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '20px', marginBottom: '8px' }}>
                  You&apos;re on the list.
                </p>
                <p style={{ fontSize: '14px', color: '#8a8580' }}>We&apos;ll reach out when your spot opens.</p>
              </div>
            ) : (
              <div
                className="l-reveal l-delay-2 lc-cta-row"
                style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center' }}
              >
                <input
                  className="lc-input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && email) setSubmitted(true)
                  }}
                  aria-label="Email address"
                />
                <button
                  className="lc-btn-primary"
                  onClick={() => { if (email) setSubmitted(true) }}
                >
                  Get early access
                </button>
              </div>
            )}

            <p
              className="l-reveal l-delay-3"
              style={{ marginTop: '20px', fontSize: '13px', color: 'rgba(138,133,128,0.55)' }}
            >
              No credit card. No noise. Just clarity.
            </p>
          </div>
        </section>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <footer
          style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            padding: '32px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LocusLogo size={18} />
            <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '15px', color: 'rgba(240,237,232,0.4)' }}>
              Locus
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(138,133,128,0.4)' }}>
            © 2025 Locus. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '24px' }}>
            <a href="/privacy" style={{ fontSize: '13px', color: 'rgba(138,133,128,0.4)', textDecoration: 'none' }}>
              Privacy
            </a>
          </div>
        </footer>

      </div>
    </>
  )
}
