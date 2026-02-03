import { Card, CardContent, Typography, Box } from '@mui/material'

const IconStatsCard = ({ icon, value, label, iconColor = '#4A148C' }) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '8px',
              backgroundColor: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 0.5 }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ color: '#616161', fontWeight: 500 }}>
              {label}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default IconStatsCard
