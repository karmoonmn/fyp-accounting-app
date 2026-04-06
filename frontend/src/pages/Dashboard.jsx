import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { me, meError, loading, signOut, firebaseUser, getFreshToken } = useAuth()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState(null)
  const [invoiceErr, setInvoiceErr] = useState('')
  const [txPage, setTxPage] = useState(null)
  const [txErr, setTxErr] = useState('')

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    if (!me || meError) {
      setInvoices(null)
      setTxPage(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const token = await getFreshToken()
        if (!token || cancelled) return
        const [invList, txData] = await Promise.all([
          api('/invoice', { token }),
          api('/transaction/filter', {
            method: 'POST',
            token,
            body: {},
          }),
        ])
        if (!cancelled) {
          setInvoices(invList)
          setInvoiceErr('')
          setTxPage(txData)
          console.log(txData)
          setTxErr('')
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e)
          setInvoiceErr(msg)
          setTxErr(msg)
          setInvoices([])
          setTxPage(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [me, meError, getFreshToken])

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading session…</p>
      </div>
    )
  }

  if (!firebaseUser) {
    return (
      <div className="page">
        <p>You are not signed in.</p>
        <Link to="/login">Sign in</Link>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="top-bar">
        <h1>Accounting</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/invoice/new">New invoice</Link>
          {(me?.role === 'ADMIN' || me?.role === 'SUPER_ADMIN') && (
            <Link to="/register-user">Register user</Link>
          )}
          <button type="button" className="linkish" onClick={handleSignOut}>
            Sign out
          </button>
        </nav>
      </header>

      <section className="card flat">
        <h2>Session</h2>
        {meError ? (
          <div>
            <p className="error">
              Backend could not link this Firebase user: {meError}
            </p>
            <p className="muted">
              If you have not completed company registration, use{' '}
              <Link to="/register-company">Register company</Link>.
            </p>
          </div>
        ) : me ? (
          <dl className="kv">
            <dt>User ID</dt>
            <dd>{me.userId}</dd>
            <dt>Company ID</dt>
            <dd>{me.companyId}</dd>
            <dt>Role</dt>
            <dd>{me.role}</dd>
            <dt>Firebase UID</dt>
            <dd className="mono">{me.firebaseUid}</dd>
          </dl>
        ) : (
          <p className="muted">No profile loaded.</p>
        )}
      </section>

      {me && !meError ? (
        <>
          <section className="card flat">
            <h2>Your invoices</h2>
            <p className="muted">
              Loaded with <code className="mono">Authorization: Bearer &lt;token&gt;</code> — company
              comes from the server session, not the request body.
            </p>
            {invoiceErr ? (
              <p className="error">{invoiceErr}</p>
            ) : invoices === null ? (
              <p className="muted">Loading…</p>
            ) : invoices.length === 0 ? (
              <p className="muted">No invoices yet.</p>
            ) : (
              <ul className="simple-list">
                {invoices.map((inv) => (
                  <li key={inv.id}>
                    #{inv.id} — {inv.docNumber ?? '—'} — {inv.txnDate ?? '—'} —{' '}
                    {inv.totalAmt != null ? String(inv.totalAmt) : '—'}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card flat">
            <h2>Your transactions (filter)</h2>
            {txErr ? (
              <p className="error">{txErr}</p>
            ) : txPage === null ? (
              <p className="muted">Loading…</p>
            ) : (
              <p className="muted">
                Page {txPage.number + 1} of {txPage.totalPages} — {txPage.totalElements} total (invoices,
                bills, journal entries for your company).
              </p>
            )}

          </section>
        </>
      ) : null}
    </div>
  )
}
