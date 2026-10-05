import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { recognizeInvoice } from '../ocr';

const SUPPLIER_CATEGORIES = [
  'Shampoo',
  'Cloth',
  'Tag Perfume',
  'Chain Lube',
  'Other'
];

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [activeSupplier, setActiveSupplier] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerDetails, setLedgerDetails] = useState(null);

  // AI Invoice Scanner state
  const [scanningBill, setScanningBill] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Forms state
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    company_name: '',
    category: 'Shampoo',
    gst: '',
    location: '',
    contact_number: '',
    sales_person_name: '',
    sales_person_number: ''
  });

  const [purchaseForm, setPurchaseForm] = useState({
    item_details: '',
    category: 'Shampoo',
    total_amount: '',
    paid_amount: '',
    payment_method: 'cash',
    date: new Date().toISOString().slice(0, 10),
    note: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    date: new Date().toISOString().slice(0, 10),
    note: ''
  });

  async function loadSuppliers() {
    setLoading(true);
    try {
      const data = await api.get('/suppliers');
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function handleInvoiceUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setScanningBill(true);

    try {
      const invoice = await recognizeInvoice(file);
      console.log('[SUPPLIER BILL SCAN RESULT]:', invoice);

      if (!invoice) {
        alert('Could not process this bill image. Please upload a clear photo or enter details manually.');
        setScanningBill(false);
        return;
      }

      const supplierName = invoice.supplier_name || invoice.supplierName || invoice.supplier || '';
      const invoiceNo = invoice.invoice_number || invoice.invoiceNo || invoice.invoice_no || '';
      const date = invoice.invoice_date || invoice.invoiceDate || invoice.date || new Date().toISOString().slice(0, 10);
      const totalAmount = invoice.total_amount || invoice.totalAmount || 0;
      const balanceAmount = (invoice.balance_amount !== undefined && invoice.balance_amount !== null)
        ? invoice.balance_amount
        : (invoice.balanceAmount !== undefined ? invoice.balanceAmount : 0);
      const items = invoice.items || [];
      const rawText = invoice.raw_text || invoice.rawText || '';

      // Match supplier or find/create best fit
      let targetSupplier = null;
      const extractedName = (supplierName || '').trim();

      if (extractedName && extractedName !== 'Unknown Supplier' && extractedName !== 'Scanned Supplier') {
        const lowerName = extractedName.toLowerCase();
        targetSupplier = suppliers.find(s => {
          const sName = (s.name || '').toLowerCase();
          const cName = (s.company_name || '').toLowerCase();
          return sName.includes(lowerName) || lowerName.includes(sName) ||
                 (cName && (cName.includes(lowerName) || lowerName.includes(cName)));
        });
      }

      if (!targetSupplier && extractedName && extractedName !== 'Unknown Supplier' && extractedName !== 'Scanned Supplier') {
        // Auto-create missing supplier automatically
        try {
          const created = await api.post('/suppliers', {
            name: extractedName,
            company_name: extractedName,
            category: 'Shampoo'
          });
          targetSupplier = created;
          await loadSuppliers();
        } catch (err) {
          console.error('Failed auto-creating supplier:', err);
        }
      }

      if (!targetSupplier && activeSupplier) {
        targetSupplier = activeSupplier;
      }

      if (!targetSupplier && suppliers.length > 0) {
        targetSupplier = suppliers[0];
      }

      // Format items detail string
      let detailsText = '';
      if (items.length > 0) {
        detailsText = items.map(it => {
          const name = it.name || it.item_name || 'Item';
          const qty = it.qty || it.quantity || '';
          const amt = it.amount || it.total || '';
          let line = name;
          if (qty) line += ` (Qty: ${qty})`;
          if (amt) line += ` - ₹${amt}`;
          return line;
        }).join('\n');
      } else if (rawText) {
        detailsText = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean).slice(0, 6).join('\n');
      } else {
        detailsText = 'Supplier Bill Purchase';
      }

      const total = Number(totalAmount) || 0;
      const balance = Number(balanceAmount) || 0;
      const paid = total > 0 ? Math.max(0, total - balance) : 0;

      if (targetSupplier) {
        setActiveSupplier(targetSupplier);
      }

      setPurchaseForm({
        item_details: detailsText,
        category: targetSupplier?.category || activeSupplier?.category || 'Shampoo',
        total_amount: total ? String(total) : '',
        paid_amount: paid ? String(paid) : '',
        payment_method: 'cash',
        date: date || new Date().toISOString().slice(0, 10),
        note: invoiceNo ? `Bill #${invoiceNo}` : 'AI Bill Scan'
      });

      setShowPurchaseModal(true);
    } catch (err) {
      console.error('Invoice scan error:', err);
      alert('Failed to scan invoice: ' + (err.message || 'Unknown error'));
    } finally {
      setScanningBill(false);
      if (e.target) e.target.value = '';
    }
  }

  function openAddSupplier() {
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      company_name: '',
      category: 'Shampoo',
      gst: '',
      location: '',
      contact_number: '',
      sales_person_name: '',
      sales_person_number: ''
    });
    setShowSupplierModal(true);
  }

  function openEditSupplier(s) {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name || '',
      company_name: s.company_name || '',
      category: s.category || 'Shampoo',
      gst: s.gst || '',
      location: s.location || '',
      contact_number: s.contact_number || '',
      sales_person_name: s.sales_person_name || '',
      sales_person_number: s.sales_person_number || ''
    });
    setShowSupplierModal(true);
  }

  async function saveSupplier(e) {
    e.preventDefault();
    if (!supplierForm.name) return alert('Supplier name is required');

    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, supplierForm);
      } else {
        await api.post('/suppliers', supplierForm);
      }
      setShowSupplierModal(false);
      loadSuppliers();
    } catch (err) {
      alert(err.message || 'Failed to save supplier');
    }
  }

  async function deleteSupplier(id) {
    if (!window.confirm('Are you sure you want to delete this supplier and all purchase history?')) return;
    try {
      await api.del(`/suppliers/${id}`);
      loadSuppliers();
    } catch (err) {
      alert(err.message || 'Failed to delete supplier');
    }
  }

  function openPurchaseModal(s) {
    setActiveSupplier(s);
    setPurchaseForm({
      item_details: '',
      category: s.category || 'Shampoo',
      total_amount: '',
      paid_amount: '',
      payment_method: 'cash',
      date: new Date().toISOString().slice(0, 10),
      note: ''
    });
    setShowPurchaseModal(true);
  }

  async function submitPurchase(e) {
    e.preventDefault();
    if (!purchaseForm.total_amount) return alert('Total purchase amount is required');

    try {
      await api.post(`/suppliers/${activeSupplier.id}/purchases`, {
        ...purchaseForm,
        total_amount: Number(purchaseForm.total_amount),
        paid_amount: Number(purchaseForm.paid_amount || 0)
      });
      setShowPurchaseModal(false);
      loadSuppliers();
      alert('Purchase recorded! Expense entry logged automatically.');
    } catch (err) {
      alert(err.message || 'Failed to record purchase');
    }
  }

  function openPaymentModal(s) {
    setActiveSupplier(s);
    setPaymentForm({
      amount: '',
      payment_method: 'cash',
      date: new Date().toISOString().slice(0, 10),
      note: ''
    });
    setShowPaymentModal(true);
  }

  async function submitPayment(e) {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) return alert('Enter a valid payment amount');

    try {
      await api.post(`/suppliers/${activeSupplier.id}/payments`, {
        ...paymentForm,
        amount: Number(paymentForm.amount)
      });
      setShowPaymentModal(false);
      loadSuppliers();
      alert('Payment recorded! Expense entry logged automatically.');
    } catch (err) {
      alert(err.message || 'Failed to record payment');
    }
  }

  async function openLedger(s) {
    try {
      const details = await api.get(`/suppliers/${s.id}`);
      setLedgerDetails(details);
      setShowLedgerModal(true);
    } catch (err) {
      alert(err.message || 'Failed to fetch ledger details');
    }
  }

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter(s => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (s.name || '').toLowerCase().includes(q) ||
      (s.company_name || '').toLowerCase().includes(q) ||
      (s.contact_number || '').toLowerCase().includes(q) ||
      (s.sales_person_name || '').toLowerCase().includes(q)
    );
    return matchesCat && matchesSearch;
  });

  const totalPurchasesSum = suppliers.reduce((sum, s) => sum + (s.total_purchases || 0), 0);
  const totalPaidSum = suppliers.reduce((sum, s) => sum + (s.total_paid || 0), 0);
  const totalPendingSum = suppliers.reduce((sum, s) => sum + (s.pending_balance || 0), 0);

  return (
    <div>
      {/* Hidden File / Camera Inputs for Invoice Scanning */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,.pdf"
        style={{ display: 'none' }}
        onChange={handleInvoiceUpload}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleInvoiceUpload}
      />

      {/* AI Scanning Loading Overlay */}
      {scanningBill && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card text-center" style={{ width: '90%', maxWidth: 400, padding: 32, borderRadius: 16 }}>
            <div style={{ fontSize: 42, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>📸</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700 }}>Scanning Supplier Bill with AI</h3>
            <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              Automatically extracting items, quantities, rates, supplier name, date, total amount & pending balance...
            </p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>🚚 Supplier Management</h1>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 14 }}>
            Manage product suppliers, purchase orders, balance payouts, and automatic daily expense logs
          </p>
        </div>

        <div className="flex gap-8 wrap">
          <button
            type="button"
            className="btn btn-secondary flex center gap-4"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            title="Upload invoice photo or PDF"
            style={{ background: 'var(--card-bg, #1e293b)', color: '#38bdf8', border: '1px solid #38bdf8' }}
          >
            📄 Upload Bill Photo
          </button>

          <button
            type="button"
            className="btn btn-secondary flex center gap-4"
            onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
            title="Scan bill with camera"
            style={{ background: 'var(--card-bg, #1e293b)', color: '#a855f7', border: '1px solid #a855f7' }}
          >
            📸 Camera Scan
          </button>

          <button className="btn btn-primary" onClick={openAddSupplier}>
            ➕ Add Supplier
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-4 mb-16">
        <div className="card stat-card">
          <div className="icon">🚚</div>
          <div className="value">{suppliers.length}</div>
          <div className="label">Total Suppliers</div>
        </div>
        <div className="card stat-card">
          <div className="icon">📦</div>
          <div className="value">₹{totalPurchasesSum.toLocaleString()}</div>
          <div className="label">Total Billed Purchases</div>
        </div>
        <div className="card stat-card">
          <div className="icon">💵</div>
          <div className="value">₹{totalPaidSum.toLocaleString()}</div>
          <div className="label">Total Amount Paid</div>
        </div>
        <div className="card stat-card">
          <div className="icon">⏳</div>
          <div className="value" style={{ color: totalPendingSum > 0 ? 'var(--amber)' : 'inherit' }}>
            ₹{totalPendingSum.toLocaleString()}
          </div>
          <div className="label">Pending Balance</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card mb-16 flex between center gap-12 wrap">
        {/* Category Pills */}
        <div className="status-tab-group">
          <button
            className={`status-tab ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Categories
          </button>
          {SUPPLIER_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`status-tab ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <input
          type="text"
          placeholder="Search supplier, company, contact..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: 260 }}
        />
      </div>

      {/* Suppliers Table */}
      <div className="card">
        <h3>Supplier Directory ({filteredSuppliers.length})</h3>
        {loading && <p className="muted">Loading suppliers...</p>}

        {!loading && (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px' }}>Supplier & Company</th>
                  <th style={{ padding: '10px 12px' }}>Category</th>
                  <th style={{ padding: '10px 12px' }}>Contact Info</th>
                  <th style={{ padding: '10px 12px' }}>Sales Representative</th>
                  <th style={{ padding: '10px 12px' }}>Total Billed</th>
                  <th style={{ padding: '10px 12px' }}>Paid</th>
                  <th style={{ padding: '10px 12px' }}>Pending Balance</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan="8" className="muted" style={{ padding: 16, textAlign: 'center' }}>
                      No suppliers found. Click "+ Add Supplier" to register one.
                    </td>
                  </tr>
                )}
                {filteredSuppliers.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {s.company_name ? `${s.company_name} · ` : ''}{s.location || 'Location N/A'}
                        {s.gst ? ` · GST: ${s.gst}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="pill pill-teal">{s.category || 'Other'}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 13 }}>{s.contact_number || '-'}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.sales_person_name || '-'}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{s.sales_person_number || ''}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>₹{s.total_purchases || 0}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--green)', fontWeight: 600 }}>₹{s.total_paid || 0}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {(s.pending_balance || 0) > 0 ? (
                        <div>
                          <span className="pill pill-amber" style={{ fontWeight: 700, fontSize: 12 }}>
                            ⏳ ₹{s.pending_balance} Pending
                          </span>
                        </div>
                      ) : (
                        <span className="pill pill-green" style={{ fontSize: 11 }}>
                          ✅ Fully Cleared
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div className="flex gap-4" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => openPurchaseModal(s)}
                          title="Record Product Purchase"
                        >
                          🛒 Purchase
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => openPaymentModal(s)}
                          title="Pay Pending Balance"
                        >
                          💵 Pay
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => openLedger(s)}
                          title="View Ledger"
                        >
                          📋 Ledger
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '5px 8px', fontSize: 12 }}
                          onClick={() => openEditSupplier(s)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '5px 8px', fontSize: 12, color: 'var(--red)', borderColor: '#fecdd3' }}
                          onClick={() => deleteSupplier(s.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. ADD / EDIT SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 22,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  lineHeight: 1
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={saveSupplier}>
              <div className="field">
                <label>Supplier Name / Shop Name *</label>
                <input
                  required
                  value={supplierForm.name}
                  onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="e.g. CleanCare Traders"
                />
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>Company Name</label>
                  <input
                    value={supplierForm.company_name}
                    onChange={e => setSupplierForm({ ...supplierForm, company_name: e.target.value })}
                    placeholder="e.g. CleanCare Pvt Ltd"
                  />
                </div>
                <div className="field">
                  <label>Category *</label>
                  <select
                    value={supplierForm.category}
                    onChange={e => setSupplierForm({ ...supplierForm, category: e.target.value })}
                  >
                    {SUPPLIER_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>GST Number</label>
                  <input
                    value={supplierForm.gst}
                    onChange={e => setSupplierForm({ ...supplierForm, gst: e.target.value })}
                    placeholder="e.g. 32AAAAA0000A1Z5"
                  />
                </div>
                <div className="field">
                  <label>Location / City</label>
                  <input
                    value={supplierForm.location}
                    onChange={e => setSupplierForm({ ...supplierForm, location: e.target.value })}
                    placeholder="e.g. Kochi"
                  />
                </div>
              </div>

              <div className="field">
                <label>Contact Number</label>
                <input
                  value={supplierForm.contact_number}
                  onChange={e => setSupplierForm({ ...supplierForm, contact_number: e.target.value })}
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>Sales Representative Name</label>
                  <input
                    value={supplierForm.sales_person_name}
                    onChange={e => setSupplierForm({ ...supplierForm, sales_person_name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div className="field">
                  <label>Sales Representative Number</label>
                  <input
                    value={supplierForm.sales_person_number}
                    onChange={e => setSupplierForm({ ...supplierForm, sales_person_number: e.target.value })}
                    placeholder="e.g. 9123456789"
                  />
                </div>
              </div>

              <div className="flex gap-8 justify-end mt-16">
                <button type="button" className="btn btn-outline" onClick={() => setShowSupplierModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingSupplier ? 'Update Supplier' : 'Save Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RECORD PURCHASE MODAL */}
      {showPurchaseModal && activeSupplier && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>🛒 Record Product Purchase</h3>
              <div className="flex gap-8 center">
                <button
                  type="button"
                  className="btn btn-secondary flex center gap-4"
                  style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #38bdf8', color: '#38bdf8' }}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  title="Upload bill photo to auto-fill items and total"
                >
                  📄 Upload Bill
                </button>
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 22,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    padding: '2px 8px',
                    borderRadius: 6,
                    lineHeight: 1
                  }}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>
            <form onSubmit={submitPurchase}>
              <div className="field mb-12">
                <label>Select Supplier *</label>
                <select
                  value={activeSupplier?.id || ''}
                  onChange={e => {
                    const sel = suppliers.find(s => String(s.id) === e.target.value);
                    if (sel) setActiveSupplier(sel);
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Item Description / Details (Scanned / Entered Items)</label>
                <textarea
                  rows={4}
                  value={purchaseForm.item_details}
                  onChange={e => setPurchaseForm({ ...purchaseForm, item_details: e.target.value })}
                  placeholder="e.g. WAX SHAMPOO R60 (Qty: 30 Kg) - ₹3200&#10;DASH POLISH WB (Qty: 10 Kg) - ₹1200"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>Total Billed Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={purchaseForm.total_amount}
                    onChange={e => setPurchaseForm({ ...purchaseForm, total_amount: e.target.value })}
                    placeholder="e.g. 2000"
                  />
                </div>
                <div className="field">
                  <label>Amount Paid Now (₹)</label>
                  <input
                    type="number"
                    value={purchaseForm.paid_amount}
                    onChange={e => setPurchaseForm({ ...purchaseForm, paid_amount: e.target.value })}
                    placeholder="e.g. 1000"
                  />
                </div>
              </div>

              {/* Dynamically computed pending amount box */}
              {purchaseForm.total_amount && (
                <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 8, marginBottom: 14, border: '1px solid var(--border)' }}>
                  <div className="flex between">
                    <span className="muted" style={{ fontSize: 13 }}>Remaining Pending Balance for this Bill:</span>
                    <strong style={{ color: (Number(purchaseForm.total_amount || 0) - Number(purchaseForm.paid_amount || 0)) > 0 ? 'var(--amber)' : 'var(--green)' }}>
                      ₹{Math.max(0, Number(purchaseForm.total_amount || 0) - Number(purchaseForm.paid_amount || 0))}
                    </strong>
                  </div>
                </div>
              )}

              <p className="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 12 }}>
                💡 <strong>How Bills Work:</strong> When a supplier gives a bill, enter the total amount here. If you pay now or settle an earlier bill, enter that amount in <em>Amount Paid Now</em>. Unpaid balances stay in <em>Pending Balance</em> until you click <strong>💵 Pay</strong> to clear it!
              </p>

              <div className="field">
                <label>Payment Method (for Paid Amount)</label>
                <div className="flex gap-8">
                  <button
                    type="button"
                    className={`btn ${purchaseForm.payment_method === 'cash' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setPurchaseForm({ ...purchaseForm, payment_method: 'cash' })}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    className={`btn ${purchaseForm.payment_method === 'gpay' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setPurchaseForm({ ...purchaseForm, payment_method: 'gpay' })}
                  >
                    📱 GPay
                  </button>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseForm.date}
                    onChange={e => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Notes / Ref No</label>
                  <input
                    value={purchaseForm.note}
                    onChange={e => setPurchaseForm({ ...purchaseForm, note: e.target.value })}
                    placeholder="e.g. Bill #104"
                  />
                </div>
              </div>

              <p className="muted" style={{ fontSize: 12 }}>
                ℹ️ Paid amount will automatically be logged into today's daily expenses under "Purchase (materials)".
              </p>

              <div className="flex gap-8 justify-end mt-16">
                <button type="button" className="btn btn-outline" onClick={() => setShowPurchaseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Purchase</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. PAY PENDING BALANCE MODAL */}
      {showPaymentModal && activeSupplier && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ margin: 0 }}>💵 Pay Supplier Balance</h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 22,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  lineHeight: 1
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>
              Supplier: <strong>{activeSupplier.name}</strong> · Current Pending: <strong style={{ color: 'var(--amber)' }}>₹{activeSupplier.pending_balance || 0}</strong>
            </p>

            <form onSubmit={submitPayment}>
              <div className="field">
                <label>Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder={`Max ₹${activeSupplier.pending_balance || 0}`}
                />
                
                {/* Settlement Quick Presets */}
                {(activeSupplier.pending_balance || 0) > 0 && (
                  <div className="flex gap-8 mt-8 wrap">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '4px 8px' }}
                      onClick={() => setPaymentForm({ ...paymentForm, amount: String(activeSupplier.pending_balance) })}
                    >
                      💰 Full Clear (₹{activeSupplier.pending_balance})
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: 11, padding: '4px 8px' }}
                      onClick={() => setPaymentForm({ ...paymentForm, amount: String(Math.round(activeSupplier.pending_balance / 2)) })}
                    >
                      🌗 Pay 50% (₹{Math.round(activeSupplier.pending_balance / 2)})
                    </button>
                  </div>
                )}
              </div>

              <div className="field">
                <label>Payment Method</label>
                <div className="flex gap-8">
                  <button
                    type="button"
                    className={`btn ${paymentForm.payment_method === 'cash' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setPaymentForm({ ...paymentForm, payment_method: 'cash' })}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentForm.payment_method === 'gpay' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setPaymentForm({ ...paymentForm, payment_method: 'gpay' })}
                  >
                    📱 GPay
                  </button>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Payment Note</label>
                  <input
                    value={paymentForm.note}
                    onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })}
                    placeholder="e.g. Partial settlement"
                  />
                </div>
              </div>

              <p className="muted" style={{ fontSize: 12 }}>
                ℹ️ Payment will automatically be logged into today's daily expenses under "Purchase (materials)".
              </p>

              <div className="flex gap-8 justify-end mt-16">
                <button type="button" className="btn btn-outline" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Payout</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. LEDGER HISTORY MODAL */}
      {showLedgerModal && ledgerDetails && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex between center">
              <h3 style={{ margin: 0 }}>📋 Supplier Ledger: {ledgerDetails.name}</h3>
              <button
                type="button"
                onClick={() => setShowLedgerModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 22,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  lineHeight: 1
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {ledgerDetails.company_name} · {ledgerDetails.category} · Contact: {ledgerDetails.contact_number || '-'}
            </p>

            <div className="grid grid-3 mb-16" style={{ marginTop: 12 }}>
              <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 10 }}>
                <div className="muted" style={{ fontSize: 12 }}>Total Billed</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>₹{ledgerDetails.total_purchases}</div>
              </div>
              <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 10 }}>
                <div className="muted" style={{ fontSize: 12 }}>Total Paid</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>₹{ledgerDetails.total_paid}</div>
              </div>
              <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 10 }}>
                <div className="muted" style={{ fontSize: 12 }}>Pending Balance</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: ledgerDetails.pending_balance > 0 ? 'var(--amber)' : 'inherit' }}>
                  ₹{ledgerDetails.pending_balance}
                </div>
              </div>
            </div>

            <h4>Purchases History & Bill Status</h4>
            <div className="table-responsive" style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 10px' }}>Date</th>
                    <th style={{ padding: '8px 10px' }}>Items / Details</th>
                    <th style={{ padding: '8px 10px' }}>Total Amount</th>
                    <th style={{ padding: '8px 10px' }}>Initial Paid</th>
                    <th style={{ padding: '8px 10px' }}>Bill Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(!ledgerDetails.purchases || ledgerDetails.purchases.length === 0) && (
                    <tr><td colSpan="5" className="muted" style={{ padding: 12, textAlign: 'center' }}>No purchases recorded.</td></tr>
                  )}
                  {ledgerDetails.purchases?.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px' }}>{p.date}</td>
                      <td style={{ padding: '8px 10px' }}>
                        {p.item_details || p.category} {p.note ? `(${p.note})` : ''}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>₹{p.total_amount}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--green)' }}>₹{p.paid_amount} ({p.payment_method})</td>
                      <td style={{ padding: '8px 10px' }}>
                        {p.pending_amount === 0 ? (
                          <span className="pill pill-green" style={{ fontSize: 10 }}>✅ Cleared</span>
                        ) : (
                          <span className="pill pill-amber" style={{ fontSize: 10, fontWeight: 700 }}>
                            ⏳ Pending ₹{p.pending_amount}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4>Subsequent Payouts Log</h4>
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 10px' }}>Date</th>
                    <th style={{ padding: '8px 10px' }}>Payment Method</th>
                    <th style={{ padding: '8px 10px' }}>Notes</th>
                    <th style={{ padding: '8px 10px' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {(!ledgerDetails.payments || ledgerDetails.payments.length === 0) && (
                    <tr><td colSpan="4" className="muted" style={{ padding: 12, textAlign: 'center' }}>No balance payout entries.</td></tr>
                  )}
                  {ledgerDetails.payments?.map(pay => (
                    <tr key={pay.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px' }}>{pay.date}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span className={`pill ${pay.payment_method === 'cash' ? 'pill-green' : 'pill-blue'}`}>
                          {pay.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>{pay.note || '-'}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--green)' }}>₹{pay.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
