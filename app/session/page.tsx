'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getVapi } from '@/lib/vapi'
import type { DryRunConfig, TranscriptMessage, CallStatus } from '@/lib/types'

const TACTIC_DESCRIPTIONS: Record<string, string> = {
  'Timing deflection': "Using the budget cycle or timing as a shield. Don't accept it — push back with your impact data.",
  'Guilt trip': "Leveraging your history together to make you feel obligated. Name it and stay focused on facts.",
  'Third party pressure': "Bringing in the team or others to shift pressure onto you. Redirect to the two of you.",
  'Offer trap': "Presenting a pre-planned outcome to limit your options. Slow down and reframe the conversation.",
}

const TACTIC_TIPS: Record<string, [string, string]> = {
  'Timing deflection': [
    'Lead with a specific number or ask now. She asked — don\'t give a range.',
    'Say: "I understand the timing. Let\'s agree on a date to revisit — I want that in writing."',
  ],
  'Guilt trip': [
    'Acknowledge the relationship, then pivot back to the facts.',
    'Say: "I value what we\'ve built. That\'s exactly why I want this resolved clearly."',
  ],
  'Third party pressure': [
    'Don\'t let the team become the issue. Bring it back to a 1:1 conversation.',
    'Say: "I want to figure this out between us first before involving anyone else."',
  ],
  'Offer trap': [
    'Pause before responding. Ask a clarifying question to buy time.',
    'Say: "Can you walk me through how you arrived at that? I want to understand the full picture."',
  ],
}

const DEFAULT_TIPS: [string, string] = [
  'Listen for deflection tactics — they\'ll come early.',
  'Slow down. Silence is your friend. Don\'t fill the gaps.',
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function detectTactic(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes('timing') || lower.includes('budget') || lower.includes('budget cycle')) {
    return 'Timing deflection'
  }
  if (lower.includes('after everything') || lower.includes('all i\'ve done') || lower.includes('everything i\'ve')) {
    return 'Guilt trip'
  }
  if (lower.includes('think about the team') || lower.includes('what about the team')) {
    return 'Third party pressure'
  }
  if (lower.includes('we were planning') || lower.includes('we had planned') || lower.includes('already planned')) {
    return 'Offer trap'
  }
  return null
}

