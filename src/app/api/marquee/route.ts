import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Obtener configuración del marquee banner
export async function GET() {
  try {
    let banner = await db.marqueeBanner.findFirst()
    
    // Si no existe, crear uno por defecto
    if (!banner) {
      banner = await db.marqueeBanner.create({
        data: {
          texto: 'LA REUNIÓN DE PADRES SE SUSPENDE HASTA NUEVO AVISO, SE LES AVISARÁ PRONTO',
          imagenUrl: '/bandera-mexico.png',
          activo: true,
          velocidad: 30
        }
      })
    }
    
    return NextResponse.json(banner)
  } catch (error) {
    console.error('Error fetching marquee banner:', error)
    return NextResponse.json({ 
      id: 'default',
      texto: 'LA REUNIÓN DE PADRES SE SUSPENDE HASTA NUEVO AVISO, SE LES AVISARÁ PRONTO',
      imagenUrl: '/bandera-mexico.png',
      activo: true,
      velocidad: 30
    }, { status: 200 })
  }
}

// PUT - Actualizar configuración del marquee banner
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { texto, imagenUrl, activo, velocidad } = data
    
    let banner = await db.marqueeBanner.findFirst()
    
    if (banner) {
      banner = await db.marqueeBanner.update({
        where: { id: banner.id },
        data: {
          texto: texto || banner.texto,
          imagenUrl: imagenUrl !== undefined ? imagenUrl : banner.imagenUrl,
          activo: activo !== undefined ? activo : banner.activo,
          velocidad: velocidad || banner.velocidad
        }
      })
    } else {
      banner = await db.marqueeBanner.create({
        data: {
          texto: texto || 'LA REUNIÓN DE PADRES SE SUSPENDE HASTA NUEVO AVISO, SE LES AVISARÁ PRONTO',
          imagenUrl: imagenUrl || '/bandera-mexico.png',
          activo: activo !== undefined ? activo : true,
          velocidad: velocidad || 30
        }
      })
    }
    
    return NextResponse.json(banner)
  } catch (error) {
    console.error('Error updating marquee banner:', error)
    return NextResponse.json({ error: 'Error al actualizar el banner' }, { status: 500 })
  }
}
