import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

const ROLES = ['STAFF', 'ADMIN']

export default function RegisterUser() {
  const { getFreshToken, me } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [addr, setAddr] = useState('')
  const [role, setRole] = useState('STAFF')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const canManage = me && (me.role === 'ADMIN' || me.role === 'SUPER_ADMIN')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Not signed in')
      const body = {
        email,
        password,
        name,
        phoneNumber: phoneNumber || undefined,
        addr: addr || undefined,
        role,
      }
      const res = await api('/auth/register-user', {
        method: 'POST',
        token,
        body,
      })
      setSuccess(`User created (id ${res.userId}). They can sign in with the email and password you set.`)
      setEmail('')
      setPassword('')
      setName('')
      setPhoneNumber('')
      setAddr('')
      setRole('STAFF')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setBusy(false)
    }
  }

  if (!canManage) {
    return (
      <div className="auth-page">
        <div className="card">
          <h1>Add user</h1>
          <p className="muted">Only company admins can register new users.</p>
          <Link to="/">Back to dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="card card-wide">
        <h1>Register user</h1>
        <p className="muted">
          Creates a Firebase account for a colleague and links them to your company.
        </p>
        <form onSubmit={handleSubmit} className="form form-grid">
          <label>
            Email
            <input
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Temporary password
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
            Full name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            Phone (optional)
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </label>
          <label>
            Address (optional)
            <textarea
              rows={2}
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
            />
          </label>
          {error ? <p className="error span-2">{error}</p> : null}
          {success ? <p className="success span-2">{success}</p> : null}
          <button type="submit" className="span-2" disabled={busy}>
            {busy ? 'Creating…' : 'Create user'}
          </button>
        </form>
        <p className="footer-link">
          <Link to="/">Dashboard</Link>
        </p>
      </div>
    </div>
  )
}
