import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

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
  const diffMs = Math.max(0, Date.now() - start);
  return Math.floor(diffMs / 60000);
}

export default function MobileJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completingId, setCompletingId] = useState(null);

  const fetchRunningJobs = useCallback(async () => {
    try {
      const data = await api.get('/jobs?status=in_progress');
      setJobs(data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to refresh active jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRunningJobs();
    // Auto-refresh active jobs queue every 15s
    const interval = setInterval(fetchRunningJobs, 15000);
    return () => clearInterval(interval);
  }, [fetchRunningJobs]);

  async function handleMarkComplete(jobId) {
    setCompletingId(jobId);
    try {
      await api.post(`/jobs/${jobId}/complete`);
      fetchRunningJobs();
    } catch (err) {
      alert('Failed to complete job: ' + err.message);
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div className="mobile-container">
      {/* Top Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/mobile" className="mobile-back-btn">
            ⬅ Scan
          </Link>
          <div>
            <h2 className="mobile-title">📋 Active Jobs Queue</h2>
            <span className="mobile-subtitle">{jobs.length} Vehicle{jobs.length !== 1 ? 's' : ''} in Wash Bay</span>
          </div>
        </div>

        <button
          type="button"
          className="mobile-refresh-icon-btn"
          onClick={fetchRunningJobs}
          title="Refresh Queue"
        >
          🔄
        </button>
      </div>

      <div className="mobile-body">
        {loading && jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌀</div>
            Loading active wash jobs...
          </div>
        ) : error ? (
          <div className="mobile-alert error">❌ {error}</div>
        ) : jobs.length === 0 ? (
          <div className="mobile-empty-state">
            <div style={{ fontSize: 44, marginBottom: 12 }}>✨🚗</div>
            <h3>No Vehicles in Wash Bay</h3>
            <p>All active jobs are complete or none have been started yet.</p>
            <Link to="/mobile" className="mobile-btn mobile-btn-submit mt-16" style={{ display: 'inline-block', textDecoration: 'none' }}>
              📸 Scan New Vehicle
            </Link>
          </div>
        ) : (
          <div className="mobile-jobs-list">
            {jobs.map(job => {
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
                <div key={job.id} className="mobile-job-card">
                  {/* License Plate Badge */}
                  <div className="mobile-plate-badge">
                    <span className="plate-reg">{regNumber}</span>
                  </div>

                  {/* Vehicle Meta */}
                  <div className="mobile-job-details">
                    <div className="job-vehicle-title">
                      {isBike ? '🏍️' : isScooter ? '🛵' : '🚗'} {brand} {model} {color ? `(${color})` : ''}
                    </div>

                    <div className="job-meta-row">
                      <span className="job-wash-type">Package: <strong>{washName}</strong></span>
                      {job.has_chain_lube === 1 && <span className="job-lube-tag">+ Chain Lube</span>}
                    </div>

                    <div className="job-meta-row">
                      <span className="job-type-tag">
                        {job.customer_type === 'workshop' ? `🏭 ${workshopName || 'Workshop'}` : '👤 Retail'}
                      </span>
                      <span className="job-time-tag">
                        🕒 {formatTimeAMPM(entryTime)} {elapsed !== null && `(${elapsed}m ago)`}
                      </span>
                    </div>

                    {job.customer_name && (
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0d9488', marginTop: 3 }}>
                        👤 Customer: {job.customer_name}
                      </div>
                    )}

                    {phone && (
                      <div className="job-phone">
                        📞 <a href={`tel:${phone}`}>{phone}</a>
                      </div>
                    )}

                    {/* Before-Wash Safety Inspection Photos */}
                    {job.before_photos && Array.isArray(job.before_photos) && job.before_photos.length > 0 && (
                      <div style={{ marginTop: 6, background: '#f8fafc', padding: 6, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                          📷 Before-Wash Inspection Photos ({job.before_photos.length}):
                        </div>
                        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                          {job.before_photos.map((pUrl, idx) => (
                            <a key={idx} href={pUrl} target="_blank" rel="noreferrer" title="Click to view full photo">
                              <img
                                src={pUrl}
                                alt={`Before ${idx + 1}`}
                                style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', border: '1px solid #cbd5e1' }}
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* One-Tap Complete Action */}
                  <div className="mobile-job-footer">
                    <div className="job-price-display">₹{price}</div>
                    <button
                      type="button"
                      className="mobile-btn-complete"
                      disabled={completingId === job.id}
                      onClick={() => handleMarkComplete(job.id)}
                    >
                      {completingId === job.id ? 'Completing...' : '✓ Complete Wash'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
