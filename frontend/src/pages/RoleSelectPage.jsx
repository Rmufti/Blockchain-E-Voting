import { useNavigate } from 'react-router-dom'
import { Box, Button, Typography, Container } from '@mui/material'
import { AdminPanelSettings as AdminIcon, HowToVote as VoteIcon } from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  admin:             'Super Admin',
  usc_admin:         'USC Admin',
  usc_president:     'USC President',
  usc_vp:            'USC Vice-President',
  faculty_president: 'Faculty President',
  councillor:        'Councillor',
  meeting_chair:     'Meeting Chair',
  candidate:         'Candidate',
  student:           'Student',
}

const ADMIN_SIDE_ROLES = new Set(['admin', 'usc_admin', 'usc_president', 'usc_vp', 'faculty_president'])

const RoleSelectPage = () => {
  const { role, user } = useAuth()
  const navigate = useNavigate()

  const isAdminCapable = ADMIN_SIDE_ROLES.has(role)

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#4A148C', mb: 1 }}>
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </Typography>
          <Typography variant="body1" sx={{ color: '#616161' }}>
            Logged in as <strong>{ROLE_LABELS[role] || role}</strong>
            {user?.faculty ? ` · ${String(user.faculty).replace(/_/g, ' ')}` : ''}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Voter portal — always shown */}
          <Box
            onClick={() => navigate('/vote')}
            sx={{
              flex: '1 1 200px',
              maxWidth: 240,
              cursor: 'pointer',
              border: '2px solid #4A148C',
              borderRadius: '12px',
              backgroundColor: '#fff',
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              transition: 'box-shadow 180ms ease, background-color 180ms ease',
              '&:hover': {
                backgroundColor: '#f3e5ff',
                boxShadow: '0 4px 16px rgba(74,20,140,0.18)',
              },
            }}
          >
            <VoteIcon sx={{ fontSize: 48, color: '#4A148C' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#4A148C' }}>
              Voter Portal
            </Typography>
            <Typography variant="body2" sx={{ color: '#616161', textAlign: 'center' }}>
              View elections and cast your vote
            </Typography>
          </Box>

          {/* Admin portal — only for admin-capable roles */}
          {isAdminCapable && (
            <Box
              onClick={() => navigate('/admin')}
              sx={{
                flex: '1 1 200px',
                maxWidth: 240,
                cursor: 'pointer',
                border: '2px solid #1a237e',
                borderRadius: '12px',
                backgroundColor: '#fff',
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                transition: 'box-shadow 180ms ease, background-color 180ms ease',
                '&:hover': {
                  backgroundColor: '#e8eaf6',
                  boxShadow: '0 4px 16px rgba(26,35,126,0.18)',
                },
              }}
            >
              <AdminIcon sx={{ fontSize: 48, color: '#1a237e' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a237e' }}>
                Admin Portal
              </Typography>
              <Typography variant="body2" sx={{ color: '#616161', textAlign: 'center' }}>
                Manage elections and users
              </Typography>
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  )
}

export default RoleSelectPage
