import './Button.css';

// `positive | neutral | caution` are the severity-coded outcome actions —
// filled green / slate / red, each paired with a leading icon so meaning never
// rests on colour alone.
type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'positive'
  | 'neutral'
  | 'caution';

type ButtonProps = {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
};

export function Button({
  variant = 'secondary',
  fullWidth,
  disabled,
  type = 'button',
  icon,
  children,
  onClick,
}: ButtonProps) {
  const classes = ['button', variant];
  if (fullWidth) classes.push('full-width');

  return (
    <button
      type={type}
      className={classes.join(' ')}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
    >
      {icon && (
        <span className="button-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
