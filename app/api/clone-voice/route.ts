import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const clip = formData.get('clip') as File | null
    const name = (formData.get('name') as string) || 'Cloned voice'

    if (!clip) {
      return Response.json({ error: 'No audio file provided' }, { status: 400 })
    }

    if (!process.env.CARTESIA_API_KEY) {
      return Response.json({ error: 'CARTESIA_API_KEY not configured' }, { status: 500 })
    }

    const cartesiaForm = new FormData()
    cartesiaForm.append('clip', clip)
    cartesiaForm.append('name', name)
    cartesiaForm.append('language', 'en')
    cartesiaForm.append('mode', 'similarity')

    const res = await fetch('https://api.cartesia.ai/voices/clone', {
      method: 'POST',
      headers: {
        'Cartesia-Version': '2024-06-10',
        'X-API-Key': process.env.CARTESIA_API_KEY,
      },
      body: cartesiaForm,
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[/api/clone-voice] Cartesia error:', res.status, err)
      return Response.json({ error: 'Voice cloning failed' }, { status: 502 })
    }

    const data = await res.json()
    return Response.json({ voiceId: data.id })
  } catch (err) {
    console.error('[/api/clone-voice] Error:', err)
    return Response.json({ error: 'Voice cloning failed' }, { status: 500 })
  }
}
