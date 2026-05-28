import './Button.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link';

type ButtonProps = {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  children: React.ReactNode;
  onClick?: () => void;
};

export function Button({
  variant = 'secondary',
  fullWidth,
  disabled,
  type = 'button',
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
      {children}
    </button>
  );
}