export default function SessionPage() {
  const router = useRouter()
  const [config, setConfig] = useState<DryRunConfig | null>(null)
  const [callStatus, setCallStatus] = useState<CallStatus>('connecting')
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTactic, setCurrentTactic] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('dryrun_config')
    if (!saved) {
      router.push('/')
      return
    }
    const parsedConfig = JSON.parse(saved) as DryRunConfig
    setConfig(parsedConfig)

    // Save session start time for debrief stats
    sessionStorage.setItem('dryrun_start_time', Date.now().toString())

    const vapi = getVapi()

    vapi.on('call-start', () => {
      setCallStatus('active')
    })

    vapi.on('call-end', () => {
      setCallStatus('ended')
      // Read transcript from sessionStorage (avoids stale closure on React state)
      const tempTranscript = sessionStorage.getItem('dryrun_transcript_temp') ?? ''
      sessionStorage.setItem('dryrun_transcript', tempTranscript)
      router.push('/debrief')
    })

    vapi.on('message', (message: {
      type: string
      transcriptType?: string
      role?: string
      transcript?: string
    }) => {
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        const msg: TranscriptMessage = {
          role: (message.role === 'assistant' ? 'assistant' : 'user'),
          text: message.transcript ?? '',
          timestamp: Date.now(),
        }

        setTranscript((prev) => {
          const updated = [...prev, msg]

          // Write rolling transcript to sessionStorage to avoid stale closure in call-end
          const textLines = updated
            .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.text}`)
            .join('\n')
          sessionStorage.setItem('dryrun_transcript_temp', textLines)

          // Tactic detection on assistant messages
          if (msg.role === 'assistant') {
            const tactic = detectTactic(msg.text)
            if (tactic) setCurrentTactic(tactic)
          }

          return updated
        })
      }
    })

    vapi.on('speech-start', () => setIsSpeaking(true))
    vapi.on('speech-end', () => setIsSpeaking(false))
    vapi.on('error', (e: unknown) => console.error('Vapi error:', e))

    // Timer
    const timerInterval = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)

    return () => {
      clearInterval(timerInterval)
      vapi.removeAllListeners()
    }
  }, [router])

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript.length])

  function handleMute() {
    const vapi = getVapi()
    const newMuted = !isMuted
    vapi.setMuted(newMuted)
    setIsMuted(newMuted)
  }

  function handleEnd() {
    const vapi = getVapi()
    vapi.stop()
    // call-end event will handle redirect
  }

  const personName = config?.personName || 'Echo'
  const tips = currentTactic ? TACTIC_TIPS[currentTactic] ?? DEFAULT_TIPS : DEFAULT_TIPS

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
              { label: 'Session', num: '2', state: 'active' },
              { label: 'Debrief', num: '3', state: 'pending' },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-jetbrains)', fontSize: 11 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: callStatus === 'active' ? 'var(--green)' : 'rgba(255,255,255,0.3)',
                animation: callStatus === 'active' ? 'blink 1.4s infinite' : 'none',
              }}
            />
            <span style={{ color: callStatus === 'active' ? 'var(--green)' : 'rgba(255,255,255,0.4)' }}>
              {callStatus === 'active' ? 'Live' : callStatus === 'connecting' ? 'Connecting...' : 'Ended'}
            </span>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="page-content">
        <div className="layout-session">
          {/* LEFT COLUMN */}
          <div>
            {/* Session hero */}
            <div
              style={{
                background: 'var(--navy)',
                borderRadius: 14,
                padding: '18px 20px',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: 'white', marginBottom: 4 }}>
                  {config?.scenario ?? 'Loading...'}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                  {config?.personality ?? ''} · {config?.personRole ?? ''} · Riley voice
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(74,222,128,0.12)',
                  border: '1px solid rgba(74,222,128,0.25)',
                  borderRadius: 20,
                  padding: '7px 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#4ade80',
                  fontFamily: 'var(--font-jetbrains)',
                  letterSpacing: '0.06em',
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#4ade80',
                    animation: 'blink 1.4s infinite',
                  }}
                />
                LIVE
              </div>
            </div>

            {/* Waveform */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 22,
                marginBottom: 14,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 52 }}>
                {Array.from({ length: 15 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 4,
                      borderRadius: 3,
                      background: isSpeaking ? 'var(--navy)' : 'var(--border2)',
                      height: isSpeaking ? undefined : 5,
                      transformOrigin: 'bottom',
                      animation: isSpeaking
                        ? `wave 0.9s ease-in-out infinite ${i * 0.06}s`
                        : 'none',
                      ...(isSpeaking ? { height: undefined } : {}),
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text3)',
                  fontFamily: 'var(--font-jetbrains)',
                  letterSpacing: '0.04em',
                }}
              >
                {isSpeaking
                  ? `${personName} is speaking...`
                  : callStatus === 'connecting'
                  ? 'Connecting to session...'
                  : 'Waiting for response...'}
              </div>
            </div>

            {/* Transcript */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 16,
                marginBottom: 14,
                maxHeight: 230,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {transcript.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text3)',
                    textAlign: 'center',
                    padding: '20px 0',
                    fontFamily: 'var(--font-jetbrains)',
                  }}
                >
                  Conversation will appear here...
                </div>
              ) : (
                transcript.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: msg.role === 'assistant' ? 'var(--navy)' : 'var(--surface2)',
                        border: msg.role === 'user' ? '1px solid var(--border)' : 'none',
                        color: msg.role === 'assistant' ? 'white' : 'var(--text2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                        fontFamily: 'var(--font-jetbrains)',
                      }}
                    >
                      {msg.role === 'assistant'
                        ? (personName[0] ?? 'A').toUpperCase()
                        : 'Y'}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--text3)',
                          marginBottom: 3,
                          fontFamily: 'var(--font-jetbrains)',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {msg.role === 'assistant' ? `${personName} (Echo)` : 'You'}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: msg.role === 'assistant' ? 'var(--text)' : 'var(--text2)',
                          fontWeight: msg.role === 'assistant' ? 600 : 400,
                          lineHeight: 1.55,
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={handleMute}
                style={{
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  padding: 13,
                  fontFamily: 'var(--font-bricolage)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text2)',
                  cursor: 'pointer',
                }}
              >
                {isMuted ? '🔇 Unmute mic' : '⏸ Mute mic'}
              </button>
              <button
                onClick={handleEnd}
                style={{
                  background: 'var(--red-bg)',
                  border: '1.5px solid var(--red-border)',
                  borderRadius: 10,
                  padding: 13,
                  fontFamily: 'var(--font-bricolage)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--red)',
                  cursor: 'pointer',
                }}
              >
                End session →
              </button>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div>
            {/* Tactic detected */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text3)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-jetbrains)',
                  marginBottom: 12,
                }}
              >
                Tactic detected
              </div>
              {currentTactic ? (
                <div
                  style={{
                    background: 'var(--red-bg)',
                    border: '1px solid var(--red-border)',
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--red)',
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    ⚠ {currentTactic}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                    {TACTIC_DESCRIPTIONS[currentTactic]}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text3)',
                    fontFamily: 'var(--font-jetbrains)',
                    padding: '8px 0',
                  }}
                >
                  Listening for tactics...
                </div>
              )}
            </div>

            {/* Next move */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text3)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-jetbrains)',
                  marginBottom: 12,
                }}
              >
                Your next move
              </div>
              {tips.map((tip, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    padding: '10px 12px',
                    background: 'var(--surface2)',
                    borderRadius: 8,
                    marginBottom: i < tips.length - 1 ? 6 : 0,
                  }}
                >
                  <span
                    style={{
                      color: 'var(--navy)',
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    →
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, fontWeight: 500 }}>
                    {tip}
                  </span>
                </div>
              ))}
            </div>

            {/* Timer */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text3)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-jetbrains)',
                  marginBottom: 12,
                }}
              >
                Session timer
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--navy)',
                  borderRadius: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.45)',
                    fontFamily: 'var(--font-jetbrains)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Elapsed
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'white',
                    fontFamily: 'var(--font-jetbrains)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
