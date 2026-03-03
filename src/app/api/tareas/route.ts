import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Obtener todas las tareas o tareas por campo formativo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campoId = searchParams.get('campoId')
    const activas = searchParams.get('activas')

    const where: Record<string, unknown> = {}
    
    if (campoId) {
      where.campoFormativoId = campoId
    }
    
    if (activas === 'true') {
      where.activa = true
      where.fechaProgramada = {
        lte: new Date()
      }
    }

    const tareas = await db.tarea.findMany({
      where,
      include: {
        campoFormativo: true,
        archivos: true,
        imagenes: true,
        videos: true
      },
      orderBy: [
        { orden: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(tareas)
  } catch (error) {
    console.error('Error fetching tareas:', error)
    return NextResponse.json(
      { error: 'Error al obtener tareas' },
      { status: 500 }
    )
  }
}

// POST - Crear nueva tarea
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Verificar límite de 10 tareas programadas
    const tareasActivas = await db.tarea.count({
      where: { activa: true }
    })

    if (tareasActivas >= 10) {
      return NextResponse.json(
        { error: 'Se ha alcanzado el límite de 10 tareas activas' },
        { status: 400 }
      )
    }

    const tarea = await db.tarea.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        campoFormativoId: data.campoFormativoId,
        tema: data.tema,
        fechaProgramada: data.fechaProgramada ? new Date(data.fechaProgramada) : null,
        fechaLimite: data.fechaLimite ? new Date(data.fechaLimite) : null,
        orden: data.orden || 0
      },
      include: {
        campoFormativo: true
      }
    })

    return NextResponse.json(tarea)
  } catch (error) {
    console.error('Error creating tarea:', error)
    return NextResponse.json(
      { error: 'Error al crear tarea' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar tarea
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, ...updateData } = data

    const tarea = await db.tarea.update({
      where: { id },
      data: {
        ...updateData,
        fechaProgramada: updateData.fechaProgramada ? new Date(updateData.fechaProgramada) : null,
        fechaLimite: updateData.fechaLimite ? new Date(updateData.fechaLimite) : null,
        updatedAt: new Date()
      },
      include: {
        campoFormativo: true,
        archivos: true,
        imagenes: true,
        videos: true
      }
    })

    return NextResponse.json(tarea)
  } catch (error) {
    console.error('Error updating tarea:', error)
    return NextResponse.json(
      { error: 'Error al actualizar tarea' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar tarea
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de tarea requerido' },
        { status: 400 }
      )
    }

    await db.tarea.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tarea:', error)
    return NextResponse.json(
      { error: 'Error al eliminar tarea' },
      { status: 500 }
    )
  }
}
