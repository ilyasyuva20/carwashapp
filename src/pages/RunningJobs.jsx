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
    <div className="running-jobs-page">
      {/* Top Header & Primary Action */}
      <div className="running-jobs-header">
        <div>
          <div className="running-jobs-title-row">
            <span className="section-icon" aria-hidden="true">W</span>
            <h1>Wash bay queue</h1>
            <span className="queue-count">{runningJobs.length} active</span>
          </div>
          <p className="running-jobs-subtitle">Monitor active services and close each job when the vehicle is ready.</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="btn btn-primary running-jobs-new"
        >
          <span aria-hidden="true">+</span> New wash job
        </button>
      </div>

      {/* Filter / Refresh Bar */}
      <div
        className="running-jobs-toolbar"
      >
        <div className="running-jobs-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="text"
            placeholder="Search registration, phone, brand or model"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={fetchRunningJobs}
          className="btn btn-secondary running-jobs-refresh"
          title="Refresh queue"
        >
          <span aria-hidden="true">↻</span> Refresh
        </button>
      </div>

      {/* Running Vehicles Grid */}
      {loading ? (
        <div className="running-jobs-state">
          <div className="state-icon" aria-hidden="true">W</div>
          Loading active jobs...
        </div>
      ) : error ? (
        <div className="running-jobs-error">
          <strong>Unable to load queue</strong><span>{error}</span>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="running-jobs-empty">
          <div className="empty-icon" aria-hidden="true">W</div>
          <h3>
            {search ? 'No matching running jobs found' : 'No Vehicles Currently Washing'}
          </h3>
          <p>
            {search ? 'Try clearing your search query.' : 'There are no active jobs in progress in the wash bay.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowNewModal(true)}
              className="btn btn-primary"
            >
              + Start new wash job
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16
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
                  borderRadius: 12,
                  padding: 18,
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                  border: '1px solid var(--border)',
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
                        ? `Workshop: ${workshopName || 'Workshop'}`
                        : 'Retail customer'}
                    </span>

                    <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                      Started {formatTimeAMPM(entryTime)}
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
                      <span className="vehicle-type-icon" aria-hidden="true">{isBike ? 'B' : isScooter ? 'S' : 'C'}</span>
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
                      Package <strong style={{ color: '#0f172a' }}>{washName}</strong>
                      {job.has_chain_lube === 1 && (
                        <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '2px 6px', borderRadius: 4, marginLeft: 6, fontSize: 11, fontWeight: 600 }}>
                          + Chain lube
                        </span>
                      )}
                    </div>

                    {phone && (
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                        Contact <a href={`tel:${phone}`} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>{phone}</a>
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
                      {completingId === job.id ? 'Saving...' : 'Complete wash'}
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
                      <span aria-hidden="true">×</span>
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
