export interface DryRunConfig {
  scenario: string
  personRole: string
  personality: string
  personName: string
  userFear: string
  voiceOption: 'pick' | 'clone'
}

export interface TranscriptMessage {
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

export interface DebriefResult {
  score: number
  verdict: string
  tactics: string[]
  strengths: string[]
  improvements: string[]
}

export type CallStatus = 'idle' | 'connecting' | 'active' | 'ended'
