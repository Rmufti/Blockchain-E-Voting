import { Card, CardContent, Typography, Radio } from '@mui/material'

const CandidateCard = ({ candidate, selected, onSelect }) => {
  return (
    <Card
      sx={{
        cursor: 'pointer',
        border: selected ? 2 : 1,
        borderColor: selected ? 'primary.main' : 'divider',
        backgroundColor: selected ? 'action.selected' : 'background.paper',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        mb: 2,
      }}
      onClick={onSelect}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Radio checked={selected} />
        <div>
          <Typography variant="h6" component="div">
            {candidate.name}
          </Typography>
          {candidate.description && (
            <Typography variant="body2" color="text.secondary">
              {candidate.description}
            </Typography>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default CandidateCard
