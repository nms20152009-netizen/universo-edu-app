import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Campos Formativos según la SEP - Programa Sintético Fase 5 (5° y 6° grado)
// https://educacionbasica.sep.gob.mx/wp-content/uploads/2024/06/Programa_Sintetico_Fase_5.pdf
const camposFormativosSEP = [
  {
    id: 'campo-lenguajes',
    nombre: 'Lenguajes',
    descripcion: 'Incluye principalmente: Español, Lenguas indígenas (cuando aplique), Inglés y Artes (música, danza, teatro, artes visuales, etc.). Se enfoca en desarrollar la comunicación, la expresión, la creatividad y el uso de diferentes lenguajes para entender y transformar el mundo.',
    color: '#ec4899', // Rosa
    icono: '🗣️',
    orden: 1,
    libros: [
      'Múltiples lenguajes',
      'Múltiples lenguajes. Trazos y palabras',
      'Múltiples lenguajes. Trazos y números'
    ]
  },
  {
    id: 'campo-saberes',
    nombre: 'Saberes y Pensamiento Científico',
    descripcion: 'Reúne: Matemáticas, Ciencias Naturales (biología, física, química) y Tecnologías. Busca fomentar el pensamiento lógico, la indagación científica, la resolución de problemas y la comprensión del mundo natural y tecnológico.',
    color: '#3b82f6', // Azul
    icono: '🔬',
    orden: 2,
    libros: [
      'Nuestros saberes: Libro para alumnos, maestros y familia',
      'Proyectos de Aula'
    ]
  },
  {
    id: 'campo-etica',
    nombre: 'Ética, Naturaleza y Sociedades',
    descripcion: 'Integra: Formación Cívica y Ética, Historia y Geografía. Promueve el análisis crítico de la realidad social, histórica y ambiental, el respeto a los derechos humanos, la justicia, la interculturalidad y el cuidado del planeta.',
    color: '#22c55e', // Verde
    icono: '🌍',
    orden: 3,
    libros: [
      'Proyectos Comunitarios',
      'Nuestros saberes: México, grandeza y diversidad',
      'Cartografía de México y el mundo'
    ]
  },
  {
    id: 'campo-humano',
    nombre: 'De lo Humano y lo Comunitario',
    descripcion: 'Engloba: Educación Física, Vida Saludable y aspectos Socioemocionales. Se centra en el bienestar personal y colectivo, el autocuidado, la convivencia, las emociones, la actividad física y el fortalecimiento de la identidad y los lazos comunitarios.',
    color: '#f97316', // Naranja
    icono: '❤️',
    orden: 4,
    libros: [
      'Proyectos Escolares',
      'Un libro sin recetas, para la maestra y el maestro'
    ]
  }
]

// Libros de CONALITEG para 6to grado - Ciclo Escolar 2025-2026
// https://libros.conaliteg.gob.mx/primaria.html
const librosSextoGrado = [
  {
    codigo: 'P5LPM',
    titulo: 'Un libro sin recetas, para la maestra y el maestro. Fase 5',
    url: 'https://libros.conaliteg.gob.mx/2025/P5LPM.htm',
    grado: 6
  },
  {
    codigo: 'P6MLA',
    titulo: 'Múltiples lenguajes',
    url: 'https://libros.conaliteg.gob.mx/2025/P6MLA.htm',
    grado: 6
  },
  {
    codigo: 'P6PAA',
    titulo: 'Proyectos de Aula',
    url: 'https://libros.conaliteg.gob.mx/2025/P6PAA.htm',
    grado: 6
  },
  {
    codigo: 'P6PCA',
    titulo: 'Proyectos Comunitarios',
    url: 'https://libros.conaliteg.gob.mx/2025/P6PCA.htm',
    grado: 6
  },
  {
    codigo: 'P6PEA',
    titulo: 'Proyectos Escolares',
    url: 'https://libros.conaliteg.gob.mx/2025/P6PEA.htm',
    grado: 6
  },
  {
    codigo: 'P6SDA',
    titulo: 'Nuestros saberes: Libro para alumnos, maestros y familia',
    url: 'https://libros.conaliteg.gob.mx/2025/P6SDA.htm',
    grado: 6
  }
]

export async function POST(request: NextRequest) {
  try {
    const existentes = await db.campoFormativo.count()
    
    if (existentes > 0) {
      return NextResponse.json({ 
        message: 'Los campos formativos ya están inicializados',
        count: existentes,
        libros: librosSextoGrado
      })
    }

    // Crear campos formativos con la estructura de la SEP
    const camposData = camposFormativosSEP.map(campo => ({
      id: campo.id,
      nombre: campo.nombre,
      descripcion: campo.descripcion,
      color: campo.color,
      icono: campo.icono,
      orden: campo.orden
    }))

    await db.campoFormativo.createMany({
      data: camposData
    })

    return NextResponse.json({ 
      message: 'Campos formativos SEP inicializados correctamente',
      count: camposData.length,
      libros: librosSextoGrado
    })
  } catch (error) {
    console.error('Error seeding campos formativos:', error)
    return NextResponse.json(
      { error: 'Error al inicializar campos formativos' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    let campos = await db.campoFormativo.findMany({
      orderBy: { orden: 'asc' },
      include: {
        _count: {
          select: { tareas: true }
        }
      }
    })

    // Si no hay campos, inicializarlos
    if (campos.length === 0) {
      const camposData = camposFormativosSEP.map(campo => ({
        id: campo.id,
        nombre: campo.nombre,
        descripcion: campo.descripcion,
        color: campo.color,
        icono: campo.icono,
        orden: campo.orden
      }))

      await db.campoFormativo.createMany({
        data: camposData
      })

      campos = await db.campoFormativo.findMany({
        orderBy: { orden: 'asc' },
        include: {
          _count: {
            select: { tareas: true }
          }
        }
      })
    }

    // Incluir información de libros
    const response = {
      campos,
      librosCONALITEG: librosSextoGrado,
      camposCompletos: camposFormativosSEP
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching campos formativos:', error)
    return NextResponse.json(
      { error: 'Error al obtener campos formativos' },
      { status: 500 }
    )
  }
}
