import type {
  ContentFormData,
  GeneratedContent,
  Document,
  AdminStats,
  User,
  HistoryFilters,
} from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('pakvoice-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Zustand persist wraps state in { state: {...}, version: N }
    if (parsed.state?.token) return parsed.state.token
    // Support old format: direct { token: '...' }
    if (parsed.token) return parsed.token
    return null
  } catch {
    return null
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken()

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Auto-clear auth on 401 or 403 (expired/invalid/missing token)
  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pakvoice-auth')
      // Also clear the auth cookie used by middleware
      document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Lax'
      // Redirect to login page
      window.location.href = '/login'
    }
    const error = await response.json().catch(() => ({ detail: 'Not authenticated' }))
    const msg = response.status === 403
      ? (error.detail || 'Session expired. Please login again.')
      : (error.detail || 'Invalid or expired token. Please login again.')
    throw new ApiError(msg, response.status)
  }

  if (!response.ok) {
    let errorMsg = 'Request failed'
    try {
      const error = await response.json()
      if (response.status === 422 && error.errors && error.errors.length > 0) {
        errorMsg = error.errors.map((e: any) => e.msg || e.message).join('; ')
      } else if (error.detail) {
        if (Array.isArray(error.detail)) {
          errorMsg = error.detail.map((d: any) => d.msg || d.message || String(d)).join('; ')
        } else {
          errorMsg = error.detail
        }
      } else if (error.message) {
        errorMsg = error.message
      }
    } catch {
      errorMsg = `HTTP ${response.status}: ${response.statusText}`
    }
    throw new ApiError(errorMsg, response.status)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

// ============================================================
// FIELD MAPPERS: Convert between frontend camelCase ↔ backend snake_case
// ============================================================

function mapUserFromBackend(u: any): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === 'client' ? 'client' : 'admin',
    city: u.city || '',
    industry: u.industry || '',
    status: u.is_active === false ? 'suspended' : 'active',
    createdAt: u.created_at || u.createdAt,
    lastActive: u.updated_at || u.lastActive,
    totalGenerations: u.total_generations || 0,
  }
}

function mapContentFromBackend(c: any): GeneratedContent {
  return {
    id: c.content_id || c.id,
    title: c.business_name || c.title || '',
    content: c.generated_content || c.content || '',
    contentType: c.content_type || '',
    industry: c.industry || '',
    city: c.city || '',
    language: c.language || 'english',
    tone: c.tone || 'Professional',
    userId: c.user_id || c.userId || '',
    userName: c.user_name || c.userName || '',
    createdAt: c.timestamp || c.created_at || c.createdAt || '',
    saved: c.is_saved || c.saved || false,
    copied: false,
    sources: (c.sources_used || c.sources || []).map((s: any) => ({
      docId: s.doc_id || s.docId || '',
      docName: s.title || s.docName || '',
      relevance: s.score || s.relevance || 0,
    })),
  }
}

function mapDocumentFromBackend(d: any): Document {
  return {
    id: d.doc_id || d.id,
    title: d.title || '',
    category: d.category || 'general',
    fileName: d.filename || d.fileName || '',
    fileType: (d.filename || d.fileName || '').endsWith('.pdf')
      ? 'pdf'
      : (d.filename || d.fileName || '').endsWith('.docx')
      ? 'docx'
      : (d.filename || d.fileName || '').endsWith('.md')
      ? 'md'
      : 'txt',
    fileSize: d.file_size_bytes || d.fileSize || 0,
    wordCount: d.word_count || d.wordCount || 0,
    uploadDate: d.created_at || d.uploadDate || '',
    tags: d.tags || [],
    userId: d.uploaded_by || d.userId || '',
  }
}

const CONTENT_TYPE_MAP: Record<string, string> = {
  'Social Media Post': 'social_media',
  'Blog Article': 'blog_article',
  'Product Description': 'product_description',
  'Email Marketing': 'email_marketing',
  'Press Release': 'press_release',
  'Website Content': 'website_content',
  'Advertisement Copy': 'advertisement_copy',
}

const INDUSTRY_MAP: Record<string, string> = {
  'Textile': 'textile',
  'IT & Software': 'it_software',
  'Agriculture': 'agriculture',
  'Manufacturing': 'manufacturing',
  'E-Commerce': 'ecommerce',
  'Retail': 'ecommerce',
  'Real Estate': 'real_estate',
  'Food & Beverage': 'food_beverage',
  'Healthcare': 'healthcare',
  'Education': 'education',
  'Logistics': 'logistics',
  'Construction': 'manufacturing',
  'Transportation': 'logistics',
  'Banking & Finance': 'it_software',
}

