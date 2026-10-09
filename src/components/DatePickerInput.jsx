import { formatDateDMY } from '../utils/formatDate';

export default function DatePickerInput({ value, onChange, style, className }) {
  const displayVal = formatDateDMY(value);

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '100%',
        minWidth: 140,
        ...style
      }}
      className={className}
    >
      <input
        type="date"
        value={value || ''}
        onChange={onChange}
        onClick={(e) => {
          try {
            if (e.target.showPicker) e.target.showPicker();
          } catch (err) {}
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          zIndex: 10
        }}
      />
      <div
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          fontSize: 13,
          fontWeight: 600,
          color: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          gap: 8,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          pointerEvents: 'none',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <span>{displayVal || 'DD-MM-YYYY'}</span>
        <span style={{ fontSize: 14 }}>📅</span>
      </div>
    </div>
  );
}
