import React, { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Database,
  Droplets,
  Fuel,
  Gauge,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
  X,
  Play,
  Eye,
} from 'lucide-react'

import LandingNav from '@/components/landing/LandingNav.jsx'
import { Button } from '@/components/ui/button'
import { useAuth, homeViewForUser } from '@/context/AuthContext.jsx'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

const ILLU = {
  hero: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=2400&q=80',
}

const team = [
  {
    name: 'DANIEL BENI MPODOL WELISAN',
    role: 'Fondateur & Architecte Produit — Lead UX, Frontend & IA',
    image: '/assets/team_ultime/daniel.jpeg',
    linkedin: 'https://www.linkedin.com/in/beni-daniel-01805932a',
    portfolio: 'https://danielbeni-portfolio.vercel.app/',
    accent: '#0ea5e9',
    bio: 'Vision produit, architecture frontend et intelligence artificielle — il porte la direction créative et technique de CarburFlow.',
  },
  {
    name: 'GERMAIN NKOUMOU',
    role: 'Lead Tech & Fullstack',
    image: '/assets/team_ultime/nkoumou.jpeg',
    linkedin: 'https://cm.linkedin.com/in/nkoumougrinnel',
    portfolio: 'https://nkoumoutjade.netlify.app/',
    accent: '#06b6d4',
    bio: 'Architecture, API et robustesse opérationnelle.',
  },
  {
    name: 'ERIC EVINA',
    role: 'Fullstack',
    image: '/assets/team_ultime/evina.jpeg',
    linkedin: 'https://www.linkedin.com/in/eric-evina-mbaho',
    portfolio: 'https://github.com/Evijo30-max/',
    accent: '#8b5cf6',
    bio: 'Produit & plateforme, du pixel à la donnée.',
  },
  {
    name: 'ANGE DJOUKOUO',
    role: 'DevOps',
    image: '/assets/team_ultime/djoukouo.jpeg',
    linkedin: '#',
    portfolio: 'https://github.com/rayannekengne2006-cmd',
    accent: '#f59e0b',
    bio: 'Infra, déploiement et stabilité.',
  },
  {
    name: 'BIENVENU BALAWE',
    role: 'Data Engineer',
    image: '/assets/team_ultime/balawe.jpeg',
    linkedin: 'https://www.linkedin.com/in/bienvenu-balawe-ndikwa',
    portfolio: '#',
    accent: '#10b981',
    bio: 'Pipelines et qualité de la donnée.',
  },
  {
    name: 'DIVINE SOUNDJOCK',
    role: 'Chef de projet',
    image: '/assets/team_ultime/soundjock.jpeg',
    linkedin: '#',
    portfolio: '#',
    accent: '#e11d48',
    bio: 'Cadrage, rythme et vision produit.',
  },
]

