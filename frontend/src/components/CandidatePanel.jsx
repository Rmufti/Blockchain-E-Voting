import { Card, CardContent, Typography, Box, Radio, Checkbox, IconButton, FormControlLabel } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ArrowDownward from '@mui/icons-material/ArrowDownward'
import ArrowUpward from '@mui/icons-material/ArrowUpward'

const CandidatePanel = ({ 
  contest, 
  candidates, 
  selections, 
  onSelectionChange,
  showDetails,
  onToggleDetails 
}) => {
  const selectedCandidates = selections[contest.id] || []
  const isSelected = (candidateId) => selectedCandidates.includes(candidateId)
  const getRank = (candidateId) => {
    const index = selectedCandidates.indexOf(candidateId)
    return index === -1 ? null : index + 1
  }
  const getSelectedCount = () => selectedCandidates.length

  const handleSelect = (candidateId) => {
    if (contest.ruleType === 'single') {
      onSelectionChange(contest.id, [candidateId])
    } else if (contest.ruleType === 'multi') {
      const current = selectedCandidates
      const isCurrentlySelected = current.includes(candidateId)
      
      if (isCurrentlySelected) {
        onSelectionChange(contest.id, current.filter(id => id !== candidateId))
      } else {
        if (contest.maxSelections && current.length >= contest.maxSelections) {
          return // Cannot select more
        }
        onSelectionChange(contest.id, [...current, candidateId])
      }
    } else if (contest.ruleType === 'ranked') {
      const current = selectedCandidates
      const index = current.indexOf(candidateId)
      
      if (index === -1) {
        onSelectionChange(contest.id, [...current, candidateId])
      } else {
        // Remove from ranking
        onSelectionChange(contest.id, current.filter(id => id !== candidateId))
      }
    }
  }

  const handleRankMove = (candidateId, direction) => {
    const current = selectedCandidates
    const index = current.indexOf(candidateId)
    
    if (index === -1) {
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

  // Find the primary selected candidate (first selected, or highest ranked)
  const primarySelected = candidates.find(c => {
    if (contest.ruleType === 'ranked') {
      return getRank(c.id) === 1
    }
    return isSelected(c.id)
  })

  return (
    <Box sx={{ mb: 4 }}>
      {/* Contest Title */}
      <Typography variant="h5" sx={{ mb: 2, color: '#4A148C', fontWeight: 600 }}>
        {contest.title}
      </Typography>
      {contest.instructionText && (
        <Typography variant="body2" sx={{ mb: 3, color: '#616161', fontStyle: 'italic' }}>
          {contest.instructionText}
        </Typography>
      )}
      {contest.ruleType === 'multi' && contest.maxSelections && (
        <Typography variant="body2" sx={{ mb: 2, color: '#4A148C', fontWeight: 600 }}>
          {getSelectedCount()} / {contest.maxSelections} selected
        </Typography>
      )}

      {/* Primary Selected Candidate (if any) */}
      {primarySelected && (
        <Card 
          sx={{ 
            mb: 3, 
            backgroundColor: '#f5f5f5',
            border: '2px solid #4A148C',
            borderRadius: '8px',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#4A148C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {primarySelected.name}
                  </Typography>
                  {contest.ruleType === 'ranked' && (
                    <Typography variant="body2" sx={{ color: '#4A148C', fontWeight: 600 }}>
                      Rank #{getRank(primarySelected.id)}
                    </Typography>
                  )}
                </Box>
              </Box>
              <IconButton 
                onClick={() => onToggleDetails(primarySelected.id)}
                sx={{ color: '#4A148C' }}
              >
                <VisibilityIcon />
              </IconButton>
            </Box>
            
            {showDetails === primarySelected.id && (
              <Box 
                sx={{ 
                  mt: 2, 
                  p: 2, 
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                }}
              >
                <Typography variant="body2" sx={{ mb: 1, color: '#1a1a1a' }}>
                  <strong>Name:</strong> {primarySelected.name}
                </Typography>
                {primarySelected.description && (
                  <Typography variant="body2" sx={{ mb: 1, color: '#616161' }}>
                    <strong>Description:</strong> {primarySelected.description}
                  </Typography>
                )}
                {contest.ruleType === 'ranked' && (
                  <Typography variant="body2" sx={{ color: '#4A148C', fontWeight: 600 }}>
                    <strong>Your Ranking:</strong> #{getRank(primarySelected.id)}
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Other Candidates */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {candidates
          .filter(c => !primarySelected || c.id !== primarySelected.id)
          .map((candidate) => {
            const candidateIsSelected = isSelected(candidate.id)
            const candidateRank = getRank(candidate.id)
            const atMax = contest.ruleType === 'multi' && contest.maxSelections && getSelectedCount() >= contest.maxSelections

            return (
              <Card 
                key={candidate.id}
                sx={{ 
                  backgroundColor: '#ffffff',
                  border: candidateIsSelected ? '2px solid #4A148C' : '1px solid #e0e0e0',
                  borderRadius: '8px',
                  '&:hover': {
                    borderColor: '#4A148C',
                    boxShadow: '0 2px 8px rgba(74, 20, 140, 0.1)',
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      {contest.ruleType === 'single' && (
                        <Radio
                          checked={candidateIsSelected}
                          onChange={() => handleSelect(candidate.id)}
                          sx={{ color: '#4A148C', '&.Mui-checked': { color: '#4A148C' } }}
                        />
                      )}
                      {contest.ruleType === 'multi' && (
                        <Checkbox
                          checked={candidateIsSelected}
                          onChange={() => handleSelect(candidate.id)}
                          disabled={!candidateIsSelected && atMax}
                          sx={{ color: '#4A148C', '&.Mui-checked': { color: '#4A148C' } }}
                        />
                      )}
                      {contest.ruleType === 'ranked' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleRankMove(candidate.id, 'up')}
                            disabled={candidateRank === 1}
                            sx={{ 
                              color: '#4A148C',
                              '&.Mui-disabled': { color: '#b0b0b0' },
                            }}
                          >
                            <ArrowUpward fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleRankMove(candidate.id, 'down')}
                            sx={{ color: '#4A148C' }}
                          >
                            <ArrowDownward fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                      
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: '#1a1a1a' }}>
                          {candidate.name}
                        </Typography>
                        {candidate.description && (
                          <Typography variant="body2" sx={{ color: '#616161', mt: 0.5 }}>
                            {candidate.description}
                          </Typography>
                        )}
                        {candidateRank && (
                          <Typography variant="body2" sx={{ color: '#4A148C', fontWeight: 600, mt: 0.5 }}>
                            Rank #{candidateRank}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <IconButton 
                      onClick={() => onToggleDetails(candidate.id)}
                      sx={{ color: '#4A148C' }}
                    >
                      {showDetails === candidate.id ? (
                        <ArrowUpward />
                      ) : (
                        <ArrowDownward />
                      )}
                    </IconButton>
                  </Box>

                  {showDetails === candidate.id && (
                    <Box 
                      sx={{ 
                        mt: 2, 
                        pt: 2, 
                        borderTop: '1px solid #e0e0e0',
                      }}
                    >
                      <Typography variant="body2" sx={{ mb: 1, color: '#1a1a1a' }}>
                        <strong>Name:</strong> {candidate.name}
                      </Typography>
                      {candidate.description && (
                        <Typography variant="body2" sx={{ color: '#616161' }}>
                          <strong>Description:</strong> {candidate.description}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            )
          })}
      </Box>
    </Box>
  )
}

export default CandidatePanel
