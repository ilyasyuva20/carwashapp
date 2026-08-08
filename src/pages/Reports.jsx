import { useEffect, useState } from 'react';
import { api } from '../api';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function Reports() {
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(daysAgo(0));
  const [report, setReport] = useState(null);

  async function load() {
    setReport(await api.get(`/reports/range?from=${from}&to=${to}`));
  }
  useEffect(() => { load(); }, [from, to]);

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
        <div className="flex gap-8">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <span className="muted" style={{ alignSelf: 'center' }}>to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-4">
            <div className="card stat-card">
              <div className="icon">🚗</div>
              <div className="value">{report.vehicles}</div>
              <div className="label">Vehicles washed</div>
            </div>
            <div className="card stat-card">
              <div className="icon">💵</div>
              <div className="value">₹{report.cash_payment}</div>
              <div className="label">Cash payments</div>
            </div>
            <div className="card stat-card">
              <div className="icon">📱</div>
              <div className="value">₹{report.gpay_payment}</div>
              <div className="label">GPay payments</div>
            </div>
            <div className="card stat-card">
              <div className="icon">📈</div>
              <div className="value">₹{report.revenue}</div>
              <div className="label">Total revenue</div>
            </div>
          </div>

          <div className="grid grid-2 mt-16">
            <div className="card">
              <div className="flex between"><span className="muted">Expenses</span><strong>₹{report.expenses}</strong></div>
              <div className="flex between mt-8"><span className="muted">Net profit</span><strong>₹{report.net}</strong></div>
            </div>
            <div className="card">
              <h4 style={{ marginTop: 0 }}>Top wash types</h4>
              {report.top_wash_types.length === 0 && <p className="muted">No data in this range</p>}
              {report.top_wash_types.map(w => (
                <div className="flex between" key={w.name} style={{ marginBottom: 6 }}>
                  <span>{w.name}</span>
                  <span className="muted">{w.c} washes · ₹{w.revenue}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
