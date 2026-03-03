import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const zai = await ZAI.create()

    // Create TTS audio
    const response = await zai.tts.create({
      text: text.substring(0, 2000), // Limit text length
      voice: 'alloy',
      speed: 0.9 // Slightly slower for children
    })

    // The response contains base64 encoded audio
    const audioBase64 = response.data?.[0]?.base64

    if (!audioBase64) {
      throw new Error('No audio data received')
    }

    return NextResponse.json({ audio: audioBase64 })

  } catch (error) {
    console.error('TTS API error:', error)
    return NextResponse.json(
      { error: 'Error generating audio' },
      { status: 500 }
    )
  }
}
