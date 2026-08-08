import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';

export default function Today() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [ledger, setLedger] = useState(null);
  const [inProgress, setInProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditOpening, setShowEditOpening] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  async function loadData(dateStr) {
    setLoading(true);
    try {
      const data = await api.get(`/reports/ledger?date=${dateStr}`);
      setLedger(data);

      const jobs = await api.get('/jobs?status=in_progress');
      setInProgress(jobs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  // Format date display (e.g. 03-08-2026 Monday)
  const d = new Date(selectedDate);
  const dayName = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = isNaN(d.getTime()) ? selectedDate : `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;

  return (
    <div>
      {/* Header bar with Date Selector */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>📖 Daily Ledger & Tally</h1>
          <div style={{ color: 'var(--teal-dark)', fontWeight: 700, fontSize: 16, marginTop: 4 }}>
            {formattedDate} <span className="muted" style={{ fontWeight: 500 }}>({dayName})</span>
          </div>
        </div>

        <div className="flex gap-8 center">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontWeight: 600,
              fontSize: 14,
              background: '#ffffff'
            }}
          />
          <button
            className="btn btn-outline"
            onClick={() => setShowEditOpening(true)}
            style={{ fontSize: 13, padding: '8px 12px' }}
          >
            ✏️ Opening Balance
          </button>
        </div>
      </div>

      {loading || !ledger ? (
        <p className="muted" style={{ padding: 20, textAlign: 'center' }}>Loading daily ledger...</p>
      ) : (
        <div>
          {/* Main Book Ledger Container */}
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '2px solid var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            padding: 24,
            marginBottom: 24
          }}>
            {/* Top Row: Date & Opening Balance */}
            <div className="flex between center" style={{
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: 16,
              marginBottom: 20
            }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)' }}>
                  {formattedDate}
                </div>
                <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600, textTransform: 'lowercase' }}>
                  {dayName}
                </div>
              </div>

              {/* Opening Balance Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 16px',
                textAlign: 'right',
                minWidth: 220
              }}>
                <div style={{ fontSize: 12, textTransform: 'lowercase', color: 'var(--muted)', fontWeight: 600, textDecoration: 'underline' }}>
                  opening balance
                </div>
                <div style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>
                  cash : <strong style={{ color: 'var(--foreground)' }}>₹{ledger.opening_cash.toLocaleString()}</strong>
                </div>
                <div style={{ fontSize: 13, marginTop: 2, fontWeight: 600 }}>
                  G.pay : <strong style={{ color: 'var(--teal-dark)' }}>₹{ledger.opening_gpay.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Middle Grid: Sales vs Expenses */}
            <div className="grid grid-2" style={{ gap: 24, marginBottom: 24 }}>
              {/* Sales Today Box */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: 16
              }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#166534', borderBottom: '1px solid #dcfce7', paddingBottom: 6 }}>
                  💰 Today Sales
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                  <div className="flex between">
                    <span>Total cash sale today :</span>
                    <strong>₹{ledger.cash_sales.toLocaleString()}</strong>
                  </div>
                  <div className="flex between">
                    <span>Total G.pay sale today :</span>
                    <strong>₹{ledger.gpay_sales.toLocaleString()}</strong>
                  </div>
                  <div className="flex between" style={{ borderTop: '1px dashed #86efac', paddingTop: 8, marginTop: 4, fontSize: 15, color: '#15803d' }}>
                    <span>Total sale today :</span>
                    <strong style={{ fontSize: 17 }}>₹{ledger.total_sales.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Expenses Today Box */}
              <div style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: 12,
                padding: 16
              }}>
                <div className="flex between center" style={{ borderBottom: '1px solid #ffe4e6', paddingBottom: 6, marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 15, color: '#9f1239' }}>
                    💸 Today Expenses
                  </h3>
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowAddExpense(true)}
                    style={{ fontSize: 11, padding: '3px 8px', background: '#ffffff' }}
                  >
                    + Add Expense
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                  <div className="flex between">
                    <span>Total cash expenses today :</span>
                    <strong>{ledger.cash_expenses > 0 ? `₹${ledger.cash_expenses}` : 'Nil'}</strong>
                  </div>
                  <div className="flex between">
                    <span>Total G.pay expenses today :</span>
                    <strong>{ledger.gpay_expenses > 0 ? `₹${ledger.gpay_expenses}` : 'Nil'}</strong>
                  </div>
                  <div className="flex between" style={{ borderTop: '1px dashed #fca5a5', paddingTop: 8, marginTop: 4, fontSize: 15, color: '#be123c' }}>
                    <span>Total expenses today :</span>
                    <strong style={{ fontSize: 17 }}>₹{ledger.total_expenses.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Grid: Tally Closing Balances & Itemized Expenses */}
            <div className="grid grid-2" style={{ gap: 24 }}>
              {/* Closing Balances Tally Box */}
              <div style={{
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: 12,
                padding: 16
              }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#6b21a8', borderBottom: '1px solid #f3e8ff', paddingBottom: 6 }}>
                  ⚖️ Closing Tally Balances Today
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                  <div className="flex between center">
                    <span>Total cash balance today :</span>
                    <div className="flex center gap-8">
                      <strong style={{ fontSize: 16, color: 'var(--foreground)' }}>₹{ledger.closing_cash.toLocaleString()}</strong>
                      <span className="pill pill-teal" style={{ fontSize: 11, padding: '2px 6px' }}>(taly)</span>
                    </div>
                  </div>

                  <div className="flex between center">
                    <span>Total A/c (GPay) balance today :</span>
                    <div className="flex center gap-8">
                      <strong style={{ fontSize: 16, color: 'var(--teal-dark)' }}>₹{ledger.closing_gpay.toLocaleString()}</strong>
                      <span className="pill pill-teal" style={{ fontSize: 11, padding: '2px 6px' }}>(taly)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expenses Itemized List Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 16
              }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--foreground)', textDecoration: 'underline' }}>
                  Expenses Breakdown
                </h3>

                {ledger.expenses_list.length === 0 ? (
                  <p className="muted" style={{ fontSize: 13, margin: 0, padding: '8px 0' }}>No itemized expenses recorded today.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                    {ledger.expenses_list.map(ex => (
                      <div key={ex.id} className="flex between center" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                        <div>
                          <strong>{ex.note || ex.category}</strong>
                          <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>({ex.category})</span>
                        </div>
                        <div className="flex center gap-8">
                          <strong style={{ color: '#be123c' }}>₹{ex.amount}</strong>
                          <span className="pill pill-gray" style={{ fontSize: 10, padding: '1px 5px' }}>
                            {ex.payment_method === 'cash' ? 'Cash' : 'A/c'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Queue Section */}
          <div className="card">
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>⏳ In-Progress Queue ({inProgress.length})</h3>
            {inProgress.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No vehicles currently in queue.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {inProgress.map(j => (
                  <div className="list-row" key={j.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <strong style={{ fontSize: 15 }}>{j.vehicle.reg_number}</strong>{' '}
                      <span className="muted">{j.vehicle.brand} {j.vehicle.model}</span>
                      <div className="muted" style={{ fontSize: 12 }}>{j.wash_type.name}</div>
                    </div>
                    <span className="pill pill-amber">In progress</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Opening Balance Modal */}
      {showEditOpening && (
        <OpeningBalanceModal
          date={selectedDate}
          initialCash={ledger ? ledger.opening_cash : 0}
          initialGpay={ledger ? ledger.opening_gpay : 0}
          onClose={() => setShowEditOpening(false)}
          onDone={() => {
            setShowEditOpening(false);
            loadData(selectedDate);
          }}
        />
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <AddExpenseModal
          date={selectedDate}
          onClose={() => setShowAddExpense(false)}
          onDone={() => {
            setShowAddExpense(false);
            loadData(selectedDate);
          }}
        />
      )}
    </div>
  );
}

function OpeningBalanceModal({ date, initialCash, initialGpay, onClose, onDone }) {
  const [cash, setCash] = useState(initialCash);
  const [gpay, setGpay] = useState(initialGpay);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      await api.post('/reports/opening-balance', {
        date,
        opening_cash: Number(cash) || 0,
        opening_gpay: Number(gpay) || 0
      });
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Set Opening Balance ({date})</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
        </div>

        <div className="field">
          <label>Opening Cash (₹)</label>
          <input
            type="number"
            value={cash}
            onChange={e => setCash(e.target.value)}
            placeholder="e.g. 3100"
            autoFocus
          />
        </div>

        <div className="field">
          <label>Opening GPay / A/c (₹)</label>
          <input
            type="number"
            value={gpay}
            onChange={e => setGpay(e.target.value)}
            placeholder="e.g. 24500"
          />
        </div>

        <div className="flex gap-8 mt-16">
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Saving...' : 'Save Balance'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AddExpenseModal({ date, onClose, onDone }) {
  const [category, setCategory] = useState('other');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('gpay');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!amount) return;
    setLoading(true);
    try {
      await api.post('/expenses', {
        category,
        note,
        amount: Number(amount),
        payment_method: paymentMethod,
        date
      });
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 440 }}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Add Expense for {date}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
        </div>

        <div className="field">
          <label>Expense Note / Title *</label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Petrol, Diesel, Roushan..."
            autoFocus
          />
        </div>

        <div className="field">
          <label>Amount (₹) *</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 500"
          />
        </div>

        <div className="field">
          <label>Payment Method</label>
          <div className="flex gap-8">
            <button
              type="button"
              className={`btn ${paymentMethod === 'gpay' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, padding: '8px' }}
              onClick={() => setPaymentMethod('gpay')}
            >
              📱 A/c (GPay)
            </button>
            <button
              type="button"
              className={`btn ${paymentMethod === 'cash' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, padding: '8px' }}
              onClick={() => setPaymentMethod('cash')}
            >
              💵 Cash
            </button>
          </div>
        </div>

        <div className="field">
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="other">Other / General</option>
            <option value="fuel">Fuel (Petrol/Diesel)</option>
            <option value="purchase">Purchase</option>
            <option value="rental">Rental</option>
            <option value="electricity">Electricity</option>
          </select>
        </div>

        <div className="flex gap-8 mt-16">
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading || !amount} style={{ flex: 1 }}>
            {loading ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
