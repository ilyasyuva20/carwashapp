import { useState, useEffect } from 'react';
import { api } from '../api';
import DatePickerInput from '../components/DatePickerInput';
import toast from 'react-hot-toast';

function getTodayStr() {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function getYesterdayStr() {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(val) {
  if (!val) return '-';
  const dt = new Date(val);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getPdfUrl(jobId) {
  const base = import.meta.env.VITE_API_URL;
  if (base) {
    const cleanBase = base.replace(/\/+$/, '');
    return `${cleanBase}/bills/pdf/${jobId}`;
  }
  return `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/api/bills/pdf/${jobId}`;
}

export default function DailyBills() {
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [dateMode, setDateMode] = useState('today'); // 'today', 'yesterday', 'custom'
  
  // Filters
  const [customerFilter, setCustomerFilter] = useState('all'); // 'all', 'retail', 'workshop'
  const [vehicleFilter, setVehicleFilter] = useState('all'); // 'all', 'cars', 'bikes'
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'paid', 'unpaid'
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [data, setData] = useState({
    date: getTodayStr(),
    summary: {
      total_vehicles: 0,
      total_cars: 0,
      total_bikes: 0,
      total_retail: 0,
      total_workshop: 0,
      total_revenue: 0,
      total_paid: 0,
      total_cash: 0,
      total_gpay: 0,
      total_pending: 0,
      retail_paid: 0,
      retail_pending: 0,
      workshop_paid: 0,
      workshop_pending: 0
    },
    jobs: []
  });

  const [loading, setLoading] = useState(false);
  const [settlingJobId, setSettlingJobId] = useState(null);
  const [splitModalJob, setSplitModalJob] = useState(null);
  const [splitCash, setSplitCash] = useState('');
  const [splitGpay, setSplitGpay] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Load Data
  async function loadDailyBills(isManualRefresh = false) {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      let params = `?date=${selectedDate}`;
      if (customerFilter !== 'all') params += `&customer_type=${customerFilter}`;
      if (vehicleFilter !== 'all') params += `&vehicle_type=${vehicleFilter}`;
      if (paymentFilter !== 'all') params += `&payment_status=${paymentFilter}`;
      if (searchQuery.trim()) params += `&q=${encodeURIComponent(searchQuery.trim())}`;

      const res = await api.get(`/bills/daily${params}`);
      setData(res || { date: selectedDate, summary: {}, jobs: [] });
      if (isManualRefresh) {
        toast.success('Data refreshed!', { duration: 1500 });
      }
    } catch (err) {
      console.error('Failed to load daily bills:', err);
      toast.error('Failed to load daily bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDailyBills();
  }, [selectedDate, customerFilter, vehicleFilter, paymentFilter]);

  // Date selection handlers
  function handleSelectToday() {
    const today = getTodayStr();
    setDateMode('today');
    setSelectedDate(today);
  }

  function handleSelectYesterday() {
    const yesterday = getYesterdayStr();
    setDateMode('yesterday');
    setSelectedDate(yesterday);
  }

  function handleCustomDateChange(e) {
    const val = e.target.value;
    setSelectedDate(val);
    const today = getTodayStr();
    const yesterday = getYesterdayStr();
    if (val === today) setDateMode('today');
    else if (val === yesterday) setDateMode('yesterday');
    else setDateMode('custom');
  }

  // Quick Settle Job
  async function handleSettleJob(jobId, method) {
    setSettlingJobId(jobId);
    try {
      await api.post('/bills/settle-job', {
        job_id: jobId,
        payment_method: method
      });
      toast.success(`Settled via ${method.toUpperCase()}`);
      await loadDailyBills();
    } catch (err) {
      toast.error(err.message || 'Failed to settle job');
    } finally {
      setSettlingJobId(null);
    }
  }

  // Open Split Payment Modal
  function openSplitModal(job) {
    setSplitModalJob(job);
    const amt = Number(job.price) || 0;
    const half = Math.round(amt / 2);
    setSplitCash(String(half));
    setSplitGpay(String(amt - half));
  }

  // Confirm Split Payment
  async function handleConfirmSplit(e) {
    e.preventDefault();
    if (!splitModalJob) return;

    const totalAmt = Number(splitModalJob.price) || 0;
    const c = Number(splitCash) || 0;
    const g = Number(splitGpay) || 0;

    if (c + g !== totalAmt) {
      toast.error(`Cash (₹${c}) + GPay (₹${g}) must equal total amount (₹${totalAmt})`);
      return;
    }

    setSettlingJobId(splitModalJob.id);
    const jobId = splitModalJob.id;
    setSplitModalJob(null);

    try {
      await api.post('/bills/settle-job', {
        job_id: jobId,
        payment_method: 'split',
        cash_amount: c,
        gpay_amount: g
      });
      toast.success('Split payment settled successfully');
      await loadDailyBills();
    } catch (err) {
      toast.error(err.message || 'Failed to settle split payment');
    } finally {
      setSettlingJobId(null);
    }
  }

  // Download PDF Receipt
  function handleDownloadPdf(job) {
    const pdfUrl = getPdfUrl(job.id);
    window.open(pdfUrl, '_blank');
  }

  // Share WhatsApp Receipt
  function handleShareWhatsApp(job) {
    const phone = (job.phone || job.vehicle?.phone || '').replace(/[^0-9]/g, '');
    const pdfUrl = getPdfUrl(job.id);
    const regNo = job.vehicle?.reg_number || 'Vehicle';
    const price = job.price || 0;
    const washType = job.wash_type?.name || 'Wash';
    const custName = job.customer_type === 'workshop' 
      ? (job.workshop?.name || 'Workshop')
      : (job.customer_name || 'Customer');

    const msg = encodeURIComponent(
      `*PERFECTO CAR WASH - RECEIPT*\n` +
      `Vehicle: *${regNo}*\n` +
      `Customer: ${custName}\n` +
      `Service: ${washType}\n` +
      `Amount: ₹${price}\n\n` +
      `📄 View / Download Official PDF Receipt:\n${pdfUrl}\n\n` +
      `Thank you for visiting Perfecto Wash!`
    );

    const waUrl = phone ? `https://wa.me/91${phone.slice(-10)}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(waUrl, '_blank');
  }

  const summary = data.summary || {};
  const jobsList = data.jobs || [];

  return (
    <div className="daily-bills-page" style={{ paddingBottom: 60 }}>
      {/* 🌀 Loader Backdrop for initial fetch / settling */}
      {(loading && jobsList.length === 0) && (
        <div className="fullpage-loader-backdrop">
          <div className="loader-card">
            <div className="spinner-outer-ring">
              <span className="spinner-center-icon">📅</span>
            </div>
            <h3 className="loader-title">Loading Daily Bills...</h3>
            <p className="loader-subtitle">Consolidating Normal & Workshop bills for {selectedDate}...</p>
            <div className="loader-progress-bar">
              <div className="loader-progress-fill" />
            </div>
          </div>
        </div>
      )}

      {settlingJobId && (
        <div className="fullpage-loader-backdrop">
          <div className="loader-card">
            <div className="spinner-outer-ring">
              <span className="spinner-center-icon">💳</span>
            </div>
            <h3 className="loader-title">Settling Bill...</h3>
            <p className="loader-subtitle">Recording payment and updating ledger...</p>
            <div className="loader-progress-bar">
              <div className="loader-progress-fill" />
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Day Selector Bar */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px', borderLeft: '4px solid var(--primary, #0284c7)' }}>
        <div className="flex between center wrap gap-16">
          <div>
            <div className="flex center gap-8">
              <span style={{ fontSize: 24 }}>📅</span>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Daily Bill Management</h1>
            </div>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              Unified day-wise bills covering both <strong>Normal Retail Customers</strong> &amp; <strong>Workshop Partners</strong>
            </p>
          </div>

          {/* Quick Date Presets + Single Day Picker */}
          <div className="flex center wrap gap-10">
            <div className="btn-group" style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${dateMode === 'today' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontWeight: 600, padding: '6px 14px', borderRadius: 6 }}
                onClick={handleSelectToday}
              >
                ☀️ Today
              </button>
              <button
                type="button"
                className={`btn btn-sm ${dateMode === 'yesterday' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontWeight: 600, padding: '6px 14px', borderRadius: 6 }}
                onClick={handleSelectYesterday}
              >
                ⏮️ Yesterday
              </button>
            </div>

            <div className="flex center gap-6" style={{ background: '#f8fafc', padding: '4px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Select Date:</span>
              <DatePickerInput
                value={selectedDate}
                onChange={handleCustomDateChange}
                style={{ width: 140, fontWeight: 700 }}
              />
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => loadDailyBills(true)}
              disabled={refreshing}
              title="Refresh data with current selections"
              style={{
                padding: '7px 14px',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                borderColor: '#0284c7',
                color: '#0284c7',
                background: '#f0f9ff',
                cursor: refreshing ? 'not-allowed' : 'pointer'
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  animation: refreshing ? 'spinRing 0.8s linear infinite' : 'none'
                }}
              >
                🔄
              </span>
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => window.print()}
              title="Print Daily Bill Sheet"
              style={{ padding: '7px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              🖨️ Print Sheet
            </button>
          </div>
        </div>

        {/* Selected Date Notice Badge */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
            📌 Showing Bills for: {formatDateDisplay(selectedDate)} ({selectedDate})
          </span>
          {dateMode === 'today' && (
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              Live Today View
            </span>
          )}
          {dateMode === 'yesterday' && (
            <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              Yesterday's Closing Tally
            </span>
          )}
        </div>
      </div>

      {/* Daily Executive Summary Cards */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Card 1: Total Vehicles */}
        <div className="card stat-card" style={{ padding: '16px 18px', borderTop: '3px solid #3b82f6', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
          <div className="flex between center">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Vehicles</span>
            <span style={{ fontSize: 20 }}>🚗</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', marginTop: 6 }}>
            {summary.total_vehicles || 0}
          </div>
          <div className="flex gap-8 muted" style={{ fontSize: 12, marginTop: 6, fontWeight: 600 }}>
            <span>🚘 {summary.total_cars || 0} Cars</span>
            <span>•</span>
            <span>🏍️ {summary.total_bikes || 0} Bikes</span>
          </div>
        </div>

        {/* Card 2: Total Revenue */}
        <div className="card stat-card" style={{ padding: '16px 18px', borderTop: '3px solid #10b981', background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)' }}>
          <div className="flex between center">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>Total Revenue</span>
            <span style={{ fontSize: 20 }}>💰</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#047857', marginTop: 6 }}>
            ₹{(summary.total_revenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="flex gap-8 muted" style={{ fontSize: 12, marginTop: 6, fontWeight: 600 }}>
            <span>Retail: ₹{((summary.retail_paid || 0) + (summary.retail_pending || 0)).toLocaleString('en-IN')}</span>
            <span>•</span>
            <span>Workshop: ₹{((summary.workshop_paid || 0) + (summary.workshop_pending || 0)).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 3: Settled Collections */}
        <div className="card stat-card" style={{ padding: '16px 18px', borderTop: '3px solid #059669', background: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)' }}>
          <div className="flex between center">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>Settled / Paid</span>
            <span style={{ fontSize: 20 }}>✅</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#065f46', marginTop: 6 }}>
            ₹{(summary.total_paid || 0).toLocaleString('en-IN')}
          </div>
          <div className="flex gap-8" style={{ fontSize: 12, marginTop: 6, fontWeight: 700, color: '#047857' }}>
            <span>💵 Cash: ₹{(summary.total_cash || 0).toLocaleString('en-IN')}</span>
            <span>•</span>
            <span>📱 GPay: ₹{(summary.total_gpay || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 4: Pending / Credit Amount */}
        <div className="card stat-card" style={{ padding: '16px 18px', borderTop: '3px solid #f59e0b', background: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)' }}>
          <div className="flex between center">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Unsettled / Credit</span>
            <span style={{ fontSize: 20 }}>⏳</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#d97706', marginTop: 6 }}>
            ₹{(summary.total_pending || 0).toLocaleString('en-IN')}
          </div>
          <div className="flex gap-8 muted" style={{ fontSize: 12, marginTop: 6, fontWeight: 600 }}>
            <span>Retail Unpaid: ₹{(summary.retail_pending || 0).toLocaleString('en-IN')}</span>
            <span>•</span>
            <span>Workshop Due: ₹{(summary.workshop_pending || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 5: Customer Breakdown */}
        <div className="card stat-card" style={{ padding: '16px 18px', borderTop: '3px solid #8b5cf6', background: 'linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)' }}>
          <div className="flex between center">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>Customer Types</span>
            <span style={{ fontSize: 20 }}>🏢</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#581c87', marginTop: 8, display: 'flex', gap: 12 }}>
            <div>
              <span style={{ fontSize: 12, color: '#7e22ce', display: 'block', fontWeight: 600 }}>Normal Retail</span>
              {summary.total_retail || 0} <span style={{ fontSize: 13, fontWeight: 500 }}>bills</span>
            </div>
            <div style={{ borderLeft: '1px solid #e9d5ff', paddingLeft: 12 }}>
              <span style={{ fontSize: 12, color: '#7e22ce', display: 'block', fontWeight: 600 }}>Workshops</span>
              {summary.total_workshop || 0} <span style={{ fontSize: 13, fontWeight: 500 }}>bills</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div className="flex between center wrap gap-12">
          {/* Customer Type Tabs */}
          <div className="flex center gap-8 wrap">
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Type:</span>
            <div className="btn-group" style={{ display: 'inline-flex', background: '#f1f5f9', padding: 2, borderRadius: 6 }}>
              <button
                type="button"
                className={`btn btn-xs ${customerFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4 }}
                onClick={() => setCustomerFilter('all')}
              >
                All ({summary.total_vehicles || 0})
              </button>
              <button
                type="button"
                className={`btn btn-xs ${customerFilter === 'retail' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4 }}
                onClick={() => setCustomerFilter('retail')}
              >
                Normal Retail ({summary.total_retail || 0})
              </button>
              <button
                type="button"
                className={`btn btn-xs ${customerFilter === 'workshop' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4 }}
                onClick={() => setCustomerFilter('workshop')}
              >
                🏢 Workshop ({summary.total_workshop || 0})
              </button>
            </div>
          </div>

          {/* Vehicle Segment Filter */}
          <div className="flex center gap-8 wrap">
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Vehicle:</span>
            <div className="btn-group" style={{ display: 'inline-flex', background: '#f1f5f9', padding: 2, borderRadius: 6 }}>
              <button
                type="button"
                className={`btn btn-xs ${vehicleFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4 }}
                onClick={() => setVehicleFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`btn btn-xs ${vehicleFilter === 'cars' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4 }}
                onClick={() => setVehicleFilter('cars')}
              >
                🚘 Cars ({summary.total_cars || 0})
              </button>
              <button
                type="button"
                className={`btn btn-xs ${vehicleFilter === 'bikes' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4 }}
                onClick={() => setVehicleFilter('bikes')}
              >
                🏍️ Bikes ({summary.total_bikes || 0})
              </button>
            </div>
          </div>

          {/* Payment Status Filter */}
          <div className="flex center gap-8 wrap">
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Status:</span>
            <div className="btn-group" style={{ display: 'inline-flex', background: '#f1f5f9', padding: 2, borderRadius: 6 }}>
              <button
                type="button"
                className={`btn btn-xs ${paymentFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4 }}
                onClick={() => setPaymentFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`btn btn-xs ${paymentFilter === 'paid' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4 }}
                onClick={() => setPaymentFilter('paid')}
              >
                Paid
              </button>
              <button
                type="button"
                className={`btn btn-xs ${paymentFilter === 'unpaid' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4 }}
                onClick={() => setPaymentFilter('unpaid')}
              >
                Unpaid / Due
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: 200, flex: '1 1 200px' }}>
            <form onSubmit={e => { e.preventDefault(); loadDailyBills(); }} className="flex gap-6">
              <input
                type="text"
                placeholder="Search plate, customer, workshop..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '6px 12px', fontSize: 13 }}
              />
              <button type="submit" className="btn btn-outline btn-sm">🔍</button>
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setSearchQuery(''); setTimeout(loadDailyBills, 0); }}
                >
                  ✕
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Daily Bills Table / List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>
            Bills List for {formatDateDisplay(selectedDate)} ({jobsList.length} items)
          </div>
          <div className="flex center gap-10">
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => loadDailyBills(true)}
              disabled={refreshing}
              title="Refresh table data"
              style={{ padding: '3px 8px', fontSize: 12, fontWeight: 700, color: '#0284c7', background: '#e0f2fe', borderRadius: 4 }}
            >
              <span style={{ display: 'inline-block', animation: refreshing ? 'spinRing 0.8s linear infinite' : 'none' }}>🔄</span> {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <span className="muted" style={{ fontSize: 12 }}>
              Sorted by completion time (Latest first)
            </span>
          </div>
        </div>

        {jobsList.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
            <span style={{ fontSize: 36, display: 'block', marginBottom: 10 }}>📄</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>No Bills Found For This Day</div>
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>
              No completed or settled jobs found for {selectedDate} matching your current filters.
            </p>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>#</th>
                  <th style={{ padding: '10px 14px' }}>Time</th>
                  <th style={{ padding: '10px 14px' }}>Vehicle Number</th>
                  <th style={{ padding: '10px 14px' }}>Customer / Workshop</th>
                  <th style={{ padding: '10px 14px' }}>Package / Wash</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status &amp; Method</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobsList.map((job, idx) => {
                  const isPaid = job.payment_status === 'settled' || (job.bill && job.bill.status === 'paid');
                  const isWorkshop = job.customer_type === 'workshop';
                  const isBike = job.vehicle && ['bike', 'scooter'].includes((job.vehicle.segment || '').toLowerCase());
                  const timeVal = job.exit_time || job.completed_at || job.entry_time;
                  const payMethod = (job.bill?.payment_method || job.payment_method || 'cash').toUpperCase();
                  const netAmount = Number(job.price) || 0;

                  return (
                    <tr
                      key={job.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                    >
                      {/* SL */}
                      <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      {/* Time */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                        🕒 {formatTime(timeVal)}
                      </td>

                      {/* Vehicle Number & Segment */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{isBike ? '🏍️' : '🚘'}</span>
                          <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', color: '#0f172a' }}>
                            {job.vehicle?.reg_number || 'UNKNOWN'}
                          </span>
                        </div>
                        {(job.vehicle?.brand || job.vehicle?.model) && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {job.vehicle?.brand} {job.vehicle?.model}
                          </div>
                        )}
                      </td>

                      {/* Customer / Workshop */}
                      <td style={{ padding: '12px 14px' }}>
                        {isWorkshop ? (
                          <div>
                            <span style={{ background: '#ede9fe', color: '#6b21a8', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
                              🏢 Workshop Partner
                            </span>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginTop: 3 }}>
                              {job.workshop?.name || 'Assigned Workshop'}
                            </div>
                            {job.workshop?.phone && (
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                📞 {job.workshop.phone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
                              👤 Retail Customer
                            </span>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginTop: 3 }}>
                              {job.customer_name || 'Retail Customer'}
                            </div>
                            {(job.phone || job.vehicle?.phone) && (
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                📞 {job.phone || job.vehicle?.phone}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Package / Wash */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>
                          {job.wash_type?.name || 'Standard Wash'}
                        </div>
                        {job.has_chain_lube ? (
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700, marginTop: 3, display: 'inline-block' }}>
                            + Chain Lube
                          </span>
                        ) : null}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                          ₹{netAmount.toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Status & Method */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {isPaid ? (
                          <div>
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
                              PAID
                            </span>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#047857', marginTop: 4 }}>
                              {payMethod === 'SPLIT' ? (
                                <span>Split: ₹{job.bill?.cash_amount || job.cash_amount || 0} Cash + ₹{job.bill?.gpay_amount || job.gpay_amount || 0} GPay</span>
                              ) : (
                                <span>{payMethod === 'GPAY' ? '📱 GPAY' : '💵 CASH'}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
                              UNPAID / DUE
                            </span>
                            {isWorkshop && (
                              <div style={{ fontSize: 10, color: '#991b1b', marginTop: 2, fontWeight: 600 }}>
                                Ledger Credit
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          {/* PDF Receipt Button */}
                          <button
                            type="button"
                            className="btn btn-xs btn-outline"
                            onClick={() => handleDownloadPdf(job)}
                            title="Download / View Official PDF Receipt"
                            style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700 }}
                          >
                            📄 PDF
                          </button>

                          {/* WhatsApp Share Button */}
                          <button
                            type="button"
                            className="btn btn-xs"
                            onClick={() => handleShareWhatsApp(job)}
                            title="Share receipt via WhatsApp"
                            style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, background: '#25D366', color: '#fff', border: 'none' }}
                          >
                            💬 WA
                          </button>

                          {/* Quick Settle Button if unpaid */}
                          {!isPaid && (
                            <div className="btn-group" style={{ display: 'inline-flex', gap: 3 }}>
                              <button
                                type="button"
                                className="btn btn-xs btn-success"
                                onClick={() => handleSettleJob(job.id, 'cash')}
                                title="Settle via Cash"
                                style={{ padding: '4px 7px', fontSize: 11 }}
                              >
                                💵 Cash
                              </button>
                              <button
                                type="button"
                                className="btn btn-xs btn-primary"
                                onClick={() => handleSettleJob(job.id, 'gpay')}
                                title="Settle via GPay"
                                style={{ padding: '4px 7px', fontSize: 11 }}
                              >
                                📱 GPay
                              </button>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline"
                                onClick={() => openSplitModal(job)}
                                title="Split Cash + GPay"
                                style={{ padding: '4px 6px', fontSize: 11 }}
                              >
                                ➗ Split
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Split Payment Modal */}
      {splitModalJob && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card" style={{ maxWidth: 420, width: '90%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div className="flex between center" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Split Payment Settlement</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSplitModalJob(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Vehicle / Job:</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                {splitModalJob.vehicle?.reg_number} - {splitModalJob.wash_type?.name}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#059669', marginTop: 4 }}>
                Total Bill Amount: ₹{Number(splitModalJob.price || 0).toLocaleString('en-IN')}
              </div>
            </div>

            <form onSubmit={handleConfirmSplit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  💵 Cash Portion (₹):
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max={splitModalJob.price}
                  value={splitCash}
                  onChange={e => {
                    const c = e.target.value;
                    setSplitCash(c);
                    const tot = Number(splitModalJob.price || 0);
                    if (!isNaN(Number(c))) {
                      setSplitGpay(String(Math.max(0, tot - Number(c))));
                    }
                  }}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 15, fontWeight: 700 }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  📱 GPay Portion (₹):
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max={splitModalJob.price}
                  value={splitGpay}
                  onChange={e => {
                    const g = e.target.value;
                    setSplitGpay(g);
                    const tot = Number(splitModalJob.price || 0);
                    if (!isNaN(Number(g))) {
                      setSplitCash(String(Math.max(0, tot - Number(g))));
                    }
                  }}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 15, fontWeight: 700 }}
                />
              </div>

              <div className="flex gap-10">
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setSplitModalJob(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, fontWeight: 700 }}
                >
                  Confirm &amp; Settle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
