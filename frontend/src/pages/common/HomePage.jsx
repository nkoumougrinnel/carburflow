import React, { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import {
  ArrowRight,
  BarChart3,
  Building2,
  CircleAlert,
  ClipboardCheck,
  Cpu,
  Gauge,
  Layers3,
  ShieldCheck,
  ShieldEllipsis,
  TimerReset,
  TrendingUp,
  Users,
  Wrench,
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
  team: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=80',
  gauge: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=1200&q=80',
  truck: 'https://images.unsplash.com/photo-1601584115197-b54892c1f236?auto=format&fit=crop&w=1200&q=80',
  plant: 'https://images.unsplash.com/photo-1565514020176-efe690483095?auto=format&fit=crop&w=1200&q=80',
}

const challengePoints = [
  {
    title: 'Visibilité limitée',
    text: 'Difficile d’avoir une vision globale de la situation de plusieurs sites.',
  },
  {
    title: 'Données dispersées',
    text: 'Les relevés doivent être centralisés et structurés avant de pouvoir être analysés efficacement.',
  },
  {
    title: 'Écarts difficiles à identifier',
    text: 'Une variation de consommation peut passer inaperçue sans comparaison avec une référence.',
  },
  {
    title: 'Suivi manuel',
    text: 'Le contrôle et la comparaison de données répétitives peuvent mobiliser du temps qui pourrait être consacré à l’analyse.',
  },
]

const steps = [
  {
    icon: ClipboardCheck,
    title: 'Centraliser',
    text: 'Les relevés de consommation sont intégrés dans une plateforme commune.',
  },
  {
    icon: Layers3,
    title: 'Structurer',
    text: 'Les données sont organisées selon la hiérarchie technique des installations : site, cuves et groupes électrogènes.',
  },
  {
    icon: BarChart3,
    title: 'Analyser',
    text: 'CarburFlow compare consommation, fonctionnement et stock à partir des données disponibles et des références définies.',
  },
  {
    icon: CircleAlert,
    title: 'Signaler',
    text: 'Les écarts et incohérences significatifs génèrent des alertes pour attirer l’attention du Responsable.',
  },
  {
    icon: Users,
    title: 'Examiner',
    text: 'Le Responsable consulte le contexte, analyse les données et décide des suites à donner.',
  },
]

const coreCards = [
  {
    icon: Gauge,
    title: 'Consommation',
    text: 'Suivez les volumes consommés sur les périodes disponibles et observez leur évolution.',
  },
  {
    icon: TimerReset,
    title: 'Temps de fonctionnement',
    text: 'Comparez la consommation au temps réel de fonctionnement des groupes électrogènes.',
  },
  {
    icon: TrendingUp,
    title: 'Consommation horaire',
    text: 'Analysez la consommation rapportée aux heures de fonctionnement pour mieux identifier les variations.',
  },
  {
    icon: Building2,
    title: 'Stock',
    text: 'Suivez les niveaux de stock et l’autonomie estimée des installations.',
  },
  {
    icon: Cpu,
    title: 'Comparaison',
    text: 'Comparez les données actuelles à une référence pour mettre en évidence les écarts significatifs.',
  },
  {
    icon: ShieldEllipsis,
    title: 'Alertes',
    text: 'Recevez un signal lorsqu’une situation nécessite une vérification ou une intervention.',
  },
]

const situations = [
  {
    title: 'Consommation sans fonctionnement',
    text: 'Une consommation est enregistrée alors qu’aucun temps de fonctionnement n’est associé à la période concernée.',
  },
  {
    title: 'Écart de consommation',
    text: 'La consommation observée présente un écart significatif par rapport à la référence utilisée.',
  },
  {
    title: 'Autonomie critique',
    text: 'L’autonomie estimée d’un site ou d’un groupe devient inférieure au seuil défini.',
  },
  {
    title: 'Incohérence de données',
    text: 'Certaines données enregistrées ne sont pas cohérentes avec les informations disponibles pour la même période.',
  },
]

const productFeatures = [
  {
    title: 'Dashboard',
    text: 'Une vue synthétique de l’état du réseau, des alertes et des principaux indicateurs.',
  },
  {
    title: 'Sites',
    text: 'Une vision opérationnelle de chaque site : stock, consommation, évolution, autonomie et alertes.',
  },
  {
    title: 'Groupes',
    text: 'Une analyse plus détaillée du fonctionnement et de la consommation des groupes électrogènes.',
  },
  {
    title: 'Alertes',
    text: 'Une file de traitement permettant d’identifier les situations à vérifier, de les ouvrir et de conserver leur historique de traitement.',
  },
]

const roles = [
  {
    title: 'Responsable',
    text: 'Supervise le réseau, consulte les alertes, analyse les écarts et suit les éléments nécessitant une attention particulière.',
    items: ['Dashboard', 'Sites', 'Groupes', 'Alertes'],
  },
  {
    title: 'Opérateur',
    text: 'Importe les relevés, contrôle les données saisies et assure la transmission des informations nécessaires au suivi.',
    items: ['Envois', 'Sites', 'Historique'],
  },
  {
    title: 'Consultation',
    text: 'Consulte les informations qui lui sont accessibles selon son périmètre.',
    items: ['Sites', 'Données disponibles'],
  },
]

const benefits = [
  {
    title: 'Centraliser',
    text: 'Réunir les données carburant dans un même environnement au lieu de travailler à partir d’informations dispersées.',
  },
  {
    title: 'Comprendre',
    text: 'Relier consommation, fonctionnement, stock et autonomie pour mieux interpréter les évolutions observées.',
  },
  {
    title: 'Agir',
    text: 'Faire ressortir les situations nécessitant une vérification et conserver la trace des traitements réalisés.',
  },
]

const team = [
  { name: 'Amélie N.', role: 'Product owner', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80' },
  { name: 'Jean M.', role: 'Chef de projet', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80' },
  { name: 'Sophie T.', role: 'Data & alertes', image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80' },
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
          .from(split?.words || '.hero-title', { autoAlpha: 0, yPercent: 110, duration: 0.75, stagger: 0.045, ease: 'power4.out' }, '-=0.2')
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

  return (
    <div ref={rootRef} className="relative min-h-screen bg-white text-slate-900">
      <div className="landing-nav-anim relative z-40">
        <LandingNav onNavigate={onNavigate} />
      </div>

      <main>
        <section id="home" className="hero-section relative isolate overflow-hidden bg-slate-950">
          <img src={ILLU.hero} alt="" className="hero-bg-img unsplash-ph absolute inset-0 h-full w-full object-cover opacity-75" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-sky-950/55" aria-hidden="true" />
          <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
            <p className="hero-brand text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
              LUTTE CONTRE LA FRAUDE · CAMTEL
            </p>
            <div className="mt-6 max-w-3xl">
              <h1 className="hero-title font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Sécurisez le suivi du carburant de vos sites télécoms.
              </h1>
            </div>
            <p className="hero-lead mt-6 max-w-2xl text-lg leading-relaxed text-slate-200">
              CarburFlow centralise les relevés de carburant, supervise les sites et les groupes électrogènes, et signale les écarts nécessitant une analyse.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" className="hero-cta bg-white text-slate-900 hover:bg-slate-100" onClick={goApp}>
                Accéder à CarburFlow
                <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" className="hero-cta border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => onNavigate('register')}>
                Découvrir la plateforme
              </Button>
            </div>
            <p className="mt-6 text-sm text-slate-300">Une vision centralisée. Des données structurées. Des alertes exploitables.</p>
          </div>
        </section>

        <section className="illu-gallery reveal-section border-b border-slate-200 bg-slate-50 py-10 lg:py-14">
          <div className="mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
            {[
              { src: ILLU.field, label: 'Dashboard' },
              { src: ILLU.tanks, label: 'Sites' },
              { src: ILLU.control, label: 'Alertes' },
            ].map((item) => (
              <figure key={item.label} className="illu-frame group relative aspect-[4/3] overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200">
                <img src={item.src} alt={item.label} className="unsplash-ph h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-4 pb-4 pt-10 text-sm font-semibold text-white">
                  {item.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="challenge" className="reveal-section mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="reveal-head text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">LE DÉFI</p>
              <h2 className="reveal-head mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Mieux suivre le carburant pour mieux maîtriser les opérations.
              </h2>
              <p className="reveal-head mt-4 max-w-xl text-lg text-slate-600">
                Le suivi du carburant sur des sites techniques nécessite de croiser plusieurs informations : stocks, consommation, temps de fonctionnement et relevés successifs. Lorsque ces données sont dispersées ou difficiles à comparer, les écarts peuvent être détectés trop tard.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span>Site</span>
                <ArrowRight className="size-4" />
                <span>Cuve principale</span>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span>Site &gt; Cuve principale</span>
                <Gauge className="size-4 text-sky-700" />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span>Cuve journalière</span>
                <Building2 className="size-4 text-sky-700" />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span>Groupe électrogène</span>
                <Wrench className="size-4 text-sky-700" />
              </div>
              <p className="mt-6 text-sm text-slate-600">CarburFlow transforme ces données en une vision exploitable du réseau.</p>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {challengePoints.map((point) => (
              <article key={point.title} className="reveal-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-display text-lg font-semibold text-slate-900">{point.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{point.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="reveal-section bg-slate-50 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">COMMENT ÇA FONCTIONNE</p>
              <h2 className="reveal-head mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Des relevés terrain jusqu’à l’analyse.
              </h2>
              <p className="reveal-head mt-4 text-lg text-slate-600">
                CarburFlow organise le suivi du carburant autour d’un processus simple : collecter les données, les structurer, les comparer et signaler les situations qui méritent une vérification.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <article key={step.title} className="reveal-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                        <Icon className="size-5" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">0{index + 1}</span>
                    </div>
                    <h3 className="mt-5 font-display text-xl font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.text}</p>
                  </article>
                )
              })}
            </div>

            <p className="reveal-head mt-8 text-lg font-medium text-slate-800">
              CarburFlow signale une situation à examiner. La conclusion appartient au Responsable.
            </p>
          </div>
        </section>

        <section className="reveal-section mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="reveal-head text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">ANALYSE ET CONTRÔLE</p>
            <h2 className="reveal-head mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Une lecture croisée des données carburant.
            </h2>
            <p className="reveal-head mt-4 text-lg text-slate-600">
              CarburFlow ne se limite pas à enregistrer des relevés. La plateforme met en relation plusieurs indicateurs afin de faire ressortir les écarts qui méritent une attention particulière.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {coreCards.map((card) => {
              const Icon = card.icon
              return (
                <article key={card.title} className="reveal-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.text}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="reveal-section bg-slate-900 py-16 text-white lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">SITUATIONS À EXAMINER</p>
              <h2 className="reveal-head mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Transformer un écart en point de contrôle.
              </h2>
              <p className="reveal-head mt-4 text-lg text-slate-300">
                Les alertes CarburFlow reposent sur des situations mesurables. Elles ne constituent pas, à elles seules, une conclusion de fraude.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {situations.map((item) => (
                <article key={item.title} className="reveal-item rounded-2xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.text}</p>
                </article>
              ))}
            </div>

            <p className="reveal-head mt-8 text-lg font-medium text-sky-100">
              Le système attire l’attention. Le Responsable vérifie le contexte et décide.
            </p>
          </div>
        </section>

        <section className="showcase-section reveal-section border-y border-slate-200 bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">LA PLATEFORME</p>
              <h2 className="reveal-head mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Toute l’information utile, au même endroit.
              </h2>
              <p className="reveal-head mt-4 text-lg text-slate-600">
                Depuis un espace centralisé, CarburFlow permet de passer d’une vision globale du réseau à l’analyse détaillée d’un site, d’un groupe ou d’une alerte.
              </p>
            </div>


            <div className="showcase-panel mt-10">
              <DashboardShowcase />
            </div>
          </div>
        </section>

        <section className="reveal-section mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="reveal-head text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">STRUCTURE</p>
            <h2 className="reveal-head mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Du site à l’équipement, chaque niveau a sa place.
            </h2>
            <p className="reveal-head mt-4 text-lg text-slate-600">
              CarburFlow structure les informations selon la réalité technique des installations afin de permettre une navigation cohérente entre les différents niveaux d’analyse.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-center text-sm font-semibold text-slate-700">
            {['SITE', 'CUVE PRINCIPALE', 'CUVE JOURNALIÈRE', 'GROUPE ÉLECTROGÈNE', 'DONNÉES DE FONCTIONNEMENT ET DE CONSOMMATION'].map((item, index) => (
              <React.Fragment key={item}>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 shadow-sm">{item}</div>
                {index < 4 && <ArrowRight className="size-4 text-sky-700" />}
              </React.Fragment>
            ))}
          </div>

          <p className="reveal-head mt-8 text-lg text-slate-600">
            Cette organisation permet de partir d’une vue réseau, d’identifier un site concerné, puis de descendre jusqu’au groupe à l’origine des données analysées.
          </p>
        </section>

        <section className="reveal-section bg-slate-50 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">ACCÈS ET RESPONSABILITÉS</p>
              <h2 className="reveal-head mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Chaque profil dispose des outils dont il a besoin.
              </h2>
              <p className="reveal-head mt-4 text-lg text-slate-600">
                CarburFlow applique une gestion des accès adaptée aux responsabilités de chaque utilisateur.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {roles.map((role) => (
                <article key={role.title} className="reveal-item rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="font-display text-2xl font-semibold text-slate-900">{role.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{role.text}</p>
                  <ul className="mt-5 space-y-2 text-sm text-slate-700">
                    {role.items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-sky-600" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <p className="reveal-head mt-8 text-lg font-medium text-slate-800">
              Un même système, des responsabilités clairement séparées.
            </p>
          </div>
        </section>

        <section className="reveal-section mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="reveal-head text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">MAÎTRISE DES DONNÉES</p>
            <h2 className="reveal-head mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Des données suivies de la saisie au traitement.
            </h2>
            <p className="reveal-head mt-4 text-lg text-slate-600">
              Le parcours des données est conçu pour limiter les manipulations, conserver un historique des opérations et séparer la saisie des relevés de leur analyse.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <article className="reveal-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-display text-xl font-semibold text-slate-900">Import contrôlé</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">Les données sont intégrées selon un processus défini avant leur enregistrement dans la plateforme.</p>
            </article>
            <article className="reveal-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-display text-xl font-semibold text-slate-900">Séparation des responsabilités</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">La saisie et l’analyse sont assurées depuis des espaces correspondant aux rôles des utilisateurs.</p>
            </article>
            <article className="reveal-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-display text-xl font-semibold text-slate-900">Traçabilité</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">Les alertes traitées conservent leur historique et leur justification.</p>
            </article>
          </div>

          <p className="reveal-head mt-8 text-lg font-medium text-slate-800">
            Une information fiable dépend autant de la donnée que de la manière dont elle est traitée.
          </p>
        </section>

        <section className="reveal-section bg-slate-900 py-16 text-white lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">LA VALEUR AJOUTÉE</p>
              <h2 className="reveal-head mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Passer du relevé à une information exploitable.
              </h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="reveal-item rounded-2xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="font-display text-xl font-semibold text-white">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{benefit.text}</p>
                </article>
              ))}
            </div>

            <p className="reveal-head mt-8 text-lg font-medium text-sky-100">
              CarburFlow ne remplace pas l’analyse humaine. Il lui donne de meilleurs points de départ.
            </p>
          </div>
        </section>

        <section id="features" className="reveal-section mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <h2 className="reveal-head font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Une plateforme pensée pour le suivi quotidien.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[
              'Tableau de bord',
              'Gestion des sites',
              'Gestion des groupes',
              'Gestion des alertes',
              'Historique',
              'Navigation par niveaux',
            ].map((item) => (
              <div key={item} className="reveal-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                    <ShieldCheck className="size-4" />
                  </span>
                  <h3 className="font-display text-lg font-semibold text-slate-900">{item}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="reveal-section bg-slate-50 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="reveal-head text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">À PROPOS DE CARBURFLOW</p>
              <h2 className="reveal-head mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Une meilleure visibilité commence par de meilleures données.
              </h2>
              <p className="reveal-head mt-4 text-lg text-slate-600">
                Accédez à CarburFlow pour centraliser le suivi du carburant, surveiller vos installations et analyser les écarts qui nécessitent votre attention.
              </p>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-display text-2xl font-semibold text-slate-900">La team ultime</h3>
                <p className="mt-4 text-slate-600">
                  Une équipe orientée produit, analyse, sécurité et exploitation, avec un objectif simple : rendre lisible le suivi carburant sur un parc technique large et hétérogène.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {team.map((person) => (
                    <div key={person.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <img src={person.image} alt={person.name} className="unsplash-ph h-28 w-full rounded-xl object-cover" loading="lazy" />
                      <div className="mt-3">
                        <p className="font-semibold text-slate-900">{person.name}</p>
                        <p className="text-sm text-slate-500">{person.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
                <h3 className="font-display text-2xl font-semibold">La plateforme en action</h3>
                <p className="mt-4 text-slate-300">
                  Une vision globale du réseau, une lecture détaillée des sites et des groupes, et des alertes directement exploitables pour les responsables.
                </p>
                <div className="mt-6 space-y-4">
                  {[
                    'Suivi du stock et de l’autonomie',
                    'Analyse de la consommation par site et par groupe',
                    'Signalement des écarts à examiner',
                    'Historique et traçabilité des décisions',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                      <ShieldCheck className="size-4 text-sky-300" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="final-cta-section relative isolate overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
          <img src={ILLU.control} alt="" className="unsplash-ph absolute inset-0 h-full w-full object-cover opacity-90" loading="lazy" />
          <div className="absolute inset-0 bg-sky-950/90" aria-hidden="true" />
          <div className="final-cta-inner relative z-10 mx-auto flex max-w-6xl flex-col items-start gap-6 text-white md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Une meilleure visibilité commence par de meilleures données.
              </h2>
              <p className="mt-3 text-base text-sky-100">
                Accédez à CarburFlow pour centraliser le suivi du carburant, surveiller vos installations et analyser les écarts qui nécessitent votre attention.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100" onClick={goApp}>
                Accéder à CarburFlow
                <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => onNavigate('register')}>
                Se connecter
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-semibold text-sky-700">CarburFlow · CAMTEL</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#home" className="hover:text-sky-700">Accueil</a>
            <a href="#features" className="hover:text-sky-700">Fonctionnalités</a>
            <a href="#how-it-works" className="hover:text-sky-700">Connexion</a>
            <a href="#about" className="hover:text-sky-700">Inscription</a>
          </div>
        </div>
        <Separator className="bg-slate-200" />
        <div className="bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>Solution de suivi et d’analyse du carburant</p>
            <p>Solution développée dans le cadre du projet de digitalisation du suivi carburant.</p>
            <p>© 2026 CarburFlow · CAMTEL</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
