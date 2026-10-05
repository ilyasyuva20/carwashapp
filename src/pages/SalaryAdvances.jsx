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
  const [payrollMap, setPayrollMap] = useState({});
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
      setEmployees(emps || []);

      const advMap = {};
      const payMap = {};

      for (const emp of (emps || [])) {
        // Fetch advances history
        const advs = await api.get(`/employees/${emp.id}/advances`);
        advMap[emp.id] = advs || [];

        // Fetch payroll calculation preview
        try {
          const preview = await api.get(`/payroll/preview?employee_id=${emp.id}&month=${selectedMonth}&year=${selectedYear}`);
          payMap[emp.id] = preview;
        } catch (e) {
          console.error('Failed to preview payroll for emp', emp.id, e);
        }
      }

      setAdvancesMap(advMap);
      setPayrollMap(payMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const filteredEmployees = employees.filter(e => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (e.name || '').toLowerCase().includes(q) ||
      (e.phone || '').includes(q) ||
      (e.aadhaar_number || '').includes(q)
    );
  });

  // Calculate overall summary totals
  let totalMonthlySalary = 0;
  let totalSelectedMonthAdvances = 0;
  let totalLeaveDeductions = 0;
  let totalLateDeductions = 0;
  let totalNetPayable = 0;

  employees.forEach(emp => {
    const base = Number(emp.salary_monthly) || 0;
    totalMonthlySalary += base;

    const pay = payrollMap[emp.id];
    if (pay) {
      totalLeaveDeductions += Number(pay.leave_deduction) || 0;
      totalLateDeductions += Number(pay.late_deduction) || 0;
      totalSelectedMonthAdvances += Number(pay.advance_deduction) || 0;
      totalNetPayable += Number(pay.net_pay) || 0;
    } else {
      const empAdvs = advancesMap[emp.id] || [];
      const monthAdvs = empAdvs.filter(a => (a.date || '').startsWith(selectedMonthPrefix));
      const advTotal = monthAdvs.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      totalSelectedMonthAdvances += advTotal;
      totalNetPayable += Math.max(0, base - advTotal);
    }
  });

  return (
    <div>
      {/* Header with Month/Year Pickers */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>💵 Salary & Advances</h1>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 14 }}>
            Salary calculation divided by 30 days (₹600/day @ ₹18k) & 8 hrs shift, with leave and late deductions for <strong>{selectedMonthLabel}</strong>.
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
      <div className="grid grid-4" style={{ marginBottom: 20, gap: 16 }}>
        <div className="card" style={{ padding: 16, borderLeft: '4px solid var(--teal)' }}>
          <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
            Base Monthly Budget
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            ₹{totalMonthlySalary.toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: 16, borderLeft: '4px solid #f59e0b' }}>
          <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
            Leave & Late Deductions
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#d97706', marginTop: 4 }}>
            - ₹{(totalLeaveDeductions + totalLateDeductions).toLocaleString()}
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
            Leaves: ₹{totalLeaveDeductions} · Late: ₹{totalLateDeductions}
          </div>
        </div>

        <div className="card" style={{ padding: 16, borderLeft: '4px solid #e11d48' }}>
          <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
            Advances Issued
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#e11d48', marginTop: 4 }}>
            - ₹{totalSelectedMonthAdvances.toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: 16, borderLeft: '4px solid #16a34a' }}>
          <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
            Net Payable ({MONTH_NAMES[selectedMonth - 1]})
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
            ₹{totalNetPayable.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Salary & Advances List Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p className="muted" style={{ padding: 20, margin: 0, textAlign: 'center' }}>Calculating payroll records...</p>
        ) : filteredEmployees.length === 0 ? (
          <p className="muted" style={{ padding: 20, margin: 0, textAlign: 'center' }}>No employees found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)', fontSize: 13 }}>
                <th style={{ padding: '12px 16px' }}>Employee</th>
                <th style={{ padding: '12px 16px' }}>Base Salary</th>
                <th style={{ padding: '12px 16px' }}>Daily Rate (30d/8h)</th>
                <th style={{ padding: '12px 16px' }}>Leave Deductions</th>
                <th style={{ padding: '12px 16px' }}>Late Deductions</th>
                <th style={{ padding: '12px 16px' }}>Advance ({MONTH_NAMES[selectedMonth - 1]})</th>
                <th style={{ padding: '12px 16px' }}>Net Payable</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => {
                const pay = payrollMap[emp.id] || {};
                const base = Number(emp.salary_monthly) || 0;
                const perDay = pay.per_day_salary || Math.round(base / 30);
                const hourly = pay.hourly_rate || Math.round((base / 30) / 8);

                const leaveDed = pay.leave_deduction || 0;
                const lateDed = pay.late_deduction || 0;
                const advDed = pay.advance_deduction || 0;
                const netPay = pay.net_pay !== undefined ? pay.net_pay : Math.max(0, base - advDed);

                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>{emp.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {emp.role || 'Washer'} · 📞 {emp.phone || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>₹{base.toLocaleString()}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--teal-dark)' }}>₹{perDay}/day</div>
                      <div className="muted" style={{ fontSize: 11 }}>₹{hourly}/hr (8h shift)</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: leaveDed > 0 ? '#d97706' : 'var(--muted)' }}>
                      {leaveDed > 0 ? `- ₹${leaveDed}` : '₹0'}
                      {pay.leave_days > 0 && <div className="muted" style={{ fontSize: 11 }}>({pay.leave_days} full, {pay.half_days || 0} half)</div>}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: lateDed > 0 ? '#e11d48' : 'var(--muted)' }}>
                      {lateDed > 0 ? `- ₹${lateDed}` : '₹0'}
                      {pay.total_late_minutes > 0 && <div className="muted" style={{ fontSize: 11 }}>({pay.total_late_minutes} mins late)</div>}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: advDed > 0 ? '#e11d48' : 'var(--muted)' }}>
                      {advDed > 0 ? `- ₹${advDed}` : '₹0'}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#16a34a', fontSize: 15 }}>
                      ₹{netPay.toLocaleString()}
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
          payroll={payrollMap[selectedEmpDetails.id]}
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

