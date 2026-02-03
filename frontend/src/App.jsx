import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import BallotPage from './pages/BallotPage'
import ConfirmationPage from './pages/ConfirmationPage'
import AdminPage from './pages/AdminPage'
import ResultsPage from './pages/ResultsPage'
import ElectionsManagementPage from './pages/ElectionsManagementPage'
import ProfilePage from './pages/ProfilePage'
import ContactPage from './pages/ContactPage'
import { AppBar, Toolbar, Typography, Button, Box, Tabs, Tab } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'

function App() {
  const { isAuthenticated, role, logout, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Show loading state while auth is initializing
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getTabValue = () => {
    if (role === 'admin') {
      if (location.pathname.startsWith('/admin/elections')) {
        return 1
      } else if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/results')) {
        return 0
      } else if (location.pathname.startsWith('/vote') || location.pathname.startsWith('/confirm')) {
        return 2
      }
      return 0
    } else if (role === 'student') {
      if (location.pathname.startsWith('/profile')) {
        return 0
      } else if (location.pathname.startsWith('/vote') || location.pathname.startsWith('/confirm')) {
        return 1
      } else if (location.pathname.startsWith('/contact')) {
        return 2
      }
      return 1
    }
    return false
  }

  const handleTabChange = (event, newValue) => {
    if (role === 'admin') {
      if (newValue === 0) {
        navigate('/admin')
      } else if (newValue === 1) {
        navigate('/admin/elections')
      } else if (newValue === 2) {
        navigate('/vote')
      }
    } else {
      if (newValue === 0) {
        navigate('/profile')
      } else if (newValue === 1) {
        navigate('/vote')
      } else if (newValue === 2) {
        navigate('/contact')
      }
    }
  }

  return (
    <>
      {isAuthenticated && (
        <AppBar 
          position="static" 
          sx={{ 
            backgroundColor: '#ffffff',
            color: '#1a1a1a',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <Toolbar sx={{ minHeight: '72px !important' }}>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                fontWeight: 600, 
                fontSize: '1.5rem',
                color: '#4A148C',
              }}
            >
              UWO E-Voting System
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {role && (
                <Tabs 
                  value={getTabValue()} 
                  onChange={handleTabChange}
                  sx={{
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.9375rem',
                      minHeight: '72px',
                      color: '#616161',
                      '&.Mui-selected': {
                        color: '#4A148C',
                      },
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#4A148C',
                      height: 3,
                    },
                  }}
                >
                  {role === 'admin' ? (
                    <>
                      <Tab label="Dashboard" />
                      <Tab label="Elections" />
                      <Tab label="Voter" />
                    </>
                  ) : (
                    <>
                      <Tab label="Personal Info" />
                      <Tab label="Elections" />
                      <Tab label="Contact" />
                    </>
                  )}
                </Tabs>
              )}
              {role === 'student' && (
                <Button
                  variant="contained"
                  onClick={() => navigate('/vote')}
                  sx={{
                    ml: 2,
                    textTransform: 'none',
                    backgroundColor: '#4A148C',
                  }}
                >
                  Vote
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', ml: 2 }}>
              <Typography variant="body2" sx={{ color: '#616161' }}>
                {role === 'admin' ? 'Administrator' : 'Student'}
              </Typography>
              <Button 
                onClick={handleLogout}
                variant="outlined"
                sx={{ 
                  textTransform: 'none',
                  borderColor: '#4A148C',
                  color: '#4A148C',
                  '&:hover': {
                    borderColor: '#38006B',
                    backgroundColor: 'rgba(74, 20, 140, 0.08)',
                  },
                }}
              >
                Logout
              </Button>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate
                to={role === 'admin' ? '/admin' : '/vote'}
                replace
              />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/vote"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vote/:ballotId"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <BallotPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/confirm/:ballotId"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ConfirmationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/confirm"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ConfirmationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/elections"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ElectionsManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results/:electionId"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ResultsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contact"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ContactPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}

export default App
