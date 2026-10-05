import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatCategoryName(cat) {
  if (!cat) return 'Other';
  const map = {
    purchase: 'Purchase (materials)',
    fuel: 'Fuel (Petrol/Diesel)',
    rental: 'Rental',
    electricity: 'Electricity',
    staff_grocery: 'Staff Grocery',
    owner_advance: 'Owner Advance',
    other: 'Other'
  };
  if (map[cat]) return map[cat];
  return cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const REPORT_META = {
  sales: { title: 'Sales Report', icon: '💰', subtitle: 'Detailed sales revenue and transaction analysis' },
  expenses: { title: 'Expense Report', icon: '💸', subtitle: 'Detailed operational expenses and category totals' },
  cars: { title: 'Car Wash Report', icon: '🚗', subtitle: 'Car wash counts, segment breakdown, and revenue' },
  bikes: { title: 'Bike & Scooter Wash Report', icon: '🏍️', subtitle: 'Two-wheeler washes, chain lube add-ons, and revenue' },
  'car-workshops': { title: 'Car Workshop Report', icon: '🏬', subtitle: 'Car workshop billings, settlements, and pending dues' },
  'bike-workshops': { title: 'Bike Workshop Report', icon: '🔧', subtitle: 'Bike workshop billings, settlements, and pending dues' },
  attendance: { title: 'Attendance Report', icon: '📅', subtitle: 'Employee presence, absentees, late arrivals, and overtime' },
  salary: { title: 'Salary & Payroll Report', icon: '💼', subtitle: 'Monthly employee salaries, overtime pay, and advance deductions' },
  customers: { title: 'Customers & Rewards Report', icon: '👥', subtitle: 'Customer profiles, vehicle registrations, and reward points' },
  'salary-advances': { title: 'Salary Advance Report', icon: '💵', subtitle: 'History of salary advance payouts to staff' }
};

export default function Reports() {
  const { reportType } = useParams();
  const activeTab = reportType || 'sales';
  const meta = REPORT_META[activeTab] || REPORT_META.sales;

  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(daysAgo(0));
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchReportData() {
      setLoading(true);
      try {
        let res = null;
        if (activeTab === 'sales') {
          res = await api.get(`/reports/sales-report?from=${from}&to=${to}`);
        } else if (activeTab === 'expenses') {
          res = await api.get(`/reports/expense-report?from=${from}&to=${to}`);
        } else if (activeTab === 'cars') {
          res = await api.get(`/reports/car-report?from=${from}&to=${to}`);
        } else if (activeTab === 'bikes') {
          res = await api.get(`/reports/bike-report?from=${from}&to=${to}`);
        } else if (activeTab === 'car-workshops') {
          res = await api.get(`/reports/car-workshop-report?from=${from}&to=${to}`);
        } else if (activeTab === 'bike-workshops') {
          res = await api.get(`/reports/bike-workshop-report?from=${from}&to=${to}`);
        } else if (activeTab === 'attendance') {
          res = await api.get(`/reports/attendance-report?from=${from}&to=${to}`);
        } else if (activeTab === 'salary') {
          res = await api.get(`/reports/salary-report?month=${month}&year=${year}`);
        } else if (activeTab === 'customers') {
          res = await api.get(`/reports/customers-report?q=${encodeURIComponent(searchQuery)}`);
        } else if (activeTab === 'salary-advances') {
          res = await api.get(`/reports/salary-advance-report?from=${from}&to=${to}`);
        }
        setData(res);
      } catch (err) {
        console.error('Error fetching report:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReportData();
  }, [activeTab, from, to, month, year, searchQuery]);

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{meta.icon}</span>
            <span>{meta.title}</span>
          </h1>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 14 }}>
            {meta.subtitle}
          </p>
        </div>

        {/* Date / Filter Controls */}
        <div className="flex gap-8 center">
          {activeTab === 'salary' ? (
            <>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 140 }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100 }}>
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          ) : activeTab === 'customers' ? (
            <input
              type="text"
              placeholder="Search customer name or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: 280 }}
            />
          ) : (
            <>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 140 }} />
              <span className="muted">to</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: 140 }} />
            </>
          )}
        </div>
      </div>

      {loading && <p className="muted">Loading report data...</p>}

      {!loading && data && (
        <>
          {/* 1. SALES REPORT PAGE */}
          {activeTab === 'sales' && (
            <div>
              <div className="grid grid-4 mb-16">
                <div className="card stat-card">
                  <div className="icon">💰</div>
                  <div className="value">₹{data.total_sales || 0}</div>
                  <div className="label">Total Sales</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">💵</div>
                  <div className="value">₹{data.cash_sales || 0}</div>
                  <div className="label">Cash Sales</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">📱</div>
                  <div className="value">₹{data.gpay_sales || 0}</div>
                  <div className="label">GPay Sales</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">🎟️</div>
                  <div className="value">₹{data.average_ticket || 0}</div>
                  <div className="label">Avg Bill Amount ({data.bills_count || 0} bills)</div>
                </div>
              </div>

              <div className="grid grid-2 mb-16">
                <div className="card">
                  <div className="flex between">
                    <span className="muted">Retail Customer Sales</span>
                    <strong>₹{data.retail_sales || 0}</strong>
                  </div>
                  <div className="flex between mt-8">
                    <span className="muted">Workshop Billed Sales</span>
                    <strong>₹{data.workshop_sales || 0}</strong>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3>Sales Transactions ({data.bills?.length || 0})</h3>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 12px' }}>Bill #</th>
                        <th style={{ padding: '10px 12px' }}>Date & Time</th>
                        <th style={{ padding: '10px 12px' }}>Vehicle</th>
                        <th style={{ padding: '10px 12px' }}>Customer Type</th>
                        <th style={{ padding: '10px 12px' }}>Payment Method</th>
                        <th style={{ padding: '10px 12px' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.bills || data.bills.length === 0) && (
                        <tr><td colSpan="6" className="muted" style={{ padding: 16, textAlign: 'center' }}>No sales found in this period.</td></tr>
                      )}
                      {data.bills?.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>#{b.bill_number || b.id}</td>
                          <td style={{ padding: '10px 12px' }}>{b.paid_at ? new Date(b.paid_at).toLocaleString() : '-'}</td>
                          <td style={{ padding: '10px 12px' }}>{b.reg_number ? `${b.reg_number} (${b.brand || ''} ${b.model || ''})` : '-'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className={`pill ${b.customer_type === 'workshop' ? 'pill-purple' : 'pill-teal'}`}>
                              {b.customer_type || 'retail'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className={`pill ${b.payment_method === 'cash' ? 'pill-green' : 'pill-blue'}`}>
                              {b.payment_method}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--teal-dark)' }}>₹{b.final_amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. EXPENSE REPORT PAGE */}
          {activeTab === 'expenses' && (
            <div>
              <div className="grid grid-4 mb-16">
                <div className="card stat-card">
                  <div className="icon">💸</div>
                  <div className="value">₹{data.total_expenses || 0}</div>
                  <div className="label">Total Expenses</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">💵</div>
                  <div className="value">₹{data.cash_expenses || 0}</div>
                  <div className="label">Cash Expenses</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">📱</div>
                  <div className="value">₹{data.gpay_expenses || 0}</div>
                  <div className="label">GPay / Online Expenses</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">📊</div>
                  <div className="value">{data.expenses_count || 0}</div>
                  <div className="label">Total Entries</div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="card mb-16">
                <h3>Category Breakdown</h3>
                <div className="flex gap-12 wrap mt-12">
                  {Object.entries(data.category_totals || {}).map(([cat, total]) => (
                    <div key={cat} style={{ background: 'var(--bg)', padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <span className="muted" style={{ fontSize: 12 }}>{formatCategoryName(cat)}</span>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>₹{total}</div>
                    </div>
                  ))}
                  {Object.keys(data.category_totals || {}).length === 0 && (
                    <p className="muted">No expenses recorded for this period.</p>
                  )}
                </div>
              </div>

              <div className="card">
                <h3>Expense Log</h3>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 12px' }}>Date</th>
                        <th style={{ padding: '10px 12px' }}>Category</th>
                        <th style={{ padding: '10px 12px' }}>Description</th>
                        <th style={{ padding: '10px 12px' }}>Payment Method</th>
                        <th style={{ padding: '10px 12px' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.expenses || data.expenses.length === 0) && (
                        <tr><td colSpan="5" className="muted" style={{ padding: 16, textAlign: 'center' }}>No expenses logged in this date range.</td></tr>
                      )}
                      {data.expenses?.map(e => (
                        <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px' }}>{e.date}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className="pill pill-red">
                              {formatCategoryName(e.category)}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>{e.description || '-'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className={`pill ${e.payment_method === 'cash' ? 'pill-green' : 'pill-blue'}`}>
                              {e.payment_method}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--red)' }}>₹{e.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. CAR REPORT PAGE */}
          {activeTab === 'cars' && (
            <div>
              <div className="grid grid-4 mb-16">
                <div className="card stat-card">
                  <div className="icon">🚗</div>
                  <div className="value">{data.total_cars || 0}</div>
                  <div className="label">Total Cars Washed</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">📈</div>
                  <div className="value">₹{data.total_revenue || 0}</div>
                  <div className="label">Car Wash Revenue</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">🚘</div>
                  <div className="value">{data.segment_counts?.hatchback || 0}</div>
                  <div className="label">Hatchbacks</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">🚙</div>
                  <div className="value">{(data.segment_counts?.sedan || 0) + (data.segment_counts?.suv || 0)}</div>
                  <div className="label">Sedans & SUVs</div>
                </div>
              </div>

              {/* Wash Types breakdown */}
              <div className="card mb-16">
                <h3>Car Wash Types Breakdown</h3>
                <div className="flex gap-12 wrap mt-12">
                  {Object.entries(data.wash_type_counts || {}).map(([type, count]) => (
                    <div key={type} style={{ background: 'var(--bg)', padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <span className="muted" style={{ fontSize: 12 }}>{type}</span>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{count} washes</div>
                    </div>
                  ))}
                  {Object.keys(data.wash_type_counts || {}).length === 0 && (
                    <p className="muted">No car wash data in this period.</p>
                  )}
                </div>
              </div>

              <div className="card">
                <h3>Car Wash Jobs ({data.jobs?.length || 0})</h3>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 12px' }}>Reg Number</th>
                        <th style={{ padding: '10px 12px' }}>Vehicle Details</th>
                        <th style={{ padding: '10px 12px' }}>Segment</th>
                        <th style={{ padding: '10px 12px' }}>Wash Type</th>
                        <th style={{ padding: '10px 12px' }}>Entry Time</th>
                        <th style={{ padding: '10px 12px' }}>Payment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.jobs || data.jobs.length === 0) && (
                        <tr><td colSpan="6" className="muted" style={{ padding: 16, textAlign: 'center' }}>No car washes found in this period.</td></tr>
                      )}
                      {data.jobs?.map(j => (
                        <tr key={j.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{j.reg_number}</td>
                          <td style={{ padding: '10px 12px' }}>{j.brand} {j.model}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className="pill pill-teal">{j.segment || 'Car'}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>{j.wash_type_name}</td>
                          <td style={{ padding: '10px 12px' }}>{new Date(j.entry_time).toLocaleString()}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className={`pill ${j.payment_status === 'settled' ? 'pill-green' : 'pill-amber'}`}>
                              {j.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. BIKE REPORT PAGE */}
          {activeTab === 'bikes' && (
            <div>
              <div className="grid grid-4 mb-16">
                <div className="card stat-card">
                  <div className="icon">🏍️</div>
                  <div className="value">{data.total_bikes || 0}</div>
                  <div className="label">Total Bikes & Scooters</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">🛵</div>
                  <div className="value">{data.scooter_count || 0} Scooters / {data.bike_count || 0} Bikes</div>
                  <div className="label">Type Breakdown</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">⚙️</div>
                  <div className="value">{data.chain_lube_count || 0} (₹{data.chain_lube_revenue || 0})</div>
                  <div className="label">Chain Lube Services</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">💰</div>
                  <div className="value">₹{data.total_revenue || 0}</div>
                  <div className="label">Total Bike Revenue</div>
                </div>
              </div>

              <div className="card">
                <h3>Bike Wash Jobs ({data.jobs?.length || 0})</h3>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 12px' }}>Reg Number</th>
                        <th style={{ padding: '10px 12px' }}>Vehicle Details</th>
                        <th style={{ padding: '10px 12px' }}>Wash Type</th>
                        <th style={{ padding: '10px 12px' }}>Chain Lube</th>
                        <th style={{ padding: '10px 12px' }}>Entry Time</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.jobs || data.jobs.length === 0) && (
                        <tr><td colSpan="6" className="muted" style={{ padding: 16, textAlign: 'center' }}>No bike washes found in this period.</td></tr>
                      )}
                      {data.jobs?.map(j => (
                        <tr key={j.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{j.reg_number}</td>
                          <td style={{ padding: '10px 12px' }}>{j.brand} {j.model} ({j.segment})</td>
                          <td style={{ padding: '10px 12px' }}>{j.wash_type_name}</td>
                          <td style={{ padding: '10px 12px' }}>
                            {j.has_chain_lube ? (
                              <span className="pill pill-purple">Yes (+₹{j.chain_lube_price || 150})</span>
                            ) : (
                              <span className="muted">-</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>{new Date(j.entry_time).toLocaleString()}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className={`pill ${j.payment_status === 'settled' ? 'pill-green' : 'pill-amber'}`}>
                              {j.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. CAR WORKSHOP REPORT PAGE */}
          {activeTab === 'car-workshops' && (
            <div>
              <div className="grid grid-4 mb-16">
                <div className="card stat-card">
                  <div className="icon">🏬</div>
                  <div className="value">{data.workshops_count || 0}</div>
                  <div className="label">Car Workshops</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">🚗</div>
                  <div className="value">{data.workshops?.reduce((s, w) => s + w.cars_count, 0) || 0}</div>
                  <div className="label">Cars Washed</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">💵</div>
                  <div className="value">₹{data.workshops?.reduce((s, w) => s + w.paid_amount, 0) || 0}</div>
                  <div className="label">Total Settled</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">⏳</div>
                  <div className="value" style={{ color: 'var(--amber)' }}>
                    ₹{data.workshops?.reduce((s, w) => s + w.unpaid_amount, 0) || 0}
                  </div>
                  <div className="label">Pending Balance</div>
                </div>
              </div>

              <div className="card">
                <h3>Car Workshop Summary</h3>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 12px' }}>Workshop Name</th>
                        <th style={{ padding: '10px 12px' }}>Cars Count</th>
                        <th style={{ padding: '10px 12px' }}>Total Amount</th>
                        <th style={{ padding: '10px 12px' }}>Paid Amount</th>
                        <th style={{ padding: '10px 12px' }}>Unpaid Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.workshops || data.workshops.length === 0) && (
                        <tr><td colSpan="5" className="muted" style={{ padding: 16, textAlign: 'center' }}>No Car Workshops found.</td></tr>
                      )}
                      {data.workshops?.map(w => (
                        <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{w.name}</td>
                          <td style={{ padding: '10px 12px' }}>{w.cars_count} cars</td>
                          <td style={{ padding: '10px 12px' }}>₹{w.total_amount}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--green)', fontWeight: 600 }}>₹{w.paid_amount}</td>
                          <td style={{ padding: '10px 12px', color: w.unpaid_amount > 0 ? 'var(--amber)' : 'inherit', fontWeight: w.unpaid_amount > 0 ? 600 : 400 }}>
                            ₹{w.unpaid_amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. BIKE WORKSHOP REPORT PAGE */}
          {activeTab === 'bike-workshops' && (
            <div>
              <div className="grid grid-4 mb-16">
                <div className="card stat-card">
                  <div className="icon">🔧</div>
                  <div className="value">{data.workshops_count || 0}</div>
                  <div className="label">Bike Workshops</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">🏍️</div>
                  <div className="value">{data.workshops?.reduce((s, w) => s + w.bikes_count, 0) || 0}</div>
                  <div className="label">Bikes Washed</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">💵</div>
                  <div className="value">₹{data.workshops?.reduce((s, w) => s + w.paid_amount, 0) || 0}</div>
                  <div className="label">Total Settled</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">⏳</div>
                  <div className="value" style={{ color: 'var(--amber)' }}>
                    ₹{data.workshops?.reduce((s, w) => s + w.unpaid_amount, 0) || 0}
                  </div>
                  <div className="label">Pending Balance</div>
                </div>
              </div>

              <div className="card">
                <h3>Bike Workshop Summary</h3>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 12px' }}>Workshop Name</th>
                        <th style={{ padding: '10px 12px' }}>Bikes Count</th>
                        <th style={{ padding: '10px 12px' }}>Total Amount</th>
                        <th style={{ padding: '10px 12px' }}>Paid Amount</th>
                        <th style={{ padding: '10px 12px' }}>Unpaid Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.workshops || data.workshops.length === 0) && (
                        <tr><td colSpan="5" className="muted" style={{ padding: 16, textAlign: 'center' }}>No Bike Workshops found.</td></tr>
                      )}
                      {data.workshops?.map(w => (
                        <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{w.name}</td>
                          <td style={{ padding: '10px 12px' }}>{w.bikes_count} bikes</td>
                          <td style={{ padding: '10px 12px' }}>₹{w.total_amount}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--green)', fontWeight: 600 }}>₹{w.paid_amount}</td>
                          <td style={{ padding: '10px 12px', color: w.unpaid_amount > 0 ? 'var(--amber)' : 'inherit', fontWeight: w.unpaid_amount > 0 ? 600 : 400 }}>
                            ₹{w.unpaid_amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 7. ATTENDANCE REPORT PAGE */}
          {activeTab === 'attendance' && (
            <div>
              <div className="grid grid-4 mb-16">
                <div className="card stat-card">
                  <div className="icon">👥</div>
                  <div className="value">{data.total_employees || 0}</div>
                  <div className="label">Active Employees</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">✅</div>
                  <div className="value" style={{ color: 'var(--green)' }}>{data.present_count || 0}</div>
                  <div className="label">Present Days</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">❌</div>
                  <div className="value" style={{ color: 'var(--red)' }}>{data.absent_count || 0}</div>
                  <div className="label">Absent Days</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">⏱️</div>
                  <div className="value">{data.total_overtime_minutes || 0} m</div>
                  <div className="label">Total Overtime ({data.total_late_minutes || 0}m late)</div>
                </div>
              </div>

              <div className="card">
                <h3>Attendance Log ({data.records?.length || 0})</h3>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 12px' }}>Date</th>
                        <th style={{ padding: '10px 12px' }}>Employee</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                        <th style={{ padding: '10px 12px' }}>Check In / Out</th>
                        <th style={{ padding: '10px 12px' }}>Late / Overtime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.records || data.records.length === 0) && (
                        <tr><td colSpan="5" className="muted" style={{ padding: 16, textAlign: 'center' }}>No attendance records found in this range.</td></tr>
                      )}
                      {data.records?.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px' }}>{r.date}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.employee_name}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className={`pill ${r.status === 'present' ? 'pill-green' : r.status === 'absent' ? 'pill-red' : 'pill-amber'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {r.check_in || '-'} to {r.check_out || '-'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className="muted">{r.late_minutes || 0}m late / {r.overtime_minutes || 0}m OT</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 8. SALARY REPORT PAGE */}
          {activeTab === 'salary' && (
            <div>
              <div className="grid grid-4 mb-16">
                <div className="card stat-card">
                  <div className="icon">💼</div>
                  <div className="value">₹{data.total_net_pay || 0}</div>
                  <div className="label">Total Net Salary Paid</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">💵</div>
                  <div className="value">₹{data.total_base_salary || 0}</div>
                  <div className="label">Base Salary Total</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">⏱️</div>
                  <div className="value">₹{data.total_overtime_pay || 0}</div>
                  <div className="label">Overtime Paid</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">📉</div>
                  <div className="value" style={{ color: 'var(--amber)' }}>₹{data.total_advances_deducted || 0}</div>
                  <div className="label">Advances Deducted</div>
                </div>
              </div>

              <div className="card">
                <h3>Payroll Breakdown ({data.month}/{data.year})</h3>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 12px' }}>Employee</th>
                        <th style={{ padding: '10px 12px' }}>Role</th>
                        <th style={{ padding: '10px 12px' }}>Base Salary</th>
                        <th style={{ padding: '10px 12px' }}>Overtime</th>
                        <th style={{ padding: '10px 12px' }}>Advance Deducted</th>
                        <th style={{ padding: '10px 12px' }}>Net Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.payrolls || data.payrolls.length === 0) && (
                        <tr><td colSpan="6" className="muted" style={{ padding: 16, textAlign: 'center' }}>No salary payroll processed for this month.</td></tr>
                      )}
                      {data.payrolls?.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.employee_name}</td>
                          <td style={{ padding: '10px 12px' }}>{p.role || 'Staff'}</td>
                          <td style={{ padding: '10px 12px' }}>₹{p.base_salary}</td>
                          <td style={{ padding: '10px 12px' }}>₹{p.overtime_pay || 0}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--amber)' }}>-₹{p.advance_deduction || 0}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--green)' }}>₹{p.net_pay}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 9. CUSTOMERS REPORT PAGE */}
          {activeTab === 'customers' && (
            <div>
              <div className="grid grid-2 mb-16">
                <div className="card stat-card">
                  <div className="icon">👥</div>
                  <div className="value">{data.total_customers || 0}</div>
                  <div className="label">Total Registered Customers</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">⭐</div>
                  <div className="value">{data.total_points_balance || 0} pts</div>
                  <div className="label">Total Reward Points Issued</div>
                </div>
              </div>

              <div className="card">
                <h3>Customer Directory</h3>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 12px' }}>Customer Name</th>
                        <th style={{ padding: '10px 12px' }}>Phone</th>
                        <th style={{ padding: '10px 12px' }}>Reward Points</th>
                        <th style={{ padding: '10px 12px' }}>Registered Vehicles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.customers || data.customers.length === 0) && (
                        <tr><td colSpan="4" className="muted" style={{ padding: 16, textAlign: 'center' }}>No customers found.</td></tr>
                      )}
                      {data.customers?.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.name || 'Unnamed Customer'}</td>
                          <td style={{ padding: '10px 12px' }}>{c.phone || '-'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className="pill pill-purple">⭐ {c.reward_points || 0} pts</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {c.vehicles?.map(v => (
                              <span key={v.id} className="pill pill-teal" style={{ marginRight: 4, marginBottom: 4 }}>
                                {v.reg_number} ({v.brand} {v.model})
                              </span>
                            )) || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 10. SALARY ADVANCE REPORT PAGE */}
          {activeTab === 'salary-advances' && (
            <div>
              <div className="grid grid-4 mb-16">
                <div className="card stat-card">
                  <div className="icon">💵</div>
                  <div className="value">₹{data.total_advances || 0}</div>
                  <div className="label">Total Advances Paid</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">💰</div>
                  <div className="value">₹{data.cash_advances || 0}</div>
                  <div className="label">Cash Advances</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">📱</div>
                  <div className="value">₹{data.gpay_advances || 0}</div>
                  <div className="label">GPay Advances</div>
                </div>
                <div className="card stat-card">
                  <div className="icon">📋</div>
                  <div className="value">{data.advances_count || 0}</div>
                  <div className="label">Advance Records</div>
                </div>
              </div>

              <div className="card">
                <h3>Salary Advances Log</h3>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 12px' }}>Date</th>
                        <th style={{ padding: '10px 12px' }}>Employee</th>
                        <th style={{ padding: '10px 12px' }}>Role</th>
                        <th style={{ padding: '10px 12px' }}>Payment Method</th>
                        <th style={{ padding: '10px 12px' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.advances || data.advances.length === 0) && (
                        <tr><td colSpan="5" className="muted" style={{ padding: 16, textAlign: 'center' }}>No salary advance records found.</td></tr>
                      )}
                      {data.advances?.map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px' }}>{a.date ? new Date(a.date).toLocaleDateString() : '-'}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{a.employee_name}</td>
                          <td style={{ padding: '10px 12px' }}>{a.role || 'Staff'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className={`pill ${a.payment_method === 'cash' ? 'pill-green' : 'pill-blue'}`}>
                              {a.payment_method}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--amber)' }}>₹{a.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
