import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  Chip,
  Grid,
} from '@mui/material'
import {
  Ballot as BallotIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
} from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'
import IconStatsCard from '../components/IconStatsCard'
import ActionCard from '../components/ActionCard'

const StudentDashboardPage = () => {
  const { user } = useAuth()
  const [ballots, setBallots] = useState([])
  const [receipts, setReceipts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const [ballotsResponse, receiptsResponse, statsResponse] = await Promise.all([
        apiService.getBallots(),
        apiService.getVotingReceipts(),
        apiService.getStudentStats(),
      ])
      
      setBallots(ballotsResponse.data?.currentBallots || [])
      setReceipts(receiptsResponse.data?.receipts || [])
      setStats(statsResponse.data)
    } catch (err) {
      setError(err.message || 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  const handleBallotClick = (ballotId) => {
    navigate(`/vote/${ballotId}`)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return <LoadingSpinner message="Loading ballots..." />
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom sx={{ mb: 1, color: '#4A148C', fontWeight: 600 }}>
          Voter Dashboard
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: '#616161' }}>
          {user?.name || 'Student'} — view your ballots and voting history below.
        </Typography>

        {error && <ErrorAlert message={error} onClose={() => setError('')} />}

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <IconStatsCard
              icon={<BallotIcon />}
              value={stats?.ongoingElections || 0}
              label="Ongoing Elections"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IconStatsCard
              icon={<CheckCircleIcon />}
              value={stats?.votesCast || 0}
              label="Votes Cast"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IconStatsCard
              icon={<ScheduleIcon />}
              value={stats?.upcomingElections || 0}
              label="Upcoming Elections"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <IconStatsCard
              icon={<HistoryIcon />}
              value={stats?.pastElections || 0}
              label="Past Elections"
            />
          </Grid>
        </Grid>

        {/* Action Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <ActionCard
              icon={<BallotIcon />}
              title="Vote Now"
              description="Vote in available elections"
              onClick={() => {
                const firstOpenBallot = ballots.find(b => b.status === 'open')
                if (firstOpenBallot) {
                  navigate(`/vote/${firstOpenBallot.ballotId}`)
                } else {
                  navigate('/vote')
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ActionCard
              icon={<HistoryIcon />}
              title="My Voting History"
              description="Past voting activity"
              onClick={() => {
                // Scroll to receipts section or navigate to history page
                const receiptsSection = document.getElementById('voting-receipts')
                if (receiptsSection) {
                  receiptsSection.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            />
          </Grid>
        </Grid>

      {/* Current Ballots Section */}
      <Box sx={{ mb: 5, backgroundColor: '#ffffff', p: 3, borderRadius: '8px' }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600, color: '#1a1a1a' }}>
          Current Ballots
        </Typography>
        {ballots.length === 0 ? (
          <Card>
            <CardContent>
              <Typography variant="body1" color="text.secondary">
                No active ballots available at this time.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {ballots.map((ballot) => (
              <Card key={ballot.ballotId} variant="outlined" sx={{ '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{ballot.title}</Typography>
                    <Chip label={ballot.status} color={ballot.status === 'open' ? 'success' : 'default'} size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(ballot.startDate)} - {formatDate(ballot.endDate)}
                  </Typography>
                </CardContent>
                <CardActions sx={{ pt: 0, pb: 2, px: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => handleBallotClick(ballot.ballotId)}
                    disabled={ballot.status !== 'open'}
                    sx={{ px: 3 }}
                  >
                    Vote Now
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 5 }} />

      {/* Voting Receipts Section */}
      <Box id="voting-receipts" sx={{ backgroundColor: '#ffffff', p: 3, borderRadius: '8px' }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600, color: '#1a1a1a' }}>
          Voting Receipts
        </Typography>
        {receipts.length === 0 ? (
          <Card>
            <CardContent>
              <Typography variant="body1" color="text.secondary">
                You have not voted in any ballots yet.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {receipts.map((receipt, index) => (
              <Card key={index} variant="outlined" sx={{ backgroundColor: '#ffffff' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {receipt.ballotTitle}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Transaction ID:</strong> {receipt.transactionId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Voted:</strong> {formatTimestamp(receipt.timestamp)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
      </Container>
    </Box>
  )
}

export default StudentDashboardPage
