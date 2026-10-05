import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  const [openSections, setOpenSections] = useState({
    billMgmt: true,
    masterData: true,
    hrm: true,
    reports: true
  });

  useEffect(() => {
    const path = location.pathname;
    if (path === '/bills' || path === '/workshop-bills') {
      setOpenSections(prev => ({ ...prev, billMgmt: true }));
    } else if (path === '/workshops' || path === '/price-list' || path === '/suppliers') {
      setOpenSections(prev => ({ ...prev, masterData: true }));
    } else if (path === '/employees' || path === '/attendance' || path === '/salary') {
      setOpenSections(prev => ({ ...prev, hrm: true }));
    } else if (path.startsWith('/reports')) {
      setOpenSections(prev => ({ ...prev, reports: true }));
    }
  }, [location.pathname]);

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const linkClass = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');
  const subLinkClass = ({ isActive }) => 'nav-sub-link' + (isActive ? ' active' : '');

  return (
    <div className="sidebar">
      <div className="brand">
        <span className="brand-logo">🚘</span>
        <div className="brand-text">
          <div className="brand-title">Perfecto Wash</div>
          <div className="brand-subtitle">POS & MANAGEMENT</div>
        </div>
      </div>

      <div className="sidebar-nav">
        <NavLink to="/" end className={linkClass}>
          <span className="nav-icon">☀️</span>
          <span>Today</span>
        </NavLink>

        <NavLink to="/running-jobs" className={linkClass}>
          <span className="nav-icon">⏳</span>
          <span>Running Jobs</span>
        </NavLink>

        <NavLink to="/jobs" className={linkClass}>
          <span className="nav-icon">📋</span>
          <span>All Jobs</span>
        </NavLink>

        <NavLink to="/subscriptions" className={linkClass}>
          <span className="nav-icon">💳</span>
          <span>Subscriptions</span>
        </NavLink>

        {/* Bill Management */}
        <div className="nav-group">
          <div className="nav-section flex between center pointer" onClick={() => toggleSection('billMgmt')}>
            <span className="flex center gap-6">
              <span>🧾</span>
              <span>Bill Management</span>
            </span>
            <span className="chevron">{openSections.billMgmt ? '▼' : '▶'}</span>
          </div>
          {openSections.billMgmt && (
            <div className="nav-sub-menu">
              <NavLink to="/bills" className={subLinkClass}>
                <span className="nav-sub-icon">📄</span>
                <span>Normal Bill</span>
              </NavLink>
              <NavLink to="/workshop-bills" className={subLinkClass}>
                <span className="nav-sub-icon">🏢</span>
                <span>Workshop Bill</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Master Data */}
        <div className="nav-group">
          <div className="nav-section flex between center pointer" onClick={() => toggleSection('masterData')}>
            <span className="flex center gap-6">
              <span>🗂️</span>
              <span>Master Data</span>
            </span>
            <span className="chevron">{openSections.masterData ? '▼' : '▶'}</span>
          </div>
          {openSections.masterData && (
            <div className="nav-sub-menu">
              <NavLink to="/suppliers" className={subLinkClass}>
                <span className="nav-sub-icon">🚚</span>
                <span>Suppliers</span>
              </NavLink>
              <NavLink to="/workshops" className={subLinkClass}>
                <span className="nav-sub-icon">🏬</span>
                <span>Workshop List</span>
              </NavLink>
              <NavLink to="/price-list" className={subLinkClass}>
                <span className="nav-sub-icon">🏷️</span>
                <span>Price List</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* HRM */}
        <div className="nav-group">
          <div className="nav-section flex between center pointer" onClick={() => toggleSection('hrm')}>
            <span className="flex center gap-6">
              <span>👥</span>
              <span>HRM</span>
            </span>
            <span className="chevron">{openSections.hrm ? '▼' : '▶'}</span>
          </div>
          {openSections.hrm && (
            <div className="nav-sub-menu">
              <NavLink to="/employees" className={subLinkClass}>
                <span className="nav-sub-icon">👤</span>
                <span>Employee List</span>
              </NavLink>
              <NavLink to="/attendance" className={subLinkClass}>
                <span className="nav-sub-icon">📅</span>
                <span>Attendance</span>
              </NavLink>
              <NavLink to="/salary" className={subLinkClass}>
                <span className="nav-sub-icon">💼</span>
                <span>Salary & Advance</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Reports */}
        <div className="nav-group">
          <div className="nav-section flex between center pointer" onClick={() => toggleSection('reports')}>
            <span className="flex center gap-6">
              <span>📊</span>
              <span>Reports</span>
            </span>
            <span className="chevron">{openSections.reports ? '▼' : '▶'}</span>
          </div>
          {openSections.reports && (
            <div className="nav-sub-menu">
              <NavLink to="/reports/sales" className={subLinkClass}>
                <span className="nav-sub-icon">💰</span>
                <span>Sales Report</span>
              </NavLink>
              <NavLink to="/reports/expenses" className={subLinkClass}>
                <span className="nav-sub-icon">💸</span>
                <span>Expense Report</span>
              </NavLink>
              <NavLink to="/reports/cars" className={subLinkClass}>
                <span className="nav-sub-icon">🚗</span>
                <span>Car Report</span>
              </NavLink>
              <NavLink to="/reports/bikes" className={subLinkClass}>
                <span className="nav-sub-icon">🏍️</span>
                <span>Bike Report</span>
              </NavLink>
              <NavLink to="/reports/car-workshops" className={subLinkClass}>
                <span className="nav-sub-icon">🏬</span>
                <span>Car Workshop Report</span>
              </NavLink>
              <NavLink to="/reports/bike-workshops" className={subLinkClass}>
                <span className="nav-sub-icon">🔧</span>
                <span>Bike Workshop Report</span>
              </NavLink>
              <NavLink to="/reports/attendance" className={subLinkClass}>
                <span className="nav-sub-icon">📅</span>
                <span>Attendance Report</span>
              </NavLink>
              <NavLink to="/reports/salary" className={subLinkClass}>
                <span className="nav-sub-icon">💼</span>
                <span>Salary Report</span>
              </NavLink>
              <NavLink to="/reports/customers" className={subLinkClass}>
                <span className="nav-sub-icon">👥</span>
                <span>Customers Report</span>
              </NavLink>
              <NavLink to="/reports/salary-advances" className={subLinkClass}>
                <span className="nav-sub-icon">💵</span>
                <span>Advance Report</span>
              </NavLink>
            </div>
          )}
        </div>

        <NavLink to="/expenses" className={linkClass}>
          <span className="nav-icon">💸</span>
          <span>Expenses</span>
        </NavLink>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <NavLink to="/mobile" className={linkClass} target="_blank">
            <span className="nav-icon">📱</span>
            <span>Mobile Scanner</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}
