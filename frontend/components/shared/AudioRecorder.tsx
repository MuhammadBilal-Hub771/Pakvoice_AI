'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sttApi, type SttLanguage } from '@/lib/api'

interface AudioRecorderProps {
  onTranscript: (text: string) => void
  language?: SttLanguage
  disabled?: boolean
  className?: string
}

type RecorderStatus = 'idle' | 'recording' | 'transcribing'

const LANGUAGE_OPTIONS: { value: SttLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو' },
  { value: 'roman-urdu', label: 'Roman Urdu' },
]

const MAX_RECORD_MS = 60_000

export function AudioRecorder({
  onTranscript,
  language = 'en',
  disabled = false,
  className,
}: AudioRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [selectedLanguage, setSelectedLanguage] = useState<SttLanguage>(language)
  const [error, setError] = useState<string | null>(null)
  const [maxTimeReached, setMaxTimeReached] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recorderMimeTypeRef = useRef<string>('audio/webm')
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep latest values in refs so the onstop handler never reads stale closures.
  const onTranscriptRef = useRef(onTranscript)
  const languageRef = useRef(selectedLanguage)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    languageRef.current = selectedLanguage
  }, [selectedLanguage])

  const showError = useCallback((message: string, autoClearMs?: number) => {
    setError(message)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    if (autoClearMs) {
      errorTimerRef.current = setTimeout(() => setError(null), autoClearMs)
    }
  }, [])

  const handleMicError = useCallback(
    (err: any) => {
      const name = err?.name || ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        showError('Microphone access denied. Please allow microphone permissions.')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        showError('No microphone found on this device.')
      } else {
        showError('Could not access the microphone. Please try again.')
      }
    },
    [showError]
  )

  const stopVisualizer = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
  }, [])

  const cleanup = useCallback(() => {
    stopVisualizer()
    stopTracks()
    if (autoStopTimerRef.current !== null) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }
  }, [stopVisualizer, stopTracks])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
      if (errorTimerRef.current !== null) clearTimeout(errorTimerRef.current)
    }
  }, [cleanup])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)

    ctx.clearRect(0, 0, width, height)

    const barCount = 32
    const gap = 2
    const barWidth = (width - gap * (barCount - 1)) / barCount
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 180)
    let activeIndex = 0
    let activeValue = 0

    // Find the loudest frequency band to apply the pulse highlight.
    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor((i / barCount) * bufferLength * 0.75)
      const value = dataArray[idx] / 255
      if (value > activeValue) {
        activeValue = value
        activeIndex = i
      }
    }

    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor((i / barCount) * bufferLength * 0.75)
      const value = dataArray[idx] / 255
      const barHeight = Math.max(2, value * (height - 4))
      const x = i * (barWidth + gap)

      ctx.globalAlpha = i === activeIndex ? pulse : 0.85
      ctx.fillStyle = '#16a34a'
      ctx.fillRect(x, height - barHeight, barWidth, barHeight)
    }

    ctx.globalAlpha = 1
    animationFrameRef.current = requestAnimationFrame(draw)
  }, [])

  const handleStop = useCallback(async () => {
    stopVisualizer()
    stopTracks()

    if (autoStopTimerRef.current !== null) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }

    setStatus('transcribing')

    const blob = new Blob(chunksRef.current, {
      type: recorderMimeTypeRef.current || 'audio/webm',
    })

    if (blob.size === 0) {
      setStatus('idle')
      showError('No audio recorded. Please try again.')
      return
    }

    try {
      const result = await sttApi.transcribe(blob, languageRef.current)
      const transcript = result.text?.trim() || ''

      if (!transcript) {
        setStatus('idle')
        showError('No speech detected', 3500)
        return
      }

      onTranscriptRef.current(transcript)
      setStatus('idle')
    } catch (err: any) {
      setStatus('idle')
      showError(err?.message || 'Transcription failed. Please try again.')
    }
  }, [showError, stopTracks, stopVisualizer])

  const startRecording = useCallback(async () => {
    setError(null)
    setMaxTimeReached(false)
    chunksRef.current = []

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      showError('Microphone is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const audioCtx = new AudioCtx()
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        audioContextRef.current = audioCtx
        analyserRef.current = analyser
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {})
        }
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = recorder
      recorderMimeTypeRef.current = recorder.mimeType || 'audio/webm'

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      recorder.onstop = () => {
        void handleStop()
      }

      recorder.start()
      setStatus('recording')
      draw()

      autoStopTimerRef.current = setTimeout(() => {
        setMaxTimeReached(true)
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== 'inactive'
        ) {
          mediaRecorderRef.current.stop()
        }
      }, MAX_RECORD_MS)
    } catch (err: any) {
      handleMicError(err)
    }
  }, [draw, handleStop, showError, handleMicError])

  const stopRecording = useCallback(() => {
    if (autoStopTimerRef.current !== null) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const isRecording = status === 'recording'
  const isTranscribing = status === 'transcribing'

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isTranscribing}
          aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
          aria-pressed={isRecording}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-50',
            isRecording
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-pk-green-500 text-white hover:bg-pk-green-700'
          )}
        >
          {isRecording ? (
            <Square size={14} />
          ) : isTranscribing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Mic size={14} />
          )}
          <span className="hidden sm:inline">
            {isRecording ? 'Stop' : isTranscribing ? 'Transcribing...' : 'Record'}
          </span>
        </button>

        <div
          className="flex overflow-hidden rounded-md border"
          role="group"
          aria-label="Voice input language"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedLanguage(option.value)}
              disabled={isRecording || isTranscribing}
              aria-pressed={selectedLanguage === option.value}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium transition-colors',
                'disabled:opacity-50',
                option.value === 'ur' ? 'font-urdu' : '',
                selectedLanguage === option.value
                  ? 'bg-pk-green-50 text-pk-green-700'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isRecording && (
          <div className="flex items-center gap-2">
            <canvas
              ref={canvasRef}
              width={160}
              height={40}
              className="h-10"
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-pk-green-700 animate-pulse">
              Listening...
            </span>
          </div>
        )}

        {isTranscribing && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />
            Transcribing...
          </span>
        )}
      </div>

      {maxTimeReached && !isRecording && !isTranscribing && (
        <p className="text-xs text-muted-foreground">
          Recording stopped automatically after 60 seconds.
        </p>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="inline-flex items-center justify-center rounded-full p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600"
          >
            <X size={12} />
          </button>
        </p>
      )}
    </div>
  )
}
