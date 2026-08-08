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

  async function load() {
    const emps = await api.get('/employees');
    setEmployees(emps);
    const att = await api.get(`/attendance?date=${date}`);
    setAttendance(att);
  }
  useEffect(() => { load(); }, [date]);

  function attFor(empId) {
    return attendance.find(a => a.employee_id === empId);
  }

  function nowTime() {
    return new Date().toTimeString().slice(0, 5);
  }

  async function clockIn(empId) {
    await api.post('/attendance/clock-in', { employee_id: empId, date, time: nowTime() });
    load();
  }
  async function clockOut(empId) {
    await api.post('/attendance/clock-out', { employee_id: empId, date, time: nowTime() });
    load();
  }
  async function mark(empId, status) {
    await api.post('/attendance/mark', { employee_id: empId, date, status });
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Attendance</h1>
        <input type="date" style={{ width: 180 }} value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Check in</th>
              <th>Check out</th>
              <th>Late (min)</th>
              <th>Overtime (min)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(e => {
              const a = attFor(e.id);
              return (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{a?.check_in || '-'}</td>
                  <td>{a?.check_out || '-'}</td>
                  <td>{a?.late_minutes || 0}</td>
                  <td>{a?.overtime_minutes || 0}</td>
                  <td>{a ? <span className={'pill ' + (STATUS_STYLES[a.status] || 'pill-gray')}>{a.status}</span> : <span className="muted">Not marked</span>}</td>
                  <td>
                    <div className="flex gap-8">
                      {!a?.check_in && <button className="btn btn-secondary" onClick={() => clockIn(e.id)}>Clock in</button>}
                      {a?.check_in && !a?.check_out && <button className="btn btn-secondary" onClick={() => clockOut(e.id)}>Clock out</button>}
                      <button className="btn btn-outline" onClick={() => mark(e.id, 'leave')}>Leave</button>
                      <button className="btn btn-outline" onClick={() => mark(e.id, 'half_day')}>Half day</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {employees.length === 0 && <p className="muted">Add employees first from the Employees page.</p>}
      </div>
    </div>
  );
}
