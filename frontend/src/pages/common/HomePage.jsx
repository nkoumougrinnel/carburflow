import React, { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Database,
  Fuel,
  Gauge,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react'

import LandingNav from '@/components/landing/LandingNav.jsx'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth, homeViewForUser } from '@/context/AuthContext.jsx'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

const ILLU = {
  hero:
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=2400&q=80',
}

const team = [
  {
    name: 'DANIEL BENI MPODOL',
    role: 'Frontend, UX & AI Engineer',
    image: '/assets/team_ultime/daniel.jpeg',
    linkedin:
      'https://www.linkedin.com/in/beni-daniel-01805932a',
    portfolio: 'https://danielbeni-portfolio.vercel.app/',
  },
  {
    name: 'GERMAIN NKOUMOU',
    role: 'Lead Tech & Fullstack',
    image: '/assets/team_ultime/nkoumou.jpeg',
    linkedin: 'https://cm.linkedin.com/in/nkoumougrinnel',
    portfolio: 'https://nkoumoutjade.netlify.app/',
  },
  {
    name: 'ERIC EVINA',
    role: 'Fullstack',
    image: '/assets/team_ultime/evina.jpeg',
    linkedin: 'https://www.linkedin.com/in/eric-evina-mbaho',
    portfolio: 'https://github.com/Evijo30-max/',
  },
  {
    name: 'ANGE DJOUKOUO',
    role: 'DevOps',
    image: '/assets/team_ultime/djoukouo.jpeg',
    linkedin: '#',
    portfolio: 'https://github.com/rayannekengne2006-cmd',
  },
  {
    name: 'BIENVENU BALAWE',
    role: 'Data Engineer',
    image: '/assets/team_ultime/balawe.jpeg',
    linkedin: 'https://www.linkedin.com/in/bienvenu-balawe-ndikwa',
    portfolio: '#',
  },
  {
    name: 'DIVINE SOUNDJOCK',
    role: 'Chef de projet',
    image: '/assets/team_ultime/soundjock.jpeg',
    linkedin: '#',
    portfolio: '#',
  },
]

