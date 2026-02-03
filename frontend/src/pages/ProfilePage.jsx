import { useState } from 'react'
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Avatar,
  Grid,
} from '@mui/material'
import {
  Edit as EditIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'

const ProfilePage = () => {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Student User',
    email: user?.email || 'student@uwo.ca',
    faculty: user?.faculty || 'SCIENCE',
    studentId: '12345678',
    year: '3rd Year',
    program: 'Computer Science',
  })

  const handleEdit = () => {
    setIsEditing(!isEditing)
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff', py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom sx={{ color: '#4A148C', mb: 4, fontWeight: 600 }}>
          Personal Info
        </Typography>

        <Grid container spacing={4}>
          {/* Left Column - Profile Picture */}
          <Grid item xs={12} md={4}>
            <Card sx={{ textAlign: 'center', p: 3 }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  backgroundColor: '#4A148C',
                  fontSize: '3rem',
                }}
              >
                <PersonIcon sx={{ fontSize: '4rem' }} />
              </Avatar>
              <Button
                variant="contained"
                fullWidth
                sx={{ mb: 2, textTransform: 'none' }}
                onClick={() => console.log('Change profile picture')}
              >
                Change profile picture
              </Button>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                fullWidth
                onClick={handleEdit}
                sx={{ textTransform: 'none' }}
              >
                Edit Profile
              </Button>
            </Card>
          </Grid>

          {/* Right Column - Personal Details */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#616161', mb: 0.5 }}>
                      Name
                    </Typography>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Typography variant="body1" sx={{ color: '#1a1a1a', fontWeight: 500 }}>
                        {profileData.name}
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#616161', mb: 0.5 }}>
                      Email
                    </Typography>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Typography variant="body1" sx={{ color: '#1a1a1a', fontWeight: 500 }}>
                        {profileData.email}
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#616161', mb: 0.5 }}>
                      Student ID
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1a1a1a', fontWeight: 500 }}>
                      {profileData.studentId}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#616161', mb: 0.5 }}>
                      Faculty
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1a1a1a', fontWeight: 500 }}>
                      {profileData.faculty}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#616161', mb: 0.5 }}>
                      Year
                    </Typography>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        value={profileData.year}
                        onChange={(e) => setProfileData({ ...profileData, year: e.target.value })}
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Typography variant="body1" sx={{ color: '#1a1a1a', fontWeight: 500 }}>
                        {profileData.year}
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#616161', mb: 0.5 }}>
                      Program
                    </Typography>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        value={profileData.program}
                        onChange={(e) => setProfileData({ ...profileData, program: e.target.value })}
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Typography variant="body1" sx={{ color: '#1a1a1a', fontWeight: 500 }}>
                        {profileData.program}
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#616161', mb: 0.5 }}>
                      Eligible
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#4caf50', fontWeight: 500 }}>
                      True
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ color: '#616161', mb: 0.5 }}>
                      Verified
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#4caf50', fontWeight: 500 }}>
                      True
                    </Typography>
                  </Grid>

                  {isEditing && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button
                          variant="contained"
                          onClick={() => {
                            setIsEditing(false)
                            // TODO: Save changes
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => setIsEditing(false)}
                          sx={{ textTransform: 'none' }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default ProfilePage
