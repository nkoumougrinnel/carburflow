import React, { useEffect, useState } from 'react'
import HomePage from './pages/HomePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import SitesPage from './pages/SitesPage.jsx'
import CuvesPage from './pages/CuvesPage.jsx'
import GroupsPage from './pages/GroupsPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import OperatorHomePage from './pages/OperatorHomePage.jsx'
import OperatorSitesPage from './pages/OperatorSitesPage.jsx'
import UserHomePage from './pages/UserHomePage.jsx'
import UserSitesPage from './pages/UserSitesPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import AlertsPage from './pages/AlertsPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import InteractionShell from './components/InteractionShell.jsx'
import PageLoader from './components/PageLoader.jsx'

const ADMIN_VIEWS = new Set(['home', 'dashboard', 'sites', 'cuves', 'groups', 'reports', 'profile', 'alerts', 'notifications'])
const OPERATOR_VIEWS = new Set(['operator', 'sites', 'reports', 'profile', 'notifications'])
const VIEWER_VIEWS = new Set(['viewer', 'sites', 'profile', 'notifications'])
const PUBLIC_VIEWS = new Set(['home', 'login', 'register'])

function resolveViewFromPath(pathname) {
  if (pathname.startsWith('/groupes')) return 'groups'
  if (pathname.startsWith('/sites')) return 'sites'
  if (pathname.startsWith('/cuves')) return 'cuves'
  if (pathname.startsWith('/dashboard')) return 'dashboard'
  if (pathname.startsWith('/alertes')) return 'alerts'
  if (pathname.startsWith('/notifications')) return 'notifications'
  if (pathname.startsWith('/historique')) return 'reports'
  if (pathname.startsWith('/operateur')) return 'operator'
  if (pathname.startsWith('/espace')) return 'viewer'
  if (pathname.startsWith('/profil')) return 'profile'
  if (pathname.startsWith('/rapports')) return 'reports'
  if (pathname.startsWith('/register')) return 'register'
  if (pathname.startsWith('/login')) return 'login'
  return 'home'
}

function allowedViews({ isAdmin, isOperator, isViewer }) {
  if (isAdmin) return ADMIN_VIEWS
  if (isOperator) return OPERATOR_VIEWS
  if (isViewer) return VIEWER_VIEWS
  return new Set()
}

function defaultView({ isAdmin, isOperator, isViewer }) {
  if (isAdmin) return 'dashboard'
  if (isOperator) return 'operator'
  if (isViewer) return 'viewer'
  return 'login'
}

function pathForView(view) {
  return ({
    home: '/',
    operator: '/operateur/',
    viewer: '/espace/',
    profile: '/profil/',
    dashboard: '/dashboard/',
    sites: '/sites/',
    cuves: '/cuves/',
    groups: '/groupes/',
    reports: '/rapports/',
    alerts: '/alertes/',
    notifications: '/notifications/',
    login: '/login/',
    register: '/register/',
  })[view] || '/'
}

