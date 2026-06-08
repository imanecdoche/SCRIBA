import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  className?: string;
  placeholder?: string;
  id?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  className = '',
  placeholder = 'Pilih salah satu...',
  id
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full font-sans" id={id}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-xs px-3.5 py-2.5 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-xl transition duration-150 focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 shadow-3xs cursor-pointer ${className}`}
      >
        <span className="truncate text-left text-neutral-800 font-medium">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-neutral-900' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute z-50 w-full mt-1.5 bg-white border border-neutral-200/90 rounded-xl shadow-lg overflow-hidden p-1"
          >
            <div className="max-h-60 overflow-y-auto scrollbar-thin">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-950 text-white font-bold'
                        : 'text-neutral-750 hover:bg-neutral-50 hover:text-neutral-900 font-medium'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate block">{option.label}</span>
                      {option.description && (
                        <span
                          className={`text-[9px] mt-0.5 truncate block ${
                            isSelected ? 'text-neutral-350' : 'text-neutral-400 font-normal'
                          }`}
                        >
                          {option.description}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
