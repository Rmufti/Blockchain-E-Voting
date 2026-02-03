import { Card, CardContent, Typography, Box, Radio, Checkbox, IconButton, FormControlLabel, FormGroup } from '@mui/material'
import ArrowUpward from '@mui/icons-material/ArrowUpward'
import ArrowDownward from '@mui/icons-material/ArrowDownward'

const ContestCard = ({ contest, selections, onSelectionChange }) => {
  const handleSingleSelect = (candidateId) => {
    onSelectionChange(contest.id, [candidateId])
  }

  const handleMultiSelect = (candidateId) => {
    const current = selections[contest.id] || []
    const isSelected = current.includes(candidateId)
    
    if (isSelected) {
      // Deselect
      onSelectionChange(contest.id, current.filter(id => id !== candidateId))
    } else {
      // Check max selections
      if (contest.maxSelections && current.length >= contest.maxSelections) {
        return // Cannot select more
      }
      onSelectionChange(contest.id, [...current, candidateId])
    }
  }

  const handleRankMove = (candidateId, direction) => {
    const current = selections[contest.id] || []
    const index = current.indexOf(candidateId)
    
    if (index === -1) {
      // Add to end
      onSelectionChange(contest.id, [...current, candidateId])
    } else {
      const newRanking = [...current]
      if (direction === 'up' && index > 0) {
        [newRanking[index - 1], newRanking[index]] = [newRanking[index], newRanking[index - 1]]
      } else if (direction === 'down' && index < newRanking.length - 1) {
        [newRanking[index], newRanking[index + 1]] = [newRanking[index + 1], newRanking[index]]
      }
      onSelectionChange(contest.id, newRanking)
    }
  }

  const getRank = (candidateId) => {
    const ranking = selections[contest.id] || []
    const index = ranking.indexOf(candidateId)
    return index === -1 ? null : index + 1
  }

  const getSelectedCount = () => {
    const selected = selections[contest.id] || []
    return selected.length
  }

  return (
    <Card variant="outlined" sx={{ mb: 0, backgroundColor: '#ffffff' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1.5, color: '#1a1a1a' }}>
          {contest.title}
        </Typography>
        {contest.instructionText && (
          <Typography 
            variant="body2" 
            sx={{ 
              mb: 2.5, 
              color: '#616161',
              fontStyle: 'italic',
            }}
          >
            {contest.instructionText}
          </Typography>
        )}
        {contest.ruleType === 'multi' && contest.maxSelections && (
          <Typography variant="body2" sx={{ mb: 2, color: '#4A148C', fontWeight: 600 }}>
            {getSelectedCount()} / {contest.maxSelections} selected
          </Typography>
        )}

        <Box sx={{ mt: 2 }}>
          {contest.candidates?.map((candidate) => {
            if (contest.ruleType === 'single') {
              const isSelected = selections[contest.id]?.includes(candidate.id)
              return (
                <FormControlLabel
                  key={candidate.id}
                  control={
                    <Radio
                      checked={isSelected}
                      onChange={() => handleSingleSelect(candidate.id)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" sx={{ color: '#1a1a1a' }}>{candidate.name}</Typography>
                      {candidate.description && (
                        <Typography variant="body2" sx={{ color: '#616161' }}>
                          {candidate.description}
                        </Typography>
                      )}
                    </Box>
                  }
                  sx={{ mb: 1, width: '100%' }}
                />
              )
            } else if (contest.ruleType === 'multi') {
              const isSelected = selections[contest.id]?.includes(candidate.id)
              const atMax = contest.maxSelections && getSelectedCount() >= contest.maxSelections
              return (
                <FormControlLabel
                  key={candidate.id}
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleMultiSelect(candidate.id)}
                      disabled={!isSelected && atMax}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" sx={{ color: '#1a1a1a' }}>{candidate.name}</Typography>
                      {candidate.description && (
                        <Typography variant="body2" sx={{ color: '#616161' }}>
                          {candidate.description}
                        </Typography>
                      )}
                    </Box>
                  }
                  sx={{ mb: 1, width: '100%' }}
                />
              )
            } else if (contest.ruleType === 'ranked') {
              const rank = getRank(candidate.id)
              return (
                <Box
                  key={candidate.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                    p: 2,
                    border: rank ? 2 : 1,
                    borderColor: rank ? '#4A148C' : '#d0d0d0',
                    borderRadius: 2,
                    backgroundColor: rank ? 'rgba(74, 20, 140, 0.1)' : '#f5f5f5',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#4A148C',
                      backgroundColor: rank ? 'rgba(74, 20, 140, 0.15)' : 'rgba(74, 20, 140, 0.05)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', mr: 2 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleRankMove(candidate.id, 'up')}
                      disabled={rank === 1}
                      sx={{ 
                        color: '#4A148C',
                        '&:hover': { backgroundColor: 'rgba(74, 20, 140, 0.1)' },
                        '&.Mui-disabled': { color: '#b0b0b0' },
                      }}
                    >
                      <ArrowUpward fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleRankMove(candidate.id, 'down')}
                      sx={{ 
                        color: '#4A148C',
                        '&:hover': { backgroundColor: 'rgba(74, 20, 140, 0.1)' },
                      }}
                    >
                      <ArrowDownward fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    {rank && (
                      <Typography variant="body2" sx={{ mb: 0.5, color: '#4A148C', fontWeight: 600 }}>
                        Rank #{rank}
                      </Typography>
                    )}
                    <Typography variant="body1" sx={{ color: '#1a1a1a' }}>{candidate.name}</Typography>
                    {candidate.description && (
                      <Typography variant="body2" sx={{ color: '#616161' }}>
                        {candidate.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )
            }
            return null
          })}
        </Box>
      </CardContent>
    </Card>
  )
}

export default ContestCard
