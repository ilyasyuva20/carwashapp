import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar.jsx';
import Today from './pages/Today.jsx';
import RunningJobs from './pages/RunningJobs.jsx';
import Jobs from './pages/Jobs.jsx';
import Bills from './pages/Bills.jsx';
import WorkshopBills from './pages/WorkshopBills.jsx';
import PriceList from './pages/PriceList.jsx';
import Employees from './pages/Employees.jsx';
import Attendance from './pages/Attendance.jsx';
import Payroll from './pages/Payroll.jsx';
import Expenses from './pages/Expenses.jsx';
import Reports from './pages/Reports.jsx';
import Workshops from './pages/Workshops.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Subscriptions from './pages/Subscriptions.jsx';
import SalaryAdvances from './pages/SalaryAdvances.jsx';
import MobileScan from './pages/MobileScan.jsx';
import MobileJobs from './pages/MobileJobs.jsx';
import MobileBills from './pages/MobileBills.jsx';

export default function App() {
  const location = useLocation();
  const isMobileRoute = location.pathname.startsWith('/mobile');

  if (isMobileRoute) {
    return (
      <div className="mobile-app-shell">
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { fontSize: '14px', borderRadius: '8px' } }} />
        <Routes>
          <Route path="/mobile" element={<MobileScan />} />
          <Route path="/mobile/jobs" element={<MobileJobs />} />
          <Route path="/mobile/bills" element={<MobileBills />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px', borderRadius: '8px' } }} />
      <Sidebar />
      <div className="main">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/running-jobs" element={<RunningJobs />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/workshop-bills" element={<WorkshopBills />} />
          <Route path="/price-list" element={<PriceList />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/salary" element={<SalaryAdvances />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/workshops" element={<Workshops />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:reportType" element={<Reports />} />
          <Route path="/mobile" element={<MobileScan />} />
          <Route path="/mobile/jobs" element={<MobileJobs />} />
          <Route path="/mobile/bills" element={<MobileBills />} />
        </Routes>
      </div>
    </div>
  );
}
