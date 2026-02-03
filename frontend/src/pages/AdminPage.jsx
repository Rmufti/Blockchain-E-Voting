import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Grid,
  Button,
  Box,
} from '@mui/material'
import {
  Ballot as BallotIcon,
  People as PeopleIcon,
  HowToReg as PersonCheckIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  PersonAdd as PersonAddIcon,
  VerifiedUser as VerifiedUserIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material'
import { apiService } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'
import IconStatsCard from '../components/IconStatsCard'
import ActionCard from '../components/ActionCard'

const AdminPage = () => {
  const [stats, setStats] = useState(null)
  const [currentElectionId, setCurrentElectionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchStats()
    fetchCurrentElection()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiService.getAdminStats()
      setStats(response.data)
    } catch (err) {
      setError(err.message || 'Failed to load statistics.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentElection = async () => {
    try {
      const response = await apiService.getCurrentElection()
      if (response.data?.electionId) {
        setCurrentElectionId(response.data.electionId)
      }
    } catch (err) {
      // Silently fail - not critical
    }
  }

  const handleViewResults = () => {
    if (currentElectionId) {
      navigate(`/results/${currentElectionId}`)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading statistics..." />
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom sx={{ color: '#4A148C', mb: 4, fontWeight: 600 }}>
          Admin Dashboard
        </Typography>

        {error && <ErrorAlert message={error} onClose={() => setError('')} />}

        {/* Summary Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IconStatsCard
              icon={<BallotIcon />}
              value={stats?.totalElections || 0}
              label="Total Elections"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IconStatsCard
              icon={<PeopleIcon />}
              value={stats?.totalCandidates || 0}
              label="Total Candidates"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IconStatsCard
              icon={<PersonCheckIcon />}
              value={stats?.registeredVoters || 0}
              label="Registered Voters"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IconStatsCard
              icon={<BarChartIcon />}
              value={stats?.totalVotes || 0}
              label="Total Votes Cast"
            />
          </Grid>
        </Grid>

        {/* Action Cards */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <ActionCard
              icon={<SettingsIcon />}
              title="Manage Elections"
              description="Set up new elections and manage existing ones"
              onClick={() => navigate('/admin/elections')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ActionCard
              icon={<PersonAddIcon />}
              title="Manage Candidates"
              description="Review and approve candidate applications"
              onClick={() => navigate('/admin/candidates')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ActionCard
              icon={<VerifiedUserIcon />}
              title="Verify Voters"
              description="Review and verify voter registrations"
              onClick={() => navigate('/admin/voters')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ActionCard
              icon={<AssessmentIcon />}
              title="View Results"
              description="Monitor election results and analytics"
              onClick={handleViewResults}
              highlighted={!!currentElectionId}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default AdminPage
