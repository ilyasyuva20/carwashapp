import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import { formatDateDMY } from '../utils/formatDate';

const STATUS_BADGES = {
  present: { code: 'P', label: 'Present', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', icon: '🟢' },
  half_day: { code: 'HD', label: 'Half Day', bg: '#fef3c7', color: '#b45309', border: '#fde68a', icon: '🟡' },
  absent: { code: 'A', label: 'Absent', bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', icon: '🔴' },
  leave: { code: 'L', label: 'Leave', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: '⚪' },
};

export default function AttendanceReportModal({ onClose, isEmbedded = false }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' | 'log'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const monthsList = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  async function loadReport() {
    setLoading(true);
    try {
      const res = await api.get(`/reports/attendance-report?month=${month}&year=${year}`);
      setReportData(res);
    } catch (err) {
      console.error('Error loading attendance report:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [month, year]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Map employees & attendance records for Matrix View
  const employees = reportData?.employees || [];
  const records = reportData?.records || [];

  // Build employee-indexed map: empId -> { dateStr -> record }
  const attMap = {};
  records.forEach(r => {
    if (!attMap[r.employee_id]) attMap[r.employee_id] = {};
    const dStr = String(r.date).trim();
    attMap[r.employee_id][dStr] = r;
  });

  const filteredEmployees = employees.filter(e => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (e.name || '').toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q) ||
      (e.phone || '').includes(q)
    );
  });

  // Calculate Month Totals per Employee
  const empStats = {};
  employees.forEach(e => {
    let p = 0, hd = 0, a = 0, l = 0, lateMins = 0;
    const empRecs = attMap[e.id] || {};

    daysArray.forEach(day => {
      const mStr = String(month).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateKey = `${year}-${mStr}-${dStr}`;
      const rec = empRecs[dateKey];

      if (rec) {
        const st = (rec.status || '').toLowerCase();
        if (st === 'present') p++;
        else if (st === 'half_day' || st === 'halfday') hd++;
        else if (st === 'absent') a++;
        else if (st === 'leave') l++;
        lateMins += Number(rec.late_minutes) || 0;
      }
    });

    empStats[e.id] = { p, hd, a, l, lateMins };
  });

  function exportCSV() {
    if (!reportData) return;
    const monthName = monthsList.find(m => m.value === month)?.label || month;
    let csv = '';

    if (viewMode === 'matrix') {
      const headers = ['SL No', 'Employee Name', 'Role', ...daysArray.map(d => `Day ${d}`), 'Total Present', 'Half Days', 'Absents', 'Leaves', 'Total Late (Mins)'];
      csv += headers.map(h => `"${h}"`).join(',') + '\n';

      filteredEmployees.forEach((emp, idx) => {
        const stats = empStats[emp.id] || { p: 0, hd: 0, a: 0, l: 0, lateMins: 0 };
        const row = [
          idx + 1,
          `"${emp.name}"`,
          `"${emp.role || 'Staff'}"`,
          ...daysArray.map(day => {
            const mStr = String(month).padStart(2, '0');
            const dStr = String(day).padStart(2, '0');
            const dateKey = `${year}-${mStr}-${dStr}`;
            const rec = (attMap[emp.id] || {})[dateKey];
            if (!rec) return '-';
            const st = (rec.status || '').toLowerCase();
            return st === 'present' ? 'P' : st === 'half_day' ? 'HD' : st === 'absent' ? 'A' : st === 'leave' ? 'L' : '-';
          }),
          stats.p,
          stats.hd,
          stats.a,
          stats.l,
          stats.lateMins
        ];
        csv += row.join(',') + '\n';
      });
    } else {
      const headers = ['SL No', 'Date (DD/MM/YYYY)', 'Employee Name', 'Role', 'Shift Start', 'Check In', 'Check Out', 'Late (Mins)', 'Status'];
      csv += headers.map(h => `"${h}"`).join(',') + '\n';

      records.forEach((r, idx) => {
        const row = [
          idx + 1,
          `"${formatDateDMY(r.date)}"`,
          `"${r.employee_name}"`,
          `"${r.employee_role || 'Staff'}"`,
          `"${r.shift_start || '08:00'}"`,
          `"${r.check_in || '-'}"`,
          `"${r.check_out || '-'}"`,
          r.late_minutes || 0,
          `"${r.status || 'not_marked'}"`
        ];
        csv += row.join(',') + '\n';
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Full_Attendance_Report_${monthName}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handlePrint() {
    window.print();
  }

  const content = (
    <div style={{ padding: isEmbedded ? 0 : 20, width: '100%' }}>
      {/* Header Controls Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '12px 18px',
          borderRadius: 12,
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              backdropFilter: 'blur(4px)'
            }}
          >
            📋
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
              Full Staff Attendance Report
            </h2>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Single view formatted attendance matrix & monthly staff logs
            </span>
          </div>
        </div>

        {/* Compact Right-Aligned Controls Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Month Selector */}
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={{
              width: 125,
              minWidth: 125,
              flex: 'none',
              padding: '6px 10px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              background: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {monthsList.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{
              width: 85,
              minWidth: 85,
              flex: 'none',
              padding: '6px 10px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              background: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* View Toggle Segmented Control */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', padding: 3, borderRadius: 8, gap: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              style={{
                padding: '5px 11px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'matrix' ? '#0f766e' : 'transparent',
                color: '#ffffff',
                transition: 'all 0.15s ease'
              }}
            >
              📊 Matrix Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('log')}
              style={{
                padding: '5px 11px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'log' ? '#0f766e' : 'transparent',
                color: '#ffffff',
                transition: 'all 0.15s ease'
              }}
            >
              📜 Log View
            </button>
          </div>

          {/* CSV Export Button */}
          <button
            type="button"
            className="btn"
            onClick={exportCSV}
            style={{
              fontSize: 12,
              padding: '6px 12px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
            }}
          >
            📥 Export CSV
          </button>

          {/* Print Button */}
          <button
            type="button"
            className="btn"
            onClick={handlePrint}
            style={{
              fontSize: 12,
              padding: '6px 12px',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🖨️ Print
          </button>

          {!isEmbedded && onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                width: 28,
                height: 28,
                borderRadius: 6,
                fontSize: 16,
                cursor: 'pointer',
                marginLeft: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close modal"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
          marginBottom: 16
        }}
      >
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #0f766e', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Total Staff</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{reportData?.total_employees || 0}</div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Present Days</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>{reportData?.present_count || 0}</div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #d97706', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Half Days</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#d97706', marginTop: 2 }}>{reportData?.half_day_count || 0}</div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #dc2626', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Absent Days</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', marginTop: 2 }}>{reportData?.absent_count || 0}</div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #64748b', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Leaves</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#475569', marginTop: 2 }}>{reportData?.leave_count || 0}</div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #be123c', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Total Late</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#be123c', marginTop: 2 }}>{reportData?.total_late_minutes || 0}m</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <input
          type="text"
          placeholder="🔍 Search staff by name or role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 280, padding: '7px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff' }}
        />

        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, fontSize: 11, fontWeight: 700 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a' }}></span> Present (P)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706' }}></span> Half Day (HD)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626' }}></span> Absent (A)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#64748b' }}></span> Leave (L)
          </span>
        </div>
      </div>

      {/* Main Table Content Container */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          background: '#ffffff'
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
            ⏳ Loading full attendance report...
          </div>
        ) : viewMode === 'matrix' ? (
          /* MATRIX GRID VIEW (Staff x Days of Month) */
          <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
            <table style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  <th style={{ padding: '10px 4px', position: 'sticky', left: 0, zIndex: 3, background: '#0f172a', width: 40, minWidth: 40, maxWidth: 40, boxSizing: 'border-box' }}>#</th>
                  <th style={{ padding: '10px 10px', position: 'sticky', left: 40, zIndex: 3, background: '#0f172a', textAlign: 'left', width: 170, minWidth: 170, maxWidth: 170, boxSizing: 'border-box', boxShadow: '2px 0 5px rgba(0,0,0,0.15)' }}>
                    Staff Member
                  </th>
                  {daysArray.map(day => {
                    const dt = new Date(year, month - 1, day);
                    const dayOfWeek = dt.toLocaleDateString('en-US', { weekday: 'narrow' });
                    const isSunday = dt.getDay() === 0;
                    return (
                      <th
                        key={day}
                        style={{
                          padding: '6px 2px',
                          width: 34,
                          minWidth: 34,
                          maxWidth: 34,
                          boxSizing: 'border-box',
                          background: isSunday ? '#1e293b' : '#0f172a',
                          color: isSunday ? '#f87171' : '#f8fafc',
                          fontSize: 10
                        }}
                      >
                        <div>{day}</div>
                        <div style={{ fontSize: 9, opacity: 0.7 }}>{dayOfWeek}</div>
                      </th>
                    );
                  })}
                  <th style={{ padding: '10px 4px', background: '#064e3b', color: '#ecfdf5', width: 45, minWidth: 45 }}>P</th>
                  <th style={{ padding: '10px 4px', background: '#78350f', color: '#fef3c7', width: 45, minWidth: 45 }}>HD</th>
                  <th style={{ padding: '10px 4px', background: '#7f1d1d', color: '#fee2e2', width: 45, minWidth: 45 }}>A</th>
                  <th style={{ padding: '10px 4px', background: '#334155', color: '#f1f5f9', width: 45, minWidth: 45 }}>L</th>
                  <th style={{ padding: '10px 4px', background: '#881337', color: '#ffe4e6', width: 65, minWidth: 65 }}>Late (m)</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={daysInMonth + 7} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                      No staff members found matching search.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, idx) => {
                    const stats = empStats[emp.id] || { p: 0, hd: 0, a: 0, l: 0, lateMins: 0 };
                    const isEven = idx % 2 === 0;
                    const rowBg = isEven ? '#ffffff' : '#f8fafc';

                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0', background: rowBg }}>
                        {/* SL No Sticky */}
                        <td style={{ padding: '8px 4px', position: 'sticky', left: 0, background: rowBg, zIndex: 2, fontWeight: 700, color: '#64748b', width: 40, minWidth: 40, maxWidth: 40, boxSizing: 'border-box' }}>
                          {idx + 1}
                        </td>

                        {/* Employee Name Sticky */}
                        <td
                          style={{
                            padding: '8px 10px',
                            position: 'sticky',
                            left: 40,
                            background: rowBg,
                            zIndex: 2,
                            textAlign: 'left',
                            fontWeight: 700,
                            color: '#0f172a',
                            width: 170,
                            minWidth: 170,
                            maxWidth: 170,
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            boxShadow: '2px 0 5px rgba(0,0,0,0.08)'
                          }}
                        >
                          <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.role || 'Staff'}</div>
                        </td>

                        {/* Day Cells */}
                        {daysArray.map(day => {
                          const mStr = String(month).padStart(2, '0');
                          const dStr = String(day).padStart(2, '0');
                          const dateKey = `${year}-${mStr}-${dStr}`;
                          const rec = (attMap[emp.id] || {})[dateKey];
                          const dt = new Date(year, month - 1, day);
                          const isSunday = dt.getDay() === 0;

                          if (!rec) {
                            return (
                              <td key={day} style={{ padding: '4px 2px', width: 34, minWidth: 34, maxWidth: 34, boxSizing: 'border-box', background: isSunday ? '#f1f5f9' : 'transparent', color: '#cbd5e1' }}>
                                -
                              </td>
                            );
                          }

                          const st = (rec.status || '').toLowerCase();
                          const badge = STATUS_BADGES[st] || { code: 'P', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
                          const late = Number(rec.late_minutes) || 0;

                          return (
                            <td
                              key={day}
                              style={{ padding: '4px 2px', width: 34, minWidth: 34, maxWidth: 34, boxSizing: 'border-box', background: isSunday ? '#f8fafc' : 'transparent' }}
                              title={`${emp.name} (${dStr}/${mStr}): ${badge.label}${late > 0 ? ` - ${late}m late` : ''} | In: ${rec.check_in || '-'} Out: ${rec.check_out || '-'}`}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: 24,
                                  height: 24,
                                  lineHeight: '22px',
                                  borderRadius: 6,
                                  fontSize: 10,
                                  fontWeight: 800,
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`,
                                  textAlign: 'center'
                                }}
                              >
                                {badge.code}
                              </span>
                            </td>
                          );
                        })}

                        {/* Summary Columns */}
                        <td style={{ padding: '8px 4px', fontWeight: 800, color: '#16a34a', background: '#f0fdf4' }}>{stats.p}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 800, color: '#d97706', background: '#fffbeb' }}>{stats.hd}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 800, color: '#dc2626', background: '#fef2f2' }}>{stats.a}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 800, color: '#475569', background: '#f8fafc' }}>{stats.l}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 800, color: stats.lateMins > 0 ? '#be123c' : '#64748b', background: stats.lateMins > 0 ? '#ffe4e6' : 'transparent' }}>
                          {stats.lateMins}m
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* DETAILED LOG TABLE VIEW */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Staff Name</th>
                  <th style={{ padding: '10px 14px' }}>Shift Start</th>
                  <th style={{ padding: '10px 14px' }}>Check In</th>
                  <th style={{ padding: '10px 14px' }}>Check Out</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Late Mins</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                      No attendance records found for selected month.
                    </td>
                  </tr>
                ) : (
                  records.map((r, idx) => {
                    const st = (r.status || '').toLowerCase();
                    const badge = STATUS_BADGES[st] || { label: r.status, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: '⚪' };
                    return (
                      <tr key={r.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#334155' }}>
                          {formatDateDMY(r.date)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.employee_name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{r.employee_role || 'Staff'}</div>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f766e' }}>
                          {r.shift_start || '08:00'}
                        </td>
                        <td style={{ padding: '10px 14px', color: r.check_in ? '#15803d' : '#94a3b8', fontWeight: r.check_in ? 700 : 400 }}>
                          {r.check_in || '-'}
                        </td>
                        <td style={{ padding: '10px 14px', color: r.check_out ? '#b91c1c' : '#94a3b8', fontWeight: r.check_out ? 700 : 400 }}>
                          {r.check_out || '-'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {r.late_minutes > 0 ? (
                            <span style={{ background: '#ffe4e6', color: '#be123c', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                              ⚠️ {r.late_minutes}m
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 11 }}>0m</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            {badge.icon} {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999 }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: 1300,
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: 20,
          borderRadius: 16,
          background: '#f8fafc'
        }}
      >
        {content}
      </div>
    </div>,
    document.body
  );
}
