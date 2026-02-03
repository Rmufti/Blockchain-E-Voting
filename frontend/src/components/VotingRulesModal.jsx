import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'

const VotingRulesModal = ({ open, onClose, onProceed, ballotTitle }) => {
  const [agreed, setAgreed] = useState(false)

  const handleProceed = () => {
    if (agreed) {
      onProceed()
      onClose()
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '8px',
        },
      }}
    >
      <DialogTitle sx={{ color: '#4A148C', fontWeight: 600, pb: 2 }}>
        Election Rules & Instructions
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 500, color: '#1a1a1a' }}>
            This election is being conducted by Western University Election Commission.
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: '#616161', lineHeight: 1.7 }}>
            As a registered student or faculty member, you are eligible to vote in this election. 
            Follow the steps below to cast a valid vote. Vote based on your own decision, 
            not under pressure or coercion. If you experience any threats or 
            intimidation regarding your voting decision, please contact the election commission immediately.
          </Typography>
        </Box>

        <Typography variant="h6" sx={{ mb: 2, color: '#4A148C', fontWeight: 600 }}>
          Steps to Cast Your Vote:
        </Typography>
        <List sx={{ mb: 3, pl: 0 }}>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc', pl: 2, py: 0.5 }}>
            <ListItemText 
              primary="Review all candidates and their information."
              primaryTypographyProps={{ variant: 'body2', color: '#616161' }}
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc', pl: 2, py: 0.5 }}>
            <ListItemText 
              primary="Select your preferred candidate(s) based on the contest type (single choice, multiple choice, or ranked)."
              primaryTypographyProps={{ variant: 'body2', color: '#616161' }}
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc', pl: 2, py: 0.5 }}>
            <ListItemText 
              primary="You are allowed to make only one vote per ballot."
              primaryTypographyProps={{ variant: 'body2', color: '#616161' }}
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc', pl: 2, py: 0.5 }}>
            <ListItemText 
              primary="For single-choice contests, select exactly one candidate."
              primaryTypographyProps={{ variant: 'body2', color: '#616161' }}
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc', pl: 2, py: 0.5 }}>
            <ListItemText 
              primary="For multiple-choice contests, select up to the maximum number allowed."
              primaryTypographyProps={{ variant: 'body2', color: '#616161' }}
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc', pl: 2, py: 0.5 }}>
            <ListItemText 
              primary="For ranked contests, rank candidates in order of preference."
              primaryTypographyProps={{ variant: 'body2', color: '#616161' }}
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc', pl: 2, py: 0.5 }}>
            <ListItemText 
              primary="Verify your selections before submitting your ballot."
              primaryTypographyProps={{ variant: 'body2', color: '#616161' }}
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc', pl: 2, py: 0.5 }}>
            <ListItemText 
              primary="Once submitted, your vote cannot be changed."
              primaryTypographyProps={{ variant: 'body2', color: '#616161' }}
            />
          </ListItem>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc', pl: 2, py: 0.5 }}>
            <ListItemText 
              primary="Results will be announced after the election period closes."
              primaryTypographyProps={{ variant: 'body2', color: '#616161' }}
            />
          </ListItem>
        </List>

        <FormControlLabel
          control={
            <Checkbox
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
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
              I understand and will follow the above steps.
            </Typography>
          }
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button 
          onClick={handleProceed} 
          variant="contained"
          disabled={!agreed}
          sx={{ textTransform: 'none' }}
        >
          Proceed
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default VotingRulesModal
