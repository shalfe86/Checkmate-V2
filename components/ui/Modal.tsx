import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  className = '' 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className={`bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh] ${className}`}
        role="dialog"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5 bg-slate-950 flex items-center justify-between shrink-0">
          <h3 className="font-orbitron font-bold text-white flex items-center gap-2 text-lg">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-5 border-t border-white/5 bg-slate-950 flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};