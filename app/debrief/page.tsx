'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { DebriefResult, DryRunConfig } from '@/lib/types'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function getPillStyle(tactic: string): React.CSSProperties {
  const lower = tactic.toLowerCase()
  if (lower.includes('guilt') || lower.includes('silence') || lower.includes('pressure')) {
    return {
      padding: '5px 12px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: 'var(--amber-bg)',
      color: 'var(--amber)',
      border: '1px solid var(--amber-border)',
    }
  }
  return {
    padding: '5px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: 'var(--red-bg)',
    color: 'var(--red)',
    border: '1px solid var(--red-border)',
  }
}

export default function DebriefPage() {
  const router = useRouter()
  const [result, setResult] = useState<DebriefResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<DryRunConfig | null>(null)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [exchangeCount, setExchangeCount] = useState(0)

  useEffect(() => {
    const transcript = sessionStorage.getItem('dryrun_transcript')
    const savedConfig = sessionStorage.getItem('dryrun_config')
    const startTime = sessionStorage.getItem('dryrun_start_time')

    if (!transcript) {
      router.push('/')
      return
    }

    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig) as DryRunConfig)
      } catch {}
    }

    if (startTime) {
      const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000)
      setSessionDuration(elapsed)
    }

    // Count exchanges (lines in transcript)
    const lines = transcript.split('\n').filter((l) => l.trim().length > 0)
    setExchangeCount(lines.length)

    fetch('/api/debrief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    })
      .then((r) => r.json())
      .then((data: DebriefResult) => setResult(data))
      .catch(() => setError('Failed to generate debrief. Please try again.'))
      .finally(() => setIsLoading(false))
  }, [router])

  function handleRunAgain() {
    // Keep config, clear session data so they restart fresh
    sessionStorage.removeItem('dryrun_transcript')
    sessionStorage.removeItem('dryrun_transcript_temp')
    sessionStorage.removeItem('dryrun_start_time')
    router.push('/')
  }

  function handleNewScenario() {
    sessionStorage.clear()
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Topbar */}
      <div style={{ background: 'var(--navy)', padding: '0 24px' }}>
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 56,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: 'white' }}>
              Dry<span style={{ color: '#fb923c' }}>Run</span>
            </span>
            <span
              className="topbar-tagline"
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'var(--font-jetbrains)',
                letterSpacing: '0.06em',
                marginLeft: 10,
              }}
            >
              practice before it costs you
            </span>
          </div>
          <div className="topbar-nav">
            {[
              { label: 'Setup', num: '1', state: 'done' },
              { label: 'Session', num: '2', state: 'done' },
              { label: 'Debrief', num: '3', state: 'active' },
            ].map((tab) => (
              <div
                key={tab.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: tab.state === 'active' ? 'white' : tab.state === 'done' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.45)',
                  background: tab.state === 'active' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  letterSpacing: '0.01em',
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: tab.state === 'active' ? 'var(--orange)' : tab.state === 'done' ? 'var(--green)' : 'rgba(255,255,255,0.08)',
                    fontSize: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-jetbrains)',
                    color: 'white',
                  }}
                >
                  {tab.num}
                </span>
                {tab.label}
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-jetbrains)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
            Complete
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="page-content">
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              paddingTop: 100,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--navy)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <div
              style={{
                fontSize: 15,
                color: 'var(--text2)',
                fontFamily: 'var(--font-jetbrains)',
                letterSpacing: '0.04em',
              }}
            >
              Analysing your session...
            </div>
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: 'center',
              paddingTop: 100,
              color: 'var(--red)',
              fontSize: 15,
            }}
          >
            {error}
          </div>
        ) : result ? (
          <>
            {/* Top row */}
            <div className="layout-debrief-top">
              <div>
                <h1
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    color: 'var(--navy)',
                    lineHeight: 1.1,
                    marginBottom: 8,
                  }}
                >
                  Your debrief.
                </h1>
                <p style={{ fontSize: 15, color: 'var(--text2)' }}>
                  {config?.scenario
                    ? `${config.scenario} — here's what happened.`
                    : "Here's what happened — and how to win the real conversation."}
                </p>
              </div>
              <div
                style={{
                  background: 'var(--navy)',
                  borderRadius: 16,
                  padding: '20px 24px',
                  textAlign: 'center',
                  minWidth: 140,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-jetbrains)',
                    marginBottom: 4,
                  }}
                >
                  Readiness
                </div>
                <div
                  style={{
                    fontSize: 54,
                    fontWeight: 800,
                    letterSpacing: '-0.05em',
                    color: 'white',
                    lineHeight: 1,
                    fontFamily: 'var(--font-jetbrains)',
                  }}
                >
                  {result.score.toFixed(1)}
                  <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                    /10
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#fb923c',
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
                  {result.verdict}
                </div>
              </div>
            </div>

            {/* 2x2 card grid */}
            <div className="layout-debrief-grid">
              {/* Card 1: Tactics used */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <div style={cardTitleStyle}>Tactics they used</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.tactics.map((tactic, i) => (
                    <span key={i} style={getPillStyle(tactic)}>
                      {tactic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card 2: Session stats */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <div style={cardTitleStyle}>Session stats</div>
                {[
                  { label: 'Duration', value: formatTime(sessionDuration) },
                  { label: 'Exchanges', value: String(exchangeCount) },
                  { label: 'Tactics handled', value: `${result.tactics.length} of ${result.tactics.length}` },
                  { label: 'Caved on', value: `${result.improvements.length} moment${result.improvements.length !== 1 ? 's' : ''}` },
                ].map((stat, i, arr) => (
                  <div
                    key={stat.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{stat.label}</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: 'var(--font-jetbrains)',
                        color: stat.label === 'Caved on' && result.improvements.length > 0
                          ? 'var(--red)'
                          : 'var(--text)',
                      }}
                    >
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Card 3: What you did well */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <div style={cardTitleStyle}>What you did well</div>
                {result.strengths.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: 8,
                      marginBottom: i < result.strengths.length - 1 ? 8 : 0,
                      background: 'var(--green-bg)',
                      border: '1px solid var(--green-border)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        flexShrink: 0,
                        marginTop: 1,
                        color: 'var(--green)',
                      }}
                    >
                      ✓
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        lineHeight: 1.55,
                        fontWeight: 500,
                        color: '#15803d',
                      }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* Card 4: Fix this next time */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <div style={cardTitleStyle}>Fix this next time</div>
                {result.improvements.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: 8,
                      marginBottom: i < result.improvements.length - 1 ? 8 : 0,
                      background: 'var(--amber-bg)',
                      border: '1px solid var(--amber-border)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        flexShrink: 0,
                        marginTop: 1,
                        color: 'var(--amber)',
                      }}
                    >
                      →
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        lineHeight: 1.55,
                        fontWeight: 500,
                        color: '#92400e',
                      }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom buttons */}
            <div className="layout-buttons">
              <button
                onClick={handleRunAgain}
                style={{
                  background: 'var(--orange)',
                  border: 'none',
                  borderRadius: 12,
                  padding: 15,
                  fontFamily: 'var(--font-bricolage)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Run it again →
              </button>
              <button
                onClick={handleNewScenario}
                style={{
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 12,
                  padding: 15,
                  fontFamily: 'var(--font-bricolage)',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--text2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Try a different scenario
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--text3)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  fontFamily: 'var(--font-jetbrains)',
  marginBottom: 14,
}