const CITY_MAP: Record<string, string> = {
  'Karachi': 'karachi',
  'Lahore': 'lahore',
  'Islamabad': 'islamabad',
  'Rawalpindi': 'rawalpindi',
  'Peshawar': 'peshawar',
  'Quetta': 'quetta',
  'Faisalabad': 'faisalabad',
  'Multan': 'multan',
  'Sialkot': 'sialkot',
  'Gujranwala': 'gujranwala',
  'Hyderabad': 'karachi',
}

const TONE_MAP: Record<string, string> = {
  'Professional': 'professional',
  'Casual': 'casual',
  'Persuasive': 'persuasive',
  'Informative': 'informative',
  'Friendly': 'friendly',
}

function mapContentFormToBackend(data: ContentFormData): Record<string, any> {
  return {
    business_name: data.businessName,
    business_description: data.businessDescription,
    content_type: CONTENT_TYPE_MAP[data.contentType] || data.contentType.toLowerCase().replace(/\s+/g, '_'),
    industry: INDUSTRY_MAP[data.industry] || data.industry.toLowerCase().replace(/[&\s]+/g, '_'),
    city: CITY_MAP[data.city] || data.city.toLowerCase().replace(/\s+/g, '_'),
    language: data.language === 'roman-urdu' ? 'roman_urdu' : data.language,
    tone: TONE_MAP[data.tone] || data.tone.toLowerCase(),
    content_length: data.contentLength || 'medium',
    key_message: data.keyMessage,
    target_audience: data.targetAudience,
    use_knowledge_base: data.useKnowledgeBase,
    selected_doc_ids: data.selectedDocs,
  }
}

// ============================================================
// API METHODS
// ============================================================

// Auth
export const authApi = {
  login: (email: string, password: string, role: 'client' | 'admin' = 'client') =>
    fetchApi<{ access_token: string; user: any; expires_in: number }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    }).then((res) => ({
      token: res.access_token,
      user: mapUserFromBackend(res.user),
    })),

  register: (data: { name: string; email: string; password: string; city?: string; industry?: string }) =>
    fetchApi<{ access_token: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        city: data.city || 'Karachi',
        industry: data.industry || '',
        role: 'client',
      }),
    }).then((res) => ({
      token: res.access_token,
      user: mapUserFromBackend(res.user),
    })),

  me: () =>
    fetchApi<{ id: string; name: string; email: string; role: string; city: string }>(
      '/api/auth/me'
    ).then((res) => mapUserFromBackend(res)),

  logout: () => fetchApi<void>('/api/auth/logout', { method: 'POST' }),
}

// Generate
export const generateApi = {
  generate: (data: ContentFormData) =>
    fetchApi<any>('/api/generate/content', {
      method: 'POST',
      body: JSON.stringify(mapContentFormToBackend(data)),
    }).then((res) => mapContentFromBackend(res)),

  /** Stream content as it's generated — returns a ReadableStream for real-time display */
  generateStream: async (data: ContentFormData): Promise<{ stream: ReadableStream<Uint8Array>; contentId: string }> => {
    const token = getAuthToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${BASE_URL}/api/generate/content/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mapContentFormToBackend(data)),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Stream failed' }))
      throw new ApiError(error.detail || 'Stream generation failed', response.status)
    }

    // Read backend content_id from response header
    const contentId = response.headers.get('X-Content-ID') || `stream_${Date.now()}`

    if (!response.body) {
      throw new ApiError('No response body from stream', 500)
    }

    return { stream: response.body, contentId }
  },

  refine: (contentId: string, prompt: string) => {
    // Get the current generated content from localStorage store
    let originalContent = ''
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('pakvoice-generate')
        if (raw) {
          const parsed = JSON.parse(raw)
          originalContent = parsed?.state?.generatedContent?.content || ''
        }
      } catch {}
    }
    return fetchApi<any>('/api/generate/refine', {
      method: 'POST',
      body: JSON.stringify({
        content_id: contentId,
        original_content: originalContent || 'Content to refine',
        refinement_instruction: prompt,
      }),
    }).then((res) => mapContentFromBackend(res))
  },
}

