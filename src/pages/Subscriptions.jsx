import { useEffect, useState } from 'react';
import { api } from '../api';

const MAX_WASH_OPTIONS = [
  { value: 4, label: '4 Washes / month' },
  { value: 8, label: '8 Washes / month' },
  { value: 12, label: '12 Washes / month' },
  { value: 15, label: '15 Washes / month' },
  { value: 20, label: '20 Washes / month' },
  { value: 30, label: '30 Washes / month' }
];

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerVehicles, setCustomerVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  const [showRenewModal, setShowRenewModal] = useState(false);
  const [activeSub, setActiveSub] = useState(null);

  // Customer Mode: 'existing' vs 'new'
  const [customerMode, setCustomerMode] = useState('new');

  // New Customer & Multiple Vehicles state
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: ''
  });
  const [newVehicles, setNewVehicles] = useState([
    { reg_number: '', brand: '', model: '', segment: 'hatchback' }
  ]);

  // Inline add vehicle for existing customer
  const [showAddVehForm, setShowAddVehForm] = useState(false);
  const [inlineVeh, setInlineVeh] = useState({
    reg_number: '',
    brand: '',
    model: '',
    segment: 'hatchback'
  });

  // Subscription Form state
  const [subForm, setSubForm] = useState({
    customer_id: '',
    selected_vehicles: [],
    plan_name: 'Monthly Wash Package',
    price: '1500',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().slice(0, 10);
    })(),
    max_washes: 4,
    payment_method: 'cash',
    notes: ''
  });

  const [renewForm, setRenewForm] = useState({
    price: '1500',
    payment_method: 'cash'
  });

  async function loadData() {
    setLoading(true);
    try {
      const [subsData, custsData] = await Promise.all([
        api.get('/subscriptions'),
        api.get('/customers')
      ]);
      setSubscriptions(subsData || []);
      setCustomers(custsData || []);
    } catch (err) {
      console.error('Error loading subscriptions data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // When existing customer changes in form, fetch their registered vehicles
  async function handleCustomerChange(cId) {
    setSubForm(prev => ({ ...prev, customer_id: cId, selected_vehicles: [] }));
    if (!cId) {
      setCustomerVehicles([]);
      return;
    }

    try {
      const vehs = await api.get(`/vehicles?customer_id=${cId}`);
      setCustomerVehicles(vehs || []);
      if (vehs && vehs.length > 0) {
        setSubForm(prev => ({ ...prev, selected_vehicles: vehs.map(v => v.id) }));
      }
    } catch (err) {
      console.error('Error fetching customer vehicles:', err);
      setCustomerVehicles([]);
    }
  }

  // Add another vehicle row for NEW customer creation
  function addVehicleRow() {
    setNewVehicles(prev => [
      ...prev,
      { reg_number: '', brand: '', model: '', segment: 'hatchback' }
    ]);
  }

  function removeVehicleRow(index) {
    if (newVehicles.length === 1) return;
    setNewVehicles(prev => prev.filter((_, i) => i !== index));
  }

  function updateVehicleRow(index, field, value) {
    setNewVehicles(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  }

  // Inline add vehicle for existing customer
  async function handleAddInlineVehicle(e) {
    e.preventDefault();
    if (!inlineVeh.reg_number) return alert('Vehicle registration number is required');
    if (!subForm.customer_id) return alert('Select a customer first');

    try {
      const res = await api.post(`/customers/${subForm.customer_id}/vehicles`, inlineVeh);
      setInlineVeh({ reg_number: '', brand: '', model: '', segment: 'hatchback' });
      setShowAddVehForm(false);
      // Refresh customer vehicles
      handleCustomerChange(subForm.customer_id);
    } catch (err) {
      alert(err.message || 'Failed to add vehicle');
    }
  }

  function openNewSubscription() {
    setEditingSub(null);
    setCustomerMode('new');
    setNewCustomer({ name: '', phone: '' });
    setNewVehicles([{ reg_number: '', brand: '', model: '', segment: 'hatchback' }]);
    setShowAddVehForm(false);
    setInlineVeh({ reg_number: '', brand: '', model: '', segment: 'hatchback' });

    setSubForm({
      customer_id: '',
      selected_vehicles: [],
      plan_name: 'Monthly Wash Package',
      price: '1500',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().slice(0, 10);
      })(),
      max_washes: 4,
      payment_method: 'cash',
      notes: ''
    });
    setCustomerVehicles([]);
    setShowSubModal(true);
  }

  function toggleVehicleSelection(vId) {
    setSubForm(prev => {
      const exists = prev.selected_vehicles.includes(vId);
      const updated = exists
        ? prev.selected_vehicles.filter(id => id !== vId)
        : [...prev.selected_vehicles, vId];
      return { ...prev, selected_vehicles: updated };
    });
  }

  async function saveSubscription(e) {
    e.preventDefault();

    let targetCustomerId = subForm.customer_id;
    let targetVehicleIds = subForm.selected_vehicles;

    // If NEW customer mode, first create customer and vehicles!
    if (customerMode === 'new') {
      if (!newCustomer.name) return alert('Customer name is required');
      if (!newVehicles || newVehicles.length === 0 || !newVehicles[0].reg_number) {
        return alert('Please enter at least one vehicle registration number');
      }

      try {
        const created = await api.post('/customers', {
          name: newCustomer.name,
          phone: newCustomer.phone,
          vehicles: newVehicles
        });

        targetCustomerId = created.customer.id;
        targetVehicleIds = created.vehicles.map(v => v.id);
      } catch (err) {
        return alert(err.message || 'Failed to create new customer');
      }
    }

    if (!targetCustomerId) return alert('Please select or create a customer');
    if (!targetVehicleIds || targetVehicleIds.length === 0) {
      return alert('Please select or add at least one vehicle for this subscription');
    }
    if (!subForm.price) return alert('Please enter package rate');

    try {
      if (editingSub) {
        await api.put(`/subscriptions/${editingSub.id}`, {
          ...subForm,
          customer_id: targetCustomerId,
          price: Number(subForm.price),
          vehicle_ids: targetVehicleIds
        });
      } else {
        await api.post('/subscriptions', {
          ...subForm,
          customer_id: targetCustomerId,
          price: Number(subForm.price),
          vehicle_ids: targetVehicleIds
        });
      }
      setShowSubModal(false);
      loadData();
      alert('Subscription saved successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save subscription');
    }
  }

  function openRenew(sub) {
    setActiveSub(sub);
    setRenewForm({
      price: String(sub.price || 1500),
      payment_method: sub.payment_method || 'cash'
    });
    setShowRenewModal(true);
  }

  async function submitRenewal(e) {
    e.preventDefault();
    try {
      await api.post(`/subscriptions/${activeSub.id}/renew`, {
        price: Number(renewForm.price),
        payment_method: renewForm.payment_method
      });
      setShowRenewModal(false);
      loadData();
      alert('Subscription renewed successfully for another month!');
    } catch (err) {
      alert(err.message || 'Failed to renew subscription');
    }
  }

  async function deleteSubscription(id) {
    if (!window.confirm('Are you sure you want to cancel/delete this subscription?')) return;
    try {
      await api.del(`/subscriptions/${id}`);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete subscription');
    }
  }

  // Filtered subscriptions
  const filteredSubs = subscriptions.filter(sub => {
    const status = sub.computed_status || sub.status || 'active';
    const matchesStatus = filterStatus === 'all' || status === filterStatus;

    const q = searchQuery.toLowerCase().trim();
    const custName = (sub.customer?.name || '').toLowerCase();
    const custPhone = (sub.customer?.phone || '').toLowerCase();
    const planName = (sub.plan_name || '').toLowerCase();
    const vehRegs = sub.vehicles?.map(v => (v.reg_number || '').toLowerCase()).join(' ') || '';

    const matchesSearch = !q || (
      custName.includes(q) || custPhone.includes(q) || planName.includes(q) || vehRegs.includes(q)
    );

    return matchesStatus && matchesSearch;
  });

  const activeCount = subscriptions.filter(s => s.computed_status === 'active' || s.computed_status === 'expiring_soon').length;
  const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalVehiclesCount = subscriptions.reduce((sum, s) => sum + (s.vehicles?.length || 0), 0);
  const expiringSoonCount = subscriptions.filter(s => s.computed_status === 'expiring_soon').length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>💳 Monthly Package Subscriptions</h1>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 14 }}>
            Customer monthly wash packages, customizable rates, multi-vehicle coverage, and validity tracking
          </p>
        </div>

        <button className="btn btn-primary" onClick={openNewSubscription}>
          ➕ Add Subscription
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-4 mb-16">
        <div className="card stat-card">
          <div className="icon">💳</div>
          <div className="value">{activeCount}</div>
          <div className="label">Active Subscriptions</div>
        </div>
        <div className="card stat-card">
          <div className="icon">💰</div>
          <div className="value">₹{totalRevenue.toLocaleString()}</div>
          <div className="label">Total Monthly Package Revenue</div>
        </div>
        <div className="card stat-card">
          <div className="icon">🚗</div>
          <div className="value">{totalVehiclesCount}</div>
          <div className="label">Covered Vehicles</div>
        </div>
        <div className="card stat-card">
          <div className="icon">⚠️</div>
          <div className="value" style={{ color: expiringSoonCount > 0 ? 'var(--amber)' : 'inherit' }}>
            {expiringSoonCount}
          </div>
          <div className="label">Expiring Soon (&le;5 days)</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card mb-16 flex between center gap-12 wrap">
        <div className="status-tab-group">
          <button
            className={`status-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All Plans
          </button>
          <button
            className={`status-tab ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            Active
          </button>
          <button
            className={`status-tab ${filterStatus === 'expiring_soon' ? 'active' : ''}`}
            onClick={() => setFilterStatus('expiring_soon')}
          >
            Expiring Soon
          </button>
          <button
            className={`status-tab ${filterStatus === 'expired' ? 'active' : ''}`}
            onClick={() => setFilterStatus('expired')}
          >
            Expired
          </button>
        </div>

        <input
          type="text"
          placeholder="Search customer, phone, vehicle reg..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: 280 }}
        />
      </div>

      {/* Subscriptions Directory Table */}
      <div className="card">
        <h3>Customer Subscriptions ({filteredSubs.length})</h3>
        {loading && <p className="muted">Loading subscriptions...</p>}

        {!loading && (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px' }}>Customer & Contact</th>
                  <th style={{ padding: '10px 12px' }}>Package Plan</th>
                  <th style={{ padding: '10px 12px' }}>Monthly Price</th>
                  <th style={{ padding: '10px 12px' }}>Covered Vehicles</th>
                  <th style={{ padding: '10px 12px' }}>Validity Period</th>
                  <th style={{ padding: '10px 12px' }}>Washes Used</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.length === 0 && (
                  <tr>
                    <td colSpan="8" className="muted" style={{ padding: 16, textAlign: 'center' }}>
                      No subscriptions found. Click "+ Add Subscription" to create one.
                    </td>
                  </tr>
                )}
                {filteredSubs.map(s => {
                  const status = s.computed_status || 'active';
                  let pillClass = 'pill-green';
                  let statusLabel = 'Active';
                  if (status === 'expiring_soon') {
                    pillClass = 'pill-amber';
                    statusLabel = 'Expiring Soon';
                  } else if (status === 'expired') {
                    pillClass = 'pill-red';
                    statusLabel = 'Expired';
                  } else if (status === 'cancelled') {
                    pillClass = 'pill-gray';
                    statusLabel = 'Cancelled';
                  }

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{s.customer?.name || 'Customer'}</div>
                        <div className="muted" style={{ fontSize: 12 }}>📱 {s.customer?.phone || '-'}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="pill pill-purple">{s.plan_name}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--teal-dark)' }}>
                        ₹{s.price} / mo
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {s.vehicles?.map(v => (
                          <span key={v.id} className="pill pill-teal" style={{ marginRight: 4, marginBottom: 4 }}>
                            🚘 {v.reg_number} ({v.brand} {v.model})
                          </span>
                        ))}
                        {(!s.vehicles || s.vehicles.length === 0) && <span className="muted">No vehicles</span>}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13 }}>
                        <div>{s.start_date} to {s.end_date}</div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13 }}>
                        <strong>{s.washes_used || 0}</strong> / {s.max_washes} washes
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`pill ${pillClass}`}>{statusLabel}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div className="flex gap-4" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                            onClick={() => openRenew(s)}
                            title="Renew Subscription"
                          >
                            🔄 Renew
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '5px 8px', fontSize: 12, color: 'var(--red)', borderColor: '#fecdd3' }}
                            onClick={() => deleteSubscription(s.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. ADD / EDIT SUBSCRIPTION MODAL */}
      {showSubModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Add Customer Monthly Package</h3>

            {/* Mode Switcher Tabs */}
            <div className="status-tab-group mb-16" style={{ width: '100%', display: 'flex' }}>
              <button
                type="button"
                className={`status-tab ${customerMode === 'new' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setCustomerMode('new')}
              >
                ➕ Create New Customer & Vehicles
              </button>
              <button
                type="button"
                className={`status-tab ${customerMode === 'existing' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setCustomerMode('existing')}
              >
                👤 Choose Existing Customer
              </button>
            </div>

            <form onSubmit={saveSubscription}>
              {/* MODE 1: CREATE NEW CUSTOMER & ADD MULTIPLE VEHICLES */}
              {customerMode === 'new' && (
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16 }}>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--teal-dark)' }}>Customer & Vehicle Details</h4>
                  
                  <div className="grid grid-2">
                    <div className="field">
                      <label>Customer Name *</label>
                      <input
                        required
                        value={newCustomer.name}
                        onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        placeholder="e.g. John Doe"
                      />
                    </div>
                    <div className="field">
                      <label>Customer Phone *</label>
                      <input
                        required
                        value={newCustomer.phone}
                        onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        placeholder="e.g. 9876543210"
                      />
                    </div>
                  </div>

                  {/* Multiple Vehicles List */}
                  <div style={{ marginTop: 10 }}>
                    <div className="flex between center mb-8">
                      <label style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                        Customer Vehicles (Add 1 or Multiple Cars/Bikes) *
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '4px 8px' }}
                        onClick={addVehicleRow}
                      >
                        ➕ Add Another Vehicle
                      </button>
                    </div>

                    {newVehicles.map((v, idx) => (
                      <div key={idx} className="card mb-8" style={{ padding: 10, background: 'white' }}>
                        <div className="flex between center mb-6">
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-dark)' }}>Vehicle #{idx + 1}</span>
                          {newVehicles.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '2px 6px', fontSize: 11, color: 'var(--red)', borderColor: '#fecdd3' }}
                              onClick={() => removeVehicleRow(idx)}
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-3">
                          <div className="field" style={{ marginBottom: 4 }}>
                            <label style={{ fontSize: 11 }}>Reg Number *</label>
                            <input
                              required
                              value={v.reg_number}
                              onChange={e => updateVehicleRow(idx, 'reg_number', e.target.value)}
                              placeholder="KL-07-AB-1234"
                              style={{ textTransform: 'uppercase', padding: '6px 8px', fontSize: 13 }}
                            />
                          </div>
                          <div className="field" style={{ marginBottom: 4 }}>
                            <label style={{ fontSize: 11 }}>Brand & Model</label>
                            <input
                              value={v.brand}
                              onChange={e => updateVehicleRow(idx, 'brand', e.target.value)}
                              placeholder="e.g. Maruti Swift"
                              style={{ padding: '6px 8px', fontSize: 13 }}
                            />
                          </div>
                          <div className="field" style={{ marginBottom: 4 }}>
                            <label style={{ fontSize: 11 }}>Type / Segment</label>
                            <select
                              value={v.segment}
                              onChange={e => updateVehicleRow(idx, 'segment', e.target.value)}
                              style={{ padding: '6px 8px', fontSize: 13 }}
                            >
                              <option value="hatchback">Hatchback</option>
                              <option value="sedan">Sedan</option>
                              <option value="suv">SUV / MUV</option>
                              <option value="bike">Bike</option>
                              <option value="scooter">Scooter</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MODE 2: CHOOSE EXISTING CUSTOMER */}
              {customerMode === 'existing' && (
                <div>
                  <div className="field">
                    <label>Select Customer *</label>
                    <select
                      required={customerMode === 'existing'}
                      value={subForm.customer_id}
                      onChange={e => handleCustomerChange(e.target.value)}
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name || 'Unnamed'} ({c.phone || 'No phone'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Multi-Vehicle Checkbox Selector */}
                  {subForm.customer_id && (
                    <div className="field" style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16 }}>
                      <div className="flex between center mb-8">
                        <label style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                          Select Covered Vehicles for Subscription *
                        </label>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: '4px 8px' }}
                          onClick={() => setShowAddVehForm(!showAddVehForm)}
                        >
                          {showAddVehForm ? '✕ Close Form' : '➕ Add Vehicle to Customer'}
                        </button>
                      </div>

                      {/* Inline Form to add a new vehicle to existing customer */}
                      {showAddVehForm && (
                        <div className="card mb-12" style={{ padding: 10, background: 'white' }}>
                          <h5 style={{ margin: '0 0 8px 0', color: 'var(--teal-dark)' }}>Add New Vehicle for this Customer</h5>
                          <div className="grid grid-3 mb-8">
                            <input
                              placeholder="Reg No (KL-07-AB-1234)"
                              value={inlineVeh.reg_number}
                              onChange={e => setInlineVeh({ ...inlineVeh, reg_number: e.target.value })}
                              style={{ textTransform: 'uppercase', padding: '6px 8px', fontSize: 13 }}
                            />
                            <input
                              placeholder="Brand & Model"
                              value={inlineVeh.brand}
                              onChange={e => setInlineVeh({ ...inlineVeh, brand: e.target.value })}
                              style={{ padding: '6px 8px', fontSize: 13 }}
                            />
                            <select
                              value={inlineVeh.segment}
                              onChange={e => setInlineVeh({ ...inlineVeh, segment: e.target.value })}
                              style={{ padding: '6px 8px', fontSize: 13 }}
                            >
                              <option value="hatchback">Hatchback</option>
                              <option value="sedan">Sedan</option>
                              <option value="suv">SUV</option>
                              <option value="bike">Bike</option>
                            </select>
                          </div>
                          <button type="button" className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={handleAddInlineVehicle}>
                            Save Vehicle
                          </button>
                        </div>
                      )}

                      {customerVehicles.length === 0 ? (
                        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                          No vehicles registered yet for this customer. Click "➕ Add Vehicle to Customer" above.
                        </p>
                      ) : (
                        <div className="flex gap-8 wrap">
                          {customerVehicles.map(v => {
                            const isChecked = subForm.selected_vehicles.includes(v.id);
                            return (
                              <label
                                key={v.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  background: isChecked ? 'var(--teal-light)' : 'white',
                                  border: isChecked ? '1px solid var(--teal)' : '1px solid var(--border)',
                                  cursor: 'pointer',
                                  fontSize: 13,
                                  fontWeight: isChecked ? 600 : 400
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleVehicleSelection(v.id)}
                                />
                                <span>🚗 {v.reg_number} ({v.brand} {v.model})</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PACKAGE PLAN DETAILS */}
              <div className="grid grid-2">
                <div className="field">
                  <label>Package Plan Name</label>
                  <input
                    value={subForm.plan_name}
                    onChange={e => setSubForm({ ...subForm, plan_name: e.target.value })}
                    placeholder="e.g. Gold Monthly Package"
                  />
                </div>
                <div className="field">
                  <label>Monthly Package Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    value={subForm.price}
                    onChange={e => setSubForm({ ...subForm, price: e.target.value })}
                    placeholder="e.g. 1500"
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={subForm.start_date}
                    onChange={e => setSubForm({ ...subForm, start_date: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Valid Till (End Date)</label>
                  <input
                    type="date"
                    value={subForm.end_date}
                    onChange={e => setSubForm({ ...subForm, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>Max Washes Allowance *</label>
                  <select
                    value={subForm.max_washes}
                    onChange={e => setSubForm({ ...subForm, max_washes: Number(e.target.value) })}
                  >
                    {MAX_WASH_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Payment Method</label>
                  <div className="flex gap-8">
                    <button
                      type="button"
                      className={`btn ${subForm.payment_method === 'cash' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1, padding: '8px' }}
                      onClick={() => setSubForm({ ...subForm, payment_method: 'cash' })}
                    >
                      💵 Cash
                    </button>
                    <button
                      type="button"
                      className={`btn ${subForm.payment_method === 'gpay' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1, padding: '8px' }}
                      onClick={() => setSubForm({ ...subForm, payment_method: 'gpay' })}
                    >
                      📱 GPay
                    </button>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>Notes</label>
                <input
                  value={subForm.notes}
                  onChange={e => setSubForm({ ...subForm, notes: e.target.value })}
                  placeholder="e.g. Monthly wash package note"
                />
              </div>

              <div className="flex gap-8 justify-end mt-16">
                <button type="button" className="btn btn-outline" onClick={() => setShowSubModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Subscription</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RENEW SUBSCRIPTION MODAL */}
      {showRenewModal && activeSub && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 440 }}>
            <h3 style={{ marginTop: 0 }}>🔄 Renew Monthly Package</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>
              Customer: <strong>{activeSub.customer?.name}</strong> ({activeSub.plan_name})
            </p>

            <form onSubmit={submitRenewal}>
              <div className="field">
                <label>Renewal Rate (₹) *</label>
                <input
                  type="number"
                  required
                  value={renewForm.price}
                  onChange={e => setRenewForm({ ...renewForm, price: e.target.value })}
                  placeholder="e.g. 1500"
                />
              </div>

              <div className="field">
                <label>Payment Method</label>
                <div className="flex gap-8">
                  <button
                    type="button"
                    className={`btn ${renewForm.payment_method === 'cash' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setRenewForm({ ...renewForm, payment_method: 'cash' })}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    className={`btn ${renewForm.payment_method === 'gpay' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setRenewForm({ ...renewForm, payment_method: 'gpay' })}
                  >
                    📱 GPay
                  </button>
                </div>
              </div>

              <p className="muted" style={{ fontSize: 12 }}>
                ℹ️ Renewal extends validity for 1 month (+30 days) and resets washes used count to 0.
              </p>

              <div className="flex gap-8 justify-end mt-16">
                <button type="button" className="btn btn-outline" onClick={() => setShowRenewModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Renewal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
