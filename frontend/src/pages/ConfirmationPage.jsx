import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
} from '@mui/material'
import CheckCircle from '@mui/icons-material/CheckCircle'

const ConfirmationPage = () => {
  const { ballotId } = useParams()
  const [transactionId, setTransactionId] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Get transactionId from navigation state or localStorage
    const txId = location.state?.transactionId || 
                 (ballotId ? localStorage.getItem(`lastTransactionId_${ballotId}`) : null) ||
                 localStorage.getItem('lastTransactionId')
    if (txId) {
      setTransactionId(txId)
      if (ballotId) {
        localStorage.setItem(`lastTransactionId_${ballotId}`, txId)
      }
      localStorage.setItem('lastTransactionId', txId)
    }
  }, [location, ballotId])

  const handleBackToElections = () => {
    navigate('/vote')
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Container maxWidth="sm">
        <Paper 
          elevation={2} 
          sx={{ 
            padding: 5, 
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
          }}
        >
          <CheckCircle sx={{ fontSize: 56, mb: 3, color: '#4A148C' }} />
          <Typography variant="h4" gutterBottom sx={{ mb: 2, color: '#1a1a1a' }}>
            Vote recorded
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: '#616161' }}>
            Your vote has been submitted.
          </Typography>

        {transactionId && (
          <Box
            sx={{
              backgroundColor: 'grey.100',
              padding: 2,
              borderRadius: 1,
              mb: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Transaction ID:
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {transactionId}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Save this ID if you need to verify your vote.
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          size="large"
          onClick={handleBackToElections}
          fullWidth
        >
          Back to Elections
        </Button>
      </Paper>
      </Container>
    </Box>
  )
}

export default ConfirmationPage
