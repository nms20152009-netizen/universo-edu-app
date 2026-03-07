import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Subir archivo
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tipo = formData.get('tipo') as string // 'imagen', 'pdf', 'codigo'
    const tareaId = formData.get('tareaId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      )
    }

    // Convert file to Base64 data URL
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Create base 64 string
    const base64String = buffer.toString('base64')
    // Get correct MIME type
    const mimeType = file.type || (tipo === 'pdf' ? 'application/pdf' : 'application/octet-stream')
    
    // Construct data URL
    const url = `data:${mimeType};base64,${base64String}`

    // Si hay tareaId, guardar en la base de datos
    // Limit size for database inserts? (Turso limits to ~1GB per row, so this should generally be fine for basic tasks)
    if (tareaId) {
      if (tipo === 'imagen') {
        const imagen = await db.imagen.create({
          data: {
            url,
            tareaId
          }
        })
        return NextResponse.json({ success: true, url, imagen })
      } else {
        const archivo = await db.archivo.create({
          data: {
            nombre: file.name,
            tipo: tipo || file.type,
            url,
            tamaño: file.size,
            tareaId
          }
        })
        return NextResponse.json({ success: true, url, archivo })
      }
    }

    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Error al subir archivo' },
      { status: 500 }
    )
  }
}