function MemberModal({ person, onClose }) {
  if (!person) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Profil ${person.name}`}
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-white/90 text-slate-600 transition hover:bg-slate-900 hover:text-white"
        >
          <X className="size-4" />
        </button>

        <div className="h-24 bg-gradient-to-br from-sky-900 via-slate-900 to-sky-700" />

        <div className="px-6 pb-6">
          <div className="relative -mt-12 size-24 overflow-hidden rounded-2xl border-4 border-white shadow-lg">
            <img
              src={person.image}
              alt={person.name}
              className="h-full w-full object-cover"
            />
          </div>

          <h3 className="mt-4 font-display text-lg font-bold leading-tight text-slate-900">
            {person.name}
          </h3>

          <p className="mt-1 text-sm font-medium text-sky-700">
            {person.role}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <a
              href={person.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={person.linkedin === '#'}
              onClick={(event) => {
                if (person.linkedin === '#') event.preventDefault()
              }}
              className="inline-flex items-center justify-center rounded-xl bg-[#0A66C2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#084e96]"
            >
              LinkedIn
            </a>

            <a
              href={person.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={person.portfolio === '#'}
              onClick={(event) => {
                if (person.portfolio === '#') event.preventDefault()
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Portfolio
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-3xl">
      <p className="reveal-head text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
        {eyebrow}
      </p>

      <h2 className="reveal-head mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>

      {description && (
        <p className="reveal-head mt-4 text-base leading-7 text-slate-600">
          {description}
        </p>
      )}
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
        gsap.set(
          [
            '.hero-brand',
            '.hero-title',
            '.hero-lead',
            '.hero-cta',
            '.reveal-head',
            '.reveal-item',
          ],
          {
            clearProps: 'all',
            autoAlpha: 1,
          },
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

        const tl = gsap.timeline({
          defaults: {
            ease: 'power3.out',
          },
        })

        tl.from('.hero-brand', {
          autoAlpha: 0,
          y: 14,
          duration: 0.5,
        })
          .from(
            split?.words || '.hero-title',
            {
              autoAlpha: 0,
              yPercent: 110,
              duration: 0.7,
              stagger: 0.04,
              ease: 'power4.out',
            },
            '-=0.2',
          )
          .from(
            '.hero-lead',
            {
              autoAlpha: 0,
              y: 18,
              duration: 0.5,
            },
            '-=0.35',
          )
          .from(
            '.hero-cta',
            {
              autoAlpha: 0,
              y: 16,
              duration: 0.4,
            },
            '-=0.25',
          )

        gsap.utils.toArray('.reveal-section').forEach((section) => {
          const heads = section.querySelectorAll('.reveal-head')
          const items = section.querySelectorAll('.reveal-item')

          if (heads.length) {
            gsap.from(heads, {
              autoAlpha: 0,
              y: 26,
              duration: 0.55,
              ease: 'power3.out',
              stagger: 0.06,
              scrollTrigger: {
                trigger: section,
                start: 'top 80%',
                once: true,
              },
            })
          }

          if (items.length) {
            gsap.from(items, {
              autoAlpha: 0,
              y: 30,
              duration: 0.55,
              ease: 'power2.out',
              stagger: 0.08,
              scrollTrigger: {
                trigger: section,
                start: 'top 74%',
                once: true,
              },
            })
          }
        })

        return () => split?.revert?.()
      })

      return () => mm.revert()
    },
    { scope: rootRef },
  )

  const goApp = () => {
    if (!isAuthenticated) {
      onNavigate('login')
      return
    }

    onNavigate(
      homeViewForUser({
        isAdmin,
        isOperator,
        isViewer,
      }),
    )
  }

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen bg-white text-slate-900"
    >
      {/* =========================================================
          NAV
      ========================================================= */}
      <div className="relative z-50">
        <LandingNav onNavigate={onNavigate} />
      </div>

      <main>
        {/* =========================================================
            1. HERO
        ========================================================= */}
        <section className="relative isolate overflow-hidden bg-slate-950">
          <img
            src={ILLU.hero}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-[0.38]"
            fetchPriority="high"
          />

          <div
            className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/60"
            aria-hidden="true"
          />

          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(14,165,233,.20),transparent_35%)]"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1fr_.9fr] lg:px-8 lg:pb-20 lg:pt-20">
            <div>
              <p className="hero-brand inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-sky-200 backdrop-blur">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                CAMTEL · Lutte contre la fraude
              </p>

              <h1 className="hero-title mt-6 max-w-3xl font-display text-[2.8rem] font-bold leading-[0.96] tracking-tight text-white sm:text-6xl lg:text-[4.3rem]">
                Chaque litre tracé.
                <br />
                <span className="text-sky-300">
                  Chaque heure comptée.
                </span>
              </h1>

              <p className="hero-lead mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                CarburFlow digitalise le suivi du carburant des sites
                techniques, de la collecte des relevés jusqu’à l’analyse des
                écarts.
              </p>

              <div className="hero-cta mt-8">
                <Button
                  size="lg"
                  onClick={goApp}
                  className="bg-white px-6 text-slate-950 shadow-xl hover:bg-slate-100"
                >
                  Accéder à CarburFlow
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>

            {/* Aperçu produit */}
            <div className="hero-cta relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-sky-500/10 blur-3xl" />

              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300">
                      Aperçu
                    </p>

                    <p className="mt-1 text-sm font-semibold text-white">
                      Situation du parc
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Données à jour
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                  {[
                    ['Sites', '17'],
                    ['Groupes', '42'],
                    ['Critiques', '3'],
                    ['Surveillance', '5'],
                  ].map(([label, value], index) => (
                    <div
                      key={label}
                      className={[
                        'rounded-xl p-3',
                        index === 2
                          ? 'bg-red-400/10'
                          : index === 3
                            ? 'bg-amber-400/10'
                            : 'bg-white/5',
                      ].join(' ')}
                    >
                      <p className="text-[10px] font-semibold text-slate-400">
                        {label}
                      </p>

                      <p
                        className={[
                          'mt-2 text-xl font-bold',
                          index === 2
                            ? 'text-red-300'
                            : index === 3
                              ? 'text-amber-300'
                              : 'text-white',
                        ].join(' ')}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 p-4">
                  <p className="text-xs font-bold text-white">
                    Derniers événements
                  </p>

                  <div className="mt-3 space-y-2">
                    {[
                      ['Bepanda', 'Écart de consommation', '+65,6 %', 'red'],
                      ['Bonabéri', 'Autonomie', '18 h', 'amber'],
                      ['Akwa', 'Variation de stock', '-12,4 %', 'amber'],
                    ].map(([site, label, value, tone]) => (
                      <div
                        key={`${site}-${label}`}
                        className="flex items-center gap-3 rounded-xl bg-white/[0.045] p-3"
                      >
                        <span
                          className={[
                            'size-2.5 shrink-0 rounded-full',
                            tone === 'red'
                              ? 'bg-red-400'
                              : 'bg-amber-400',
                          ].join(' ')}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white">
                            {site}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {label}
                          </p>
                        </div>

                        <span className="text-xs font-bold text-slate-300">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            2. PROBLEME / SOLUTION
        ========================================================= */}
        <section id="solution" className="reveal-section scroll-mt-20 border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <SectionHeading
              eyebrow="Pourquoi CarburFlow ?"
              title="Le suivi carburant ne devrait pas être une succession de fichiers."
              description="CarburFlow transforme les relevés terrain en une donnée structurée, comparable et exploitable."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Database,
                  title: 'Centraliser',
                  text: 'Les relevés sont regroupés dans une même plateforme.',
                },
                {
                  icon: BarChart3,
                  title: 'Comparer',
                  text: 'Stock, consommation et fonctionnement sont rapprochés.',
                },
                {
                  icon: AlertTriangle,
                  title: 'Signaler',
                  text: 'Les écarts significatifs sont mis en évidence.',
                },
              ].map((item) => {
                const Icon = item.icon

                return (
                  <article
                    key={item.title}
                    className="reveal-item rounded-2xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <span className="grid size-11 place-items-center rounded-xl bg-slate-900 text-white">
                      <Icon className="size-5" />
                    </span>

                    <h3 className="mt-5 font-display text-xl font-bold text-slate-900">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.text}
                    </p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            3. CARBURFLOW EN ACTION
        ========================================================= */}
        <section id="preuve" className="reveal-section scroll-mt-20 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeading
            eyebrow="CarburFlow en action"
            title="Du réseau au groupe, en un regard."
            description="Une même donnée permet de passer de la vision globale au détail opérationnel."
          />

          <div className="reveal-item mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_20px_60px_rgba(15,23,42,.08)] sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
              {/* Dashboard */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">
                      Dashboard
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      Vue du parc
                    </p>
                  </div>

                  <Gauge className="size-5 text-slate-300" />
                </div>

                <div className="grid grid-cols-3 gap-3 p-4">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-[10px] font-semibold text-emerald-700">
                      Opérationnels
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      12
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50 p-4">
                    <p className="text-[10px] font-semibold text-amber-700">
                      Surveillance
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      2
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-[10px] font-semibold text-red-700">
                      Critiques
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      3
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-5">
                  <p className="text-xs font-bold text-slate-800">
                    Consommation — 7 derniers jours
                  </p>

                  <div className="mt-4 flex h-36 items-end gap-2">
                    {[42, 58, 46, 71, 57, 76, 64].map((height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-md bg-gradient-to-t from-sky-800 to-sky-400"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>

                  <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-400">
                    <span>Lun</span>
                    <span>Dim</span>
                    <span className="font-bold text-sky-700">
                      -8,4 % vs N-1
                    </span>
                  </div>
                </div>
              </div>

              {/* Groupe */}
              <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-white">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300">
                      Groupe
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      G1-SDMO-830
                    </p>

                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Bepanda International
                    </p>
                  </div>

                  <span className="rounded-full bg-red-400/10 px-3 py-1 text-[10px] font-bold text-red-300">
                    17 h 54
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-4">
                  {[
                    ['Stock', '148 L'],
                    ['Conso.', '8,3 L/h'],
                    ['Fonction.', '12 h 42'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-white/[0.05] p-3"
                    >
                      <p className="text-[10px] text-slate-500">{label}</p>
                      <p className="mt-1 text-sm font-bold">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 pt-1">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold">
                        Écart de consommation
                      </p>

                      <span className="text-[10px] font-bold text-red-300">
                        +65,6 %
                      </span>
                    </div>

                    <div className="mt-4 flex items-end gap-2">
                      {[24, 32, 38, 49, 58, 72, 88].map(
                        (height, index) => (
                          <div
                            key={index}
                            className="h-24 flex-1 rounded-t-md bg-sky-400/70"
                            style={{
                              height: `${height * 0.8}%`,
                            }}
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3 text-[10px] text-slate-400">
                  <ShieldCheck className="size-3.5 text-sky-300" />
                  Analyse à partir des données du groupe
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
              <span>Réseau</span>
              <ChevronRight className="size-4" />
              <span>Site</span>
              <ChevronRight className="size-4" />
              <span className="text-sky-700">Groupe</span>
            </div>
          </div>
        </section>

        {/* =========================================================
            4. ALERTES
        ========================================================= */}
        <section id="alerts" className="reveal-section scroll-mt-20 bg-slate-50">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_.9fr] lg:px-8 lg:py-20">
            <div>
              <SectionHeading
                eyebrow="Alertes"
                title="Une alerte signale. Le responsable décide."
                description="CarburFlow détecte les écarts qui méritent une attention particulière, sans déclarer lui-même une fraude."
              />
            </div>

            <div className="reveal-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <AlertTriangle className="size-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400">
                    31/08/2026 · 09:15
                  </p>

                  <p className="mt-1 text-base font-bold text-slate-900">
                    Écart de consommation horaire
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                      +65,6 %
                    </span>

                    <span className="text-xs font-medium text-slate-500">
                      G1-SDMO-830 · Bepanda
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs leading-5 text-slate-600">
                  L’écart est détecté automatiquement. Le responsable
                  consulte ensuite les données du groupe pour comprendre la
                  situation et décider de la suite.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            5. EQUIPE
        ========================================================= */}
        <section id="about" className="reveal-section scroll-mt-20 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeading
            eyebrow="Équipe"
            title="Une équipe au croisement du produit, de la donnée et du métier."
            description="CarburFlow réunit développement, UX, data et compréhension métier autour d’un même projet."
          />

          <div className="team-editorial-grid">
            {team.map((person, index) => (
              <button
                key={person.name}
                type="button"
                onClick={() => setModal(person)}
                className={`team-editorial-member team-editorial-member--${index % 2 === 0 ? 'high' : 'low'} group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2`}
                aria-label={`Voir le profil de ${person.name}`}
              >
                <div className="team-editorial-card">
                  <div className="team-editorial-photo">
                    <img
                      src={person.image}
                      alt={person.name}
                      className="team-editorial-image"
                      loading="lazy"
                    />
                  </div>

                  <div className="team-editorial-copy">
                    <p className="team-editorial-name">
                      {person.name}
                    </p>

                    <p className="team-editorial-role">
                      {person.role}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* =========================================================
            6. CTA FINAL
        ========================================================= */}
        <section id="acces" className="relative isolate scroll-mt-20 overflow-hidden bg-slate-950">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(14,165,233,.18),transparent_36%),radial-gradient(circle_at_85%_70%,rgba(34,211,238,.09),transparent_30%)]"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8 lg:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
                CarburFlow
              </p>

              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Passez du relevé à la décision.
              </h2>

              <p className="mt-3 text-base leading-7 text-slate-300">
                Centralisez le suivi, surveillez le parc et analysez les
                écarts depuis une seule plateforme.
              </p>
            </div>

            <Button
              size="lg"
              onClick={goApp}
              className="shrink-0 bg-white px-6 text-slate-950 shadow-xl hover:bg-slate-100"
            >
              Accéder à CarburFlow
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      </main>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-display text-lg font-bold text-slate-900">
              CarburFlow · CAMTEL
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Supervision carburant — du relevé terrain à l’alerte exploitable.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-slate-500">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="transition hover:text-sky-700"
            >
              Se connecter
            </button>

            <span className="text-slate-300">·</span>

            <span>Version 1.0 · Sept 2026</span>
          </div>
        </div>

        <Separator />

        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-slate-400 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© 2026 CarburFlow · CAMTEL</p>
          <p>Digitalisation du suivi carburant</p>
        </div>
      </footer>

      {modal && (
        <MemberModal
          person={modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}