export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.particles = []
    this.mouse = { x: -9999, y: -9999 }
    this.running = true
    this.themeColor = '129, 140, 248'
    this.animationId = null

    this.resize()
    this.createParticles()
    this.bindEvents()
    this.animate()
  }

  resize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  createParticles() {
    this.particles = []
    const count = Math.min(80, Math.floor((this.canvas.width * this.canvas.height) / 15000))
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.4 + 0.1,
        pulse: Math.random() * Math.PI * 2
      })
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize())

    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX
      this.mouse.y = e.clientY
    })

    document.addEventListener('mouseleave', () => {
      this.mouse.x = -9999
      this.mouse.y = -9999
    })
  }

  setTheme(themeId) {
    const colorMap = {
      aurora: '129, 140, 248',
      neon: '236, 72, 153',
      sunset: '251, 146, 60',
      ocean: '34, 211, 238',
      midnight: '148, 163, 184',
      forest: '74, 222, 128',
      cyberpunk: '251, 191, 36',
      light: '99, 102, 241'
    }
    this.themeColor = colorMap[themeId] || '129, 140, 248'
  }

  animate() {
    if (!this.running) return
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const [r, g, b] = this.themeColor.split(',').map(Number)

    for (const p of this.particles) {
      p.x += p.vx
      p.y += p.vy
      p.pulse += 0.01

      if (p.x < -10) p.x = this.canvas.width + 10
      if (p.x > this.canvas.width + 10) p.x = -10
      if (p.y < -10) p.y = this.canvas.height + 10
      if (p.y > this.canvas.height + 10) p.y = -10

      const dx = this.mouse.x - p.x
      const dy = this.mouse.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 120) {
        const force = (120 - dist) / 120
        p.x -= dx * force * 0.015
        p.y -= dy * force * 0.015
      }

      const pulseOpacity = p.opacity + Math.sin(p.pulse) * 0.08
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0, pulseOpacity)})`
      this.ctx.fill()
    }

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x
        const dy = this.particles[i].y - this.particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 100) {
          this.ctx.beginPath()
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y)
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y)
          this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.06 * (1 - dist / 100)})`
          this.ctx.stroke()
        }
      }
    }

    this.animationId = requestAnimationFrame(() => this.animate())
  }

  destroy() {
    this.running = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  }
}
