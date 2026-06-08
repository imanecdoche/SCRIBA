import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Trash2 } from 'lucide-react';

interface AppConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function AppConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  isDestructive = true,
}: AppConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity duration-300">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden p-6"
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-xl shrink-0 ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-600'}`}>
                {isDestructive ? <Trash2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-neutral-900 tracking-tight">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl transition duration-150 cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-4 py-2 text-xs font-medium text-white rounded-xl transition duration-150 cursor-pointer ${
                  isDestructive
                    ? 'bg-neutral-900 hover:bg-neutral-800'
                    : 'bg-neutral-900 hover:bg-neutral-800'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