function AppRoutes() {
  const { isAuthenticated, isAdmin, isOperator, isViewer, loading } = useAuth()
  const [view, setView] = useState(() => resolveViewFromPath(window.location.pathname))
  const roleFlags = { isAdmin, isOperator, isViewer }

  const navigate = (nextView, options = {}) => {
    if (typeof nextView === 'object' && nextView !== null) {
      options = { ...options, ...nextView }
      nextView = nextView.view
    }
    if (!nextView || nextView === 'presentation') nextView = 'home'

    if (!loading) {
      if (!isAuthenticated && !PUBLIC_VIEWS.has(nextView)) {
        nextView = 'login'
      } else if (isAuthenticated && !allowedViews(roleFlags).has(nextView) && nextView !== 'login' && nextView !== 'register') {
        nextView = defaultView(roleFlags)
      }
    }

    let nextPath = pathForView(nextView)
    if (nextView === 'sites') {
      const params = []
      if (options.siteId != null && options.siteId !== '') params.push(`siteId=${encodeURIComponent(options.siteId)}`)
      if (options.siteName != null && options.siteName !== '') params.push(`siteName=${encodeURIComponent(options.siteName)}`)
      if (options.mode != null && options.mode !== '') params.push(`mode=${encodeURIComponent(options.mode)}`)
      if (params.length) nextPath += `?${params.join('&')}`
    }
    if (nextView === 'groups') {
      const params = []
      if (options.groupId != null && options.groupId !== '') params.push(`groupId=${encodeURIComponent(options.groupId)}`)
      if (options.groupLabel != null && options.groupLabel !== '') params.push(`groupLabel=${encodeURIComponent(options.groupLabel)}`)
      if (options.mode != null && options.mode !== '') params.push(`mode=${encodeURIComponent(options.mode)}`)
      if (params.length) nextPath += `?${params.join('&')}`
    }
    if (nextView === 'alerts') {
      const params = []
      if (options.priority != null && options.priority !== '' && options.priority !== 'all') {
        params.push(`priority=${encodeURIComponent(options.priority)}`)
      }
      if (options.alertId != null && options.alertId !== '') {
        params.push(`alertId=${encodeURIComponent(options.alertId)}`)
      }
      if (params.length) nextPath += `?${params.join('&')}`
    }
    if (nextView === 'reports') {
      const params = []
      if (options.pane != null && options.pane !== '') {
        params.push(`pane=${encodeURIComponent(options.pane)}`)
      }
      if (params.length) nextPath += `?${params.join('&')}`
    }

    window.history.pushState({}, '', nextPath)
    setView(nextView)
  }

  useEffect(() => {
    const sync = () => setView(resolveViewFromPath(window.location.pathname))
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated && !PUBLIC_VIEWS.has(view)) {
      window.history.replaceState({}, '', '/login/')
      setView('login')
      return
    }
    if (isAuthenticated && !allowedViews(roleFlags).has(view) && view !== 'login' && view !== 'register') {
      const fallback = defaultView(roleFlags)
      window.history.replaceState({}, '', pathForView(fallback))
      setView(fallback)
    }
  }, [loading, view, isAuthenticated, isAdmin, isOperator, isViewer])

  if (loading) return <PageLoader label="Ouverture de votre session…" />
  if (view === 'login' || view === 'register') return <AuthPage onNavigate={navigate} initialMode={view} />
  if (!isAuthenticated) {
    if (view === 'home') return <HomePage onNavigate={navigate} />
    return <AuthPage onNavigate={navigate} initialMode="login" />
  }

  if (view === 'profile') return <ProfilePage onNavigate={navigate} />

  if (view === 'notifications') return <NotificationsPage onNavigate={navigate} />

  if (isViewer) {
    if (view === 'viewer') return <UserHomePage onNavigate={navigate} />
    if (view === 'sites') return <UserSitesPage onNavigate={navigate} />
    return <UserHomePage onNavigate={navigate} />
  }

  if (isOperator) {
    if (view === 'operator') return <OperatorHomePage onNavigate={navigate} />
    if (view === 'sites') return <OperatorSitesPage onNavigate={navigate} />
    if (view === 'reports') return <ReportsPage onNavigate={navigate} />
    return <OperatorHomePage onNavigate={navigate} />
  }

  if (view === 'dashboard') return <DashboardPage onNavigate={navigate} />
  if (view === 'alerts') return <AlertsPage onNavigate={navigate} />
  if (view === 'sites') return <SitesPage onNavigate={navigate} />
  if (view === 'cuves') return <CuvesPage onNavigate={navigate} />
  if (view === 'groups') return <GroupsPage onNavigate={navigate} />
  if (view === 'reports') return <ReportsPage onNavigate={navigate} />
  return <HomePage onNavigate={navigate} />
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <InteractionShell>
          <AppRoutes />
        </InteractionShell>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
