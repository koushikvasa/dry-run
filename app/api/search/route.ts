import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract tool call data — Vapi sends either toolCallList or toolCalls depending on version
    const toolCall =
      body.message?.toolCallList?.[0] ?? body.message?.toolCalls?.[0]

    const toolCallId = toolCall?.id ?? ''
    const args = toolCall?.function?.arguments ?? {}
    const query: string = args.query ?? args.situation ?? ''

    if (!query) {
      return Response.json({
        results: [{ toolCallId, result: 'No search query provided.' }],
      })
    }

    const tavilyRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 3,
        search_depth: 'basic',
      }),
    })

    if (!tavilyRes.ok) {
      return Response.json({
        results: [{ toolCallId, result: 'Search service unavailable.' }],
      })
    }

    const data = await tavilyRes.json()

    // Combine top results into a 2-3 sentence context string
    const resultText =
      (data.results as Array<{ content?: string; snippet?: string }>)
        ?.slice(0, 3)
        .map((r) => r.content ?? r.snippet ?? '')
        .filter(Boolean)
        .join(' ')
        .slice(0, 600) ?? 'No relevant results found.'

    return Response.json({
      results: [{ toolCallId, result: resultText || 'No relevant results found.' }],
    })
  } catch (err) {
    console.error('[/api/search] Error:', err)
    return Response.json({
      results: [{ toolCallId: '', result: 'Search failed. Continue the conversation.' }],
    })
  }
}
