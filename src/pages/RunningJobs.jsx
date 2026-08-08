import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import NewJobModal from '../components/NewJobModal';

function formatTimeAMPM(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

function getElapsedMinutes(dateStr) {
  if (!dateStr) return null;
  const start = new Date(dateStr).getTime();
  if (isNaN(start)) return null;
  const now = Date.now();
  const diffMs = Math.max(0, now - start);
  return Math.floor(diffMs / 60000);
}

export default function RunningJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  const fetchRunningJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch only jobs with status = in_progress
      const data = await api.get('/jobs?status=in_progress');
      setJobs(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch running jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRunningJobs();
    // Auto-refresh queue every 20 seconds
    const interval = setInterval(fetchRunningJobs, 20000);
    return () => clearInterval(interval);
  }, [fetchRunningJobs]);

  async function handleMarkComplete(jobId) {
    setCompletingId(jobId);
    try {
      await api.post(`/jobs/${jobId}/complete`);
      fetchRunningJobs();
    } catch (err) {
      alert('Error marking job completed: ' + err.message);
    } finally {
      setCompletingId(null);
    }
  }

  async function handleCancelJob(jobId) {
    if (!window.confirm('Are you sure you want to cancel this job?')) return;
    try {
      await api.post(`/jobs/${jobId}/cancel`);
      fetchRunningJobs();
    } catch (err) {
      alert('Error cancelling job: ' + err.message);
    }
  }

  const runningJobs = jobs.filter(j => j.status === 'in_progress');

  const filteredJobs = runningJobs.filter(j => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const reg = (j.vehicle?.reg_number || j.reg_number || '').toLowerCase();
    const ph = j.vehicle?.phone || j.phone || '';
    const b = (j.vehicle?.brand || j.brand || '').toLowerCase();
    const m = (j.vehicle?.model || j.model || '').toLowerCase();
    const w = (j.workshop?.name || j.workshop_name || '').toLowerCase();
    return reg.includes(q) || ph.includes(q) || b.includes(q) || m.includes(q) || w.includes(q);
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Top Header & Primary Action */}
      <div className="flex between center mb-24" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
              🚿 Currently Washing
            </h1>
            <span
              style={{
                background: runningJobs.length > 0 ? '#fef3c7' : '#f1f5f9',
                color: runningJobs.length > 0 ? '#d97706' : '#64748b',
                border: `1px solid ${runningJobs.length > 0 ? '#fcd34d' : '#cbd5e1'}`,
                padding: '4px 14px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 700
              }}
            >
              {runningJobs.length} Vehicle{runningJobs.length !== 1 ? 's' : ''} in Wash Bay
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>
            Live queue of vehicles actively in progress. Mark completed when ready.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowNewModal(true)}
          style={{
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 700,
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span style={{ fontSize: 18 }}>➕</span> New Job Entry
        </button>
      </div>

      {/* Filter / Refresh Bar */}
      <div
        className="card mb-24"
        style={{
          padding: '14px 20px',
          background: '#fff',
          borderRadius: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ flex: 1, maxWidth: 400 }}>
          <input
            type="text"
            placeholder="🔍 Search vehicle no, phone, brand/model..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: 14,
              borderRadius: 8,
              border: '1px solid var(--border)'
            }}
          />
        </div>

        <button
          className="btn btn-secondary"
          onClick={fetchRunningJobs}
          style={{ padding: '9px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>🔄</span> Refresh Queue
        </button>
      </div>

      {/* Running Vehicles Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🌀</div>
          Loading in-progress wash queue...
        </div>
      ) : error ? (
        <div style={{ padding: 20, background: '#fef2f2', color: '#dc2626', borderRadius: 12, border: '1px solid #fecaca' }}>
          ❌ {error}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#fff',
            borderRadius: 16,
            border: '2px dashed #cbd5e1'
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚗✨</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 20, color: '#1e293b' }}>
            {search ? 'No matching running jobs found' : 'No Vehicles Currently Washing'}
          </h3>
          <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 14 }}>
            {search ? 'Try clearing your search query.' : 'There are no active jobs in progress in the wash bay.'}
          </p>
          {!search && (
            <button
              className="btn btn-primary"
              onClick={() => setShowNewModal(true)}
              style={{ padding: '12px 20px', fontSize: 14, fontWeight: 600 }}
            >
              ➕ Start New Wash Job
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 20
          }}
        >
          {filteredJobs.map(job => {
            const vehicle = job.vehicle || {};
            const regNumber = vehicle.reg_number || job.reg_number || 'N/A';
            const brand = vehicle.brand || '';
            const model = vehicle.model || '';
            const color = vehicle.color || '';
            const segment = vehicle.segment || '';
            const phone = vehicle.phone || job.phone;
            const washName = job.wash_type?.name || (segment === 'bike' ? 'Bike Wash' : segment === 'scooter' ? 'Scooter Wash' : 'Car Wash');
            const workshopName = job.workshop?.name || job.workshop_name;
            const price = job.price ?? job.total_price ?? 0;
            const entryTime = job.entry_time || job.created_at;
            const elapsed = getElapsedMinutes(entryTime);

            const isBike = segment === 'bike';
            const isScooter = segment === 'scooter';

            return (
              <div
                key={job.id}
                className="card"
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  border: '1.5px solid #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex between center mb-12">
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: job.customer_type === 'workshop' ? '#ccfbf1' : '#e0f2fe',
                        color: job.customer_type === 'workshop' ? '#0f766e' : '#0369a1',
                        border: `1px solid ${job.customer_type === 'workshop' ? '#99f6e4' : '#bae6fd'}`
                      }}
                    >
                      {job.customer_type === 'workshop'
                        ? `🏭 ${workshopName || 'Workshop'}`
                        : '👤 Retail Customer'}
                    </span>

                    <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                      🕒 Started {formatTimeAMPM(entryTime)}
                      {elapsed !== null && ` (${elapsed}m ago)`}
                    </span>
                  </div>

                  {/* Vehicle Number Plate */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #0284c7',
                      borderRadius: 10,
                      padding: '10px 14px',
                      marginBottom: 14,
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.08em', color: '#0f172a', fontFamily: 'monospace' }}>
                      {regNumber}
                    </div>
                  </div>

                  {/* Vehicle & Wash Package Details */}
                  <div style={{ fontSize: 14, color: '#334155', marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{isBike ? '🏍️' : isScooter ? '🛵' : '🚗'}</span>
                      <span>
                        {brand} {model}
                      </span>
                      {color && (
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginLeft: 4 }}>
                          ({color})
                        </span>
                      )}
                    </div>

                    <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>
                      Package: <strong style={{ color: '#0f172a' }}>{washName}</strong>
                      {job.has_chain_lube === 1 && (
                        <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '2px 6px', borderRadius: 4, marginLeft: 6, fontSize: 11, fontWeight: 600 }}>
                          + ⚙️ Chain Lube
                        </span>
                      )}
                    </div>

                    {phone && (
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                        📞 Contact: <a href={`tel:${phone}`} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>{phone}</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  <div className="flex between center mb-12">
                    <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Total Amount:</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: '#0284c7' }}>
                      ₹{price}
                    </span>
                  </div>

                  <div className="flex gap-8">
                    <button
                      className="btn"
                      onClick={() => handleMarkComplete(job.id)}
                      disabled={completingId === job.id}
                      style={{
                        flex: 1,
                        background: '#10b981',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 14,
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      {completingId === job.id ? 'Saving...' : '✓ Complete Wash'}
                    </button>

                    <button
                      className="btn btn-outline"
                      onClick={() => handleCancelJob(job.id)}
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: '#ef4444',
                        borderColor: '#fca5a5',
                        borderRadius: 10
                      }}
                      title="Cancel Job"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for New Job Entry */}
      {showNewModal && (
        <NewJobModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false);
            fetchRunningJobs();
          }}
        />
      )}
    </div>
  );
}
