import { useState, useEffect } from 'react';
import { api } from '../api';
import NewJobModal from '../components/NewJobModal';

const STATUS_LABEL = {
  in_progress: { text: 'In progress', cls: 'pill-amber' },
  completed: { text: 'Completed', cls: 'pill-green' },
  cancelled: { text: 'Cancelled', cls: 'pill-red' }
};

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateOnly(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDatePart(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatTimePart(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function formatSegmentLabel(segment) {
  if (!segment) return 'Car';
  const seg = segment.toLowerCase();
  if (seg === 'sedan_compact_suv') return 'Sedan / Compact SUV';
  if (seg === 'premium_hatch') return 'Premium Hatch';
  if (seg === 'premium_sedan_suv') return 'Premium Sedan / SUV';
  if (seg === 'muv') return 'MUV';
  if (seg === 'suv') return 'SUV';
  if (seg === 'sedan') return 'Sedan';
  if (seg === 'mini_suv') return 'Mini SUV';
  if (seg === 'hatchback') return 'Hatchback';
  if (seg === 'bike') return 'Bike';
  if (seg === 'scooter') return 'Scooter';
  return seg.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [searchQuery, setSearchQuery] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  async function load() {
    const data = await api.get('/jobs');
    setJobs(data);
  }
  useEffect(() => { load(); }, []);

  // Compute status counts for badges
  const statusCounts = jobs.reduce((acc, j) => {
    // 1. Date filter (if selected)
    if (selectedDate) {
      const jobDateStr = formatDateOnly(j.entry_time);
      if (jobDateStr !== selectedDate) return acc;
    }
    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const regMatch = j.vehicle?.reg_number?.toLowerCase().includes(q);
      const phoneMatch = j.vehicle?.phone?.toLowerCase().includes(q);
      const brandMatch = j.vehicle?.brand?.toLowerCase().includes(q);
      const modelMatch = j.vehicle?.model?.toLowerCase().includes(q);
      const workshopMatch = j.workshop?.name?.toLowerCase().includes(q);
      if (!regMatch && !phoneMatch && !brandMatch && !modelMatch && !workshopMatch) return acc;
    }

    acc.all += 1;
    if (acc[j.status] !== undefined) {
      acc[j.status] += 1;
    }
    if (j.payment_status === 'unsettled') {
      acc.unsettled += 1;
    }
    if (j.customer_type === 'workshop') {
      acc.workshop += 1;
    }
    return acc;
  }, { all: 0, in_progress: 0, completed: 0, cancelled: 0, unsettled: 0, workshop: 0 });

  const filtered = jobs.filter(j => {
    // 1. Filter tabs
    if (filter !== 'all') {
      if (filter === 'unsettled' && j.payment_status !== 'unsettled') return false;
      else if (filter === 'workshop' && j.customer_type !== 'workshop') return false;
      else if (filter !== 'unsettled' && filter !== 'workshop' && j.status !== filter) return false;
    }
    
    // 2. Date filter (if selected)
    if (selectedDate) {
      const jobDateStr = formatDateOnly(j.entry_time);
      if (jobDateStr !== selectedDate) return false;
    }

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const regMatch = j.vehicle?.reg_number?.toLowerCase().includes(q);
      const phoneMatch = j.vehicle?.phone?.toLowerCase().includes(q);
      const brandMatch = j.vehicle?.brand?.toLowerCase().includes(q);
      const modelMatch = j.vehicle?.model?.toLowerCase().includes(q);
      const workshopMatch = j.workshop?.name?.toLowerCase().includes(q);
      if (!regMatch && !phoneMatch && !brandMatch && !modelMatch && !workshopMatch) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  async function updateStatus(jobId, status) {
    await api.put(`/jobs/${jobId}`, { status });
    load();
  }

  async function togglePaymentStatus(jobId, currentStatus) {
    const newStatus = currentStatus === 'settled' ? 'unsettled' : 'settled';
    await api.put(`/jobs/${jobId}`, { payment_status: newStatus });
    load();
  }

  return (
    <div>
      <div className="flex between center mb-20" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 24, color: '#0f172a' }}>Jobs</h2>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
            Manage daily vehicle wash entries & operations
          </span>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowNew(true)}
          style={{
            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
            padding: '10px 18px',
            borderRadius: 12,
            boxShadow: '0 4px 10px rgba(13,148,136,0.25)',
            fontSize: 14,
            fontWeight: 600
          }}
        >
          📱 + New job
        </button>
      </div>

      {/* Filter Tabs & Controls Header */}
      <div className="card mb-20" style={{ padding: 16 }}>
        {/* Status Segmented Tabs - Full Width Responsive Grid */}
        <div
          className="status-tab-group"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 4,
            width: '100%',
            marginBottom: 14
          }}
        >
          {[
            { id: 'all', label: 'All' },
            { id: 'in_progress', label: 'In progress' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
            { id: 'unsettled', label: '⏳ Pending Pay' },
            { id: 'workshop', label: '🏭 Workshop' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`status-tab ${filter === tab.id ? 'active' : ''}`}
              onClick={() => { setFilter(tab.id); setCurrentPage(1); }}
              style={{
                justifyContent: 'center',
                width: '100%',
                padding: '8px 10px',
                fontSize: 13
              }}
            >
              <span>{tab.label}</span>
              <span className="status-badge-count">{statusCounts[tab.id] || 0}</span>
            </button>
          ))}
        </div>

        {/* Date Filter & Search Input Row */}
        <div className="flex between center" style={{ flexWrap: 'wrap', gap: 12 }}>
          {/* Integrated Date Filter Control */}
          <div className="date-filter-box" style={{ flex: '1 1 250px' }}>
            <span style={{ fontSize: 13, color: '#64748b', marginLeft: 4 }}>📅</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setCurrentPage(1); }}
            />
            {selectedDate ? (
              <button
                className="btn-reset-date"
                onClick={() => { setSelectedDate(''); setCurrentPage(1); }}
                title="Show all dates"
              >
                All dates ✕
              </button>
            ) : (
              <button
                className="btn-reset-date"
                style={{ background: '#ccfbf1', color: '#0f766e' }}
                onClick={() => { setSelectedDate(getTodayDateString()); setCurrentPage(1); }}
              >
                Today
              </button>
            )}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search reg # or phone..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '8px 12px 8px 34px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                fontSize: 13,
                width: '100%',
                outline: 'none',
                background: '#fff'
              }}
            />
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚿</div>
            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b', fontSize: 15 }}>No jobs found</p>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              {selectedDate ? `No vehicle entries recorded for ${selectedDate}` : 'Try adjusting your search or status filter.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                <th style={{ padding: '10px 6px', width: 45, textAlign: 'center' }}>SL NO</th>
                <th style={{ padding: '10px 8px' }}>VEHICLE NUMBER</th>
                <th style={{ padding: '10px 8px' }}>CONTACT NUMBER</th>
                <th style={{ padding: '10px 8px' }}>WASH TYPE</th>
                <th style={{ padding: '10px 8px' }}>ENTRY DATE & TIME</th>
                <th style={{ padding: '10px 6px', width: 105, textAlign: 'center' }}>JOB STATUS</th>
                <th style={{ padding: '10px 6px', width: 115, textAlign: 'center' }}>PAYMENT</th>
                <th style={{ padding: '10px 8px', width: 160, textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((j, index) => {
                const st = STATUS_LABEL[j.status] || { text: j.status, cls: '' };
                const isBikeRow = j.vehicle?.segment === 'bike';
                const isScooterRow = j.vehicle?.segment === 'scooter';
                const isCarRow = j.vehicle && !isBikeRow && !isScooterRow;
                const segmentLabel = formatSegmentLabel(j.vehicle?.segment);
                const slNo = (currentPage - 1) * itemsPerPage + index + 1;

                return (
                  <tr
                    key={j.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* 1. SL NO */}
                    <td style={{ padding: '10px 6px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                      {slNo}
                    </td>

                    {/* 2. VEHICLE NUMBER & BRAND/MODEL UNDERNEATH */}
                    <td style={{ padding: '10px 8px' }}>
                      <div className="flex center gap-6" style={{ flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 14, color: '#0f172a', letterSpacing: '0.02em', fontWeight: 700 }}>
                          {j.vehicle.reg_number}
                        </strong>
                        {isBikeRow && (
                          <span className="pill pill-purple" style={{ fontSize: 10.5, padding: '1px 6px' }}>
                            🏍️ Bike
                          </span>
                        )}
                        {isScooterRow && (
                          <span className="pill pill-amber" style={{ fontSize: 10.5, padding: '1px 6px' }}>
                            🛵 Scooter
                          </span>
                        )}
                        {isCarRow && (
                          <span className="pill pill-teal" style={{ fontSize: 10.5, padding: '1px 6px' }}>
                            🚗 Car ({segmentLabel})
                          </span>
                        )}
                      </div>
                      {j.customer_type === 'workshop' && (
                        <div>
                          <span className="workshop-badge">
                            🏭 Workshop: {j.workshop ? j.workshop.name : 'Registered Workshop'}
                          </span>
                        </div>
                      )}
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2, color: '#64748b' }}>
                        {j.vehicle.brand || 'Vehicle'} {j.vehicle.model || ''} {j.vehicle.color ? `· ${j.vehicle.color}` : ''}
                      </div>
                    </td>

                    {/* 3. CONTACT NUMBER */}
                    <td style={{ padding: '10px 8px' }}>
                      {(() => {
                        const isWorkshop = j.customer_type === 'workshop';
                        const contactNum = isWorkshop
                          ? (j.workshop?.phone || j.workshop?.owner_phone || j.vehicle?.phone)
                          : j.vehicle?.phone;

                        return contactNum ? (
                          <a
                            href={`tel:${contactNum}`}
                            className="phone-link"
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: isWorkshop ? '#0d9488' : '#0284c7',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <span>📞</span> {contactNum}
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>-</span>
                        );
                      })()}
                    </td>

                    {/* 4. WASH TYPE & PRICE */}
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                        {j.wash_type?.name || (isBikeRow ? 'Bike Wash' : isScooterRow ? 'Scooter Wash' : 'Car Wash')}
                      </div>
                      <div className="flex center gap-6 mt-4" style={{ flexWrap: 'wrap' }}>
                        <span className="price-tag">₹{j.price}</span>
                        {j.has_chain_lube === 1 && (
                          <span style={{ fontSize: 10.5, background: '#f3e8ff', color: '#7e22ce', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                            + Chain Lube (₹{j.chain_lube_price || 100})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. ENTRY DATE & TIME */}
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                        {formatDatePart(j.entry_time)}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                        🕒 {formatTimePart(j.entry_time)}
                      </div>
                    </td>

                    {/* 6. JOB STATUS */}
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                      <span className={`pill ${st.cls}`} style={{ fontSize: 11, padding: '3px 8px', fontWeight: 600 }}>
                        {st.text}
                      </span>
                    </td>

                    {/* 7. PAYMENT SETTLEMENT STATUS & TOGGLE */}
                    <td style={{ padding: '10px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        {j.payment_status === 'settled' ? (
                          <span className="pill pill-settled" style={{ fontSize: 11, padding: '2px 8px', fontWeight: 600 }}>
                            💳 Paid
                          </span>
                        ) : (
                          <span className="pill pill-unsettled" style={{ fontSize: 11, padding: '2px 8px', fontWeight: 600 }}>
                            ⏳ Unsettled
                          </span>
                        )}
                        <button
                          className={j.payment_status === 'settled' ? 'btn-unsettle-pay' : 'btn-settle-pay'}
                          onClick={() => togglePaymentStatus(j.id, j.payment_status || 'unsettled')}
                          title={j.payment_status === 'settled' ? 'Mark payment as Unpaid' : 'Click to Settle Payment'}
                        >
                          {j.payment_status === 'settled' ? 'Mark Unpaid' : '✓ Settle Now'}
                        </button>
                      </div>
                    </td>

                    {/* 8. ACTIONS */}
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'nowrap' }}>
                        {j.status === 'in_progress' && (
                          <>
                            <button
                              className="btn btn-outline"
                              onClick={() => updateStatus(j.id, 'completed')}
                              style={{
                                padding: '5px 9px',
                                fontSize: 11.5,
                                fontWeight: 600,
                                borderColor: '#10b981',
                                color: '#047857',
                                background: '#ecfdf5',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              ✓ Complete
                            </button>
                            <button
                              className="btn btn-outline"
                              onClick={() => updateStatus(j.id, 'cancelled')}
                              style={{
                                padding: '5px 8px',
                                fontSize: 11.5,
                                fontWeight: 600,
                                borderColor: '#f43f5e',
                                color: '#be123c',
                                background: '#fff1f2',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {j.status === 'completed' && (
                          <span style={{ fontSize: 11.5, color: '#059669', fontWeight: 600, background: '#f0fdf4', padding: '3px 8px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                            ✓ Done
                          </span>
                        )}
                        {j.status === 'cancelled' && (
                          <span style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>
                            Cancelled
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Dynamic Pagination Controls Bar */}
        {filtered.length > 0 && (
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--border)',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            {/* Left Info & Per-Page Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong>–<strong>{Math.min(currentPage * itemsPerPage, filtered.length)}</strong> of <strong>{filtered.length}</strong> jobs
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
                <span>Rows:</span>
                <select
                  value={itemsPerPage}
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: 12,
                    fontWeight: 600,
                    background: '#fff'
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right Page Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                className="btn btn-outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                style={{ padding: '5px 10px', fontSize: 12 }}
                title="First Page"
              >
                « First
              </button>
              <button
                className="btn btn-outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ padding: '5px 12px', fontSize: 13 }}
              >
                ◄ Prev
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, padding: '0 10px', color: '#1e293b' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{ padding: '5px 12px', fontSize: 13 }}
              >
                Next ►
              </button>
              <button
                className="btn btn-outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                style={{ padding: '5px 10px', fontSize: 12 }}
                title="Last Page"
              >
                Last »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Job Entry Modal */}
      {showNew && (
        <NewJobModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}


