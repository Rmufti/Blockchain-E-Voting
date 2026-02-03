import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
} from '@mui/material'
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material'

const ContactPage = () => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff', py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom sx={{ color: '#4A148C', mb: 4, fontWeight: 600 }}>
          Contact
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <EmailIcon sx={{ fontSize: 48, color: '#4A148C', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Email
                </Typography>
                <Typography variant="body2" sx={{ color: '#616161' }}>
                  evoting@uwo.ca
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <PhoneIcon sx={{ fontSize: 48, color: '#4A148C', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Phone
                </Typography>
                <Typography variant="body2" sx={{ color: '#616161' }}>
                  (519) 661-2111
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <LocationIcon sx={{ fontSize: 48, color: '#4A148C', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Location
                </Typography>
                <Typography variant="body2" sx={{ color: '#616161' }}>
                  Western University<br />
                  London, ON, Canada
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, p: 3, backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Election Commission Office Hours
          </Typography>
          <Typography variant="body2" sx={{ color: '#616161', mb: 1 }}>
            Monday - Friday: 9:00 AM - 5:00 PM
          </Typography>
          <Typography variant="body2" sx={{ color: '#616161' }}>
            For urgent matters, please contact the election commission directly.
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default ContactPage
