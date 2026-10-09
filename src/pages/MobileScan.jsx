import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import MobileBottomNav from '../components/MobileBottomNav';
import { recognizePlateNumber } from '../ocr';
import { getBrandsForSegment, getModelsForBrand, COMMON_VEHICLE_COLORS, normalizeValue } from '../utils/vehicleOptions';

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

  // Yesterday / Backdated Job Entry States
  const [isBackdated, setIsBackdated] = useState(false);
  const [backdateDateTime, setBackdateDateTime] = useState(() => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    now.setHours(10, 0, 0, 0);
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T10:00`;
  });
  const [backdatePaymentMethod, setBackdatePaymentMethod] = useState('cash'); // 'cash' | 'gpay' | 'split'
  const [backdateCashAmount, setBackdateCashAmount] = useState('');
  const [backdateGpayAmount, setBackdateGpayAmount] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [offerPrice, setOfferPrice] = useState('');
  const [userEditedPrice, setUserEditedPrice] = useState(false);

  const [loading, setLoading] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [showOcrConfirmModal, setShowOcrConfirmModal] = useState(false);
  const [ocrPreviewImage, setOcrPreviewImage] = useState('');
  const [ocrCandidateNumber, setOcrCandidateNumber] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [customBrandMode, setCustomBrandMode] = useState(false);
  const [customModelMode, setCustomModelMode] = useState(false);
  const [customColorMode, setCustomColorMode] = useState(false);

  // Returning Customer Search States
  const [entryMode, setEntryMode] = useState('plate'); // 'plate' | 'customer'
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showVehicleSelectModal, setShowVehicleSelectModal] = useState(false);

  async function searchReturningCustomer(query) {
    setCustomerSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    setSearchingCustomers(true);
    try {
      const results = await api.get(`/customers/search?q=${encodeURIComponent(query.trim())}`);
      setCustomerSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Customer search error:', err);
    } finally {
      setSearchingCustomers(false);
    }
  }

  function handleSelectCustomer(customer) {
    setSelectedCustomer(customer);
    setCustomerName(customer.name || '');
    if (customer.phone) setPhone(customer.phone);

    const vehicles = customer.vehicles || [];
    if (vehicles.length === 1) {
      selectCustomerVehicle(vehicles[0], customer);
    } else if (vehicles.length > 1) {
      setShowVehicleSelectModal(true);
    } else {
      const tempReg = `NEW-${Math.floor(1000 + Math.random() * 9000)}`;
      setRegNumber(tempReg);
      setVehicle({
        id: null,
        reg_number: tempReg,
        segment: 'hatchback',
        brand: '',
        model: '',
        color: '',
        source: 'manual',
        customer_id: customer.id
      });
      setSuccessMsg(`ℹ️ Selected customer ${customer.name}. Please enter vehicle specs below.`);
    }
  }

  function selectCustomerVehicle(v, custObj = selectedCustomer) {
    const targetReg = (v.reg_number || '').toUpperCase();
    setRegNumber(targetReg);
    setVehicle({
      id: v.id || null,
      reg_number: targetReg,
      brand: v.brand || '',
      model: v.model || '',
      segment: v.segment || 'hatchback',
      color: v.color || '',
      year: v.year || '',
      customer_id: v.customer_id || (custObj ? custObj.id : null),
      source: 'database'
    });
    if (custObj?.name) setCustomerName(custObj.name);
    if (custObj?.phone) setPhone(custObj.phone);
    setShowVehicleSelectModal(false);
    setCustomerSearchResults([]);
    setCustomerSearchQuery('');
    setSuccessMsg(`✅ Selected vehicle ${targetReg} for ${custObj?.name || 'Customer'}`);
  }

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
      const compressedPreview = await compressImage(file, 1200, 1200, 0.85);
      const extractedPlate = await recognizePlateNumber(file);

      const candidate = extractedPlate ? extractedPlate.toUpperCase() : '';
      setOcrPreviewImage(compressedPreview);
      setOcrCandidateNumber(candidate);
      setShowOcrConfirmModal(true);

      if (!candidate) {
        setError('No registration number detected automatically. Please verify or type the plate number from the photo below.');
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
    
    // 1. If clicking Fetch without entering a number plate (New / Unregistered vehicle)
    if (!target) {
      const tempPlate = `NEW-${Math.floor(1000 + Math.random() * 9000)}`;
      setRegNumber(tempPlate);
      setVehicle({
        id: null,
        reg_number: tempPlate,
        segment: 'hatchback',
        brand: '',
        model: '',
        color: '',
        source: 'manual'
      });
      setError('');
      setSuccessMsg('ℹ️ Unregistered / New Vehicle manual entry mode. Please fill in details below.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (REGEX_PLATE.test(target)) {
        const v = await api.get(`/vehicles/lookup/${target}`);
        if (v && !v.not_found && v.brand && v.model) {
          setVehicle(v);
          setRegNumber(target);
          if (v.phone) setPhone(v.phone);
          else setPhone('');
          if (v.customer_name) setCustomerName(v.customer_name);
          else setCustomerName('');
          return;
        }
      }
      
      // If not standard plate or details not returned by RTO, open manual entry form immediately
      setVehicle({
        id: null,
        reg_number: target,
        segment: 'hatchback',
        brand: '',
        model: '',
        color: '',
        source: 'manual'
      });
      setRegNumber(target);
      setSuccessMsg('ℹ️ Vehicle details not found in RTO. Please enter details manually below.');
    } catch (e) {
      setVehicle({
        id: null,
        reg_number: target,
        segment: 'hatchback',
        brand: '',
        model: '',
        color: '',
        source: 'manual'
      });
      setRegNumber(target);
      setError('');
      setSuccessMsg('ℹ️ Please enter vehicle details manually below.');
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

  const calculatedTotalPrice = baseWashPrice !== null ? (baseWashPrice + (isBike && hasChainLube ? dynamicLubePrice : 0)) : null;

  useEffect(() => {
    if (!userEditedPrice) {
      setOfferPrice(calculatedTotalPrice !== null ? String(calculatedTotalPrice) : '');
    }
  }, [calculatedTotalPrice, userEditedPrice]);

  async function handleStartJob() {
    const cleanReg = (vehicle?.reg_number || regNumber || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!cleanReg) {
      setError('Registration number is required');
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
    if (customerType === 'workshop' && (!customerName || !customerName.trim())) {
      setError('Workshop Partner Name is required');
      return;
    }
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 10) {
      setError('Mobile phone number must be exactly 10 digits');
      return;
    }
    if (isCar && !selectedWashId) {
      setError('Please select a wash package for the car');
      return;
    }

    const finalOfferPrice = (offerPrice !== '' && !isNaN(Number(offerPrice)))
      ? Number(offerPrice)
      : (calculatedTotalPrice !== null ? calculatedTotalPrice : 0);

    setLoading(true);
    setError('');
    try {
      await saveVehicleCorrections();

      const jobPayload = {
        reg_number: cleanReg,
        wash_type_id: selectedWashId,
        eta_minutes: 30,
        phone: cleanPhone,
        customer_name: customerName.trim(),
        before_photos: beforePhotos.filter(Boolean),
        has_chain_lube: isBike ? hasChainLube : false,
        chain_lube_price: dynamicLubePrice,
        offer_price: finalOfferPrice,
        customer_type: customerType,
        workshop_id: (customerType === 'workshop' && workshopId) ? parseInt(workshopId) : null,
        payment_status: paymentStatus,
        brand: vehicle?.brand || 'Unknown',
        model: vehicle?.model === '__OTHER__' ? '' : (vehicle?.model || 'Unknown'),
        segment: vehicle?.segment || 'hatchback',
        color: vehicle?.color === '__OTHER__' ? '' : (vehicle?.color || 'Unknown')
      };

      if (isBackdated) {
        const entryDt = backdateDateTime ? new Date(backdateDateTime) : new Date();
        const entryIso = !isNaN(entryDt.getTime()) ? entryDt.toISOString() : new Date().toISOString();
        jobPayload.entry_time = entryIso;
        jobPayload.exit_time = entryIso;
        jobPayload.completed_at = entryIso;
        jobPayload.status = 'completed';
        jobPayload.payment_status = 'settled';
        jobPayload.payment_method = backdatePaymentMethod;
        if (backdatePaymentMethod === 'split') {
          jobPayload.cash_amount = Number(backdateCashAmount) || 0;
          jobPayload.gpay_amount = Number(backdateGpayAmount) || 0;
        }
      }

      await api.post('/jobs', jobPayload);

      setSuccessMsg(isBackdated ? `✅ Backdated completed job created for ${vehicle.reg_number}!` : `✅ Job started successfully for ${vehicle.reg_number}!`);
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

      {/* 📸 OCR Registration Number Verification Modal */}
      {showOcrConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowOcrConfirmModal(false)}>
          <div
            className="mobile-card"
            style={{
              width: '100%',
              maxWidth: 460,
              background: '#ffffff',
              borderRadius: 20,
              padding: '20px 20px 24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🔍</span> Confirm Registration Number
              </h3>
              <button
                type="button"
                onClick={() => setShowOcrConfirmModal(false)}
                style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', fontSize: 16, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#475569', marginTop: 0, marginBottom: 14, lineHeight: 1.4 }}>
              Verify if the detected registration number matches the photo below before fetching vehicle details.
            </p>

            {/* Photo Preview */}
            {ocrPreviewImage && (
              <div style={{ marginBottom: 16, borderRadius: 14, overflow: 'hidden', border: '2px solid #0284c7', background: '#0f172a', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(2, 132, 199, 0.95)', color: '#ffffff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, backdropFilter: 'blur(4px)' }}>
                  📷 Captured Photo
                </div>
                <img
                  src={ocrPreviewImage}
                  alt="Scanned License Plate"
                  style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block', background: '#090d16' }}
                />
              </div>
            )}

            {/* Editable Registration Number */}
            <div style={{ marginBottom: 18 }}>
              <label className="mobile-label" style={{ color: '#0284c7', fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                Extracted Number Plate
              </label>
              <input
                type="text"
                className="mobile-input reg-input"
                style={{ fontSize: 22, textAlign: 'center', padding: '12px', border: '2px solid #0284c7', background: '#f0f9ff', fontWeight: 800, letterSpacing: '0.1em' }}
                value={ocrCandidateNumber}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                onChange={e => setOcrCandidateNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="e.g. KL07CD1234"
              />
              <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 6, textAlign: 'center', fontWeight: 500 }}>
                ✏️ Edit if any character was misread by OCR
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                className="mobile-btn mobile-btn-secondary"
                onClick={() => setShowOcrConfirmModal(false)}
                style={{ padding: '12px', fontSize: 14, border: '1.5px solid #cbd5e1' }}
              >
                Cancel / Retake
              </button>
              <button
                type="button"
                className="mobile-btn mobile-btn-submit"
                disabled={!ocrCandidateNumber.trim()}
                onClick={async () => {
                  const target = ocrCandidateNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  if (!target) {
                    setError('Please enter a valid registration number');
                    return;
                  }
                  setShowOcrConfirmModal(false);
                  setRegNumber(target);
                  setSuccessMsg(`Confirmed plate: ${target}`);
                  await lookupVehicle(target);
                }}
                style={{ padding: '12px', fontSize: 14, background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#ffffff' }}
              >
                ✓ Fetch Vehicle Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Top Header Navigation */}
      <div className="mobile-header">
        <div>
          <h2 className="mobile-title">Vehicle scan</h2>
          <span className="mobile-subtitle">Create a new wash job</span>
        </div>
      </div>

      <div className="mobile-body">
        {/* Step 1: Camera Scanner, Plate No. or Returning Customer Search */}
        <div className="mobile-card mb-16">
          <h3 className="mobile-card-title">1. Scan or Select Customer</h3>

          {/* Mode Switcher Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
            <button
              type="button"
              onClick={() => setEntryMode('plate')}
              style={{
                padding: '9px 6px',
                fontSize: 12.5,
                fontWeight: 700,
                border: 'none',
                borderRadius: 8,
                background: entryMode === 'plate' ? '#0284c7' : 'transparent',
                color: entryMode === 'plate' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📷 Plate / Reg No.
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('customer')}
              style={{
                padding: '9px 6px',
                fontSize: 12.5,
                fontWeight: 700,
                border: 'none',
                borderRadius: 8,
                background: entryMode === 'customer' ? '#0284c7' : 'transparent',
                color: entryMode === 'customer' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              👤 Returning Customer
            </button>
          </div>

          {/* MODE 1: PLATE SCAN / REG NO */}
          {entryMode === 'plate' && (
            <>
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
                  placeholder="e.g. KL07CD1234 (Leave blank for New Vehicle)"
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
                  disabled={loading}
                  title="Click to fetch details or start manual entry"
                >
                  {loading ? '...' : 'Fetch'}
                </button>
              </div>

              <div style={{ marginTop: 10, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => lookupVehicle('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  ✏️ No number plate / New Vehicle? Click to enter details manually
                </button>
              </div>
            </>
          )}

          {/* MODE 2: RETURNING CUSTOMER SEARCH */}
          {entryMode === 'customer' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', marginBottom: 6, display: 'block' }}>
                Search Customer, Reg No, or Subscription
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="mobile-input"
                  placeholder="e.g. Muhammed Ilyas, KL32R4034, 9876543210..."
                  value={customerSearchQuery}
                  onChange={e => searchReturningCustomer(e.target.value)}
                  style={{ paddingLeft: 36, fontSize: 14.5, fontWeight: 600 }}
                  autoFocus
                />
                <span style={{ position: 'absolute', left: 12, top: 12, fontSize: 15, color: '#64748b' }}>🔍</span>
              </div>

              {searchingCustomers && (
                <div style={{ fontSize: 12.5, color: '#0284c7', marginTop: 8, padding: '6px 8px', fontWeight: 600 }}>
                  🔄 Searching customer database & subscriptions...
                </div>
              )}

              {/* Customer Search Results */}
              {customerSearchResults.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                  {customerSearchResults.map(c => (
                    <div
                      key={c.id || c.name}
                      onClick={() => handleSelectCustomer(c)}
                      style={{
                        padding: '12px',
                        background: c.has_active_subscription ? '#f0fdf4' : '#f0f9ff',
                        border: c.has_active_subscription ? '1.5px solid #16a34a' : '1.5px solid #0284c7',
                        borderRadius: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>👤 {c.name}</span>
                          {c.has_active_subscription && (
                            <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                              ✨ Monthly Subscription
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                          {c.phone ? `📞 ${c.phone}` : 'No phone recorded'} • 🎁 {c.reward_points || 0} Reward Points
                          {c.active_subscription && (
                            <span style={{ color: '#15803d', fontWeight: 600, marginLeft: 6 }}>
                              ({c.active_subscription.plan_name || 'Active Pass'})
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#0369a1', fontWeight: 700, marginTop: 4 }}>
                          🚘 {c.vehicles.length} Vehicle{c.vehicles.length === 1 ? '' : 's'}: {c.vehicles.map(v => `${v.reg_number}${v.subscription ? ' (✨ Subscribed)' : ''} (${v.brand || ''} ${v.model || ''})`.trim()).join(', ')}
                        </div>
                      </div>
                      <span style={{ fontSize: 18, color: c.has_active_subscription ? '#16a34a' : '#0284c7', fontWeight: 800 }}>➔</span>
                    </div>
                  ))}
                </div>
              )}

              {customerSearchQuery.trim().length >= 2 && !searchingCustomers && customerSearchResults.length === 0 && (
                <div style={{ padding: 12, marginTop: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 12.5, color: '#b45309' }}>
                  No customer found matching "{customerSearchQuery}". Use <strong>Plate / Reg No.</strong> or enter vehicle manually below.
                </div>
              )}
            </div>
          )}

          {/* Multi-Vehicle Picker Modal */}
          {showVehicleSelectModal && selectedCustomer && (
            <div className="modal-backdrop" onClick={() => setShowVehicleSelectModal(false)}>
              <div
                className="mobile-card"
                style={{
                  width: '100%',
                  maxWidth: 440,
                  background: '#ffffff',
                  borderRadius: 20,
                  padding: '20px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                  maxHeight: '85vh',
                  overflowY: 'auto'
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      🚘 Select Vehicle for {selectedCustomer.name}
                    </h3>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Choose which vehicle is visiting today
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVehicleSelectModal(false)}
                    style={{ background: '#f1f5f9', border: 'none', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 15, color: '#64748b' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  {selectedCustomer.vehicles.map(v => (
                    <div
                      key={v.id || v.reg_number}
                      onClick={() => selectCustomerVehicle(v)}
                      style={{
                        padding: '12px 14px',
                        border: v.subscription ? '2px solid #16a34a' : '2px solid #0284c7',
                        background: v.subscription ? '#f0fdf4' : '#f0f9ff',
                        borderRadius: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: v.subscription ? '#15803d' : '#0369a1', letterSpacing: '0.05em' }}>
                          {v.reg_number}
                        </div>
                        <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600, marginTop: 2 }}>
                          {v.brand} {v.model} ({v.segment})
                        </div>
                        {v.subscription && (
                          <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, marginTop: 2 }}>
                            ✨ Active Monthly Subscription ({v.subscription.plan_name || 'Pass'})
                          </div>
                        )}
                        {v.color && <div style={{ fontSize: 11.5, color: '#64748b' }}>Color: {v.color}</div>}
                      </div>
                      <button
                        type="button"
                        className="mobile-btn"
                        style={{ background: v.subscription ? '#16a34a' : '#0284c7', color: '#ffffff', padding: '6px 14px', fontSize: 12, fontWeight: 700, borderRadius: 8, width: 'auto' }}
                      >
                        Select ✓
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const tempReg = `NEW-${Math.floor(1000 + Math.random() * 9000)}`;
                      selectCustomerVehicle({
                        id: null,
                        reg_number: tempReg,
                        brand: '',
                        model: '',
                        segment: 'hatchback',
                        color: '',
                        customer_id: selectedCustomer.id
                      });
                    }}
                    style={{
                      padding: '12px',
                      border: '1.5px dashed #0284c7',
                      background: '#ffffff',
                      color: '#0284c7',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'center',
                      marginTop: 4
                    }}
                  >
                    ➕ Add Another Vehicle for {selectedCustomer.name}
                  </button>
                </div>
              </div>
            </div>
          )}

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
                <label className="mobile-sublabel">Brand <span style={{ color: '#ef4444' }}>*</span></label>
                {(() => {
                  const brands = getBrandsForSegment(vehicle.segment);
                  const rawBrand = vehicle.brand || '';
                  const displayBrand = normalizeValue(rawBrand, brands);
                  if (!customBrandMode) {
                    return (
                      <select
                        className="mobile-select"
                        style={{ padding: '8px 10px', fontSize: 13 }}
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
                        className="mobile-input-sm"
                        placeholder="Brand..."
                        value={rawBrand}
                        onChange={e => updateVehicleField('brand', e.target.value)}
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
                <label className="mobile-sublabel">Model <span style={{ color: '#ef4444' }}>*</span></label>
                {(() => {
                  const models = getModelsForBrand(vehicle.brand);
                  const rawModel = vehicle.model || '';
                  const displayModel = normalizeValue(rawModel, models);
                  if (!customModelMode) {
                    return (
                      <select
                        className="mobile-select"
                        style={{ padding: '8px 10px', fontSize: 13 }}
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
                        className="mobile-input-sm"
                        placeholder="Model..."
                        value={rawModel}
                        onChange={e => updateVehicleField('model', e.target.value)}
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
                <label className="mobile-sublabel">Color <span style={{ color: '#ef4444' }}>*</span></label>
                {(() => {
                  const rawColor = vehicle.color || '';
                  const displayColor = normalizeValue(rawColor, COMMON_VEHICLE_COLORS);
                  if (!customColorMode) {
                    return (
                      <select
                        className="mobile-select"
                        style={{ padding: '8px 10px', fontSize: 13 }}
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
                        className="mobile-input-sm"
                        placeholder="Color..."
                        value={rawColor}
                        onChange={e => updateVehicleField('color', e.target.value)}
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
            </div>

            {/* Customer Name & Phone */}
            <div className="mobile-grid-2 mb-12">
              <div>
                <label className="mobile-sublabel">
                  {customerType === 'workshop' ? (
                    <>Workshop Name <span style={{ color: '#ef4444' }}>*</span></>
                  ) : (
                    <>Customer Name <span style={{ fontWeight: 400, color: '#64748b' }}>(Optional)</span></>
                  )}
                </label>
                <input
                  type="text"
                  className="mobile-input-sm"
                  placeholder="e.g. Rahul Sharma"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="mobile-sublabel">Mobile Phone <span style={{ fontWeight: 400, color: '#64748b' }}>(Optional)</span></label>
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
                          <span style={{ fontSize: 18 }}>📷</span>
                          <span style={{ fontSize: 9.5, color: '#0284c7', fontWeight: 700 }}>Take Photo {slot + 1}</span>
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
                className={`mobile-lube-box mb-12 ${hasChainLube ? 'selected' : ''}`}
                onClick={() => setHasChainLube(!hasChainLube)}
              >
                <div>
                  <strong style={{ color: hasChainLube ? '#581c87' : '#1e293b' }}>
                    ⚙️ Add Chain Lube (+₹{dynamicLubePrice})
                  </strong>
                  <div style={{ fontSize: 12, color: hasChainLube ? '#7e22ce' : '#64748b' }}>
                    Chain lube application for bike
                  </div>
                </div>
                <div className={`lube-checkbox-icon ${hasChainLube ? 'active' : ''}`}>
                  {hasChainLube && '✓'}
                </div>
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

            {/* 📅 YESTERDAY / BACKDATED JOB ENTRY OPTION */}
            <div className="mobile-field mb-12" style={{ background: isBackdated ? '#f0fdf4' : '#f8fafc', padding: 14, borderRadius: 12, border: isBackdated ? '2px solid #16a34a' : '1.5px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: 13.5, color: isBackdated ? '#15803d' : '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📅</span> Yesterday / Backdated Job Entry
                  </strong>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    Enter missed jobs from yesterday or past date directly as completed
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !isBackdated;
                    setIsBackdated(nextVal);
                    if (nextVal) {
                      setPaymentStatus('settled');
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 800,
                    borderRadius: 20,
                    border: 'none',
                    background: isBackdated ? '#16a34a' : '#e2e8f0',
                    color: isBackdated ? '#ffffff' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {isBackdated ? 'ON ✓' : 'OFF'}
                </button>
              </div>

              {isBackdated && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #bbf7d0' }}>
                  <div className="mobile-field mb-12">
                    <label className="mobile-label" style={{ color: '#15803d', fontWeight: 700 }}>
                      Select Date & Time <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="mobile-input"
                      value={backdateDateTime}
                      onChange={e => setBackdateDateTime(e.target.value)}
                      style={{ fontSize: 15, fontWeight: 700, borderColor: '#16a34a', background: '#ffffff' }}
                    />
                  </div>

                  <div className="mobile-field mb-12">
                    <label className="mobile-label" style={{ color: '#15803d', fontWeight: 700 }}>
                      Payment Method
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      <button
                        type="button"
                        className={`mobile-tab-btn ${backdatePaymentMethod === 'cash' ? 'active settled' : ''}`}
                        onClick={() => setBackdatePaymentMethod('cash')}
                        style={{ background: backdatePaymentMethod === 'cash' ? '#16a34a' : '#ffffff', color: backdatePaymentMethod === 'cash' ? '#ffffff' : '#334155', padding: '8px 4px', fontSize: 12 }}
                      >
                        💵 Cash
                      </button>
                      <button
                        type="button"
                        className={`mobile-tab-btn ${backdatePaymentMethod === 'gpay' ? 'active settled' : ''}`}
                        onClick={() => setBackdatePaymentMethod('gpay')}
                        style={{ background: backdatePaymentMethod === 'gpay' ? '#16a34a' : '#ffffff', color: backdatePaymentMethod === 'gpay' ? '#ffffff' : '#334155', padding: '8px 4px', fontSize: 12 }}
                      >
                        📱 GPay / UPI
                      </button>
                      <button
                        type="button"
                        className={`mobile-tab-btn ${backdatePaymentMethod === 'split' ? 'active settled' : ''}`}
                        onClick={() => {
                          setBackdatePaymentMethod('split');
                          const tot = (offerPrice !== '' && !isNaN(Number(offerPrice))) ? Number(offerPrice) : (calculatedTotalPrice || 0);
                          const defaultCash = Math.round(tot / 2);
                          setBackdateCashAmount(String(defaultCash));
                          setBackdateGpayAmount(String(tot - defaultCash));
                        }}
                        style={{ background: backdatePaymentMethod === 'split' ? '#16a34a' : '#ffffff', color: backdatePaymentMethod === 'split' ? '#ffffff' : '#334155', padding: '8px 4px', fontSize: 12 }}
                      >
                        🔀 Split
                      </button>
                    </div>

                    {backdatePaymentMethod === 'split' && (
                      <div style={{ marginTop: 10, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1.5px solid #16a34a' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 6 }}>
                          Enter Split Payment (Total: ₹{(offerPrice !== '' && !isNaN(Number(offerPrice))) ? Number(offerPrice) : (calculatedTotalPrice || 0)})
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>💵 Cash (₹)</label>
                            <input
                              type="number"
                              className="mobile-input"
                              style={{ fontSize: 14, fontWeight: 700, padding: 8, borderColor: '#16a34a' }}
                              value={backdateCashAmount}
                              onChange={e => {
                                const val = Number(e.target.value) || 0;
                                const tot = (offerPrice !== '' && !isNaN(Number(offerPrice))) ? Number(offerPrice) : (calculatedTotalPrice || 0);
                                setBackdateCashAmount(e.target.value);
                                setBackdateGpayAmount(String(Math.max(0, tot - val)));
                              }}
                              placeholder="e.g. 300"
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>📱 GPay (₹)</label>
                            <input
                              type="number"
                              className="mobile-input"
                              style={{ fontSize: 14, fontWeight: 700, padding: 8, borderColor: '#16a34a' }}
                              value={backdateGpayAmount}
                              onChange={e => {
                                const val = Number(e.target.value) || 0;
                                const tot = (offerPrice !== '' && !isNaN(Number(offerPrice))) ? Number(offerPrice) : (calculatedTotalPrice || 0);
                                setBackdateGpayAmount(e.target.value);
                                setBackdateCashAmount(String(Math.max(0, tot - val)));
                              }}
                              placeholder="e.g. 200"
                            />
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#15803d', marginTop: 6, fontWeight: 700, textAlign: 'right' }}>
                          Cash ₹{backdateCashAmount || 0} + GPay ₹{backdateGpayAmount || 0} = ₹{(Number(backdateCashAmount)||0) + (Number(backdateGpayAmount)||0)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ background: '#dcfce7', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#14532d', fontWeight: 600 }}>
                    ✨ Job will be recorded as <strong>COMPLETED</strong> on {backdateDateTime ? new Date(backdateDateTime).toLocaleDateString('en-IN') : 'selected date'}.
                  </div>
                </div>
              )}
            </div>

            {/* Editable Total Amount / Offer Price Field */}
            <div className="mobile-total-box" style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', padding: 14, borderRadius: 12, border: '1.5px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="mobile-label" style={{ margin: 0, fontSize: 13, color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>💰 Total Amount (Offer Price)</span>
                </label>
                {userEditedPrice && calculatedTotalPrice !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setOfferPrice(calculatedTotalPrice !== null ? String(calculatedTotalPrice) : '');
                      setUserEditedPrice(false);
                    }}
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Reset to ₹{calculatedTotalPrice}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#0f766e' }}>₹</span>
                <input
                  type="number"
                  className="mobile-input"
                  placeholder={calculatedTotalPrice !== null ? String(calculatedTotalPrice) : 'Enter amount'}
                  value={offerPrice}
                  onChange={e => {
                    setOfferPrice(e.target.value);
                    setUserEditedPrice(true);
                  }}
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#0f766e',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '2px solid #0d9488',
                    background: '#ffffff',
                    width: '100%'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                <span>Standard Rate: ₹{calculatedTotalPrice ?? '--'}</span>
                {userEditedPrice && offerPrice !== '' && calculatedTotalPrice !== null && Number(offerPrice) !== calculatedTotalPrice && (
                  <span style={{ color: Number(offerPrice) < calculatedTotalPrice ? '#059669' : '#d97706', fontWeight: 600 }}>
                    {Number(offerPrice) < calculatedTotalPrice
                      ? `Discounted (₹${calculatedTotalPrice - Number(offerPrice)} off)`
                      : `Custom Rate (+₹${Number(offerPrice) - calculatedTotalPrice})`}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {error && <div className="mobile-alert error">❌ {error}</div>}
        {successMsg && <div className="mobile-alert success">{successMsg}</div>}
      </div>

      {/* Floating Sticky Bottom Bar for Instant Wash Start */}
      {vehicle && (
        <div className="mobile-sticky-bottom-bar has-mobile-nav">
          <div className="mobile-sticky-price">
            <span className="mobile-sticky-label">Total Amount</span>
            <span className="mobile-sticky-amount">
              ₹{offerPrice !== '' ? offerPrice : (calculatedTotalPrice !== null ? calculatedTotalPrice : '--')}
            </span>
          </div>
          <button
            type="button"
            className="mobile-btn mobile-btn-submit-sticky"
            disabled={loading || (isCar && !washTypeId)}
            onClick={handleStartJob}
            style={isBackdated ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : undefined}
          >
            {loading ? 'Processing...' : isBackdated ? '✅ Save Completed Job' : '🚀 Start Wash Job'}
          </button>
        </div>
      )}
      <MobileBottomNav />
    </div>
  );
}
