import { NextRequest } from 'next/server'
import type { DebriefResult } from '@/lib/types'

const DEBRIEF_SYSTEM_PROMPT = `You are an expert workplace communication coach. Analyze the conversation transcript and return ONLY valid JSON — no markdown, no explanation, just the JSON object.

Return this exact structure:
{
  "score": <number from 1.0 to 10.0, one decimal place>,
  "verdict": "<one short sentence summarizing overall performance>",
  "tactics": ["<manipulation tactic the AI character used against the user>", ...],
  "strengths": ["<specific thing the user did well>", ...],
  "improvements": ["<specific, actionable thing to fix next time>", ...]
}

Guidelines:
- score: 1-4 = struggling, 5-6 = needs work, 7-8 = solid, 9-10 = excellent
- tactics: list each manipulation tactic the AI character used (e.g. "Timing deflection", "Guilt trip", "Data demand", "Silence pressure", "Approval bait")
- strengths: 2-3 concrete things the user handled well — be specific, reference actual moments
- improvements: 2-3 specific, actionable fixes — tell them exactly what to say or do differently`

const FALLBACK_RESULT: DebriefResult = {
  score: 5.0,
  verdict: 'Session complete — analysis unavailable',
  tactics: ['Unable to analyze'],
  strengths: ['Completed the practice session'],
  improvements: ['Try again for a full analysis'],
}

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json()

    if (!transcript || typeof transcript !== 'string') {
      return Response.json(FALLBACK_RESULT)
    }

    let res: Response
    try {
      res = await fetch(
        `${process.env.CONCENTRATE_BASE_URL}/responses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CONCENTRATE_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            input: `${DEBRIEF_SYSTEM_PROMPT}\n\nAnalyze this conversation transcript:\n\n${transcript}`,
            text: { format: { type: 'json_object' } },
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(25000),
        }
      )
    } catch (fetchErr) {
      console.error('[/api/debrief] Fetch failed or timed out:', fetchErr)
      return Response.json(FALLBACK_RESULT)
    }

    if (!res.ok) {
      console.error('[/api/debrief] Concentrate API error:', res.status)
      return Response.json(FALLBACK_RESULT)
    }

    const data = await res.json()
    const content = data.output?.[0]?.content?.[0]?.text

    if (!content) {
      return Response.json(FALLBACK_RESULT)
    }

    try {
      const result = JSON.parse(content) as DebriefResult
      // Validate shape
      if (
        typeof result.score !== 'number' ||
        !Array.isArray(result.tactics) ||
        !Array.isArray(result.strengths) ||
        !Array.isArray(result.improvements)
      ) {
        return Response.json(FALLBACK_RESULT)
      }
      return Response.json(result)
    } catch {
      console.error('[/api/debrief] JSON parse error')
      return Response.json(FALLBACK_RESULT)
    }
  } catch (err) {
    console.error('[/api/debrief] Error:', err)
    return Response.json(FALLBACK_RESULT)
  }
}
