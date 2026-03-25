const DEFAULT_ADMIN_PASSWORD = 'Mesn800913'
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD

export const createAdminToken = () =>
  Buffer.from(`${Date.now()}:${ADMIN_PASSWORD}`).toString('base64')

export const isValidAdminToken = (token: string | null | undefined) => {
  if (!token || typeof token !== 'string') return false

  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const [timestamp, password] = decoded.split(':')

    if (!timestamp || !password) return false

    const tokenTime = Number.parseInt(timestamp, 10)
    if (!Number.isFinite(tokenTime)) return false

    const tokenAge = Date.now() - tokenTime
    return password === ADMIN_PASSWORD && tokenAge >= 0 && tokenAge < TOKEN_MAX_AGE_MS
  } catch {
    return false
  }
}

export const isValidAdminAuthHeader = (authHeader: string | null) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false

  const token = authHeader.slice('Bearer '.length).trim()
  return isValidAdminToken(token)
}
