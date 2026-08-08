import { useEffect, useState } from 'react';
import { api } from '../api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Payroll() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState([]);
  const [previews, setPreviews] = useState({});
  const [generated, setGenerated] = useState({});

  async function load() {
    const emps = await api.get('/employees');
    setEmployees(emps);
    const previewMap = {};
    for (const e of emps) {
      previewMap[e.id] = await api.get(`/payroll/preview?employee_id=${e.id}&month=${month}&year=${year}`);
    }
    setPreviews(previewMap);
    const gen = await api.get(`/payroll?month=${month}&year=${year}`);
    const genMap = {};
    gen.forEach(g => { genMap[g.employee_id] = g; });
    setGenerated(genMap);
  }
  useEffect(() => { load(); }, [month, year]);

  async function generate(empId) {
    await api.post('/payroll/generate', { employee_id: empId, month, year });
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Payroll</h1>
        <div className="flex gap-8">
          <select style={{ width: 120 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select style={{ width: 100 }} value={year} onChange={e => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Present days</th>
              <th>Overtime pay</th>
              <th>Late deduction</th>
              <th>Advance deduction</th>
              <th>Net pay</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map(e => {
              const p = previews[e.id];
              const g = generated[e.id];
              if (!p) return null;
              return (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{p.present_days}</td>
                  <td>₹{p.overtime_pay}</td>
                  <td>-₹{p.late_deduction}</td>
                  <td>-₹{p.advance_deduction}</td>
                  <td><strong>₹{p.net_pay}</strong></td>
                  <td>
                    {g
                      ? <span className="pill pill-green">Generated</span>
                      : <button className="btn btn-secondary" onClick={() => generate(e.id)}>Generate</button>}
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
