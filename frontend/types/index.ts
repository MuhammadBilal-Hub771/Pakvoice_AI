export interface User {
  id: string
  name: string
  email: string
  role: 'client' | 'admin'
  avatar?: string
  city?: string
  industry?: string
  plan?: 'free' | 'pro' | 'enterprise'
  status?: 'active' | 'suspended' | 'pending'
  credits?: number
  createdAt?: string
  lastActive?: string
  totalGenerations?: number
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export interface ContentFormData {
  contentType: string
  businessName: string
  businessDescription: string
  keyMessage: string
  industry: string
  city: string
  targetAudience: string
  language: 'english' | 'urdu' | 'roman-urdu'
  tone: string
  contentLength: 'short' | 'medium' | 'long'
  useKnowledgeBase: boolean
  selectedDocs: string[]
}

export type ContentType =
  | 'Social Media Post'
  | 'Blog Article'
  | 'Product Description'
  | 'Email Marketing'
  | 'Press Release'
  | 'Website Content'
  | 'Advertisement Copy'

export type Industry =
  | 'Textile'
  | 'IT & Software'
  | 'Agriculture'
  | 'Healthcare'
  | 'Education'
  | 'Retail'
  | 'Manufacturing'
  | 'Food & Beverage'
  | 'Construction'
  | 'Transportation'
  | 'Banking & Finance'
  | 'Real Estate'

export type Tone = 'Professional' | 'Casual' | 'Persuasive' | 'Informative' | 'Friendly'

export type Language = 'english' | 'urdu' | 'roman-urdu'

export type ContentLength = 'short' | 'medium' | 'long'

export interface GeneratedContent {
  id: string
  title: string
  content: string
  contentType: ContentType
  industry: Industry
  city: string
  language: Language
  tone: Tone
  userId: string
  userName?: string
  createdAt: string
  saved: boolean
  copied: boolean
  sources?: KnowledgeSource[]
}

export interface KnowledgeSource {
  docId: string
  docName: string
  relevance: number
}

export interface Document {
  id: string
  title: string
  category: string
  fileName: string
  fileType: 'pdf' | 'docx' | 'txt' | 'md'
  fileSize: number
  wordCount: number
  uploadDate: string
  tags: string[]
  userId: string
}

export interface AdminStats {
  totalUsers: number
  contentToday: number
  apiCalls: number
  apiLimit: number
  activeSessions: number
  kbDocuments: number
  usersTrend: number
  contentTrend: number
}

export interface ContentTrend {
  date: string
  count: number
  type: string
}

export interface CityStats {
  city: string
  count: number
  percentage: number
}

export interface IndustryStats {
  industry: string
  count: number
  percentage: number
}

export interface LanguageStats {
  language: string
  count: number
  percentage: number
}

export interface ApiUsageData {
  date: string
  calls: number
  limit: number
}

export interface RecentActivity {
  id: string
  userId: string
  userName: string
  action: string
  contentType: string
  city: string
  timestamp: string
  userInitial: string
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'loading'
  title: string
  message?: string
  duration?: number
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface HistoryFilters {
  search?: string
  contentType?: ContentType | ''
  language?: Language | ''
  city?: string
  industry?: Industry | ''
  dateFrom?: string
  dateTo?: string
  sortBy?: 'newest' | 'oldest' | 'most-copied'
}
