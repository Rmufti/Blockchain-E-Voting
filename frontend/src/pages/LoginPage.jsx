import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState('voter')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiService.login(email, password, userType)
      
      if (response.data.error) {
        setError(response.data.error)
        setLoading(false)
        return
      }

      const { token, user, role } = response.data
      
      // Verify user type matches selection
      if ((userType === 'admin' && role !== 'admin') || (userType === 'voter' && role === 'admin')) {
        setError('Wrong user type for this account.')
        setLoading(false)
        return
      }

      login(token, user, role)

      // Redirect based on role
      const redirectPath = from || (role === 'admin' ? '/admin' : '/vote')
      navigate(redirectPath, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5', // Light gray background
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          elevation={2} 
          sx={{ 
            padding: 5, 
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
          }}
        >
          <Typography 
            component="h1" 
            variant="h4" 
            align="center" 
            gutterBottom
            sx={{ 
              color: '#1a1a1a',
              mb: 1,
            }}
          >
            UWO E-Voting System
          </Typography>
          <Typography 
            variant="body2" 
            align="center" 
            sx={{ 
              mb: 4,
              color: '#616161',
            }}
          >
            Sign in to your account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            
            <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
              <FormLabel component="legend" sx={{ color: '#1a1a1a', mb: 1 }}>
                User Type
              </FormLabel>
              <RadioGroup
                row
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                sx={{ justifyContent: 'center' }}
              >
                <FormControlLabel 
                  value="voter" 
                  control={<Radio sx={{ color: '#4A148C', '&.Mui-checked': { color: '#4A148C' } }} />} 
                  label="Voter" 
                />
                <FormControlLabel 
                  value="admin" 
                  control={<Radio sx={{ color: '#4A148C', '&.Mui-checked': { color: '#4A148C' } }} />} 
                  label="Admin" 
                />
              </RadioGroup>
            </FormControl>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3, 
                mb: 2,
                background: 'linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #38006B 0%, #4A148C 100%)',
                },
              }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Login'}
            </Button>
            
            <Typography variant="body2" align="center" sx={{ color: '#616161', mt: 2 }}>
              Don't have an account?{' '}
              <Typography
                component="span"
                sx={{
                  color: '#4A148C',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  '&:hover': {
                    color: '#38006B',
                  },
                }}
              >
                Contact your administrator
              </Typography>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default LoginPage
