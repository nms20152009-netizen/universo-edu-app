import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_PASSWORD, createAdminToken, isValidAdminAuthHeader } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({
        success: true,
        message: 'Autenticación exitosa',
        token: createAdminToken()
      })
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Contraseña incorrecta'
      },
      { status: 401 }
    )
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
    return NextResponse.json({ authenticated: isValidAdminAuthHeader(authHeader) })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}

