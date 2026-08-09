import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { recognizePlateNumber } from '../ocr';

function compressImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
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

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
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

export default function MobileScan() {
  const navigate = useNavigate();

  const [washTypes, setWashTypes] = useState([]);
  const [workshops, setWorkshops] = useState([]);

  const [regNumber, setRegNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState(null);
  const [washTypeId, setWashTypeId] = useState('');
  const [hasChainLube, setHasChainLube] = useState(false);

  const [customerType, setCustomerType] = useState('normal'); // 'normal' | 'workshop'
  const [workshopId, setWorkshopId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unsettled');

  const [customerName, setCustomerName] = useState('');
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [loading, setLoading] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
    }).catch(err => console.error(err));
    api.get('/workshops').then(setWorkshops).catch(err => console.error(err));
  }, [customerType, workshopId]);

  async function handlePlateOcr(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrScanning(true);
    setError('');
    setSuccessMsg('');

    try {
      const extractedPlate = await recognizePlateNumber(file);
      if (extractedPlate) {
        setRegNumber(extractedPlate.toUpperCase());
        setSuccessMsg(`Extracted plate: ${extractedPlate.toUpperCase()}`);
        // Auto-trigger lookup
        await lookupVehicle(extractedPlate.toUpperCase());
      } else {
        setError('No text recognized. Please enter registration number manually.');
      }
    } catch (err) {
      setError(err.message || 'OCR failed. Please enter number manually.');
    } finally {
      setOcrScanning(false);
      // Reset input value so re-capturing same file triggers onChange
      e.target.value = '';
    }
  }

  const REGEX_PLATE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$|^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;

  async function lookupVehicle(plateToLookup = regNumber) {
    const target = plateToLookup.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!target) {
      setError('Please enter a registration number');
      return;
    }
    if (!REGEX_PLATE.test(target)) {
      setError('Invalid Registration Number format (e.g. KL32L2011 or 22BH1234A)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const v = await api.get(`/vehicles/lookup/${target}`);
      setVehicle(v);
      setRegNumber(target);
      if (v.phone) setPhone(v.phone);
      else setPhone('');
      if (v.customer_name) setCustomerName(v.customer_name);
      else setCustomerName('');
    } catch (e) {
      setError(e.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleBeforePhotoUpload(e, slotIndex) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressedUrl = await compressImage(file);
      setBeforePhotos(prev => {
        const next = [...prev];
        next[slotIndex] = compressedUrl;
        return next;
      });
    } catch (err) {
      console.error('Photo upload failed:', err);
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
    if (!vehicle) return;
    setVehicle({ ...vehicle, [field]: value });
  }

  async function saveVehicleCorrections() {
    if (!vehicle || !vehicle.id) return;
    await api.put(`/vehicles/${vehicle.id}`, {
      brand: vehicle.brand,
      model: vehicle.model,
      segment: vehicle.segment,
      color: vehicle.color
    }).catch(err => console.error('Failed to update vehicle corrections:', err));
  }

  const isBike = vehicle?.segment === 'bike';
  const isScooter = vehicle?.segment === 'scooter';
  const isCar = vehicle && !isBike && !isScooter;

  const filteredWorkshops = workshops.filter(w => {
    if (isCar) return w.type === 'Car Workshop';
    if (isBike || isScooter) return w.type === 'Bike Workshop';
    return true;
  });

  const carWashTypes = washTypes.filter(wt => !wt.name.toLowerCase().includes('bike') && !wt.name.toLowerCase().includes('scooter') && !wt.name.toLowerCase().includes('chain'));
  const bikeWashType = washTypes.find(wt => wt.name.includes('Bike') || wt.name.includes('Scooter'));
  const chainLubeType = washTypes.find(wt => wt.name.includes('Chain'));
  const selectedWashId = (isBike || isScooter)
    ? (bikeWashType ? bikeWashType.id : (washTypes[0]?.id || 1))
    : (washTypeId ? parseInt(washTypeId) : (carWashTypes[0]?.id || washTypes[0]?.id || 1));

  const dynamicLubePrice = customerType === 'workshop'
    ? (chainLubeType?.workshop_pricing?.bike ?? chainLubeType?.pricing?.bike ?? 150)
    : (chainLubeType?.pricing?.bike ?? 150);

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

  async function handleStartJob() {
    const cleanReg = (vehicle?.reg_number || regNumber).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanReg) {
      setError('Registration number is required');
      return;
    }
    if (!REGEX_PLATE.test(cleanReg)) {
      setError('Invalid Registration Number format (e.g. KL32L2011 or 22BH1234A)');
      return;
    }
    if (isCar && !selectedWashId) {
      setError('Please select a wash package for the car');
      return;
    }
    if (customerType === 'workshop' && !workshopId) {
      setError('Please select a workshop for workshop customer vehicles');
      return;
    }
    if (phone && phone.length !== 10) {
      setError('Mobile number must be exactly 10 digits');
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
        phone: phone || undefined,
        customer_name: customerName || undefined,
        before_photos: beforePhotos.filter(Boolean),
        has_chain_lube: isBike ? hasChainLube : false,
        chain_lube_price: dynamicLubePrice,
        customer_type: customerType,
        workshop_id: (customerType === 'workshop' && workshopId) ? parseInt(workshopId) : null,
        payment_status: paymentStatus
      });

      setSuccessMsg(`✅ Job started successfully for ${vehicle.reg_number}!`);
      // Reset form
      setTimeout(() => {
        navigate('/mobile/jobs');
      }, 1200);
    } catch (e) {
      setError(e.message || 'Failed to start job');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mobile-container">
      {/* Mobile Top Header Navigation */}
      <div className="mobile-header">
        <div>
          <h2 className="mobile-title">🚿 Perfecto Wash</h2>
          <span className="mobile-subtitle">Washer Mobile Portal</span>
        </div>
        <div className="mobile-header-actions">
          <Link to="/mobile/jobs" className="mobile-nav-btn active-queue-btn">
            📋 Active Jobs
          </Link>
        </div>
      </div>

      <div className="mobile-body">
        {/* Step 1: Camera Scanner & Registration Number Entry */}
        <div className="mobile-card mb-16">
          <h3 className="mobile-card-title">📷 1. Scan or Enter Vehicle</h3>

          {/* Native Camera & Gallery Trigger Inputs */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            id="mobile-ocr-camera"
            style={{ display: 'none' }}
            onChange={handlePlateOcr}
          />
          <input
            type="file"
            accept="image/*"
            id="mobile-ocr-gallery"
            style={{ display: 'none' }}
            onChange={handlePlateOcr}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              className="mobile-btn mobile-btn-camera"
              onClick={() => document.getElementById('mobile-ocr-camera')?.click()}
              disabled={ocrScanning || loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 8px', fontSize: 13 }}
            >
              {ocrScanning ? '🔄 Scanning...' : '📸 Take Photo'}
            </button>

            <button
              type="button"
              className="mobile-btn mobile-btn-secondary"
              onClick={() => document.getElementById('mobile-ocr-gallery')?.click()}
              disabled={ocrScanning || loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 8px', fontSize: 13, background: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1' }}
            >
              🖼️ From Gallery
            </button>
          </div>

          <div className="mobile-divider">OR TYPE MANUAL REGISTRATION</div>

          <div className="mobile-input-group mt-12">
            <input
              type="text"
              placeholder="e.g. KL07CD1234"
              value={regNumber}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              className="mobile-input reg-input"
              onChange={e => setRegNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && lookupVehicle()}
            />
            <button
              type="button"
              className="mobile-btn mobile-btn-secondary"
              onClick={() => lookupVehicle()}
              disabled={loading || !regNumber.trim()}
            >
              {loading ? '...' : 'Fetch'}
            </button>
          </div>

          {vehicle?.source === 'mock' && (
            <p className="mobile-hint-text">
              ℹ️ Details auto-filled from database/RTO mock. Review and edit below if needed.
            </p>
          )}
        </div>

        {/* Step 2: Vehicle Details & Category */}
        {vehicle && (
          <div className="mobile-card mb-16">
            <h3 className="mobile-card-title">🚘 2. Category & Vehicle Specs</h3>

            <div className="mobile-field mb-12">
              <label className="mobile-label">Vehicle Category</label>
              <div className="mobile-grid-3">
                <button
                  type="button"
                  className={`mobile-tab-btn ${isCar ? 'active car' : ''}`}
                  onClick={() => !isCar && updateVehicleField('segment', 'hatchback')}
                >
                  🚗 Car
                </button>
                <button
                  type="button"
                  className={`mobile-tab-btn ${isBike ? 'active bike' : ''}`}
                  onClick={() => updateVehicleField('segment', 'bike')}
                >
                  🏍️ Bike
                </button>
                <button
                  type="button"
                  className={`mobile-tab-btn ${isScooter ? 'active scooter' : ''}`}
                  onClick={() => updateVehicleField('segment', 'scooter')}
                >
                  🛵 Scooter
                </button>
              </div>
            </div>

            {isCar && (
              <div className="mobile-field mb-12">
                <label className="mobile-label">Car Body Segment</label>
                <select
                  className="mobile-select"
                  value={vehicle.segment || 'hatchback'}
                  onChange={e => updateVehicleField('segment', e.target.value)}
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

            {/* Editable Specs Grid */}
            <div className="mobile-grid-3 mb-12">
              <div>
                <label className="mobile-sublabel">Brand</label>
                <input
                  type="text"
                  className="mobile-input-sm"
                  placeholder="Brand"
                  value={vehicle.brand || ''}
                  onChange={e => updateVehicleField('brand', e.target.value)}
                />
              </div>
              <div>
                <label className="mobile-sublabel">Model</label>
                <input
                  type="text"
                  className="mobile-input-sm"
                  placeholder="Model"
                  value={vehicle.model || ''}
                  onChange={e => updateVehicleField('model', e.target.value)}
                />
              </div>
              <div>
                <label className="mobile-sublabel">Color</label>
                <input
                  type="text"
                  className="mobile-input-sm"
                  placeholder="Color"
                  value={vehicle.color || ''}
                  onChange={e => updateVehicleField('color', e.target.value)}
                />
              </div>
            </div>

            {/* Customer Name & Phone */}
            <div className="mobile-grid-2 mb-12">
              <div>
                <label className="mobile-sublabel">Customer Name (Optional)</label>
                <input
                  type="text"
                  className="mobile-input-sm"
                  placeholder="e.g. Rahul Sharma"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="mobile-sublabel">Mobile Phone (WhatsApp)</label>
                <input
                  type="tel"
                  className="mobile-input-sm"
                  placeholder="10-digit number"
                  value={phone}
                  maxLength={10}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            {/* 4 Before Wash Inspection Photos */}
            <div className="mobile-field mb-12" style={{ background: 'var(--surface-hover)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="mobile-label" style={{ margin: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  📷 Before Wash Photos <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--muted)' }}>(Optional - Max 4)</span>
                </label>
                {uploadingPhoto && <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>Uploading...</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
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
                            style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: 'rgba(220, 38, 38, 0.85)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <label style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 2 }}>
                          <span style={{ fontSize: 16 }}>📸</span>
                          <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 500 }}>Photo {slot + 1}</span>
                          <input
                            type="file"
                            accept="image/*"
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
          </div>
        )}

        {/* Step 3: Wash Package & Settlement */}
        {vehicle && (
          <div className="mobile-card mb-16">
            <h3 className="mobile-card-title">🏷️ 3. Pricing & Customer Type</h3>

            {/* Customer Type Selector */}
            <div className="mobile-field mb-12">
              <label className="mobile-label">Customer Type</label>
              <div className="mobile-grid-2">
                <button
                  type="button"
                  className={`mobile-tab-btn ${customerType === 'normal' ? 'active normal' : ''}`}
                  onClick={() => setCustomerType('normal')}
                >
                  👤 Retail Customer
                </button>
                <button
                  type="button"
                  className={`mobile-tab-btn ${customerType === 'workshop' ? 'active workshop' : ''}`}
                  onClick={() => setCustomerType('workshop')}
                >
                  🏭 Workshop Partner
                </button>
              </div>
            </div>

            {customerType === 'workshop' && (
              <div className="mobile-field mb-12">
                <label className="mobile-label">Select Workshop</label>
                <select
                  className="mobile-select"
                  value={workshopId}
                  onChange={e => setWorkshopId(e.target.value)}
                >
                  <option value="">-- Choose Workshop --</option>
                  {filteredWorkshops.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Wash Package Selection */}
            {isCar && (
              <div className="mobile-field mb-12">
                <label className="mobile-label">Wash Package</label>
                <select
                  className="mobile-select"
                  value={washTypeId}
                  onChange={e => setWashTypeId(e.target.value)}
                >
                  <option value="">-- Select Wash Service --</option>
                  {washTypes
                    .filter(wt => !wt.name.toLowerCase().includes('bike') && !wt.name.toLowerCase().includes('scooter') && !wt.name.toLowerCase().includes('chain'))
                    .map(wt => {
                      const pMap = customerType === 'workshop' ? wt.workshop_pricing : wt.pricing;
                      const pVal = pMap?.[vehicle.segment] || 0;
                      return (
                        <option key={wt.id} value={wt.id}>
                          {wt.name} (₹{pVal})
                        </option>
                      );
                    })}
                </select>
              </div>
            )}

            {isBike && (
              <div
                className="mobile-lube-box mb-12"
                onClick={() => setHasChainLube(!hasChainLube)}
              >
                <div>
                  <strong>⚙️ Add Chain Lube (+₹{dynamicLubePrice})</strong>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Chain lube application for bike</div>
                </div>
                <input
                  type="checkbox"
                  checked={hasChainLube}
                  onChange={e => setHasChainLube(e.target.checked)}
                  style={{ width: 22, height: 22 }}
                />
              </div>
            )}

            {/* Payment Settlement Status */}
            <div className="mobile-field mb-12">
              <label className="mobile-label">Payment Status</label>
              <div className="mobile-grid-2">
                <button
                  type="button"
                  className={`mobile-tab-btn ${paymentStatus === 'unsettled' ? 'active pending' : ''}`}
                  onClick={() => setPaymentStatus('unsettled')}
                >
                  ⏳ Settle Later
                </button>
                <button
                  type="button"
                  className={`mobile-tab-btn ${paymentStatus === 'settled' ? 'active settled' : ''}`}
                  onClick={() => setPaymentStatus('settled')}
                >
                  💳 Paid Upfront
                </button>
              </div>
            </div>

            {/* Total Price display */}
            {totalPrice !== null && (
              <div className="mobile-total-box">
                <span>Total Amount:</span>
                <span className="mobile-total-price">₹{totalPrice}</span>
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {error && <div className="mobile-alert error">❌ {error}</div>}
        {successMsg && <div className="mobile-alert success">{successMsg}</div>}
      </div>

      {/* Floating Sticky Bottom Bar for Instant Wash Start */}
      {vehicle && (
        <div className="mobile-sticky-bottom-bar">
          <div className="mobile-sticky-price">
            <span className="mobile-sticky-label">Total Amount</span>
            <span className="mobile-sticky-amount">
              {totalPrice !== null ? `₹${totalPrice}` : '--'}
            </span>
          </div>
          <button
            type="button"
            className="mobile-btn mobile-btn-submit-sticky"
            disabled={loading || (isCar && !washTypeId)}
            onClick={handleStartJob}
          >
            {loading ? 'Starting...' : '🚀 Start Wash Job'}
          </button>
        </div>
      )}
    </div>
  );
}
