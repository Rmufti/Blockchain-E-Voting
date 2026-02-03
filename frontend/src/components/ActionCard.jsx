import { Card, CardContent, Typography, Box } from '@mui/material'

const ActionCard = ({ icon, title, description, onClick, highlighted = false }) => {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        height: '100%',
        border: highlighted ? '2px solid #4A148C' : '1px solid #e0e0e0',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(74, 20, 140, 0.15)',
          borderColor: '#4A148C',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '8px',
              backgroundColor: '#4A148C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              mr: 2,
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1a1a1a' }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#616161' }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default ActionCard
