import { Alert, AlertTitle } from '@mui/material'

const ErrorAlert = ({ message, title, severity = 'error', onClose }) => {
  return (
    <Alert severity={severity} onClose={onClose} sx={{ mb: 2 }}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
    </Alert>
  )
}

export default ErrorAlert
