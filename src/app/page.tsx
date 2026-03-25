// UNIVERSO EDU - Educational Platform for Mexican 6th Grade Students
// Version: 2.0 - Marquee Banner + Links Feature
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Bot, BookOpen, Sparkles, Send, MessageCircle, 
  RefreshCw, Star, Heart, Trophy, Zap,
  Menu, X, ChevronRight, Settings,
  Plus, Trash2, Edit, Save, FileText, Image as ImageIcon,
  Video, Link, Clock, Calendar, Upload, Download,
  Lock, Unlock, Eye, Code, FileIcon, ExternalLink,
  Languages, Microscope, Globe2, Users, Volume2, VolumeX,
  Search, Layers
} from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

// Types
interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Story {
  id: string
  title: string
  content: string
  moral: string
  date: string
}

interface LibroCONALITEG {
  codigo: string
  titulo: string
  url: string
  grado: number
}

interface CampoFormativo {
  id: string
  nombre: string
  descripcion: string | null
  color: string
  icono: string | null
  orden: number
  _count?: { tareas: number }
}

interface Tarea {
  id: string
  titulo: string
  descripcion: string | null
  campoFormativoId: string
  campoFormativo?: CampoFormativo
  tema: string | null
  fechaProgramada: string | null
  fechaLimite: string | null
  activa: boolean
  orden: number
  archivos?: Archivo[]
  imagenes?: ImagenTarea[]
  videos?: VideoTarea[]
}

interface Archivo {
  id: string
  nombre: string
  tipo: string
  url: string
  tamaño?: number
}

interface ImagenTarea {
  id: string
  url: string
  alt?: string
}

interface VideoTarea {
  id: string
  urlYoutube: string
  videoId: string
  titulo?: string
}

interface MarqueeBanner {
  id: string
  texto: string
  imagenUrl: string | null
  activo: boolean
  velocidad: number
}

