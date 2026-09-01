import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import HomePage from './pages/common/HomePage.jsx'
import DashboardPage from './pages/admin/DashboardPage.jsx'
import SitesPage from './pages/admin/SitesPage.jsx'
import GroupsPage from './pages/admin/GroupsPage.jsx'
import AuthPage from './pages/auth/AuthPage.jsx'
import ReportsPage from './pages/common/ReportsPage.jsx'
import OperatorHomePage from './pages/operator/HomePage.jsx'
import OperatorSitesPage from './pages/operator/SitesPage.jsx'
import UserHomePage from './pages/user/HomePage.jsx'
import UserSitesPage from './pages/user/SitesPage.jsx'
import ProfilePage from './pages/common/ProfilePage.jsx'
import AlertsPage from './pages/admin/AlertsPage.jsx'
import NotificationsPage from './pages/common/NotificationsPage.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import InteractionShell from './components/InteractionShell.jsx'
import PageLoader from './components/PageLoader.jsx'
import { Toaster } from './components/ui/sonner.jsx'
import { useAppNavigate } from './hooks/useAppNavigate.js'
import { allowedViews, defaultView, pathForView, resolveViewFromPath } from './utils/views.js'

function Routed({ component: Page, extra = {} }) {
  const onNavigate = useAppNavigate()
  return <Page onNavigate={onNavigate} {...extra} />
}

function Guard({ roles, children }) {
  const { isAuthenticated, isAdmin, isOperator, isViewer, loading } = useAuth()
  const location = useLocation()
  const roleFlags = { isAdmin, isOperator, isViewer }

  if (loading) return <PageLoader label="Ouverture de votre session…" />
  if (!isAuthenticated) {
    return <Navigate to="/login/" replace state={{ from: location }} />
  }
  const view = resolveViewFromPath(location.pathname)
  if (roles && !roles.includes(isAdmin ? 'admin' : isOperator ? 'operator' : 'viewer')) {
    return <Navigate to={pathForView(defaultView(roleFlags))} replace />
  }
  if (!allowedViews(roleFlags).has(view) && view !== 'home') {
    return <Navigate to={pathForView(defaultView(roleFlags))} replace />
  }
  return children
}

function GuestOnly({ children }) {
  const { isAuthenticated, isAdmin, isOperator, isViewer, loading } = useAuth()
  if (loading) return <PageLoader label="Ouverture de votre session…" />
  if (isAuthenticated) {
    return <Navigate to={pathForView(defaultView({ isAdmin, isOperator, isViewer }))} replace />
  }
  return children
}

function SitesByRole() {
  const { isAdmin, isOperator } = useAuth()
  const onNavigate = useAppNavigate()
  if (isAdmin) return <SitesPage onNavigate={onNavigate} />
  if (isOperator) return <OperatorSitesPage onNavigate={onNavigate} />
  return <UserSitesPage onNavigate={onNavigate} />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Routed component={HomePage} />} />
      <Route path="/login/" element={<GuestOnly><Routed component={AuthPage} extra={{ initialMode: 'login' }} /></GuestOnly>} />
      <Route path="/register/" element={<GuestOnly><Routed component={AuthPage} extra={{ initialMode: 'register' }} /></GuestOnly>} />
      <Route path="/dashboard/" element={<Guard roles={['admin']}><Routed component={DashboardPage} /></Guard>} />
      <Route path="/alertes/" element={<Guard roles={['admin']}><Routed component={AlertsPage} /></Guard>} />
      <Route path="/groupes/" element={<Guard roles={['admin']}><Routed component={GroupsPage} /></Guard>} />
      <Route path="/sites/" element={<Guard roles={['admin', 'operator', 'viewer']}><SitesByRole /></Guard>} />
      <Route path="/rapports/" element={<Guard roles={['admin', 'operator']}><Routed component={ReportsPage} /></Guard>} />
      <Route path="/historique/" element={<Navigate to="/rapports/" replace />} />
      <Route path="/operateur/" element={<Guard roles={['operator']}><Routed component={OperatorHomePage} /></Guard>} />
      <Route path="/espace/" element={<Guard roles={['viewer']}><Routed component={UserHomePage} /></Guard>} />
      <Route path="/profil/" element={<Guard roles={['admin', 'operator', 'viewer']}><Routed component={ProfilePage} /></Guard>} />
      <Route path="/notifications/" element={<Guard roles={['admin', 'operator', 'viewer']}><Routed component={NotificationsPage} /></Guard>} />
      <Route path="*" element={<Routed component={HomePage} />} />
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <InteractionShell>
          <AppRoutes />
          <Toaster />
        </InteractionShell>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
