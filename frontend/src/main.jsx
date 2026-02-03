import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import App from './App'
import { AuthProvider } from './context/AuthContext'

const theme = createTheme({
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      color: '#4A148C', // Western purple headings
    },
    h5: {
      fontWeight: 600,
      color: '#4A148C',
    },
    h6: {
      fontWeight: 600,
      color: '#1a1a1a',
    },
    body1: {
      color: '#1a1a1a',
    },
    body2: {
      color: '#616161',
    },
  },
  spacing: 8,
  palette: {
    mode: 'light',
    primary: {
      main: '#4A148C', // Western purple
      light: '#7B1FA2',
      dark: '#38006B',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#616161', // Neutral grey
      light: '#9E9E9E',
      dark: '#424242',
    },
    background: {
      default: '#ffffff', // White background like Western
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#616161',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#1a1a1a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#ffffff',
            '& fieldset': {
              borderColor: '#b0b0b0',
            },
            '&:hover fieldset': {
              borderColor: '#4A148C',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4A148C',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#616161',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: '#4A148C',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#38006B',
          },
          fontWeight: 600,
          textTransform: 'none',
        },
        outlined: {
          borderColor: '#4A148C',
          color: '#4A148C',
          '&:hover': {
            borderColor: '#38006B',
            backgroundColor: 'rgba(74, 20, 140, 0.08)',
          },
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#1a1a1a',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
