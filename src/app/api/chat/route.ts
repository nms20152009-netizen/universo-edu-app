import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Base de conocimiento para 6to grado - SEP / CONALITEG
const conocimientoSextoGrado = `
## CONTEXTO EDUCATIVO - 6to Grado de Primaria (México)

### Campos Formativos SEP (Programa Sintético Fase 5):

1. **LENGUAJES** 🗣️
   - Comunicación oral y escrita en español
   - Lenguajes artísticos (música, artes visuales, danza, teatro)
   - Lenguajes corporales y digitales
   - Inglés como lengua extranjera
   - Libros: "Múltiples lenguajes", "Trazos y palabras"

2. **SABERES Y PENSAMIENTO CIENTÍFICO** 🔬
   - Pensamiento matemático: fracciones, decimales, porcentajes, geometría, álgebra básica
   - Pensamiento científico: método científico, seres vivos, materia, energía, ecosistemas
   - Tecnología y pensamiento computacional
   - Libros: "Nuestros saberes", "Proyectos de Aula"

3. **ÉTICA, NATURALEZA Y SOCIEDADES** 🌍
   - Historia de México y del mundo
   - Geografía: continentes, países, recursos naturales, clima
   - Formación cívica y ética: derechos humanos, democracia, ciudadanía
   - Libros: "Proyectos Comunitarios", "Nuestros saberes: México, grandeza y diversidad"

4. **DE LO HUMANO Y LO COMUNITARIO** ❤️
   - Educación socioemocional: autoconocimiento, regulación emocional, empatía
   - Educación física: deporte, salud, actividad física
   - Valores: respeto, responsabilidad, honestidad, solidaridad
   - Libros: "Proyectos Escolares"

### Temas de 6to Grado:
- Matemáticas: Fracciones, decimales, porcentajes, geometría, ecuaciones simples
- Español: Comprensión lectora, producción de textos, ortografía
- Ciencias: Ecosistemas, energía, cuerpo humano, materia
- Historia: Civilizaciones antiguas, Independencia, Revolución Mexicana
- Geografía: Regiones del mundo, recursos naturales, México
- Formación Cívica: Derechos humanos, democracia, valores
`

// Función para reintentos con backoff exponencial
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      console.error(`Attempt ${attempt + 1} failed:`, error)
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

export async function POST(request: NextRequest) {
  try {
    const { message, messages } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // System prompt para EDU
    const systemPrompt = `Eres EDU, el asistente educativo de UNIVERSO EDU para estudiantes de 6to grado de primaria en México (11-12 años).

${conocimientoSextoGrado}

## Tu Personalidad:
- Eres amable, paciente y muy alentador
- Usas emojis de forma moderada
- Explicas conceptos de forma simple pero precisa
- Eres como un maestro amigo que siempre ayuda

## Cómo Responder:
1. Siempre responde en español
2. Relaciona los temas con los 4 campos formativos de la SEP
3. Usa ejemplos de la vida cotidiana
4. Menciona los libros de CONALITEG cuando sea relevante
5. Guía al estudiante paso a paso, no des respuestas completas
6. Mantén las respuestas concisas (máximo 3-4 párrafos)`

    // Construir historial de conversación
    const conversationHistory = messages
      .slice(-6)
      .map((m: Message) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

    // Usar reintentos para mayor confiabilidad
    const response = await retryWithBackoff(async () => {
      const zai = await ZAI.create()
      
      return await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        thinking: { type: 'disabled' }
      })
    }, 3, 2000)

    const assistantMessage = response.choices[0]?.message?.content || 
      'Lo siento, no pude procesar tu pregunta en este momento. Por favor intenta de nuevo. 🤔'

    return NextResponse.json({ response: assistantMessage })

  } catch (error) {
    console.error('Chat API error:', error)
    
    // Respuesta de fallback más amigable
    return NextResponse.json({ 
      response: '¡Ups! 😅 Tuve un problema para conectarme. Por favor intenta tu pregunta de nuevo. Si el problema persiste, espera unos segundos y vuelve a intentar.' 
    })
  }
}
