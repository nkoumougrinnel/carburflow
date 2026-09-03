import React, { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CircleAlert,
  Cpu,
  Droplets,
  ExternalLink,
  Fuel,
  Gauge,
  Globe,
  Layers3,
  ShieldCheck,
  Timer,
  TrendingUp,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav.jsx'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth, homeViewForUser } from '@/context/AuthContext.jsx'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

const ILLU = {
  hero: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=2400&q=80',
  control: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80',
}

// ── Team ──────────────────────────────────────────────────────────
const team = [
  { name: 'BALAWE NDIKWA BIENVENU', role: 'Backend & Data Engineer', image: '/assets/team_ultime/balawe.jpeg' },
  { name: 'SOUNDJOCK NDZANA MARIE ZACHARIE', role: 'Chef projet et Contribution métier', image: '/assets/team_ultime/soundjock.jpeg' },
  {
    name: 'DANIEL BENI MPODOL WELISAN',
    role: 'Frontend, UX & AI Engineer',
    image: '/assets/team_ultime/daniel.jpeg',
    highlight: true,
    links: {
      linkedin: 'https://www.linkedin.com/in/beni-daniel-01805932a',
      portfolio: 'https://danielbeni-portfolio.vercel.app/',
    },
  },
  { name: 'NKOUMOU TJADE GRINNEL GERMAIN', role: 'Backend et logique métier', image: '/assets/team_ultime/nkoumou.jpeg' },
  { name: 'EVINA MBAHO ERIC', role: 'Fullstack', image: '/assets/team_ultime/evina.jpeg' },
  { name: 'DJOUKOUO KENGNE ANGE RAYANNE', role: 'Données et import', image: '/assets/team_ultime/djoukouo.jpeg' },
]

// ── Daniel modal ──────────────────────────────────────────────────
function DanielModal({ person, onClose }) {
  if (!person) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Profil ${person.name}`}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-slate-900/10 text-slate-600 hover:bg-slate-900 hover:text-white transition"
        >
          <X className="size-4" />
        </button>
        <div className="h-28 bg-gradient-to-br from-sky-900 via-slate-900 to-sky-700" />
        <div className="px-6 pb-6">
          <img
            src={person.image}
            alt={person.name}
            className="-mt-10 size-20 rounded-2xl border-4 border-white object-cover shadow-lg"
          />
          <h3 className="mt-4 font-display text-lg font-bold leading-tight text-slate-900">{person.name}</h3>
          <p className="mt-1 text-sm font-medium text-sky-700">{person.role}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Conception de l&apos;interface CarburFlow, du design system et des interactions. Intégration IA pour l&apos;analyse des écarts et l&apos;assistance au responsable.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <a
              href={person.links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A66C2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#084e96] transition"
            >
              <Globe className="size-4" /> LinkedIn <ExternalLink className="size-3 opacity-70" />
            </a>
            <a
              href={person.links.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
            >
              <Globe className="size-4" /> Portfolio <ExternalLink className="size-3 opacity-50" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Mini schema Site > CP > CJ > GE ─────────────────────────────
function SchemaDiagram() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Architecture physique</p>
      <div className="mt-5 flex flex-col gap-3">
        {[
          { label: 'Site', sub: 'Ex: Douala — Bepanda', icon: Building2, tone: 'bg-sky-50 text-sky-700 border-sky-200' },
          { label: 'Cuve Principale', sub: 'CPxxx · stockage massif · dépotage camion', icon: Droplets, tone: 'bg-slate-50 text-slate-700 border-slate-200' },
          { label: 'Cuve Journalière', sub: 'CJxxx · tampon · 1 GE = 1 CJ', icon: Fuel, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Groupe Électrogène', sub: 'Gxx-XXXX · consomme · compteur horaire', icon: Zap, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        ].map((row, i) => {
          const Icon = row.icon
          return (
            <div key={row.label} className="relative">
              {i < 3 && <div className="absolute left-[18px] top-[44px] h-3 w-px bg-slate-200" aria-hidden="true" />}
              <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${row.tone}`}>
                <span className="grid size-9 place-items-center rounded-xl bg-white shadow-sm">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight">{row.label}</p>
                  <p className="text-xs leading-tight opacity-70">{row.sub}</p>
                </div>
                <ArrowRight className="ml-auto size-3.5 opacity-30" />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-5 rounded-xl bg-slate-900 px-4 py-3 font-mono text-xs leading-relaxed text-sky-200">
        Conso<span className="text-white">site</span> = (CP+CJ)<span className="text-amber-300">N-1</span> − (CP+CJ)<span className="text-amber-300">N</span> + dépotage
      </div>
      <p className="mt-3 text-xs text-slate-500">Variation CP distribuée au prorata puissance · CJ propre au groupe.</p>
    </div>
  )
}

