import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SalaryAdvances() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState([]);
  const [advancesMap, setAdvancesMap] = useState({});
  const [search, setSearch] = useState('');
  const [selectedEmpAdvance, setSelectedEmpAdvance] = useState(null);
  const [selectedEmpDetails, setSelectedEmpDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectedMonthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const selectedMonthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  async function loadData() {
    setLoading(true);
    try {
      const emps = await api.get('/employees');
      setEmployees(emps);

      const map = {};
      for (const emp of emps) {
        const advs = await api.get(`/employees/${emp.id}/advances`);
        map[emp.id] = advs || [];
      }
      setAdvancesMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredEmployees = employees.filter(e => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (e.name || '').toLowerCase().includes(q) ||
      (e.phone || '').includes(q) ||
      (e.aadhaar_number || '').includes(q)
    );
  });

  // Calculate month totals
  let totalMonthlySalary = 0;
  let totalSelectedMonthAdvances = 0;

  employees.forEach(emp => {
    totalMonthlySalary += Number(emp.salary_monthly) || 0;
    const empAdvs = advancesMap[emp.id] || [];
    const monthAdvs = empAdvs.filter(a => (a.date || '').startsWith(selectedMonthPrefix));
    totalSelectedMonthAdvances += monthAdvs.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  });

  const totalBalancePayable = Math.max(0, totalMonthlySalary - totalSelectedMonthAdvances);

  return (
    <div>
      {/* Header with Month/Year Pickers */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>💵 Salary & Advances</h1>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 14 }}>
            Monthly salary expenses and advance payouts for <strong>{selectedMonthLabel}</strong>.
          </p>
        </div>

        <div className="flex gap-8 center" style={{ flexWrap: 'wrap' }}>
          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: '#ffffff',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={idx} value={idx + 1}>{m}</option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: '#ffffff',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Search Box */}
          <input
            type="text"
            placeholder="🔍 Search employee..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
          />
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-3" style={{ marginBottom: 20, gap: 16 }}>
        <div className="card" style={{ padding: 16, borderLeft: '4px solid var(--teal)' }}>
          <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
            Total Monthly Salary Budget
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
            ₹{totalMonthlySalary.toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: 16, borderLeft: '4px solid #e11d48' }}>
          <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
            Advances ({MONTH_NAMES[selectedMonth - 1]})
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#e11d48', marginTop: 4 }}>
            - ₹{totalSelectedMonthAdvances.toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: 16, borderLeft: '4px solid #16a34a' }}>
          <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
            Net Payable ({MONTH_NAMES[selectedMonth - 1]})
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
            ₹{totalBalancePayable.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Salary & Advances List Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p className="muted" style={{ padding: 20, margin: 0, textAlign: 'center' }}>Loading salary records...</p>
        ) : filteredEmployees.length === 0 ? (
          <p className="muted" style={{ padding: 20, margin: 0, textAlign: 'center' }}>No employees found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)', fontSize: 13 }}>
                <th style={{ padding: '12px 16px' }}>Employee</th>
                <th style={{ padding: '12px 16px' }}>Monthly Salary</th>
                <th style={{ padding: '12px 16px' }}>Advance ({MONTH_NAMES[selectedMonth - 1]})</th>
                <th style={{ padding: '12px 16px' }}>Balance Salary</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => {
                const advs = advancesMap[emp.id] || [];
                const monthAdvs = advs.filter(a => (a.date || '').startsWith(selectedMonthPrefix));
                const monthAdvanceTotal = monthAdvs.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
                const salary = Number(emp.salary_monthly) || 0;
                const balance = Math.max(0, salary - monthAdvanceTotal);

                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>{emp.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {emp.role || 'Washer'} · 📞 {emp.phone || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>₹{salary}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: monthAdvanceTotal > 0 ? '#e11d48' : 'var(--muted)' }}>
                      {monthAdvanceTotal > 0 ? `- ₹${monthAdvanceTotal}` : '₹0'}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#16a34a' }}>
                      ₹{balance}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: 12, padding: '5px 10px' }}
                          onClick={() => setSelectedEmpDetails(emp)}
                        >
                          📊 Salary Breakdown
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: '5px 12px', background: 'var(--teal-dark)', color: '#fff' }}
                          onClick={() => setSelectedEmpAdvance(emp)}
                        >
                          💵 Give Advance
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Give Advance Modal */}
      {selectedEmpAdvance && (
        <AdvanceModal
          employee={selectedEmpAdvance}
          onClose={() => setSelectedEmpAdvance(null)}
          onDone={() => {
            setSelectedEmpAdvance(null);
            loadData();
          }}
        />
      )}

      {/* Detailed Salary Breakdown Modal */}
      {selectedEmpDetails && (
        <SalaryBreakdownModal
          employee={selectedEmpDetails}
          advances={advancesMap[selectedEmpDetails.id] || []}
          selectedMonthPrefix={selectedMonthPrefix}
          selectedMonthLabel={selectedMonthLabel}
          onClose={() => setSelectedEmpDetails(null)}
          onGiveAdvance={() => {
            const emp = selectedEmpDetails;
            setSelectedEmpDetails(null);
            setSelectedEmpAdvance(emp);
          }}
        />
      )}
    </div>
  );
}

