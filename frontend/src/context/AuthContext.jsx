import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [idToken, setIdToken] = useState(null)
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [meError, setMeError] = useState(null)

  const refreshMe = useCallback(async (token) => {
    if (!token) {
      setMe(null)
      setMeError(null)
      return
    }
    try {
      setMeError(null)
      const profile = await api('/auth/me', { token })
      setMe(profile)
    } catch (e) {
      setMe(null)
      setMeError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (!user) {
        setIdToken(null)
        setMe(null)
        setMeError(null)
        setLoading(false)
        return
      }
      try {
        const token = await user.getIdToken()
        setIdToken(token)
        await refreshMe(token)
      } catch (e) {
        setMeError(e instanceof Error ? e.message : String(e))
        setIdToken(null)
        setMe(null)
      } finally {
        setLoading(false)
      }
    })
  }, [refreshMe])

  const signIn = useCallback(async (email, password, opts = {}) => {
    setMeError(null)
    const remember = Boolean(opts.remember)
    await setPersistence(
      auth,
      remember ? browserLocalPersistence : browserSessionPersistence,
    )
    await signInWithEmailAndPassword(auth, email.trim(), password)
  }, [])

  const signUpFirebase = useCallback(async (email, password) => {
    setMeError(null)
    await createUserWithEmailAndPassword(auth, email.trim(), password)
  }, [])

  const signOut = useCallback(async () => {
    setMeError(null)
    await firebaseSignOut(auth)
  }, [])

  const getFreshToken = useCallback(async () => {
    const u = auth.currentUser
    if (!u) return null
    return u.getIdToken(true)
  }, [])

  const value = useMemo(
    () => ({
      firebaseUser,
      idToken,
      me,
      meError,
      loading,
      signIn,
      signUpFirebase,
      signOut,
      refreshMe,
      getFreshToken,
    }),
    [
      firebaseUser,
      idToken,
      me,
      meError,
      loading,
      signIn,
      signUpFirebase,
      signOut,
      refreshMe,
      getFreshToken,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
