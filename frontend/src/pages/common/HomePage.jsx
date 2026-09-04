import React, { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  Layers3,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav.jsx'
import DashboardShowcase from '@/components/landing/DashboardShowcase.jsx'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth, homeViewForUser } from '@/context/AuthContext.jsx'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

const ILLU = {
  hero: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=2400&q=80',
  field: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1600&q=80',
  tanks: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1600&q=80',
  control: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80',
  night: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=2000&q=80',
  team: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80',
}

const BENEFITS = [
  {
    icon: Layers3,
    title: 'Une source unique',
    text: 'Remplacez les tableurs dispersés par un flux commun, traçable et partagé.',
    image: ILLU.tanks,
  },
  {
    icon: TriangleAlert,
    title: 'Alertes au bon moment',
    text: 'Repérez les cuves critiques avant la rupture, site par site.',
    image: ILLU.control,
  },
  {
    icon: ShieldCheck,
    title: 'Rôles clairement séparés',
    text: 'Admin, opérateur et utilisateur — chacun voit exactement ce qu’il doit faire.',
    image: ILLU.team,
  },
]

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

function HomePage({ onNavigate }) {
  const { isAuthenticated, isAdmin, isOperator, isViewer } = useAuth()
  const rootRef = useRef(null)
  const [modal, setModal] = useState(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(
          ['.hero-brand', '.hero-title', '.hero-lead', '.hero-cta', '.reveal-head', '.reveal-item', '.showcase-panel', '.final-cta-inner', '.illu-frame', '.team-card'],
          { clearProps: 'all', autoAlpha: 1 },
        )
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const heroTitle = rootRef.current?.querySelector('.hero-title')
        let split
        if (heroTitle) {
          split = SplitText.create(heroTitle, {
            type: 'words,lines',
            linesClass: 'hero-line',
            wordsClass: 'hero-word',
            aria: 'auto',
          })
        }

        const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        heroTl
          .from('.landing-nav-anim', { autoAlpha: 0, y: -12, duration: 0.55 })
          .from('.hero-brand', { autoAlpha: 0, y: 18, duration: 0.55 }, '-=0.25')
          .from(
            split?.words || '.hero-title',
            { autoAlpha: 0, yPercent: 110, duration: 0.75, stagger: 0.045, ease: 'power4.out' },
            '-=0.2',
          )
          .from('.hero-lead', { autoAlpha: 0, y: 22, duration: 0.55 }, '-=0.4')
          .from('.hero-cta', { autoAlpha: 0, y: 18, duration: 0.45 }, '-=0.3')

        gsap.to('.hero-bg-img', {
          scale: 1.08,
          ease: 'none',
          scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 1.1 },
        })

        gsap.utils.toArray('.reveal-section').forEach((section) => {
          const head = section.querySelectorAll('.reveal-head')
          const items = section.querySelectorAll('.reveal-item')
          if (head.length) {
            gsap.from(head, {
              autoAlpha: 0, y: 36, duration: 0.7, ease: 'power3.out', stagger: 0.08,
              scrollTrigger: { trigger: section, start: 'top 78%', once: true },
            })
          }
          if (items.length) {
            gsap.from(items, {
              autoAlpha: 0, y: 40, duration: 0.65, ease: 'power2.out', stagger: 0.1,
              scrollTrigger: { trigger: section, start: 'top 72%', once: true },
            })
          }
        })

        gsap.from('.illu-frame', {
          autoAlpha: 0, y: 48, duration: 0.85, ease: 'power3.out', stagger: 0.12,
          scrollTrigger: { trigger: '.illu-gallery', start: 'top 75%', once: true },
        })

        gsap.from('.showcase-panel', {
          autoAlpha: 0, y: 48, scale: 0.98, duration: 0.85, ease: 'power3.out',
          scrollTrigger: { trigger: '.showcase-section', start: 'top 75%', once: true },
        })

        gsap.from('.final-cta-inner', {
          autoAlpha: 0, y: 32, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: '.final-cta-section', start: 'top 80%', once: true },
        })


        try {
          const teamCards = gsap.utils.toArray('.team-card')
          if (teamCards.length) {
            gsap.set(teamCards, { autoAlpha: 1, y: 0, rotate: 0 })
            gsap.from(teamCards, {
              autoAlpha: 0, y: 30, rotate: -0.4, duration: 0.6, stagger: { each: 0.07, from: 'start' }, ease: 'power3.out', overwrite: 'auto', immediateRender: false,
              scrollTrigger: { trigger: '#about', start: 'top 85%', toggleActions: 'play none none none' },
              onComplete: () => gsap.set(teamCards, { clearProps: 'transform' }),
            })
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

        return () => split?.revert?.()
      })

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

      return () => {
        window.removeEventListener('mousemove', onMove)
        mm.revert()
      }
    },
    { scope: rootRef },
  )

  const goApp = () => {
    if (!isAuthenticated) {
      onNavigate('login')
      return
    }
    onNavigate(homeViewForUser({ isAdmin, isOperator, isViewer }))
  }

  const renderHeroCtas = () => {
    if (isAuthenticated) {
      return (
        <div className="hero-cta flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            className="bg-white px-6 text-[#0a1c24] shadow-lg hover:bg-white/90"
            onClick={goApp}
          >
            Ouvrir mon espace
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )
    }
    return (
      <div className="hero-cta flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          className="bg-white px-6 text-[#0a1c24] shadow-lg hover:bg-white/90"
          onClick={() => onNavigate('login')}
        >
          Accéder à CarburFlow
          <ArrowRight className="size-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="border-white/60 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
          onClick={() => onNavigate('register')}
        >
          Créer un compte
        </Button>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative min-h-screen bg-background text-foreground">
      <div className="landing-nav-anim relative z-40">
        <LandingNav onNavigate={onNavigate} />
      </div>

      <main>
        {/* Hero full-bleed — brand + 1 titre + 1 lead + CTA + image dominante */}
        <section id="home" className="hero-section relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
          <img
            src={ILLU.hero}
            alt=""
            className="hero-bg-img absolute inset-0 h-full w-full scale-105 object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1c24]/92 via-[#0a1c24]/72 to-[#0a1c24]/35" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1c24]/80 via-transparent to-[#0a1c24]/30" aria-hidden="true" />

          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-end px-4 pb-16 pt-24 sm:px-6 lg:justify-center lg:px-8 lg:pb-24">
            <p className="hero-brand font-display text-sm font-semibold uppercase tracking-[0.22em] text-white/80">
              CarburFlow
            </p>
            <h1 className="hero-title font-display mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Le carburant de vos sites, enfin sous contrôle.
            </h1>
            <p className="hero-lead mt-5 max-w-xl text-lg leading-relaxed text-white/80">
              Suivez les stocks, déposez les relevés et pilotez chaque site — sans tableurs dispersés.
            </p>
            <div className="mt-8">{renderHeroCtas()}</div>
          </div>
        </section>

        {/* Galerie illustrations terrain */}
        <section className="illu-gallery reveal-section border-b border-border/60 bg-card/40 py-10 lg:py-14">
          <div className="mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
            {[
              { src: ILLU.field, label: 'Opérations terrain' },
              { src: ILLU.tanks, label: 'Cuves & stockage' },
              { src: ILLU.control, label: 'Pilotage temps réel' },
            ].map((item) => (
              <figure key={item.label} className="illu-frame group relative aspect-[4/3] overflow-hidden">
                <img src={item.src} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10 font-display text-sm font-semibold text-white">
                  {item.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="challenge" className="reveal-section mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="reveal-head font-display text-3xl font-semibold tracking-tight">
              Ce qui freine vos opérations aujourd’hui
            </h2>
            <p className="reveal-head mt-3 text-lg text-muted-foreground">
              Une seule friction à la fois — trois réalités terrain que CarburFlow unifie.
            </p>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { title: 'Tableurs dispersés', text: 'Chaque site envoie son fichier, dans son format, à son rythme. La consolidation arrive trop tard.', image: ILLU.field },
              { title: 'Alertes différées', text: 'Les seuils critiques se découvrent en réunion, pas au moment où il faut réapprovisionner.', image: ILLU.night },
              { title: 'Vision fragmentée', text: 'Impossible de comparer sites, cuves et consommation dans une vue unique et fiable.', image: ILLU.tanks },
            ].map((item) => (
              <article key={item.title} className="reveal-item flex flex-col gap-4">
                <div className="aspect-[16/10] overflow-hidden">
                  <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="showcase-section reveal-section border-y border-border/70 bg-card/60 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="reveal-head font-display text-3xl font-semibold tracking-tight">
                Une vue claire pour piloter
              </h2>
              <p className="reveal-head mt-3 text-lg text-muted-foreground">
                Niveaux, tendances et priorités — le tableau de bord que vos managers attendent.
              </p>
            </div>
            <div className="showcase-panel mt-10">
              <DashboardShowcase />
            </div>
          </div>
        </section>

        {/* Bande illustrée large */}
        <section className="reveal-section relative isolate overflow-hidden py-24 lg:py-28">
          <img src={ILLU.night} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-[#0a1c24]/78" aria-hidden="true" />
          <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="reveal-head font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              De la cuve au dashboard, un seul fil
            </h2>
            <p className="reveal-head mt-4 text-lg text-white/80">
              Les équipes terrain saisissent. Les responsables voient. Les alertes arrivent avant la rupture.
            </p>
          </div>
        </section>

        <section className="reveal-section cf-landing-band border-y border-border/70 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="reveal-head font-display text-3xl font-semibold tracking-tight">
                Pourquoi les équipes choisissent CarburFlow
              </h2>
              <p className="reveal-head mt-3 text-lg text-muted-foreground">
                Clarté pour les responsables, simplicité pour le terrain.
              </p>
            </div>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {BENEFITS.map((item) => {
                const Icon = item.icon
                return (
                  <article key={item.title} className="reveal-item flex flex-col gap-4">
                    <div className="aspect-[16/10] overflow-hidden">
                      <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <Icon className="size-5 text-petrol-mid" aria-hidden="true" />
                    <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="reveal-section mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="reveal-item order-2 aspect-[4/3] overflow-hidden lg:order-1">
              <img src={ILLU.team} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="order-1 space-y-6 lg:order-2">
              <h2 className="reveal-head font-display text-3xl font-semibold tracking-tight">
                Trois rôles, une même plateforme
              </h2>
              <p className="reveal-head text-lg text-muted-foreground">
                Administrateur, opérateur et utilisateur : chacun accède exactement à ce dont il a besoin.
              </p>
              <ul className="reveal-item space-y-3 text-sm text-muted-foreground">
                <li><strong className="text-foreground">Responsable</strong> — dashboard, alertes, sites, groupes, relevés.</li>
                <li><strong className="text-foreground">Opérateur</strong> — sites et relevés (envoi + historique).</li>
                <li><strong className="text-foreground">Utilisateur</strong> — consultation des sites et profil.</li>
              </ul>
              <div className="reveal-item flex flex-wrap gap-3">
                <Button onClick={() => onNavigate('login')}>
                  Se connecter
                  <ArrowRight className="size-4" />
                </Button>
                <Button variant="secondary" onClick={() => onNavigate('register')}>
                  Créer un compte
                </Button>
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
                <h2 className="reveal-head mt-3 font-display text-[32px] font-[800] tracking-[-0.03em] text-[var(--text)] sm:text-[42px] leading-[0.95]">Une équipe au croisement <br className="hidden sm:block" /><span className="text-petrol dark:text-sky-300">du produit, de la donnée et du métier.</span></h2>
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

                {!isAuthenticated && (
          <section className="final-cta-section relative isolate overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
            <img src={ILLU.control} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-petrol/90" aria-hidden="true" />
            <div className="final-cta-inner relative z-10 mx-auto flex max-w-6xl flex-col items-start gap-6 text-primary-foreground md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h2 className="font-display text-3xl font-semibold tracking-tight">
                  Reprenez la main sur vos stocks
                </h2>
                <p className="mt-3 text-base text-white/80">
                  Connectez-vous pour piloter, ou créez un compte pour consulter vos sites.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="cf-cta-light bg-white text-petrol hover:bg-white/90" onClick={() => onNavigate('login')}>
                  Accéder à CarburFlow
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={() => onNavigate('register')}
                >
                  S’inscrire
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span className="font-display font-semibold text-petrol">CarburFlow</span>
          <Separator className="sm:hidden" />
          <span>© {new Date().getFullYear()} — Gestion de carburant multi-sites</span>
        </div>
      </footer>

      {modal && <MemberModal person={modal} onClose={() => setModal(null)} />}
    </div>
  )
}

export default HomePage
