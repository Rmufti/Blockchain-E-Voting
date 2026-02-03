import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Container,
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Divider,
  Checkbox,
  FormControlLabel,
  Paper,
} from '@mui/material'
import { apiService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'
import ContestCard from '../components/ContestCard'
import CandidatePanel from '../components/CandidatePanel'
import VotingRulesModal from '../components/VotingRulesModal'

const BallotPage = () => {
  const { ballotId } = useParams()
  const { getUserFaculty } = useAuth()
  const [ballot, setBallot] = useState(null)
  const [selections, setSelections] = useState({}) // { contestId: [candidateIds] or [rankedCandidateIds] }
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [rulesModalOpen, setRulesModalOpen] = useState(false)
  const [hasSeenRules, setHasSeenRules] = useState(false)
  const [confirmedSelection, setConfirmedSelection] = useState(false)
  const [showDetails, setShowDetails] = useState(null) // Track which candidate's details are shown
  const navigate = useNavigate()

  useEffect(() => {
    if (ballotId) {
      fetchBallot()
      // Show rules modal on first load
      const seenRules = sessionStorage.getItem(`rules_seen_${ballotId}`)
      if (!seenRules) {
        setRulesModalOpen(true)
      }
    }
  }, [ballotId])

  const fetchBallot = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiService.getBallot(ballotId)
      if (response.data) {
        setBallot(response.data)
      } else {
        setError('Ballot not found.')
      }
    } catch (err) {
      setError(err.message || 'Failed to load ballot.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectionChange = (contestId, candidateIds) => {
    setSelections((prev) => ({
      ...prev,
      [contestId]: candidateIds,
    }))
  }

  const filterContests = () => {
    if (!ballot?.contests) return []
    const userFaculty = getUserFaculty()
    
    return ballot.contests.filter((contest) => {
      // Show contest if no restriction OR user's faculty matches
      return !contest.restrictionFaculty || contest.restrictionFaculty === userFaculty
    })
  }

  const validateBallot = () => {
    const visibleContests = filterContests()
    
    for (const contest of visibleContests) {
      if (contest.required) {
        const selection = selections[contest.id]
        if (!selection || selection.length === 0) {
          return { valid: false, message: `Please complete the required contest: ${contest.title}` }
        }
        
        // For ranked, ensure at least one is selected
        if (contest.ruleType === 'ranked' && selection.length === 0) {
          return { valid: false, message: `Please rank at least one candidate in: ${contest.title}` }
        }
        
        // For single, ensure exactly one is selected
        if (contest.ruleType === 'single' && selection.length !== 1) {
          return { valid: false, message: `Please select exactly one candidate in: ${contest.title}` }
        }
        
        // For multi, check maxSelections
        if (contest.ruleType === 'multi' && contest.maxSelections) {
          if (selection.length > contest.maxSelections) {
            return { valid: false, message: `Too many selections in: ${contest.title}` }
          }
        }
      }
    }
    
    return { valid: true }
  }

  const handleToggleDetails = (candidateId) => {
    setShowDetails(showDetails === candidateId ? null : candidateId)
  }

  const handleSubmit = () => {
    if (!confirmedSelection) {
      setError('Please confirm your selection before submitting.')
      return
    }
    const validation = validateBallot()
    if (!validation.valid) {
      setError(validation.message)
      return
    }
    setConfirmOpen(true)
  }

  const handleRulesProceed = () => {
    setRulesModalOpen(false)
    setHasSeenRules(true)
    if (ballotId) {
      sessionStorage.setItem(`rules_seen_${ballotId}`, 'true')
    }
  }

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false)
    setSubmitting(true)
    setError('')

    try {
      const response = await apiService.submitBallot(ballotId, selections)
      
      if (response.data.success) {
        const transactionId = response.data.transactionId
        navigate(`/confirm/${ballotId}`, { state: { transactionId } })
      } else {
        setError(response.data.message || 'Failed to submit ballot.')
      }
    } catch (err) {
      if (err.message?.includes('already voted')) {
        setError('You have already voted in this ballot.')
      } else if (err.message?.includes('unauthorized')) {
        setError('You are not authorized to vote in this ballot.')
      } else {
        setError(err.message || 'Failed to submit ballot.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading ballot..." />
  }

  if (error && !ballot) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <ErrorAlert message={error} />
        <Button variant="contained" onClick={() => navigate('/vote')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Container>
    )
  }

  if (!ballot) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h5">Ballot not found.</Typography>
        <Button variant="contained" onClick={() => navigate('/vote')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Container>
    )
  }

  const visibleContests = filterContests()

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff', py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 1, color: '#4A148C' }}>
              {ballot.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#616161' }}>
              Please complete all required contests. You can only vote once.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => setRulesModalOpen(true)}
            sx={{ textTransform: 'none' }}
          >
            View Rules
          </Button>
        </Box>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      {visibleContests.length === 0 ? (
        <Alert severity="info">
          No contests available for your faculty in this ballot.
        </Alert>
      ) : (
        <>
          {/* Voting Panel Section */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              mb: 4, 
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
            }}
          >
            <Typography variant="h5" sx={{ mb: 3, color: '#4A148C', fontWeight: 600 }}>
              Voting Panel
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              {visibleContests.map((contest, index) => (
                <Box key={contest.id}>
                  <CandidatePanel
                    contest={contest}
                    candidates={contest.candidates || []}
                    selections={selections}
                    onSelectionChange={handleSelectionChange}
                    showDetails={showDetails}
                    onToggleDetails={handleToggleDetails}
                  />
                  {index < visibleContests.length - 1 && (
                    <Divider sx={{ my: 4, borderColor: '#e0e0e0' }} />
                  )}
                </Box>
              ))}
            </Box>

            {/* Confirmation Checkbox */}
            {Object.keys(selections).length > 0 && (
              <Box sx={{ mb: 3, p: 2, backgroundColor: '#ffffff', borderRadius: '4px' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={confirmedSelection}
                      onChange={(e) => setConfirmedSelection(e.target.checked)}
                      sx={{
                        color: '#4A148C',
                        '&.Mui-checked': {
                          color: '#4A148C',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: '#1a1a1a' }}>
                      I have reviewed my selections and confirm they are correct.
                    </Typography>
                  }
                />
              </Box>
            )}
          </Paper>

          {/* Alternative Compact View Toggle */}
          <Box sx={{ mb: 4, display: 'none' }}>
            {visibleContests.map((contest, index) => (
              <Box key={contest.id}>
                <ContestCard
                  contest={contest}
                  selections={selections}
                  onSelectionChange={handleSelectionChange}
                />
                {index < visibleContests.length - 1 && (
                  <Divider sx={{ my: 4, borderColor: '#e0e0e0' }} />
                )}
              </Box>
            ))}
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSubmit}
            disabled={submitting || !confirmedSelection}
            sx={{ mb: 2, py: 1.5, fontSize: '1rem', fontWeight: 600 }}
          >
            {submitting ? 'Submitting Ballot...' : 'SUBMIT'}
          </Button>

          <Button
            variant="outlined"
            fullWidth
            onClick={() => navigate('/vote')}
            disabled={submitting}
          >
            Cancel
          </Button>
        </>
      )}

      <VotingRulesModal
        open={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
        onProceed={handleRulesProceed}
        ballotTitle={ballot?.title}
      />

      <Dialog 
        open={confirmOpen} 
        onClose={() => setConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            maxWidth: '500px',
          },
        }}
      >
        <DialogTitle sx={{ color: '#4A148C', fontWeight: 600 }}>
          Confirm Your Ballot Submission
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#1a1a1a', mb: 2 }}>
            You are about to submit your ballot for <strong>{ballot.title}</strong>. 
            This action cannot be undone.
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#1a1a1a' }}>
              Your Selections:
            </Typography>
            {visibleContests.map((contest) => {
              const contestSelections = selections[contest.id] || []
              if (contestSelections.length === 0) return null
              
              const selectedCandidates = contest.candidates.filter(c => 
                contestSelections.includes(c.id)
              )
              
              return (
                <Box key={contest.id} sx={{ mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#4A148C' }}>
                    {contest.title}:
                  </Typography>
                  {contest.ruleType === 'ranked' ? (
                    <Typography variant="body2" sx={{ color: '#616161', ml: 2 }}>
                      {selectedCandidates.map((c, idx) => 
                        `${contestSelections.indexOf(c.id) + 1}. ${c.name}`
                      ).join(', ')}
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#616161', ml: 2 }}>
                      {selectedCandidates.map(c => c.name).join(', ')}
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Box>
          <DialogContentText sx={{ color: '#1a1a1a', mt: 2 }}>
            Are you sure you want to submit?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmOpen(false)}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSubmit} 
            variant="contained" 
            autoFocus
            sx={{ textTransform: 'none' }}
          >
            Confirm Submit
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  )
}

export default BallotPage
