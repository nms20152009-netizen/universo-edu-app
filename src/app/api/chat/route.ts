import { NextRequest, NextResponse } from 'next/server'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

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

    const conversationHistory = messages
      .slice(-6)
      .map((m: Message) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))

    const assistantMessage = await retryWithBackoff(async () => {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://universo-edu-app.vercel.app/",
          "X-Title": "Universo Edu",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "google/gemini-2.0-flash-001",
          "messages": [
            { "role": "system", "content": systemPrompt },
            ...conversationHistory,
            { "role": "user", "content": message }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    }, 3, 2000);

    const finalMessage = assistantMessage || 
      'Lo siento, no pude procesar tu pregunta en este momento. Por favor intenta de nuevo. 🤔'

    return NextResponse.json({ response: finalMessage })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ 
      response: '¡Ups! 😅 Tuve un problema para conectarme. Por favor intenta tu pregunta de nuevo.' 
    })
  }
}

