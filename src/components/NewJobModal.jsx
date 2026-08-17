import { useState, useEffect } from 'react';
import { api } from '../api';
import { getBrandsForSegment, getModelsForBrand, COMMON_VEHICLE_COLORS, normalizeValue } from '../utils/vehicleOptions';

export default function NewJobModal({ onClose, onCreated }) {
  const [washTypes, setWashTypes] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [regNumber, setRegNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState(null);
  const [washTypeId, setWashTypeId] = useState('');
  const [hasChainLube, setHasChainLube] = useState(false);

  // New Fields: Customer Name & Customer Type & Workshop & Payment Settlement & Before Photos
  const [customerName, setCustomerName] = useState('');
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [customerType, setCustomerType] = useState('normal'); // 'normal' | 'workshop'
  const [workshopId, setWorkshopId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unsettled'); // 'unsettled' | 'settled'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [customBrandMode, setCustomBrandMode] = useState(false);
  const [customModelMode, setCustomModelMode] = useState(false);
  const [customColorMode, setCustomColorMode] = useState(false);

  useEffect(() => {
    let url = '/wash-types';
    if (customerType === 'workshop') {
      url += `?workshop_id=${workshopId || 0}`;
    }
    api.get(url).then(data => {
      setWashTypes(data);
      if (Array.isArray(data) && data.length > 0 && !washTypeId) {
        setWashTypeId(String(data[0].id));
      }
    });
    api.get('/workshops').then(setWorkshops);
  }, [customerType, workshopId]);

const REGEX_PLATE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$|^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;

  async function lookup() {
    const cleanReg = regNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanReg) {
      setError('Please enter a registration number');
      return;
    }
    if (!REGEX_PLATE.test(cleanReg)) {
      setError('Invalid Registration Number format (e.g. KL32L2011 or 22BH1234A)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const v = await api.get(`/vehicles/lookup/${cleanReg}`);
      setVehicle(v);
      setRegNumber(cleanReg);
      if (v.phone) {
        setPhone(v.phone);
      } else {
        setPhone('');
      }
      if (v.customer_name) {
        setCustomerName(v.customer_name);
      } else {
        setCustomerName('');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

function compressImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (canvasErr) {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://carwashapp-xwz9.onrender.com${url}`;
}

  async function handleBeforePhotoUpload(e, slotIndex) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressedUrl = await compressImage(file);
      if (compressedUrl) {
        setBeforePhotos(prev => {
          const next = [...prev];
          next[slotIndex] = compressedUrl;
          return next;
        });
      }
    } catch (err) {
      console.error('Photo processing failed:', err);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  }

  function removeBeforePhoto(slotIndex) {
    setBeforePhotos(prev => {
      const next = [...prev];
      next.splice(slotIndex, 1);
      return next;
    });
  }

  function updateVehicleField(field, value) {
    setVehicle({ ...vehicle, [field]: value });
  }

  async function saveVehicleCorrections() {
    if (!vehicle || !vehicle.id) return;
    await api.put(`/vehicles/${vehicle.id}`, {
      brand: vehicle.brand, model: vehicle.model, segment: vehicle.segment, color: vehicle.color
    }).catch(err => console.error('Failed to save vehicle corrections:', err));
  }

  const isBike = vehicle?.segment === 'bike';
  const isScooter = vehicle?.segment === 'scooter';
  const isCar = vehicle && !isBike && !isScooter;

  const filteredWorkshops = workshops.filter(w => {
    if (isCar) return w.type === 'Car Workshop';
    if (isBike || isScooter) return w.type === 'Bike Workshop';
    return true;
  });

  useEffect(() => {
    if (customerType === 'workshop' && workshopId) {
      const currentW = workshops.find(w => String(w.id) === String(workshopId));
      if (currentW) {
        if (isCar && currentW.type !== 'Car Workshop') {
          setWorkshopId('');
        } else if ((isBike || isScooter) && currentW.type !== 'Bike Workshop') {
          setWorkshopId('');
        } else {
          if (currentW.name) setCustomerName(currentW.name);
          if (currentW.phone) setPhone(currentW.phone.replace(/\D/g, ''));
        }
      }
    }
  }, [vehicle?.segment, workshops, workshopId, customerType, isCar, isBike, isScooter]);

  const carWashTypes = washTypes.filter(wt => !wt.name.toLowerCase().includes('bike') && !wt.name.toLowerCase().includes('scooter') && !wt.name.toLowerCase().includes('chain'));
  const bikeWashType = washTypes.find(wt => wt.name.includes('Bike') || wt.name.includes('Scooter'));
  const chainLubeType = washTypes.find(wt => wt.name.includes('Chain'));
  const selectedWashId = (isBike || isScooter)
    ? (bikeWashType ? bikeWashType.id : (washTypes[0]?.id || 1))
    : (washTypeId ? parseInt(washTypeId) : (carWashTypes[0]?.id || washTypes[0]?.id || 1));

  const dynamicLubePrice = customerType === 'workshop'
    ? (chainLubeType?.workshop_pricing?.bike ?? chainLubeType?.pricing?.bike ?? 150)
    : (chainLubeType?.pricing?.bike ?? 150);

  async function createJob() {
    const cleanReg = (vehicle?.reg_number || regNumber).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanReg) {
      setError('Registration number is required');
      return;
    }
    if (!REGEX_PLATE.test(cleanReg)) {
      setError('Invalid Registration Number format (e.g. KL32L2011 or 22BH1234A)');
      return;
    }
    if (!vehicle?.brand || !vehicle.brand.trim()) {
      setError('Vehicle Brand is required (e.g. Honda, Maruti, TVS)');
      return;
    }
    if (!vehicle?.model || !vehicle.model.trim()) {
      setError('Vehicle Model is required (e.g. Activa, Swift, Jupiter)');
      return;
    }
    if (!vehicle?.color || !vehicle.color.trim()) {
      setError('Vehicle Color is required (e.g. White, Red, Blue)');
      return;
    }
    if (customerType === 'workshop' && !workshopId) {
      setError('Please select a workshop for workshop customer vehicles');
      return;
    }
    if (!customerName || !customerName.trim()) {
      setError(customerType === 'workshop' ? 'Workshop Partner Name is required' : 'Customer Name is required');
      return;
    }
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Mobile phone number is required and must be exactly 10 digits');
      return;
    }
    if (isCar && !selectedWashId) {
      setError('Please select a wash package for the car');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await saveVehicleCorrections();
      await api.post('/jobs', {
        reg_number: vehicle.reg_number,
        wash_type_id: selectedWashId,
        eta_minutes: 30,
        phone: cleanPhone,
        customer_name: customerName.trim(),
        before_photos: beforePhotos.filter(Boolean),
        has_chain_lube: isBike ? hasChainLube : false,
        chain_lube_price: dynamicLubePrice,
        customer_type: customerType,
        workshop_id: (customerType === 'workshop' && workshopId) ? parseInt(workshopId) : null,
        payment_status: paymentStatus
      });
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  let baseWashPrice = null;
  const currentSegment = vehicle?.segment;
  if (currentSegment) {
    const selectedWash = (isBike || isScooter)
      ? bikeWashType
      : washTypes.find(wt => wt.id === parseInt(washTypeId));

    if (selectedWash) {
      const priceMap = customerType === 'workshop' ? (selectedWash.workshop_pricing || selectedWash.pricing) : selectedWash.pricing;
      baseWashPrice = priceMap?.[currentSegment] ?? (isBike || isScooter ? 250 : null);
    } else if (isBike || isScooter) {
      baseWashPrice = 250;
    }
  }

  const totalPrice = baseWashPrice !== null ? (baseWashPrice + (isBike && hasChainLube ? dynamicLubePrice : 0)) : null;

return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16
      }}
      onClick={onClose}
    >
      {/* 🌀 Full Page Blur Backdrop Overlay Loader */}
      {(ocrScanning || uploadingPhoto || loading) && (
        <div className="fullpage-loader-backdrop">
          <div className="loader-card">
            <div className="spinner-outer-ring">
              <span className="spinner-center-icon">
                {ocrScanning ? '🔍' : uploadingPhoto ? '📸' : '🚀'}
              </span>
            </div>
            <h4 className="loader-title">
              {ocrScanning
                ? 'Scanning License Plate...'
                : uploadingPhoto
                ? 'Uploading Vehicle Photo...'
                : 'Processing Details...'}
            </h4>
            <p className="loader-subtitle">
              {ocrScanning
                ? 'AI Vision is reading the registration plate from image'
                : uploadingPhoto
                ? 'Compressing & saving inspection photo securely'
                : 'Connecting to VAHAN database & initializing job'}
            </p>
            <div className="loader-progress-bar">
              <div className="loader-progress-fill" />
            </div>
          </div>
        </div>
      )}

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 580,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          padding: '24px 28px',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex between center mb-16" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: 18, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📱</span> New Job Entry
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Step 1: Vehicle Lookup Input */}
        <div className="field mb-16">
          <label style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block', color: 'var(--muted)' }}>
            Registration Number
          </label>
          <div className="flex gap-8">
            <input
              type="text"
              placeholder="e.g. KL32L2011"
              value={regNumber}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              inputMode="text"
              onChange={e => setRegNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && lookup()}
              style={{ fontSize: 16 }}
            />
            <button
              className="btn btn-secondary"
              onClick={lookup}
              disabled={loading}
              style={{ padding: '12px 18px', fontSize: 15 }}
            >
              {loading ? '...' : 'Fetch'}
            </button>
          </div>
        </div>

        {vehicle && (
          <>
            {vehicle.source === 'mock' && (
              <p style={{ fontSize: 12, color: '#d97706', margin: '4px 0 12px' }}>
                Auto-filled details — double check with customer below:
              </p>
            )}

            {/* Prominent Vehicle Type Segmented Switcher */}
            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, display: 'block', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vehicle Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    if (!isCar) updateVehicleField('segment', 'hatchback');
                  }}
                  style={{
                    padding: '10px 4px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: 'none',
                    background: isCar ? '#0284c7' : 'transparent',
                    color: isCar ? '#ffffff' : '#64748b',
                    boxShadow: isCar ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  🚗 Car
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => updateVehicleField('segment', 'bike')}
                  style={{
                    padding: '10px 4px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: 'none',
                    background: isBike ? '#8b5cf6' : 'transparent',
                    color: isBike ? '#fff' : '#64748b',
                    boxShadow: isBike ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  🏍️ Bike (₹{customerType === 'workshop' ? (bikeWashType?.workshop_pricing?.bike ?? bikeWashType?.pricing?.bike ?? 250) : (bikeWashType?.pricing?.bike ?? 250)})
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => updateVehicleField('segment', 'scooter')}
                  style={{
                    padding: '10px 4px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: 'none',
                    background: isScooter ? '#d97706' : 'transparent',
                    color: isScooter ? '#fff' : '#64748b',
                    boxShadow: isScooter ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  🛵 Scooter (₹{customerType === 'workshop' ? (bikeWashType?.workshop_pricing?.scooter ?? bikeWashType?.pricing?.scooter ?? 250) : (bikeWashType?.pricing?.scooter ?? 250)})
                </button>
              </div>
            </div>

            {/* Car Segment Sub-Select */}
            {isCar && (
              <div className="field mb-16" style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <label style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, display: 'block', color: '#475569' }}>
                  Car Body Segment
                </label>
                <select
                  value={vehicle.segment || 'hatchback'}
                  onChange={e => updateVehicleField('segment', e.target.value)}
                  style={{ fontSize: 14, fontWeight: 500 }}
                >
                  <option value="hatchback">Hatchback</option>
                  <option value="sedan_compact_suv">Sedan / Compact SUV</option>
                  <option value="suv">SUV</option>
                  <option value="premium_hatch">Premium Hatch</option>
                  <option value="premium_sedan_suv">Premium Sedan / SUV</option>
                  <option value="muv">MUV</option>
                </select>
              </div>
            )}

            {/* CUSTOMER TYPE SELECTION: Normal vs Workshop Vehicle */}
            <div className="field mb-16" style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <label style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, display: 'block', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Customer Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCustomerType('normal')}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: customerType === 'normal' ? '#0284c7' : '#cbd5e1',
                    background: customerType === 'normal' ? '#e0f2fe' : '#fff',
                    color: customerType === 'normal' ? '#0369a1' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  👤 Normal Customer
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setCustomerType('workshop')}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: customerType === 'workshop' ? '#0d9488' : '#cbd5e1',
                    background: customerType === 'workshop' ? '#ccfbf1' : '#fff',
                    color: customerType === 'workshop' ? '#0f766e' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  🏭 Workshop Vehicle
                </button>
              </div>

              {/* WORKSHOP SELECTION DROPDOWN (If Workshop Customer) */}
              {customerType === 'workshop' && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, display: 'block', color: '#0f766e' }}>
                    Select {isCar ? 'Car Workshop' : (isBike || isScooter) ? 'Bike Workshop' : 'Workshop'} Partner
                  </label>
                  {filteredWorkshops.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#b45309', padding: '6px 10px', background: '#fffbeb', borderRadius: 6, border: '1px solid #fde68a' }}>
                      ⚠️ No {isCar ? 'Car workshops' : 'Bike workshops'} registered yet. Please add them from the Workshops menu.
                    </div>
                  ) : (
                    <select
                      value={workshopId}
                      onChange={e => setWorkshopId(e.target.value)}
                      style={{ fontSize: 14, fontWeight: 500, width: '100%', borderColor: '#0d9488' }}
                    >
                      <option value="">
                        -- Choose {isCar ? 'Car Workshop' : (isBike || isScooter) ? 'Bike Workshop' : 'Registered Workshop'} --
                      </option>
                      {filteredWorkshops.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.type === 'Car Workshop' ? '🚗' : '🏍️'} {w.name} {w.phone ? `(${w.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* 4-Column Grid for Editable Vehicle Attributes */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr', gap: 8, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Brand <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {(() => {
                  const brands = getBrandsForSegment(vehicle.segment);
                  const rawBrand = vehicle.brand || '';
                  const displayBrand = normalizeValue(rawBrand, brands);
                  if (!customBrandMode) {
                    return (
                      <select
                        style={{ fontSize: 13, padding: '8px 10px', width: '100%', borderRadius: 8, border: '1px solid var(--border)', background: 'white' }}
                        value={displayBrand}
                        onChange={e => {
                          if (e.target.value === '__OTHER__') {
                            setCustomBrandMode(true);
                            updateVehicleField('brand', '');
                          } else {
                            setCustomBrandMode(false);
                            updateVehicleField('brand', e.target.value);
                          }
                        }}
                      >
                        <option value="">-- Select Brand --</option>
                        {brands.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                        {displayBrand && !brands.includes(displayBrand) && (
                          <option value={displayBrand}>{displayBrand}</option>
                        )}
                        <option value="__OTHER__">✏️ + Custom / Other</option>
                      </select>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        type="text"
                        placeholder="Brand..."
                        value={rawBrand}
                        onChange={e => updateVehicleField('brand', e.target.value)}
                        style={{ fontSize: 13, padding: '8px 10px', width: '100%' }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={() => { setCustomBrandMode(false); updateVehicleField('brand', ''); }}
                        title="Back to list"
                      >
                        📋
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Model <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {(() => {
                  const models = getModelsForBrand(vehicle.brand);
                  const rawModel = vehicle.model || '';
                  const displayModel = normalizeValue(rawModel, models);
                  if (!customModelMode) {
                    return (
                      <select
                        style={{ fontSize: 13, padding: '8px 10px', width: '100%', borderRadius: 8, border: '1px solid var(--border)', background: 'white' }}
                        value={displayModel}
                        onChange={e => {
                          if (e.target.value === '__OTHER__') {
                            setCustomModelMode(true);
                            updateVehicleField('model', '');
                          } else {
                            setCustomModelMode(false);
                            updateVehicleField('model', e.target.value);
                          }
                        }}
                      >
                        <option value="">-- Select Model --</option>
                        {models.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                        {displayModel && !models.includes(displayModel) && (
                          <option value={displayModel}>{displayModel}</option>
                        )}
                        <option value="__OTHER__">✏️ + Custom / Other</option>
                      </select>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        type="text"
                        placeholder="Model..."
                        value={rawModel}
                        onChange={e => updateVehicleField('model', e.target.value)}
                        style={{ fontSize: 13, padding: '8px 10px', width: '100%' }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={() => { setCustomModelMode(false); updateVehicleField('model', ''); }}
                        title="Back to list"
                      >
                        📋
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Color <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {(() => {
                  const rawColor = vehicle.color || '';
                  const displayColor = normalizeValue(rawColor, COMMON_VEHICLE_COLORS);
                  if (!customColorMode) {
                    return (
                      <select
                        style={{ fontSize: 13, padding: '8px 10px', width: '100%', borderRadius: 8, border: '1px solid var(--border)', background: 'white' }}
                        value={displayColor}
                        onChange={e => {
                          if (e.target.value === '__OTHER__') {
                            setCustomColorMode(true);
                            updateVehicleField('color', '');
                          } else {
                            setCustomColorMode(false);
                            updateVehicleField('color', e.target.value);
                          }
                        }}
                      >
                        <option value="">-- Select Color --</option>
                        {COMMON_VEHICLE_COLORS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        {displayColor && !COMMON_VEHICLE_COLORS.includes(displayColor) && (
                          <option value={displayColor}>{displayColor}</option>
                        )}
                        <option value="__OTHER__">✏️ + Custom / Other</option>
                      </select>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        type="text"
                        placeholder="Color..."
                        value={rawColor}
                        onChange={e => updateVehicleField('color', e.target.value)}
                        style={{ fontSize: 13, padding: '8px 10px', width: '100%' }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={() => { setCustomColorMode(false); updateVehicleField('color', ''); }}
                        title="Back to list"
                      >
                        📋
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Year
                </label>
                <input
                  type="text"
                  value={vehicle.year || ''}
                  onChange={e => updateVehicleField('year', e.target.value)}
                  placeholder="2021"
                  style={{ fontSize: 13, padding: '8px 10px' }}
                />
              </div>
            </div>

            {/* Customer Name & Mobile Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="mb-16">
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block', color: 'var(--muted)' }}>
                  {customerType === 'workshop' ? 'Workshop Name' : 'Customer Name'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  style={{ fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block', color: 'var(--muted)' }}>
                  Mobile Phone <span style={{ color: '#ef4444' }}>* (10 digits)</span>
                </label>
                <input
                  type="tel"
                  placeholder="10-digit number"
                  value={phone}
                  maxLength={10}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  style={{ fontSize: 14 }}
                />
              </div>
            </div>

            {/* 4 Before-Wash Safety Inspection Photos */}
            <div className="field mb-16" style={{ background: 'var(--surface-hover)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📷 Before-Wash Photos <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--muted)' }}>(Optional - Max 4 for Safety)</span>
                </label>
                {uploadingPhoto && <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>Uploading...</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[0, 1, 2, 3].map(slot => {
                  const photoUrl = beforePhotos[slot];
                  return (
                    <div key={slot} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1.5px dashed var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {photoUrl ? (
                        <>
                          <img src={getImageUrl(photoUrl)} alt={`Before ${slot + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => removeBeforePhoto(slot)}
                            style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(220, 38, 38, 0.85)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <label style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 4 }}>
                          <span style={{ fontSize: 18 }}>📸</span>
                          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>Photo {slot + 1}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={e => handleBeforePhotoUpload(e, slot)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Wash Service Selection */}
            {isCar && (
              <div className="field mb-16">
                <label style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block', color: 'var(--muted)' }}>
                  Select Car Wash Package
                </label>
                <select
                  value={washTypeId}
                  onChange={e => setWashTypeId(e.target.value)}
                  style={{ fontSize: 15, fontWeight: 500 }}
                >
                  <option value="">-- Choose Wash Service --</option>
                  {washTypes
                    .filter(wt => !wt.name.toLowerCase().includes('bike') && !wt.name.toLowerCase().includes('scooter') && !wt.name.toLowerCase().includes('chain'))
                    .map(wt => {
                      const pMap = customerType === 'workshop' ? wt.workshop_pricing : wt.pricing;
                      const pVal = pMap?.[vehicle.segment] || 0;
                      return (
                        <option key={wt.id} value={wt.id}>
                          {wt.name} - ₹{pVal} {customerType === 'workshop' ? '(Garage Rate)' : ''}
                        </option>
                      );
                    })}
                </select>
              </div>
            )}

            {/* Special Chain Lube Add-on (Only for Bikes) */}
            {isBike && (
              <div
                style={{
                  background: '#f3e8ff',
                  border: '1.5px solid #c084fc',
                  padding: '12px 16px',
                  borderRadius: 12,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
                onClick={() => setHasChainLube(!hasChainLube)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>⚙️</span>
                  <div>
                    <strong style={{ fontSize: 14, color: '#581c87', display: 'block' }}>Add Chain Lube Service</strong>
                    <span style={{ fontSize: 12, color: '#7e22ce' }}>Recommended extra care for gear bikes</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 14, color: '#6b21a8' }}>+ ₹{dynamicLubePrice}</strong>
                  <input
                    type="checkbox"
                    checked={hasChainLube}
                    onChange={e => setHasChainLube(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#9333ea' }}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* INITIAL PAYMENT SETTLEMENT SWITCHER */}
            <div className="field mb-16" style={{ background: '#fdf4ff', padding: 12, borderRadius: 12, border: '1px solid #f0abfc' }}>
              <label style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, display: 'block', color: '#86198f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Payment Settlement Status
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPaymentStatus('unsettled')}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: paymentStatus === 'unsettled' ? '#d97706' : '#cbd5e1',
                    background: paymentStatus === 'unsettled' ? '#fffbeb' : '#fff',
                    color: paymentStatus === 'unsettled' ? '#b45309' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  ⏳ Pending / Settle Later
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPaymentStatus('settled')}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: paymentStatus === 'settled' ? '#10b981' : '#cbd5e1',
                    background: paymentStatus === 'settled' ? '#ecfdf5' : '#fff',
                    color: paymentStatus === 'settled' ? '#047857' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  💳 Paid / Settled Upfront
                </button>
              </div>
            </div>

            {/* Total Price Summary Box */}
            {totalPrice !== null && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '14px 18px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Calculated Total
                  </span>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                    {isBike && `Bike Wash (₹300)${hasChainLube ? ' + Chain Lube (₹100)' : ''}`}
                    {isScooter && 'Scooter Wash (Fixed ₹250)'}
                    {isCar && washTypes.find(w => w.id === parseInt(washTypeId))?.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{totalPrice}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}

        {/* Modal Action Footer */}
        <div className="flex gap-10 mt-20" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            style={{ flex: 1, padding: 12, fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!vehicle || loading || (isCar && !washTypeId)}
            onClick={createJob}
            style={{ flex: 2, padding: 12, fontSize: 15, fontWeight: 600 }}
          >
            {loading ? 'Processing...' : 'Start Job 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}
