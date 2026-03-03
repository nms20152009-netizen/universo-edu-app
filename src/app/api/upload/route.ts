import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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

    // Crear directorio de uploads si no existe
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generar nombre único
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const filePath = path.join(uploadDir, fileName)

    // Guardar archivo
    await writeFile(filePath, buffer)

    const url = `/uploads/${fileName}`

    // Si hay tareaId, guardar en la base de datos
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
