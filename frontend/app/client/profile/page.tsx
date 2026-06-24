'use client'

import React from 'react'
import { User, Mail, MapPin, Building2, Calendar, Shield, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CrescentStarLogo } from '@/components/illustrations/logos'
import { useAuthStore } from '@/stores/authStore'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  if (!user) return null

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-6 max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* Profile Header */}
        <Card className="relative overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-pk-green-900 to-pk-green-500" />
          <CardContent className="relative -mt-16 p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <div className="w-24 h-24 rounded-full bg-pk-green-500 border-4 border-white flex items-center justify-center shadow-lg">
                <span className="text-3xl font-heading font-bold text-white">
                  {user.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-heading font-bold">{user.name}</h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={logout} className="gap-2">
                <LogOut size={14} /> Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard icon={Mail} label="Email" value={user.email} />
          {user.city && <InfoCard icon={MapPin} label="City" value={user.city} />}
          <InfoCard icon={Shield} label="Role" value={user.role || 'User'} />
          <InfoCard icon={Building2} label="Account" value={user.industry || 'Content Creator'} />
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  if (!value) return null
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-pk-green-50 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-pk-green-500" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-sm font-medium truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
