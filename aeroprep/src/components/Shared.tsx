import React from 'react';

/* ============================================================
   Shared visual + navigation primitives used across every
   section so the app stays consistent and no single screen
   turns into one long clumsy scroll.
   ============================================================ */

/* ---------- ProgressRing ---------- */
interface ProgressRingProps {
  percentage: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 88,
  stroke = 7,
  color = 'var(--accent)',
  label,
  sublabel,
}) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className="circle-progress-container" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={center} cy={center} r={radius} className="circle-progress-bg" style={{ strokeWidth: stroke }} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          className="circle-progress-fill"
          style={{
            stroke: color,
            strokeWidth: stroke,
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="circle-progress-text" style={{ fontSize: size < 90 ? '1.05rem' : '1.4rem', textAlign: 'center' }}>
        {label ?? `${Math.round(clamped)}%`}
        {sublabel && (
          <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- StatTile ---------- */
interface StatTileProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  color?: string;
  tint?: string;
}

export const StatTile: React.FC<StatTileProps> = ({ icon, value, label, color = 'var(--accent)', tint }) => (
  <div className="stat-tile">
    <div className="stat-tile-icon" style={{ background: tint ?? 'var(--accent-soft)', color }}>
      {icon}
    </div>
    <div>
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
    </div>
  </div>
);

/* ---------- SectionHero ---------- */
interface SectionHeroProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: string;
  color?: string;
  tint?: string;
  wash?: string;
  right?: React.ReactNode;
}

export const SectionHero: React.FC<SectionHeroProps> = ({
  icon,
  title,
  subtitle,
  color = 'var(--accent)',
  tint = 'var(--accent-soft)',
  wash,
  right,
}) => (
  <div
    className="section-hero"
    style={{ '--hero-wash': wash ?? tint, '--hero-icon-bg': tint, '--hero-icon-color': color } as React.CSSProperties}
  >
    <div className="section-hero-inner">
      <div className="section-hero-icon">{icon}</div>
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: '1.7rem', marginBottom: subtitle ? '4px' : 0 }}>{title}</h2>
        {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '640px' }}>{subtitle}</p>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  </div>
);

/* ---------- SideNav ---------- */
export interface SideNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number | string;
}

interface SideNavProps {
  items: SideNavItem[];
  active: string;
  onSelect: (id: string) => void;
}

export const SideNav: React.FC<SideNavProps> = ({ items, active, onSelect }) => (
  <nav className="side-nav">
    {items.map((item) => (
      <button
        key={item.id}
        className={`side-nav-item ${active === item.id ? 'side-nav-item-active' : ''}`}
        onClick={() => onSelect(item.id)}
      >
        <span className="side-nav-icon">{item.icon}</span>
        <span>{item.label}</span>
        {item.count !== undefined && <span className="side-nav-count">{item.count}</span>}
      </button>
    ))}
  </nav>
);

/* ---------- Stepper ---------- */
interface StepperProps {
  steps: string[];
  current: number; // 0-based index of the active step
  done?: number[]; // indices that are complete
}

export const Stepper: React.FC<StepperProps> = ({ steps, current, done = [] }) => (
  <div className="stepper">
    {steps.map((label, i) => {
      const isActive = i === current;
      const isDone = done.includes(i) || i < current;
      return (
        <React.Fragment key={label}>
          <div className="stepper-node">
            <div className={`stepper-dot ${isActive ? 'stepper-dot-active' : ''} ${isDone && !isActive ? 'stepper-dot-done' : ''}`}>
              {isDone && !isActive ? '✓' : i + 1}
            </div>
            <span className={`stepper-label ${isActive ? 'stepper-label-active' : ''}`}>{label}</span>
          </div>
          {i < steps.length - 1 && <span className="stepper-line" />}
        </React.Fragment>
      );
    })}
  </div>
);

/* ---------- Meter (horizontal bar) ---------- */
interface MeterProps {
  value: number; // 0-100
  color?: string;
  label?: string;
  showValue?: boolean;
}

export const Meter: React.FC<MeterProps> = ({ value, color = 'var(--accent)', label, showValue = true }) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
          {label && <span style={{ color: 'var(--text-secondary)' }}>{label}</span>}
          {showValue && <span style={{ color }}>{Math.round(clamped)}</span>}
        </div>
      )}
      <div className="meter">
        <div className="meter-fill" style={{ width: `${clamped}%`, '--meter-color': color } as React.CSSProperties} />
      </div>
    </div>
  );
};

/* ---------- MiniBarChart ---------- */
export interface BarDatum {
  label: string;
  value: number; // raw value
  color?: string;
}

interface MiniBarChartProps {
  data: BarDatum[];
  max?: number; // optional cap; defaults to max value in data
  suffix?: string;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({ data, max, suffix = '' }) => {
  const peak = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bar-chart">
      {data.map((d) => {
        const h = Math.max(4, (d.value / peak) * 100);
        return (
          <div className="bar-col" key={d.label}>
            <span className="bar-value">
              {d.value}
              {suffix}
            </span>
            <div className="bar-track" style={{ height: `${h}%`, '--bar-color': d.color ?? 'var(--accent)' } as React.CSSProperties} />
            <span className="bar-label">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- DividerLabel ---------- */
export const DividerLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="divider-label">{children}</div>
);