// ─────────────────────────────────────────────
// Safe image avec fallback initiales (corrige les 404 / images cassées)
// ─────────────────────────────────────────────
function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function TeamImage({ person, className = '', imgClassName = '' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [person.image])
  if (failed) {
    return (
      <div className={`grid place-items-center font-display font-extrabold tracking-tight ${className}`} style={{ background: `linear-gradient(135deg, ${person.accent} 0%, #0b2a3a 100%)`, color: 'white' }} aria-label={person.name}>
        <span className="text-[28px] sm:text-[32px]">{getInitials(person.name)}</span>
      </div>
    )
  }
  return (
    <img
      src={person.image}
      alt={person.name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={imgClassName || className}
    />
  )
}

// ─────────────────────────────────────────────
// Composants
// ─────────────────────────────────────────────
function MemberModal({ person, onClose }) {
  const modalRef = useRef(null)

  useGSAP(() => {
    if (!person) return
    const tl = gsap.timeline()
    tl.fromTo('.cf-modal-backdrop', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' })
      .fromTo('.cf-modal-card', { autoAlpha: 0, scale: 0.92, y: 16, filter: 'blur(6px)' }, { autoAlpha: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power3.out' }, '-=0.1')
      .from('.cf-modal-inner > *', { autoAlpha: 0, y: 10, duration: 0.3, stagger: 0.04, ease: 'power2.out' }, '-=0.2')
  }, { dependencies: [person], scope: modalRef })

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!person) return null

  return (
    <div ref={modalRef} className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={`Profil ${person.name}`}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="cf-modal-backdrop absolute inset-0 bg-[#060e14]/70 backdrop-blur-[10px]" />
      <div className="cf-modal-card relative z-10 w-full max-w-[420px] overflow-hidden rounded-[24px] border border-white/10 bg-[var(--panel)] shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
        <div className="relative h-[132px] overflow-hidden" style={{ background: `radial-gradient(600px 220px at 30% 0%, ${person.accent}55, transparent 60%), linear-gradient(135deg, #07131c 0%, #0b2a3a 55%, #0e4a63 100%)` }}>
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`, backgroundSize: '28px 28px' }} />
          <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white hover:text-slate-900 transition">
            <X className="size-4" />
          </button>
          <div className="absolute -bottom-10 left-6 size-[96px] overflow-hidden rounded-[20px] border-[3px] border-white shadow-xl bg-[var(--panel-soft)]">
            <TeamImage person={person} className="h-full w-full" imgClassName="h-full w-full object-cover" />
          </div>
        </div>
        <div className="cf-modal-inner px-6 pb-6 pt-12">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            <span className="size-1.5 rounded-full" style={{ background: person.accent }} /> Équipe CarburFlow
          </p>
          <h3 className="mt-3 font-display text-[18px] font-extrabold tracking-tight text-[var(--text)] leading-none">{person.name}</h3>
          <p className="mt-1.5 text-sm font-semibold" style={{ color: person.accent }}>{person.role}</p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{person.bio}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <a href={person.linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => person.linkedin === '#' && e.preventDefault()} aria-disabled={person.linkedin === '#'} className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition ${person.linkedin === '#' ? 'bg-[var(--panel-soft)] text-[var(--muted)] cursor-not-allowed' : 'bg-[#0A66C2] text-white hover:bg-[#084e96] shadow-sm'}`}>
              LinkedIn <ArrowUpRight className="size-3.5" />
            </a>
            <a href={person.portfolio} target="_blank" rel="noopener noreferrer" onClick={(e) => person.portfolio === '#' && e.preventDefault()} aria-disabled={person.portfolio === '#'} className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${person.portfolio === '#' ? 'border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] cursor-not-allowed' : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text)] hover:bg-[var(--panel-soft)]'}`}>
              Portfolio <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function HomePage({ onNavigate }) {
  const { isAuthenticated, isAdmin, isOperator, isViewer } = useAuth()
  const rootRef = useRef(null)
  const progressRef = useRef(null)
  const [modal, setModal] = useState(null)
  const [activeMetric, setActiveMetric] = useState(0)

  // rotation auto des métriques hero
  useEffect(() => {
    const id = setInterval(() => setActiveMetric((v) => (v + 1) % 3), 2200)
    return () => clearInterval(id)
  }, [])

  useGSAP(() => {
    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {})

    // barre de progression
    gsap.to(progressRef.current, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
    })

    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set(['.hero-brand', '.hero-title', '.hero-lead', '.hero-cta', '.hero-preview', '.reveal-head', '.reveal-item', '.team-card', '.pipeline-card', '.stat-kicker'], { clearProps: 'all', autoAlpha: 1 })
    })

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // ── Hero split
      const heroTitle = rootRef.current?.querySelector('.hero-title')
      let split
      if (heroTitle) {
        try {
          split = SplitText.create(heroTitle, { type: 'words,lines', linesClass: 'hero-line', wordsClass: 'hero-word', aria: 'auto' })
        } catch {}
      }

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.hero-eyebrow', { autoAlpha: 0, y: 10, duration: 0.5 })
        .from(split?.words || '.hero-title', { autoAlpha: 0, yPercent: 110, duration: 0.75, stagger: 0.04, ease: 'power4.out' }, '-=0.2')
        .from('.hero-lead', { autoAlpha: 0, y: 16, duration: 0.5 }, '-=0.4')
        .from('.hero-cta > *', { autoAlpha: 0, y: 16, duration: 0.45, stagger: 0.08 }, '-=0.3')
        .from('.hero-preview', { autoAlpha: 0, y: 28, scale: 0.98, duration: 0.7, ease: 'power3.out' }, '-=0.4')
        .from('.hero-trust', { autoAlpha: 0, y: 8, duration: 0.4 }, '-=0.2')

      // flottement preview
      gsap.to('.hero-preview', { y: -6, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      // lueur pulsante
      gsap.to('.hero-glow', { scale: 1.06, opacity: 0.9, duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      // parallax image hero
      gsap.to('.hero-parallax', {
        yPercent: -8,
        ease: 'none',
        scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 0.6 },
      })

      // reveal sections
      gsap.utils.toArray('.reveal-section').forEach((section) => {
        const heads = section.querySelectorAll('.reveal-head')
        const items = section.querySelectorAll('.reveal-item')
        if (heads.length) {
          gsap.from(heads, {
            autoAlpha: 0, y: 22, duration: 0.6, ease: 'power3.out', stagger: 0.06,
            scrollTrigger: { trigger: section, start: 'top 82%', once: true },
          })
        }
        if (items.length) {
          gsap.from(items, {
            autoAlpha: 0, y: 24, duration: 0.6, ease: 'power2.out', stagger: 0.07,
            scrollTrigger: { trigger: section, start: 'top 76%', once: true },
          })
        }
      })

      // pipeline parallax + barres qui poussent
      gsap.utils.toArray('.pipeline-card').forEach((card, i) => {
        gsap.from(card, {
          autoAlpha: 0, y: 24, duration: 0.55, delay: i * 0.04, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 88%', once: true },
        })
      })
      gsap.utils.toArray('.bar-grow').forEach((bar) => {
        const h = bar.getAttribute('data-h') || '50'
        gsap.fromTo(bar, { height: '8%' }, {
          height: `${h}%`, duration: 0.9, ease: 'power3.out', overwrite: true,
          scrollTrigger: { trigger: bar.closest('.pipeline-card') || bar, start: 'top 85%', once: true },
        })
      })

      // team stagger avec rotation subtile — défensif : visible par défaut même si ScrollTrigger échoue
      try {
        const teamCards = gsap.utils.toArray('.team-card')
        if (teamCards.length) {
          gsap.set(teamCards, { autoAlpha: 1, y: 0, rotate: 0 })
          gsap.from(teamCards, {
            autoAlpha: 0, y: 30, rotate: -0.4, duration: 0.6, stagger: { each: 0.07, from: 'start' }, ease: 'power3.out', overwrite: 'auto', immediateRender: false,
            scrollTrigger: { trigger: '#about', start: 'top 85%', toggleActions: 'play none none none' },
            onComplete: () => gsap.set(teamCards, { clearProps: 'transform' }),
          })
          // filet de sécurité : si ScrollTrigger ne se déclenche pas (viewport très grand / erreur plugin), force visible
          setTimeout(() => {
            const first = teamCards[0]
            if (first && getComputedStyle(first).opacity === '0') {
              gsap.set(teamCards, { autoAlpha: 1, y: 0, rotate: 0, clearProps: 'transform' })
            }
          }, 1600)
        }
      } catch (e) {
        gsap.set('.team-card', { clearProps: 'all', autoAlpha: 1 })
      }

      // alertes : glissement
      try {
        gsap.from('.alert-reveal', {
          autoAlpha: 0, x: 18, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: '#alerts', start: 'top 75%', toggleActions: 'play none none none' },
        })
      } catch {}

      return () => split?.revert?.()
    })

    // tilt magnétique équipe + hero preview
    const onMove = (e) => {
      const cards = rootRef.current?.querySelectorAll('.team-card')
      if (!cards) return
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = (e.clientX - cx) / rect.width
        const dy = (e.clientY - cy) / rect.height
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy)
        if (dist < 420) {
          gsap.to(card, { rotateY: dx * 6, rotateX: -dy * 6, y: -4, duration: 0.5, ease: 'power2.out', transformPerspective: 800 })
        } else {
          gsap.to(card, { rotateY: 0, rotateX: 0, y: 0, duration: 0.6, ease: 'power2.out' })
        }
      })
    }
    window.addEventListener('mousemove', onMove)

    // bouton magnétique
    const magnets = rootRef.current?.querySelectorAll('.magnet-btn')
    magnets?.forEach((btn) => {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' })
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' })
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect()
        xTo((e.clientX - (r.left + r.width / 2)) * 0.18)
        yTo((e.clientY - (r.top + r.height / 2)) * 0.28)
      })
      btn.addEventListener('mouseleave', () => { xTo(0); yTo(0) })
    })

    return () => {
      window.removeEventListener('mousemove', onMove)
      mm.revert()
      ctx.revert()
    }
  }, { scope: rootRef })

  const goApp = () => {
    if (!isAuthenticated) { onNavigate('login'); return }
    onNavigate(homeViewForUser({ isAdmin, isOperator, isViewer }))
  }
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div ref={rootRef} className="cf-landing relative min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--primary)] selection:text-white">
      {/* progress */}
      <div ref={progressRef} className="pointer-events-none fixed left-0 top-0 z-[60] h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400" />

      <div className="relative z-50">
        <LandingNav onNavigate={onNavigate} />
      </div>

      <main>
        {/* ════════════════════════════════════════ HERO ════════════════════════════════════════ */}
        <section className="hero-section relative isolate overflow-hidden bg-[#060e14]">
          {/* image + voiles — masquée si hors-ligne / bloquée */}
          <img src={ILLU.hero} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} className="hero-parallax absolute inset-0 h-[112%] w-full object-cover opacity-[0.32]" fetchPriority="high" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060e14] via-[#060e14]/92 to-[#060e14]/45" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_78%_32%,rgba(14,165,233,0.22),transparent_60%),radial-gradient(700px_420px_at_18%_92%,rgba(16,185,129,0.12),transparent_55%)]" aria-hidden="true" />
          {/* grille technique */}
          <div className="absolute inset-0 opacity-[0.07]" aria-hidden="true" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />
          {/* grain */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.055] mix-blend-soft-light" aria-hidden="true" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

          <div className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-16 lg:pt-14">
            {/* texte */}
            <div className="min-w-0">
              <p className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-200 backdrop-blur">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-2 animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                CAMTEL · Lutte contre la fraude
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] tracking-[0.12em] text-emerald-200">● LIVE</span>
              </p>

              <h1 className="hero-title mt-6 max-w-[18ch] font-display text-[2.7rem] font-[800] leading-[0.92] tracking-[-0.04em] text-white sm:text-[3.6rem] lg:text-[4.55rem]">
                Chaque litre
                <br />
                <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">tracé.</span>
                <br />
                Chaque heure
                <br />
                <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">comptée.</span>
              </h1>

              <p className="hero-lead mt-6 max-w-[52ch] text-[15.5px] leading-7 text-slate-200/90 sm:text-[17px]">
                CarburFlow digitalise le suivi carburant des sites techniques — de la collecte des relevés jusqu’à l’analyse des écarts. Fini les fichiers dispersés.
              </p>

              <div className="hero-cta mt-7 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={goApp} className="magnet-btn group bg-white px-6 text-slate-950 shadow-[0_12px_32px_rgba(0,0,0,0.28)] hover:bg-slate-50">
                  Accéder à CarburFlow <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </Button>
                <button type="button" onClick={() => scrollTo('preuve')} className="magnet-btn inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-[11px] text-sm font-semibold text-white backdrop-blur hover:bg-white/10 transition">
                  <Play className="size-4 fill-white" /> Voir la preuve
                </button>
              </div>

              <div className="hero-trust mt-8 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <ShieldCheck className="size-4 text-emerald-400" /> Données chiffrées
                </div>
                <span className="hidden sm:block h-3 w-px bg-white/15" />
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-1 rounded-full bg-sky-400" /> 17 sites
                  </span>
                  <span className="size-1 rounded-full bg-white/20" />
                  <span>42 groupes</span>
                  <span className="size-1 rounded-full bg-white/20" />
                  <span>Temps réel</span>
                </div>
              </div>
            </div>

            {/* preview produit */}
            <div className="relative">
              <div className="hero-glow absolute -inset-6 rounded-[2.2rem] bg-sky-500/12 blur-3xl" aria-hidden="true" />
              <div className="hero-preview relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_24px_64px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                {/* header */}
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300">Aperçu · temps réel</p>
                    <p className="mt-1 text-sm font-bold text-white">Situation du parc</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/20">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> Données à jour
                  </span>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                  {[
                    ['Sites', '17', 'text-white', 'bg-white/5'],
                    ['Groupes', '42', 'text-white', 'bg-white/5'],
                    ['Critiques', '3', 'text-red-300', 'bg-red-400/10 ring-1 ring-red-400/20'],
                    ['Surveillance', '5', 'text-amber-300', 'bg-amber-400/10 ring-1 ring-amber-400/20'],
                  ].map(([label, value, fg, bg]) => (
                    <div key={label} className={`rounded-2xl p-3.5 ${bg}`}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
                      <p className={`mt-2 font-display text-[22px] font-extrabold leading-none ${fg}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* events */}
                <div className="border-t border-white/10 p-4">
                  <p className="text-xs font-bold text-white">Derniers événements</p>
                  <div className="mt-3 space-y-2">
                    {[
                      ['Bepanda', 'Écart de consommation', '+65,6 %', 'bg-red-400', '+65,6 %'],
                      ['Bonabéri', 'Autonomie critique', '18 h', 'bg-amber-400', '18 h'],
                      ['Akwa', 'Variation de stock', '-12,4 %', 'bg-amber-400', '-12,4 %'],
                    ].map(([site, label, value, dot]) => (
                      <div key={`${site}-${label}`} className="flex items-center gap-3 rounded-2xl bg-white/[0.045] p-3 ring-1 ring-white/5">
                        <span className={`size-2.5 shrink-0 rounded-full ${dot} shadow-[0_0_10px_currentColor]`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white">{site}</p>
                          <p className="text-[11px] text-slate-400">{label}</p>
                        </div>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-200">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* mini spark */}
                <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-4 py-3">
                  <span className="text-[11px] font-semibold text-slate-400">Consommation · 7 jours</span>
                  <span className="text-[11px] font-bold text-emerald-300">-8,4 % vs N-1</span>
                </div>
                <div className="flex h-[56px] items-end gap-1.5 px-4 pb-4">
                  {[42, 58, 46, 71, 57, 76, 64].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-sky-700 to-sky-300" style={{ height: `${h}%`, opacity: 0.9 - i * 0.02 }} />
                  ))}
                </div>
              </div>

              {/* floating badge */}
              <div className="pointer-events-none absolute -right-2 -top-2 hidden lg:flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1e2a] px-3 py-2 shadow-xl">
                <span className="grid size-7 place-items-center rounded-xl bg-emerald-500 text-white"><Droplets className="size-3.5" /></span>
                <div className="pr-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200">Autonomie</p>
                  <p className="text-xs font-extrabold text-white">+12 h gagnées / sem.</p>
                </div>
              </div>
            </div>
          </div>

          {/* bottom fade */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--bg)] to-transparent" />
        </section>

        {/* ═════════════════ STRIP STATS ═════════════════ */}
        <section className="reveal-section border-y border-[var(--border)] bg-[var(--panel)]">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold text-[var(--muted)]">Adopté sur le terrain — pas dans un slide.</p>
            <div className="flex flex-wrap gap-6 sm:gap-8">
              {[
                ['17', 'sites supervisés'],
                ['42', 'groupes tracés'],
                ['-8,4 %', 'écart moyen détecté'],
                ['< 2 min', 'pour déposer un relevé'],
              ].map(([v, l]) => (
                <div key={l} className="min-w-[110px]">
                  <p className="font-display text-xl font-extrabold tracking-tight text-[var(--text)]">{v}</p>
                  <p className="text-xs font-semibold text-[var(--muted)]">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════ PROBLEME / SOLUTION ═════════════════ */}
        <section id="solution" className="reveal-section scroll-mt-20 bg-[var(--bg)]">
          <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="reveal-head inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
                <span className="h-px w-6 bg-current opacity-40" /> Pourquoi CarburFlow ?
              </p>
              <h2 className="reveal-head mt-3 font-display text-[32px] font-[800] tracking-[-0.03em] text-[var(--text)] sm:text-[42px] leading-[0.95]">
                Le suivi carburant ne devrait pas être <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent dark:from-sky-300 dark:to-cyan-300">une succession de fichiers.</span>
              </h2>
              <p className="reveal-head mt-4 text-[16px] leading-7 text-[var(--muted)]">CarburFlow transforme les relevés terrain en donnée structurée, comparable et exploitable — prête pour la décision.</p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                { n: '01', icon: Database, title: 'Centraliser', text: 'Les relevés sont regroupés dans une seule plateforme, sans ressaisie ni doublons.', accent: 'from-sky-500 to-cyan-500' },
                { n: '02', icon: BarChart3, title: 'Comparer', text: 'Stocks, consommation et heures de marche sont rapprochés automatiquement.', accent: 'from-violet-500 to-sky-500' },
                { n: '03', icon: AlertTriangle, title: 'Signaler', text: 'Les écarts significatifs sont mis en évidence, sans crier à la fraude.', accent: 'from-amber-500 to-orange-500' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <article key={item.title} className="reveal-item group relative overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm transition hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
                    <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${item.accent} opacity-80`} />
                    <div className="flex items-start justify-between">
                      <span className="grid size-11 place-items-center rounded-2xl bg-[var(--panel-soft)] text-[var(--primary)] ring-1 ring-[var(--border)] group-hover:bg-[var(--primary)] group-hover:text-white transition">
                        <Icon className="size-5" />
                      </span>
                      <span className="font-display text-sm font-extrabold tracking-[0.12em] text-[var(--muted)]/60">{item.n}</span>
                    </div>
                    <h3 className="mt-5 font-display text-[20px] font-bold tracking-tight text-[var(--text)]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.text}</p>
                    <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] opacity-0 group-hover:opacity-100 transition">
                      En savoir plus <ChevronRight className="size-3.5" />
                    </div>
                  </article>
                )
              })}
            </div>

            {/* micro-preuve */}
            <div className="reveal-item mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white"><Zap className="size-3" /> Rapide</span>
              <span className="text-[var(--muted)]">Import CSV/Excel en 1 clic — détection automatique des écarts dès le dépôt.</span>
            </div>
          </div>
        </section>

        {/* ═════════════════ CARBURFLOW EN ACTION ═════════════════ */}
        <section id="preuve" className="reveal-section scroll-mt-20 bg-[var(--panel)] border-y border-[var(--border)]">
          <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-3xl">
                <p className="reveal-head inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
                  <span className="h-px w-6 bg-current opacity-40" /> CarburFlow en action
                </p>
                <h2 className="reveal-head mt-3 font-display text-[32px] font-[800] tracking-[-0.03em] text-[var(--text)] sm:text-[42px] leading-[0.95]">Du réseau au groupe, <span className="text-sky-700 dark:text-sky-300">en un regard.</span></h2>
                <p className="reveal-head mt-4 text-[16px] leading-7 text-[var(--muted)]">Une même donnée permet de passer de la vision globale au détail opérationnel — sans changer d’outil.</p>
              </div>
              <div className="reveal-head hidden sm:flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
                <span>Réseau</span> <ChevronRight className="size-4" /> <span>Site</span> <ChevronRight className="size-4" /> <span className="text-sky-700 dark:text-sky-300">Groupe</span>
              </div>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              {/* Dashboard */}
              <div className="pipeline-card overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--panel)] shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Dashboard</p>
                    <p className="mt-1 text-sm font-bold text-[var(--text)]">Vue du parc</p>
                  </div>
                  <span className="grid size-8 place-items-center rounded-xl bg-[var(--panel-soft)] text-[var(--muted)]"><Gauge className="size-4" /></span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4">
                  <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/10 ring-1 ring-emerald-500/15">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">Opérationnels</p>
                    <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white">12</p>
                    <p className="text-[11px] font-semibold text-emerald-700/70 dark:text-emerald-300/70">● stable</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/10 ring-1 ring-amber-500/15">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">Surveillance</p>
                    <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white">2</p>
                  </div>
                  <div className="rounded-2xl bg-red-50 p-4 dark:bg-red-500/10 ring-1 ring-red-500/15">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-red-700 dark:text-red-300">Critiques</p>
                    <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white">3</p>
                  </div>
                </div>
                <div className="px-4 pb-5">
                  <p className="text-xs font-bold text-[var(--text)]">Consommation — 7 derniers jours</p>
                  <div className="mt-4 flex h-36 items-end gap-2">
                    {[42, 58, 46, 71, 57, 76, 64].map((h, i) => (
                      <div key={i} data-h={h} className="bar-grow flex-1 rounded-t-lg bg-gradient-to-t from-sky-800 to-sky-400 dark:from-sky-700 dark:to-sky-300" />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] font-semibold text-[var(--muted)]">
                    <span>Lun → Dim</span><span className="font-bold text-emerald-600 dark:text-emerald-400">-8,4 % vs N-1</span>
                  </div>
                </div>
              </div>

              {/* Groupe */}
              <div className="pipeline-card overflow-hidden rounded-[28px] border border-[#1e2e3e] bg-[#0c1a26] text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300">Groupe</p>
                    <p className="mt-1 text-sm font-bold">G1-SDMO-830</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">Bepanda International</p>
                  </div>
                  <span className="rounded-full bg-red-500/15 px-3 py-1 text-[11px] font-bold text-red-300 ring-1 ring-red-400/20">17 h 54</span>
                </div>
                <div className="grid grid-cols-3 gap-2 p-4">
                  {[
                    ['Stock', '148 L'],
                    ['Conso.', '8,3 L/h'],
                    ['Fonction.', '12 h 42'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">{label}</p>
                      <p className="mt-1 text-sm font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 pt-1">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold">Écart de consommation</p>
                      <span className="rounded-full bg-red-500/15 px-2 py-1 text-[11px] font-bold text-red-300">+65,6 %</span>
                    </div>
                    <div className="mt-4 flex items-end gap-2">
                      {[24, 32, 38, 49, 58, 72, 88].map((h, i) => (
                        <div key={i} data-h={Math.round(h * 0.8)} className="bar-grow h-24 flex-1 rounded-t-md bg-sky-400/80" />
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">Détection automatique · à confirmer par le responsable</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3 text-[11px] text-slate-400">
                  <ShieldCheck className="size-3.5 text-sky-300" /> Analyse à partir des données du groupe
                </div>
              </div>
            </div>

            <div className="reveal-item mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { k: 'Réseau', v: 'Vue consolidée', d: 'Tous les sites en une page' },
                { k: 'Site', v: 'Détail opérationnel', d: 'Cuves, groupes, relevés' },
                { k: 'Groupe', v: 'Décision ciblée', d: 'Autonomie & écarts' },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{s.k}</p>
                  <p className="mt-1 text-sm font-bold text-[var(--text)]">{s.v}</p>
                  <p className="text-xs text-[var(--muted)]">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════ ALERTES ═════════════════ */}
        <section id="alerts" className="reveal-section scroll-mt-20 bg-[var(--bg)]">
          <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <div>
              <p className="reveal-head inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300"><span className="h-px w-6 bg-current opacity-40" /> Alertes</p>
              <h2 className="reveal-head mt-3 font-display text-[32px] font-[800] tracking-[-0.03em] text-[var(--text)] sm:text-[40px] leading-[0.95]">Une alerte signale. <br /><span className="text-sky-700 dark:text-sky-300">Le responsable décide.</span></h2>
              <p className="reveal-head mt-4 text-[16px] leading-7 text-[var(--muted)]">CarburFlow détecte les écarts qui méritent une attention particulière, sans déclarer lui-même une fraude. Contexte, chiffres, piste — puis action humaine.</p>
              <div className="reveal-head mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--panel)] border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--text)]"><Layers className="size-3.5" /> Stock</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--panel)] border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--text)]"><Fuel className="size-3.5" /> Consommation</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--panel)] border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--text)]"><Gauge className="size-3.5" /> Autonomie</span>
              </div>
            </div>

            <div className="alert-reveal relative">
              <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-br from-amber-500/10 via-transparent to-sky-500/10 blur-2xl" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--panel)] shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
                <div className="flex items-start gap-4 p-5">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/15">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">31/08/2026 · 09:15 · Bepanda</p>
                    <p className="mt-1 text-[16px] font-bold leading-tight text-[var(--text)]">Écart de consommation horaire</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-extrabold text-white">+65,6 %</span>
                      <span className="text-xs font-semibold text-[var(--muted)]">G1-SDMO-830 · Bepanda International</span>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">À vérifier</span>
                </div>
                <div className="mx-5 rounded-2xl bg-[var(--panel-soft)] p-4">
                  <p className="text-sm leading-6 text-[var(--muted)]">L’écart est détecté automatiquement à partir des relevés. Le responsable consulte ensuite le stock, l’autonomie et l’historique du groupe pour décider de la suite.</p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
                    <Eye className="size-3.5" /> Voir le détail du groupe <ChevronRight className="size-3.5" />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
                  <span className="text-xs font-semibold text-[var(--muted)]">Détection · sans accusation</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"><ShieldCheck className="size-3.5" /> Traçabilité complète</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════ ÉQUIPE — EXPERIENCE INOUBLIABLE ═════════════════ */}
        <section id="about" className="reveal-section scroll-mt-20 border-y border-[var(--border)] bg-[var(--panel)]">
          <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-3xl">
                <p className="reveal-head inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300"><span className="h-px w-6 bg-current opacity-40" /> Équipe</p>
                <h2 className="reveal-head mt-3 font-display text-[32px] font-[800] tracking-[-0.03em] text-[var(--text)] sm:text-[42px] leading-[0.95]">Une équipe au croisement <br className="hidden sm:block" /><span className="bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent dark:from-sky-300 dark:to-violet-300">du produit, de la donnée et du métier.</span></h2>
                <p className="reveal-head mt-4 text-[16px] leading-7 text-[var(--muted)]">Survolez, inclinez, cliquez — chaque profil s’anime. La plateforme est humaine avant d’être technique.</p>
              </div>
              <p className="reveal-head hidden sm:flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><Sparkles className="size-4 text-sky-500" /> 6 profils · 6 expertises</p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((person, idx) => (
                <button
                  key={person.name}
                  type="button"
                  onClick={() => setModal(person)}
                  className="team-card group relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--panel)] text-left shadow-sm transition will-change-transform hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                  style={{ transformStyle: 'preserve-3d' }}
                  aria-label={`Voir le profil de ${person.name}`}
                >
                  <div className="relative aspect-[4/4.2] overflow-hidden bg-[var(--panel-soft)]">
                    <TeamImage person={person} className="h-full w-full" imgClassName="h-full w-full object-cover grayscale-[0.2] transition duration-700 group-hover:grayscale-0 group-hover:scale-[1.06]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-90" />
                    {/* accent line */}
                    <div className="absolute left-0 right-0 top-0 h-[3px]" style={{ background: person.accent }} />
                    {/* top badge */}
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur">
                      <span className="size-1.5 rounded-full" style={{ background: person.accent }} /> {String(idx + 1).padStart(2, '0')}
                    </div>
                    {/* hover eye */}
                    <div className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/90 text-slate-900 opacity-0 shadow transition group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Eye className="size-4" />
                    </div>
                    {/* name overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="font-display text-[15px] font-extrabold leading-tight tracking-tight text-white">{person.name}</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/14 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                        {person.role}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/75">{person.bio}</p>
                    </div>
                    {/* shine */}
                    <div className="pointer-events-none absolute -inset-20 translate-x-[-60%] rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition duration-700 group-hover:translate-x-[60%] group-hover:opacity-100" />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-bold text-[var(--primary)]">Voir le profil</span>
                    <span className="grid size-7 place-items-center rounded-full bg-[var(--panel-soft)] text-[var(--primary)] transition group-hover:bg-[var(--primary)] group-hover:text-white">
                      <ArrowUpRight className="size-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <p className="mt-6 text-center text-xs font-semibold text-[var(--muted)]">Cliquez sur un profil pour ouvrir la fiche · LinkedIn & Portfolio disponibles</p>
          </div>
        </section>

        {/* ═════════════════ CTA FINAL ═════════════════ */}
        <section id="acces" className="relative isolate scroll-mt-20 overflow-hidden bg-[#060e14]">
          <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_20%_20%,rgba(14,165,233,0.18),transparent_60%),radial-gradient(700px_380px_at_88%_78%,rgba(16,185,129,0.12),transparent_55%)]" aria-hidden="true" />
          <div className="absolute inset-0 opacity-[0.06]" aria-hidden="true" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />
          <div className="relative z-10 mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-20">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-sky-200 backdrop-blur">
                <Sparkles className="size-3.5" /> CarburFlow
              </p>
              <h2 className="mt-4 font-display text-[30px] font-[800] tracking-[-0.03em] text-white sm:text-[42px] leading-[0.95]">Passez du relevé <br className="hidden sm:block" />à la décision.</h2>
              <p className="mt-4 text-[16px] leading-7 text-slate-300">Centralisez le suivi, surveillez le parc et analysez les écarts depuis une seule plateforme — prête pour l’audit et le terrain.</p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-400" /> Déploiement rapide</span>
                <span className="size-1 rounded-full bg-white/20" />
                <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-sky-400" /> Support CAMTEL</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button size="lg" onClick={goApp} className="magnet-btn bg-white px-7 text-slate-950 shadow-[0_16px_40px_rgba(0,0,0,0.3)] hover:bg-slate-50">
                Accéder à CarburFlow <ArrowRight className="size-4" />
              </Button>
              <button type="button" onClick={() => scrollTo('solution')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/10 transition">
                Découvrir la solution
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ═════════════════ FOOTER ═════════════════ */}
      <footer className="border-t border-[var(--border)] bg-[var(--panel)]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-display text-lg font-extrabold tracking-tight text-[var(--text)]">CarburFlow · CAMTEL</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Supervision carburant — du relevé terrain à l’alerte exploitable.</p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm font-semibold">
            <button type="button" onClick={() => onNavigate('login')} className="text-[var(--muted)] hover:text-[var(--primary)] transition">Se connecter</button>
            <span className="text-[var(--border)]">·</span>
            <button type="button" onClick={() => scrollTo('solution')} className="text-[var(--muted)] hover:text-[var(--primary)] transition">Solution</button>
            <span className="hidden sm:inline text-[var(--border)]">·</span>
            <span className="text-xs font-semibold text-[var(--muted)]">Version 1.0 · Sept 2026</span>
          </div>
        </div>
        <div className="border-t border-[var(--border)]">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-4 text-xs font-medium text-[var(--muted)] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <p>© 2026 CarburFlow · CAMTEL</p>
            <p className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" /> Digitalisation du suivi carburant</p>
          </div>
        </div>
      </footer>

      {modal && <MemberModal person={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
