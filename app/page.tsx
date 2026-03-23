'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SCENARIOS, PERSON_ROLES, PERSONALITIES, HOW_IT_WORKS } from '@/lib/constants'
import { getVapi } from '@/lib/vapi'
import type { DryRunConfig } from '@/lib/types'
import type { OpenAIModel } from '@vapi-ai/web/dist/api'

function buildSystemPrompt(config: DryRunConfig): string {
  const name = config.personName || 'them'
  return `You are ${name}, a ${config.personRole} at this company. You have a ${config.personality} personality.

The person speaking to you wants to: ${config.scenario}.
Their biggest fear going into this conversation is: "${config.userFear || 'the outcome'}".

CRITICAL RULES:
- You ARE ${name}. Respond as ${name} would — you are playing this person completely.
- Never say you are an AI. Never break character. Never offer coaching or feedback.
- Speak naturally. Short sentences. Real conversation, not speeches.
- Use pressure tactics and reactions that match a ${config.personality} personality.
- React to what they say. Push back realistically. Don't make it too easy or too hard.
- Use natural speech patterns: "Look...", "Here's the thing...", "I hear you, but...", "That's fair, but..."
- Keep responses brief — 1-3 sentences max per turn. This is a back-and-forth conversation.`
}

function buildFirstMessage(config: DryRunConfig): string {
  const s = config.scenario.toLowerCase()
  if (s.includes('raise') || s.includes('salary')) return 'Hey, you wanted to talk? Come in.'
  if (s.includes('resign') || s.includes('quit') || s.includes('leave')) return 'Hey, close the door. What\'s on your mind?'
  if (s.includes('client')) return 'Thanks for reaching out. What\'s going on?'
  if (s.includes('manager') || s.includes('boss')) return 'Hey, come in. You wanted to see me?'
  if (s.includes('emergency') || s.includes('leave')) return 'Hey, is everything okay? What\'s up?'
  return 'Hey, I\'ve got a few minutes. What\'s going on?'
}

