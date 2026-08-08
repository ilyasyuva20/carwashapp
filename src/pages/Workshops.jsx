import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';

export default function Workshops() {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState(null);
  const [deletingWorkshop, setDeletingWorkshop] = useState(null);

  async function loadWorkshops() {
    setLoading(true);
    try {
      const data = await api.get('/workshops');
      setWorkshops(data);
    } catch (err) {
      console.error('Error loading workshops:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkshops();
  }, []);

  // Filtered workshops list
  const filteredWorkshops = workshops.filter(w => {
    const q = search.toLowerCase().trim();
    const nameMatch = (w.name || '').toLowerCase().includes(q);
    const ownerNameMatch = (w.owner_name || '').toLowerCase().includes(q);
    const ownerPhoneMatch = (w.owner_phone || '').toLowerCase().includes(q);
    const phoneMatch = (w.phone || '').toLowerCase().includes(q);
    const addressMatch = (w.address || '').toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || ownerNameMatch || ownerPhoneMatch || phoneMatch || addressMatch;

    const matchesType = typeFilter === 'all' || w.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>🏭 Workshop Management</h1>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
            Add, edit, and manage partner car & bike repair workshops
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '10px 18px' }}>
          + Add Workshop
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div className="flex between center gap-12" style={{ flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search by workshop name, owner, phone, or location..."
              style={{ width: '100%', padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </div>

          {/* Type Filter */}
          <div className="flex center gap-8">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#ffffff', fontWeight: 500 }}
            >
              <option value="all">All Workshop Types</option>
              <option value="Car Workshop">🚗 Car Workshop</option>
              <option value="Bike Workshop">🏍️ Bike Workshop</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workshop Table */}
      {loading ? (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p className="muted">Loading workshops...</p>
        </div>
      ) : filteredWorkshops.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏭</div>
          <h3 style={{ margin: '0 0 4px 0' }}>No Workshops Found</h3>
          <p className="muted" style={{ fontSize: 13, margin: '0 0 16px 0' }}>
            {search || typeFilter !== 'all'
              ? 'No workshops match your current search or type filter.'
              : 'You have not added any workshops yet. Click below to add one.'}
          </p>
          {!search && typeFilter === 'all' && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              + Add First Workshop
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Workshop Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Owner Details</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Workshop Number</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Address</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkshops.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Workshop Name */}
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--foreground)' }}>
                      <div className="flex center gap-10">
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: 'var(--teal-light, #e6fffa)',
                          color: 'var(--teal-dark, #0d9488)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 14
                        }}>
                          {w.name ? w.name.charAt(0).toUpperCase() : 'W'}
                        </div>
                        <div>
                          <div>{w.name}</div>
                        </div>
                      </div>
                    </td>

                    {/* Workshop Type */}
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`pill ${
                        w.type === 'Car Workshop' ? 'pill-teal' : 'pill-amber'
                      }`} style={{ fontSize: 11, padding: '3px 8px' }}>
                        {w.type === 'Car Workshop' ? '🚗 Car Workshop' : '🏍️ Bike Workshop'}
                      </span>
                    </td>

                    {/* Owner Details */}
                    <td style={{ padding: '12px 16px' }}>
                      {w.owner_name || w.owner_phone ? (
                        <div>
                          {w.owner_name && <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>👤 {w.owner_name}</div>}
                          {w.owner_phone && <div style={{ fontSize: 12, color: 'var(--muted)' }}>📞 {w.owner_phone}</div>}
                        </div>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>

                    {/* Workshop Number */}
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      {w.phone ? (
                        <span>☎️ {w.phone}</span>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>

                    {/* Address */}
                    <td style={{ padding: '12px 16px', color: 'var(--muted)', maxWidth: 260, whiteSpace: 'normal' }}>
                      {w.address ? (
                        <span>📍 {w.address}</span>
                      ) : (
                        <span className="muted">No address provided</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div className="flex center gap-8" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-outline"
                          onClick={() => setEditingWorkshop(w)}
                          style={{ padding: '4px 10px', fontSize: 12 }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={() => setDeletingWorkshop(w)}
                          style={{ padding: '4px 10px', fontSize: 12, color: '#e11d48', borderColor: '#fecdd3' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Workshop Modal */}
      {showAddModal && (
        <WorkshopFormModal
          title="🏭 Add New Workshop"
          onClose={() => setShowAddModal(false)}
          onSave={async (data) => {
            await api.post('/workshops', data);
            setShowAddModal(false);
            loadWorkshops();
          }}
        />
      )}

      {/* Edit Workshop Modal */}
      {editingWorkshop && (
        <WorkshopFormModal
          title={`✏️ Edit Workshop — ${editingWorkshop.name}`}
          initialData={editingWorkshop}
          onClose={() => setEditingWorkshop(null)}
          onSave={async (data) => {
            await api.put(`/workshops/${editingWorkshop.id}`, data);
            setEditingWorkshop(null);
            loadWorkshops();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingWorkshop && (
        <DeleteConfirmModal
          workshop={deletingWorkshop}
          onClose={() => setDeletingWorkshop(null)}
          onConfirm={async () => {
            await api.delete(`/workshops/${deletingWorkshop.id}`);
            setDeletingWorkshop(null);
            loadWorkshops();
          }}
        />
      )}
    </div>
  );
}

// Add/Edit Workshop Form Modal
function WorkshopFormModal({ title, initialData, onClose, onSave }) {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState(initialData?.type || 'Car Workshop');
  const [ownerName, setOwnerName] = useState(initialData?.owner_name || '');
  const [ownerPhone, setOwnerPhone] = useState(initialData?.owner_phone || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter workshop name');
      return;
    }
    if (ownerPhone && ownerPhone.length !== 10) {
      setError('Owner phone number must be exactly 10 digits');
      return;
    }
    if (phone && phone.length !== 10) {
      setError('Workshop number must be exactly 10 digits');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        type,
        owner_name: ownerName.trim() || null,
        owner_phone: ownerPhone || null,
        phone: phone || null,
        address: address.trim() || null
      });
    } catch (err) {
      setError(err.message || 'Failed to save workshop');
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
        <div className="flex between center" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Workshop Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Royal Auto Care / City Motors"
              autoFocus
              required
            />
          </div>

          <div className="field">
            <label>Workshop Type *</label>
            <div className="grid grid-2" style={{ gap: 8 }}>
              <button
                type="button"
                className={`btn ${type === 'Car Workshop' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '10px 8px', fontSize: 13 }}
                onClick={() => setType('Car Workshop')}
              >
                🚗 Car Workshop
              </button>
              <button
                type="button"
                className={`btn ${type === 'Bike Workshop' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '10px 8px', fontSize: 13 }}
                onClick={() => setType('Bike Workshop')}
              >
                🏍️ Bike Workshop
              </button>
            </div>
          </div>

          {/* Owner Details Row */}
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label>Owner Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="Owner full name"
              />
            </div>
            <div className="field">
              <label>Owner Phone Number</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={ownerPhone}
                onChange={e => setOwnerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit owner mobile"
              />
              {ownerPhone && ownerPhone.length > 0 && ownerPhone.length !== 10 && (
                <div style={{ color: '#e11d48', fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                  ⚠️ Owner phone must be 10 digits ({ownerPhone.length}/10)
                </div>
              )}
            </div>
          </div>

          <div className="field">
            <label>Workshop Number (10 digits)</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit workshop number / landline"
            />
            {phone && phone.length > 0 && phone.length !== 10 && (
              <div style={{ color: '#e11d48', fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                ⚠️ Workshop number must be 10 digits ({phone.length}/10)
              </div>
            )}
          </div>

          <div className="field">
            <label>Address / Location</label>
            <textarea
              rows={3}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Workshop address or landmarks..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit' }}
            />
          </div>

          <div className="flex gap-8 mt-16">
            <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()} style={{ flex: 1 }}>
              {loading ? 'Saving...' : 'Save Workshop'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({ workshop, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🗑️</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Delete Workshop?</h3>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 20px 0' }}>
          Are you sure you want to delete <strong>{workshop.name}</strong>? This action cannot be undone.
        </p>

        <div className="flex gap-8">
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
          <button className="btn" onClick={handleDelete} disabled={loading} style={{ flex: 1, background: '#e11d48', color: '#ffffff', border: 'none' }}>
            {loading ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
