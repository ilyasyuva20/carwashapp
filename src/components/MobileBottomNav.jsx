import { NavLink } from 'react-router-dom';

const items = [
  { to: '/mobile/jobs', label: 'Jobs', icon: '▥' },
  { to: '/mobile', label: 'Scan', icon: '⌗', end: true },
  { to: '/mobile/bills', label: 'Bills', icon: '▤' }
];

export default function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `mobile-bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="mobile-bottom-nav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
