import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  const [openSections, setOpenSections] = useState({
    billMgmt: true,
    masterData: true,
    hrm: true
  });

  useEffect(() => {
    const path = location.pathname;
    if (path === '/bills' || path === '/workshop-bills') {
      setOpenSections(prev => ({ ...prev, billMgmt: true }));
    } else if (path === '/workshops' || path === '/price-list') {
      setOpenSections(prev => ({ ...prev, masterData: true }));
    } else if (path === '/employees' || path === '/attendance' || path === '/salary') {
      setOpenSections(prev => ({ ...prev, hrm: true }));
    }
  }, [location.pathname]);

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const linkClass = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');
  const subLinkClass = ({ isActive }) => 'nav-sub-link' + (isActive ? ' active' : '');

  return (
    <div className="sidebar">
      <div className="brand">Perfecto Wash</div>

      <div className="sidebar-nav">
        <NavLink to="/" end className={linkClass}>Today</NavLink>
        <NavLink to="/running-jobs" className={linkClass}>Running Jobs</NavLink>
        <NavLink to="/jobs" className={linkClass}>All Jobs</NavLink>

        {/* Bill Management */}
        <div className="nav-group">
          <div className="nav-section flex between center pointer" onClick={() => toggleSection('billMgmt')}>
            <span>Bill Management</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>{openSections.billMgmt ? '▼' : '▶'}</span>
          </div>
          {openSections.billMgmt && (
            <div className="nav-sub-menu">
              <NavLink to="/bills" className={subLinkClass}>Normal Bill</NavLink>
              <NavLink to="/workshop-bills" className={subLinkClass}>Workshop Bill</NavLink>
            </div>
          )}
        </div>

        {/* Master Data */}
        <div className="nav-group">
          <div className="nav-section flex between center pointer" onClick={() => toggleSection('masterData')}>
            <span>Master Data</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>{openSections.masterData ? '▼' : '▶'}</span>
          </div>
          {openSections.masterData && (
            <div className="nav-sub-menu">
              <NavLink to="/workshops" className={subLinkClass}>Workshop List</NavLink>
              <NavLink to="/price-list" className={subLinkClass}>Price List</NavLink>
            </div>
          )}
        </div>

        {/* HRM */}
        <div className="nav-group">
          <div className="nav-section flex between center pointer" onClick={() => toggleSection('hrm')}>
            <span>HRM</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>{openSections.hrm ? '▼' : '▶'}</span>
          </div>
          {openSections.hrm && (
            <div className="nav-sub-menu">
              <NavLink to="/employees" className={subLinkClass}>Employee List</NavLink>
              <NavLink to="/attendance" className={subLinkClass}>Attendance</NavLink>
              <NavLink to="/salary" className={subLinkClass}>Salary & Advance</NavLink>
            </div>
          )}
        </div>

        <NavLink to="/expenses" className={linkClass}>Expenses</NavLink>
        <NavLink to="/reports" className={linkClass}>Reports</NavLink>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <NavLink to="/mobile" className={linkClass} target="_blank">📱 Open Mobile Scanner</NavLink>
        </div>
      </div>
    </div>
  );
}
