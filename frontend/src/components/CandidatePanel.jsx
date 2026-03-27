import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Card, CardContent, Typography, Box, Radio, Checkbox, IconButton } from '@mui/material'
import ArrowDownward from '@mui/icons-material/ArrowDownward'
import ArrowUpward from '@mui/icons-material/ArrowUpward'

const CandidatePanel = ({ 
  contest, 
  candidates, 
  selections, 
  onSelectionChange
}) => {
  const selectedCandidates = selections[contest.id] || []
  const rankedOrderIds = useMemo(() => {
    if (contest.ruleType !== 'ranked') return []

    const candidateIds = candidates.map((candidate) => candidate.id)
    const uniqueSelected = []
    const seen = new Set()

    selectedCandidates.forEach((id) => {
      if (candidateIds.includes(id) && !seen.has(id)) {
        uniqueSelected.push(id)
        seen.add(id)
      }
    })

    const remaining = candidateIds.filter((id) => !seen.has(id))
    return [...uniqueSelected, ...remaining]
  }, [contest.ruleType, candidates, selectedCandidates])

  const isSelected = (candidateId) => selectedCandidates.includes(candidateId)
  const getRank = (candidateId) => {
    const order = contest.ruleType === 'ranked' ? rankedOrderIds : selectedCandidates
    const index = order.indexOf(candidateId)
    return index === -1 ? null : index + 1
  }
  const getSelectedCount = () => selectedCandidates.length
  const itemRefs = useRef(new Map())
  const previousPositionsRef = useRef(new Map())

  useEffect(() => {
    if (contest.ruleType !== 'ranked') return

    const hasSameOrder =
      rankedOrderIds.length === selectedCandidates.length &&
      rankedOrderIds.every((id, idx) => id === selectedCandidates[idx])

    if (!hasSameOrder) {
      onSelectionChange(contest.id, rankedOrderIds)
    }
  }, [contest.ruleType, contest.id, rankedOrderIds, selectedCandidates, onSelectionChange])

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
    }
  }

  const handleRankMove = (candidateId, direction) => {
    const current = rankedOrderIds
    const index = current.indexOf(candidateId)
    
    if (index === -1) {
      onSelectionChange(contest.id, [...current, candidateId])
    } else {
      const newRanking = [...current]
      if (direction === 'up' && index > 0) {
        [newRanking[index - 1], newRanking[index]] = [newRanking[index], newRanking[index - 1]]
      } else if (direction === 'up' && index === 0 && newRanking.length > 1) {
        const [first] = newRanking.splice(0, 1)
        newRanking.push(first)
      } else if (direction === 'down' && index < newRanking.length - 1) {
        [newRanking[index], newRanking[index + 1]] = [newRanking[index + 1], newRanking[index]]
      } else if (direction === 'down' && index === newRanking.length - 1 && newRanking.length > 1) {
        const [last] = newRanking.splice(newRanking.length - 1, 1)
        newRanking.unshift(last)
      }
      onSelectionChange(contest.id, newRanking)
    }
  }

  const primarySelected = candidates.find(c => isSelected(c.id))

  const displayedCandidates = useMemo(() => {
    if (contest.ruleType === 'ranked') {
      const originalIndex = new Map(candidates.map((candidate, index) => [candidate.id, index]))
      return [...candidates].sort((a, b) => {
        const aRank = getRank(a.id)
        const bRank = getRank(b.id)

        if (aRank && bRank) return aRank - bRank
        if (aRank) return -1
        if (bRank) return 1
        return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0)
      })
    }

    // For multi, keep all candidates in the list (no featured card)
    if (contest.ruleType === 'multi') return candidates
    return candidates.filter(c => !primarySelected || c.id !== primarySelected.id)
  }, [contest.ruleType, candidates, selectedCandidates, primarySelected])

  useLayoutEffect(() => {
    const currentPositions = new Map()

    displayedCandidates.forEach((candidate) => {
      const node = itemRefs.current.get(candidate.id)
      if (node) {
        currentPositions.set(candidate.id, node.getBoundingClientRect().top)
      }
    })

    currentPositions.forEach((currentTop, candidateId) => {
      const previousTop = previousPositionsRef.current.get(candidateId)
      const node = itemRefs.current.get(candidateId)
      if (!node || previousTop === undefined) return

      const delta = previousTop - currentTop
      if (delta === 0) return

      node.style.transition = 'none'
      node.style.transform = `translateY(${delta}px)`

      requestAnimationFrame(() => {
        node.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)'
        node.style.transform = 'translateY(0)'
      })
    })

    previousPositionsRef.current = currentPositions
  }, [displayedCandidates])

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

      {/* Primary Selected Candidate (if any) — single type only */}
      {contest.ruleType === 'single' && primarySelected && (
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
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Other Candidates */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {displayedCandidates.map((candidate) => {
            const candidateIsSelected = contest.ruleType === 'ranked' ? true : isSelected(candidate.id)
            const candidateRank = getRank(candidate.id)
            const atMax = contest.ruleType === 'multi' && contest.maxSelections && getSelectedCount() >= contest.maxSelections

            return (
              <Box
                key={candidate.id}
                ref={(node) => {
                  if (node) itemRefs.current.set(candidate.id, node)
                  else itemRefs.current.delete(candidate.id)
                }}
              >
                <Card
                  sx={{
                    backgroundColor: '#ffffff',
                    border: candidateIsSelected ? '2px solid #4A148C' : '1px solid #e0e0e0',
                    borderRadius: '8px',
                    '&:hover': {
                      borderColor: '#4A148C',
                      boxShadow: '0 2px 8px rgba(74, 20, 140, 0.1)',
                    },
                    transition: 'box-shadow 180ms ease, border-color 180ms ease',
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
                              sx={{
                                color: '#4A148C',
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
                          {contest.ruleType === 'ranked' && candidateRank && (
                            <Typography variant="body2" sx={{ color: '#4A148C', fontWeight: 600, mt: 0.25 }}>
                              Rank #{candidateRank}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )
          })}
      </Box>
    </Box>
  )
}

export default CandidatePanel
