import { useEffect, useState } from 'react';
import { api } from '../api';

const CATEGORIES = [
  { value: 'purchase', label: 'Purchase (materials)' },
  { value: 'rental', label: 'Rental' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'other', label: 'Other' }
];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ category: 'purchase', amount: '', note: '', date: new Date().toISOString().slice(0, 10) });

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
      <div className="page-header"><h1>Expenses</h1></div>

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
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="field">
            <label>Note</label>
            <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. Shampoo, wax purchase" />
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={add}>Add expense</button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>All expenses <span className="muted">(₹{total})</span></h3>
          {expenses.length === 0 && <p className="muted">No expenses recorded yet</p>}
          {expenses.map(e => (
            <div className="list-row" key={e.id}>
              <div>
                <strong>₹{e.amount}</strong> <span className="pill pill-teal">{e.category}</span>
                <div className="muted" style={{ fontSize: 12 }}>{e.note} · {e.date}</div>
              </div>
              <button className="btn btn-outline" onClick={() => remove(e.id)}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