// History
export const historyApi = {
  list: (filters?: HistoryFilters) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value))
      })
    }
    return fetchApi<{ items: any[]; total: number }>(
      `/api/history?${params.toString()}`
    ).then((res) => ({
      items: (res.items || []).map(mapContentFromBackend),
      total: res.total || 0,
    }))
  },

  get: (id: string) =>
    fetchApi<any>(`/api/history/${id}`).then(mapContentFromBackend),

  delete: (id: string) =>
    fetchApi<void>(`/api/history/${id}`, { method: 'DELETE' }),

  save: (id: string) =>
    fetchApi<void>(`/api/history/${id}/save`, { method: 'POST' }),
}

// Documents
export const documentsApi = {
  list: () =>
    fetchApi<any[]>('/api/documents/').then((res) =>
      (res || []).map(mapDocumentFromBackend)
    ),

  upload: async (file: File, meta: { title: string; category: string; tags: string[] }) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', meta.title)
    formData.append('category', meta.category)
    formData.append('tags', meta.tags.join(','))

    const token = getAuthToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      throw new ApiError(error.detail || error.message, response.status)
    }

    return response.json().then((res) => mapDocumentFromBackend(res))
  },

  delete: (id: string) =>
    fetchApi<void>(`/api/documents/${id}`, { method: 'DELETE' }),
}

// Admin
export const adminApi = {
  getStats: () =>
    fetchApi<any>('/api/admin/stats').then((res) => ({
      totalUsers: res.total_users || 0,
      kbDocuments: res.documents_in_kb || 0,
      apiCalls: res.total_generations || 0,
      apiLimit: 1000,
      contentToday: 0,
      activeSessions: res.active_users || 0,
      usersTrend: 0,
      contentTrend: 0,
    } as AdminStats)),

  getUsers: (filters?: Record<string, string>) => {
    const params = new URLSearchParams(filters || {})
    return fetchApi<any[]>(`/api/admin/users?${params.toString()}`).then((res) => ({
      users: (res || []).map(mapUserFromBackend),
      total: (res || []).length,
    }))
  },

  updateUser: (userId: string, data: Partial<User>) =>
    fetchApi<any>(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_active: data.status === 'active',
        city: data.city,
      }),
    }).then(() => data as User),

  deleteUser: (userId: string) =>
    fetchApi<void>(`/api/admin/users/${userId}`, { method: 'DELETE' }),

  getContent: (filters?: Record<string, string>) => {
    const params = new URLSearchParams(filters || {})
    return fetchApi<{ items: any[]; total: number }>(
      `/api/admin/content?${params.toString()}`
    ).then((res) => ({
      items: (res.items || []).map(mapContentFromBackend),
      total: res.total || 0,
    }))
  },

  flagContent: (contentId: string, flagged: boolean) =>
    fetchApi<void>(`/api/admin/content/${contentId}/flag`, {
      method: 'PATCH',
      body: JSON.stringify({ is_flagged: flagged }),
    }),

  deleteContent: (contentId: string) =>
    fetchApi<void>(`/api/admin/content/${contentId}`, { method: 'DELETE' }),

  getTrends: () =>
    fetchApi<any>('/api/admin/analytics').then((res) => {
      const data = res.industry_distribution || {}
      return Object.entries(data).map(([industry, count]) => ({
        date: '',
        count: count as number,
        type: industry,
      }))
    }),

  getCityStats: () =>
    fetchApi<any>('/api/admin/analytics').then((res) => {
      const data = res.city_distribution || {}
      const total = Object.values(data).reduce((a: number, b: any) => a + b, 0) || 1
      return Object.entries(data).map(([city, count]) => ({
        city,
        count: count as number,
        percentage: Math.round(((count as number) / total) * 100),
      }))
    }),

  getIndustryStats: () =>
    fetchApi<any>('/api/admin/analytics').then((res) => {
      const data = res.industry_distribution || {}
      const total = Object.values(data).reduce((a: number, b: any) => a + b, 0) || 1
      return Object.entries(data).map(([industry, count]) => ({
        industry,
        count: count as number,
        percentage: Math.round(((count as number) / total) * 100),
      }))
    }),

  getLanguageStats: () =>
    fetchApi<any>('/api/admin/analytics').then((res) => {
      const data = res.language_distribution || {}
      return Object.entries(data).map(([language, count]) => ({
        language,
        count: count as number,
        percentage: 0,
      }))
    }),

  getApiUsage: () =>
    fetchApi<any>('/api/admin/api-usage').then((res) => {
      const usage = res.daily_usage || {}
      return Object.entries(usage).map(([date, data]: [string, any]) => ({
        date,
        calls: data.count || 0,
        limit: 1000,
      }))
    }),
}
