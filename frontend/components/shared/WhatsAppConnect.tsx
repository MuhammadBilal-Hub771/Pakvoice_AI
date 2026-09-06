'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, MessageCircle, RefreshCw, Unlink } from 'lucide-react'
import { whatsappApi, type WhatsAppLinkCode } from '@/lib/api'

interface WhatsAppConnectProps {
  onStatusChange?: (linked: boolean, phone: string | null) => void
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #f3f4f6',
  borderRadius: 12,
  padding: 20,
  background: 'white',
}

const buttonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
}

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function WhatsAppConnect({ onStatusChange }: WhatsAppConnectProps) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [linked, setLinked] = useState(false)
  const [phone, setPhone] = useState<string | null>(null)
  const [botConfigured, setBotConfigured] = useState(true)
  const [botNumber, setBotNumber] = useState<string | null>(null)
  const [linkCode, setLinkCode] = useState<WhatsAppLinkCode | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const status = await whatsappApi.status()
      setLinked(status.linked)
      setPhone(status.phone ?? null)
      setBotConfigured(status.bot_configured ?? true)
      setBotNumber(status.bot_display_number ?? null)
      onStatusChange?.(status.linked, status.phone ?? null)
      if (status.linked) setLinkCode(null)
    } catch (err: any) {
      setError(err?.message || 'Could not load WhatsApp status')
    } finally {
      setLoading(false)
    }
  }, [onStatusChange])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    if (!linkCode) return

    const expiresAt = new Date(linkCode.expires_at).getTime()

    const tick = setInterval(() => {
      const left = expiresAt - Date.now()
      setRemainingMs(left)
      if (left <= 0) {
        setLinkCode(null)
      }
    }, 1000)

    const poll = setInterval(() => {
      void refreshStatus()
    }, 5000)

    return () => {
      clearInterval(tick)
      clearInterval(poll)
    }
  }, [linkCode, refreshStatus])

  const requestCode = async () => {
    setBusy(true)
    setError(null)
    try {
      const code = await whatsappApi.requestCode()
      setLinkCode(code)
      setRemainingMs(new Date(code.expires_at).getTime() - Date.now())
    } catch (err: any) {
      setError(err?.message || 'Could not generate a code')
    } finally {
      setBusy(false)
    }
  }

  const unlink = async () => {
    setBusy(true)
    setError(null)
    try {
      await whatsappApi.unlink()
      setLinked(false)
      setPhone(null)
      setLinkCode(null)
      onStatusChange?.(false, null)
    } catch (err: any) {
      setError(err?.message || 'Could not disconnect')
    } finally {
      setBusy(false)
    }
  }

  const copyCode = async () => {
    if (!linkCode) return
    try {
      await navigator.clipboard.writeText(linkCode.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy the code')
    }
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: '#ecfdf5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <MessageCircle size={18} color="#22c55e" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>WhatsApp</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            {linked
              ? `Connected${phone ? ` to +${phone}` : ''}`
              : 'Generate content by sending a message or voice note'}
          </div>
        </div>
        {loading && <Loader2 size={16} className="animate-spin" color="#9ca3af" />}
      </div>

      {!loading && !botConfigured && (
        <div
          style={{
            fontSize: 13,
            color: '#92400e',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 12,
          }}
        >
          WhatsApp bot is not configured on the server yet. Ask your admin to set
          WHATSAPP_* keys and the Meta webhook.
        </div>
      )}

      {!loading && linked && (
        <button
          onClick={unlink}
          disabled={busy}
          style={{
            ...buttonStyle,
            background: 'white',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Unlink size={14} /> {busy ? 'Disconnecting...' : 'Disconnect'}
        </button>
      )}

      {!loading && !linked && !linkCode && (
        <button
          onClick={requestCode}
          disabled={busy || !botConfigured}
          style={{
            ...buttonStyle,
            background: '#22c55e',
            color: 'white',
            border: 'none',
            cursor: busy || !botConfigured ? 'not-allowed' : 'pointer',
            opacity: busy || !botConfigured ? 0.7 : 1,
          }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
          {busy ? 'Generating...' : 'Connect WhatsApp'}
        </button>
      )}

      {linkCode && (
        <div
          style={{
            border: '1px dashed #a7f3d0',
            background: '#f0fdf4',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
            {linkCode.whatsapp_number || botNumber ? (
              <>
                Send this code to{' '}
                <strong>{linkCode.whatsapp_number || botNumber}</strong> on
                WhatsApp (only the 6 digits).
              </>
            ) : (
              'Send this code to our WhatsApp number.'
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '0.25em',
                color: '#065f46',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {linkCode.code}
            </span>
            <button
              onClick={copyCode}
              style={{
                ...buttonStyle,
                padding: '6px 12px',
                background: 'white',
                color: '#374151',
                border: '1px solid #e5e7eb',
              }}
            >
              {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {linkCode.wa_link && (
              <a
                href={linkCode.wa_link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...buttonStyle,
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={14} /> Open WhatsApp
              </a>
            )}
            <button
              onClick={requestCode}
              disabled={busy}
              style={{
                ...buttonStyle,
                background: 'white',
                color: '#374151',
                border: '1px solid #e5e7eb',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.7 : 1,
              }}
            >
              <RefreshCw size={14} /> New code
            </button>
          </div>

          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 10 }}>
            Expires in {formatCountdown(remainingMs)}. This page updates on its own once
            you send it. Webhook (ngrok) must be connected for the bot to reply.
          </div>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: '#dc2626', marginTop: 10 }}>{error}</div>
      )}
    </div>
  )
}
