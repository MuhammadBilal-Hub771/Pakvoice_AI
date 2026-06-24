'use client'

import React from 'react'
import { Bell, Shield, Globe, Palette, Mail, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const settingsSections = [
  {
    title: 'Notifications',
    icon: Bell,
    fields: [
      { label: 'Email Alerts', type: 'toggle', enabled: true },
      { label: 'Push Notifications', type: 'toggle', enabled: false },
      { label: 'Content Approval Requests', type: 'toggle', enabled: true },
      { label: 'Weekly Summary', type: 'toggle', enabled: false },
    ],
  },
  {
    title: 'Security',
    icon: Shield,
    fields: [
      { label: 'Two-Factor Authentication', type: 'toggle', enabled: false },
      { label: 'Session Timeout', type: 'select', options: ['30 min', '1 hour', '4 hours', '8 hours'], value: '1 hour' },
      { label: 'API Key Rotation', type: 'toggle', enabled: true },
    ],
  },
  {
    title: 'Localization',
    icon: Globe,
    fields: [
      { label: 'Default Language', type: 'select', options: ['English', 'Urdu', 'Roman Urdu'], value: 'English' },
      { label: 'Currency', type: 'select', options: ['PKR', 'USD'], value: 'PKR' },
    ],
  },
  {
    title: 'Appearance',
    icon: Palette,
    fields: [
      { label: 'Theme', type: 'select', options: ['Green', 'Red', 'Blue'], value: 'Green' },
      { label: 'Compact Mode', type: 'toggle', enabled: false },
    ],
  },
  {
    title: 'SMTP Settings',
    icon: Mail,
    fields: [
      { label: 'SMTP Host', type: 'text', value: 'smtp.gmail.com' },
      { label: 'SMTP Username', type: 'text', value: 'noreply@contentpk.ai' },
      { label: 'Encryption', type: 'select', options: ['TLS', 'SSL', 'None'], value: 'TLS' },
    ],
  },
]

export default function AdminSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage application preferences</p>
        </div>
        <Button className="gap-2">
          <Save size={14} /> Save All
        </Button>
      </div>

      {settingsSections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <section.icon size={16} className="text-pk-green-500" />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.fields.map((field) => (
              <div key={field.label} className="flex items-center justify-between">
                <label className="text-sm">{field.label}</label>
                {'type' in field && field.type === 'toggle' ? (
                  <button
                    className={`w-10 h-5 rounded-full transition-colors ${
                      ('enabled' in field && field.enabled) ? 'bg-pk-green-500' : 'bg-muted'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      ('enabled' in field && field.enabled) ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                ) : 'type' in field && field.type === 'select' ? (
                  <select className="text-sm border rounded-md px-2 py-1 bg-transparent">
                    {'options' in field && field.options?.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    defaultValue={'value' in field ? field.value : ''}
                    className="w-48 h-8 text-sm"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
