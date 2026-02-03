import { Box, CircularProgress, Typography } from '@mui/material'

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: 2,
      }}
    >
      <CircularProgress sx={{ color: '#4A148C' }} />
      <Typography variant="body1" sx={{ color: '#616161' }}>
        {message}
      </Typography>
    </Box>
  )
}

export default LoadingSpinner
