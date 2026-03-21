import { NextRequest, NextResponse } from 'next/server'

interface Story {
  id: string
  title: string
  content: string
  moral: string
  date: string
}

const storyThemes = [
  { theme: 'amistad y trabajo en equipo', values: 'cooperación, respeto, solidaridad, ayuda mutua' },
  { theme: 'respeto a la naturaleza', values: 'cuidado del medio ambiente, responsabilidad, sustentabilidad' },
  { theme: 'honestidad y verdad', values: 'sinceridad, confianza, integridad, valor de la verdad' },
  { theme: 'perseverancia y esfuerzo', values: 'constancia, dedicación, superación personal, no rendirse' },
  { theme: 'respeto a la diversidad', values: 'inclusión, tolerancia, aceptación, respeto a las diferencias' },
  { theme: 'responsabilidad', values: 'compromiso, organización, cumplimiento, consecuencias de nuestras acciones' },
  { theme: 'curiosidad y aprendizaje', values: 'conocimiento, descubrimiento, creatividad, amor por aprender' },
  { theme: 'familia y amor', values: 'cariño, apoyo familiar, tradiciones, unidad' },
  { theme: 'valentía y superación', values: 'enfrentar miedos, crecimiento personal, determinación' },
  { theme: 'generosidad y compartir', values: 'ayudar a otros, desinterés, bondad, gratitud' }
]

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      console.error(`Story attempt ${attempt + 1} failed:`, error)
      
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
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    const themeIndex = dayOfYear % storyThemes.length
    const todayTheme = storyThemes[themeIndex]

    const storyPrompt = `Escribe un cuento educativo completo y detallado para niños de sexto grado de primaria (11-12 años) en México.

TEMA PRINCIPAL: ${todayTheme.theme}
VALORES A ENSEÑAR: ${todayTheme.values}

REQUISITOS OBLIGATORIOS:
1. TÍTULO: Un título creativo y atractivo que invite a leer
2. EXTENSIÓN: El cuento debe tener ENTRE 800 Y 1200 PALABRAS (mínimo 4 párrafos largos)
3. PERSONAJES: Mínimo 2-3 personajes infantiles identificables (niños de 10-12 años)
4. DIÁLOGOS: Incluye al menos 6-8 diálogos naturales entre personajes
5. ESTRUCTURA: 
   - Inicio: Presenta personajes y situación inicial
   - Desarrollo: Un conflicto o problema que deben resolver
   - Clímax: Momento de tensión o decisión importante
   - Desenlace: Resolución del problema
   - Conclusión: Reflexión final
6. DESCRIPCIONES: Describe lugares, emociones y acciones con detalle
7. LENGUAJE: Apropiado para la edad, ni muy simple ni muy complejo
8. VALORES: Transmite los valores de forma natural, sin ser moralista
9. CULTURA: Puede incluir elementos de la cultura mexicana

Responde ÚNICAMENTE en formato JSON válido (sin markdown, sin texto adicional):
{
  "title": "Título del cuento",
  "content": "El cuento completo aquí con todos los párrafos y diálogos...",
  "moral": "La enseñanza principal del cuento en una frase"
}

IMPORTANTE: El campo "content" debe contener el cuento COMPLETO con todos sus párrafos, no un resumen.`

    const systemInstruction = 'Eres un escritor profesional de literatura infantil educativa mexicana. Creas cuentos completos, detallados y entretenidos que enseñan valores a niños de primaria. Tu estilo es cálido, imaginativo y siempre apropiado para la edad. Escribes cuentos largos con diálogos, descripciones y desarrollo completo de la historia. Respondes SOLO en formato JSON válido sin ningún texto adicional.'

    const rawContent = await retryWithBackoff(async () => {
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
            { "role": "system", "content": systemInstruction },
            { "role": "user", "content": storyPrompt }
          ],
          "response_format": { "type": "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    }, 3, 3000);
    
    let storyData
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        storyData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      storyData = {
        title: 'Una Aventura de Aprendizaje',
        content: rawContent.substring(0, 2000) || 'Había una vez un grupo de amigos que descubrieron que trabajando juntos podían lograr cosas increíbles.',
        moral: 'Juntos podemos lograr grandes cosas cuando nos ayudamos mutuamente.'
      }
    }

    let finalContent = storyData.content || ''
    if (finalContent.length < 500) {
      finalContent = `${finalContent}\n\nY así, nuestros amigos aprendieron una valiosa lección...`
    }

    const story: Story = {
      id: `story-${Date.now()}`,
      title: storyData.title || 'Cuento del Día',
      content: finalContent,
      moral: storyData.moral || 'Aprende algo nuevo cada día.',
      date: new Date().toISOString()
    }

    return NextResponse.json({ story })

  } catch (error) {
    console.error('Story API error:', error)
    const fallbackStory: Story = {
      id: `story-${Date.now()}`,
      title: 'El Secreto del Jardín Escondido',
      content: `En un pequeño pueblo de México...`,
      moral: 'El trabajo en equipo, la perseverancia y el cuidado del medio ambiente...',
      date: new Date().toISOString()
    }
    return NextResponse.json({ story: fallbackStory })
  }
}


