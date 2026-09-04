import React, { useState } from 'react'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import BrandLogo from '../BrandLogo.jsx'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext.jsx'
import { useTheme } from '@/context/ThemeContext.jsx'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Accueil', id: 'home' },
  { label: 'Le défi', id: 'challenge' },
  { label: 'Comment ça marche', id: 'how-it-works' },
  { label: 'Équipe', id: 'about' },
]

function LandingNav({ onNavigate }) {
  const { isAuthenticated, isAdmin, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const go = (view) => {
    setOpen(false)
    onNavigate(view)
  }

  const scrollToSection = (id) => {
    setOpen(false)
    const scroll = () => {
      const node = document.getElementById(id)
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    if (location.pathname !== '/') {
      onNavigate('home')
      window.setTimeout(scroll, 80)
      return
    }

    scroll()
  }

  const isDark = theme === 'dark'

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => go('home')}
          className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandLogo variant="icon" className="size-9 rounded-md object-cover" />
          <span className="font-display text-lg font-semibold tracking-tight text-petrol">
            CarburFlow
          </span>
        </button>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Navigation principale">
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollToSection(link.id)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
            >
              {link.label}
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => { e.preventDefault(); toggleTheme() }}
            aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          {isAuthenticated ? (
            <>
              <Button type="button" onClick={() => go(isAdmin ? 'dashboard' : 'operator')}>
                Mon espace
              </Button>
              <Button type="button" variant="outline" onClick={() => { logout(); go('home') }}>
                Déconnexion
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => go('login')}>
                Connexion
              </Button>
              <Button type="button" onClick={() => go('register')}>
                Inscription
              </Button>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => { e.preventDefault(); toggleTheme() }}
            aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-expanded={open}
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      <div className={cn('border-t border-border/70 bg-background md:hidden', open ? 'block' : 'hidden')}>
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollToSection(link.id)}
              className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            >
              {link.label}
            </button>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
            {isAuthenticated ? (
              <>
                <Button type="button" onClick={() => go(isAdmin ? 'dashboard' : 'operator')}>
                  Mon espace
                </Button>
                <Button type="button" variant="outline" onClick={() => { logout(); go('home') }}>
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => go('login')}>
                  Connexion
                </Button>
                <Button type="button" onClick={() => go('register')}>
                  Inscription
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default LandingNav
