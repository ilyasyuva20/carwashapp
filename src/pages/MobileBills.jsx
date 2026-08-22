import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export default function MobileBills() {
  const [data, setData] = useState({
    summary: { total_cars: 0, total_bikes: 0, total_vehicles: 0, total_amount: 0, unpaid_amount: 0, paid_amount: 0 },
    jobs: []
  });
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, unpaid, paid
  const [segmentFilter, setSegmentFilter] = useState('all'); // all, car, bike
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settlingId, setSettlingId] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReceiptJob, setSelectedReceiptJob] = useState(null);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      let params = `?segment=${segmentFilter}&payment_status=${paymentFilter}`;
      if (searchQuery.trim()) {
        params += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await api.get(`/bills${params}`);
      setData(res || { summary: {}, jobs: [] });
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [segmentFilter, paymentFilter, searchQuery]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Handle single tap payment settlement on mobile (Cash / GPay)
  async function handleSettlePayment(jobId, method) {
    setSettlingId(jobId);
    try {
      await api.post('/bills/settle-job', { job_id: jobId, payment_method: method });
      fetchBills();
    } catch (err) {
      alert('Failed to process payment: ' + (err.message || 'Error occurred'));
    } finally {
      setSettlingId(null);
    }
  }

  const jobsList = data.jobs || [];
  const summary = data.summary || { total_cars: 0, total_bikes: 0, total_vehicles: 0, total_amount: 0, unpaid_amount: 0, paid_amount: 0 };

  return (
    <div className="mobile-container">
      {/* Mobile Top Header Navigation */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/mobile" className="mobile-back-btn">
            ⬅ Scan
          </Link>
          <div>
            <h2 className="mobile-title">🧾 Mobile Bills</h2>
            <span className="mobile-subtitle">Generate & Collect Payments</span>
          </div>
        </div>

        <div className="mobile-header-actions">
          <Link to="/mobile/jobs" className="mobile-nav-btn">
            📋 Queue
          </Link>
          <button
            type="button"
            className="mobile-refresh-icon-btn"
            onClick={fetchBills}
            title="Refresh Bills"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="mobile-body">
        {/* Top Summary Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {/* Unpaid KPI */}
          <div style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ⏳ Pending Payment
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#9f1239', marginTop: 2 }}>
              ₹{(summary.unpaid_amount || 0).toLocaleString()}
            </div>
          </div>

          {/* Paid KPI */}
          <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ✅ Settled Amount
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0369a1', marginTop: 2 }}>
              ₹{(summary.paid_amount || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Quick Action + Search Bar */}
        <div className="mobile-card mb-14" style={{ padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8' }}>
                🔍
              </span>
              <input
                type="text"
                placeholder="Search reg # or phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="mobile-input-sm"
                style={{ paddingLeft: 30, fontSize: 14 }}
              />
            </div>
            <button
              type="button"
              className="mobile-btn-submit"
              onClick={() => setShowGenerateModal(true)}
              style={{ width: 'auto', padding: '8px 14px', fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap' }}
            >
              + Bill
            </button>
          </div>

          {/* Filter Segment Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {[
              { id: 'all', label: `All (${summary.total_vehicles || 0})` },
              { id: 'car', label: `🚗 Cars (${summary.total_cars || 0})` },
              { id: 'bike', label: `🏍️ Bikes (${summary.total_bikes || 0})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSegmentFilter(tab.id)}
                style={{
                  padding: '6px 4px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: segmentFilter === tab.id ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                  background: segmentFilter === tab.id ? '#e0f2fe' : '#ffffff',
                  color: segmentFilter === tab.id ? '#0369a1' : '#475569'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Payment Status Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
            {[
              { id: 'all', label: 'All Status' },
              { id: 'unpaid', label: '⏳ Unpaid' },
              { id: 'paid', label: '✅ Paid' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPaymentFilter(tab.id)}
                style={{
                  padding: '6px 4px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: paymentFilter === tab.id ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                  background: paymentFilter === tab.id ? '#ccfbf1' : '#ffffff',
                  color: paymentFilter === tab.id ? '#0f766e' : '#475569'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bills List */}
        {loading && jobsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌀</div>
            Loading completed customer bills...
          </div>
        ) : error ? (
          <div className="mobile-alert error">❌ {error}</div>
        ) : jobsList.length === 0 ? (
          <div className="mobile-empty-state">
            <div style={{ fontSize: 44, marginBottom: 12 }}>🧾✨</div>
            <h3>No Completed Customer Bills</h3>
            <p>Completed retail wash jobs will appear here for payment settlement.</p>
          </div>
        ) : (
          <div className="mobile-jobs-list">
            {jobsList.map(job => {
              const vehicle = job.vehicle || {};
              const regNumber = vehicle.reg_number || job.reg_number || 'N/A';
              const brand = vehicle.brand || '';
              const model = vehicle.model || '';
              const color = vehicle.color || '';
              const segment = vehicle.segment || '';
              const phone = vehicle.phone || job.phone;
              const washName = job.wash_type?.name || (segment === 'bike' ? 'Bike Wash' : 'Car Wash');
              const price = job.bill?.final_amount != null ? job.bill.final_amount : (job.price ?? 0);
              const completedTime = job.exit_time || job.completed_at || job.entry_time;

              const isBike = segment === 'bike';
              const isScooter = segment === 'scooter';
              const isPaid = job.payment_status === 'settled' || (job.bill && job.bill.status === 'paid');
              const payMethod = (job.bill?.payment_method || 'CASH').toUpperCase();

              return (
                <div key={job.id} className="mobile-job-card" style={{ borderColor: isPaid ? '#a7f3d0' : '#fecdd3' }}>
                  {/* Plate Header + Status Pill */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div className="mobile-plate-badge" style={{ padding: '4px 12px', margin: 0 }}>
                      <span className="plate-reg" style={{ fontSize: 19 }}>{regNumber}</span>
                    </div>

                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 800,
                        background: isPaid ? '#ecfdf5' : '#fffbeb',
                        color: isPaid ? '#047857' : '#b45309',
                        border: isPaid ? '1px solid #a7f3d0' : '1px solid #fde68a'
                      }}
                    >
                      {isPaid ? `✅ PAID (${payMethod})` : '⏳ UNPAID'}
                    </span>
                  </div>

                  {/* Vehicle Meta */}
                  <div className="mobile-job-details" style={{ marginBottom: 10 }}>
                    <div className="job-vehicle-title">
                      {isBike ? '🏍️' : isScooter ? '🛵' : '🚗'} {brand} {model} {color ? `(${color})` : ''}
                    </div>

                    <div className="job-meta-row">
                      <span className="job-wash-type">Package: <strong>{washName}</strong></span>
                      {job.has_chain_lube === 1 && <span className="job-lube-tag">+ Chain Lube</span>}
                    </div>

                    <div className="job-meta-row">
                      <span className="job-time-tag">
                        🕒 {formatDateTime(completedTime)}
                      </span>
                    </div>

                    {phone && (
                      <div className="job-phone">
                        📞 <a href={`tel:${phone}`}>{phone}</a>
                      </div>
                    )}
                  </div>

                  {/* Total & Action Bar */}
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Total Bill Amount:
                      </span>
                      <span style={{ fontSize: 22, fontWeight: 900, color: isPaid ? '#047857' : '#9f1239' }}>
                        ₹{price}
                      </span>
                    </div>

                    {/* Pay Options for Unpaid Jobs */}
                    {!isPaid ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <button
                          type="button"
                          disabled={settlingId === job.id}
                          onClick={() => handleSettlePayment(job.id, 'cash')}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '12px 8px',
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 3px 8px rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          {settlingId === job.id ? 'Saving...' : '💵 Pay CASH'}
                        </button>

                        <button
                          type="button"
                          disabled={settlingId === job.id}
                          onClick={() => handleSettlePayment(job.id, 'gpay')}
                          style={{
                            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '12px 8px',
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 3px 8px rgba(2, 132, 199, 0.3)'
                          }}
                        >
                          {settlingId === job.id ? 'Saving...' : '📱 Pay GPAY'}
                        </button>
                      </div>
                    ) : null}

                    {/* Secondary Receipt & WhatsApp Share Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptJob(job)}
                        style={{
                          flex: 1,
                          background: '#ffffff',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          padding: '8px 4px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🖨️ Receipt
                      </button>

                      <button
                        type="button"
                        onClick={() => sendWhatsAppReceiptMobile(job)}
                        style={{
                          flex: 1,
                          background: '#25D366',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 4px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        💬 WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate Bill Modal */}
      {showGenerateModal && (
        <MobileGenerateBillModal
          onClose={() => setShowGenerateModal(false)}
          onDone={() => {
            setShowGenerateModal(false);
            fetchBills();
          }}
        />
      )}

      {/* Printable Receipt Modal */}
      {selectedReceiptJob && (
        <MobilePrintReceiptModal
          job={selectedReceiptJob}
          onClose={() => setSelectedReceiptJob(null)}
        />
      )}
    </div>
  );
}

function MobileGenerateBillModal({ onClose, onDone }) {
  const [regNumber, setRegNumber] = useState('');
  const [preview, setPreview] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [redeem, setRedeem] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function find() {
    setError('');
    setPreview(null);
    const target = regNumber.trim().toUpperCase();
    if (!target) {
      setError('Please enter a registration number');
      return;
    }
    try {
      const jobs = await api.get('/jobs?status=completed');
      const job = jobs.find(j => j.vehicle?.reg_number === target && !j.bill);
      if (!job) {
        setError('No unbilled completed job found for ' + target);
        return;
      }
      const p = await api.get(`/bills/preview/${job.id}`);
      setPreview(p);
    } catch (e) {
      setError(e.message || 'Lookup failed');
    }
  }

  async function pay() {
    setLoading(true);
    setError('');
    try {
      await api.post('/bills', { job_id: preview.job_id, payment_method: paymentMethod, redeem });
      onDone();
    } catch (e) {
      setError(e.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '92%', maxWidth: 420 }}>
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>🧾 Generate Retail Bill</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <div className="mobile-field mb-12">
          <label className="mobile-label">Registration Number</label>
          <div className="mobile-input-group">
            <input
              value={regNumber}
              onChange={e => setRegNumber(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && find()}
              placeholder="e.g. KL32R3045"
              className="mobile-input reg-input"
              style={{ fontSize: 16, padding: 10 }}
              autoFocus
            />
            <button
              type="button"
              className="mobile-btn-secondary"
              onClick={find}
              style={{ padding: '10px 14px', fontSize: 14 }}
            >
              Find
            </button>
          </div>
        </div>

        {error && <div className="mobile-alert error">{error}</div>}

        {preview && (
          <>
            <div className="card mt-8" style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div className="flex between" style={{ fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Wash Package</span>
                <strong>{preview.wash_type}</strong>
              </div>
              <div className="flex between" style={{ fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Base Amount</span>
                <strong>₹{preview.amount}</strong>
              </div>
              {preview.customer && (
                <div className="flex between" style={{ fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Loyalty Points</span>
                  <span className="pill pill-teal" style={{ fontSize: 11 }}>{preview.customer.reward_points} pts</span>
                </div>
              )}
            </div>

            {preview.can_redeem && (
              <label className="flex gap-8 center mt-8" style={{ fontSize: 12.5, cursor: 'pointer', color: '#0f766e', fontWeight: 600 }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={redeem} onChange={e => setRedeem(e.target.checked)} />
                Redeem 100 points for {preview.redeem_discount_pct}% off
              </label>
            )}

            <div className="mobile-field mt-12">
              <label className="mobile-label">Select Payment Method</label>
              <div className="mobile-grid-2">
                <button
                  type="button"
                  className={`mobile-tab-btn ${paymentMethod === 'cash' ? 'active normal' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  className={`mobile-tab-btn ${paymentMethod === 'gpay' ? 'active car' : ''}`}
                  onClick={() => setPaymentMethod('gpay')}
                >
                  📱 GPay
                </button>
              </div>
            </div>

            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: 12, borderRadius: 10, marginTop: 12 }}>
              <div className="flex between center">
                <span style={{ fontSize: 13, fontWeight: 700, color: '#047857' }}>Total Payable:</span>
                <strong style={{ fontSize: 22, color: '#047857' }}>
                  ₹{redeem ? Math.max(0, Math.round(preview.amount * 0.5)) : preview.amount}
                </strong>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-8 mt-16">
          <button type="button" className="mobile-btn-secondary" onClick={onClose} style={{ flex: 1, padding: 12 }}>
            Cancel
          </button>
          <button
            type="button"
            className="mobile-btn-submit"
            onClick={pay}
            disabled={!preview || loading}
            style={{ flex: 1.5, padding: 12, fontSize: 15 }}
          >
            {loading ? 'Processing...' : 'Confirm & Pay'}
          </button>
        </div>
      </div>
    </div>
  );
}

async function sendWhatsAppReceiptMobile(job) {
  let rawPhone = job.vehicle?.phone || '';
  if (!rawPhone) {
    rawPhone = prompt('Enter customer WhatsApp number:');
    if (!rawPhone) return;
  }
  let cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  const pdfUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/api/bills/pdf/${job.id}`;
  const fileName = `Receipt_${job.vehicle?.reg_number || job.id}.pdf`;

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

  const message = `📄 *PERFECTO WASH RECEIPT*\nVehicle: ${job.vehicle?.reg_number || ''}\nTotal Paid: ₹${job.price}\nStatus: ${job.payment_status === 'settled' ? 'PAID' : 'PENDING'}\n\nView PDF Receipt:\n${pdfUrl}`;
  const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

function MobilePrintReceiptModal({ job, onClose }) {
  const isPaid = job.payment_status === 'settled' || (job.bill && job.bill.status === 'paid');
  const payMethod = (job.bill?.payment_method || 'CASH').toUpperCase();
  const completedVal = job.exit_time || job.completed_at || job.entry_time;
  const d = completedVal ? new Date(completedVal) : new Date();
  const dateOnlyStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeOnlyStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

  const pdfUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/api/bills/pdf/${job.id}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '94%', maxWidth: 440, padding: 18 }}>
        <div className="flex between center" style={{ marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>🧾 Bill Receipt</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>

        {/* Printable Ticket Receipt Box */}
        <div
          style={{
            background: '#ffffff',
            border: '2px dashed #cbd5e1',
            borderRadius: 10,
            padding: 14,
            fontFamily: 'monospace, sans-serif'
          }}
        >
          <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 17, color: '#0f766e', fontWeight: 800 }}>PERFECTO WASH</h3>
            <div style={{ fontSize: 10, color: '#64748b' }}>Kunneparambu Rd, Vazhakkala, Kakkanad</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>📞 +91 9992225924</div>
          </div>

          <div style={{ fontSize: 11, display: 'grid', gridTemplateColumns: '100px 10px 1fr', rowGap: 4, marginBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Receipt</span>
            <span>:</span>
            <span style={{ textAlign: 'right' }}><strong>#REC-{job.id}</strong></span>

            <span style={{ color: '#64748b' }}>Date & Time</span>
            <span>:</span>
            <span style={{ textAlign: 'right' }}>{dateOnlyStr} {timeOnlyStr}</span>

            <span style={{ color: '#64748b' }}>Reg Number</span>
            <span>:</span>
            <span style={{ textAlign: 'right' }}><strong style={{ color: '#0f172a' }}>{job.vehicle?.reg_number}</strong></span>

            <span style={{ color: '#64748b' }}>Vehicle</span>
            <span>:</span>
            <span style={{ textAlign: 'right' }}>{job.vehicle?.brand} {job.vehicle?.model}</span>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '6px 0', margin: '6px 0', fontSize: 12 }}>
            <div className="flex between">
              <span>{job.wash_type?.name || 'Wash Service'}</span>
              <strong>₹{job.wash_price || job.price}</strong>
            </div>
            {job.has_chain_lube ? (
              <div className="flex between" style={{ color: '#6b21a8', fontSize: 11 }}>
                <span>+ Chain Lube</span>
                <span>₹{job.chain_lube_price}</span>
              </div>
            ) : null}
          </div>

          <div className="flex between center" style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
            <span>NET PAID:</span>
            <span style={{ color: '#0f766e' }}>₹{job.price}</span>
          </div>

          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <span style={{
              display: 'inline-block',
              border: isPaid ? '1.5px solid #059669' : '1.5px solid #d97706',
              color: isPaid ? '#059669' : '#d97706',
              padding: '2px 10px',
              borderRadius: 6,
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: '0.08em'
            }}>
              {isPaid ? `PAID VIA ${payMethod}` : 'PAYMENT PENDING'}
            </span>
          </div>
        </div>

        <div className="flex gap-6 mt-14">
          <button className="mobile-btn-secondary" onClick={onClose} style={{ flex: 1, padding: 10, fontSize: 13 }}>
            Close
          </button>
          <button
            className="mobile-btn-secondary"
            onClick={() => window.open(pdfUrl, '_blank')}
            style={{ flex: 1, padding: 10, fontSize: 13, background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}
          >
            📄 PDF
          </button>
          <button
            className="mobile-btn-submit"
            onClick={() => sendWhatsAppReceiptMobile(job)}
            style={{ flex: 1.2, padding: 10, fontSize: 13, background: '#25D366', boxShadow: 'none' }}
          >
            💬 WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
