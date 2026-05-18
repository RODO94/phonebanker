import { forwardRef } from 'react';
import './Textarea.css';

type TextareaProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, hint, value, onChange, placeholder, id }, ref) {
    return (
      <label className="textarea" htmlFor={id}>
        <span className="label">{label}</span>
        {hint && <span className="hint">{hint}</span>}
        <textarea
          ref={ref}
          id={id}
          className="field"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  },
);
