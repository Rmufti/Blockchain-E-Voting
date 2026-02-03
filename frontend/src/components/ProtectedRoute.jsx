import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Alert, Snackbar } from '@mui/material'
import { useState } from 'react'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, loading } = useAuth()
  const location = useLocation()
  const [showError, setShowError] = useState(false)

  if (loading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (!showError) {
      setShowError(true)
    }
    return (
      <>
        <Navigate to="/login" replace />
        <Snackbar
          open={showError}
          autoHideDuration={6000}
          onClose={() => setShowError(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setShowError(false)}>
            You do not have permission to access this page.
          </Alert>
        </Snackbar>
      </>
    )
  }

  return children
}

export default ProtectedRoute
