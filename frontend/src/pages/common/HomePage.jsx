import React, { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import {
  ArrowRight,
  Building2,
  Fuel,
  Gauge,
  ShieldCheck,
  Users,
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

const teamOrder = ['daniel', 'germain', 'eric', 'ange', 'bienvenue', 'divine']

const team = [
  { name: 'DANIEL BENI MPODOL', role: 'Frontend, UX & AI Engineer', image: '/assets/team_ultime/daniel.jpeg', github: 'daniel', linkedin: 'https://www.linkedin.com/in/beni-daniel-01805932a', portfolio: 'https://danielbeni-portfolio.vercel.app/', highlight: true },
  { name: 'GERMAIN NKOUMOU', role: 'Backend & logique métier', image: '/assets/team_ultime/nkoumou.jpeg', github: 'germain', linkedin: '#', portfolio: '#', highlight: false },
  { name: 'ERIC EVINA', role: 'Fullstack', image: '/assets/team_ultime/evina.jpeg', github: 'eric', linkedin: 'https://www.linkedin.com/in/eric-evina-mbaho-a00256401?utm_source=share_via&utm_content=profile&utm_medium=member_ios', portfolio: '#', highlight: false },
  { name: 'ANGE DJOUKOUO', role: 'Données & import', image: '/assets/team_ultime/djoukouo.jpeg', github: 'ange', linkedin: '#', portfolio: '#', highlight: false },
  { name: 'BIENVENU BALAWE', role: 'Backend & Data Engineer', image: '/assets/team_ultime/balawe.jpeg', github: 'bienvenue', linkedin: 'https://www.linkedin.com/in/bienvenu-balawe-ndikwa-1618b7433?utm_source=share_via&utm_content=profile&utm_medium=member_android', portfolio: '#', highlight: false },
  { name: 'DIVINE SOUNDJOCK', role: 'Chef projet & Contribution métier', image: '/assets/team_ultime/soundjock.jpeg', github: 'divine', linkedin: '#', portfolio: '#', highlight: false },
]

function MemberModal({ person, onClose }) {
  if (!person) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Profil ${person.name}`}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-slate-900/10 text-slate-600 hover:bg-slate-900 hover:text-white transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className="h-24 bg-gradient-to-br from-sky-900 via-slate-900 to-sky-700" />
        <div className="px-6 pb-6">
          <div className="relative -mt-12 size-24 overflow-hidden rounded-2xl border-4 border-white shadow-lg">
            <img src={person.image} alt={person.name} className="h-full w-full object-cover" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold leading-tight text-slate-900">{person.name}</h3>
          <p className="mt-1 text-sm font-medium text-sky-700">{person.role}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A66C2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#084e96] transition">
              LinkedIn <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <a href={person.portfolio} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition">
              Portfolio <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage({ onNavigate }) {
  const { isAuthenticated, isAdmin, isOperator, isViewer } = useAuth()
  const rootRef = useRef(null)
  const [modal, setModal] = useState(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(['.hero-brand', '.hero-title', '.hero-lead', '.hero-cta', '.reveal-head', '.reveal-item'], { clearProps: 'all', autoAlpha: 1 })
      })
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const heroTitle = rootRef.current?.querySelector('.hero-title')
        let split
        if (heroTitle) {
          split = SplitText.create(heroTitle, { type: 'words,lines', linesClass: 'hero-line', wordsClass: 'hero-word', aria: 'auto' })
        }
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.from('.hero-brand', { autoAlpha: 0, y: 14, duration: 0.5 })
          .from(split?.words || '.hero-title', { autoAlpha: 0, yPercent: 110, duration: 0.7, stagger: 0.04, ease: 'power4.out' }, '-=0.2')
          .from('.hero-lead', { autoAlpha: 0, y: 18, duration: 0.5 }, '-=0.35')
          .from('.hero-cta', { autoAlpha: 0, y: 16, duration: 0.4, stagger: 0.07 }, '-=0.25')

        gsap.utils.toArray('.reveal-section').forEach((section) => {
          const heads = section.querySelectorAll('.reveal-head')
          const items = section.querySelectorAll('.reveal-item')
          if (heads.length) gsap.from(heads, { autoAlpha: 0, y: 28, duration: 0.6, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: section, start: 'top 78%', once: true } })
          if (items.length) gsap.from(items, { autoAlpha: 0, y: 32, duration: 0.6, ease: 'power2.out', stagger: 0.08, scrollTrigger: { trigger: section, start: 'top 72%', once: true } })
        })
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

  return (
    <div ref={rootRef} className="relative min-h-screen bg-white text-slate-900">
      <div className="relative z-40">
        <LandingNav onNavigate={onNavigate} />
      </div>

      <main>
        <section className="relative isolate overflow-hidden bg-slate-950">
          <img src={ILLU.hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.55]" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-sky-950/60" aria-hidden="true" />
          <div className="relative z-10 mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16">
            <p className="hero-brand inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-sky-200 backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> CAMTEL · Lutte contre la fraude
            </p>
            <h1 className="hero-title mt-6 max-w-3xl font-display text-[2.1rem] font-bold leading-[0.98] tracking-tight text-white sm:text-5xl lg:text-[3.6rem]">
              Chaque litre tracé.<br />
              <span className="text-sky-300">Chaque heure comptée.</span>
            </h1>
            <p className="hero-lead mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
              CarburFlow réconcilie stock, consommation et temps de fonctionnement — de la cuve principale au groupe — et ne lève qu’une alerte exploitable.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="lg" className="hero-cta bg-white text-slate-900 hover:bg-slate-100 shadow-lg" onClick={goApp}>
                Accéder à CarburFlow <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" className="hero-cta border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white hover:text-slate-900" onClick={() => onNavigate('login')}>
                Se connecter
              </Button>
            </div>
          </div>
        </section>

        <section className="reveal-section border-y border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Déployé & auditable</p>
            <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-700">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-sky-700" /> CAMTEL — Direction Réseau</span>
              <span className="hidden sm:inline text-slate-300">·</span>
              <span>Traçabilité justifiée</span>
              <span className="hidden sm:inline text-slate-300">·</span>
              <span>CSV import contrôlé</span>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">v1.0 — Sept 2026</span>
          </div>
        </section>

        <section className="reveal-section mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Solution</p>
            <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Centraliser. Comparer. Signaler.
            </h2>
            <p className="reveal-head mt-4 text-base leading-relaxed text-slate-600">
              Un seul flux : import CSV, réconciliation CP+CJ, détection d’écarts. Pas de zone grise.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              { icon: Fuel, title: 'Centraliser', text: 'Import CSV contrôlé. Hiérarchie Site → CP → CJ → GE respectée.' },
              { icon: Gauge, title: 'Comparer', text: 'Conso horaire N vs N-1, stock N vs N-1, autonomie déduite. Écart > 15 % = signal.' },
              { icon: ShieldCheck, title: 'Signaler', text: '5 typologies, 4 priorités. L’alerte attire l’attention — le responsable décide.' },
            ].map((s) => {
              const Icon = s.icon
              return (
                <article key={s.title} className="reveal-item rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white"><Icon className="size-5" /></span>
                  <h3 className="mt-5 font-display text-xl font-bold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="reveal-section bg-slate-50 py-14 lg:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Équipe</p>
              <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Produit, data et terrain — même exigence.
              </h2>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
              {team.map((person) => (
                <button
                  key={person.github}
                  type="button"
                  onClick={() => setModal(person)}
                  className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                  aria-label={`Voir le profil de ${person.name}`}
                  title="Voir le profil"
                >
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                    <div className="aspect-[4/5] w-full overflow-hidden">
                      <img src={person.image} alt="" aria-hidden="true" className="h-full w-full object-cover opacity-90 transition group-hover:scale-105" loading="lazy" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 to-transparent p-3">
                      <p className="text-sm font-bold leading-tight text-white">{person.name}</p>
                      <p className="text-xs leading-tight text-sky-200">{person.role}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {modal && <MemberModal person={modal} onClose={() => setModal(null)} />}
          </div>
        </section>

        <section className="reveal-section mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Preuve</p>
            <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Du réseau entier au groupe — en deux clics.
            </h2>
            <p className="reveal-head mt-4 text-base leading-relaxed text-slate-600">
              Même données, deux lectures : vision réseau et détail groupe. Sans resaisie.
            </p>
          </div>
          <div className="reveal-item mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,76,110,0.10)]">
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
                {[
                  { label: 'Bepanda', pct: 18, tone: 'bg-red-500', status: 'Critique · 11h' },
                  { label: 'Bonabéri', pct: 42, tone: 'bg-amber-500', status: 'À surveiller · 28h' },
                  { label: 'Nsimalen', pct: 68, tone: 'bg-emerald-500', status: 'Normal · 4j 2h' },
                  { label: 'Akwa', pct: 55, tone: 'bg-amber-500', status: 'Normal · 2j 14h' },
                ].map((b) => (
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
                  {[38, 52, 41, 66, 58, 74, 62].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-sky-800 to-sky-500" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-xs font-medium text-slate-400">
                  <span>Lun</span><span>Dim</span><span className="font-bold text-sky-700">▼ -8.4% vs N-1</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={goApp}>Ouvrir le dashboard <ArrowRight className="size-4" /></Button>
            <Button variant="ghost" onClick={() => onNavigate('sites')}>Voir les sites</Button>
          </div>
        </section>

        <section className="reveal-section bg-slate-900 py-14 text-white lg:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Accès & responsabilités</p>
              <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Un même système, des droits séparés.
              </h2>
            </div>
            <div className="reveal-item mt-8 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      <th className="px-4 py-3">Capacité</th>
                      <th className="px-4 py-3 text-center">Responsable</th>
                      <th className="px-4 py-3 text-center">Opérateur</th>
                      <th className="px-4 py-3 text-center">Consultation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {[
                      { label: 'Dashboard & alertes', vals: [true, false, false] },
                      { label: 'Sites & groupes', vals: [true, true, true] },
                      { label: 'Relevés — import & envoi', vals: [true, true, false] },
                      { label: 'Relevés — lecture seule', vals: [true, true, true] },
                      { label: 'Traiter une alerte', vals: [true, false, false] },
                      { label: 'Notifications & profil', vals: [true, true, true] },
                    ].map((row) => (
                      <tr key={row.label} className="text-slate-300">
                        <td className="px-4 py-3 font-medium text-white">{row.label}</td>
                        {row.vals.map((v, i) => (
                          <td key={i} className="px-4 py-3 text-center">
                            {v ? <span className="inline-grid size-6 place-items-center rounded-full bg-emerald-500/10 text-emerald-400"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span> : <span className="text-slate-500">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
          <img src={ILLU.control} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-slate-950/85" aria-hidden="true" />
          <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-start gap-6 text-white md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Passez du relevé à la décision.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-sky-100">
                Centralisez le suivi, surveillez l’autonomie, instruisez les écarts — avec la même donnée que le terrain.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl" onClick={goApp}>
                Accéder à CarburFlow <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white hover:text-slate-900" onClick={() => onNavigate('login')}>
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
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Produit</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><button type="button" onClick={() => onNavigate('login')} className="hover:text-sky-700">Solution</button></li>
              <li><button type="button" onClick={() => onNavigate('login')} className="hover:text-sky-700">Accès</button></li>
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
