import { useEffect, useState } from 'react';
import { api } from '../api';

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
  const [editingLate, setEditingLate] = useState(null); // { empId, late_minutes }
  const [editingOt, setEditingOt] = useState(null); // { empId, overtime_minutes }

  async function load() {
    try {
      const emps = await api.get('/employees');
      setEmployees(emps || []);
      const att = await api.get(`/attendance?date=${date}`);
      setAttendance(att || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => { load(); }, [date]);

  function attFor(empId) {
    return attendance.find(a => a.employee_id === empId);
  }

  function nowTime() {
    return new Date().toTimeString().slice(0, 5);
  }

  async function clockIn(empId, customTime) {
    const timeToUse = customTime || nowTime();
    await api.post('/attendance/clock-in', { employee_id: empId, date, time: timeToUse });
    load();
  }

  async function clockOut(empId, customTime) {
    const timeToUse = customTime || nowTime();
    await api.post('/attendance/clock-out', { employee_id: empId, date, time: timeToUse });
    load();
  }

  async function updateCheckIn(empId, check_in) {
    await api.post('/attendance/update', { employee_id: empId, date, check_in, status: 'present' });
    setEditingCin(null);
    load();
  }

  async function updateCheckOut(empId, check_out) {
    await api.post('/attendance/update', { employee_id: empId, date, check_out });
    setEditingCout(null);
    load();
  }

  async function mark(empId, status) {
    await api.post('/attendance/mark', { employee_id: empId, date, status });
    load();
  }

  async function updateLate(empId, mins) {
    const val = Math.max(0, Number(mins) || 0);
    await api.post('/attendance/update', { employee_id: empId, date, late_minutes: val });
    setEditingLate(null);
    load();
  }

  async function updateOt(empId, mins) {
    const val = Math.max(0, Number(mins) || 0);
    await api.post('/attendance/update', { employee_id: empId, date, overtime_minutes: val });
    setEditingOt(null);
    load();
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>📅 Staff Attendance</h1>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 14 }}>
            Track daily check-in, check-out, leaves, half-days, late arrivals, and overtime.
          </p>
        </div>
        <div className="flex gap-8 center">
          <label style={{ fontSize: 13, fontWeight: 600 }}>Select Date:</label>
          <input
            type="date"
            style={{ width: 180, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)', fontSize: 13 }}>
              <th style={{ padding: '12px 16px' }}>Employee</th>
              <th style={{ padding: '12px 16px' }}>Check in</th>
              <th style={{ padding: '12px 16px' }}>Check out</th>
              <th style={{ padding: '12px 16px' }}>Late (Min / Hours)</th>
              <th style={{ padding: '12px 16px' }}>Overtime (Min)</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(e => {
              const a = attFor(e.id);
              const lateMins = a?.late_minutes || 0;
              const otMins = a?.overtime_minutes || 0;
              const lateHrs = (lateMins / 60).toFixed(1);

              return (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>{e.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{e.role || 'Washer'}</div>
                  </td>

                  {/* Check In Column */}
                  <td style={{ padding: '14px 16px' }}>
                    {editingCin?.empId === e.id ? (
                      <div className="flex gap-4 center">
                        <input
                          type="time"
                          style={{ padding: '4px 6px', fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }}
                          value={editingCin.check_in}
                          onChange={ev => setEditingCin({ ...editingCin, check_in: ev.target.value })}
                          autoFocus
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => updateCheckIn(e.id, editingCin.check_in)}
                        >
                          ✓
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => setEditingCin(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-6 center" style={{ flexWrap: 'wrap' }}>
                        {a?.check_in ? (
                          <span style={{ fontWeight: 700, color: 'var(--teal-dark)' }}>⏱️ {a.check_in}</span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                        <div className="flex gap-4">
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9' }}
                            title="Set 09:30 AM Shift Start"
                            onClick={() => updateCheckIn(e.id, '09:30')}
                          >
                            09:30
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9' }}
                            onClick={() => setEditingCin({ empId: e.id, check_in: a?.check_in || '09:30' })}
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Check Out Column */}
                  <td style={{ padding: '14px 16px' }}>
                    {editingCout?.empId === e.id ? (
                      <div className="flex gap-4 center">
                        <input
                          type="time"
                          style={{ padding: '4px 6px', fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }}
                          value={editingCout.check_out}
                          onChange={ev => setEditingCout({ ...editingCout, check_out: ev.target.value })}
                          autoFocus
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => updateCheckOut(e.id, editingCout.check_out)}
                        >
                          ✓
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => setEditingCout(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-6 center" style={{ flexWrap: 'wrap' }}>
                        {a?.check_out ? (
                          <span style={{ fontWeight: 700, color: 'var(--teal-dark)' }}>🏁 {a.check_out}</span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9' }}
                          onClick={() => setEditingCout({ empId: e.id, check_out: a?.check_out || '19:30' })}
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Late Minutes Column */}
                  <td style={{ padding: '14px 16px' }}>
                    {editingLate?.empId === e.id ? (
                      <div className="flex gap-4 center">
                        <input
                          type="number"
                          style={{ width: 65, padding: '4px 6px', fontSize: 13 }}
                          value={editingLate.late_minutes}
                          onChange={ev => setEditingLate({ ...editingLate, late_minutes: ev.target.value })}
                          autoFocus
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => updateLate(e.id, editingLate.late_minutes)}
                        >
                          ✓
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => setEditingLate(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-8 center" style={{ flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: lateMins > 0 ? '#e11d48' : 'var(--muted)',
                            background: lateMins > 0 ? '#ffe4e6' : 'transparent',
                            padding: lateMins > 0 ? '2px 8px' : '0',
                            borderRadius: 6,
                            fontSize: 13
                          }}
                        >
                          {lateMins > 0 ? `${lateMins}m (${lateHrs}h)` : '0m'}
                        </span>
                        <div className="flex gap-4">
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9' }}
                            title="Set 1 Hour Late (60 mins)"
                            onClick={() => updateLate(e.id, 60)}
                          >
                            +1h
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9' }}
                            onClick={() => setEditingLate({ empId: e.id, late_minutes: lateMins })}
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Overtime Minutes Column */}
                  <td style={{ padding: '14px 16px' }}>
                    {editingOt?.empId === e.id ? (
                      <div className="flex gap-4 center">
                        <input
                          type="number"
                          style={{ width: 65, padding: '4px 6px', fontSize: 13 }}
                          value={editingOt.overtime_minutes}
                          onChange={ev => setEditingOt({ ...editingOt, overtime_minutes: ev.target.value })}
                          autoFocus
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => updateOt(e.id, editingOt.overtime_minutes)}
                        >
                          ✓
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => setEditingOt(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-8 center">
                        <span style={{ fontWeight: 700, color: otMins > 0 ? '#16a34a' : 'var(--muted)' }}>
                          {otMins}m
                        </span>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9' }}
                          onClick={() => setEditingOt({ empId: e.id, overtime_minutes: otMins })}
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Status Column */}
                  <td style={{ padding: '14px 16px' }}>
                    {a ? (
                      <span className={'pill ' + (STATUS_STYLES[a.status] || 'pill-gray')}>
                        {a.status === 'half_day' ? 'Half Day' : a.status}
                      </span>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>Not marked</span>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                      {!a?.check_in && (
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => clockIn(e.id)}>
                          Clock in
                        </button>
                      )}
                      {a?.check_in && !a?.check_out && (
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => clockOut(e.id)}>
                          Clock out
                        </button>
                      )}
                      <button
                        className={`btn ${a?.status === 'present' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: 12, padding: '5px 10px' }}
                        onClick={() => mark(e.id, 'present')}
                      >
                        Present
                      </button>
                      <button
                        className={`btn ${a?.status === 'leave' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: 12, padding: '5px 10px' }}
                        onClick={() => mark(e.id, 'leave')}
                      >
                        Leave
                      </button>
                      <button
                        className={`btn ${a?.status === 'half_day' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: 12, padding: '5px 10px' }}
                        onClick={() => mark(e.id, 'half_day')}
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
          <p className="muted" style={{ padding: 20, textAlign: 'center', margin: 0 }}>
            No employees found. Add employees first from the Employee List page.
          </p>
        )}
      </div>
    </div>
  );
}


