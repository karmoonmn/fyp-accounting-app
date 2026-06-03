import React from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconMail = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)
const IconLock = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
)
const IconUser = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IconBuilding = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)
const IconPin = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconBrain = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm14 3a4 4 0 100-8 4 4 0 000 8z" />
  </svg>
)
const IconTrendUp = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
)
const IconArrow = () => <span style={{ fontSize: 16 }}>→</span>

// ─── Styles as JS objects ─────────────────────────────────────────────────────
const C = {
  teal: '#2D9D8F',
  tealDark: '#1E7A6E',
  tealLight: '#4DC4B4',
  tealMist: '#E8F7F5',
  bg: '#F4F7F6',
  white: '#FFFFFF',
  text: '#1A2E2B',
  muted: '#6B8F8A',
  border: '#D4E8E5',
  gold: '#E8A930',
}

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; }

  .gt-input {
    width: 100%;
    padding: 10px 12px 10px 36px;
    border-radius: 10px;
    border: 1.5px solid #D4E8E5;
    background: #E8F7F5;
    font-size: 13.5px;
    color: #1A2E2B;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .gt-input:focus {
    border-color: #2D9D8F;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(45,157,143,0.1);
  }
  .gt-input::placeholder { color: #6B8F8A; opacity: 0.75; }

  .gt-btn {
    width: 100%;
    padding: 13px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(135deg, #2D9D8F 0%, #1E7A6E 100%);
    color: white;
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 6px 22px rgba(45,157,143,0.38);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .gt-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(45,157,143,0.46); }
  .gt-btn:active { transform: translateY(0); }

  .gt-tab {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    font-size: 13.5px;
    font-weight: 500;
    text-align: center;
    cursor: pointer;
    color: #6B8F8A;
    font-family: 'Sora', sans-serif;
    border: none;
    background: transparent;
    transition: all 0.2s;
  }
  .gt-tab.active {
    background: white;
    color: #1E7A6E;
    box-shadow: 0 2px 8px rgba(45,157,143,0.15);
    font-weight: 600;
  }

  .gt-feature-card {
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(255,255,255,0.72);
    border: 1px solid rgba(255,255,255,0.9);
    border-radius: 14px;
    padding: 13px 16px;
    backdrop-filter: blur(12px);
    box-shadow: 0 2px 12px rgba(45,157,143,0.06);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .gt-feature-card:hover { transform: translateX(3px); box-shadow: 0 4px 18px rgba(45,157,143,0.12); }

  .gt-notif-bar {
    position: fixed; top: 0; left: 0; right: 0;
    height: 46px;
    background: rgba(255,255,255,0.88);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid #D4E8E5;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 36px;
    z-index: 100;
  }

  .gt-section-label {
    font-size: 10.5px;
    font-weight: 700;
    color: #1E7A6E;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 2px solid #E8F7F5;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeup { animation: fadeUp 0.4s ease both; }
  .delay-1 { animation-delay: 0.08s; }
  .delay-2 { animation-delay: 0.16s; }
  .delay-3 { animation-delay: 0.24s; }
  .delay-4 { animation-delay: 0.32s; }
`

function InputField({ label, type = 'text', placeholder, icon: Icon, value, onChange, style }) {
  return (
    <div style={{ marginBottom: 13, ...style }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: C.text, marginBottom: 5 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 11,
            top: '50%',
            transform: 'translateY(-50%)',
            color: C.muted,
            opacity: 0.65,
            pointerEvents: 'none',
            display: 'flex',
          }}
        >
          <Icon size={14} />
        </span>
        <input className="gt-input" type={type} placeholder={placeholder} value={value} onChange={onChange} />
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return <div className="gt-section-label">{children}</div>
}

function LeftPanel() {
  const features = [
    { icon: '💡', color: C.tealMist, title: 'AI Financial Insights', sub: 'Anomaly detection & forecasting' },
    { icon: '📋', color: '#FEF6E8', title: 'Invoice Automation', sub: 'Create & track with one click' },
    { icon: '📈', color: '#EBF3FF', title: 'Real-time Analytics', sub: 'P&L, cash flow & more' },
  ]

  return (
    <div
      style={{
        width: 490,
        flexShrink: 0,
        padding: '56px 48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      <div className="animate-fadeup" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(45,157,143,0.35)',
          }}
        >
          <IconBrain size={22} />
        </div>
        <span
          style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: C.text,
            letterSpacing: -0.3,
          }}
        >
          GLOBALTECH INC
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 0 24px' }}>
        <div
          className="animate-fadeup delay-1"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: C.tealMist,
            border: `1px solid ${C.border}`,
            borderRadius: 100,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 500,
            color: C.tealDark,
            marginBottom: 24,
            width: 'fit-content',
          }}
        >
          <div style={{ width: 7, height: 7, background: C.teal, borderRadius: '50%' }} />
          AI-Powered Financial Platform
        </div>

        <h1
          className="animate-fadeup delay-2"
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 42,
            fontWeight: 700,
            lineHeight: 1.1,
            color: C.text,
            letterSpacing: -1.5,
            marginBottom: 18,
          }}
        >
          Smart Finance
          <br />
          for <span style={{ color: C.teal }}>Modern</span>
          <br />
          Business
        </h1>

        <p
          className="animate-fadeup delay-3"
          style={{
            fontSize: 15,
            color: C.muted,
            lineHeight: 1.65,
            maxWidth: 340,
            marginBottom: 36,
            fontWeight: 300,
          }}
        >
          Manage invoices, track expenses, and get real-time AI insights — all in one intelligent workspace.
        </p>

        <div className="animate-fadeup delay-4" style={{ display: 'flex', gap: 28 }}>
          {[
            { num: '$2.4B', label: 'Processed monthly' },
            { num: '99%', label: 'Uptime guarantee' },
            { num: '48h', label: 'Avg setup time' },
          ].map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              {i > 0 && <div style={{ width: 1, height: 36, background: C.border }} />}
              <div>
                <div
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    color: C.text,
                    letterSpacing: -0.5,
                  }}
                >
                  {s.num}
                </div>
                <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 400, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {features.map((f) => (
          <div key={f.title} className="gt-feature-card">
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: f.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
                flexShrink: 0,
              }}
            >
              {f.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, marginBottom: 2 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 300 }}>{f.sub}</div>
            </div>
            <div style={{ color: C.muted, opacity: 0.4, fontSize: 18 }}>›</div>
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 0,
          top: '8%',
          bottom: '8%',
          width: 1,
          background: `linear-gradient(to bottom, transparent, ${C.border} 30%, ${C.border} 70%, transparent)`,
        }}
      />
    </div>
  )
}

function LoginPage({ onSwitch }) {
  const { signIn, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await signIn(email, password, { remember: true })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    }
  }

  return (
    <div style={{ padding: '22px 28px 28px' }}>
      <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: -0.4, marginBottom: 3 }}>
        Welcome back
      </h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 22, fontWeight: 300 }}>Sign in to your GlobalTech account</p>

      <form onSubmit={onSubmit}>
        <InputField label="Email" type="email" placeholder="admin@company.com" icon={IconMail} value={email} onChange={(e) => setEmail(e.target.value)} />
        <InputField label="Password" type="password" placeholder="••••••••" icon={IconLock} value={password} onChange={(e) => setPassword(e.target.value)} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, marginTop: -4 }}>
          <button type="button" style={{ fontSize: 12, color: C.teal, fontWeight: 500, textDecoration: 'none', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            Forgot Password?
          </button>
        </div>

        {error ? (
          <div style={{ marginBottom: 12, borderRadius: 12, border: '1px solid #FECACA', background: '#FEF2F2', padding: '10px 12px', fontSize: 12.5, color: '#991B1B' }}>
            {error}
          </div>
        ) : null}

        <button className="gt-btn" style={{ marginBottom: 16 }} disabled={loading}>
          {loading ? 'Signing in…' : 'Login'} <IconArrow />
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: C.muted }}>
        New to GlobalTech?{' '}
        <button
          type="button"
          onClick={onSwitch}
          style={{ color: C.teal, fontWeight: 600, textDecoration: 'none', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          Register
        </button>
      </p>
    </div>
  )
}

function RegisterPage({ onSwitch }) {
  const { signUpFirebase, refreshMe, getFreshToken } = useAuth()
  const navigate = useNavigate()

  const [adminName, setAdminName] = React.useState('')
  const [adminEmail, setAdminEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')

  const [companyName, setCompanyName] = React.useState('')
  const [companyEmail, setCompanyEmail] = React.useState('')
  const [location, setLocation] = React.useState('')

  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
    const isValidEmail = (email) => {
      if (!email) return false
      if (!emailRegex.test(email)) return false
      if (email.toLowerCase().endsWith('.com.com')) return false
      return true
    }

    if (!isValidEmail(adminEmail)) {
      setError('Please enter a valid admin email address')
      return
    }
    if (companyEmail && !isValidEmail(companyEmail)) {
      setError('Please enter a valid company email address')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    try {
      await signUpFirebase(adminEmail, password)
      const token = await getFreshToken()
      if (!token) throw new Error('Not signed in')
      await api('/auth/register-company', {
        method: 'POST',
        token,
        body: {
          companyName,
          industry: 'Other',
          country: location || 'Other',
          adminName,
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
    <div style={{ padding: '18px 24px 24px' }}>
      <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 19, fontWeight: 700, color: C.text, letterSpacing: -0.4, marginBottom: 2 }}>
        Create your account
      </h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, fontWeight: 300 }}>Set up your GlobalTech workspace</p>

      <form onSubmit={onSubmit}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <SectionLabel>Admin Account</SectionLabel>
            <InputField label="Admin Name" type="text" placeholder="Full name" icon={IconUser} value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            <InputField label="Admin Email" type="email" placeholder="admin@company.com" icon={IconMail} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            <InputField label="Password" type="password" placeholder="Min. 8 characters" icon={IconLock} value={password} onChange={(e) => setPassword(e.target.value)} />
            <InputField label="Confirm Password" type="password" placeholder="Re-enter password" icon={IconLock} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>

          <div style={{ width: 1, background: C.border, margin: '28px 0 0', flexShrink: 0 }} />

          <div style={{ flex: 1 }}>
            <SectionLabel>Company Info</SectionLabel>
            <InputField label="Company Name" type="text" placeholder="Your company name" icon={IconBuilding} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            <InputField label="Email" type="email" placeholder="company@domain.com" icon={IconMail} value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
            <InputField label="Location" type="text" placeholder="City, Country" icon={IconPin} value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>

        {error ? (
          <div style={{ marginTop: 12, borderRadius: 12, border: '1px solid #FECACA', background: '#FEF2F2', padding: '10px 12px', fontSize: 12.5, color: '#991B1B' }}>
            {error}
          </div>
        ) : null}

        <button className="gt-btn" style={{ marginTop: 16, marginBottom: 12 }} disabled={busy}>
          {busy ? 'Creating…' : 'Register'} <IconArrow />
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: C.muted }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitch}
            style={{ color: C.teal, fontWeight: 600, textDecoration: 'none', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Sign in
          </button>
        </p>
      </form>
    </div>
  )
}

export default function GlobalTechAuth({ initialPage = 'login' }) {
  const [page, setPage] = React.useState(initialPage) // "login" | "register"

  React.useEffect(() => {
    setPage(initialPage)
  }, [initialPage])

  return (
    <>
      <style>{fonts}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background: `
          radial-gradient(ellipse 800px 600px at -10% 110%, rgba(45,157,143,0.18) 0%, transparent 60%),
          radial-gradient(ellipse 500px 500px at 110% -10%, rgba(77,196,180,0.12) 0%, transparent 55%),
          radial-gradient(ellipse 400px 300px at 60% 90%, rgba(232,169,48,0.08) 0%, transparent 50%),
          linear-gradient(155deg, #EDF5F3 0%, #F4F7F6 40%, #EAF2F0 100%)
        `,
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(45,157,143,0.12) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
        }}
      />

      <div className="gt-notif-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, background: C.teal, borderRadius: '50%' }} />
          <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 300 }}>
            🎉 <strong style={{ color: C.text, fontWeight: 500 }}>New:</strong> AI Financial Insights now available
            for all accounts
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <button type="button" style={{ fontSize: 12, color: C.muted, textDecoration: 'none', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            Learn more
          </button>
          <button
            type="button"
            style={{
              fontSize: 12,
              background: C.teal,
              color: 'white',
              padding: '5px 13px',
              borderRadius: 7,
              fontWeight: 500,
              textDecoration: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try it free
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', minHeight: '100vh', paddingTop: 46 }}>
        <LeftPanel />

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 60px 48px 28px',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: page === 'register' ? 500 : 440,
              background: 'rgba(255,255,255,0.92)',
              borderRadius: 28,
              border: '1px solid rgba(255,255,255,0.95)',
              boxShadow:
                '0 32px 80px rgba(45,157,143,0.14), 0 8px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
              backdropFilter: 'blur(24px)',
              overflow: 'hidden',
              transition: 'width 0.3s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                padding: 6,
                background: C.tealMist,
                gap: 4,
                margin: '24px 24px 0',
                borderRadius: 14,
              }}
            >
              <button className={`gt-tab${page === 'login' ? ' active' : ''}`} onClick={() => setPage('login')} type="button">
                Sign In
              </button>
              <button
                className={`gt-tab${page === 'register' ? ' active' : ''}`}
                onClick={() => setPage('register')}
                type="button"
              >
                Create Account
              </button>
            </div>

            <div key={page} className="animate-fadeup">
              {page === 'login' ? <LoginPage onSwitch={() => setPage('register')} /> : <RegisterPage onSwitch={() => setPage('login')} />}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 60,
              right: 60,
              background: 'rgba(255,255,255,0.88)',
              border: '1px solid rgba(255,255,255,0.95)',
              borderRadius: 16,
              padding: '13px 18px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(45,157,143,0.14)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 3px 10px rgba(45,157,143,0.3)',
              }}
            >
              <IconTrendUp size={15} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 300, marginBottom: 2 }}>Monthly Revenue</div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13.5, color: C.text }}>
                $250,000 <span style={{ color: C.teal, fontSize: 11, fontWeight: 500 }}>↑ 12.5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

