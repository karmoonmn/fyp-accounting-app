import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function RegisterCompany() {
  const { signUpFirebase, refreshMe, getFreshToken } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyAddr, setCompanyAddr] = useState('')
  const [adminName, setAdminName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signUpFirebase(email, password)
      const token = await getFreshToken()
      await api('/auth/register-company', {
        method: 'POST',
        token,
        body: {
          companyName,
          companyEmail: companyEmail || undefined,
          companyPhone: companyPhone || undefined,
          companyAddr: companyAddr || undefined,
          adminName: adminName || undefined,
        },
      })
      await refreshMe(token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="card card-wide">
        <h1>Register company</h1>
        <p className="muted">
          Creates your Firebase account, then links it as the first admin of a new company.
        </p>
        <form onSubmit={handleSubmit} className="form form-grid">
          <fieldset>
            <legend>Admin account</legend>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password (min 6 characters)
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <label>
              Your display name (optional)
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Defaults to your email"
              />
            </label>
          </fieldset>
          <fieldset>
            <legend>Company</legend>
            <label>
              Company name
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </label>
            <label>
              Company email (optional)
              <input
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
              />
            </label>
            <label>
              Phone (optional)
              <input
                type="tel"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
              />
            </label>
            <label>
              Address (optional)
              <textarea
                rows={2}
                value={companyAddr}
                onChange={(e) => setCompanyAddr(e.target.value)}
              />
            </label>
          </fieldset>
          {error ? <p className="error span-2">{error}</p> : null}
          <button type="submit" className="span-2" disabled={busy}>
            {busy ? 'Working…' : 'Create company'}
          </button>
        </form>
        <p className="footer-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