export default function SetupPage() {
  const router = useRouter()
  const [config, setConfig] = useState<DryRunConfig>({
    scenario: SCENARIOS[0],
    personRole: PERSON_ROLES[0],
    personality: PERSONALITIES[0],
    personName: '',
    userFear: '',
    voiceOption: 'pick',
  })
  const [isStarting, setIsStarting] = useState(false)
  const [cloneFile, setCloneFile] = useState<File | null>(null)
  const [cloneStatus, setCloneStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleVoiceFile(file: File) {
    setCloneFile(file)
    setCloneStatus('uploading')
    try {
      const formData = new FormData()
      formData.append('clip', file)
      formData.append('name', config.personName || 'Cloned voice')
      const res = await fetch('/api/clone-voice', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || !data.voiceId) throw new Error(data.error || 'Clone failed')
      setClonedVoiceId(data.voiceId)
      setCloneStatus('done')
    } catch {
      setCloneStatus('error')
    }
  }

  async function handleStart() {
    if (isStarting) return
    setIsStarting(true)
    try {
      sessionStorage.setItem('dryrun_config', JSON.stringify(config))
      const vapi = getVapi()
      await vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!, {
        variableValues: {
          scenario: config.scenario,
          personRole: config.personRole,
          personality: config.personality,
          personName: config.personName || 'them',
          userFear: config.userFear || 'the outcome',
        },
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: buildSystemPrompt(config) },
          ],
        } as OpenAIModel,
        ...(clonedVoiceId ? { voice: { provider: 'cartesia', voiceId: clonedVoiceId } } : {}),
        firstMessage: buildFirstMessage(config),
        startSpeakingPlan: {
          waitSeconds: 1.5,
        },
      })
      router.push('/session')
    } catch (err) {
      console.error('Failed to start session:', err)
      setIsStarting(false)
    }
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
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'white',
              }}
            >
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
              { label: 'Setup', num: '1' },
              { label: 'Session', num: '2' },
              { label: 'Debrief', num: '3' },
            ].map((tab, i) => (
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
                  color: i === 0 ? 'white' : 'rgba(255,255,255,0.45)',
                  background: i === 0 ? 'rgba(255,255,255,0.12)' : 'transparent',
                  letterSpacing: '0.01em',
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: i === 0 ? 'var(--orange)' : 'rgba(255,255,255,0.08)',
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
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.3)',
              }}
            />
            Ready
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="page-content">
        <div className="layout-setup">
          {/* LEFT: Hero */}
          <div>
            {/* Eyebrow */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 1.5,
                  background: 'var(--orange)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-jetbrains)',
                  fontSize: 10,
                  color: 'var(--orange)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Workplace conversation simulator
              </span>
            </div>

            {/* H1 */}
            <h1
              style={{
                fontSize: 44,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
                color: 'var(--navy)',
                marginBottom: 14,
              }}
            >
              Practice before
              <br />
              it{' '}
              <em style={{ color: 'var(--orange)', fontStyle: 'normal' }}>
                costs you.
              </em>
            </h1>

            <p
              style={{
                fontSize: 15,
                color: 'var(--text2)',
                lineHeight: 1.65,
                marginBottom: 28,
                maxWidth: 380,
              }}
            >
              Simulate the real conversation against an AI version of the
              actual person — with their personality, their pressure tactics,
              their voice — before you walk into the real thing.
            </p>

            {/* How it works */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {HOW_IT_WORKS.map((item) => (
                <div
                  key={item.step}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: 'var(--navy)',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontFamily: 'var(--font-jetbrains)',
                    }}
                  >
                    {item.step}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text2)',
                      lineHeight: 1.5,
                      paddingTop: 4,
                    }}
                  >
                    <strong style={{ color: 'var(--text)', fontWeight: 600 }}>
                      {item.title}
                    </strong>{' '}
                    — {item.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Form card */}
          <div>
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--navy)',
                  marginBottom: 20,
                  letterSpacing: '-0.02em',
                }}
              >
                Configure your session
              </div>

              {/* Scenario */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>What&apos;s the conversation?</label>
                <SelectWrap>
                  <select
                    style={selectStyle}
                    value={config.scenario}
                    onChange={(e) =>
                      setConfig({ ...config, scenario: e.target.value })
                    }
                  >
                    {SCENARIOS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </SelectWrap>
              </div>

              {/* Role + Personality row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>Who are you talking to?</label>
                  <SelectWrap>
                    <select
                      style={selectStyle}
                      value={config.personRole}
                      onChange={(e) =>
                        setConfig({ ...config, personRole: e.target.value })
                      }
                    >
                      {PERSON_ROLES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </SelectWrap>
                </div>
                <div>
                  <label style={labelStyle}>Their personality</label>
                  <SelectWrap>
                    <select
                      style={selectStyle}
                      value={config.personality}
                      onChange={(e) =>
                        setConfig({ ...config, personality: e.target.value })
                      }
                    >
                      {PERSONALITIES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </SelectWrap>
                </div>
              </div>

              {/* Name + Fear row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>Their name</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="e.g. Sarah"
                    value={config.personName}
                    onChange={(e) =>
                      setConfig({ ...config, personName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Your biggest fear</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder='e.g. "bad timing"'
                    value={config.userFear}
                    onChange={(e) =>
                      setConfig({ ...config, userFear: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Voice option */}
              <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>
                Voice option
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    value: 'pick' as const,
                    icon: '🎯',
                    title: 'Personality match',
                    desc: 'Pick from our voice library',
                  },
                  {
                    value: 'clone' as const,
                    icon: '🎙',
                    title: 'Clone their voice',
                    desc: 'Upload 15 sec — Cartesia clones it',
                  },
                ].map((opt) => {
                  const isSelected = config.voiceOption === opt.value
                  return (
                    <div
                      key={opt.value}
                      onClick={() =>
                        setConfig({ ...config, voiceOption: opt.value })
                      }
                      style={{
                        background: isSelected ? 'var(--surface)' : 'var(--bg)',
                        border: `1.5px solid ${isSelected ? 'var(--navy)' : 'var(--border)'}`,
                        borderRadius: 10,
                        padding: 12,
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: isSelected ? 'var(--navy)' : 'transparent',
                          border: `1.5px solid ${isSelected ? 'var(--navy)' : 'var(--border2)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 9,
                          color: 'white',
                        }}
                      >
                        {isSelected && '✓'}
                      </div>
                      <div style={{ fontSize: 18, marginBottom: 6 }}>{opt.icon}</div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--text)',
                          marginBottom: 2,
                        }}
                      >
                        {opt.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {opt.desc}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Voice clone upload — shown when clone is selected */}
              {config.voiceOption === 'clone' && (
                <div style={{ marginBottom: 20 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleVoiceFile(f)
                    }}
                  />
                  <div
                    onClick={() => cloneStatus !== 'uploading' && fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragging(false)
                      const f = e.dataTransfer.files?.[0]
                      if (f) handleVoiceFile(f)
                    }}
                    style={{
                      border: `2px dashed ${cloneStatus === 'done' ? 'var(--green)' : cloneStatus === 'error' ? 'var(--red)' : isDragging ? 'var(--navy)' : 'var(--border2)'}`,
                      borderRadius: 10,
                      padding: '18px 16px',
                      textAlign: 'center',
                      cursor: cloneStatus === 'uploading' ? 'wait' : 'pointer',
                      background: cloneStatus === 'done' ? 'var(--green-bg)' : cloneStatus === 'error' ? 'var(--red-bg)' : isDragging ? 'var(--surface2)' : 'var(--bg)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {cloneStatus === 'idle' && (
                      <>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>🎙</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                          {cloneFile ? cloneFile.name : 'Drop audio file or click to upload'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-jetbrains)' }}>
                          MP3, WAV, M4A · ~15 seconds of clear speech
                        </div>
                      </>
                    )}
                    {cloneStatus === 'uploading' && (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
                          Cloning voice...
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-jetbrains)' }}>
                          {cloneFile?.name}
                        </div>
                      </>
                    )}
                    {cloneStatus === 'done' && (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 3 }}>
                          ✓ Voice cloned successfully
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-jetbrains)' }}>
                          {cloneFile?.name} · Click to replace
                        </div>
                      </>
                    )}
                    {cloneStatus === 'error' && (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 3 }}>
                          Clone failed — try again
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-jetbrains)' }}>
                          Check your audio file and try again
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Start button */}
              <button
                onClick={handleStart}
                disabled={isStarting}
                style={{
                  width: '100%',
                  padding: 15,
                  background: isStarting ? 'var(--orange2)' : 'var(--orange)',
                  border: 'none',
                  borderRadius: 12,
                  color: 'white',
                  fontFamily: 'var(--font-bricolage)',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: isStarting ? 'wait' : 'pointer',
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                {isStarting ? 'Starting...' : 'Start Dry Run →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Shared styles
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains)',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text3)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 6,
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid var(--border)',
  borderRadius: 10,
  background: 'var(--bg)',
  fontFamily: 'var(--font-bricolage)',
  fontSize: 14,
  color: 'var(--text)',
  fontWeight: 500,
  outline: 'none',
  appearance: 'none',
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid var(--border)',
  borderRadius: 10,
  background: 'var(--bg)',
  fontFamily: 'var(--font-bricolage)',
  fontSize: 14,
  color: 'var(--text)',
  fontWeight: 500,
  outline: 'none',
}

function SelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <span
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text3)',
          pointerEvents: 'none',
          fontSize: 12,
          lineHeight: 1,
        }}
      >
        ▾
      </span>
    </div>
  )
}
