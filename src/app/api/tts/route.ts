import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Google Gemini doesn't support TTS natively yet.
    // We return 501 Not Implemented so the client knows it's not available
    // and doesn't crash trying to use a non-existent endpoint.
    return NextResponse.json(
      { error: 'TTS feature is currently unavailable. We are working on a better alternative.' },
      { status: 501 }
    )

  } catch (error) {
    console.error('TTS API error:', error)
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    )
  }
}

