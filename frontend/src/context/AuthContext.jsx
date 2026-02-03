import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load from localStorage on mount
    const storedToken = localStorage.getItem('token')
    const storedRole = localStorage.getItem('role')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedRole) {
      setToken(storedToken)
      setRole(storedRole)
      setUser(storedUser ? JSON.parse(storedUser) : null)
    }
    setLoading(false)
  }, [])

  const login = (tokenData, userData, userRole) => {
    setToken(tokenData)
    setRole(userRole)
    setUser(userData)
    localStorage.setItem('token', tokenData)
    localStorage.setItem('role', userRole)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const getUserFaculty = () => {
    return user?.faculty || null
  }

  const logout = () => {
    setToken(null)
    setRole(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('user')
  }

  const isAuthenticated = () => {
    return !!token && !!role
  }

  const value = {
    user,
    role,
    token,
    login,
    logout,
    isAuthenticated: isAuthenticated(),
    loading,
    getUserFaculty,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
