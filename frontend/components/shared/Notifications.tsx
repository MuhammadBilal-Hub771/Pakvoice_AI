'use client'

import { CheckCircle, XCircle, Info, Loader2 } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  loading: Loader2,
}

const styles = {
  success: 'border-green-500 bg-green-50',
  error: 'border-red-500 bg-red-50',
  info: 'border-blue-500 bg-blue-50',
  loading: 'border-pk-green-500 bg-pk-green-50',
}

export function Notifications() {
  const notifications = useUIStore((s) => s.notifications)
  const removeNotification = useUIStore((s) => s.removeNotification)

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((notification) => {
        const Icon = icons[notification.type]
        return (
          <div
            key={notification.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm animate-fade-up',
              styles[notification.type]
            )}
            onClick={() => removeNotification(notification.id)}
          >
            <Icon
              className={cn(
                'h-5 w-5 mt-0.5 shrink-0',
                notification.type === 'success' && 'text-green-600',
                notification.type === 'error' && 'text-red-600',
                notification.type === 'info' && 'text-blue-600',
                notification.type === 'loading' && 'text-pk-green-600 animate-spin'
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{notification.title}</p>
              {notification.message && (
                <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
