import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    has_TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
    has_TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
    has_DATABASE_URL: !!process.env.DATABASE_URL,
    DATABASE_URL_prefix: process.env.DATABASE_URL?.substring(0, 20),
    TURSO_DATABASE_URL_prefix: process.env.TURSO_DATABASE_URL?.substring(0, 20),
    NODE_ENV: process.env.NODE_ENV,
    TURSO_AUTH_TOKEN_length: process.env.TURSO_AUTH_TOKEN?.length,
  })
}
