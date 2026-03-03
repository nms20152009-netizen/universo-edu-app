import { NextRequest, NextResponse } from 'next/server'

// Contraseña del administrador
const ADMIN_PASSWORD = 'Mesn800913'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (password === ADMIN_PASSWORD) {
      // Crear una sesión simple (en producción usar JWT o sesiones seguras)
      return NextResponse.json({ 
        success: true, 
        message: 'Autenticación exitosa',
        token: Buffer.from(`${Date.now()}:${ADMIN_PASSWORD}`).toString('base64')
      })
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Contraseña incorrecta' 
    }, { status: 401 })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { success: false, message: 'Error de autenticación' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ authenticated: false })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = Buffer.from(token, 'base64').toString()
    const [timestamp, password] = decoded.split(':')

    // Verificar que el token no sea muy antiguo (24 horas)
    const tokenTime = parseInt(timestamp)
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 horas

    if (password === ADMIN_PASSWORD && (now - tokenTime) < maxAge) {
      return NextResponse.json({ authenticated: true })
    }

    return NextResponse.json({ authenticated: false })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
