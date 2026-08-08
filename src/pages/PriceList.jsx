import { useState, useEffect } from 'react';
import { api } from '../api';

const CAR_SEGMENTS = [
  { id: 'hatchback', name: 'Hatchback', icon: '🚗' },
  { id: 'sedan_compact_suv', name: 'Sedan / Compact SUV', icon: '🚘' },
  { id: 'suv', name: 'SUV', icon: '🚙' },
  { id: 'premium_hatch', name: 'Premium Hatch', icon: '✨🚗' },
  { id: 'premium_sedan_suv', name: 'Premium Sedan / SUV', icon: '⭐🚘' },
  { id: 'muv', name: 'MUV', icon: '🚐' }
];

const TWO_WHEELER_SEGMENTS = [
  { id: 'bike', name: 'Bike', icon: '🏍️' },
  { id: 'scooter', name: 'Scooter', icon: '🛵' }
];

const ALL_SEGMENTS = [...CAR_SEGMENTS, ...TWO_WHEELER_SEGMENTS];

export default function PriceList() {
  const [washTypes, setWashTypes] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [pricingType, setPricingType] = useState('normal'); // 'normal' | 'workshop'
  const [selectedWorkshopId, setSelectedWorkshopId] = useState(''); // '' means default workshop rates
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editedPrices, setEditedPrices] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      let ws = [];
      try {
        ws = await api.get('/workshops');
      } catch (e) {
        console.warn('Workshops API error:', e);
      }
      setWorkshops(Array.isArray(ws) ? ws : []);

      let url = '/wash-types';
      if (pricingType === 'workshop' && selectedWorkshopId) {
        url += `?workshop_id=${selectedWorkshopId}`;
      }
      const wt = await api.get(url);
      const wtArray = Array.isArray(wt) ? wt : [];
      setWashTypes(wtArray);

      // Initialize local edit state map: `${washTypeId}_${segment}` -> price
      const initialMap = {};
      wtArray.forEach(t => {
        const is2Wheeler = t.name.includes('Bike') || t.name.includes('Chain') || t.name.includes('Scooter');
        let segs = is2Wheeler ? TWO_WHEELER_SEGMENTS : CAR_SEGMENTS;
        if (t.name.includes('Chain')) {
          segs = TWO_WHEELER_SEGMENTS.filter(s => s.id === 'bike');
        }
        segs.forEach(seg => {
          const priceObj = pricingType === 'normal' ? t.pricing : t.workshop_pricing;
          initialMap[`${t.id}_${seg.id}`] = priceObj?.[seg.id] ?? 0;
        });
      });
      setEditedPrices(initialMap);
    } catch (e) {
      console.error('Error loading price list data:', e);
      setError(`Unable to connect to server or load price list (${e.message}). Please make sure backend is running.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [pricingType, selectedWorkshopId]);

  function handlePriceChange(washTypeId, segmentId, val) {
    setEditedPrices(prev => ({
      ...prev,
      [`${washTypeId}_${segmentId}`]: val
    }));
  }

  async function saveAllPrices() {
    setSaving(true);
    setMsg('');
    try {
      for (const t of washTypes) {
        const is2Wheeler = t.name.includes('Bike') || t.name.includes('Chain') || t.name.includes('Scooter');
        let segs = is2Wheeler ? TWO_WHEELER_SEGMENTS : CAR_SEGMENTS;
        if (t.name.includes('Chain')) {
          segs = TWO_WHEELER_SEGMENTS.filter(s => s.id === 'bike');
        }
        for (const seg of segs) {
          const key = `${t.id}_${seg.id}`;
          const newPrice = Number(editedPrices[key]);
          if (pricingType === 'normal') {
            await api.put(`/wash-types/pricing/${t.id}/${seg.id}`, { price: newPrice });
          } else {
            await api.put(`/wash-types/workshop-pricing/${t.id}/${seg.id}`, {
              price: newPrice,
              workshop_id: selectedWorkshopId || null
            });
          }
        }
      }
      setMsg('✅ Price list updated successfully!');
      setEditMode(false);
      await loadData();
    } catch (e) {
      setMsg(`❌ Error saving prices: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  const selectedWorkshopObj = workshops.find(w => w.id === Number(selectedWorkshopId));

  // Determine which sections to show based on selected workshop type
  let showCarPackages = true;
  let showBikePackages = true;

  if (pricingType === 'workshop' && selectedWorkshopObj) {
    if (selectedWorkshopObj.type === 'Car Workshop') {
      showCarPackages = true;
      showBikePackages = false;
    } else if (selectedWorkshopObj.type === 'Bike Workshop') {
      showCarPackages = false;
      showBikePackages = true;
    }
  }

  async function saveAllPrices() {
    setSaving(true);
    setMsg('');
    try {
      for (const t of washTypes) {
        const is2Wheeler = t.name.includes('Bike') || t.name.includes('Chain') || t.name.includes('Scooter');

        if (!is2Wheeler && !showCarPackages) continue;
        if (is2Wheeler && !showBikePackages) continue;

        let segs = is2Wheeler ? TWO_WHEELER_SEGMENTS : CAR_SEGMENTS;
        if (t.name.includes('Chain')) {
          segs = TWO_WHEELER_SEGMENTS.filter(s => s.id === 'bike');
        }
        for (const seg of segs) {
          const key = `${t.id}_${seg.id}`;
          const newPrice = Number(editedPrices[key]);
          if (pricingType === 'normal') {
            await api.put(`/wash-types/pricing/${t.id}/${seg.id}`, { price: newPrice });
          } else {
            await api.put(`/wash-types/workshop-pricing/${t.id}/${seg.id}`, {
              price: newPrice,
              workshop_id: selectedWorkshopId || null
            });
          }
        }
      }
      setMsg('✅ Price list updated successfully!');
      setEditMode(false);
      await loadData();
    } catch (e) {
      setMsg(`❌ Error saving prices: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Single-Line Modern Header & Controls Toolbar */}
      <div
        className="card mb-20"
        style={{
          padding: '10px 18px',
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: 12
        }}
      >
        {/* Left: Page Title + Segmented Rate Switcher + Target Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: 18, color: '#0f172a', letterSpacing: '-0.4px', lineHeight: 1.1 }}>
              Price List
            </h2>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
              Rate Configuration
            </span>
          </div>

          {/* Vertical Separator */}
          <div style={{ width: 1, height: 24, background: '#cbd5e1' }} />

          {/* Rate Type Segmented Tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 9, gap: 3 }}>
            <button
              type="button"
              onClick={() => { setPricingType('normal'); setEditMode(false); }}
              style={{
                padding: '6px 13px',
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 7,
                border: 'none',
                background: pricingType === 'normal' ? '#0d9488' : 'transparent',
                color: pricingType === 'normal' ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: pricingType === 'normal' ? '0 2px 6px rgba(13,148,136,0.25)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <span>👤</span>
              <span>Normal Rates</span>
            </button>
            <button
              type="button"
              onClick={() => { setPricingType('workshop'); setEditMode(false); }}
              style={{
                padding: '6px 13px',
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 7,
                border: 'none',
                background: pricingType === 'workshop' ? '#7c3aed' : 'transparent',
                color: pricingType === 'workshop' ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: pricingType === 'workshop' ? '0 2px 6px rgba(124,58,237,0.25)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <span>🏭</span>
              <span>Workshop Rates</span>
            </button>
          </div>

          {/* Target Workshop Select */}
          {pricingType === 'workshop' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b21a8' }}>
                Target:
              </span>
              <select
                value={selectedWorkshopId}
                onChange={e => { setSelectedWorkshopId(e.target.value); setEditMode(false); }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1.5px solid #c4b5fd',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#581c87',
                  background: '#faf5ff',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: 210,
                  textOverflow: 'ellipsis'
                }}
              >
                <option value="">⚙️ Default Garage (All)</option>
                {workshops.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.type === 'Car Workshop' ? '🚗' : '🏍️'} {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {editMode ? (
            <>
              <button
                className="btn btn-outline"
                onClick={() => { setEditMode(false); loadData(); }}
                disabled={saving}
                style={{
                  padding: '6px 12px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  borderRadius: 8,
                  borderColor: '#cbd5e1',
                  color: '#475569'
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={saveAllPrices}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
                  border: 'none'
                }}
              >
                {saving ? 'Saving...' : '💾 Save Prices'}
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setEditMode(true)}
              style={{
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(13,148,136,0.25)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <span>✏️</span>
              <span>Edit Prices</span>
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="card mb-20" style={{ padding: '12px 18px', background: msg.includes('❌') ? '#fef2f2' : '#f0fdf4', border: msg.includes('❌') ? '1px solid #fecaca' : '1px solid #bbf7d0', color: msg.includes('❌') ? '#991b1b' : '#166534', borderRadius: 10, fontWeight: 600, fontSize: 13 }}>
          {msg}
        </div>
      )}

      {error && (
        <div className="card mb-20" style={{ padding: '16px 20px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>⚠️ Error loading Price List</div>
          <div style={{ fontSize: 13 }}>{error}</div>
          <button className="btn btn-outline" onClick={loadData} style={{ marginTop: 10, fontSize: 12, padding: '4px 12px' }}>
            🔄 Retry Loading
          </button>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
          ⏳ Loading prices...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* CAR WASH PACKAGES */}
          {showCarPackages && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>🚗 Car Wash Packages</h2>
                <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 12 }}>
                  Pricing per Car Segment
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {washTypes.filter(wt => !wt.name.includes('Bike') && !wt.name.includes('Chain') && !wt.name.includes('Scooter')).map(wt => (
                  <div key={wt.id} className="card" style={{ padding: '20px 24px', borderRadius: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                          {wt.name}
                        </h3>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {pricingType === 'normal' ? 'Retail Price per Vehicle Type' : 'Garage / Workshop Rate per Vehicle Type'}
                        </span>
                      </div>
                      <span className={`pill ${pricingType === 'normal' ? 'pill-teal' : 'pill-purple'}`} style={{ fontSize: 12, fontWeight: 600 }}>
                        {pricingType === 'normal' ? 'Normal Customer' : (selectedWorkshopObj ? selectedWorkshopObj.name : 'Default Garage Rate')}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, overflowX: 'auto' }}>
                      {CAR_SEGMENTS.map(seg => {
                        const currentPriceMap = pricingType === 'normal' ? wt.pricing : wt.workshop_pricing;
                        const priceVal = editedPrices[`${wt.id}_${seg.id}`] ?? currentPriceMap?.[seg.id] ?? 0;

                        return (
                          <div
                            key={seg.id}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 10,
                              padding: '10px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              minWidth: 0
                            }}
                          >
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={seg.name}>
                              <span style={{ fontSize: 13 }}>{seg.icon}</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{seg.name}</span>
                            </div>

                            {editMode ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>₹</span>
                                <input
                                  type="number"
                                  value={priceVal}
                                  onChange={e => handlePriceChange(wt.id, seg.id, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    borderRadius: 6,
                                    border: '1.5px solid #0d9488',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: '#0f172a'
                                  }}
                                />
                              </div>
                            ) : (
                              <div style={{ fontSize: 16, fontWeight: 800, color: pricingType === 'normal' ? '#0d9488' : '#7c3aed' }}>
                                ₹{priceVal}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BIKE & SCOOTER SERVICES */}
          {showBikePackages && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>🏍️ Bike & Scooter Services</h2>
                <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 12 }}>
                  Standalone Wash & Maintenance Rates
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {washTypes.filter(wt => wt.name.includes('Bike') || wt.name.includes('Chain') || wt.name.includes('Scooter')).map(wt => (
                  <div key={wt.id} className="card" style={{ padding: '20px 24px', borderRadius: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                          {wt.name}
                        </h3>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {pricingType === 'normal' ? 'Retail Rate' : 'Garage / Workshop Rate'}
                        </span>
                      </div>
                      <span className={`pill ${pricingType === 'normal' ? 'pill-teal' : 'pill-purple'}`} style={{ fontSize: 12, fontWeight: 600 }}>
                        {pricingType === 'normal' ? 'Normal Customer' : (selectedWorkshopObj ? selectedWorkshopObj.name : 'Default Garage Rate')}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, overflowX: 'auto' }}>
                      {(wt.name.includes('Chain') ? TWO_WHEELER_SEGMENTS.filter(s => s.id === 'bike') : TWO_WHEELER_SEGMENTS).map(seg => {
                        const currentPriceMap = pricingType === 'normal' ? wt.pricing : wt.workshop_pricing;
                        const priceVal = editedPrices[`${wt.id}_${seg.id}`] ?? currentPriceMap?.[seg.id] ?? 0;

                        return (
                          <div
                            key={seg.id}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 10,
                              padding: '10px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              minWidth: 0
                            }}
                          >
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={seg.name}>
                              <span style={{ fontSize: 13 }}>{seg.icon}</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{seg.name}</span>
                            </div>

                            {editMode ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>₹</span>
                                <input
                                  type="number"
                                  value={priceVal}
                                  onChange={e => handlePriceChange(wt.id, seg.id, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    borderRadius: 6,
                                    border: '1.5px solid #0d9488',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: '#0f172a'
                                  }}
                                />
                              </div>
                            ) : (
                              <div style={{ fontSize: 16, fontWeight: 800, color: pricingType === 'normal' ? '#0d9488' : '#7c3aed' }}>
                                ₹{priceVal}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
