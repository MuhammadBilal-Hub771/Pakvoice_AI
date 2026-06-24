import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(cleanContent(text))
}

export function cleanContent(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/^---+$/gm, '')
    .replace(/^- /gm, '')
    .replace(/`(.*?)`/g, '$1')
    .trim()
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function getCityColor(city: string): string {
  const colors: Record<string, string> = {
    Karachi: '#16a34a',
    Lahore: '#d4af37',
    Islamabad: '#f97316',
    Peshawar: '#0c4d2f',
    Quetta: '#86efac',
    Faisalabad: '#166534',
    Multan: '#dcfce7',
    Rawalpindi: '#a855f7',
    Hyderabad: '#06b6d4',
    'Gujranwala': '#eab308',
  }
  return colors[city] || '#16a34a'
}

export function getContentTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'Social Media Post': '#16a34a',
    'Blog Article': '#d4af37',
    'Product Description': '#f97316',
    'Email Marketing': '#0c4d2f',
    'Press Release': '#a855f7',
    'Website Content': '#06b6d4',
    'Advertisement Copy': '#eab308',
  }
  return colors[type] || '#16a34a'
}

export function getIndustryIcon(industry: string): string {
  const icons: Record<string, string> = {
    Textile: '🧵',
    'IT & Software': '💻',
    Agriculture: '🌾',
    Healthcare: '🏥',
    Education: '📚',
    Retail: '🛍️',
    Manufacturing: '🏭',
    'Food & Beverage': '🍽️',
    Construction: '🏗️',
    Transportation: '🚚',
    'Banking & Finance': '🏦',
    'Real Estate': '🏠',
  }
  return icons[industry] || '📋'
}

export function getUrduText(key: string): string {
  const translations: Record<string, string> = {
    'no_content_yet': 'ابھی کوئی مواد نہیں',
    'generate': 'بنائیں',
    'save': 'محفوظ کریں',
    'loading': 'لوڈ ہو رہا ہے',
    'success': 'کامیاب',
    'error': 'غلطی',
  }
  return translations[key] || key
}
