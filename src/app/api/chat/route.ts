import { NextRequest, NextResponse } from 'next/server'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const conocimientoSextoGrado = `
## CONTEXTO EDUCATIVO - 6to Grado de Primaria (Mexico)

### Campos Formativos SEP (Programa Sintetico Fase 5):

1. **LENGUAJES**
   - Comunicacion oral y escrita en espanol
   - Lenguajes artisticos (musica, artes visuales, danza, teatro)
   - Lenguajes corporales y digitales
   - Ingles como lengua extranjera
   - Libros: "Multiples lenguajes", "Trazos y palabras"

2. **SABERES Y PENSAMIENTO CIENTIFICO**
   - Pensamiento matematico: fracciones, decimales, porcentajes, geometria, algebra basica
   - Pensamiento cientifico: metodo cientifico, seres vivos, materia, energia, ecosistemas
   - Tecnologia y pensamiento computacional
   - Libros: "Nuestros saberes", "Proyectos de Aula"

3. **ETICA, NATURALEZA Y SOCIEDADES**
   - Historia de Mexico y del mundo
   - Geografia: continentes, paises, recursos naturales, clima
   - Formacion civica y etica: derechos humanos, democracia, ciudadania
   - Libros: "Proyectos Comunitarios", "Nuestros saberes: Mexico, grandeza y diversidad"

4. **DE LO HUMANO Y LO COMUNITARIO**
   - Educacion socioemocional: autoconocimiento, regulacion emocional, empatia
   - Educacion fisica: deporte, salud, actividad fisica
   - Valores: respeto, responsabilidad, honestidad, solidaridad
   - Libros: "Proyectos Escolares"

### Temas de 6to Grado:
- Matematicas: Fracciones, decimales, porcentajes, geometria, ecuaciones simples
- Espanol: Comprension lectora, produccion de textos, ortografia
- Ciencias: Ecosistemas, energia, cuerpo humano, materia
- Historia: Civilizaciones antiguas, Independencia, Revolucion Mexicana
- Geografia: Regiones del mundo, recursos naturales, Mexico
- Formacion Civica: Derechos humanos, democracia, valores
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
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

const normalizeNumber = (value: string) => Number(value.replace(',', '.'))

const formatFriendlyNumber = (value: number) =>
  Number.isInteger(value)
    ? value.toString()
    : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')

const buildFallbackResponse = (message: string) => {
  const normalized = message.trim().toLowerCase()

  const divisionPatterns = [
    /(?:divide|dividir|calcula|resolver)\s+([0-9]+(?:[.,][0-9]+)?)\s+(?:entre|\/|÷)\s+([0-9]+(?:[.,][0-9]+)?)/i,
    /([0-9]+(?:[.,][0-9]+)?)\s*(?:\/|÷|entre)\s*([0-9]+(?:[.,][0-9]+)?)/i
  ]

  for (const pattern of divisionPatterns) {
    const match = message.match(pattern)
    if (match) {
      const dividend = normalizeNumber(match[1])
      const divisor = normalizeNumber(match[2])

      if (divisor !== 0 && Number.isFinite(dividend) && Number.isFinite(divisor)) {
        const result = dividend / divisor
        return `El resultado de ${formatFriendlyNumber(dividend)} ÷ ${formatFriendlyNumber(divisor)} es ${formatFriendlyNumber(result)}. Si quieres, tambien te lo explico paso a paso.`
      }
    }
  }

  if (normalized.includes('democracia')) {
    return 'La democracia es una forma de gobierno en la que las personas participan en las decisiones, eligen representantes y respetan las reglas para convivir. En primaria se relaciona con derechos, participacion ciudadana y convivencia.'
  }

  if (normalized.includes('fraccion') || normalized.includes('fracciones')) {
    return 'Una fraccion representa partes de un total. Por ejemplo, 3/4 significa 3 partes de 4. El numero de arriba se llama numerador y el de abajo denominador.'
  }

  if (normalized.includes('ecosistema') || normalized.includes('ecosistemas')) {
    return 'Un ecosistema es el conjunto de seres vivos, el lugar donde viven y las relaciones entre ellos. Incluye plantas, animales, agua, suelo, aire y clima.'
  }

  if (normalized.includes('miguel hidalgo')) {
    return 'Miguel Hidalgo fue un sacerdote y lider de la Independencia de Mexico. Inicio el movimiento en 1810 con el Grito de Dolores.'
  }

  return 'No pude conectar con el modelo en este momento, pero si puedo ayudarte. Prueba con una pregunta mas concreta y te respondo de forma directa, o dime si quieres una explicacion paso a paso.'
}

export async function POST(request: NextRequest) {
  try {
    const { message, messages } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const systemPrompt = `Eres EDU, el asistente educativo de UNIVERSO EDU para estudiantes de 6to grado de primaria en Mexico (11-12 anos).

${conocimientoSextoGrado}

## Tu Personalidad:
- Eres amable, paciente y profesional
- Respondes de forma natural, clara y segura
- Usas emojis con mucha moderacion, solo si aportan valor
- Das respuestas directas y completas, sin sonar socratico ni dar solo pistas

## Como Responder:
1. Siempre responde en espanol
2. Da primero la respuesta principal de forma clara y estandar
3. Explica solo lo necesario para que se entienda bien, con ejemplos si ayudan
4. Relaciona los temas con los 4 campos formativos de la SEP cuando sea util
5. Menciona los libros de CONALITEG cuando sea relevante
6. Evita el estilo socratico, evita preguntar de mas y evita responder solo con pistas
7. Mantén las respuestas concisas pero completas (maximo 3-4 parrafos)`

    const conversationHistory = Array.isArray(messages)
      ? messages.slice(-6).map((m: Message) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      : []

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey || apiKey.includes('placeholder_overridden_by_vercel_env')) {
      return NextResponse.json({ response: buildFallbackResponse(message) })
    }

    let assistantMessage = ''

    try {
      assistantMessage = await retryWithBackoff(async () => {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://universo-edu-app.vercel.app/',
            'X-Title': 'Universo Edu',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
              { role: 'user', content: message }
            ]
          })
        })

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.statusText}`)
        }

        const data = await response.json()
        return data.choices[0]?.message?.content || ''
      }, 3, 2000)
    } catch (modelError) {
      console.error('OpenRouter failed, using fallback response:', modelError)
      assistantMessage = buildFallbackResponse(message)
    }

    return NextResponse.json({ response: assistantMessage })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({
      response: 'Pude recuperar la conversacion con una respuesta local. Intenta preguntar de otra forma y te ayudo.'
    })
  }
}
