import React, { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import {
  ArrowRight,
  ClipboardList,
  FileUp,
  Gauge,
  Layers3,
  ShieldCheck,
  TriangleAlert,
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
  gauge: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=1200&q=80',
  truck: 'https://images.unsplash.com/photo-1601584115197-b54892c1f236?auto=format&fit=crop&w=1200&q=80',
  plant: 'https://images.unsplash.com/photo-1565514020176-efe690483095?auto=format&fit=crop&w=1200&q=80',
}

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Relever',
    text: 'L’opérateur complète la fiche Excel pré-remplie, une ligne par cuve et par groupe.',
    image: ILLU.gauge,
  },
  {
    icon: FileUp,
    title: 'Déposer',
    text: 'Le fichier est importé en quelques secondes, avec un historique clair des envois.',
    image: ILLU.truck,
  },
  {
    icon: Gauge,
    title: 'Piloter',
    text: 'Le responsable suit niveaux, alertes et consommation sur tous les sites.',
    image: ILLU.plant,
  },
]

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

function HomePage({ onNavigate }) {
  const { isAuthenticated, isAdmin, isOperator, isViewer } = useAuth()
  const rootRef = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(
          ['.hero-brand', '.hero-title', '.hero-lead', '.hero-cta', '.reveal-head', '.reveal-item', '.showcase-panel', '.final-cta-inner', '.illu-frame'],
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
          .from('.hero-cta', { autoAlpha: 0, y: 18, duration: 0.45, stagger: 0.08 }, '-=0.3')

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
    onNavigate(homeViewForUser({ isAdmin, isOperator, isViewer }))
  }

  const renderHeroCtas = () => {
    if (isAuthenticated) {
      return (
        <Button size="lg" className="hero-cta" onClick={goApp}>
          Ouvrir mon espace
          <ArrowRight data-icon="inline-end" />
        </Button>
      )
    }
    return (
      <>
        <Button size="lg" className="hero-cta cf-cta-light bg-white text-petrol hover:bg-white/90" onClick={() => onNavigate('login')}>
          Se connecter
        </Button>
        <Button size="lg" variant="outline" className="hero-cta border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => onNavigate('register')}>
          Créer un compte
        </Button>
      </>
    )
  }

  return (
    <div ref={rootRef} className="relative min-h-screen bg-background text-foreground">
      <div className="landing-nav-anim relative z-40">
        <LandingNav onNavigate={onNavigate} />
      </div>

      <main>
        {/* Hero full-bleed — brand + 1 titre + 1 lead + CTA + image dominante */}
        <section className="hero-section relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
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
            <div className="mt-8 flex flex-wrap items-center gap-3">{renderHeroCtas()}</div>
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

        <section className="reveal-section mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
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

        <section className="showcase-section reveal-section border-y border-border/70 bg-card/60 py-16 lg:py-20">
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

        <section className="reveal-section mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="reveal-head font-display text-3xl font-semibold tracking-tight">
              Du terrain au pilotage
            </h2>
            <p className="reveal-head mt-3 text-lg text-muted-foreground">
              Trois gestes simples. Un flux unique pour toute l’équipe.
            </p>
          </div>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <li key={step.title} className="reveal-item flex flex-col gap-4">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={step.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-petrol-soft text-petrol">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="font-display text-sm font-semibold text-muted-foreground">0{index + 1}</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </li>
              )
            })}
          </ol>
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
                <li><strong className="text-foreground">Opérateur</strong> — sites, dépôt de relevé, historique.</li>
                <li><strong className="text-foreground">Utilisateur</strong> — consultation des sites et profil.</li>
              </ul>
              <div className="reveal-item flex flex-wrap gap-3">
                <Button onClick={() => onNavigate('login')}>
                  Se connecter
                  <ArrowRight data-icon="inline-end" />
                </Button>
                <Button variant="secondary" onClick={() => onNavigate('register')}>
                  Créer un compte
                </Button>
              </div>
            </div>
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
    </div>
  )
}

export default HomePage
