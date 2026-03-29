import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Grid,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  Ballot as BallotIcon,
  People as PeopleIcon,
  HowToReg as PersonCheckIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  ManageAccounts as ManageAccountsIcon,
} from '@mui/icons-material'
import { apiService } from '../services/api'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'
import IconStatsCard from '../components/IconStatsCard'
import ActionCard from '../components/ActionCard'

const AdminPage = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [elections, setElections] = useState([])
  const [electionPickerOpen, setElectionPickerOpen] = useState(false)
  const [loadingElections, setLoadingElections] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchStats()
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

  const handleViewResults = async () => {
    setLoadingElections(true)
    try {
      const res = await api.get('/api/elections?scope=manage')
      const all = res.data?.elections || []
      setElections(all)
      setElectionPickerOpen(true)
    } catch (err) {
      setError('Failed to load elections list.')
    } finally {
      setLoadingElections(false)
    }
  }

  const handlePickElection = (ballotId) => {
    setElectionPickerOpen(false)
    navigate(`/results/${ballotId}`)
  }

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : ''

  if (loading) {
    return <LoadingSpinner message="Loading statistics..." />
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ color: '#4A148C', fontWeight: 600 }}>
            Admin Dashboard
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/vote')}
            sx={{
              backgroundColor: '#4A148C',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              '&:hover': { backgroundColor: '#38006b' },
            }}
          >
            Go to Voter
          </Button>
        </Box>

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
          <Grid item xs={12} sm={6} md={4}>
            <ActionCard
              icon={<SettingsIcon />}
              title="Manage Elections"
              description="Set up new elections and manage existing ones"
              onClick={() => navigate('/admin/elections')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <ActionCard
              icon={<ManageAccountsIcon />}
              title="Manage Users"
              description="Assign and change roles for any user"
              onClick={() => navigate('/admin/users')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <ActionCard
              icon={<AssessmentIcon />}
              title="View Results"
              description="Monitor election results and analytics"
              onClick={handleViewResults}
              highlighted
            />
          </Grid>
        </Grid>
      </Container>

      {/* Election Picker Dialog */}
      <Dialog
        open={electionPickerOpen}
        onClose={() => setElectionPickerOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px' } }}
      >
        <DialogTitle sx={{ color: '#4A148C', fontWeight: 600 }}>
          Select an Election to View Results
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {loadingElections ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#4A148C' }} />
            </Box>
          ) : elections.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
                No elections found.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {elections.map((election, idx) => (
                <ListItem
                  key={election.ballotId}
                  disablePadding
                  divider={idx < elections.length - 1}
                >
                  <ListItemButton
                    onClick={() => handlePickElection(election.ballotId)}
                    sx={{ py: 2, px: 3, '&:hover': { backgroundColor: 'rgba(74,20,140,0.05)' } }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                            {election.title}
                          </Typography>
                          <Chip
                            label={election.status}
                            size="small"
                            sx={{
                              textTransform: 'capitalize',
                              backgroundColor:
                                election.status === 'open' ? '#c8e6c9' :
                                election.status === 'closed' ? '#ffcdd2' : '#fff9c4',
                              color: '#1a1a1a',
                              fontWeight: 500,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: '#9e9e9e' }}>
                          {formatDate(election.startDate)} → {formatDate(election.endDate)}
                          {election.restrictedToFaculty ? ` · ${election.restrictedToFaculty}` : ''}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setElectionPickerOpen(false)}
            variant="outlined"
            sx={{ textTransform: 'none', borderColor: '#4A148C', color: '#4A148C' }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AdminPage
