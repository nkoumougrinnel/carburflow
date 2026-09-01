import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext.jsx'
import {
  PUBLIC_VIEWS,
  allowedViews,
  defaultView,
  pathForView,
  searchForView,
} from '@/utils/views.js'

export function useAppNavigate() {
  const rrNavigate = useNavigate()
  const { isAuthenticated, isAdmin, isOperator, isViewer, loading } = useAuth()
  const roleFlags = { isAdmin, isOperator, isViewer }

  return useCallback((nextView, options = {}) => {
    if (typeof nextView === 'object' && nextView !== null) {
      options = { ...options, ...nextView }
      nextView = nextView.view
    }
    if (!nextView || nextView === 'presentation') nextView = 'home'

    if (!loading) {
      if (!isAuthenticated && !PUBLIC_VIEWS.has(nextView)) {
        nextView = 'login'
      } else if (
        isAuthenticated
        && !allowedViews(roleFlags).has(nextView)
        && nextView !== 'login'
        && nextView !== 'register'
      ) {
        nextView = defaultView(roleFlags)
      }
    }

    rrNavigate(`${pathForView(nextView)}${searchForView(nextView, options)}`, {
      replace: Boolean(options.replace),
    })
  }, [rrNavigate, isAuthenticated, isAdmin, isOperator, isViewer, loading])
}
