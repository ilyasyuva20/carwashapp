import { useEffect, useState } from 'react';
import { api } from '../api';

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Bills() {
  const [data, setData] = useState({
    summary: { total_cars: 0, total_bikes: 0, total_vehicles: 0, total_amount: 0, unpaid_amount: 0, paid_amount: 0 },
    jobs: []
  });
  const [segmentFilter, setSegmentFilter] = useState('all'); // all, car, bike
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, unpaid, paid
  const [datePreset, setDatePreset] = useState('today'); // today, week, month, all, custom
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [searchQuery, setSearchQuery] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [selectedReceiptJob, setSelectedReceiptJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settlingId, setSettlingId] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [editingAmount, setEditingAmount] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  // Workshop Assignment State
  const [workshops, setWorkshops] = useState([]);
  const [assigningWorkshopJob, setAssigningWorkshopJob] = useState(null);
  const [selectedCustType, setSelectedCustType] = useState('workshop');
  const [selectedWorkshopId, setSelectedWorkshopId] = useState('');
  const [savingWorkshop, setSavingWorkshop] = useState(false);

  useEffect(() => {
    api.get('/workshops').then(res => setWorkshops(res || [])).catch(console.error);
  }, []);

  function openWorkshopModal(job) {
    setAssigningWorkshopJob(job);
    const isW = job.customer_type === 'workshop';
    setSelectedCustType(isW ? 'workshop' : 'workshop');

    const is2W = job.vehicle?.segment === 'bike' || job.vehicle?.segment === 'scooter';
    const avail = (workshops || []).filter(w => is2W ? (w.type === 'Bike Workshop' || w.type === '2_wheeler' || (w.type || '').toLowerCase().includes('bike')) : (w.type === 'Car Workshop' || w.type === '4_wheeler' || (w.type || '').toLowerCase().includes('car')));

    setSelectedWorkshopId(job.workshop_id ? String(job.workshop_id) : (avail[0]?.id ? String(avail[0].id) : ''));
  }

  async function handleSaveWorkshopAssignment(e) {
    e.preventDefault();
    if (!assigningWorkshopJob) return;
    if (selectedCustType === 'workshop' && !selectedWorkshopId) {
      alert('Please select a workshop from the list');
      return;
    }

    setSavingWorkshop(true);
    try {
      await api.put(`/jobs/${assigningWorkshopJob.id}`, {
        customer_type: selectedCustType,
        workshop_id: selectedCustType === 'workshop' ? Number(selectedWorkshopId) : null
      });
      setAssigningWorkshopJob(null);
      loadData();
    } catch (err) {
      alert('Failed to update workshop assignment: ' + (err.message || 'Error'));
    } finally {
      setSavingWorkshop(false);
    }
  }

  async function handleSaveAdjustedAmount(jobId) {
    if (editingAmount === '' || isNaN(Number(editingAmount)) || Number(editingAmount) < 0) {
      alert('Please enter a valid amount');
      return;
    }
    setSavingPrice(true);
    try {
      await api.post('/bills/adjust-amount', { job_id: jobId, new_amount: editingAmount });
      setEditingJobId(null);
      loadData();
    } catch (e) {
      alert(e.message || 'Failed to update bill amount');
    } finally {
      setSavingPrice(false);
    }
  }

  // Handle Preset Date Switches
  function handlePresetChange(preset) {
    setDatePreset(preset);
    const todayStr = getTodayStr();
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const curr = new Date();
      const first = curr.getDate() - curr.getDay();
      const firstDay = new Date(curr.setDate(first)).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const curr = new Date();
      const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      let params = `?segment=${segmentFilter}&payment_status=${paymentFilter}`;
      if (startDate && endDate) {
        params += `&startDate=${startDate}&endDate=${endDate}`;
      } else if (startDate) {
        params += `&date=${startDate}`;
      }
      if (searchQuery.trim()) {
        params += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await api.get(`/bills${params}`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [segmentFilter, paymentFilter, startDate, endDate]);

  // Quick single job settlement
  async function settleJob(jobId, method) {
    setSettlingId(jobId);
    try {
      if (editingJobId === jobId && editingAmount !== '' && !isNaN(Number(editingAmount)) && Number(editingAmount) >= 0) {
        await api.post('/bills/adjust-amount', { job_id: jobId, new_amount: Number(editingAmount) });
        setEditingJobId(null);
      }
      await api.post('/bills/settle-job', { job_id: jobId, payment_method: method });
      await loadData();
    } catch (e) {
      alert(e.message || 'Failed to settle payment');
    } finally {
      setSettlingId(null);
    }
  }

  const jobsList = data.jobs || [];
  const summary = data.summary || { total_cars: 0, total_bikes: 0, total_vehicles: 0, total_amount: 0, unpaid_amount: 0, paid_amount: 0 };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* 🌀 Signature Full-Page Blur Loader Backdrop for Tab Switches & Loading */}
      {loading && (
        <div className="fullpage-loader-backdrop">
          <div className="loader-card">
            <div className="spinner-outer-ring">
              <span className="spinner-center-icon">🧾</span>
            </div>
            <h3 className="loader-title">Loading Bills...</h3>
            <p className="loader-subtitle">Fetching latest customer bills and payment records...</p>
            <div className="loader-progress-bar">
              <div className="loader-progress-fill" />
            </div>
          </div>
        </div>
      )}

      {/* 🌀 Payment Processing Loader */}
      {settlingId && (
        <div className="fullpage-loader-backdrop">
          <div className="loader-card">
            <div className="spinner-outer-ring">
              <span className="spinner-center-icon">💳</span>
            </div>
            <h3 className="loader-title">Processing Payment...</h3>
            <p className="loader-subtitle">Settling bill and recording transaction...</p>
            <div className="loader-progress-bar">
              <div className="loader-progress-fill" />
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="page-header flex between center" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' }}>🧾 Retail Customer Bills & Receipts</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Manage completed jobs, track unpaid & paid bills for normal retail car & bike customers.
          </p>
        </div>
        <div className="flex gap-8">
          <button
            className="btn btn-outline"
            onClick={() => loadData()}
            style={{ padding: '8px 14px', fontSize: 13 }}
          >
            🔄 Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowNew(true)}
            style={{ padding: '8px 16px', fontSize: 13, background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}
          >
            + Generate Bill
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Cars & Bikes Volume */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Daily Wash Volume
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#14532d', margin: '6px 0 2px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🚗 {summary.total_cars} <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Cars</span></span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>🏍️ {summary.total_bikes} <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Bikes</span></span>
          </div>
          <div style={{ fontSize: 12, color: '#166534', fontWeight: 500 }}>
            Total: <strong>{summary.total_vehicles}</strong> retail vehicles completed
          </div>
        </div>

        {/* Unpaid / Pending Balance */}
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending Payment
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#9f1239', margin: '4px 0 2px' }}>
            ₹{summary.unpaid_amount.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#be123c', fontWeight: 500 }}>
            Outstanding across retail customers
          </div>
        </div>

        {/* Paid Balance */}
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Settled / Paid Amount
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0369a1', margin: '4px 0 2px' }}>
            ₹{summary.paid_amount.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#0284c7', fontWeight: 500 }}>
            Cleared & paid balance
          </div>
        </div>
      </div>

      {/* Segment Filter Tabs (Cars vs Bikes vs All) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: `🚙 All Vehicles (${summary.total_vehicles})` },
          { id: 'car', label: `🚗 Cars Only (${summary.total_cars})` },
          { id: 'bike', label: `🏍️ Bikes & Scooters (${summary.total_bikes})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSegmentFilter(tab.id)}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: segmentFilter === tab.id ? '2px solid #0d9488' : '1px solid #cbd5e1',
              background: segmentFilter === tab.id ? '#0d9488' : '#ffffff',
              color: segmentFilter === tab.id ? '#ffffff' : '#334155',
              boxShadow: segmentFilter === tab.id ? '0 2px 5px rgba(13,148,136,0.3)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date & Filter Control Bar */}
      <div className="card mb-20" style={{ padding: 16, background: '#ffffff', borderRadius: 14 }}>
        {/* Row 1: Date Presets */}
        <div className="flex between center" style={{ flexWrap: 'wrap', gap: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 12, marginBottom: 12 }}>
          <div className="flex center gap-8" style={{ flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date Range:</span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: datePreset === p.id ? 700 : 500,
                  cursor: 'pointer',
                  border: datePreset === p.id ? '1px solid #0f766e' : '1px solid #e2e8f0',
                  background: datePreset === p.id ? '#e6f7f5' : '#ffffff',
                  color: datePreset === p.id ? '#0f766e' : '#475569'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Selector */}
          {datePreset === 'custom' && (
            <div className="flex center gap-8">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }}
              />
              <span className="muted" style={{ fontSize: 12 }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)' }}
              />
            </div>
          )}
        </div>

        {/* Row 2: Status Tabs & Search Box */}
        <div className="flex between center" style={{ flexWrap: 'wrap', gap: 12 }}>
          {/* Status Tabs */}
          <div className="status-tab-group" style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Bills' },
              { id: 'unpaid', label: datePreset === 'today' ? '⏳ Today Unpaid' : '⏳ Unpaid' },
              {
                id: 'other_pending',
                label: `⚠️ Other Pending${summary.other_pending_count != null ? ` (${summary.other_pending_count})` : ''}`
              },
              { id: 'paid', label: '✅ Paid' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`status-tab ${paymentFilter === tab.id ? 'active' : ''}`}
                onClick={() => setPaymentFilter(tab.id)}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  background: paymentFilter === tab.id && tab.id === 'other_pending' ? '#fff7ed' : undefined,
                  color: paymentFilter === tab.id && tab.id === 'other_pending' ? '#c2410c' : undefined,
                  borderColor: paymentFilter === tab.id && tab.id === 'other_pending' ? '#fdba74' : undefined
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: 260 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search reg # or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadData()}
              style={{
                padding: '7px 12px 7px 32px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: 13,
                width: '100%',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Completed Normal Customer Jobs Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <p className="muted" style={{ padding: 30, textAlign: 'center', margin: 0 }}>Loading retail bills...</p>
        ) : jobsList.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {paymentFilter === 'other_pending' ? '🎉' : '🧾'}
            </div>
            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b', fontSize: 15 }}>
              {paymentFilter === 'other_pending' ? 'No pending bills from previous days' : 'No completed customer bills found'}
            </p>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              {paymentFilter === 'other_pending'
                ? 'All previous customer bills are cleared and settled!'
                : 'Completed jobs for retail customers will appear here automatically.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 10px', width: 50, textAlign: 'center' }}>SL NO</th>
                <th style={{ padding: '12px 14px' }}>VEHICLE NUMBER</th>
                <th style={{ padding: '12px 14px' }}>CONTACT</th>
                <th style={{ padding: '12px 14px' }}>WASH TYPE & ADDONS</th>
                <th style={{ padding: '12px 14px' }}>COMPLETED DATE</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>TOTAL BILL</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>PAYMENT STATUS</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: 210 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {jobsList.map((job, idx) => {
                const isBike = job.vehicle?.segment === 'bike';
                const isScooter = job.vehicle?.segment === 'scooter';
                const isCar = !isBike && !isScooter;
                const isPaid = job.payment_status === 'settled' || (job.bill && job.bill.status === 'paid');
                const completedDateVal = job.exit_time || job.completed_at;
                const completedDateStr = completedDateVal
                  ? new Date(completedDateVal).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                  : (job.entry_time ? new Date(job.entry_time).toLocaleDateString('en-IN') : '-');

                return (
                  <tr key={job.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s ease' }}>
                    {/* SL NO */}
                    <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                      {idx + 1}
                    </td>

                    {/* VEHICLE NUMBER & DETAILS */}
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex center gap-6" style={{ flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 14, color: '#0f172a', fontWeight: 700 }}>
                          {job.vehicle?.reg_number}
                        </strong>
                        {isBike && <span className="pill pill-purple" style={{ fontSize: 10, padding: '1px 6px' }}>🏍️ Bike</span>}
                        {isScooter && <span className="pill pill-amber" style={{ fontSize: 10, padding: '1px 6px' }}>🛵 Scooter</span>}
                        {isCar && <span className="pill pill-teal" style={{ fontSize: 10, padding: '1px 6px' }}>🚗 Car</span>}
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {job.vehicle?.brand || 'Vehicle'} {job.vehicle?.model || ''}
                      </div>

                      <div style={{ marginTop: 4 }}>
                        {job.customer_type === 'workshop' ? (
                          <button
                            type="button"
                            onClick={() => openWorkshopModal(job)}
                            style={{
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              borderRadius: 6,
                              padding: '2px 6px',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}
                            title="Click to edit or change assigned workshop"
                          >
                            🏭 Workshop: <strong>{job.workshop?.name || 'Assigned Workshop'}</strong> ✏️
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openWorkshopModal(job)}
                            style={{
                              background: '#f0fdfa',
                              color: '#0f766e',
                              border: '1px solid #ccfbf1',
                              borderRadius: 6,
                              padding: '2px 6px',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}
                            title="Assign this vehicle to a workshop"
                          >
                            ➕ Assign Workshop
                          </button>
                        )}
                      </div>
                    </td>

                    {/* CONTACT NUMBER */}
                    <td style={{ padding: '12px 14px' }}>
                      {job.vehicle?.phone ? (
                        <a
                          href={`tel:${job.vehicle.phone}`}
                          style={{ fontSize: 13, fontWeight: 600, color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <span>📞</span> {job.vehicle.phone}
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>-</span>
                      )}
                    </td>

                    {/* WASH TYPE & ADDONS */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                        {job.wash_type?.name || 'Wash Service'}
                      </div>
                      {job.has_chain_lube ? (
                        <span className="pill pill-purple" style={{ fontSize: 10, marginTop: 3 }}>
                          ⚡ Chain Lube (+₹{job.chain_lube_price})
                        </span>
                      ) : null}
                    </td>

                    {/* COMPLETED DATE */}
                    <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#475569' }}>
                      {completedDateStr}
                    </td>

                    {/* TOTAL BILL */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {!isPaid && editingJobId === job.id ? (
                        <div className="flex center gap-4" style={{ justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>₹</span>
                          <input
                            type="number"
                            value={editingAmount}
                            onChange={e => setEditingAmount(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveAdjustedAmount(job.id);
                              if (e.key === 'Escape') setEditingJobId(null);
                            }}
                            autoFocus
                            style={{
                              width: 75,
                              padding: '2px 6px',
                              fontSize: 13,
                              fontWeight: 700,
                              borderRadius: 6,
                              border: '1px solid #0d9488',
                              textAlign: 'right'
                            }}
                          />
                          <button
                            onClick={() => handleSaveAdjustedAmount(job.id)}
                            disabled={savingPrice}
                            style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
                            title="Save Amount"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingJobId(null)}
                            style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: 4, padding: '3px 6px', fontSize: 12, cursor: 'pointer' }}
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                            ₹{job.price}
                          </span>
                          {!isPaid && (
                            <button
                              onClick={() => {
                                setEditingJobId(job.id);
                                setEditingAmount(job.price);
                              }}
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: 6,
                                padding: '2px 6px',
                                fontSize: 11,
                                cursor: 'pointer',
                                color: '#0f766e',
                                fontWeight: 600
                              }}
                              title="Edit/Adjust Bill Amount"
                            >
                              ✏️ Edit
                            </button>
                          )}
                        </div>
                      )}
                      {job.bill?.discount_amount > 0 && (
                        <div style={{ fontSize: 10.5, color: '#059669', fontWeight: 600 }}>
                          Reward Disc: -₹{job.bill.discount_amount}
                        </div>
                      )}
                    </td>

                    {/* PAYMENT STATUS */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span className={`pill ${isPaid ? 'pill-green' : 'pill-amber'}`} style={{ padding: '4px 10px', fontSize: 11.5 }}>
                        {isPaid ? `✅ Paid (${job.bill?.payment_method?.toUpperCase() || 'CASH'})` : '⏳ Unpaid'}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div className="flex center gap-6" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                        {!isPaid ? (
                          <>
                            <button
                              className="btn-settle-pay"
                              onClick={() => settleJob(job.id, 'cash')}
                              title="Mark as Paid via Cash"
                            >
                              💵 Cash
                            </button>
                            <button
                              className="btn-settle-pay"
                              style={{ background: '#f0f9ff', color: '#0369a1', borderColor: '#bae6fd' }}
                              onClick={() => settleJob(job.id, 'gpay')}
                              title="Mark as Paid via GPay"
                            >
                              📱 GPay
                            </button>
                          </>
                        ) : null}

                        {/* Print Receipt Button */}
                        <button
                          className="btn btn-outline"
                          onClick={() => setSelectedReceiptJob(job)}
                          style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 6, fontWeight: 600, borderColor: '#cbd5e1' }}
                          title="View & Print Ticket Receipt"
                        >
                          🖨️ Receipt
                        </button>

                        {/* WhatsApp Receipt Button */}
                        <button
                          className="btn"
                          onClick={() => sendWhatsAppReceipt(job)}
                          style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 6, fontWeight: 600, background: '#25D366', color: '#ffffff', border: 'none' }}
                          title="Send Receipt & PDF Attachment via WhatsApp"
                        >
                          💬 WhatsApp
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

      {/* Generate Bill Modal */}
      {showNew && (
        <GenerateBillModal
          onClose={() => setShowNew(false)}
          onDone={() => {
            setShowNew(false);
            loadData();
          }}
        />
      )}

      {/* 🏭 ASSIGN WORKSHOP MODAL */}
      {assigningWorkshopJob && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: 22, borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🏭 Assign Workshop Vehicle</h3>
              <button
                type="button"
                onClick={() => setAssigningWorkshopJob(null)}
                style={{ background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 14, border: '1px solid #e2e8f0', fontSize: 13 }}>
              <div>Vehicle Reg #: <strong style={{ fontSize: 15, color: '#0f172a' }}>{assigningWorkshopJob.vehicle?.reg_number || assigningWorkshopJob.reg_number}</strong></div>
              <div style={{ color: '#0d9488', fontSize: 12, marginTop: 2, fontWeight: 600 }}>
                Segment: {assigningWorkshopJob.vehicle?.segment === 'bike' || assigningWorkshopJob.vehicle?.segment === 'scooter' ? '🏍️ 2-Wheeler (Bike / Scooter)' : '🚗 4-Wheeler (Car / SUV / Sedan)'}
              </div>
            </div>

            <form onSubmit={handleSaveWorkshopAssignment}>
              <div className="field mb-14">
                <label style={{ fontSize: 13, fontWeight: 600 }}>Customer Type</label>
                <div className="flex gap-8 mt-4">
                  <button
                    type="button"
                    className={`btn ${selectedCustType === 'workshop' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: 8, fontSize: 12 }}
                    onClick={() => setSelectedCustType('workshop')}
                  >
                    🏭 Workshop Vehicle
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedCustType === 'normal' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: 8, fontSize: 12 }}
                    onClick={() => setSelectedCustType('normal')}
                  >
                    👤 Retail Customer
                  </button>
                </div>
              </div>

              {selectedCustType === 'workshop' && (
                <div className="field mb-14">
                  <label style={{ fontSize: 13, fontWeight: 600 }}>
                    Select {(assigningWorkshopJob.vehicle?.segment === 'bike' || assigningWorkshopJob.vehicle?.segment === 'scooter') ? '2-Wheeler Workshop 🏍️' : '4-Wheeler Workshop 🚗'} *
                  </label>
                  {(() => {
                    const is2W = assigningWorkshopJob.vehicle?.segment === 'bike' || assigningWorkshopJob.vehicle?.segment === 'scooter';
                    const avail = (workshops || []).filter(w => is2W ? (w.type === 'Bike Workshop' || w.type === '2_wheeler' || (w.type || '').toLowerCase().includes('bike')) : (w.type === 'Car Workshop' || w.type === '4_wheeler' || (w.type || '').toLowerCase().includes('car')));

                    return (
                      <>
                        <select
                          required
                          value={selectedWorkshopId}
                          onChange={e => setSelectedWorkshopId(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                        >
                          <option value="">-- Select Workshop --</option>
                          {avail.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.type}) {w.phone ? `· 📞 ${w.phone}` : ''}
                            </option>
                          ))}
                        </select>
                        {avail.length === 0 && (
                          <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                            ⚠️ No {is2W ? '2-wheeler (Bike)' : '4-wheeler (Car)'} workshops registered yet. Please add one in Workshop Management.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
                💡 Assigning a workshop automatically updates the bill amount based on workshop pricing for this vehicle segment.
              </p>

              <div className="flex gap-8 justify-end">
                <button type="button" className="btn btn-outline" onClick={() => setAssigningWorkshopJob(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingWorkshop}>
                  {savingWorkshop ? 'Saving...' : 'Save & Update Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function GenerateBillModal({ onClose, onDone }) {
  const [regNumber, setRegNumber] = useState('');
  const [preview, setPreview] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [redeem, setRedeem] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function find() {
    setError('');
    setPreview(null);
    try {
      const jobs = await api.get('/jobs?status=completed');
      const job = jobs.find(j => j.vehicle.reg_number === regNumber.trim().toUpperCase() && !j.bill);
      if (!job) {
        setError('No completed, unbilled job found for that registration number');
        return;
      }
      const p = await api.get(`/bills/preview/${job.id}`);
      setPreview(p);
    } catch (e) {
      setError(e.message);
    }
  }

  async function pay() {
    setLoading(true);
    setError('');
    try {
      await api.post('/bills', { job_id: preview.job_id, payment_method: paymentMethod, redeem });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 440 }}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Generate Retail Bill</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
        </div>

        <div className="field">
          <label>Registration Number</label>
          <div className="flex gap-8">
            <input
              value={regNumber}
              onChange={e => setRegNumber(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && find()}
              placeholder="e.g. KL32R4034"
              autoFocus
            />
            <button className="btn btn-secondary" onClick={find}>Find Job</button>
          </div>
        </div>

        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}

        {preview && (
          <>
            <div className="card mt-8" style={{ background: '#f8fafc', padding: 14 }}>
              <div className="flex between" style={{ fontSize: 13, marginBottom: 4 }}>
                <span className="muted">Wash Type</span>
                <strong>{preview.wash_type}</strong>
              </div>
              <div className="flex between" style={{ fontSize: 13, marginBottom: 4 }}>
                <span className="muted">Base Amount</span>
                <strong>₹{preview.amount}</strong>
              </div>
              {preview.customer && (
                <div className="flex between" style={{ fontSize: 13 }}>
                  <span className="muted">Reward Points Available</span>
                  <span className="pill pill-teal" style={{ fontSize: 11 }}>{preview.customer.reward_points} pts</span>
                </div>
              )}
            </div>

            {preview.can_redeem && (
              <label className="flex gap-8 center mt-8" style={{ fontSize: 13, cursor: 'pointer', color: '#0f766e', fontWeight: 600 }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={redeem} onChange={e => setRedeem(e.target.checked)} />
                Redeem 100 points for {preview.redeem_discount_pct}% off discount
              </label>
            )}

            <div className="field mt-16">
              <label>Payment Method</label>
              <div className="flex gap-8">
                <button
                  type="button"
                  className={'btn ' + (paymentMethod === 'cash' ? 'btn-primary' : 'btn-outline')}
                  style={{ flex: 1, padding: 8 }}
                  onClick={() => setPaymentMethod('cash')}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  className={'btn ' + (paymentMethod === 'gpay' ? 'btn-primary' : 'btn-outline')}
                  style={{ flex: 1, padding: 8 }}
                  onClick={() => setPaymentMethod('gpay')}
                >
                  📱 GPay
                </button>
              </div>
            </div>

            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: 12, borderRadius: 8, marginTop: 12 }}>
              <div className="flex between center">
                <span style={{ fontSize: 13, fontWeight: 600, color: '#047857' }}>Total Payable:</span>
                <strong style={{ fontSize: 20, color: '#047857' }}>
                  ₹{redeem ? Math.max(0, Math.round(preview.amount * 0.5)) : preview.amount}
                </strong>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-8 mt-16">
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={pay} disabled={!preview || loading} style={{ flex: 1 }}>
            {loading ? 'Processing...' : 'Confirm & Pay'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getPdfUrl(jobId) {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const cleanBase = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    return `${cleanBase}/bills/pdf/${jobId}`;
  }
  return `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/api/bills/pdf/${jobId}`;
}

async function shareOnWhatsapp(job) {
  let rawPhone = job.vehicle?.phone || '';
  if (!rawPhone) {
    rawPhone = prompt('Enter customer WhatsApp number:');
    if (!rawPhone) return;
  }
  let cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  const pdfUrl = getPdfUrl(job.id);
  const fileName = `Receipt_${job.vehicle?.reg_number || job.id}.pdf`;

  // Native File Share API (Mobile/Web Share supported browsers)
  try {
    const response = await fetch(pdfUrl);
    if (response.ok) {
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Receipt ${job.vehicle?.reg_number || ''}`,
          text: `Bill Receipt PDF for ${job.vehicle?.reg_number || ''}`
        });
        return;
      }
    }
  } catch (err) {
    console.log('Web share unsupported or cancelled:', err);
  }

  // Desktop fallback: Download PDF file & open WhatsApp chat with direct PDF link
  const link = document.createElement('a');
  link.href = pdfUrl;
  link.download = fileName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  const message = `📄 *PDF RECEIPT (${job.vehicle?.reg_number || 'Perfecto Wash'})*\n\nView / Download PDF Receipt:\n${pdfUrl}`;
  const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

function downloadPdfReceipt(job) {
  const pdfUrl = getPdfUrl(job.id);
  window.open(pdfUrl, '_blank');
}

function PrintReceiptModal({ job, onClose }) {
  const isPaid = job.payment_status === 'settled' || (job.bill && job.bill.status === 'paid');
  const payMethod = (job.bill?.payment_method || 'CASH').toUpperCase();
  const completedVal = job.exit_time || job.completed_at || job.entry_time;
  const d = completedVal ? new Date(completedVal) : new Date();
  const dateOnlyStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeOnlyStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 480, padding: 24 }}>
        {/* Action Header */}
        <div className="flex between center" style={{ marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>🧾 Bill Receipt & WhatsApp Share</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>

        {/* Printable Ticket Receipt Box */}
        <div
          id="printable-receipt"
          style={{
            background: '#ffffff',
            border: '2px dashed #cbd5e1',
            borderRadius: 12,
            padding: 20,
            fontFamily: 'monospace, sans-serif'
          }}
        >
          {/* Shop Header */}
          <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: '#0f766e', fontWeight: 800 }}>PERFECTO WASH</h2>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>THE PERFECT CARWASH CENTE</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Kunneparambu Rd, Vazhakkala, Kakkanad ·</div>
            <div style={{ fontSize: 11, color: '#64748b' }}> 📞 +91 9992225924 •  www.perfectowash.in</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 6, letterSpacing: '0.05em' }}>
              --- CASH RECEIPT ---
            </div>
          </div>

          {/* Bill Meta */}
          <div style={{
            fontSize: 12,
            display: 'grid',
            gridTemplateColumns: '130px 15px 1fr',
            rowGap: 5,
            marginBottom: 12,
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: 10
          }}>
            <span style={{ color: '#64748b' }}>Receipt</span>
            <span style={{ color: '#64748b', textAlign: 'center' }}>:</span>
            <span style={{ textAlign: 'right' }}><strong>#REC-{job.id}</strong></span>

            <span style={{ color: '#64748b' }}>Date</span>
            <span style={{ color: '#64748b', textAlign: 'center' }}>:</span>
            <span style={{ textAlign: 'right' }}>{dateOnlyStr}</span>

            <span style={{ color: '#64748b' }}>Time</span>
            <span style={{ color: '#64748b', textAlign: 'center' }}>:</span>
            <span style={{ textAlign: 'right' }}>{timeOnlyStr}</span>

            <span style={{ color: '#64748b' }}>Reg Number</span>
            <span style={{ color: '#64748b', textAlign: 'center' }}>:</span>
            <span style={{ textAlign: 'right' }}><strong style={{ fontSize: 13, color: '#0f172a' }}>{job.vehicle?.reg_number}</strong></span>

            <span style={{ color: '#64748b' }}>Brand</span>
            <span style={{ color: '#64748b', textAlign: 'center' }}>:</span>
            <span style={{ textAlign: 'right' }}>{job.vehicle?.brand || '-'}</span>

            <span style={{ color: '#64748b' }}>Model</span>
            <span style={{ color: '#64748b', textAlign: 'center' }}>:</span>
            <span style={{ textAlign: 'right' }}>{job.vehicle?.model || '-'}</span>

            <span style={{ color: '#64748b' }}>Color</span>
            <span style={{ color: '#64748b', textAlign: 'center' }}>:</span>
            <span style={{ textAlign: 'right' }}>{job.vehicle?.color || '-'}</span>

            {job.vehicle?.phone && (
              <>
                <span style={{ color: '#64748b' }}>Customer Phone</span>
                <span style={{ color: '#64748b', textAlign: 'center' }}>:</span>
                <span style={{ textAlign: 'right' }}>{job.vehicle.phone}</span>
              </>
            )}
          </div>

          {/* Itemized Table */}
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 10 }}>
            <div className="flex between" style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
              <span>Item / Description</span>
              <span>Amount</span>
            </div>
            <div className="flex between" style={{ fontSize: 13, marginBottom: 4 }}>
              <span>{job.wash_type?.name || 'Wash Service'}</span>
              <span>₹{job.wash_price || job.price}</span>
            </div>
            {job.has_chain_lube ? (
              <div className="flex between" style={{ fontSize: 12, color: '#6b21a8', marginBottom: 4 }}>
                <span>+ Chain Lube Spray</span>
                <span>₹{job.chain_lube_price}</span>
              </div>
            ) : null}
            {job.bill?.discount_amount > 0 ? (
              <div className="flex between" style={{ fontSize: 12, color: '#059669', marginBottom: 4 }}>
                <span>- Reward Discount</span>
                <span>-₹{job.bill.discount_amount}</span>
              </div>
            ) : null}
          </div>

          {/* Total & Payment Method */}
          <div className="flex between center" style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
            <span>NET PAID AMOUNT:</span>
            <span style={{ fontSize: 20, color: '#0f766e' }}>₹{job.price}</span>
          </div>

          {/* Paid Stamp */}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <span style={{
              display: 'inline-block',
              border: isPaid ? '2px solid #059669' : '2px solid #d97706',
              color: isPaid ? '#059669' : '#d97706',
              padding: '3px 14px',
              borderRadius: 6,
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '0.1em'
            }}>
              {isPaid ? `PAID VIA ${payMethod}` : 'PAYMENT PENDING'}
            </span>
          </div>

          <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 14 }}>
            Thank you for choosing Perfecto Wash! Drive Safe!
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex gap-6 mt-16" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1, minWidth: 80 }}>
            Close
          </button>
          <button
            className="btn"
            onClick={() => sendWhatsAppReceipt(job)}
            style={{ flex: 1.2, minWidth: 120, background: '#25D366', color: '#ffffff', fontWeight: 700 }}
            title="Send formatted bill & PDF link via WhatsApp"
          >
            💬 WhatsApp
          </button>
          <button
            className="btn"
            onClick={() => downloadPdfReceipt(job)}
            style={{ flex: 1.2, minWidth: 110, background: '#0284c7', color: '#ffffff', fontWeight: 700 }}
            title="Open/Download official A6 PDF receipt"
          >
            📄 PDF
          </button>
          <button
            className="btn btn-primary"
            onClick={() => window.print()}
            style={{ flex: 1.2, minWidth: 110, background: '#0f766e', fontWeight: 700 }}
            title="Print receipt on thermal printer"
          >
            🖨️ Print
          </button>
        </div>
      </div>
    </div>
  );
}
