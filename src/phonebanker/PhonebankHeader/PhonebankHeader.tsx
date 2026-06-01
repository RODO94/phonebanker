import './PhonebankHeader.css';

type PhonebankHeaderProps = {
  total: number;
  called: number;
};

// The persistent brand + burn-down bar shown across the call-loop screens
// (assigned / no-answer / wants-removed). Brand sits left, the burn-down count
// top-right, and a green progress bar fills underneath. "called" here means
// attempts logged, not pickups — the morale-friendly count (wireframes-contact-card.md).
export function PhonebankHeader({ total, called }: PhonebankHeaderProps) {
  const pct = total > 0 ? Math.round((called / total) * 100) : 0;

  return (
    <header className="phonebank-header">
      <div className="phonebank-header-bar">
        <span className="phonebank-header-brand">LRU Phonebank</span>
        {total > 0 && (
          <span className="phonebank-header-count">
            {called} of {total}
          </span>
        )}
      </div>
      <div
        className="phonebank-header-progress"
        role="progressbar"
        aria-valuenow={called}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="phonebank-header-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </header>
  );
}
