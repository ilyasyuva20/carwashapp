import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import DatePickerInput from '../components/DatePickerInput';

const ITEMS_PER_PAGE = 10;

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'inactive', 'all'
  const [currentPage, setCurrentPage] = useState(1);

  const [showNew, setShowNew] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [advanceFor, setAdvanceFor] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);

  async function load(status = statusFilter) {
    setEmployees(await api.get(`/employees?status=${status}`));
  }
  useEffect(() => { load(statusFilter); }, [statusFilter]);

  async function toggleActiveStatus(emp, newActiveState) {
    const actionText = newActiveState === 1 ? 'reactivate' : 'inactivate / mark as resigned';
    if (!window.confirm(`Are you sure you want to ${actionText} ${emp.name}?`)) return;
    try {
      if (newActiveState === 0) {
        await api.delete(`/employees/${emp.id}`);
      } else {
        await api.put(`/employees/${emp.id}`, { active: 1 });
      }
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteEmployeePermanently(emp) {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${emp.name}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/employees/${emp.id}?permanent=true`);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

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
      <div className="page-header flex between center" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Employees</h1>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 14 }}>
            Manage staff profiles, role assignments, Aadhaar documents, and active/inactive status.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)} style={{ padding: '8px 16px', fontWeight: 600 }}>
          + Add employee
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div className="flex between center gap-16" style={{ flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--muted)', pointerEvents: 'none' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search employee by Name, Phone, or Aadhaar..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '100%', paddingLeft: 38, paddingRight: 12, height: 40, borderRadius: 8 }}
            />
          </div>

          {/* Status Filter Pill Tabs */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
            <button
              type="button"
              style={{
                border: 'none',
                background: statusFilter === 'active' ? '#ffffff' : 'transparent',
                color: statusFilter === 'active' ? 'var(--foreground)' : 'var(--muted)',
                fontWeight: statusFilter === 'active' ? 700 : 500,
                boxShadow: statusFilter === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
            >
              🟢 Active
            </button>
            <button
              type="button"
              style={{
                border: 'none',
                background: statusFilter === 'inactive' ? '#ffffff' : 'transparent',
                color: statusFilter === 'inactive' ? 'var(--foreground)' : 'var(--muted)',
                fontWeight: statusFilter === 'inactive' ? 700 : 500,
                boxShadow: statusFilter === 'inactive' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => { setStatusFilter('inactive'); setCurrentPage(1); }}
            >
              🔴 Inactive / Resigned
            </button>
            <button
              type="button"
              style={{
                border: 'none',
                background: statusFilter === 'all' ? '#ffffff' : 'transparent',
                color: statusFilter === 'all' ? 'var(--foreground)' : 'var(--muted)',
                fontWeight: statusFilter === 'all' ? 700 : 500,
                boxShadow: statusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
            >
              👥 All
            </button>
          </div>

          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
            Showing {paginated.length} of {filtered.length} {filtered.length === 1 ? 'employee' : 'employees'}
          </div>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p className="muted" style={{ padding: '32px', textAlign: 'center', margin: 0, fontSize: 14 }}>
            {search ? 'No employees matched your search query.' : 'No employees found in this status category.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>
                  <th style={{ padding: '14px 16px', width: 60, textAlign: 'center', verticalAlign: 'middle' }}>Profile</th>
                  <th style={{ padding: '14px 16px', verticalAlign: 'middle' }}>Name & Details</th>
                  <th style={{ padding: '14px 16px', verticalAlign: 'middle' }}>Role</th>
                  <th style={{ padding: '14px 16px', verticalAlign: 'middle' }}>Status</th>
                  <th style={{ padding: '14px 16px', verticalAlign: 'middle' }}>Phone</th>
                  <th style={{ padding: '14px 16px', verticalAlign: 'middle' }}>Monthly Salary</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 14, transition: 'background 0.1s ease' }}>
                    {/* Profile Pic / Avatar */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: e.active === 0 ? '#94a3b8' : 'linear-gradient(135deg, var(--teal), var(--teal-dark))',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textTransform: 'uppercase',
                        margin: '0 auto',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
                      }}>
                        {e.name ? e.name.charAt(0) : '👤'}
                      </div>
                    </td>

                    {/* Name & Details */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div className="flex center gap-8" style={{ flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 15, color: e.active === 0 ? 'var(--muted)' : 'var(--foreground)' }}>{e.name}</strong>
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
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <span className="pill" style={{ fontSize: 12, fontWeight: 600, background: '#f1f5f9', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                        {e.role || 'Washer'}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      {e.active === 0 ? (
                        <span className="pill pill-red" style={{ fontSize: 11, padding: '3px 9px', fontWeight: 600 }}>
                          🔴 Inactive / Resigned
                        </span>
                      ) : (
                        <span className="pill pill-green" style={{ fontSize: 11, padding: '3px 9px', fontWeight: 600 }}>
                          🟢 Active
                        </span>
                      )}
                    </td>

                    {/* Phone */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 500 }}>
                      {e.phone ? (
                        <span>📞 {e.phone}</span>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>

                    {/* Salary */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 700, color: 'var(--foreground)' }}>
                      ₹{Number(e.salary_monthly || 0).toLocaleString()} <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>/mo</span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                      <div className="flex gap-6" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: 12, padding: '6px 10px', height: 32 }}
                          onClick={() => setSelectedEmp(e)}
                        >
                          👁️ View
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: 12, padding: '6px 10px', height: 32 }}
                          onClick={() => setEditingEmp(e)}
                        >
                          ✏️ Edit
                        </button>
                        {e.active !== 0 ? (
                          <button
                            className="btn btn-outline"
                            style={{ fontSize: 12, padding: '6px 10px', height: 32, color: '#d97706', borderColor: '#f59e0b' }}
                            onClick={() => toggleActiveStatus(e, 0)}
                            title="Mark employee as inactive / resigned"
                          >
                            🚫 Inactivate
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn btn-outline"
                              style={{ fontSize: 12, padding: '6px 10px', height: 32, color: '#16a34a', borderColor: '#22c55e' }}
                              onClick={() => toggleActiveStatus(e, 1)}
                              title="Reactivate employee"
                            >
                              ✅ Reactivate
                            </button>
                            <button
                              className="btn btn-outline"
                              style={{ fontSize: 12, padding: '6px 10px', height: 32, color: '#e11d48', borderColor: '#f43f5e' }}
                              onClick={() => deleteEmployeePermanently(e)}
                              title="Permanently delete employee"
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
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
          <div className="flex between center" style={{ padding: '14px 18px', background: '#f8fafc', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-outline"
              disabled={pageIndex <= 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              style={{ fontSize: 13, padding: '6px 14px' }}
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
              style={{ fontSize: 13, padding: '6px 14px' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {showNew && <NewEmployeeModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
      {editingEmp && <EditEmployeeModal employee={editingEmp} onClose={() => setEditingEmp(null)} onUpdated={() => { setEditingEmp(null); load(); }} />}
      {advanceFor && <AdvanceModal employee={advanceFor} onClose={() => setAdvanceFor(null)} onDone={() => setAdvanceFor(null)} />}
      {editingAdvance && (
        <AdvanceModal
          employee={editingAdvance.employee || selectedEmp}
          advance={editingAdvance}
          onClose={() => setEditingAdvance(null)}
          onDone={() => {
            setEditingAdvance(null);
            setSelectedEmp(null);
            load();
          }}
        />
      )}
      {selectedEmp && (
        <EmployeeDetailsModal
          employee={selectedEmp}
          onClose={() => setSelectedEmp(null)}
          onEdit={() => {
            const empToEdit = selectedEmp;
            setSelectedEmp(null);
            setEditingEmp(empToEdit);
          }}
          onEditAdvance={(adv) => {
            const emp = selectedEmp;
            setSelectedEmp(null);
            setEditingAdvance({ ...adv, employee: emp });
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
            <DatePickerInput value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} />
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
    aadhaar_number: employee.aadhaar_number || '',
    active: employee.active !== undefined ? employee.active : 1
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
      formData.append('active', form.active);
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

        <div className="grid grid-3">
          <div className="field">
            <label>Monthly Salary (₹)</label>
            <input type="number" value={form.salary_monthly} onChange={e => setForm({ ...form, salary_monthly: e.target.value })} placeholder="18000" />
          </div>
          <div className="field">
            <label>Joining Date</label>
            <DatePickerInput value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} />
          </div>
          <div className="field">
            <label>Status</label>
            <select
              value={String(form.active)}
              onChange={e => setForm({ ...form, active: Number(e.target.value) })}
            >
              <option value="1">🟢 Active</option>
              <option value="0">🔴 Inactive / Resigned</option>
            </select>
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

function EmployeeDetailsModal({ employee, onClose, onEdit, onEditAdvance }) {
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
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Action</th>
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
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '2px 8px', fontSize: 11, color: '#0284c7', borderColor: '#0284c7', fontWeight: 600 }}
                          onClick={() => onEditAdvance && onEditAdvance(a)}
                          title="Edit advance details"
                        >
                          ✏️ Edit
                        </button>
                      </td>
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

function parseDateForInput(dateStr) {
  if (!dateStr) return '';
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function AdvanceModal({ employee, advance, onClose, onDone }) {
  const isEditing = Boolean(advance && advance.id);
  const [amount, setAmount] = useState(() => isEditing ? String(advance.amount || '') : '');
  const [paymentMethod, setPaymentMethod] = useState(() => isEditing ? (advance.payment_method || 'cash') : 'cash');
  const [note, setNote] = useState(() => isEditing ? (advance.note || '') : '');
  const [advanceDateTime, setAdvanceDateTime] = useState(() => {
    if (isEditing && advance.date) {
      const parsed = parseDateForInput(advance.date);
      if (parsed) return parsed;
    }
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!amount) return;
    setLoading(true);
    try {
      if (isEditing) {
        await api.put(`/employees/advances/${advance.id}`, {
          amount: Number(amount),
          payment_method: paymentMethod,
          date: advanceDateTime,
          note
        });
      } else {
        await api.post(`/employees/${employee.id}/advance`, {
          amount: Number(amount),
          payment_method: paymentMethod,
          date: advanceDateTime,
          note
        });
      }
      onDone();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!isEditing) return;
    if (!window.confirm('Are you sure you want to delete this advance entry?')) return;
    setLoading(true);
    try {
      await api.delete(`/employees/advances/${advance.id}`);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>
            {isEditing ? `✏️ Edit Advance (${employee?.name || 'Staff'})` : `Advance for ${employee?.name}`}
          </h2>
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
          <label>Advance Date & Time *</label>
          <input
            type="datetime-local"
            value={advanceDateTime}
            onChange={e => setAdvanceDateTime(e.target.value)}
            style={{ fontSize: 14, fontWeight: 600 }}
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
          {isEditing && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleDelete}
              disabled={loading}
              style={{ color: '#e11d48', borderColor: '#f43f5e' }}
            >
              🗑️ Delete
            </button>
          )}
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={loading || !amount || !advanceDateTime}
            style={{ flex: 1.5 }}
          >
            {loading ? 'Saving...' : isEditing ? 'Update Advance' : 'Save Advance'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
