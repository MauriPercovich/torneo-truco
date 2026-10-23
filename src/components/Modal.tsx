import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type Props = {
  width: number;
  gap?: number;
  onClose: () => void;
  label: string;
  children: ReactNode;
};

export function Modal({ width, gap = 26, onClose, label, children }: Props) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{ width: `min(${width}px, 100%)`, gap }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn-close" onClick={onClick} aria-label="Cerrar">
      <X size={18} strokeWidth={2.75} />
    </button>
  );
}
