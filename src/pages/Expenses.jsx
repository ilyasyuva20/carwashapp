import { useEffect, useState } from 'react';
import { api } from '../api';

const CATEGORIES = [
  { value: 'purchase', label: 'Purchase (materials)' },
  { value: 'fuel', label: 'Fuel (Petrol/Diesel)' },
  { value: 'rental', label: 'Rental' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'other', label: 'Other' }
];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({
    category: 'purchase',
    amount: '',
    note: '',
    date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash'
  });

  async function load() {
    setExpenses(await api.get('/expenses'));
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.amount) return;
    await api.post('/expenses', { ...form, amount: Number(form.amount) });
    setForm({ ...form, amount: '', note: '' });
    load();
  }

  async function remove(id) {
    await api.del(`/expenses/${id}`);
    load();
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Expenses</h1>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Add expense</h3>
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Amount (₹)</label>
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 500" />
          </div>

          {/* Spend Type (Payment Method) Selection */}
          <div className="field">
            <label>Spend Type (Payment Method)</label>
            <div className="flex gap-8">
              <button
                type="button"
                className={`btn ${form.payment_method === 'cash' ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontWeight: 700,
                  background: form.payment_method === 'cash' ? 'linear-gradient(135deg, #10b981, #059669)' : '#ffffff',
                  borderColor: form.payment_method === 'cash' ? '#059669' : '#cbd5e1',
                  color: form.payment_method === 'cash' ? '#ffffff' : '#334155'
                }}
                onClick={() => setForm({ ...form, payment_method: 'cash' })}
              >
                💵 Cash
              </button>
              <button
                type="button"
                className={`btn ${form.payment_method === 'gpay' ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontWeight: 700,
                  background: form.payment_method === 'gpay' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : '#ffffff',
                  borderColor: form.payment_method === 'gpay' ? '#0369a1' : '#cbd5e1',
                  color: form.payment_method === 'gpay' ? '#ffffff' : '#334155'
                }}
                onClick={() => setForm({ ...form, payment_method: 'gpay' })}
              >
                📱 GPay
              </button>
            </div>
          </div>

          <div className="field">
            <label>Note</label>
            <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. Shampoo, wax purchase" />
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={add} disabled={!form.amount}>Add expense</button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>All expenses <span className="muted">(₹{total.toLocaleString()})</span></h3>
          {expenses.length === 0 && <p className="muted">No expenses recorded yet</p>}
          {expenses.map(e => (
            <div className="list-row" key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <strong style={{ fontSize: 15 }}>₹{e.amount}</strong>{' '}
                <span className="pill pill-teal" style={{ fontSize: 11 }}>{e.category}</span>{' '}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: e.payment_method === 'cash' ? '#ecfdf5' : '#e0f2fe',
                    color: e.payment_method === 'cash' ? '#047857' : '#0369a1',
                    border: e.payment_method === 'cash' ? '1px solid #a7f3d0' : '1px solid #bae6fd'
                  }}
                >
                  {e.payment_method === 'cash' ? '💵 Cash' : '📱 GPay'}
                </span>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{e.note || '-'} · {e.date}</div>
              </div>
              <button className="btn btn-outline" onClick={() => remove(e.id)} style={{ fontSize: 12, padding: '4px 8px' }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

