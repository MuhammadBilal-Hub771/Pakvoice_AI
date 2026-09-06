'use client'

import React, { useState } from 'react'
import { Mail, MapPin, Building2, Shield, LogOut, Edit2, Save, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Toast } from '@/components/shared/Toast'
import { WhatsAppConnect } from '@/components/shared/WhatsAppConnect'
import { PageShell } from '@/components/shared/PageHeader'

const cardStyle: React.CSSProperties = {
  border: '1px solid #f3f4f6',
  borderRadius: '12px',
  padding: '16px',
  background: 'white',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}

const iconBoxStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 8,
  background: '#ecfdf5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#9ca3af',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: 2,
}

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: '#111827',
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 14,
  fontWeight: 500,
  color: '#111827',
  width: '100%',
  outline: 'none',
  background: 'white',
}

const headerInputStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#111827',
  outline: 'none',
  background: 'white',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 16,
  marginTop: 24,
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const updateUser = useAuthStore((s) => s.updateUser)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', city: '', industry: '' })
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000)
  }

  if (!user) return null

  const startEditing = () => {
    setForm({
      name: user.name || '',
      city: user.city || '',
      industry: user.industry || '',
    })
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
  }

  const saveProfile = async () => {
    if (!form.name.trim()) {
      showToast('Name is required', 'error')
      return
    }
    setSaving(true)
    try {
      const token = useAuthStore.getState().token
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim() || null,
          industry: form.industry.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to update profile' }))
        throw new Error(err.detail || 'Failed to update profile')
      }
      const updated = await res.json()
      updateUser({
        name: updated.name,
        city: updated.city,
        industry: updated.industry,
      })
      showToast('Profile updated successfully', 'success')
      setEditing(false)
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell narrow>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      {/* WhatsApp — top so it is visible without scrolling */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 11,
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          Connected Channels
        </h2>
        <WhatsAppConnect
          onStatusChange={(linked, phone) =>
            updateUser({ whatsappPhone: linked ? phone : null })
          }
        />
      </div>

      {/* Profile Header */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-pk-green-800 to-pk-green-600" />
        <div
          style={{
            position: 'relative',
            marginTop: -64,
            padding: 24,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 16,
            justifyContent: 'center',
          }}
          className="sm:justify-start"
        >
          {/* Avatar */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: '#22c55e',
              border: '4px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 700, color: 'white', fontFamily: 'var(--font-heading)' }}>
              {user.name?.charAt(0) || 'U'}
            </span>
          </div>

          {/* Name + Email */}
          <div style={{ flex: 1, minWidth: 200, textAlign: 'left' }} className="text-center sm:text-left">
            {editing ? (
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                style={headerInputStyle}
              />
            ) : (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, fontFamily: 'var(--font-heading)' }}>
                  {user.name}
                </h1>
                <p style={{ fontSize: 14, color: '#9ca3af', margin: '4px 0 0 0' }}>{user.email}</p>
              </>
            )}
          </div>

          {/* Buttons — single set, wraps on mobile via parent flex-wrap */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {editing ? (
              <>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: 'white',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  <X size={14} /> Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEditing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: 'white',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Edit2 size={14} /> Edit Profile
                </button>
                <button
                  onClick={logout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: 'white',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 1: Email | City | Role — same grid in both modes */}
      <div style={gridStyle}>
        {/* Email — always read-only */}
        <div style={cardStyle}>
          <div style={iconBoxStyle}>
            <Mail size={18} color="#22c55e" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={labelStyle}>Email</div>
            <div style={{ ...valueStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {user.email}
            </div>
          </div>
        </div>

        {/* City — editable in edit mode */}
        <div style={cardStyle}>
          <div style={iconBoxStyle}>
            <MapPin size={18} color="#22c55e" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={labelStyle}>City</div>
            {editing ? (
              <input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="e.g. Lahore"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#22c55e')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
            ) : (
              <div style={valueStyle}>{user.city || '—'}</div>
            )}
          </div>
        </div>

        {/* Role — always read-only */}
        <div style={cardStyle}>
          <div style={iconBoxStyle}>
            <Shield size={18} color="#22c55e" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={labelStyle}>Role</div>
            <div style={valueStyle}>{user.role === 'admin' ? 'Administrator' : 'Client'}</div>
          </div>
        </div>
      </div>

      {/* Row 2: Industry */}
      <div style={{ ...gridStyle, marginTop: 16 }}>
        <div style={cardStyle}>
          <div style={iconBoxStyle}>
            <Building2 size={18} color="#22c55e" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={labelStyle}>Industry</div>
            {editing ? (
              <input
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                placeholder="e.g. Textile"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#22c55e')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
            ) : (
              <div style={valueStyle}>{user.industry || 'Content Creator'}</div>
            )}
          </div>
        </div>
      </div>

    </PageShell>
  )
}
