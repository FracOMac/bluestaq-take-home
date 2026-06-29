import { createContext, useContext, useState, type ReactNode } from 'react'
import { getToken, saveToken, clearToken } from './auth'

interface AuthValue {
  token: string | null
  isAuthenticated: boolean
  signIn: (token: string) => void
  signOut: () => void
}

const AuthContext = createContext<AuthValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getToken())

  function signIn(newToken: string) {
    saveToken(newToken)
    setToken(newToken)
  }

  function signOut() {
    clearToken()
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated: token !== null, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
