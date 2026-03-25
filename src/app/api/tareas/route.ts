import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { isValidAdminAuthHeader } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const MEXICO_TIMEZONE = 'America/Mexico_City'
const DATETIME_LOCAL_REGEX = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

const getDatePartsInTimezone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(parts.find((part) => part.type === type)?.value ?? '0', 10)

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second')
  }
}

const parseScheduledDate = (value: unknown, timeZone = MEXICO_TIMEZONE): Date | null => {
  if (!value || typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  // Si ya llega con zona horaria explícita, usar parse nativo.
  if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsedWithZone = new Date(trimmed)
    return Number.isNaN(parsedWithZone.getTime()) ? null : parsedWithZone
  }

  const localMatch = trimmed.match(DATETIME_LOCAL_REGEX)
  if (!localMatch) {
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr = '00'] = localMatch
  const target = {
    year: Number.parseInt(yearStr, 10),
    month: Number.parseInt(monthStr, 10),
    day: Number.parseInt(dayStr, 10),
    hour: Number.parseInt(hourStr, 10),
    minute: Number.parseInt(minuteStr, 10),
    second: Number.parseInt(secondStr, 10)
  }

  let utcMillis = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
    target.second
  )

  // Iteraciones para ajustar offset y posibles cambios por DST.
  for (let i = 0; i < 2; i += 1) {
    const zonedParts = getDatePartsInTimezone(new Date(utcMillis), timeZone)
    const zonedAsUtc = Date.UTC(
      zonedParts.year,
      zonedParts.month - 1,
      zonedParts.day,
      zonedParts.hour,
      zonedParts.minute,
      zonedParts.second
    )
    const targetAsUtc = Date.UTC(
      target.year,
      target.month - 1,
      target.day,
      target.hour,
      target.minute,
      target.second
    )

    utcMillis += targetAsUtc - zonedAsUtc
  }

  return new Date(utcMillis)
}

const isAdminRequest = (request: NextRequest) =>
  isValidAdminAuthHeader(request.headers.get('authorization'))

const requireAdmin = (request: NextRequest) => {
  if (isAdminRequest(request)) return null

  return NextResponse.json(
    { error: 'No autorizado. Se requiere sesión de administrador.' },
    { status: 401 }
  )
}

// GET - Obtener tareas (público: solo activas/publicadas; admin: todas)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campoId = searchParams.get('campoId')
    const activas = searchParams.get('activas')

    const admin = isAdminRequest(request)
    const where: Prisma.TareaWhereInput = {}

    if (campoId) {
      where.campoFormativoId = campoId
    }

    // Público: siempre filtrar por fecha de publicación.
    // Admin: puede solicitar todas (sin filtro) excepto cuando pide explícitamente activas=true.
    const mustFilterPublicTasks = !admin || activas === 'true'

    if (mustFilterPublicTasks) {
      where.activa = true
      where.OR = [
        { fechaProgramada: null },
        { fechaProgramada: { lte: new Date() } }
      ]
    }

    const tareas = await db.tarea.findMany({
      where,
      include: {
        campoFormativo: true,
        archivos: true,
        imagenes: true,
        videos: true
      },
      orderBy: [{ orden: 'asc' }, { createdAt: 'desc' }]
    })

    return NextResponse.json(tareas, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
      }
    })
  } catch (error) {
    console.error('Error fetching tareas:', error)
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
      }
    })
  }
}

// POST - Crear nueva tarea
export async function POST(request: NextRequest) {
  try {
    const unauthorized = requireAdmin(request)
    if (unauthorized) return unauthorized

    const data = await request.json()

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
        fechaProgramada: parseScheduledDate(data.fechaProgramada),
        fechaLimite: parseScheduledDate(data.fechaLimite),
        orden: data.orden || 0
      },
      include: {
        campoFormativo: true
      }
    })

    return NextResponse.json(tarea)
  } catch (error) {
    console.error('Error creating tarea:', error)
    return NextResponse.json({ error: 'Error al crear tarea' }, { status: 500 })
  }
}

// PUT - Actualizar tarea
export async function PUT(request: NextRequest) {
  try {
    const unauthorized = requireAdmin(request)
    if (unauthorized) return unauthorized

    const data = await request.json()
    const { id, ...updateData } = data

    const tarea = await db.tarea.update({
      where: { id },
      data: {
        ...updateData,
        fechaProgramada: parseScheduledDate(updateData.fechaProgramada),
        fechaLimite: parseScheduledDate(updateData.fechaLimite),
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
    return NextResponse.json({ error: 'Error al actualizar tarea' }, { status: 500 })
  }
}

// DELETE - Eliminar tarea
export async function DELETE(request: NextRequest) {
  try {
    const unauthorized = requireAdmin(request)
    if (unauthorized) return unauthorized

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de tarea requerido' }, { status: 400 })
    }

    await db.tarea.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tarea:', error)
    return NextResponse.json({ error: 'Error al eliminar tarea' }, { status: 500 })
  }
}