function SalaryBreakdownModal({ employee, payroll, advances, selectedMonthPrefix, selectedMonthLabel, onClose, onGiveAdvance }) {
  const emp = employee;
  const pay = payroll || {};

  const baseSalary = Number(emp.salary_monthly) || 0;
  const perDaySalary = pay.per_day_salary || (baseSalary / 30);
  const hourlyRate = pay.hourly_rate || (perDaySalary / 8);
  const perMinuteRate = hourlyRate / 60;

  const leaveDays = pay.leave_days || 0;
  const halfDays = pay.half_days || 0;
  const leaveDeduction = pay.leave_deduction || 0;

  const totalLateMinutes = pay.total_late_minutes || 0;
  const lateDeduction = pay.late_deduction || 0;

  const totalOvertimeMinutes = pay.total_overtime_minutes || 0;
  const overtimePay = pay.overtime_pay || 0;

  const advanceDeduction = pay.advance_deduction || 0;
  const netPay = pay.net_pay !== undefined ? pay.net_pay : Math.max(0, baseSalary - leaveDeduction - lateDeduction + overtimePay - advanceDeduction);

  const selectedMonthAdvs = advances.filter(a => (a.date || '').startsWith(selectedMonthPrefix));
  const [filterView, setFilterView] = useState('selected'); // 'selected' or 'all'

  const displayedAdvances = filterView === 'selected' ? selectedMonthAdvs : advances;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 620, padding: 22, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>📊 Salary Calculation — {emp.name}</h2>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              Period: <strong>{selectedMonthLabel}</strong> · Role: <strong>{emp.role || 'Washer'}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--muted)' }}>
            ✕
          </button>
        </div>

        {/* Calculation Formula Standard Banner */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1e40af' }}>
          💡 <strong>Calculation Standard:</strong> Monthly Salary / 30 Days = <strong>₹{perDaySalary.toFixed(2)}/day</strong>.
          <br />
          8-Hour Duty Shift = <strong>₹{hourlyRate.toFixed(2)}/hour</strong> (₹{perMinuteRate.toFixed(2)}/minute).
        </div>

        {/* Itemized Calculation Summary Card */}
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 16, border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: 15, color: 'var(--foreground)' }}>📋 Detailed Salary Statement</h3>

          <div className="flex between center" style={{ padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--foreground)' }}>Monthly Base Salary</span>
            <strong style={{ fontSize: 14 }}>₹{baseSalary.toLocaleString()}</strong>
          </div>

          <div className="flex between center" style={{ padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
            <div>
              <span style={{ fontSize: 13, color: leaveDays > 0 || halfDays > 0 ? '#d97706' : 'var(--muted)' }}>
                Leave Deductions
              </span>
              <div className="muted" style={{ fontSize: 11 }}>
                {leaveDays} Full Days (₹{perDaySalary * leaveDays}) + {halfDays} Half Days (₹{(perDaySalary / 2) * halfDays})
              </div>
            </div>
            <strong style={{ fontSize: 14, color: leaveDeduction > 0 ? '#d97706' : 'var(--muted)' }}>
              - ₹{leaveDeduction.toLocaleString()}
            </strong>
          </div>

          <div className="flex between center" style={{ padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
            <div>
              <span style={{ fontSize: 13, color: totalLateMinutes > 0 ? '#e11d48' : 'var(--muted)' }}>
                Late Arrival Deductions
              </span>
              <div className="muted" style={{ fontSize: 11 }}>
                Total Late: {totalLateMinutes} Mins ({(totalLateMinutes / 60).toFixed(1)} Hours) @ ₹{perMinuteRate.toFixed(2)}/min
              </div>
            </div>
            <strong style={{ fontSize: 14, color: lateDeduction > 0 ? '#e11d48' : 'var(--muted)' }}>
              - ₹{lateDeduction.toLocaleString()}
            </strong>
          </div>

          {totalOvertimeMinutes > 0 && (
            <div className="flex between center" style={{ padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
              <div>
                <span style={{ fontSize: 13, color: '#16a34a' }}>Overtime Allowance</span>
                <div className="muted" style={{ fontSize: 11 }}>{totalOvertimeMinutes} Mins OT (1.5x rate)</div>
              </div>
              <strong style={{ fontSize: 14, color: '#16a34a' }}>+ ₹{overtimePay.toLocaleString()}</strong>
            </div>
          )}

          <div className="flex between center" style={{ padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
            <div>
              <span style={{ fontSize: 13, color: advanceDeduction > 0 ? '#e11d48' : 'var(--muted)' }}>
                Advances Deducted
              </span>
              <div className="muted" style={{ fontSize: 11 }}>Issued during {selectedMonthLabel}</div>
            </div>
            <strong style={{ fontSize: 14, color: advanceDeduction > 0 ? '#e11d48' : 'var(--muted)' }}>
              - ₹{advanceDeduction.toLocaleString()}
            </strong>
          </div>

          <div className="flex between center" style={{ paddingTop: 10, marginTop: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>Net Payable Amount</span>
            <strong style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>
              ₹{netPay.toLocaleString()}
            </strong>
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
                    <th style={{ padding: '6px 8px' }}>Date</th>
                    <th style={{ padding: '6px 8px' }}>Amount</th>
                    <th style={{ padding: '6px 8px' }}>Method</th>
                    <th style={{ padding: '6px 8px' }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAdvances.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--teal-dark)' }}>
                        {a.date}
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

