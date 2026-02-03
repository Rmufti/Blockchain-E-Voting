import { Card, CardContent, Typography } from '@mui/material'

const StatsCard = ({ label, value }) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography sx={{ color: '#616161', mb: 1 }} gutterBottom variant="body2" fontWeight={500}>
          {label}
        </Typography>
        <Typography variant="h4" component="div" sx={{ color: '#1a1a1a', fontWeight: 600 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default StatsCard