function AdvanceModal({ employee, onClose, onDone }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!amount) return;
    setLoading(true);
    try {
      await api.post(`/employees/${employee.id}/advance`, {
        amount: Number(amount),
        payment_method: paymentMethod,
        date: new Date().toISOString().slice(0, 10),
        note
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
          <h2 style={{ marginTop: 0, marginBottom: 0, fontSize: 18 }}>Advance for {employee.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>
            ✕
          </button>
        </div>

        <div className="field">
          <label>Amount (₹) *</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 500"
            autoFocus
          />
        </div>

        <div className="field">
          <label>Payment Method</label>
          <div className="flex gap-8">
            <button
              type="button"
              className={`btn ${paymentMethod === 'cash' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, padding: '10px' }}
              onClick={() => setPaymentMethod('cash')}
            >
              💵 Cash
            </button>
            <button
              type="button"
              className={`btn ${paymentMethod === 'gpay' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, padding: '10px' }}
              onClick={() => setPaymentMethod('gpay')}
            >
              📱 GPay / UPI
            </button>
          </div>
        </div>

        <div className="field">
          <label>Note (Optional)</label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Cash advance"
          />
        </div>

        <div className="flex gap-8 mt-16">
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={loading || !amount}
            style={{ flex: 1 }}
          >
            {loading ? 'Saving...' : 'Save Advance'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SalaryBreakdownModal({ employee, advances, selectedMonthPrefix, selectedMonthLabel, onClose, onGiveAdvance }) {
  const emp = employee;
  const monthlySalary = Number(emp.salary_monthly) || 0;
  
  const selectedMonthAdvs = advances.filter(a => (a.date || '').startsWith(selectedMonthPrefix));
  const totalSelectedMonthAdvance = selectedMonthAdvs.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalAllAdvance = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const balanceSalary = Math.max(0, monthlySalary - totalSelectedMonthAdvance);

  const [filterView, setFilterView] = useState('selected'); // 'selected' or 'all'

  const displayedAdvances = filterView === 'selected' ? selectedMonthAdvs : advances;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 580, padding: 20 }}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19 }}>📊 Salary Details — {emp.name}</h2>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              Target Period: <strong>{selectedMonthLabel}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>
            ✕
          </button>
        </div>

        {/* Salary Summary Card */}
        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, marginBottom: 14, border: '1px solid var(--border)' }}>
          <div className="muted" style={{ fontSize: 12 }}>
            Role: <strong>{emp.role || 'Washer'}</strong> · Phone: <strong>{emp.phone || '-'}</strong>
          </div>

          <div className="grid grid-3" style={{ marginTop: 10, background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Monthly Base</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', marginTop: 2 }}>₹{monthlySalary}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Advance ({selectedMonthLabel})</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e11d48', marginTop: 2 }}>- ₹{totalSelectedMonthAdvance}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Balance Payable</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>₹{balanceSalary}</div>
            </div>
          </div>
        </div>

        {/* Advances History Table */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <div className="flex between center" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--teal-dark)' }}>💰 Advances History</h3>
            
            <div className="flex gap-8 center">
              <button
                type="button"
                className={`btn ${filterView === 'selected' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={() => setFilterView('selected')}
              >
                {selectedMonthLabel} ({selectedMonthAdvs.length})
              </button>
              <button
                type="button"
                className={`btn ${filterView === 'all' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={() => setFilterView('all')}
              >
                All History ({advances.length})
              </button>
            </div>
          </div>

          {displayedAdvances.length === 0 ? (
            <p className="muted" style={{ fontSize: 12, margin: 0, textAlign: 'center', padding: '12px 0' }}>
              No advance records found for {filterView === 'selected' ? selectedMonthLabel : 'all history'}.
            </p>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 180, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', background: '#f1f5f9' }}>
                    <th style={{ padding: '6px 8px' }}>Date & Exact Time</th>
                    <th style={{ padding: '6px 8px' }}>Amount</th>
                    <th style={{ padding: '6px 8px' }}>Method</th>
                    <th style={{ padding: '6px 8px' }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAdvances.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--teal-dark)' }}>
                        {a.date && a.date.length <= 10 ? `${a.date} 12:00 PM` : a.date}
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: 700, color: '#e11d48' }}>₹{a.amount}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <span className={`pill ${a.payment_method === 'gpay' ? 'pill-teal' : 'pill-gray'}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                          {a.payment_method === 'gpay' ? '📱 GPay' : '💵 Cash'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', color: 'var(--muted)' }}>{a.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex gap-8">
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1, padding: '8px' }}>
            Close
          </button>
          <button className="btn btn-primary" onClick={onGiveAdvance} style={{ flex: 1, padding: '8px' }}>
            💵 Give Advance
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
