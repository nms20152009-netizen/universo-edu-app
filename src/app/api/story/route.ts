import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

interface Story {
  id: string
  title: string
  content: string
  moral: string
  date: string
}

// Story themes for rotation
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

// Función para reintentos
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
    // Get today's theme based on day of year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    const themeIndex = dayOfYear % storyThemes.length
    const todayTheme = storyThemes[themeIndex]

    // Generate story prompt - HISTORIAS MÁS LARGAS
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

    const response = await retryWithBackoff(async () => {
      const zai = await ZAI.create()
      
      return await zai.chat.completions.create({
        messages: [
          { 
            role: 'assistant', 
            content: 'Eres un escritor profesional de literatura infantil educativa mexicana. Creas cuentos completos, detallados y entretenidos que enseñan valores a niños de primaria. Tu estilo es cálido, imaginativo y siempre apropiado para la edad. Escribes cuentos largos con diálogos, descripciones y desarrollo completo de la historia. Respondes SOLO en formato JSON válido sin ningún texto adicional.' 
          },
          { role: 'user', content: storyPrompt }
        ],
        thinking: { type: 'disabled' }
      })
    }, 3, 3000)

    const rawContent = response.choices[0]?.message?.content || ''
    
    // Parse JSON from response
    let storyData
    try {
      // Try to extract JSON from the response
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        storyData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      // Fallback if JSON parsing fails
      storyData = {
        title: 'Una Aventura de Aprendizaje',
        content: rawContent.substring(0, 2000) || 'Había una vez un grupo de amigos que descubrieron que trabajando juntos podían lograr cosas increíbles. Aprendieron que la amistad, el respeto y la colaboración son los valores más importantes en la vida.',
        moral: 'Juntos podemos lograr grandes cosas cuando nos ayudamos mutuamente.'
      }
    }

    // Verificar que el contenido sea suficientemente largo
    let finalContent = storyData.content || ''
    if (finalContent.length < 500) {
      finalContent = `${finalContent}\n\nY así, nuestros amigos aprendieron una valiosa lección. Descubrieron que cada desafío que enfrentamos nos hace más fuertes y que, con la ayuda de quienes nos rodean, podemos superar cualquier obstáculo. Esta experiencia los unió aún más como amigos y les enseñó el verdadero significado de la amistad y el trabajo en equipo.`
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
    
    // Historia de fallback larga
    const fallbackStory: Story = {
      id: `story-${Date.now()}`,
      title: 'El Secreto del Jardín Escondido',
      content: `En un pequeño pueblo de México, rodeado de montañas y campos de maíz, vivía una niña llamada Sofía. Tenía 11 años y siempre estaba llena de curiosidad por descubrir nuevos lugares.

Un día, mientras exploraba detrás de su casa, Sofía encontró una vieja puerta de madera cubierta de enredaderas. Con mucho cuidado, logró abrirla y descubrió un jardín abandonado lleno de flores silvestres y árboles frutales.

—¡Esto es increíble! —exclamó Sofía mientras corría entre los árboles.

Al día siguiente, decidió compartir su descubrimiento con sus mejores amigos: Diego y Valentina. Los tres amigos se reunieron temprano en la mañana para explorar el jardín juntos.

—¿Creen que podamos restaurarlo? —preguntó Diego, observando las plantas que necesitaban cuidado.

—¡Claro que sí! —respondió Valentina con entusiasmo—. Si trabajamos juntos, podemos convertir este lugar en algo hermoso.

Durante semanas, los tres amigos dedicaron sus tardes a limpiar el jardín. Sofía investigó sobre las plantas nativas en la biblioteca escolar. Diego construyó cercas y senderos con madera reciclada. Valentina trajo semillas de flores de su casa y las plantó con mucho cariño.

—Miren cómo han crecido las plantas —dijo Sofía un día, señalando los primeros brotes de flores coloridas—. Todo nuestro esfuerzo está valiendo la pena.

Sin embargo, no todo fue fácil. Una semana, llegó una fuerte tormenta que dañó parte del jardín. Los amigos se sintieron tristes al ver su trabajo afectado.

—No debemos rendirnos —dijo Diego con determinación—. Juntos podemos arreglarlo.

Y así lo hicieron. Trabajaron aún más duro, y con la ayuda de sus familias y vecinos, el jardín se convirtió en un lugar hermoso donde todos podían disfrutar de la naturaleza.

El día de la inauguración, los tres amigos se pararon frente al jardín renovado, llenos de orgullo.

—Hemos aprendido algo importante —dijo Valentina—. Cuando trabajamos juntos y no nos rendimos ante los problemas, podemos crear cosas maravillosas.

Sofía sonrió y agregó:
—Y también aprendimos que cuidar la naturaleza es responsabilidad de todos. Este jardín será un lugar especial para nuestra comunidad.

Los tres amigos se abrazaron, sabiendo que habían creado algo que perduraría por mucho tiempo. El jardín se convirtió en un símbolo de amistad, trabajo en equipo y amor por la naturaleza para todo el pueblo.`,
      moral: 'El trabajo en equipo, la perseverancia y el cuidado del medio ambiente nos permiten crear cosas hermosas que benefician a toda la comunidad.',
      date: new Date().toISOString()
    }
    
    return NextResponse.json({ story: fallbackStory })
  }
}
