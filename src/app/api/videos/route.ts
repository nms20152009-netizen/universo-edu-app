import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Agregar video de YouTube a una tarea
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Extraer ID del video de YouTube
    let videoId = ''
    const url = data.urlYoutube
    
    // Patrones comunes de URLs de YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
      /youtube\.com\/shorts\/([^&\s?]+)/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        videoId = match[1]
        break
      }
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'URL de YouTube inválida' },
        { status: 400 }
      )
    }

    const video = await db.video.create({
      data: {
        urlYoutube: url,
        videoId,
        titulo: data.titulo,
        tareaId: data.tareaId
      }
    })

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error adding video:', error)
    return NextResponse.json(
      { error: 'Error al agregar video' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar video
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de video requerido' },
        { status: 400 }
      )
    }

    await db.video.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting video:', error)
    return NextResponse.json(
      { error: 'Error al eliminar video' },
      { status: 500 }
    )
  }
}
