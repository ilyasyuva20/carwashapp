import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import DatePickerInput from '../components/DatePickerInput';
import AttendanceReportModal from '../components/AttendanceReportModal';
import { formatDateDMY } from '../utils/formatDate';

const STATUS_CONFIG = {
  present: { label: 'Present', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '🟢' },
  half_day: { label: 'Half Day', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '🟡' },
  absent: { label: 'Absent', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '🔴' },
  leave: { label: 'Leave', color: '#475569', bg: '#f8fafc', border: '#e2e8f0', icon: '⚪' },
};

function getInitials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarBg(name = '') {
  const colors = [
    'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    'linear-gradient(135deg, #059669 0%, #047857 100%)',
    'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Attendance() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [search, setSearch] = useState('');
  const [editingCin, setEditingCin] = useState(null); // { empId, check_in }
  const [editingCout, setEditingCout] = useState(null); // { empId, check_out }
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  async function saveAllAttendance() {
    setSavingAll(true);
    try {
      const recordsToSave = employees.map(e => {
        const a = attFor(e.id) || {};
        const shiftStart = a.shift_start || e.default_shift || '08:00';
        const status = a.status && a.status !== 'not_marked' ? a.status : 'present';
        const checkIn = a.check_in || (status === 'present' || status === 'half_day' ? shiftStart : null);
        const checkOut = a.check_out || null;
        return {
          employee_id: e.id,
          date,
          status,
          shift_start: shiftStart,
          check_in: checkIn,
          check_out: checkOut,
          late_minutes: a.late_minutes || 0
        };
      });

      try {
        const res = await api.post('/attendance/bulk-save', { date, records: recordsToSave });
        alert(`✅ Saved attendance for all ${res.records_saved || employees.length} staff members for ${formatDateDMY(date)}!`);
      } catch (bulkErr) {
        for (const rec of recordsToSave) {
          await api.post('/attendance/update', rec);
        }
        alert(`✅ Saved attendance for all ${employees.length} staff members for ${formatDateDMY(date)}!`);
      }
      await load();
    } catch (err) {
      alert('Error saving attendance: ' + err.message);
    } finally {
      setSavingAll(false);
    }
  }

  async function setAllOnTimePresent() {
    setSavingAll(true);
    try {
      const recordsToSave = employees.map(e => {
        const shiftStart = e.default_shift || '08:00';
        return {
          employee_id: e.id,
          date,
          status: 'present',
          shift_start: shiftStart,
          check_in: shiftStart,
          check_out: '17:30',
          late_minutes: 0
        };
      });

      try {
        const res = await api.post('/attendance/bulk-save', { date, records: recordsToSave });
        alert(`⚡ All ${res.records_saved || employees.length} staff members set to Present & On Time for ${formatDateDMY(date)}!`);
      } catch (bulkErr) {
        for (const rec of recordsToSave) {
          await api.post('/attendance/update', rec);
        }
        alert(`⚡ All ${employees.length} staff members set to Present & On Time for ${formatDateDMY(date)}!`);
      }
      await load();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSavingAll(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const emps = await api.get('/employees?status=active');
      setEmployees(emps || []);
      const att = await api.get(`/attendance?date=${date}`);
      setAttendance(att || []);
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setLoading(false);
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

  async function markAllPresent() {
    setMarkingAll(true);
    try {
      for (const e of employees) {
        const a = attFor(e.id);
        if (!a || !a.status || a.status === 'not_marked') {
          const shiftStart = e.default_shift || '08:00';
          await api.post('/attendance/mark', { employee_id: e.id, date, status: 'present', shift_start: shiftStart });
        }
      }
      await load();
    } finally {
      setMarkingAll(false);
    }
  }

  function changeDateBy(days) {
    const dt = new Date(date);
    dt.setDate(dt.getDate() + days);
    setDate(dt.toISOString().slice(0, 10));
  }

  // Summary Metrics
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const halfDayCount = attendance.filter(a => a.status === 'half_day').length;
  const leaveCount = attendance.filter(a => a.status === 'leave').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const markedTotal = presentCount + halfDayCount + leaveCount + absentCount;
  const pendingCount = employees.length - markedTotal;

  const lateEmps = attendance.filter(a => (a.late_minutes || 0) > 0);
  const totalLateMins = attendance.reduce((s, a) => s + (a.late_minutes || 0), 0);

  const filteredEmployees = employees.filter(e => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (e.name || '').toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q) ||
      (e.phone || '').includes(q)
    );
  });

  const isToday = date === todayStr;

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 24 }}>
      {/* Ultra Compact Header Bar */}
      <div
        style={{
          padding: '12px 18px',
          marginBottom: 12,
          background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
          color: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(15, 118, 110, 0.18)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>📅</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
              Staff Attendance Workspace
            </h1>
            <span style={{ fontSize: 11, color: '#ccfbf1', opacity: 0.9 }}>
              Check-in, shift start times, lateness calculation, multi-day bulk fill & CSV import
            </span>
          </div>
        </div>

        {/* Date Selector Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.14)', padding: '4px 8px', borderRadius: 10, backdropFilter: 'blur(6px)' }}>
          <button
            type="button"
            style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.2)', color: '#ffffff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
            onClick={() => changeDateBy(-1)}
            title="Previous Day"
          >
            ◀
          </button>

          <DatePickerInput
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: 'none',
              fontWeight: 700,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 13
            }}
          />

          <button
            type="button"
            style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.2)', color: '#ffffff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
            onClick={() => changeDateBy(1)}
            title="Next Day"
          >
            ▶
          </button>

          {!isToday && (
            <button
              type="button"
              style={{ padding: '4px 10px', background: '#ffffff', color: '#0f766e', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              onClick={() => setDate(todayStr)}
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Ultra Compact Horizontal Summary Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 8,
          marginBottom: 12
        }}
      >
        <div style={{ padding: '8px 12px', borderRadius: 10, background: '#ffffff', border: '1px solid var(--border)', borderLeftWidth: 3, borderLeftColor: '#0f766e' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>Total Staff</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{employees.length}</div>
        </div>

        <div style={{ padding: '8px 12px', borderRadius: 10, background: '#ffffff', border: '1px solid var(--border)', borderLeftWidth: 3, borderLeftColor: '#16a34a' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>Present Today</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>
            {presentCount} <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>({halfDayCount} half)</span>
          </div>
        </div>

        <div style={{ padding: '8px 12px', borderRadius: 10, background: '#ffffff', border: '1px solid var(--border)', borderLeftWidth: 3, borderLeftColor: '#d97706' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>Leave / Absent</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#d97706', marginTop: 2 }}>{leaveCount + absentCount}</div>
        </div>

        <div style={{ padding: '8px 12px', borderRadius: 10, background: '#ffffff', border: '1px solid var(--border)', borderLeftWidth: 3, borderLeftColor: '#e11d48' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>Late Arrivals</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#e11d48', marginTop: 2 }}>
            {lateEmps.length} <span style={{ fontSize: 11, color: '#9f1239', fontWeight: 600 }}>({totalLateMins}m)</span>
          </div>
        </div>

        <div style={{ padding: '8px 12px', borderRadius: 10, background: '#ffffff', border: '1px solid var(--border)', borderLeftWidth: 3, borderLeftColor: '#64748b' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>Pending</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: pendingCount > 0 ? '#d97706' : '#64748b', marginTop: 2 }}>
            {pendingCount}
          </div>
        </div>
      </div>

      {/* Main Table Container Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        {/* Compact Table Filter Toolbar */}
        <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              placeholder="🔍 Search staff by name or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 260, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#ffffff' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="btn btn-outline" style={{ fontSize: 11, padding: '4px 8px' }}>
                Clear
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Full Attendance Report Button */}
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowReportModal(true)}
              style={{
                fontSize: 12,
                padding: '6px 12px',
                background: '#ffffff',
                color: '#0f766e',
                borderColor: '#0f766e',
                borderRadius: 6,
                fontWeight: 700
              }}
            >
              📋 Full Attendance Report
            </button>

            {/* CSV Excel Upload Button */}
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowCSVModal(true)}
              style={{
                fontSize: 12,
                padding: '6px 12px',
                background: '#ffffff',
                color: '#0284c7',
                borderColor: '#38bdf8',
                borderRadius: 6,
                fontWeight: 700
              }}
            >
              📊 CSV / Excel Upload
            </button>

            {pendingCount > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={markAllPresent}
                disabled={markingAll}
                style={{ fontSize: 12, padding: '6px 12px', background: '#0f766e', borderColor: '#0f766e', borderRadius: 6, fontWeight: 700 }}
              >
                {markingAll ? 'Marking...' : `✨ Mark All Present (${pendingCount})`}
              </button>
            )}
          </div>
        </div>

        {/* Compact Single-View Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                <th style={{ padding: '10px 14px', width: '22%' }}>Employee Staff</th>
                <th style={{ padding: '10px 10px', width: '15%' }}>Shift Schedule</th>
                <th style={{ padding: '10px 10px', width: '20%' }}>Check-In</th>
                <th style={{ padding: '10px 10px', width: '20%' }}>Check-Out</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', width: '8%' }}>Late</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', width: '25%' }}>Mark Attendance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    Loading attendance records...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    No staff members match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(e => {
                  const a = attFor(e.id);
                  const shiftStart = (a?.shift_start || e.default_shift || '08:00').slice(0, 5);
                  const lateMins = a?.late_minutes || 0;
                  const lateHrs = (lateMins / 60).toFixed(1);
                  const currentStatus = a?.status || 'not_marked';

                  return (
                    <tr
                      key={e.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        fontSize: 13,
                        background: currentStatus === 'present' ? '#f0fdf4' : currentStatus === 'absent' ? '#fff1f2' : currentStatus === 'leave' ? '#f8fafc' : '#ffffff',
                        transition: 'background 0.15s'
                      }}
                    >
                      {/* Employee Column with Avatar */}
                      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: getAvatarBg(e.name),
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 12,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              flexShrink: 0
                            }}
                          >
                            {getInitials(e.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{e.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                              <span style={{ fontSize: 10, background: '#e2e8f0', color: '#334155', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                                {e.role || 'Washer'}
                              </span>
                              {e.phone && <span className="muted" style={{ fontSize: 10 }}>📞 {e.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Shift Schedule Dropdown Pill */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                        <select
                          value={shiftStart}
                          onChange={eEv => changeShift(e.id, eEv.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            fontSize: 12,
                            fontWeight: 700,
                            background: '#ffffff',
                            color: '#0f766e',
                            cursor: 'pointer',
                            outline: 'none',
                            width: '100%',
                            minWidth: 125
                          }}
                        >
                          <option value="08:00">🌅 08:00 AM Shift</option>
                          <option value="11:00">☀️ 11:00 AM Shift</option>
                          <option value="20:00">🌙 08:00 PM Shift</option>
                        </select>
                      </td>

                      {/* Check-In Column */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                        {editingCin?.empId === e.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="time"
                              style={{ padding: '3px 5px', fontSize: 12, borderRadius: 6, border: '1px solid #0f766e', outline: 'none' }}
                              value={editingCin.check_in}
                              onChange={ev => setEditingCin({ ...editingCin, check_in: ev.target.value })}
                              autoFocus
                            />
                            <button
                              className="btn btn-primary"
                              style={{ padding: '3px 6px', fontSize: 10, borderRadius: 4, background: '#0f766e', borderColor: '#0f766e' }}
                              onClick={() => updateCheckIn(e.id, editingCin.check_in, shiftStart)}
                            >
                              ✓
                            </button>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '3px 6px', fontSize: 10, borderRadius: 4 }}
                              onClick={() => setEditingCin(null)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : a?.check_in ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', padding: '3px 8px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                            <span style={{ fontWeight: 800, color: '#166534', fontSize: 12 }}>🟢 {a.check_in}</span>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ fontSize: 10, padding: '1px 5px', background: '#ffffff', borderColor: '#cbd5e1', color: '#475569', borderRadius: 4 }}
                              title="Edit check-in time"
                              onClick={() => setEditingCin({ empId: e.id, check_in: a.check_in })}
                            >
                              ✏️
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              type="button"
                              className="btn"
                              style={{
                                fontSize: 11,
                                padding: '4px 8px',
                                background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                                color: '#ffffff',
                                borderRadius: 6,
                                fontWeight: 700,
                                border: 'none'
                              }}
                              title="Record check-in time from NOW"
                              onClick={() => clockIn(e.id, null, shiftStart)}
                            >
                              ⏱️ Check In
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ fontSize: 10, padding: '4px 6px', background: '#ffffff', color: '#475569', borderRadius: 6, border: '1px solid #cbd5e1' }}
                              title="Set custom check-in time"
                              onClick={() => setEditingCin({ empId: e.id, check_in: a?.check_in || shiftStart })}
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Check-Out Column */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                        {editingCout?.empId === e.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="time"
                              style={{ padding: '3px 5px', fontSize: 12, borderRadius: 6, border: '1px solid #e11d48', outline: 'none' }}
                              value={editingCout.check_out}
                              onChange={ev => setEditingCout({ ...editingCout, check_out: ev.target.value })}
                              autoFocus
                            />
                            <button
                              className="btn btn-primary"
                              style={{ padding: '3px 6px', fontSize: 10, borderRadius: 4, background: '#e11d48', borderColor: '#e11d48' }}
                              onClick={() => updateCheckOut(e.id, editingCout.check_out)}
                            >
                              ✓
                            </button>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '3px 6px', fontSize: 10, borderRadius: 4 }}
                              onClick={() => setEditingCout(null)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : a?.check_out ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff1f2', padding: '3px 8px', borderRadius: 8, border: '1px solid #fecdd3' }}>
                            <span style={{ fontWeight: 800, color: '#9f1239', fontSize: 12 }}>🏁 {a.check_out}</span>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ fontSize: 10, padding: '1px 5px', background: '#ffffff', borderColor: '#cbd5e1', color: '#475569', borderRadius: 4 }}
                              title="Edit check-out time"
                              onClick={() => setEditingCout({ empId: e.id, check_out: a.check_out })}
                            >
                              ✏️
                            </button>
                          </div>
                        ) : a?.check_in ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              type="button"
                              className="btn"
                              style={{
                                fontSize: 11,
                                padding: '4px 8px',
                                background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                                color: '#ffffff',
                                borderRadius: 6,
                                fontWeight: 700,
                                border: 'none'
                              }}
                              title="Record check-out time from NOW"
                              onClick={() => clockOut(e.id)}
                            >
                              🏁 Check Out
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ fontSize: 10, padding: '4px 6px', background: '#ffffff', color: '#475569', borderRadius: 6, border: '1px solid #cbd5e1' }}
                              title="Set custom check-out time"
                              onClick={() => setEditingCout({ empId: e.id, check_out: '19:30' })}
                            >
                              ✏️
                            </button>
                          </div>
                        ) : (
                          <span className="muted" style={{ fontSize: 11, color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      {/* Late Minutes Column */}
                      <td style={{ padding: '10px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                        {lateMins > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                              fontWeight: 800,
                              color: '#be123c',
                              background: '#ffe4e6',
                              border: '1px solid #fecdd3',
                              padding: '2px 7px',
                              borderRadius: 12,
                              fontSize: 11
                            }}
                            title={`${lateMins} mins late`}
                          >
                            ⚠️ {lateMins}m
                          </span>
                        ) : a?.check_in ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontWeight: 700,
                              color: '#15803d',
                              background: '#dcfce7',
                              border: '1px solid #bbf7d0',
                              padding: '2px 7px',
                              borderRadius: 12,
                              fontSize: 11
                            }}
                          >
                            ✓ On Time
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>0m</span>
                        )}
                      </td>

                      {/* Attendance Status Action Segment Buttons */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            background: '#f1f5f9',
                            padding: 2,
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            gap: 1
                          }}
                        >
                          <button
                            type="button"
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              fontWeight: currentStatus === 'present' ? 800 : 600,
                              borderRadius: 6,
                              border: 'none',
                              cursor: 'pointer',
                              background: currentStatus === 'present' ? '#16a34a' : 'transparent',
                              color: currentStatus === 'present' ? '#ffffff' : '#475569',
                              transition: 'all 0.12s ease'
                            }}
                            onClick={() => mark(e.id, 'present', shiftStart)}
                          >
                            🟢 Present
                          </button>

                          <button
                            type="button"
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              fontWeight: currentStatus === 'half_day' ? 800 : 600,
                              borderRadius: 6,
                              border: 'none',
                              cursor: 'pointer',
                              background: currentStatus === 'half_day' ? '#d97706' : 'transparent',
                              color: currentStatus === 'half_day' ? '#ffffff' : '#475569',
                              transition: 'all 0.12s ease'
                            }}
                            onClick={() => mark(e.id, 'half_day', shiftStart)}
                          >
                            🟡 Half Day
                          </button>

                          <button
                            type="button"
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              fontWeight: currentStatus === 'leave' ? 800 : 600,
                              borderRadius: 6,
                              border: 'none',
                              cursor: 'pointer',
                              background: currentStatus === 'leave' ? '#475569' : 'transparent',
                              color: currentStatus === 'leave' ? '#ffffff' : '#475569',
                              transition: 'all 0.12s ease'
                            }}
                            onClick={() => mark(e.id, 'leave', shiftStart)}
                          >
                            ⚪ Leave
                          </button>

                          <button
                            type="button"
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              fontWeight: currentStatus === 'absent' ? 800 : 600,
                              borderRadius: 6,
                              border: 'none',
                              cursor: 'pointer',
                              background: currentStatus === 'absent' ? '#dc2626' : 'transparent',
                              color: currentStatus === 'absent' ? '#ffffff' : '#475569',
                              transition: 'all 0.12s ease'
                            }}
                            onClick={() => mark(e.id, 'absent', shiftStart)}
                          >
                            🔴 Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Bottom Save Action Bar */}
      <div
        style={{
          marginTop: 16,
          padding: '14px 20px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          color: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(22, 163, 74, 0.2)',
              border: '1px solid rgba(22, 163, 74, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22
            }}
          >
            💾
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#ffffff', letterSpacing: '-0.01em' }}>
              Save All Staff Attendance ({employees.length} Active Staff)
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Single-click to save attendance, check-in, check-out & late minutes for {formatDateDMY(date)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={setAllOnTimePresent}
            disabled={savingAll}
            style={{
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ⚡ Set All Present On-Time
          </button>

          <button
            type="button"
            className="btn"
            onClick={saveAllAttendance}
            disabled={savingAll}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            {savingAll ? 'Saving All...' : '💾 SAVE ALL ATTENDANCE'}
          </button>
        </div>
      </div>

      {/* Bulk Attendance Range Modal */}
      {/* CSV/Excel Import Modal */}
      {showCSVModal && (
        <CSVImportModal
          employees={employees}
          selectedDate={date}
          onClose={() => setShowCSVModal(false)}
          onDone={() => {
            setShowCSVModal(false);
            load();
          }}
        />
      )}

      {/* Full Attendance Report Single-View Table Modal */}
      {showReportModal && (
        <AttendanceReportModal onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}

function CSVImportModal({ employees, selectedDate, onClose, onDone }) {
  const [targetDate, setTargetDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [loading, setLoading] = useState(false);

  function downloadTemplate() {
    const headers = ['SL No', 'Name', 'Shift Start', 'Check In', 'Check Out', 'Late Min', 'Status'];
    const rows = [headers.join(',')];

    employees.forEach((emp, idx) => {
      const shift = emp.default_shift || '08:00';
      const slNo = idx + 1;
      rows.push(`${slNo},"${emp.name || ''}",${shift},08:00,17:30,0,present`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Staff_Attendance_Template_${targetDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) {
        alert('CSV file is empty or missing headers');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const records = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 2) continue;

        const rec = {};
        
        // Match header names
        headers.forEach((h, idx) => {
          const val = cols[idx] || '';
          if (h.includes('sl') || h.includes('sr') || h.includes('s.no') || (h.includes('number') && !h.includes('phone'))) {
            rec.sl_no = val;
          } else if (h.includes('name') || h.includes('employee')) {
            rec.employee_name = val;
          } else if (h.includes('date')) {
            rec.date = val;
          } else if (h.includes('shift')) {
            rec.shift_start = val;
          } else if (h.includes('late')) {
            rec.late_minutes = val;
          } else if (h.includes('check out') || h.includes('checkout') || h.includes('check_out')) {
            rec.check_out = val;
          } else if (h.includes('check in') || h.includes('checkin') || h.includes('check_in')) {
            rec.check_in = val;
          } else if (h.includes('statu') || h.includes('status')) {
            rec.status = val;
          } else if (h.includes('phone') || h.includes('mobile')) {
            rec.phone = val;
          }
        });

        // Positional fallback for 7 standard columns: SL No, Name, Shift Start, Check In, Check Out, Late Min, Status
        if (!rec.employee_name && cols.length >= 7) {
          rec.sl_no = cols[0];
          rec.employee_name = cols[1];
          rec.shift_start = cols[2];
          rec.check_in = cols[3];
          rec.check_out = cols[4];
          rec.late_minutes = cols[5];
          rec.status = cols[6];
        }

        if (rec.employee_name || rec.sl_no || rec.phone) {
          records.push(rec);
        }
      }

      setParsedRows(records);
    };
    reader.readAsText(file);
  }

  async function uploadCSV() {
    if (parsedRows.length === 0) return;
    setLoading(true);
    try {
      const res = await api.post('/attendance/import-csv', { date: targetDate, records: parsedRows });
      alert(`✅ CSV Upload Successful! ${res.records_imported || 0} attendance records imported for ${formatDateDMY(targetDate)}.`);
      onDone();
    } catch (err) {
      alert('Error uploading CSV: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 520, padding: 22 }}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>📊 Attendance Excel / CSV Import</h2>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              Select date, download pre-filled sample CSV template, edit in Excel, and upload!
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>
            ✕
          </button>
        </div>

        {/* Date Selector */}
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: 14, borderRadius: 10, marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
            📅 Attendance Date to Import / Export:
          </label>
          <DatePickerInput
            value={targetDate}
            onChange={e => {
              setTargetDate(e.target.value);
              setParsedRows([]);
              setSelectedFile(null);
            }}
          />
        </div>

        {/* Template Download Section */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 14, borderRadius: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
            📥 Step 1: Download Sample CSV Template
          </div>
          <div style={{ fontSize: 12, color: '#15803d', marginBottom: 10 }}>
            Pre-filled with staff names and serial numbers for <strong>{formatDateDMY(targetDate)}</strong>.
          </div>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: 12, padding: '6px 12px', background: '#ffffff', borderColor: '#86efac', color: '#166534', fontWeight: 700 }}
            onClick={downloadTemplate}
          >
            📥 Download Sample Template ({formatDateDMY(targetDate)})
          </button>
        </div>

        {/* Upload Section */}
        <div style={{ border: '2px dashed #cbd5e1', padding: 20, borderRadius: 10, textAlign: 'center', background: '#f8fafc', marginBottom: 16 }}>
          <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>📄</span>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6, cursor: 'pointer' }}>
            {selectedFile ? `Selected: ${selectedFile.name}` : 'Click here to select CSV File'}
          </label>
          <input
            type="file"
            accept=".csv, .txt, text/csv"
            onChange={handleFileChange}
            style={{ fontSize: 12, margin: '0 auto' }}
          />

          {parsedRows.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
              ✓ Preview: {parsedRows.length} valid staff attendance records ready for {formatDateDMY(targetDate)}!
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-8">
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={uploadCSV}
            disabled={loading || parsedRows.length === 0}
            style={{ flex: 1.5, background: '#0284c7', borderColor: '#0284c7' }}
          >
            {loading ? 'Importing...' : `🚀 Upload & Import (${parsedRows.length} Rows)`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