// Componente para renderizar contenido de tareas con imágenes, videos y links
function RenderTareaContent({ content, darkMode }: { content: string; darkMode: boolean }) {
  if (!content || typeof content !== 'string') return null;
  const safeTrim = (value: unknown, fallback = '') =>
    typeof value === 'string' ? value.trim() : fallback

  // Procesar el contenido para extraer y renderizar elementos especiales
  const processContent = (text: string) => {
    try {
      const elements: React.ReactNode[] = []
      let remaining = text

      // Procesar iframes de YouTube (non-greedy, optimized)
      const iframeRegex = /<iframe\s+[^>]*src\s*=\s*["']([^"']*youtube\.com\/embed\/[^"']*?)["'][^>]*>\s*<\/iframe>/i
      // Procesar marcadores de video (optimized)
      const videoMarkerRegex = /\[Video:\s*(https?:\/\/[^\]\s]+)\]/i
      // Procesar marcadores de imagen (data URL o /uploads/) - optimized with non-greedy quantifiers
      const imageMarkerRegex = /\[Imagen:\s*(data:image\/[^;]+;base64,[^\]]*?|\/uploads\/[^\]]*?)\]/i
      // Procesar marcadores de archivo - optimized with non-greedy quantifiers
      const fileMarkerRegex = /📎\s*Archivo:\s*([^-]*?)\s*-\s*Enlace:\s*(data:[^;]+;base64,[^\s\]]*?|\/uploads\/[^\s\]]*?)/i
      // Procesar marcadores de link - Soporta tanto [Link: Texto | URL] como [Link: Texto - URL]
      const linkMarkerRegex = /\[Link:\s*([^\]|-]+?)\s*(\||-)\s*([^\]]+?)\]/i
      // Procesar URLs directas (http o https) - optimized
      const urlRegex = /https?:\/\/[^\s<>"']+/i
      
      let keyIndex = 0
      
      while (remaining.length > 0) {
        // Buscar el primer elemento especial
        const iframeMatch = remaining.match(iframeRegex)
        const videoMarkerMatch = remaining.match(videoMarkerRegex)
        const imageMarkerMatch = remaining.match(imageMarkerRegex)
        const fileMarkerMatch = remaining.match(fileMarkerRegex)
        const linkMarkerMatch = remaining.match(linkMarkerRegex)
        const urlMatch = remaining.match(urlRegex)
        
        // Encontrar la posición más cercana
        const positions: { type: string; index: number; match: RegExpMatchArray | null }[] = [
          { type: 'iframe', index: (iframeMatch && iframeMatch.index !== undefined) ? iframeMatch.index : Infinity, match: iframeMatch },
          { type: 'videoMarker', index: (videoMarkerMatch && videoMarkerMatch.index !== undefined) ? videoMarkerMatch.index : Infinity, match: videoMarkerMatch },
          { type: 'imageMarker', index: (imageMarkerMatch && imageMarkerMatch.index !== undefined) ? imageMarkerMatch.index : Infinity, match: imageMarkerMatch },
          { type: 'fileMarker', index: (fileMarkerMatch && fileMarkerMatch.index !== undefined) ? fileMarkerMatch.index : Infinity, match: fileMarkerMatch },
          { type: 'linkMarker', index: (linkMarkerMatch && linkMarkerMatch.index !== undefined) ? linkMarkerMatch.index : Infinity, match: linkMarkerMatch },
          { type: 'url', index: (urlMatch && urlMatch.index !== undefined) ? urlMatch.index : Infinity, match: urlMatch }
        ].filter(p => p.index !== Infinity)
        
        if (positions.length === 0) {
          // No más elementos especiales, agregar texto restante
          elements.push(<span key={`text-${keyIndex++}`} className="whitespace-pre-wrap">{remaining}</span>)
          break
        }
        
        // Ordenar por posición
        positions.sort((a, b) => a.index - b.index)
        const first = positions[0]
        
        // Agregar texto antes del elemento
        if (first.index > 0) {
          const beforeText = remaining.substring(0, first.index)
          elements.push(<span key={`text-${keyIndex++}`} className="whitespace-pre-wrap">{beforeText}</span>)
        }
        
        // Agregar el elemento especial
        if (first.match) {
          const matchContent = first.match[0]
          const matchLength = matchContent.length
          const advancement = first.index + Math.max(matchLength, 1)
          
          if (first.type === 'iframe') {
            const srcMatch = matchContent.match(/src=["']([^"']+)["']/i)
            if (srcMatch) {
              elements.push(
                <div key={`video-${keyIndex++}`} className="aspect-video rounded-lg overflow-hidden my-3">
                  <iframe
                    src={srcMatch[1]}
                    title="Video de YouTube"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )
            }
          } else if (first.type === 'videoMarker') {
            const videoUrl = first.match[1]
            elements.push(
              <div key={`video-${keyIndex++}`} className="aspect-video rounded-lg overflow-hidden my-3">
                <iframe
                  src={videoUrl}
                  title="Video de YouTube"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )
          } else if (first.type === 'imageMarker') {
            const imageUrl = first.match[1]
            elements.push(
              <img 
                key={`image-${keyIndex++}`}
                src={imageUrl} 
                alt="Imagen de la tarea" 
                className="max-w-full h-auto rounded-lg my-2"
              />
            )
          } else if (first.type === 'fileMarker') {
            const fileName = safeTrim(first.match[1], 'Archivo')
            const fileUrl = first.match[2]
            if (fileUrl) {
              elements.push(
                <a
                  key={`file-${keyIndex++}`}
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg my-1 ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
                >
                  <FileIcon className="w-4 h-4" />
                  {fileName}
                </a>
              )
            }
          } else if (first.type === 'linkMarker') {
            const linkText = safeTrim(first.match[1], 'Enlace')
            // Compatibilidad con formatos antiguos y nuevos: [Link: texto - url] y [Link: texto | url]
            const linkUrl = safeTrim(first.match[3] ?? first.match[2], '')
            if (linkUrl) {
              elements.push(
                <a
                  key={`link-${keyIndex++}`}
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg my-1 ${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors font-medium`}
                >
                  <ExternalLink className="w-4 h-4" />
                  {linkText}
                </a>
              )
            }
          } else if (first.type === 'url') {
            const url = first.match[0]
            elements.push(
              <a
                key={`url-${keyIndex++}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-colors`}
              >
                {url}
              </a>
            )
          }
          remaining = remaining.substring(advancement)
        } else {
          remaining = remaining.substring(1)
        }
      }
      return elements
    } catch (error) {
      console.error('Error processing content:', error)
      return [<span key="error" className="whitespace-pre-wrap">{text}</span>]
    }
  }

  return <>{processContent(content)}</>
}

// Zona horaria Ciudad de México
const MEXICO_TIMEZONE = 'America/Mexico_City'

// Campos Formativos SEP - Información completa
const CAMPOS_FORMATIVOS_SEP: Record<string, { nombre: string; icono: string; color: string; incluye: string }> = {
  'campo-lenguajes': {
    nombre: 'Lenguajes',
    icono: '🗣️',
    color: '#ec4899', // Rosa
    incluye: 'Español, Lenguas indígenas, Inglés y Artes (música, danza, teatro, artes visuales)'
  },
  'campo-saberes': {
    nombre: 'Saberes y Pensamiento Científico',
    icono: '🔬',
    color: '#3b82f6', // Azul
    incluye: 'Matemáticas, Ciencias Naturales (biología, física, química) y Tecnologías'
  },
  'campo-etica': {
    nombre: 'Ética, Naturaleza y Sociedades',
    icono: '🌍',
    color: '#22c55e', // Verde
    incluye: 'Formación Cívica y Ética, Historia y Geografía'
  },
  'campo-humano': {
    nombre: 'De lo Humano y lo Comunitario',
    icono: '❤️',
    color: '#f97316', // Naranja
    incluye: 'Educación Física, Vida Saludable y aspectos Socioemocionales'
  }
}

// Función helper para obtener info del campo
const getCampoInfo = (campoId: string) => CAMPOS_FORMATIVOS_SEP[campoId] || { nombre: 'Sin campo', icono: '📚', color: '#6b7280', incluye: '' }

// Iconos para campos formativos SEP
const campoIcons: Record<string, React.ReactNode> = {
  'Lenguajes': <Languages className="w-6 h-6" />,
  'Saberes y Pensamiento Científico': <Microscope className="w-6 h-6" />,
  'Ética, Naturaleza y Sociedades': <Globe2 className="w-6 h-6" />,
  'De lo Humano y lo Comunitario': <Users className="w-6 h-6" />
}

// Helper para formatear fechas de forma segura
const formatDateSafely = (date: string | null | undefined, options: Intl.DateTimeFormatOptions) => {
  if (!date || typeof date !== 'string') return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', {
      ...options,
      timeZone: MEXICO_TIMEZONE
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

const ensureArray = <T,>(value: T[] | null | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [];
}

const normalizeTarea = (tarea: Tarea): Tarea => ({
  ...tarea,
  archivos: ensureArray(tarea.archivos),
  imagenes: ensureArray(tarea.imagenes),
  videos: ensureArray(tarea.videos),
})

const toDatetimeLocalValue = (value: string | null | undefined) => {
  if (!value || typeof value !== 'string') return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: MEXICO_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date)

    const read = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? ''

    const year = read('year')
    const month = read('month')
    const day = read('day')
    const hour = read('hour')
    const minute = read('minute')

    if (!year || !month || !day || !hour || !minute) return ''
    return `${year}-${month}-${day}T${hour}:${minute}`
  } catch (e) {
    return ''
  }
}

const isProgramadaVisibleToPublic = (fechaProgramada: string | null | undefined, nowMs = Date.now()) => {
  if (!fechaProgramada || typeof fechaProgramada !== 'string') return true

  const parsed = new Date(fechaProgramada)
  if (Number.isNaN(parsed.getTime())) {
    // Defensa en profundidad: si la fecha es inválida, no la mostramos al público.
    return false
  }

  return parsed.getTime() <= nowMs
}

const ADMIN_TOKEN_KEY = 'universo_admin_token'

export default function Home() {
  // UI States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode] = useState(true)
  const [activeSection, setActiveSection] = useState('home')
  const [botOpen, setBotOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Admin States
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [adminError, setAdminError] = useState('')
  
  // Chat States
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy EDU, tu asistente educativo de UNIVERSO EDU. Conozco los libros de CONALITEG de 6to grado y puedo ayudarte con tus tareas. ¿En qué puedo ayudarte hoy? 🎓✨'
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  // Story States
  const [dailyStory, setDailyStory] = useState<Story | null>(null)
  const [storyLoading, setStoryLoading] = useState(false)
  
  // Tareas States
  const [camposFormativos, setCamposFormativos] = useState<CampoFormativo[]>([])
  const [librosCONALITEG, setLibrosCONALITEG] = useState<LibroCONALITEG[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [selectedCampo, setSelectedCampo] = useState<string>('all')
  
  // Admin - Nueva Tarea
  const [nuevaTarea, setNuevaTarea] = useState({
    titulo: '',
    descripcion: '',
    campoFormativoId: '',
    tema: '',
    fechaProgramada: '',
    fechaLimite: ''
  })
  const [tareaEditorOpen, setTareaEditorOpen] = useState(false)
  const [editingTarea, setEditingTarea] = useState<Tarea | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  
  // Editor enriquecido
  const [editorContent, setEditorContent] = useState('')
  const [editorStyles, setEditorStyles] = useState({
    fontFamily: 'Arial',
    fontSize: '16',
    textColor: '#000000',
    bgColor: '#ffffff'
  })
  
  // Media States
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeEmbedCode, setYoutubeEmbedCode] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  
  // Link States
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  
  // Marquee Banner States
  const [marqueeBanner, setMarqueeBanner] = useState<MarqueeBanner | null>(null)
  const [marqueeTexto, setMarqueeTexto] = useState('')
  const [marqueeImagenUrl, setMarqueeImagenUrl] = useState('')
  const [marqueeVelocidad, setMarqueeVelocidad] = useState(30)
  const [marqueeEditorOpen, setMarqueeEditorOpen] = useState(false)
  const [marqueeSaving, setMarqueeSaving] = useState(false)
  
  // Hora CDMX
  const [currentTime, setCurrentTime] = useState('')
  const [currentDateLabel, setCurrentDateLabel] = useState('')
  
  // Hydration guard
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const getAdminAuthHeaders = useCallback((): Record<string, string> => {
    if (typeof window === 'undefined') return {}

    const token = localStorage.getItem(ADMIN_TOKEN_KEY)
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  useEffect(() => {
    const restoreAdminSession = async () => {
      if (typeof window === 'undefined') return

      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (!token) return

      try {
        const response = await fetch('/api/admin', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const data = await response.json()

        if (data?.authenticated) {
          setIsAdmin(true)
        } else {
          localStorage.removeItem(ADMIN_TOKEN_KEY)
        }
      } catch (error) {
        console.error('Error restoring admin session:', error)
      }
    }

    restoreAdminSession()
  }, [])

  // Cargar contenido cuando se edita una tarea (se dispara desde el botón de editar)
  const loadEditingContent = (tarea: Tarea) => {
    setEditingTarea(tarea)
    if (tarea.descripcion) {
      setEditorContent(tarea.descripcion)
      // Extraer imágenes del contenido
      const imageMatches = tarea.descripcion.match(/\[Imagen:\s*(data:image\/[^;]+;base64,[^\]]+|\/uploads\/[^\]]+)\]/g)
      if (imageMatches && Array.isArray(imageMatches)) {
        const urls = imageMatches.map(m => {
          const innerMatch = m.match(/(data:image\/[^;]+;base64,[^\]]+|\/uploads\/[^\]]+)/)
          return innerMatch ? innerMatch[0] : ''
        })
        setUploadedImages(urls.filter(Boolean))
      }
    } else {
      setEditorContent('')
      setUploadedImages([])
    }
    setTareaEditorOpen(true)
  }

  // Limpiar editor
  const clearEditor = () => {
    setEditorContent('')
    setUploadedImages([])
    setEditingTarea(null)
  }

  // Obtener hora de CDMX
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const options: Intl.DateTimeFormatOptions = {
        timeZone: MEXICO_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }
      try {
        setCurrentTime(now.toLocaleTimeString('es-MX', options))
      } catch {
        setCurrentTime(now.toLocaleTimeString('es-MX'))
      }

      try {
        setCurrentDateLabel(
          now.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: MEXICO_TIMEZONE
          })
        )
      } catch {
        setCurrentDateLabel(
          now.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        )
      }
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Cargar campos formativos y libros
  useEffect(() => {
    const fetchCampos = async () => {
      try {
        const response = await fetch('/api/campos-formativos')
        if (!response.ok) throw new Error('API Error')
        const data = await response.json()
        setCamposFormativos(Array.isArray(data.campos) ? data.campos : Array.isArray(data) ? data : [])
        setLibrosCONALITEG(Array.isArray(data.librosCONALITEG) ? data.librosCONALITEG : [])
      } catch (error) {
        console.error('Error loading campos:', error)
      }
    }
    fetchCampos()
  }, [])

  // Cargar marquee banner
  useEffect(() => {
    const fetchMarquee = async () => {
      try {
        const response = await fetch('/api/marquee')
        if (!response.ok) throw new Error('API Error')
        const data = await response.json()
        if (data && !data.error) {
          setMarqueeBanner(data)
          setMarqueeTexto(data.texto || '')
          setMarqueeImagenUrl(data.imagenUrl || '')
          setMarqueeVelocidad(data.velocidad || 30)
        }
      } catch (error) {
        console.error('Error loading marquee:', error)
      }
    }
    fetchMarquee()
  }, [])

  // Función para guardar el marquee banner
  const handleSaveMarquee = async () => {
    setMarqueeSaving(true)
    try {
      const response = await fetch('/api/marquee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: marqueeTexto,
          imagenUrl: marqueeImagenUrl || null,
          velocidad: marqueeVelocidad,
          activo: true
        })
      })
      const data = await response.json()
      setMarqueeBanner(data)
      setMarqueeTexto(data.texto)
      setMarqueeImagenUrl(data.imagenUrl || '')
      setMarqueeEditorOpen(false)
    } catch (error) {
      console.error('Error saving marquee:', error)
    }
    setMarqueeSaving(false)
  }

  // Función para agregar link al editor
  const addLinkToEditor = () => {
    if (linkText && linkUrl) {
      const linkMarker = `[Link: ${linkText} - ${linkUrl}]`
      setEditorContent(prev => prev + '\n' + linkMarker)
      setLinkText('')
      setLinkUrl('')
    }
  }

  // Cargar tareas cuando cambia el campo seleccionado
  useEffect(() => {
    let mounted = true
    
    const fetchTareas = async () => {
      try {
        const params = new URLSearchParams()
        if (selectedCampo !== 'all') params.set('campoId', selectedCampo)
        if (!isAdmin) params.set('activas', 'true')

        const url = `/api/tareas${params.toString() ? `?${params.toString()}` : ''}`
        const response = await fetch(url, {
          headers: getAdminAuthHeaders(),
          cache: 'no-store'
        })
        if (!response.ok) throw new Error('API Error')
        const data = await response.json()
        if (mounted) {
          setTareas(Array.isArray(data) ? data.map(normalizeTarea) : [])
        }
      } catch (error) {
        console.error('Error loading tareas:', error)
        if (mounted) setTareas([])
      }
    }
    fetchTareas()
    
    return () => { mounted = false }
  }, [selectedCampo, isAdmin, getAdminAuthHeaders])
  
  // Función para recargar tareas manualmente
  const refreshTareas = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCampo !== 'all') params.set('campoId', selectedCampo)
      if (!isAdmin) params.set('activas', 'true')

      const url = `/api/tareas${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url, {
        headers: getAdminAuthHeaders(),
        cache: 'no-store'
      })
      if (!response.ok) throw new Error('API Error')
      const data = await response.json()
      setTareas(Array.isArray(data) ? data.map(normalizeTarea) : [])
    } catch (error) {
      console.error('Error loading tareas:', error)
      setTareas([])
    }
  }

  const tareasVisiblesEnGrid = (() => {
    if (!Array.isArray(tareas)) return []
    if (isAdmin) return tareas

    const nowMs = Date.now()
    return tareas.filter((tarea) => isProgramadaVisibleToPublic(tarea?.fechaProgramada, nowMs))
  })()

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Admin login
  const handleAdminLogin = async () => {
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      })
      const data = await response.json()
      
      if (data.success) {
        if (typeof window !== 'undefined' && data.token) {
          localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
        }
        setIsAdmin(true)
        setAdminDialogOpen(false)
        setAdminPassword('')
        setAdminError('')
      } else {
        setAdminError('Contraseña incorrecta')
      }
    } catch (error) {
      setAdminError('Error de conexión')
    }
  }

  // Chat functions
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          messages: chatMessages
        })
      })
      const data = await response.json()
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response || 'Lo siento, no pude procesar tu pregunta. ¿Puedes intentar de nuevo?'
      }])
    } catch (error) {
      console.error('Error:', error)
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '¡Ups! Algo salió mal. Por favor intenta de nuevo.'
      }])
    }
    setChatLoading(false)
  }

  // Story functions
  const generateDailyStory = useCallback(async () => {
    setStoryLoading(true)
    try {
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.story) {
        setDailyStory(data.story)
      }
    } catch (error) {
      console.error('Error generating story:', error)
    }
    setStoryLoading(false)
  }, [])

  const navigateTo = (section: string) => {
    setActiveSection(section)
    if (section === 'cuentos' && !dailyStory && !storyLoading) {
      generateDailyStory()
    }
  }

  // Tarea functions
  const handleCreateTarea = async () => {
    if (!nuevaTarea.titulo || !nuevaTarea.campoFormativoId) {
      setSaveError('Por favor completa el título y campo formativo')
      return
    }

    setSaving(true)
    setSaveError('')

    try {
      const response = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({
          ...nuevaTarea,
          descripcion: editorContent
        })
      })
      
      if (response.ok) {
        setTareaEditorOpen(false)
        setNuevaTarea({
          titulo: '',
          descripcion: '',
          campoFormativoId: '',
          tema: '',
          fechaProgramada: '',
          fechaLimite: ''
        })
        clearEditor()
        refreshTareas()
      } else {
        const errorData = await response.json()
        setSaveError(errorData.error || 'Error al crear la tarea')
      }
    } catch (error) {
      console.error('Error creating tarea:', error)
      setSaveError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTarea = async () => {
    if (!editingTarea) return
    
    if (!editingTarea.titulo || !editingTarea.campoFormativoId) {
      setSaveError('Por favor completa el título y campo formativo')
      return
    }

    setSaving(true)
    setSaveError('')
    
    try {
      const response = await fetch('/api/tareas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({
          id: editingTarea.id,
          titulo: editingTarea.titulo,
          campoFormativoId: editingTarea.campoFormativoId,
          tema: editingTarea.tema,
          fechaProgramada: editingTarea.fechaProgramada,
          fechaLimite: editingTarea.fechaLimite,
          descripcion: editorContent
        })
      })
      
      if (response.ok) {
        setTareaEditorOpen(false)
        clearEditor()
        refreshTareas()
      } else {
        const errorData = await response.json()
        setSaveError(errorData.error || 'Error al guardar los cambios')
      }
    } catch (error) {
      console.error('Error updating tarea:', error)
      setSaveError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTarea = async (id: string) => {
    if (!id) return
    
    const shouldDelete = window.confirm('¿Estás seguro de eliminar esta tarea?')
    if (!shouldDelete) return
    
    try {
      const response = await fetch(`/api/tareas?id=${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error deleting tarea:', errorData)
        window.alert('Error al eliminar la tarea. Intenta de nuevo.')
        return
      }
      // Refresh the list after successful deletion
      await refreshTareas()
    } catch (error) {
      console.error('Error deleting tarea:', error)
      window.alert('Error de conexión al eliminar la tarea.')
    }
  }

  // YouTube embed
  const addYoutubeVideo = async (tareaId: string) => {
    if (!youtubeUrl) return
    
    try {
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urlYoutube: youtubeUrl,
          tareaId
        })
      })
      
      if (response.ok) {
        setYoutubeUrl('')
        refreshTareas()
      }
    } catch (error) {
      console.error('Error adding video:', error)
    }
  }

  // Extract YouTube ID
  const getYoutubeId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
      /youtube\.com\/shorts\/([^&\s?]+)/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-purple-600" />
          <p className="text-slate-500 font-medium">Cargando UNIVERSO EDU...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#050505] text-slate-100">
      {/* Premium Background Video */}
      <div className="bg-video-container">
        <video
          ref={videoRef}
          className="bg-video opacity-60"
          autoPlay
          loop
          muted={isMuted}
          playsInline
          poster="/universe-loop-poster.png"
        >
          <source src="/universe-loop.webm" type="video/webm" />
          <source src="/universe-loop.mp4" type="video/mp4" />
        </video>
        <div className="video-overlay" />
      </div>

      {/* Audio Toggle */}
      <Button
        onClick={() => setIsMuted(!isMuted)}
        className="fixed bottom-6 right-6 z-50 glass-panel p-4 rounded-full hover:scale-110 transition-transform border-gold-metallic/30"
        variant="ghost"
        size="icon"
      >
        {isMuted ? <VolumeX className="w-6 h-6 text-gold-metallic" /> : <Volume2 className="w-6 h-6 text-gold-metallic" />}
      </Button>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-gold-metallic/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-3 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              onClick={() => navigateTo('home')}
            >
              <div className="relative w-14 h-14">
                <Image
                  src="/mascot-owl.png"
                  alt="UNIVERSO EDU"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold gold-text tracking-tighter">
                  UNIVERSO EDU
                </h1>
                <p className="text-[10px] text-gold-metallic/60 uppercase tracking-widest font-medium">
                  {currentDateLabel} • {currentTime}
                </p>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: 'home', label: 'Inicio', icon: <Star className="w-4 h-4" /> },
                { id: 'tareas', label: 'Tareas', icon: <BookOpen className="w-4 h-4" /> },
                { id: 'libros', label: 'Libros SEP', icon: <FileText className="w-4 h-4" /> },
                { id: 'cuentos', label: 'Cuentos', icon: <Sparkles className="w-4 h-4" /> }
              ].map((item) => (
                <Button
                  key={item.id}
                  variant={activeSection === item.id ? 'default' : 'ghost'}
                  onClick={() => navigateTo(item.id)}
                  className={`flex items-center gap-2 ${
                    activeSection === item.id 
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white' 
                      : darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Admin Button */}
              <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={isAdmin ? 'text-green-500' : darkMode ? 'text-slate-400' : 'text-slate-600'}
                  >
                    {isAdmin ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Acceso Administrador</DialogTitle>
                    <DialogDescription>
                      Ingresa la contraseña para acceder al panel de administración
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      type="password"
                      placeholder="Contraseña"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    />
                    {adminError && <p className="text-red-500 text-sm">{adminError}</p>}
                    <Button onClick={handleAdminLogin} className="w-full">
                      Ingresar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden overflow-hidden"
              >
                <div className="py-4 space-y-2">
                  {[
                    { id: 'home', label: 'Inicio', icon: <Star className="w-4 h-4" /> },
                    { id: 'tareas', label: 'Tareas', icon: <BookOpen className="w-4 h-4" /> },
                    { id: 'libros', label: 'Libros SEP', icon: <FileText className="w-4 h-4" /> },
                    { id: 'cuentos', label: 'Cuentos', icon: <Sparkles className="w-4 h-4" /> }
                  ].map((item) => (
                    <Button
                      key={item.id}
                      variant={activeSection === item.id ? 'default' : 'ghost'}
                      onClick={() => {
                        navigateTo(item.id)
                        setMobileMenuOpen(false)
                      }}
                      className={`w-full justify-start ${
                        activeSection === item.id 
                          ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white' 
                          : darkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Marquee Banner - Anuncios Importantes */}
      <div className={`w-full overflow-hidden ${darkMode ? 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600' : 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500'} py-3 shadow-lg`}>
        <div className="marquee-container">
          <div className="marquee-content" style={{ '--marquee-duration': `${marqueeBanner?.velocidad || 30}s` } as React.CSSProperties}>
            <span className="inline-flex items-center gap-4 text-white font-semibold text-lg px-8 whitespace-nowrap">
              {marqueeBanner?.imagenUrl && (
                <img 
                  src={marqueeBanner.imagenUrl} 
                  alt="Banner" 
                  className="h-8 w-auto object-contain rounded"
                />
              )}
              📢 {marqueeBanner?.texto || 'Cargando...'}
              <span className="text-yellow-200">★</span>
              {marqueeBanner?.imagenUrl && (
                <img 
                  src={marqueeBanner.imagenUrl} 
                  alt="Banner" 
                  className="h-8 w-auto object-contain rounded"
                />
              )}
              📢 {marqueeBanner?.texto || 'Cargando...'}
              <span className="text-yellow-200">★</span>
              {marqueeBanner?.imagenUrl && (
                <img 
                  src={marqueeBanner.imagenUrl} 
                  alt="Banner" 
                  className="h-8 w-auto object-contain rounded"
                />
              )}
              📢 {marqueeBanner?.texto || 'Cargando...'}
              <span className="text-yellow-200">★</span>
              {marqueeBanner?.imagenUrl && (
                <img 
                  src={marqueeBanner.imagenUrl} 
                  alt="Banner" 
                  className="h-8 w-auto object-contain rounded"
                />
              )}
              📢 {marqueeBanner?.texto || 'Cargando...'}
              <span className="text-yellow-200">★</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* HOME SECTION */}
          {activeSection === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Hero */}
              <section className="relative px-6 py-16 md:py-24">
                <div className="max-w-4xl mx-auto text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    <Badge className="mb-6 bg-gold-metallic/10 text-gold-metallic border border-gold-metallic/30 px-6 py-2 rounded-full backdrop-blur-md">
                      <Sparkles className="w-4 h-4 mr-2" />
                      PLATAFORMA PREMIUM FASE 5
                    </Badge>
                    
                    <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
                      EL <span className="gold-text">UNIVERSO</span> DEL APRENDIZAJE
                    </h2>
                    
                    <p className="text-xl md:text-2xl mb-12 text-slate-300/80 font-light leading-relaxed max-w-2xl mx-auto">
                      Experiencia educativa de elite para 6to grado. Descubre el conocimiento con elegancia y tecnología.
                    </p>
                    
                    <div className="flex flex-wrap justify-center gap-6">
                      <Button 
                        onClick={() => setBotOpen(true)}
                        className="bg-gold-metallic hover:bg-gold-metallic/90 text-black px-10 py-7 text-lg rounded-full font-bold transition-all hover:scale-105 shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                      >
                        <Bot className="w-5 h-5 mr-2" />
                        INTERACTUAR CON EDU
                      </Button>
                      <Button 
                        onClick={() => navigateTo('tareas')}
                        className="glass-panel text-gold-metallic border-gold-metallic/20 px-10 py-7 text-lg rounded-full font-bold hover:bg-gold-metallic/10 transition-all hover:scale-105"
                      >
                        <BookOpen className="w-5 h-5 mr-2" />
                        EXPLORAR TAREAS
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </section>

              {/* Campos Formativos SEP */}
              <section className="py-12">
                <div className="text-center mb-16">
                  <h3 className="text-3xl font-bold mb-4 gold-text">CAMPOS FORMATIVOS</h3>
                  <div className="w-24 h-1 bg-gold-metallic mx-auto opacity-30"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {Object.entries(CAMPOS_FORMATIVOS_SEP).map(([key, info], i) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      whileHover={{ scale: 1.05 }}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedCampo(key)
                        navigateTo('tareas')
                      }}
                    >
                      <div className="premium-card p-8 h-full flex flex-col items-center text-center">
                        <div className="text-6xl mb-6 filter drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                          {info.icono}
                        </div>
                        <h4 className="font-bold text-xl mb-4 text-gold-metallic">
                          {info.nombre}
                        </h4>
                        <p className="text-sm text-slate-400 font-light leading-relaxed">
                          {info.incluye}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Libros CONALITEG Preview */}
              <section className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-3xl p-8 shadow-xl`}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      📚 Libros CONALITEG - 6to Grado
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Ciclo Escolar 2025 - 2026
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => navigateTo('libros')}>
                    Ver todos
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {librosCONALITEG.slice(0, 6).map((libro) => (
                    <a
                      key={libro.codigo}
                      href={libro.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-4 rounded-xl text-center hover:shadow-lg transition-all ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-purple-50 hover:bg-purple-100'}`}
                    >
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                      <p className={`text-xs font-medium line-clamp-2 ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                        {libro.titulo}
                      </p>
                    </a>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* LIBROS SEP SECTION */}
          {activeSection === 'libros' && (
            <motion.div
              key="libros"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center mb-16">
                <Badge className="bg-gold-metallic/10 text-gold-metallic border border-gold-metallic/30 px-6 py-2 rounded-full mb-4">
                  BIBLIOTECA CONALITEG 2025
                </Badge>
                <h2 className="text-4xl md:text-5xl font-bold gold-text">LIBROS DE TEXTO</h2>
                <div className="w-24 h-1 bg-gold-metallic mx-auto mt-6 opacity-30"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {librosCONALITEG.map((libro, index) => (
                  <motion.a
                    key={libro.codigo}
                    href={libro.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <div className="premium-card h-full transition-all duration-500 group-hover:scale-[1.03] group-hover:border-gold-metallic/50 overflow-hidden">
                      <div className="p-8 flex items-start gap-6">
                        <div className="w-20 h-28 bg-gradient-to-br from-gold-metallic/20 to-transparent rounded-lg flex items-center justify-center flex-shrink-0 border border-gold-metallic/10 group-hover:border-gold-metallic/30 transition-colors">
                          <BookOpen className="w-10 h-10 text-gold-metallic" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-xl mb-2 text-white group-hover:text-gold-metallic transition-colors">
                            {libro.titulo}
                          </h3>
                          <Badge variant="outline" className="border-gold-metallic/20 text-gold-metallic/60 text-xs">
                            CÓDIGO: {libro.codigo}
                          </Badge>
                          <div className="mt-6 flex items-center text-gold-metallic text-sm font-medium opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                            LECTURA DIGITAL
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          )}



          {/* TAREAS SECTION */}
          {activeSection === 'tareas' && (
            <motion.div
              key="tareas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                <div>
                  <h2 className="text-4xl font-bold gold-text mb-2">TAREAS Y DESAFÍOS</h2>
                  <p className="text-slate-400 font-light italic">
                    Cronómetro Estelar: {currentTime}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-4 items-center">
                  <Select value={selectedCampo} onValueChange={setSelectedCampo}>
                    <SelectTrigger className="w-80 glass-panel border-gold-metallic/20 text-gold-metallic h-12">
                      <SelectValue placeholder="Filtrar Campo Formativo" />
                    </SelectTrigger>
                    <SelectContent className="glass-panel border-gold-metallic/20">
                      <SelectItem value="all">Todas las Galaxias</SelectItem>
                      <SelectItem value="campo-lenguajes">🗣️ Lenguajes</SelectItem>
                      <SelectItem value="campo-saberes">🔬 Saberes y Ciencia</SelectItem>
                      <SelectItem value="campo-etica">🌍 Ética y Sociedades</SelectItem>
                      <SelectItem value="campo-humano">❤️ Humano y Comunitario</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {isAdmin && (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setMarqueeEditorOpen(true)}
                        variant="outline"
                        className="glass-panel border-amber-500/30 text-amber-500 hover:bg-amber-500/10 h-12"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Avisos
                      </Button>
                      <Button
                        onClick={() => {
                          clearEditor()
                          setTareaEditorOpen(true)
                        }}
                        className="bg-gold-metallic hover:bg-gold-metallic/90 text-black font-bold px-6 h-12"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        CREAR TAREA
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tareas Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {tareasVisiblesEnGrid.length === 0 ? (
                  <div className="col-span-2 text-center py-24 glass-panel border-gold-metallic/10">
                    <BookOpen className="w-20 h-20 mx-auto mb-6 text-gold-metallic/30" />
                    <p className="text-2xl text-slate-500 font-light">Aún no hay tareas en esta galaxia...</p>
                  </div>
                ) : (
                  tareasVisiblesEnGrid.map((tarea, index) => {
                    if (!tarea) return null;
                    try {
                      const campoInfo = getCampoInfo(tarea.campoFormativoId)
                      return (
                        <motion.div
                          key={tarea.id || `tarea-${index}`}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ y: -5 }}
                        >
                          <div className="premium-card overflow-hidden h-full flex flex-col">
                            <div className="h-1" style={{ backgroundColor: campoInfo.color, boxShadow: `0 0 15px ${campoInfo.color}50` }}></div>
                            
                            <div className="p-8 flex-1 flex flex-col">
                              <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                  <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{campoInfo.icono}</span>
                                  <Badge 
                                    className="bg-transparent border-gold-metallic/30 text-gold-metallic px-4 py-1"
                                    style={{ borderLeft: `3px solid ${campoInfo.color}` }}
                                  >
                                    {campoInfo.nombre.toUpperCase()}
                                  </Badge>
                                </div>
                                
                                {isAdmin && (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => loadEditingContent(tarea)}
                                      className="text-gold-metallic/60 hover:text-gold-metallic hover:bg-gold-metallic/10"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteTarea(tarea.id)}
                                      className="text-red-500/60 hover:text-red-500 hover:bg-red-500/10"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>

                              <h3 className="text-2xl font-bold mb-3 tracking-tight text-white leading-tight">
                                {tarea.titulo}
                              </h3>
                              
                              {tarea.tema && (
                                <p className="text-gold-metallic/80 text-sm font-medium mb-6 uppercase tracking-widest flex items-center gap-2">
                                  <Sparkles className="w-3 h-3" />
                                  {tarea.tema}
                                </p>
                              )}

                              {tarea.descripcion && (
                                <div className="text-slate-300 font-light leading-relaxed mb-8 flex-1">
                                  <RenderTareaContent content={tarea.descripcion} darkMode={true} />
                                </div>
                              )}
                              
                              {/* Media Grid */}
                              {(Array.isArray(tarea.imagenes) && tarea.imagenes.length > 0) || (Array.isArray(tarea.videos) && tarea.videos.length > 0) ? (
                                <div className="space-y-4 mb-8">
                                  {/* Images */}
                                  {ensureArray(tarea.imagenes).length > 0 && (
                                    <div className="grid grid-cols-2 gap-3">
                                      {ensureArray(tarea.imagenes).map((img, i) => img?.url && (
                                        <div key={img.id || `img-${i}`} className="group relative rounded-xl overflow-hidden aspect-video border border-white/10">
                                          <img 
                                            src={img.url} 
                                            alt={img.alt || 'Tarea'} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                            <Search className="w-4 h-4 text-white" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* YouTube */}
                                  {ensureArray(tarea.videos).map((video, v) => video?.videoId && (
                                    <div key={video.id || `vid-${v}`} className="aspect-video rounded-xl overflow-hidden border border-white/10 ring-1 ring-gold-metallic/20">
                                      <iframe
                                        src={`https://www.youtube.com/embed/${video.videoId}`}
                                        title={video.titulo || 'Video'}
                                        className="w-full h-full"
                                        allowFullScreen
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                              
                              <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/5">
                                <div className="flex flex-wrap gap-3">
                                  {ensureArray(tarea.archivos).map((archivo, a) => archivo?.url && (
                                    <a
                                      key={archivo.id || `file-${a}`}
                                      href={archivo.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-gold-metallic/10 hover:border-gold-metallic/30 text-sm transition-all text-slate-300 hover:text-white"
                                    >
                                      {archivo.tipo?.includes('pdf') ? <FileText className="w-4 h-4 text-red-500" /> : <Layers className="w-4 h-4 text-blue-500" />}
                                      {archivo.nombre}
                                    </a>
                                  ))}
                                </div>

                                <div className="flex items-center gap-6 text-xs font-medium tracking-wider uppercase text-slate-500">
                                  {tarea.fechaProgramada && (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-gold-metallic/50" />
                                      {formatDateSafely(tarea.fechaProgramada, { day: 'numeric', month: 'short' })}
                                    </div>
                                  )}
                                  {tarea.fechaLimite && (
                                    <div className="flex items-center gap-2 text-gold-metallic">
                                      <Clock className="w-4 h-4" />
                                      LÍMITE: {formatDateSafely(tarea.fechaLimite, { day: 'numeric', month: 'short' })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    } catch (err) {
                      console.error('Error rendering task card:', err);
                      return null;
                    }
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* CHAT SECTION */}
          {activeSection === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'} shadow-2xl border-0 overflow-hidden`}>
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12">
                      <Image
                        src="/chatbot-character.png"
                        alt="EDU"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="text-white">
                      <h3 className="font-bold text-lg">EDU - Tu Asistente</h3>
                      <p className="text-sm opacity-90">Experto en el programa SEP y libros CONALITEG</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      <span className="text-white text-sm">En línea</span>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <ScrollArea className="h-[400px] p-4">
                  <div className="space-y-4">
                    {chatMessages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}>
                          <div className={`rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-br-sm'
                              : darkMode 
                                ? 'bg-slate-700 text-white rounded-bl-sm' 
                                : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                          }`}>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className={`${darkMode ? 'bg-slate-700' : 'bg-slate-100'} rounded-2xl px-4 py-3`}>
                          <div className="flex gap-2">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Chat Input */}
                <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault()
                      sendChatMessage()
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Pregunta sobre matemáticas, historia, ciencias..."
                      className={`flex-1 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}`}
                      disabled={chatLoading}
                    />
                    <Button 
                      type="submit"
                      disabled={!chatInput.trim() || chatLoading}
                      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </form>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {['¿Qué son las fracciones?', '¿Quién fue Miguel Hidalgo?', 'Explícame los ecosistemas', '¿Qué es la democracia?'].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => setChatInput(suggestion)}
                        className={`text-xs ${darkMode ? 'border-slate-600 text-slate-300' : ''}`}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* CUENTOS SECTION */}
          {activeSection === 'cuentos' && (
            <motion.div
              key="cuentos"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'} shadow-2xl border-0 overflow-hidden`}>
                {/* Story Header */}
                <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16">
                        <Image
                          src="/storybook.png"
                          alt="Cuentos"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="text-white">
                        <h3 className="font-bold text-xl">Cuento del Día</h3>
                        <p className="text-sm opacity-90">{currentDateLabel || 'Fecha no disponible'}</p>
                      </div>
                    </div>
                    <Button
                      onClick={generateDailyStory}
                      disabled={storyLoading}
                      variant="secondary"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${storyLoading ? 'animate-spin' : ''}`} />
                      Nuevo Cuento
                    </Button>
                  </div>
                </div>

                {/* Story Content */}
                <CardContent className="p-6">
                  {storyLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="relative w-24 h-24 mb-4">
                        <Image
                          src="/storybook.png"
                          alt="Cargando"
                          fill
                          className="object-contain animate-pulse"
                        />
                      </div>
                      <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                        Creando un cuento mágico para ti...
                      </p>
                    </div>
                  ) : dailyStory ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      <div className="text-center">
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 mb-3">
                          <Star className="w-3 h-3 mr-1" />
                          Historia Educativa
                        </Badge>
                        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          {dailyStory.title}
                        </h2>
                      </div>

                      <div className={`prose prose-lg max-w-none ${darkMode ? 'prose-invert' : ''}`}>
                        <p className={`whitespace-pre-line leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {dailyStory.content}
                        </p>
                      </div>

                      <div className={`p-4 rounded-xl ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'} border ${darkMode ? 'border-purple-700' : 'border-purple-100'}`}>
                        <div className="flex items-start gap-3">
                          <Heart className="w-5 h-5 text-pink-500 mt-1 flex-shrink-0" />
                          <div>
                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                              Moraleja:
                            </p>
                            <p className={`${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              {dailyStory.moral}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center py-12">
                      <Button onClick={generateDailyStory} className="bg-gradient-to-r from-purple-500 to-pink-500">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generar Cuento
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Tarea Editor Dialog */}
      <Dialog open={tareaEditorOpen} onOpenChange={setTareaEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTarea ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Título *</Label>
                <Input
                  value={editingTarea?.titulo || nuevaTarea.titulo}
                  onChange={(e) => {
                    if (editingTarea) {
                      setEditingTarea({ ...editingTarea, titulo: e.target.value })
                    } else {
                      setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })
                    }
                  }}
                  placeholder="Título de la tarea"
                />
              </div>
              <div>
                <Label>Campo Formativo *</Label>
                <Select
                  value={editingTarea?.campoFormativoId || nuevaTarea.campoFormativoId}
                  onValueChange={(value) => {
                    if (editingTarea) {
                      setEditingTarea({ ...editingTarea, campoFormativoId: value })
                    } else {
                      setNuevaTarea({ ...nuevaTarea, campoFormativoId: value })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar campo formativo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campo-lenguajes" textValue="Lenguajes">
                      <div className="flex items-center gap-2">
                        <span>🗣️</span>
                        <span>Lenguajes</span>
                        <span className="text-xs text-slate-400 ml-2">(Español, Inglés, Artes)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="campo-saberes" textValue="Saberes y Pensamiento Científico">
                      <div className="flex items-center gap-2">
                        <span>🔬</span>
                        <span>Saberes y Pensamiento Científico</span>
                        <span className="text-xs text-slate-400 ml-2">(Matemáticas, Ciencias)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="campo-etica" textValue="Etica, Naturaleza y Sociedades">
                      <div className="flex items-center gap-2">
                        <span>🌍</span>
                        <span>Ética, Naturaleza y Sociedades</span>
                        <span className="text-xs text-slate-400 ml-2">(Historia, Geografía, Cívica)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="campo-humano" textValue="De lo Humano y lo Comunitario">
                      <div className="flex items-center gap-2">
                        <span>❤️</span>
                        <span>De lo Humano y lo Comunitario</span>
                        <span className="text-xs text-slate-400 ml-2">(Ed. Física, Socioemocional)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Info del campo seleccionado */}
                {(editingTarea?.campoFormativoId || nuevaTarea.campoFormativoId) && (
                  <div className={`mt-2 p-3 rounded-lg text-sm ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    {(editingTarea?.campoFormativoId || nuevaTarea.campoFormativoId) === 'campo-lenguajes' && (
                      <p><strong>Incluye:</strong> Español, Lenguas indígenas, Inglés y Artes (música, danza, teatro, artes visuales).</p>
                    )}
                    {(editingTarea?.campoFormativoId || nuevaTarea.campoFormativoId) === 'campo-saberes' && (
                      <p><strong>Incluye:</strong> Matemáticas, Ciencias Naturales (biología, física, química) y Tecnologías.</p>
                    )}
                    {(editingTarea?.campoFormativoId || nuevaTarea.campoFormativoId) === 'campo-etica' && (
                      <p><strong>Incluye:</strong> Formación Cívica y Ética, Historia y Geografía.</p>
                    )}
                    {(editingTarea?.campoFormativoId || nuevaTarea.campoFormativoId) === 'campo-humano' && (
                      <p><strong>Incluye:</strong> Educación Física, Vida Saludable y aspectos Socioemocionales.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tema</Label>
                <Input
                  value={editingTarea?.tema || nuevaTarea.tema}
                  onChange={(e) => {
                    if (editingTarea) {
                      setEditingTarea({ ...editingTarea, tema: e.target.value })
                    } else {
                      setNuevaTarea({ ...nuevaTarea, tema: e.target.value })
                    }
                  }}
                  placeholder="Tema específico"
                />
              </div>
              <div>
                <Label>Fecha Programada (CDMX)</Label>
                <Input
                  type="datetime-local"
                  value={editingTarea?.fechaProgramada ? toDatetimeLocalValue(editingTarea.fechaProgramada) : nuevaTarea.fechaProgramada}
                  onChange={(e) => {
                    if (editingTarea) {
                      setEditingTarea({ ...editingTarea, fechaProgramada: e.target.value })
                    } else {
                      setNuevaTarea({ ...nuevaTarea, fechaProgramada: e.target.value })
                    }
                  }}
                />
              </div>
            </div>

            {/* Editor de Contenido */}
            <div>
              <Label>Descripción de la Tarea</Label>
              <Textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="Escribe el contenido de la tarea aquí..."
                className={`min-h-[150px] ${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                style={{
                  fontFamily: editorStyles.fontFamily,
                  fontSize: `${editorStyles.fontSize}px`,
                }}
              />
            </div>

            {/* Herramientas de formato */}
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <Label className="text-sm mb-2 block">Formato de texto</Label>
              <div className="flex flex-wrap gap-2">
                <Select value={editorStyles.fontFamily} onValueChange={(v) => setEditorStyles({...editorStyles, fontFamily: v})}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Verdana">Verdana</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={editorStyles.fontSize} onValueChange={(v) => setEditorStyles({...editorStyles, fontSize: v})}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14">14px</SelectItem>
                    <SelectItem value="16">16px</SelectItem>
                    <SelectItem value="18">18px</SelectItem>
                    <SelectItem value="20">20px</SelectItem>
                  </SelectContent>
                </Select>
                {/* Emojis */}
                <div className="flex gap-1 ml-2">
                  {['😀', '🎉', '📚', '✏️', '🌟', '💡', '🎨', '🔬', '📐', '🌍'].map(emoji => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setEditorContent(prev => prev + emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subir Imágenes */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4" />
                Imágenes
              </Label>
              <div 
                className={`p-4 border-2 border-dashed rounded-lg text-center ${darkMode ? 'border-slate-600' : 'border-slate-300'} transition-colors hover:border-indigo-500`}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50', darkMode ? 'dark:bg-indigo-900/20' : '')
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50', darkMode ? 'dark:bg-indigo-900/20' : '')
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50', darkMode ? 'dark:bg-indigo-900/20' : '')
                  const files = e.dataTransfer.files
                  if (!files || files.length === 0) return
                  
                  for (const file of Array.from(files)) {
                    if (!file.type.startsWith('image/')) continue; // Ignore non-images if dropped here
                    const formData = new FormData()
                    formData.append('file', file)
                    formData.append('tipo', 'imagen')
                    
                    try {
                      const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                      })
                      const data = await response.json()
                      
                      if (data.url) {
                        setUploadedImages(prev => [...prev, data.url])
                        setEditorContent(prev => prev + `\n[Imagen: ${data.url}]\n`)
                      }
                    } catch (error) {
                      console.error('Error uploading dropped image:', error)
                    }
                  }
                }}
              >
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files
                    if (!files) return
                    
                    for (const file of Array.from(files)) {
                      const formData = new FormData()
                      formData.append('file', file)
                      formData.append('tipo', 'imagen')
                      
                      try {
                        const response = await fetch('/api/upload', {
                          method: 'POST',
                          body: formData
                        })
                        const data = await response.json()
                        
                        if (data.url) {
                          setUploadedImages(prev => [...prev, data.url])
                          setEditorContent(prev => prev + `\n[Imagen: ${data.url}]\n`)
                        }
                      } catch (error) {
                        console.error('Error uploading image:', error)
                      }
                    }
                    e.target.value = ''
                  }}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer block w-full h-full">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-500">Haz clic para subir imágenes o arrastra archivos aquí</p>
                </label>
              </div>
              {/* Preview de imágenes subidas */}
              {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {uploadedImages.map((url, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={url} 
                        alt={`Imagen ${index + 1}`} 
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full"
                        onClick={() => {
                          setUploadedImages(prev => prev.filter((_, i) => i !== index))
                          setEditorContent(prev => prev.replace(`[Imagen: ${url}]`, ''))
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Media Section */}
            <div className="space-y-4">
              {/* YouTube URL */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4" />
                  Video de YouTube (URL)
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className={darkMode ? 'bg-slate-800 border-slate-700' : ''}
                  />
                  <Button
                    onClick={() => {
                      const videoId = getYoutubeId(youtubeUrl)
                      if (videoId) {
                        setEditorContent(prev => prev + `\n[Video: https://www.youtube.com/embed/${videoId}]\n`)
                        setYoutubeUrl('')
                      } else {
                        alert('URL de YouTube no válida')
                      }
                    }}
                    disabled={!youtubeUrl}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* YouTube Embed Code */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4" />
                  Embed Video de YouTube (Código Iframe)
                </Label>
                <Textarea
                  placeholder='<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID" ...></iframe>'
                  value={youtubeEmbedCode}
                  onChange={(e) => setYoutubeEmbedCode(e.target.value)}
                  className={`min-h-[80px] font-mono text-sm ${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Pega el código completo del iframe de YouTube (clic derecho en video → Copiar código de inserción)
                </p>
                <Button
                  onClick={() => {
                    if (youtubeEmbedCode.includes('youtube.com/embed') || youtubeEmbedCode.includes('youtu.be')) {
                      setEditorContent(prev => prev + `\n${youtubeEmbedCode}\n`)
                      setYoutubeEmbedCode('')
                    } else {
                      alert('Código de YouTube no válido. Asegúrate de copiar el código iframe completo.')
                    }
                  }}
                  disabled={!youtubeEmbedCode}
                  className="mt-2 bg-red-500 hover:bg-red-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Video
                </Button>
              </div>

              {/* File Upload */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Upload className="w-4 h-4" />
                  Archivos (PDF, Código)
                  {saving && <span className="text-xs text-indigo-500 animate-pulse ml-2">Subiendo...</span>}
                </Label>
                <Input
                  type="file"
                  accept=".pdf,.js,.ts,.py,.html,.css,.txt"
                  disabled={saving}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    
                    setSaving(true)
                    try {
                      const formData = new FormData()
                      formData.append('file', file)
                      formData.append('tipo', file.type?.includes('pdf') ? 'pdf' : 'codigo')
                      
                      const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                      })
                      
                      if (!response.ok) {
                        throw new Error(`Error HTTP: ${response.status}`)
                      }
                      
                      const data = await response.json()
                      
                      if (data.url) {
                        setEditorContent(prev => prev + `\n📎 Archivo: ${file.name} - Enlace: ${data.url}\n`)
                      } else if (data.error) {
                        alert(`Error del servidor: ${data.error}`)
                      }
                    } catch (error) {
                      console.error('Error uploading file:', error)
                      alert('Falló la subida del archivo. Puede que el archivo sea demasiado grande (límite de 4MB en Vercel) o hubo un error de red.')
                    } finally {
                      setSaving(false)
                      e.target.value = ''
                    }
                  }}
                  className={darkMode ? 'bg-slate-800 border-slate-700' : ''}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Tamaño máximo recomendado: 4MB
                </p>
              </div>

              {/* Agregar Links */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Link className="w-4 h-4" />
                  Agregar Enlace (Link)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="Texto del enlace"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    className={darkMode ? 'bg-slate-800 border-slate-700' : ''}
                  />
                  <Input
                    placeholder="https://ejemplo.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className={darkMode ? 'bg-slate-800 border-slate-700' : ''}
                  />
                  <Button
                    onClick={addLinkToEditor}
                    disabled={!linkText || !linkUrl}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Link
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  El enlace aparecerá como un botón clickeable en la tarea
                </p>
              </div>
            </div>

            {/* Error Message */}
            {saveError && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                {saveError}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setTareaEditorOpen(false); clearEditor(); }} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={editingTarea ? handleUpdateTarea : handleCreateTarea}
                className="bg-gradient-to-r from-indigo-500 to-purple-500"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingTarea ? 'Guardar Cambios' : 'Crear Tarea'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Marquee Banner Editor Dialog */}
      <Dialog open={marqueeEditorOpen} onOpenChange={setMarqueeEditorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📢 Editar Banner de Anuncios
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div>
              <Label>Texto del Banner</Label>
              <Textarea
                value={marqueeTexto}
                onChange={(e) => setMarqueeTexto(e.target.value)}
                placeholder="Escribe el mensaje del banner..."
                className={`min-h-[100px] ${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
              />
            </div>
            
            <div>
              <Label>URL de Imagen (opcional)</Label>
              <Input
                value={marqueeImagenUrl}
                onChange={(e) => setMarqueeImagenUrl(e.target.value)}
                placeholder="/mexico-flag.png o URL de imagen"
                className={darkMode ? 'bg-slate-800 border-slate-700' : ''}
              />
              <p className="text-xs text-slate-500 mt-1">
                Puedes usar /mexico-flag.png para la bandera de México
              </p>
            </div>
            
            <div>
              <Label>Velocidad (segundos)</Label>
              <Select value={String(marqueeVelocidad)} onValueChange={(v) => setMarqueeVelocidad(Number(v))}>
                <SelectTrigger className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">Rápido (20s)</SelectItem>
                  <SelectItem value="30">Normal (30s)</SelectItem>
                  <SelectItem value="45">Lento (45s)</SelectItem>
                  <SelectItem value="60">Muy lento (60s)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Label className="text-sm mb-2 block">Vista previa:</Label>
              <div className="bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500 py-2 px-4 rounded overflow-hidden">
                <div className="flex items-center gap-2 text-white font-semibold text-sm whitespace-nowrap">
                  {marqueeImagenUrl && (
                    <img 
                      src={marqueeImagenUrl} 
                      alt="Preview" 
                      className="h-5 w-auto object-contain rounded"
                    />
                  )}
                  📢 {marqueeTexto || 'Texto del banner...'}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMarqueeEditorOpen(false)} disabled={marqueeSaving}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveMarquee}
                className="bg-gradient-to-r from-amber-500 to-orange-500"
                disabled={marqueeSaving || !marqueeTexto}
              >
                {marqueeSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Banner
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {!botOpen && activeSection === 'home' && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setBotOpen(true)}
            className="group fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2.5 text-left text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          >
            <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
              <Image
                src="/chatbot-character.png"
                alt="EDU"
                fill
                className="object-contain p-1.5"
              />
              <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20" />
            </span>
            <span className="pr-2">
              <span className="block text-[10px] uppercase tracking-[0.35em] text-slate-400">EDU</span>
              <span className="block text-sm font-medium text-slate-100">Abrir asistente</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {botOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="fixed inset-3 z-50 md:inset-auto md:right-6 md:bottom-6 md:h-[84vh] md:w-[440px] w-[calc(100vw-1.5rem)] h-[calc(100vh-1.5rem)]"
          >
            <div className="flex h-full flex-col overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/88 shadow-[0_32px_120px_rgba(0,0,0,0.75)] backdrop-blur-3xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[20px] border border-white/10 bg-white/5">
                    <Image
                      src="/chatbot-character.png"
                      alt="EDU"
                      fill
                      className="object-contain p-1.5"
                    />
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Asistente</p>
                    <h3 className="text-lg font-semibold text-white">EDU</h3>
                    <p className="text-xs text-slate-400">SEP, CONALITEG y tareas de 6to grado</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                    En línea
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setBotOpen(false)}
                    className="h-10 w-10 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center px-4 pt-3">
                <div className="h-1.5 w-16 rounded-full bg-white/15" />
              </div>

              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-4 pb-2">
                  {chatMessages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[86%] ${message.role === 'user' ? 'order-2' : ''}`}>
                        <div className={`rounded-[22px] px-4 py-3 text-sm leading-relaxed ${
                          message.role === 'user'
                            ? 'rounded-br-md border border-fuchsia-400/25 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-[0_12px_32px_rgba(139,92,246,0.25)]'
                            : 'rounded-bl-md border border-white/10 bg-white/6 text-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.25)]'
                        }`}>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3">
                        <div className="flex gap-2">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-pink-400" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t border-white/10 bg-slate-950/85 p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendChatMessage()
                  }}
                  className="flex items-end gap-2"
                >
                  <div className="flex-1">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Pregunta sobre matemáticas, historia, ciencias..."
                      className="h-12 rounded-2xl border-white/10 bg-white/6 text-slate-100 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-violet-400"
                      disabled={chatLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="h-12 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 shadow-[0_16px_40px_rgba(139,92,246,0.35)]"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>

                <div className="mt-3 flex flex-wrap gap-2">
                  {['¿Qué son las fracciones?', '¿Quién fue Miguel Hidalgo?', 'Explícame los ecosistemas', '¿Qué es la democracia?'].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setChatInput(suggestion)}
                      className="rounded-full border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/10 hover:text-white"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'} border-t mt-auto`}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <Image
                  src="/mascot-owl.png"
                  alt="UNIVERSO EDU"
                  fill
                  className="object-contain"
                />
              </div>
              <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                UNIVERSO EDU
              </span>
            </div>
            
            <div className="flex items-center gap-6">
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Hora CDMX: {currentTime}
              </span>
              <a 
                href="https://libros.conaliteg.gob.mx/primaria.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-sm text-purple-500 hover:text-purple-600`}
              >
                Libros CONALITEG
              </a>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                SEP Fase 5
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
