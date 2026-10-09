import { useEffect, useState } from 'react';
import { api } from '../api';
import DatePickerInput from '../components/DatePickerInput';

const STATUS_STYLES = {
  present: 'pill-green',
  half_day: 'pill-amber',
  leave: 'pill-gray',
  absent: 'pill-red'
};

export default function Attendance() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [editingCin, setEditingCin] = useState(null); // { empId, check_in }
  const [editingCout, setEditingCout] = useState(null); // { empId, check_out }

  async function load() {
    try {
      const emps = await api.get('/employees?status=active');
      setEmployees(emps || []);
      const att = await api.get(`/attendance?date=${date}`);
      setAttendance(att || []);
    } catch (err) {
      console.error('Error loading attendance:', err);
    }
  }

  useEffect(() => { load(); }, [date]);

  function attFor(empId) {
    return attendance.find(a => a.employee_id === empId);
  }

  function nowTime() {
    return new Date().toTimeString().slice(0, 5);
  }

  async function clockIn(empId, customTime, shiftStart) {
    const timeToUse = customTime || nowTime();
    await api.post('/attendance/clock-in', { employee_id: empId, date, time: timeToUse, shift_start: shiftStart || '08:00' });
    load();
  }

  async function clockOut(empId, customTime) {
    const timeToUse = customTime || nowTime();
    await api.post('/attendance/clock-out', { employee_id: empId, date, time: timeToUse });
    load();
  }

  async function updateCheckIn(empId, check_in, shiftStart) {
    await api.post('/attendance/update', { employee_id: empId, date, check_in, shift_start: shiftStart || '08:00', status: 'present' });
    setEditingCin(null);
    load();
  }

  async function updateCheckOut(empId, check_out) {
    await api.post('/attendance/update', { employee_id: empId, date, check_out });
    setEditingCout(null);
    load();
  }

  async function changeShift(empId, newShift) {
    await api.post('/attendance/update', { employee_id: empId, date, shift_start: newShift });
    load();
  }

  async function mark(empId, status, shiftStart) {
    await api.post('/attendance/mark', { employee_id: empId, date, status, shift_start: shiftStart || '08:00' });
    load();
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>
      {/* Header Bar */}
      <div className="page-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--foreground)' }}>📅 Staff Attendance</h1>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
            Manage active employee check-ins, select daily shift schedule per employee, and track late arrivals.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Select Date:</label>
          <DatePickerInput
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Attendance Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'auto' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
              <th style={{ padding: '14px 16px', verticalAlign: 'middle', width: '20%' }}>Employee</th>
              <th style={{ padding: '14px 16px', verticalAlign: 'middle', width: '18%' }}>Shift Schedule</th>
              <th style={{ padding: '14px 16px', verticalAlign: 'middle', width: '21%' }}>Check In (Start Time)</th>
              <th style={{ padding: '14px 16px', verticalAlign: 'middle', width: '21%' }}>Check Out (End Time)</th>
              <th style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center', width: '10%' }}>Late Time</th>
              <th style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center', width: '10%' }}>Status</th>
              <th style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right', width: '20%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(e => {
              const a = attFor(e.id);
              const shiftStart = (a?.shift_start || e.default_shift || '08:00').slice(0, 5);
              const lateMins = a?.late_minutes || 0;
              const lateHrs = (lateMins / 60).toFixed(1);

              return (
                <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 14, transition: 'background 0.15s' }}>
                  {/* Employee Name & Role */}
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{e.name}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2, color: '#64748b' }}>{e.role || 'Washer'}</div>
                  </td>

                  {/* Shift Schedule Dropdown */}
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    <select
                      value={shiftStart}
                      onChange={eEv => changeShift(e.id, eEv.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        fontWeight: 600,
                        background: '#ffffff',
                        color: '#0f766e',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="08:00">🌅 08:00 AM Shift</option>
                      <option value="11:00">☀️ 11:00 AM Shift</option>
                      <option value="20:00">🌙 08:00 PM Shift</option>
                    </select>
                  </td>

                  {/* Check In Column */}
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    {editingCin?.empId === e.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="time"
                          style={{ padding: '4px 6px', fontSize: 13, borderRadius: 6, border: '1px solid #0284c7', outline: 'none' }}
                          value={editingCin.check_in}
                          onChange={ev => setEditingCin({ ...editingCin, check_in: ev.target.value })}
                          autoFocus
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6 }}
                          onClick={() => updateCheckIn(e.id, editingCin.check_in, shiftStart)}
                        >
                          ✓ Save
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6 }}
                          onClick={() => setEditingCin(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : a?.check_in ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0fdf4', padding: '4px 10px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                        <span style={{ fontWeight: 700, color: '#166534', fontSize: 13 }}>⏱️ {a.check_in}</span>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: 11, padding: '2px 6px', background: '#ffffff', borderColor: '#cbd5e1', color: '#475569', borderRadius: 4 }}
                          title="Adjust check-in start time"
                          onClick={() => setEditingCin({ empId: e.id, check_in: a.check_in })}
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: '6px 10px', background: '#0f766e', color: '#ffffff', borderRadius: 6, fontWeight: 600, border: 'none' }}
                          title="Record start time from NOW"
                          onClick={() => clockIn(e.id, null, shiftStart)}
                        >
                          ⏱️ Check In (Now)
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: 11, padding: '5px 8px', background: '#f8fafc', color: '#475569', borderRadius: 6, border: '1px solid #cbd5e1' }}
                          title="Adjust & set custom start time"
                          onClick={() => setEditingCin({ empId: e.id, check_in: a?.check_in || shiftStart })}
                        >
                          ✏️ Edit Time
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Check Out Column */}
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    {editingCout?.empId === e.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="time"
                          style={{ padding: '4px 6px', fontSize: 13, borderRadius: 6, border: '1px solid #e11d48', outline: 'none' }}
                          value={editingCout.check_out}
                          onChange={ev => setEditingCout({ ...editingCout, check_out: ev.target.value })}
                          autoFocus
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, background: '#e11d48', borderColor: '#e11d48' }}
                          onClick={() => updateCheckOut(e.id, editingCout.check_out)}
                        >
                          ✓ Save
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6 }}
                          onClick={() => setEditingCout(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : a?.check_out ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff1f2', padding: '4px 10px', borderRadius: 8, border: '1px solid #fecdd3' }}>
                        <span style={{ fontWeight: 700, color: '#9f1239', fontSize: 13 }}>🏁 {a.check_out}</span>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: 11, padding: '2px 6px', background: '#ffffff', borderColor: '#cbd5e1', color: '#475569', borderRadius: 4 }}
                          title="Adjust check-out end time"
                          onClick={() => setEditingCout({ empId: e.id, check_out: a.check_out })}
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    ) : a?.check_in ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: '6px 10px', background: '#e11d48', color: '#ffffff', borderRadius: 6, fontWeight: 600, border: 'none' }}
                          title="Record end time from NOW"
                          onClick={() => clockOut(e.id)}
                        >
                          🏁 Check Out (Now)
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: 11, padding: '5px 8px', background: '#f8fafc', color: '#475569', borderRadius: 6, border: '1px solid #cbd5e1' }}
                          title="Adjust & set custom end time"
                          onClick={() => setEditingCout({ empId: e.id, check_out: '19:30' })}
                        >
                          ✏️ Edit Time
                        </button>
                      </div>
                    ) : (
                      <span className="muted" style={{ fontSize: 13, color: '#94a3b8' }}>-</span>
                    )}
                  </td>

                  {/* Late Minutes Column */}
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontWeight: 700,
                        color: lateMins > 0 ? '#e11d48' : '#64748b',
                        background: lateMins > 0 ? '#ffe4e6' : '#f1f5f9',
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12
                      }}
                    >
                      {lateMins > 0 ? `${lateMins}m (${lateHrs}h)` : '0m'}
                    </span>
                  </td>

                  {/* Status Column */}
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                    {a ? (
                      <span className={'pill ' + (STATUS_STYLES[a.status] || 'pill-gray')}>
                        {a.status === 'half_day' ? 'Half Day' : a.status}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Not marked</span>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      <button
                        className={`btn ${a?.status === 'present' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6 }}
                        onClick={() => mark(e.id, 'present', shiftStart)}
                      >
                        Present
                      </button>
                      <button
                        className={`btn ${a?.status === 'leave' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6 }}
                        onClick={() => mark(e.id, 'leave', shiftStart)}
                      >
                        Leave
                      </button>
                      <button
                        className={`btn ${a?.status === 'half_day' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6 }}
                        onClick={() => mark(e.id, 'half_day', shiftStart)}
                      >
                        Half day
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {employees.length === 0 && (
          <p className="muted" style={{ padding: 24, textAlign: 'center', margin: 0, fontSize: 14 }}>
            No active employees found. Please add or enable employees from Employee List.
          </p>
        )}
      </div>
    </div>
  );
}