// ── Live preview fake but credible ────────────────────────────────
function LivePreview() {
  const bars = [
    { label: 'Bepanda', pct: 18, tone: 'bg-red-500', status: 'Critique · 11h' },
    { label: 'Bonabéri', pct: 42, tone: 'bg-amber-500', status: 'À surveiller · 28h' },
    { label: 'Nsimalen', pct: 68, tone: 'bg-emerald-500', status: 'Normal · 4j 2h' },
    { label: 'Akwa', pct: 55, tone: 'bg-amber-500', status: 'Normal · 2j 14h' },
  ]
  const spark = [38, 52, 41, 66, 58, 74, 62]
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,76,110,0.10)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Aperçu live</p>
          <p className="text-sm font-semibold text-slate-900">Autonomie & consommation — 7 derniers jours</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          <span className="size-2 animate-pulse rounded-full bg-emerald-500" /> synchro il y a 12 min
        </span>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {bars.map((b) => (
            <div key={b.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-800">{b.label}</span>
                <span className="text-xs font-bold text-slate-500">{b.status}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${b.tone}`} style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Consommation — semaine N</p>
          <div className="mt-4 flex h-28 items-end gap-1.5">
            {spark.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-sky-800 to-sky-500" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs font-medium text-slate-400">
            <span>Lun</span><span>Dim</span><span className="font-bold text-sky-700">▼ -8.4% vs N-1</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage({ onNavigate }) {
  const { isAuthenticated, isAdmin, isOperator, isViewer } = useAuth()
  const rootRef = useRef(null)
  const [danielOpen, setDanielOpen] = useState(false)
  const danielPerson = team.find((p) => p.highlight)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(
          ['.hero-brand', '.hero-title', '.hero-lead', '.hero-cta', '.reveal-head', '.reveal-item', '.showcase-panel', '.final-cta-inner'],
          { clearProps: 'all', autoAlpha: 1 },
        )
      })
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const heroTitle = rootRef.current?.querySelector('.hero-title')
        let split
        if (heroTitle) {
          split = SplitText.create(heroTitle, { type: 'words,lines', linesClass: 'hero-line', wordsClass: 'hero-word', aria: 'auto' })
        }
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.from('.landing-nav-anim', { autoAlpha: 0, y: -12, duration: 0.5 })
          .from('.hero-brand', { autoAlpha: 0, y: 14, duration: 0.5 }, '-=0.25')
          .from(split?.words || '.hero-title', { autoAlpha: 0, yPercent: 110, duration: 0.7, stagger: 0.04, ease: 'power4.out' }, '-=0.2')
          .from('.hero-lead', { autoAlpha: 0, y: 18, duration: 0.5 }, '-=0.35')
          .from('.hero-kpis', { autoAlpha: 0, y: 16, duration: 0.5 }, '-=0.3')
          .from('.hero-cta', { autoAlpha: 0, y: 16, duration: 0.4, stagger: 0.07 }, '-=0.25')

        gsap.to('.hero-bg-img', {
          scale: 1.06, ease: 'none',
          scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 1.1 },
        })
        gsap.utils.toArray('.reveal-section').forEach((section) => {
          const heads = section.querySelectorAll('.reveal-head')
          const items = section.querySelectorAll('.reveal-item')
          if (heads.length) gsap.from(heads, { autoAlpha: 0, y: 28, duration: 0.6, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: section, start: 'top 78%', once: true } })
          if (items.length) gsap.from(items, { autoAlpha: 0, y: 32, duration: 0.6, ease: 'power2.out', stagger: 0.08, scrollTrigger: { trigger: section, start: 'top 72%', once: true } })
        })
        gsap.from('.showcase-panel', { autoAlpha: 0, y: 36, scale: 0.98, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.showcase-section', start: 'top 75%', once: true } })
        gsap.from('.final-cta-inner', { autoAlpha: 0, y: 28, duration: 0.65, ease: 'power3.out', scrollTrigger: { trigger: '.final-cta-section', start: 'top 80%', once: true } })
        return () => split?.revert?.()
      })
      return () => mm.revert()
    },
    { scope: rootRef },
  )

  const goApp = () => {
    if (!isAuthenticated) { onNavigate('login'); return }
    onNavigate(homeViewForUser({ isAdmin, isOperator, isViewer }))
  }
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div ref={rootRef} className="relative min-h-screen bg-white text-slate-900">
      <div className="landing-nav-anim relative z-40">
        <LandingNav onNavigate={onNavigate} />
      </div>

      <main>
        {/* ── HERO ── */}
        <section id="home" className="hero-section relative isolate overflow-hidden bg-slate-950">
          <img src={ILLU.hero} alt="" className="hero-bg-img absolute inset-0 h-full w-full object-cover opacity-[0.55]" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-sky-950/60" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(600px_400px_at_20%_20%,rgba(14,165,233,0.15),transparent_70%)]" aria-hidden="true" />
          <div className="relative z-10 mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16">
            <p className="hero-brand inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-sky-200 backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Lutte contre la fraude · CAMTEL
            </p>
            <h1 className="hero-title mt-6 max-w-3xl font-display text-[2.1rem] font-bold leading-[0.98] tracking-tight text-white sm:text-5xl lg:text-[3.6rem]">
              Chaque litre tracé.<br />
              <span className="text-sky-300">Chaque heure comptée.</span>
            </h1>
            <p className="hero-lead mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
              CarburFlow réconcilie stock, consommation et temps de fonctionnement — de la cuve principale au groupe — et ne lève qu&apos;une alerte exploitable.
            </p>

            {/* KPI strip */}
            <div className="hero-kpis mt-6 flex flex-wrap gap-3">
              {[
                { v: '47', l: 'sites supervisés' },
                { v: '112', l: 'groupes suivis' },
                { v: '18 h', l: 'autonomie médiane' },
                { v: '< 15 %', l: 'seuil d’écart' },
              ].map((k) => (
                <div key={k.l} className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur">
                  <p className="font-display text-lg font-bold leading-none text-white">{k.v}</p>
                  <p className="text-xs font-medium text-sky-200">{k.l}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="lg" className="hero-cta bg-white text-slate-900 hover:bg-slate-100 shadow-lg" onClick={goApp}>
                Voir la démo — 2 min <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="hero-cta border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white hover:text-slate-900"
                onClick={() => scrollTo('solution')}
              >
                Explorer les calculs
              </Button>
            </div>
            <p className="mt-4 text-xs font-medium text-slate-400">Conso site = (CP+CJ)N-1 − (CP+CJ)N + dépotage · Distribution au prorata puissance</p>
          </div>
        </section>

        {/* ── TRUST BAR ── */}
        <div className="border-y border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Déployé & auditable</p>
            <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-700">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-sky-700" /> CAMTEL — Direction Réseau</span>
              <span className="hidden sm:inline text-slate-300">·</span>
              <span>CSV import contrôlé</span>
              <span className="hidden sm:inline text-slate-300">·</span>
              <span>Traçabilité justifiée</span>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">v1.0 — Sept 2026</span>
          </div>
        </div>

        {/* ── SCHEMA + DEFI ── */}
        <section id="solution" className="reveal-section mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-700">La réalité terrain</p>
              <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Du relevé dispersé à la preuve croisée.
              </h2>
              <p className="reveal-head mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                Stocks, compteurs horaires et dépotages arrivent du terrain en ordre dispersé. Sans réconciliation, un écart de 28% ou une autonomie à 11 h passe inaperçu — jusqu&apos;à la panne.
              </p>
              <div className="reveal-head mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { t: 'Visibilité morcelée', d: 'Un parc multi-sites sans vue consolidée.' },
                  { t: 'Données brutes', d: 'Relevés non structurés, non comparables.' },
                  { t: 'Écarts silencieux', d: 'Variation sans référence = invisible.' },
                  { t: 'Contrôle chronophage', d: 'Comparaisons manuelles qui retardent la décision.' },
                ].map((c) => (
                  <div key={c.t} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">{c.t}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{c.d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal-item">
              <SchemaDiagram />
            </div>
          </div>
        </section>

        {/* ── PROCESS 3 étapes ── */}
        <section className="reveal-section bg-slate-50 py-14 lg:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Processus</p>
              <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Centraliser → Comparer → Signaler.
              </h2>
              <p className="reveal-head mt-3 text-base text-slate-600">Trois gestes. Le reste est calcul.</p>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                { icon: Layers3, k: '01', title: 'Centraliser', text: 'Import CSV contrôlé. Hiérarchie Site → CP → CJ → GE respectée. Chaque ligne devient traçable.', accent: 'from-sky-600 to-sky-800' },
                { icon: BarChart3, k: '02', title: 'Comparer', text: 'Conso horaire N vs N-1, stock N vs N-1, autonomie déduite. Écart >15% = signal.', accent: 'from-slate-700 to-slate-900' },
                { icon: CircleAlert, k: '03', title: 'Signaler', text: '5 typologies, 4 priorités. L’alerte attire l’attention — le responsable décide.', accent: 'from-amber-600 to-orange-700' },
              ].map((s) => {
                const Icon = s.icon
                return (
                  <article key={s.title} className="reveal-item relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.accent}`} />
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white"><Icon className="size-5" /></span>
                      <span className="font-display text-sm font-bold tracking-[0.2em] text-slate-300">{s.k}</span>
                    </div>
                    <h3 className="mt-5 font-display text-xl font-bold text-slate-900">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
                  </article>
                )
              })}
            </div>
            <p className="reveal-head mt-6 text-center text-sm font-semibold text-slate-500">
              CarburFlow ne conclut pas à la fraude. Il donne au responsable le bon point de départ.
            </p>
          </div>
        </section>

        {/* ── ANALYSE CROISEE ── */}
        <section className="reveal-section mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Lecture croisée</p>
            <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Quatre indicateurs, une même question : faut-il agir ?
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Gauge, title: 'Consommation', text: 'Litres totaux N vs N-1. Hausse = alerte, baisse = gestion.' },
              { icon: Timer, title: 'Delta horaire', text: 'Heures tournées. Sans delta, une conso est suspecte.' },
              { icon: TrendingUp, title: 'Conso horaire', text: 'L/h = conso / delta. La vraie dérive est là.' },
              { icon: Droplets, title: 'Stock & autonomie', text: 'CP × part puissance + CJ / conso horaire moyenne.' },
            ].map((c) => {
              const Icon = c.icon
              return (
                <article key={c.title} className="reveal-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-700"><Icon className="size-5" /></span>
                  <h3 className="mt-4 font-display text-base font-bold text-slate-900">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.text}</p>
                </article>
              )
            })}
          </div>
        </section>

        {/* ── ALERTES (dark) ── */}
        <section className="reveal-section bg-slate-900 py-14 text-white lg:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-300">5 typologies — 4 priorités</p>
              <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Une alerte = un fait mesurable.
              </h2>
              <p className="reveal-head mt-3 text-base text-slate-300">Pas d&apos;opinion. Un écart chiffré, un contexte, une action.</p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { badge: 'CRITIQUE', color: 'bg-red-500', title: 'Autonomie < 24 h', detail: '11 h restantes · 2 400 L · Bepanda' },
                { badge: 'HAUTE', color: 'bg-orange-500', title: 'Conso sans fonctionnement', detail: '1 500 L · 0 h · Groupe G1-SDMO' },
                { badge: 'MOYENNE', color: 'bg-amber-500', title: 'Écart conso horaire', detail: '272 L/h vs 164 L/h · +65%' },
                { badge: 'HAUTE', color: 'bg-orange-500', title: 'Fonctionnement sans conso', detail: '18 h · 0 L · Vérifier compteur' },
              ].map((a) => (
                <article key={a.title} className="reveal-item rounded-2xl border border-slate-700 bg-slate-800 p-5">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold text-white ${a.color}`}>{a.badge}</span>
                  <h3 className="mt-3 font-display text-base font-bold text-white">{a.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">{a.detail}</p>
                </article>
              ))}
            </div>
            <p className="reveal-head mt-6 text-center text-sm font-medium text-sky-200">Le système attire l’attention. Le responsable vérifie le contexte et décide.</p>
          </div>
        </section>

        {/* ── SHOWCASE LIVE ── */}
        <section id="preuve" className="showcase-section reveal-section border-y border-slate-200 bg-white py-14 lg:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Preuve par l’écran</p>
              <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Du réseau entier au groupe — en deux clics.
              </h2>
              <p className="reveal-head mt-3 text-base text-slate-600">
                Même données, deux lectures : vision réseau et détail groupe. Sans resaisie.
              </p>
            </div>
            <div className="showcase-panel mt-8">
              <LivePreview />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" onClick={goApp}>Ouvrir le dashboard <ArrowRight className="size-4" /></Button>
              <Button variant="ghost" onClick={() => onNavigate('sites')}>Voir les sites</Button>
            </div>
          </div>
        </section>

        {/* ── RBAC table ── */}
        <section className="reveal-section bg-slate-50 py-14 lg:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Accès & responsabilités</p>
              <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Un même système, des droits séparés.
              </h2>
            </div>
            <div className="reveal-item mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      <th className="px-4 py-3">Capacité</th>
                      <th className="px-4 py-3 text-center">Responsable</th>
                      <th className="px-4 py-3 text-center">Opérateur</th>
                      <th className="px-4 py-3 text-center">Consultation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { label: 'Dashboard & alertes', vals: [true, false, false] },
                      { label: 'Sites & groupes (détail + courbes)', vals: [true, true, true] },
                      { label: 'Relevés — import & envoi', vals: [true, true, false] },
                      { label: 'Relevés — lecture seule', vals: [true, true, true] },
                      { label: 'Traiter une alerte (justification)', vals: [true, false, false] },
                      { label: 'Notifications & profil', vals: [true, true, true] },
                    ].map((row) => (
                      <tr key={row.label} className="text-slate-700">
                        <td className="px-4 py-3 font-medium">{row.label}</td>
                        {row.vals.map((v, i) => (
                          <td key={i} className="px-4 py-3 text-center">
                            {v ? <span className="inline-grid size-6 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Check className="size-3.5" /></span> : <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { title: 'Responsable', desc: 'Supervise, analyse les écarts, traite les alertes.', chips: ['Dashboard', 'Alertes', 'Groupes'] },
                { title: 'Opérateur', desc: 'Relève, importe, contrôle la saisie terrain.', chips: ['Envois', 'Sites', 'Historique'] },
                { title: 'Consultation', desc: 'Suit l’état sans modifier les données.', chips: ['Sites', 'Lecture'] },
              ].map((r) => (
                <div key={r.title} className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-sm font-bold text-slate-900">{r.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{r.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.chips.map((c) => <span key={c} className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">{c}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TRAÇABILITÉ ── */}
        <section className="reveal-section mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Maîtrise des données</p>
            <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              De la saisie au traitement, sans zone grise.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Fuel, title: 'Import contrôlé', text: 'Validation du CSV avant enregistrement. Pas de doublon silencieux.' },
              { icon: Users, title: 'Séparation des rôles', text: 'Saisie terrain ≠ analyse responsable. Conflit d’intérêt évité.' },
              { icon: ShieldCheck, title: 'Traçabilité', text: 'Alerte traitée = justification + auteur + horodatage conservés.' },
            ].map((c) => {
              const Icon = c.icon
              return (
                <article key={c.title} className="reveal-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white"><Icon className="size-5" /></span>
                  <h3 className="mt-4 font-display text-base font-bold text-slate-900">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.text}</p>
                </article>
              )
            })}
          </div>
        </section>

        {/* ── TEAM ── */}
        <section id="about" className="reveal-section bg-slate-50 py-14 lg:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Équipe CarburFlow</p>
              <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Produit, data et terrain — même exigence.
              </h2>
              <p className="reveal-head mt-3 text-base text-slate-600">
                Une équipe orientée exploitation. Objectif: rendre lisible le suivi carburant sur un parc large et hétérogène.
              </p>
            </div>
            <link rel="stylesheet" href="/assets/team_ultime/team_ultime_style.css" />
            <div className="tu-grid mt-8">
              {team.map((person) => {
                const isDaniel = !!person.highlight
                const CardInner = (
                  <>
                    <div className="tu-wrapper">
                      <img src={person.image} alt="" aria-hidden="true" className="tu-cover" loading="lazy" />
                    </div>
                    <img src={person.image} alt={person.name} className="tu-character" loading="lazy" />
                    <div className="tu-title">
                      <h3>{person.name}</h3>
                      <p>{person.role}</p>
                      {isDaniel && <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-sky-300">↗ Voir LinkedIn / Portfolio</span>}
                    </div>
                  </>
                )
                return isDaniel ? (
                  <button
                    key={person.name}
                    type="button"
                    onClick={() => setDanielOpen(true)}
                    className="tu-card group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                    aria-label={`Voir le profil de ${person.name} — LinkedIn et portfolio`}
                    title="Voir LinkedIn / Portfolio"
                  >
                    {CardInner}
                  </button>
                ) : (
                  <div key={person.name} className="tu-card">{CardInner}</div>
                )
              })}
            </div>
            {danielOpen && <DanielModal person={danielPerson} onClose={() => setDanielOpen(false)} />}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section id="acces" className="final-cta-section relative isolate overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
          <img src={ILLU.control} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-slate-950/85" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-r from-sky-900/60 to-transparent" aria-hidden="true" />
          <div className="final-cta-inner relative z-10 mx-auto flex max-w-6xl flex-col items-start gap-6 text-white md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Passez du relevé à la décision.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-sky-100">
                Centralisez le suivi, surveillez l’autonomie, instruisez les écarts — avec la même donnée que le terrain.
              </p>
              <p className="mt-2 text-xs font-medium text-sky-200">Accès par rôle · Données auditable · Hébergé CAMTEL</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl" onClick={goApp}>
                Accéder à CarburFlow <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white hover:text-slate-900"
                onClick={() => onNavigate('login')}
              >
                Se connecter
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <p className="font-display text-lg font-bold text-slate-900">CarburFlow · CAMTEL</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Supervision carburant — du relevé terrain à l’alerte exploitable.</p>
            <p className="mt-3 text-xs text-slate-500">Formule: Conso = (CP+CJ)N-1 − (CP+CJ)N + dépotage</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Produit</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><button type="button" onClick={() => scrollTo('solution')} className="hover:text-sky-700">Solution</button></li>
              <li><button type="button" onClick={() => scrollTo('preuve')} className="hover:text-sky-700">Preuve</button></li>
              <li><button type="button" onClick={() => scrollTo('about')} className="hover:text-sky-700">Équipe</button></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Accès</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><button type="button" onClick={() => onNavigate('login')} className="hover:text-sky-700">Se connecter</button></li>
              <li><button type="button" onClick={() => onNavigate('register')} className="hover:text-sky-700">Créer un compte</button></li>
              <li><span className="text-xs text-slate-500">Démo: admin / admin</span></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Ressources</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><span>docs/logique_metier.md</span></li>
              <li><span>docs/guide-metier.md</span></li>
              <li><span>API /api/v1/ · /docs</span></li>
            </ul>
          </div>
        </div>
        <Separator className="bg-slate-200" />
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 CarburFlow · CAMTEL — Digitalisation suivi carburant</p>
          <p>Conçu pour la lutte contre la fraude · Données auditable</p>
        </div>
      </footer>
    </div>
  )
}
