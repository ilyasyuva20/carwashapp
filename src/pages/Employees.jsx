import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';

const ITEMS_PER_PAGE = 6;

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [showNew, setShowNew] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [advanceFor, setAdvanceFor] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);

  async function load() {
    setEmployees(await api.get('/employees'));
  }
  useEffect(() => { load(); }, []);

  // Filter employees by Name or Phone
  const filtered = employees.filter(e => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (e.name || '').toLowerCase().includes(q);
    const phoneMatch = (e.phone || '').includes(q);
    const aadhaarMatch = (e.aadhaar_number || '').includes(q);
    return nameMatch || phoneMatch || aadhaarMatch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const pageIndex = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((pageIndex - 1) * ITEMS_PER_PAGE, pageIndex * ITEMS_PER_PAGE);

  return (
    <div>
      <div className="page-header flex between center" style={{ flexWrap: 'wrap', gap: 12 }}>
        <h1>Employees</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Add employee
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div className="flex between center gap-12" style={{ flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Search employee by Name, Mobile Number, or Aadhaar..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '100%', paddingLeft: 36 }}
            />
            <span style={{ position: 'absolute', left: 12, top: 10, fontSize: 16, opacity: 0.5 }}>🔍</span>
          </div>

          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
            Showing {filtered.length} {filtered.length === 1 ? 'employee' : 'employees'}
          </div>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p className="muted" style={{ padding: '24px', textAlign: 'center', margin: 0 }}>
            {search ? 'No employees matched your search.' : 'No employees added yet.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)', fontSize: 13, color: 'var(--muted)' }}>
                  <th style={{ padding: '12px 16px', width: 60 }}>Profile</th>
                  <th style={{ padding: '12px 16px' }}>Name</th>
                  <th style={{ padding: '12px 16px' }}>Role</th>
                  <th style={{ padding: '12px 16px' }}>Phone</th>
                  <th style={{ padding: '12px 16px' }}>Monthly Salary</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                    {/* Profile Pic / Avatar */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--teal), var(--teal-dark))',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textTransform: 'uppercase',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                      }}>
                        {e.name ? e.name.charAt(0) : '👤'}
                      </div>
                    </td>

                    {/* Name */}
                    <td style={{ padding: '12px 16px' }}>
                      <div className="flex center gap-8">
                        <strong style={{ fontSize: 15, color: 'var(--foreground)' }}>{e.name}</strong>
                        {e.aadhaar_file ? (
                          <span className="pill pill-teal" style={{ fontSize: 11, padding: '2px 8px' }}>
                            🪪 Aadhaar Attached
                          </span>
                        ) : e.aadhaar_number ? (
                          <span className="pill pill-gray" style={{ fontSize: 11, padding: '2px 8px' }}>
                            🪪 #{e.aadhaar_number}
                          </span>
                        ) : null}
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        Joined: {e.join_date || '-'}
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '12px 16px' }}>
                      <span className="pill pill-teal" style={{ fontSize: 12, fontWeight: 600, background: '#f1f5f9', color: 'var(--foreground)' }}>
                        {e.role || 'Washer'}
                      </span>
                    </td>

                    {/* Phone */}
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      {e.phone ? (
                        <span>📞 {e.phone}</span>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>

                    {/* Salary */}
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--foreground)' }}>
                      ₹{e.salary_monthly} <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>/mo</span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: 12, padding: '5px 12px' }}
                          onClick={() => setSelectedEmp(e)}
                        >
                          👁️ View Details
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: 12, padding: '5px 12px' }}
                          onClick={() => setEditingEmp(e)}
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex between center mt-16" style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-outline"
              disabled={pageIndex <= 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              style={{ fontSize: 13 }}
            >
              ← Previous
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
              Page {pageIndex} of {totalPages}
            </span>
            <button
              className="btn btn-outline"
              disabled={pageIndex >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              style={{ fontSize: 13 }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {showNew && <NewEmployeeModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
      {editingEmp && <EditEmployeeModal employee={editingEmp} onClose={() => setEditingEmp(null)} onUpdated={() => { setEditingEmp(null); load(); }} />}
      {advanceFor && <AdvanceModal employee={advanceFor} onClose={() => setAdvanceFor(null)} onDone={() => setAdvanceFor(null)} />}
      {selectedEmp && (
        <EmployeeDetailsModal
          employee={selectedEmp}
          onClose={() => setSelectedEmp(null)}
          onEdit={() => {
            const empToEdit = selectedEmp;
            setSelectedEmp(null);
            setEditingEmp(empToEdit);
          }}
        />
      )}
    </div>
  );
}

function NewEmployeeModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    role: 'Washer',
    salary_monthly: '',
    join_date: new Date().toISOString().slice(0, 10),
    aadhaar_number: ''
  });
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!form.name.trim()) return;

    if (form.phone && form.phone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    if (form.aadhaar_number && form.aadhaar_number.length !== 12) {
      setError('Aadhaar card number must be exactly 12 digits');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('phone', form.phone);
      formData.append('role', form.role);
      formData.append('salary_monthly', Number(form.salary_monthly) || 0);
      formData.append('join_date', form.join_date);
      formData.append('aadhaar_number', form.aadhaar_number);
      if (aadhaarFile) {
        formData.append('aadhaar_file', aadhaarFile);
      }

      await api.postForm('/employees', formData);
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Add employee</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>
            ✕
          </button>
        </div>

        <div className="field">
          <label>Employee Name *</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul Kumar" />
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label>Phone Number (10 digits)</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              placeholder="9876543210"
            />
          </div>
          <div className="field">
            <label>Role / Position</label>
            <select value={form.role || 'Washer'} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="Washer">Washer</option>
              <option value="Manager">Manager</option>
              <option value="Cleaner">Cleaner</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Detailer">Detailer</option>
            </select>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label>Monthly Salary (₹)</label>
            <input type="number" value={form.salary_monthly} onChange={e => setForm({ ...form, salary_monthly: e.target.value })} placeholder="18000" />
          </div>
          <div className="field">
            <label>Joining Date</label>
            <input type="date" value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} />
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--teal-dark)' }}>🪪 Aadhaar Card Details</h3>
          
          <div className="field">
            <label>Aadhaar Card Number (12 digits)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              placeholder="e.g. 123456789012"
              value={form.aadhaar_number}
              onChange={e => setForm({ ...form, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
            />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Upload Aadhaar Card Document (Image or PDF)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={e => setAadhaarFile(e.target.files[0] || null)}
              style={{ padding: '8px 10px', fontSize: 13 }}
            />
            {aadhaarFile && (
              <p style={{ fontSize: 12, color: 'var(--teal-dark)', marginTop: 4, marginBottom: 0 }}>
                Selected: <strong>{aadhaarFile.name}</strong> ({(aadhaarFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>

        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}

        <div className="flex gap-8 mt-16">
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading || !form.name.trim()} style={{ flex: 1 }}>
            {loading ? 'Saving...' : 'Save Employee'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function EditEmployeeModal({ employee, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: employee.name || '',
    phone: employee.phone || '',
    role: employee.role || 'Washer',
    salary_monthly: employee.salary_monthly || '',
    join_date: employee.join_date || new Date().toISOString().slice(0, 10),
    aadhaar_number: employee.aadhaar_number || ''
  });
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!form.name.trim()) return;

    if (form.phone && form.phone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    if (form.aadhaar_number && form.aadhaar_number.length !== 12) {
      setError('Aadhaar card number must be exactly 12 digits');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('phone', form.phone);
      formData.append('role', form.role);
      formData.append('salary_monthly', Number(form.salary_monthly) || 0);
      formData.append('join_date', form.join_date);
      formData.append('aadhaar_number', form.aadhaar_number);
      if (aadhaarFile) {
        formData.append('aadhaar_file', aadhaarFile);
      }

      await api.putForm(`/employees/${employee.id}`, formData);
      onUpdated();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Edit Employee Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>
            ✕
          </button>
        </div>

        <div className="field">
          <label>Employee Name *</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul Kumar" />
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label>Phone Number (10 digits)</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              placeholder="9876543210"
            />
          </div>
          <div className="field">
            <label>Role / Position</label>
            <select value={form.role || 'Washer'} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="Washer">Washer</option>
              <option value="Manager">Manager</option>
              <option value="Cleaner">Cleaner</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Detailer">Detailer</option>
            </select>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label>Monthly Salary (₹)</label>
            <input type="number" value={form.salary_monthly} onChange={e => setForm({ ...form, salary_monthly: e.target.value })} placeholder="18000" />
          </div>
          <div className="field">
            <label>Joining Date</label>
            <input type="date" value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} />
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--teal-dark)' }}>🪪 Aadhaar Card Details</h3>
          
          <div className="field">
            <label>Aadhaar Card Number (12 digits)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              placeholder="e.g. 123456789012"
              value={form.aadhaar_number}
              onChange={e => setForm({ ...form, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
            />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Update / Replace Aadhaar Document (Image or PDF)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={e => setAadhaarFile(e.target.files[0] || null)}
              style={{ padding: '8px 10px', fontSize: 13 }}
            />
            {aadhaarFile ? (
              <p style={{ fontSize: 12, color: 'var(--teal-dark)', marginTop: 4, marginBottom: 0 }}>
                Selected: <strong>{aadhaarFile.name}</strong> ({(aadhaarFile.size / 1024).toFixed(1)} KB)
              </p>
            ) : employee.aadhaar_file ? (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, marginBottom: 0 }}>
                Current Document: <strong>{employee.aadhaar_file.split('/').pop()}</strong>
              </p>
            ) : null}
          </div>
        </div>

        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}

        <div className="flex gap-8 mt-16">
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading || !form.name.trim()} style={{ flex: 1 }}>
            {loading ? 'Updating...' : 'Update Employee'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function EmployeeDetailsModal({ employee, onClose, onEdit }) {
  const emp = employee;
  const [advances, setAdvances] = useState([]);

  useEffect(() => {
    api.get(`/employees/${emp.id}/advances`).then(setAdvances).catch(() => {});
  }, [emp.id]);

  const monthlySalary = Number(emp.salary_monthly) || 0;
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const currentMonthAdvances = advances.filter(a => (a.date || '').startsWith(currentMonthPrefix));
  const totalCurrentMonthAdvance = currentMonthAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalAllAdvance = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const balanceSalary = Math.max(0, monthlySalary - totalCurrentMonthAdvance);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 580, padding: 20 }}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 19 }}>👤 Employee Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>
            ✕
          </button>
        </div>

        {/* Short & Compact Profile Header Card */}
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 14, border: '1px solid var(--border)' }}>
          <div className="flex between center">
            <div>
              <span style={{ fontSize: 17, fontWeight: 700 }}>{emp.name}</span>
              <span className="pill pill-teal" style={{ marginLeft: 8, fontSize: 11 }}>{emp.role || 'Washer'}</span>
            </div>
            <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px' }} onClick={onEdit}>
              ✏️ Edit
            </button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            📞 {emp.phone || 'No Phone'} · 📅 Joined: {emp.join_date || '-'}
          </div>

          {/* Salary & Balance Summary */}
          <div className="grid grid-3" style={{ marginTop: 10, background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Monthly Salary</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginTop: 2 }}>₹{monthlySalary}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Advance (This Month)</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e11d48', marginTop: 2 }}>- ₹{totalCurrentMonthAdvance}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Balance Salary</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>₹{balanceSalary}</div>
            </div>
          </div>
        </div>

        {/* Compact Aadhaar Document Bar */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, background: '#ffffff' }}>
          <div className="flex between center">
            <div className="flex center gap-8">
              <span style={{ fontSize: 18 }}>🪪</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Aadhaar Card</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {emp.aadhaar_number ? `#${emp.aadhaar_number}` : 'No Aadhaar number entered'}
                </div>
              </div>
            </div>

            {emp.aadhaar_file ? (
              <div className="flex gap-8">
                <a
                  href={emp.aadhaar_file}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                  style={{ fontSize: 12, padding: '4px 10px', textDecoration: 'none' }}
                >
                  👁️ View
                </a>
                <a
                  href={`/api/employees/${emp.id}/download-aadhaar`}
                  download
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: '4px 10px', textDecoration: 'none' }}
                >
                  ⬇️ Download
                </a>
              </div>
            ) : (
              <span className="muted" style={{ fontSize: 12 }}>No document attached</span>
            )}
          </div>
        </div>

        {/* Advances Table */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <div className="flex between center" style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--teal-dark)' }}>💰 Advances History</h3>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
              Total All-Time: <strong style={{ color: 'var(--foreground)' }}>₹{totalAllAdvance}</strong>
            </span>
          </div>

          {advances.length === 0 ? (
            <p className="muted" style={{ fontSize: 12, margin: 0, textAlign: 'center', padding: '8px 0' }}>No advance payments recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 150, overflowY: 'auto' }}>
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
                  {advances.map(a => (
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
          <button className="btn btn-outline" onClick={onClose} style={{ width: '100%', padding: '8px' }}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
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
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Advance for {employee.name}</h2>
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
