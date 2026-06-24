'use client'

import React, { useState } from 'react'
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Copy,
  ToggleRight,
  ToggleLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const initialProviders = [
  { id: 'google', name: 'Google AI (Gemini)', key: 'AIza**********************', enabled: true, color: '#4285F4' },
  { id: 'openai', name: 'OpenAI (GPT-4)', key: 'sk-************************', enabled: false, color: '#10a37f' },
  { id: 'anthropic', name: 'Anthropic (Claude)', key: 'sk-ant-*******************', enabled: false, color: '#d97706' },
  { id: 'meta', name: 'Meta AI (Llama)', key: '', enabled: false, color: '#2563eb' },
]

export default function AdminApiKeysPage() {
  const [providers, setProviders] = useState(initialProviders)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  const toggleVisibility = (id: string) => setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage third-party AI provider API keys</p>
        </div>
        <Button variant="outline" className="gap-2">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Key size={16} style={{ color: provider.color }} />
                {provider.name}
              </CardTitle>
              <button
                onClick={() => setProviders((prev) => prev.map((p) => p.id === provider.id ? { ...p, enabled: !p.enabled } : p))}
                className={`text-${provider.enabled ? 'pk-green-500' : 'muted-foreground'}`}
              >
                {provider.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block">API Key</label>
                <div className="relative">
                  <Input
                    type={showKeys[provider.id] ? 'text' : 'password'}
                    value={provider.key}
                    onChange={(e) => setProviders((prev) => prev.map((p) => p.id === provider.id ? { ...p, key: e.target.value } : p))}
                    placeholder="Enter API key..."
                    className="pr-16 text-sm font-mono"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={() => toggleVisibility(provider.id)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                    >
                      {showKeys[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(provider.key)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  {provider.enabled ? (
                    <CheckCircle size={12} className="text-green-600" />
                  ) : (
                    <XCircle size={12} className="text-muted-foreground" />
                  )}
                  <span className={provider.enabled ? 'text-green-600' : 'text-muted-foreground'}>
                    {provider.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                {provider.key && (
                  <span className="text-muted-foreground">· Last used: Today</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Custom Provider */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <Button variant="outline" className="w-full gap-2 py-8">
            <Plus size={16} /> Add Custom Provider
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
