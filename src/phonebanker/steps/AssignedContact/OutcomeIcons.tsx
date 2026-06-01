// Contact-card icons, drawn in `currentColor` so they inherit the host
// element's text colour. The three outcome icons pair with each outcome's colour
// so meaning is carried by shape as well as hue (the "no colour-only meaning"
// rule); the phone icon leads the dial button.

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// Had a conversation — a tick.
export function CheckIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

// No answer — a cross.
export function CrossIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// Wants to be removed — a no-entry sign.
export function NoEntryIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  );
}

// Dial — a handset, filled so it reads at a glance on the green call button.
export function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z" />
    </svg>
  );
}
