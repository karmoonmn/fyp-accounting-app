import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function emptyLine(num) {
  return {
    lineNum: num,
    description: '',
    quantity: '1',
    unitPrice: '0',
  }
}

export default function CreateInvoice() {
  const { me, meError, getFreshToken } = useAuth()
  const navigate = useNavigate()
  const [docNumber, setDocNumber] = useState('')
  const [txnDate, setTxnDate] = useState(todayISO())
  const [customerId, setCustomerId] = useState('')
  const [shipAddr, setShipAddr] = useState('')
  const [shipDate, setShipDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [lines, setLines] = useState([emptyLine(1), emptyLine(2)])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const lineTotal = useMemo(() => {
    return lines.reduce((sum, row) => {
      const q = Number.parseFloat(row.quantity) || 0
      const p = Number.parseFloat(row.unitPrice) || 0
      return sum + q * p
    }, 0)
  }, [lines])

  function updateLine(index, patch) {
    setLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine(prev.length + 1)])
  }

  function removeLine(index) {
    setLines((prev) =>
      prev.length <= 1
        ? prev
        : prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, lineNum: i + 1 })),
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!me || meError) {
      setError('Sign in and complete registration before creating invoices.')
      return
    }
    setBusy(true)
    try {
      const parsedLines = lines.map((row, i) => {
        const quantity = Number.parseFloat(row.quantity)
        const unitPrice = Number.parseFloat(row.unitPrice)
        if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
          throw new Error(`Line ${i + 1}: invalid quantity or unit price`)
        }
        return {
          lineNum: i + 1,
          description: row.description || `Line ${i + 1}`,
          quantity,
          unitPrice,
        }
      })
      const token = await getFreshToken()
      if (!token) throw new Error('Not signed in')
      const body = {
        docNumber: docNumber.trim(),
        txnDate,
        shipAddr: shipAddr.trim() || undefined,
        shipDate: shipDate || undefined,
        dueDate: dueDate || undefined,
        lines: parsedLines,
      }
      if (customerId.trim() !== '') {
        const cid = Number.parseInt(customerId, 10)
        if (Number.isNaN(cid)) throw new Error('Customer ID must be a number')
        body.customerId = cid
      }
      if (!body.docNumber) throw new Error('Document number is required')
      const created = await api('/invoice', {
        method: 'POST',
        token,
        body,
      })
      navigate('/', { replace: false, state: { createdInvoiceId: created.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create invoice')
    } finally {
      setBusy(false)
    }
  }

  if (!me || meError) {
    return (
      <div className="auth-page">
        <div className="card">
          <h1>New invoice</h1>
          <p className="muted">
            {meError
              ? `Fix your session first: ${meError}`
              : 'Sign in to create invoices.'}
          </p>
          <p>
            <Link to="/login">Sign in</Link> · <Link to="/">Dashboard</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="card card-wide">
        <h1>New invoice</h1>
        <p className="muted">
          Totals are calculated from line quantities × unit price. Your company is set on the server from
          your login token.
        </p>

        <form onSubmit={handleSubmit} className="form form-grid">
          <label>
            Document number
            <input
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="INV-1001"
              required
            />
          </label>
          <label>
            Transaction date
            <input
              type="date"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
              required
            />
          </label>
          <label>
            Customer ID (optional)
            <input
              type="number"
              min={1}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Leave empty if none"
            />
          </label>
          <label>
            Ship-to address (optional)
            <input
              value={shipAddr}
              onChange={(e) => setShipAddr(e.target.value)}
            />
          </label>
          <label>
            Ship date (optional)
            <input
              type="date"
              value={shipDate}
              onChange={(e) => setShipDate(e.target.value)}
            />
          </label>
          <label>
            Due date (optional)
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          <div className="span-2 lines-block">
            <div className="lines-header">
              <strong>Line items</strong>
              <button type="button" className="secondary-btn" onClick={addLine}>
                Add line
              </button>
            </div>
            <div className="lines-table">
              <div className="lines-row lines-row-head">
                <span>#</span>
                <span>Description</span>
                <span>Qty</span>
                <span>Unit price</span>
                <span>Line total</span>
                <span />
              </div>
              {lines.map((row, index) => {
                const q = Number.parseFloat(row.quantity) || 0
                const p = Number.parseFloat(row.unitPrice) || 0
                const sub = q * p
                return (
                  <div key={index} className="lines-row">
                    <span className="muted">{index + 1}</span>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) =>
                        updateLine(index, { description: e.target.value })
                      }
                      placeholder="Description"
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.quantity}
                      onChange={(e) =>
                        updateLine(index, { quantity: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.unitPrice}
                      onChange={(e) =>
                        updateLine(index, { unitPrice: e.target.value })
                      }
                    />
                    <span className="line-sub">{sub.toFixed(2)}</span>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => removeLine(index)}
                      disabled={lines.length <= 1}
                      title="Remove line"
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
            <p className="total-line">
              Invoice total: <strong>{lineTotal.toFixed(2)}</strong>
            </p>
          </div>

          {error ? <p className="error span-2">{error}</p> : null}
          <div className="span-2 form-actions">
            <Link to="/">Cancel</Link>
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Create invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
