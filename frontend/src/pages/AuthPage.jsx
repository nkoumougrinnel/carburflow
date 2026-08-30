import React, { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAuth, homeViewForUser } from '@/context/AuthContext.jsx'
import { useTheme } from '@/context/ThemeContext.jsx'
import { SignInPage } from '@/components/ui/sign-in'
import { SignUpPage } from '@/components/ui/sign-up'
import { Button } from '@/components/ui/button'
import BrandLogo from '../components/BrandLogo.jsx'
import PageLoader from '../components/PageLoader.jsx'

/* Login : contexte carburant / énergie (cuves, infrastructure) — même traitement photo que register */
const LOGIN_HERO =
  'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=2160&q=80'

/* Register : contexte terrain / opérations industrielles */
const REGISTER_HERO =
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=2160&q=80'

function AuthPage({ onNavigate, initialMode = 'login' }) {
  const { login, register, isAuthenticated, isAdmin, isOperator, isViewer } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login')
  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setMode(initialMode === 'register' ? 'register' : 'login')
  }, [initialMode])

  useEffect(() => {
    if (isAuthenticated) {
      onNavigate(homeViewForUser({ isAdmin, isOperator, isViewer }))
    }
  }, [isAuthenticated, isAdmin, isOperator, isViewer, onNavigate])

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    if (error) setError('')
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    onNavigate(nextMode === 'register' ? 'register' : 'login')
  }

  const handleSignIn = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const formData = new FormData(event.currentTarget)
      const username = String(formData.get('username') || '').trim()
      const password = String(formData.get('password') || '')
      const user = await login(username, password)
      onNavigate(homeViewForUser(user))
    } catch (err) {
      setError(err.message || 'Impossible de se connecter.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (form.password !== form.password_confirm) {
        setError('Les mots de passe ne correspondent pas.')
        return
      }
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        password: form.password,
        password_confirm: form.password_confirm,
      })
      onNavigate('viewer')
    } catch (err) {
      setError(err.message || 'Impossible de continuer.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      {submitting && (
        <div className="cf-auth-loading-overlay" role="status" aria-live="polite">
          <PageLoader
            fullscreen={false}
            label={mode === 'login' ? 'Connexion en cours…' : 'Création du compte…'}
          />
        </div>
      )}

      <div className="absolute left-4 top-4 z-20 flex items-center justify-start gap-2 sm:left-6 sm:top-6 sm:gap-3">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 rounded-lg bg-background/75 px-2 py-1.5 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandLogo variant="icon" className="size-8 rounded-md object-contain bg-black p-0.5" />
          <span className="font-display text-base font-semibold text-petrol">CarburFlow</span>
        </button>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('home')}>
          ← Retour
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={(e) => { e.preventDefault(); toggleTheme() }}
          aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>

      <div className="relative z-10 h-[100dvh] overflow-hidden">
        {mode === 'login' ? (
        <SignInPage
          title={
            <span className="font-display tracking-tight text-foreground">
              <span className="block text-4xl font-semibold text-petrol sm:text-5xl">CarburFlow</span>
              <span className="mt-3 block text-2xl font-semibold text-foreground sm:text-3xl">Accédez à votre espace</span>
            </span>
          }
          description="Connectez-vous à CarburFlow pour consulter les données, suivre les sites et accéder aux fonctionnalités correspondant à votre profil."
          heroImageSrc={LOGIN_HERO}
          heroHeadline="Chaque litre compte."
          heroSubline="Une vision centralisée du carburant, des sites et des groupes électrogènes."
          heroPhrases={[
            'Suivez vos installations, site par site.',
            'Analysez consommation, fonctionnement et autonomie.',
            'Identifiez les écarts nécessitant votre attention.',
          ]}
          onSignIn={handleSignIn}
          onCreateAccount={() => switchMode('register')}
          error={error}
          submitting={submitting}
        />
      ) : (
        <SignUpPage
          heroImageSrc={REGISTER_HERO}
          heroHeadline="Entrez dans l’univers CarburFlow."
          heroSubline="Une plateforme centralisée pour suivre les données carburant, les installations et les situations nécessitant votre attention."
          heroPhrases={[
            'Centralisez vos données et vos relevés.',
            'Retrouvez facilement votre historique.',
            'Accédez aux outils adaptés à votre rôle.',
          ]}
          onSignUp={handleRegister}
          onSignIn={() => switchMode('login')}
          error={error}
          submitting={submitting}
          form={form}
          onFieldChange={updateField}
        />
        )}
      </div>
    </div>
  )
}

export default AuthPage
