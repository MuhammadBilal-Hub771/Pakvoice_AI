'use client'

import React, { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  speedY: number
  speedX: number
  opacity: number
  color: string
}

export function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let particles: Particle[] = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    const initParticles = () => {
      const count = 20
      particles = []
      const colors = ['#dcfce7', '#86efac', '#ffffff']

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 3 + Math.random() * 4,
          speedY: 0.15 + Math.random() * 0.25,
          speedX: (Math.random() - 0.5) * 0.15,
          opacity: 0.2 + Math.random() * 0.3,
          color: colors[Math.floor(Math.random() * colors.length)],
        })
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fill()

        p.y -= p.speedY
        p.x += p.speedX

        if (p.y + p.size < 0) {
          p.y = canvas.height + p.size
          p.x = Math.random() * canvas.width
          p.speedY = 0.15 + Math.random() * 0.25
          p.speedX = (Math.random() - 0.5) * 0.15
          p.opacity = 0.2 + Math.random() * 0.3
        }

        if (p.x < -p.size) p.x = canvas.width + p.size
        if (p.x > canvas.width + p.size) p.x = -p.size
      }

      animationId = requestAnimationFrame(animate)
    }

    resize()
    initParticles()
    animate()

    window.addEventListener('resize', () => {
      resize()
      initParticles()
    })

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
    />
  )
}
