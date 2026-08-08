import { useEffect, useState } from 'react';
import { api } from '../api';

export default function WorkshopBills() {
  const [data, setData] = useState({
    summary: { total_cars: 0, total_bikes: 0, total_vehicles: 0, total_amount: 0, unpaid_amount: 0, paid_amount: 0 },
    workshops: [],
    unassigned_jobs: []
  });
  const [typeFilter, setTypeFilter] = useState('all'); // all, Car Workshop, Bike Workshop
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, unsettled, settled
  const [datePreset, setDatePreset] = useState('today'); // today, week, month, all, custom
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkshop, setSelectedWorkshop] = useState(null); // for settlement modal
  const [loading, setLoading] = useState(false);

  // Handle Preset Date Switches
  function handlePresetChange(preset) {
    setDatePreset(preset);
    const todayStr = new Date().toISOString().slice(0, 10);
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
      let params = `?type=${typeFilter}&payment_status=${paymentFilter}`;
      if (startDate && endDate) {
        params += `&startDate=${startDate}&endDate=${endDate}`;
      }
      if (searchQuery.trim()) {
        params += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await api.get(`/bills/workshop-summary${params}`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [typeFilter, paymentFilter, startDate, endDate]);

  // Quick single job settlement
  async function settleSingleJob(jobId, method) {
    try {
      await api.post('/bills/settle-job', { job_id: jobId, payment_method: method });
      loadData();
    } catch (e) {
      alert(e.message || 'Failed to settle job');
    }
  }

  const workshopsList = data.workshops || [];
  const overallSummary = data.summary || { total_cars: 0, total_bikes: 0, total_vehicles: 0, total_amount: 0, unpaid_amount: 0, paid_amount: 0 };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="page-header flex between center" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' }}>🏭 Workshop Bills & Settlement</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Track daily car & bike volumes, outstanding balances, and settlement payments per workshop.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => loadData()}
          style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Cars & Bikes Volume */}
        <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 16, borderRadius: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Daily Wash Volume
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
            {(typeFilter === 'all' || typeFilter === 'Car Workshop') && (
              <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>
                🚗 {overallSummary.total_cars} <span style={{ fontSize: 13, fontWeight: 500, color: '#166534' }}>Cars</span>
              </div>
            )}
            {(typeFilter === 'all' || typeFilter === 'Bike Workshop') && (
              <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>
                🏍️ {overallSummary.total_bikes} <span style={{ fontSize: 13, fontWeight: 500, color: '#6d28d9' }}>Bikes</span>
              </div>
            )}
          </div>
          <span style={{ fontSize: 12, color: '#15803d', display: 'block', marginTop: 4 }}>
            Total: <strong>{typeFilter === 'Car Workshop' ? overallSummary.total_cars : typeFilter === 'Bike Workshop' ? overallSummary.total_bikes : overallSummary.total_vehicles} {typeFilter === 'Car Workshop' ? 'cars' : typeFilter === 'Bike Workshop' ? 'bikes' : 'vehicles'}</strong> washed
          </span>
        </div>

        {/* Unpaid / Pending Balance */}
        <div className="card" style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: 16, borderRadius: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pending Settlement
          </span>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#e11d48', marginTop: 4 }}>
            ₹{overallSummary.unpaid_amount.toLocaleString()}
          </div>
          <span style={{ fontSize: 12, color: '#be123c', display: 'block', marginTop: 4 }}>
            Outstanding across workshops
          </span>
        </div>

        {/* Settled / Paid Amount */}
        <div className="card" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: 16, borderRadius: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Settled Amount
          </span>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
            ₹{overallSummary.paid_amount.toLocaleString()}
          </div>
          <span style={{ fontSize: 12, color: '#0369a1', display: 'block', marginTop: 4 }}>
            Cleared & paid balance
          </span>
        </div>
      </div>

      {/* Workshop Category Tabs (All / Car Workshops / Bike Workshops) */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          className={'btn ' + (typeFilter === 'all' ? 'btn-primary' : 'btn-outline')}
          onClick={() => setTypeFilter('all')}
          style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8 }}
        >
          🏬 All Workshops ({workshopsList.length})
        </button>
        <button
          className={'btn ' + (typeFilter === 'Car Workshop' ? 'btn-primary' : 'btn-outline')}
          onClick={() => setTypeFilter('Car Workshop')}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            borderColor: typeFilter === 'Car Workshop' ? '#0284c7' : '#cbd5e1',
            background: typeFilter === 'Car Workshop' ? '#0284c7' : '#fff',
            color: typeFilter === 'Car Workshop' ? '#fff' : '#475569'
          }}
        >
          🚗 Car Workshops Only
        </button>
        <button
          className={'btn ' + (typeFilter === 'Bike Workshop' ? 'btn-primary' : 'btn-outline')}
          onClick={() => setTypeFilter('Bike Workshop')}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            borderColor: typeFilter === 'Bike Workshop' ? '#8b5cf6' : '#cbd5e1',
            background: typeFilter === 'Bike Workshop' ? '#8b5cf6' : '#fff',
            color: typeFilter === 'Bike Workshop' ? '#fff' : '#475569'
          }}
        >
          🏍️ Bike Workshops Only
        </button>
      </div>

      {/* Filter Toolbar (Date Presets, Custom Range, Payment Status, Search) */}
      <div className="card" style={{ padding: 16, marginBottom: 20, background: '#f8fafc', borderRadius: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Quick Date Presets */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Date Range:</span>
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
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: '1px solid',
                  borderColor: datePreset === p.id ? 'var(--primary)' : '#cbd5e1',
                  background: datePreset === p.id ? 'var(--primary)' : '#fff',
                  color: datePreset === p.id ? '#fff' : '#475569',
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Picker (if custom) */}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ fontSize: 13, padding: '4px 8px' }}
              />
              <span style={{ fontSize: 12, color: '#64748b' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ fontSize: 13, padding: '4px 8px' }}
              />
            </div>
          )}

          {/* Payment Status Dropdown */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Payment Status:</span>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              style={{ fontSize: 13, padding: '6px 10px', fontWeight: 500 }}
            >
              <option value="all">All Statuses</option>
              <option value="unsettled">⏳ Pending Settlement</option>
              <option value="settled">✅ Paid / Settled</option>
            </select>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: 200 }}>
            <input
              type="text"
              placeholder="Search workshop / reg no..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadData()}
              style={{ fontSize: 13, padding: '6px 10px', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Workshop Cards & Job Lists */}
      {loading ? (
        <p className="muted" style={{ padding: 20, textAlign: 'center' }}>Loading workshop data...</p>
      ) : workshopsList.length === 0 ? (
        <div className="card text-center" style={{ padding: 40 }}>
          <p className="muted">No workshops found matching the selected category or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {workshopsList.map(w => {
            const hasUnpaid = w.unpaid_amount > 0;
            const unpaidJobs = w.jobs.filter(j => j.payment_status !== 'settled');

            return (
              <div
                key={w.id}
                className="card"
                style={{
                  borderLeft: `5px solid ${w.type === 'Car Workshop' ? '#0284c7' : '#8b5cf6'}`,
                  borderRadius: 12,
                  padding: 20
                }}
              >
                {/* Workshop Header */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{w.name}</h2>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 20,
                          background: w.type === 'Car Workshop' ? '#e0f2fe' : '#f3e8ff',
                          color: w.type === 'Car Workshop' ? '#0369a1' : '#6b21a8'
                        }}
                      >
                        {w.type === 'Car Workshop' ? '🚗 Car Workshop' : '🏍️ Bike Workshop'}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', gap: 16 }}>
                      {w.owner_name && <span>👤 Owner: <strong>{w.owner_name}</strong> {w.owner_phone ? `(${w.owner_phone})` : ''}</span>}
                      {w.phone && <span>📞 Workshop Phone: <strong>{w.phone}</strong></span>}
                    </div>
                  </div>

                  {/* Volume & Revenue Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Volume</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>
                        {typeFilter === 'Car Workshop' || (w.type === 'Car Workshop' && typeFilter !== 'Bike Workshop') ? (
                          <>🚗 {w.cars_count} Cars</>
                        ) : typeFilter === 'Bike Workshop' || (w.type === 'Bike Workshop' && typeFilter !== 'Car Workshop') ? (
                          <>🏍️ {w.bikes_count} Bikes</>
                        ) : (
                          <>🚗 {w.cars_count} Cars · 🏍️ {w.bikes_count} Bikes</>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Pending Settlement</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: hasUnpaid ? '#e11d48' : '#10b981' }}>
                        ₹{w.unpaid_amount.toLocaleString()}
                      </div>
                    </div>

                    {hasUnpaid && (
                      <button
                        className="btn btn-primary"
                        onClick={() => setSelectedWorkshop(w)}
                        style={{
                          background: '#0d9488',
                          borderColor: '#0f766e',
                          padding: '8px 16px',
                          fontSize: 13,
                          fontWeight: 700,
                          borderRadius: 8
                        }}
                      >
                        💳 Settle Outstanding ({unpaidJobs.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Job / Vehicle List */}
                <div style={{ marginTop: 14 }}>
                  {w.jobs.filter(j => {
                    const isBikeOrScooter = j.vehicle?.segment === 'bike' || j.vehicle?.segment === 'scooter';
                    if (typeFilter === 'Car Workshop' && isBikeOrScooter) return false;
                    if (typeFilter === 'Bike Workshop' && !isBikeOrScooter) return false;
                    return true;
                  }).length === 0 ? (
                    <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', margin: '6px 0' }}>
                      No vehicle jobs recorded for this workshop in selected date range.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {w.jobs
                        .filter(j => {
                          const isBikeOrScooter = j.vehicle?.segment === 'bike' || j.vehicle?.segment === 'scooter';
                          if (typeFilter === 'Car Workshop' && isBikeOrScooter) return false;
                          if (typeFilter === 'Bike Workshop' && !isBikeOrScooter) return false;
                          return true;
                        })
                        .map(j => {
                        const isSettled = j.payment_status === 'settled';
                        const isBikeOrScooter = j.vehicle?.segment === 'bike' || j.vehicle?.segment === 'scooter';

                        return (
                          <div
                            key={j.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: isSettled ? '#f8fafc' : '#fffbeb',
                              padding: '10px 14px',
                              borderRadius: 8,
                              border: `1px solid ${isSettled ? '#e2e8f0' : '#fde68a'}`
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontSize: 18 }}>{isBikeOrScooter ? '🏍️' : '🚗'}</span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                                  {j.vehicle?.reg_number}
                                  <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginLeft: 8 }}>
                                    ({j.vehicle?.brand || ''} {j.vehicle?.model || ''})
                                  </span>
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                  {j.wash_type?.name} {j.has_chain_lube ? '+ Chain Lube' : ''} · {j.entry_time ? j.entry_time.slice(0, 16).replace('T', ' ') : ''}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <strong style={{ fontSize: 15, color: '#0f172a' }}>₹{j.price}</strong>

                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  padding: '4px 10px',
                                  borderRadius: 12,
                                  background: isSettled ? '#dcfce7' : '#fef3c7',
                                  color: isSettled ? '#15803d' : '#b45309'
                                }}
                              >
                                {isSettled ? `✅ Paid (${(j.bill?.payment_method || 'cash').toUpperCase()})` : '⏳ Pending'}
                              </span>

                              {!isSettled && (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    className="btn btn-outline"
                                    onClick={() => settleSingleJob(j.id, 'cash')}
                                    style={{ padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#15803d', borderColor: '#86efac' }}
                                    title="Settle with Cash"
                                  >
                                    💵 Cash
                                  </button>
                                  <button
                                    className="btn btn-outline"
                                    onClick={() => settleSingleJob(j.id, 'gpay')}
                                    style={{ padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#0369a1', borderColor: '#7dd3fc' }}
                                    title="Settle with GPay / UPI"
                                  >
                                    📱 GPay
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Workshop Bulk Settlement Modal */}
      {selectedWorkshop && (
        <SettlementModal
          workshop={selectedWorkshop}
          onClose={() => setSelectedWorkshop(null)}
          onDone={() => {
            setSelectedWorkshop(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Settlement Modal Component
function SettlementModal({ workshop, onClose, onDone }) {
  const unpaidJobs = workshop.jobs.filter(j => j.payment_status !== 'settled');
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' or 'gpay'
  const [settlementType, setSettlementType] = useState('bulk'); // 'bulk' or 'itemized'
  const [itemizedMethods, setItemizedMethods] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalAmount = unpaidJobs.reduce((sum, j) => sum + (j.price || 0), 0);

  useEffect(() => {
    // Initialize itemized modes
    const initial = {};
    unpaidJobs.forEach(j => {
      initial[j.id] = 'cash';
    });
    setItemizedMethods(initial);
  }, [workshop]);

  function setJobMethod(jobId, method) {
    setItemizedMethods(prev => ({ ...prev, [jobId]: method }));
  }

  async function handleSettle() {
    setLoading(true);
    setError('');
    try {
      const jobIds = unpaidJobs.map(j => j.id);
      await api.post('/bills/settle-workshop', {
        workshop_id: workshop.id,
        job_ids: jobIds,
        payment_method: paymentMode,
        itemized_payments: settlementType === 'itemized' ? itemizedMethods : null
      });
      onDone();
    } catch (e) {
      setError(e.message || 'Settlement failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            💳 Workshop Settlement — {workshop.name}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <p style={{ fontSize: 13, color: '#64748b', marginTop: -8, marginBottom: 16 }}>
          Settling <strong>{unpaidJobs.length} vehicle(s)</strong> with total outstanding balance of <strong style={{ color: '#e11d48' }}>₹{totalAmount}</strong>.
        </p>

        {/* Settlement Type Toggle */}
        <div className="field mb-16" style={{ background: '#f8fafc', padding: 10, borderRadius: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
            Settlement Mode
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className={'btn ' + (settlementType === 'bulk' ? 'btn-primary' : 'btn-outline')}
              onClick={() => setSettlementType('bulk')}
              style={{ fontSize: 12, padding: '8px 10px' }}
            >
              🤝 Same Payment Mode for All
            </button>
            <button
              type="button"
              className={'btn ' + (settlementType === 'itemized' ? 'btn-primary' : 'btn-outline')}
              onClick={() => setSettlementType('itemized')}
              style={{ fontSize: 12, padding: '8px 10px' }}
            >
              📝 Individual Mode per Vehicle
            </button>
          </div>
        </div>

        {/* Bulk Payment Method Selector */}
        {settlementType === 'bulk' && (
          <div className="field mb-16">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              Select Payment Method
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setPaymentMode('cash')}
                style={{
                  padding: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: paymentMode === 'cash' ? '#10b981' : '#cbd5e1',
                  background: paymentMode === 'cash' ? '#ecfdf5' : '#fff',
                  color: paymentMode === 'cash' ? '#047857' : '#64748b'
                }}
              >
                💵 Cash Payment
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setPaymentMode('gpay')}
                style={{
                  padding: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: paymentMode === 'gpay' ? '#0284c7' : '#cbd5e1',
                  background: paymentMode === 'gpay' ? '#e0f2fe' : '#fff',
                  color: paymentMode === 'gpay' ? '#0369a1' : '#64748b'
                }}
              >
                📱 GPay / Online UPI
              </button>
            </div>
          </div>
        )}

        {/* Itemized Vehicle List */}
        <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}>
          {unpaidJobs.map(j => (
            <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <strong style={{ fontSize: 13, color: '#1e293b' }}>{j.vehicle?.reg_number}</strong>
                <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>({j.wash_type?.name})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <strong style={{ fontSize: 13, color: '#0f172a' }}>₹{j.price}</strong>
                {settlementType === 'itemized' && (
                  <select
                    value={itemizedMethods[j.id] || 'cash'}
                    onChange={e => setJobMethod(j.id, e.target.value)}
                    style={{ fontSize: 12, padding: '4px 8px' }}
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="gpay">📱 GPay</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <p style={{ color: '#e11d48', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1, padding: 10 }}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSettle}
            disabled={loading}
            style={{ flex: 2, padding: 10, fontSize: 14, fontWeight: 700, background: '#0d9488', borderColor: '#0f766e' }}
          >
            {loading ? 'Processing...' : `Confirm Settlement (₹${totalAmount}) 🚀`}
          </button>
        </div>
      </div>
    </div>
  );
}
