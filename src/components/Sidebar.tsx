import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, Maximize, Minimize, Settings, ShieldCheck, Cpu, 
  Clock, ArrowRight
} from 'lucide-react';
import { storage } from '../utils/storage';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  appVersion: string;
  onOpenSettings: () => void;
  user: any;
  onLogout: () => void;
}

export default function Sidebar({ isOpen, onClose, appVersion, onOpenSettings, user, onLogout }: SidebarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useSimulatedFullscreen, setUseSimulatedFullscreen] = useState(false);
  const [aiCount, setAiCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState('24j 00m 00d');

  // Load AI Count first & monitor whenever isOpen changes
  useEffect(() => {
    if (isOpen) {
      setAiCount(storage.getAiUseCount());
    }
  }, [isOpen]);

  // Sync physical fullscreen states
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // AI countdown timer until midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextReset = new Date();
      nextReset.setHours(24, 0, 0, 0); // 00:00 of tomorrow
      
      const diffMs = nextReset.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeLeft('00j 00m 00d');
        return;
      }
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      const doubleDigit = (n: number) => n.toString().padStart(2, '0');
      setTimeLeft(`${doubleDigit(hours)}j ${doubleDigit(minutes)}m ${doubleDigit(seconds)}d`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setUseSimulatedFullscreen(false);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        setUseSimulatedFullscreen(false);
      }
    } catch (err) {
      console.warn("Standard Fullscreen request blocked, fallback to simulated fullscreen: ", err);
      const simulated = !useSimulatedFullscreen;
      setUseSimulatedFullscreen(simulated);
      if (simulated) {
        document.body.classList.add('simulated-fullscreen-active_mode');
      } else {
        document.body.classList.remove('simulated-fullscreen-active_mode');
      }
    }
  };

  const handleActionSettings = () => {
    onClose();
    onOpenSettings();
  };

  // Convert count to percentage (max 5 = 100%)
  const usagePercentage = Math.round((aiCount / 5) * 100);

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/15 backdrop-blur-xs z-50 transition-opacity"
        />
      )}

      {/* Slide-out Sidebar Panel */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? '0%' : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="fixed top-0 left-0 bottom-0 w-80 bg-white border-r border-neutral-200/80 z-50 flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/55">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-neutral-800 animate-spin-slow" />
            <h3 className="text-xs font-bold tracking-wider uppercase text-neutral-800 font-montserrat">
              Scriba Workspace
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 transition cursor-pointer"
            title="Tutup Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Content body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
          {/* Version banner info card */}
          <div className="bg-neutral-950 text-white rounded-2xl p-4 soft-drop-shadow space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Scriba Console
              </span>
              <span className="text-[9px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-full text-white">
                v{appVersion}
              </span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed font-light mt-1">
              Platform draf penulisan novel terintegrasi offline dengan asisten AI terproteksi.
            </p>
          </div>

          {/* Quick Actions (Full screen controller list) */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest">
              Aksi Utama
            </h4>
            
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-full flex items-center space-x-2.5 p-3 bg-white hover:bg-neutral-900 hover:text-white border border-neutral-205 rounded-xl text-neutral-850 text-xs font-semibold cursor-pointer transition shadow-3xs group"
            >
              {isFullscreen || useSimulatedFullscreen ? (
                <Minimize className="w-4 h-4 text-neutral-500 group-hover:text-white transition shrink-0" />
              ) : (
                <Maximize className="w-4 h-4 text-neutral-500 group-hover:text-white transition shrink-0" />
              )}
              <span>Layar Penuh</span>
            </button>

            <button
              type="button"
              onClick={handleActionSettings}
              className="w-full flex items-center space-x-2.5 p-3 bg-white hover:bg-neutral-900 hover:text-white border border-neutral-205 rounded-xl text-neutral-850 text-xs font-semibold cursor-pointer transition shadow-3xs group"
            >
              <Settings className="w-4 h-4 text-neutral-500 group-hover:text-white transition shrink-0" />
              <span>Pengaturan & Info</span>
            </button>
          </div>

          {/* User Account Info and Logout */}
          <div className="space-y-2 pt-1">
            <h4 className="text-[10px] font-mono font-bold text-neutral-450 uppercase tracking-widest truncate" title={user?.email || 'Akun'}>
              Akun: {user?.email ? user.email.split('@')[0] : 'Mitra'}
            </h4>
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center space-x-2.5 p-3 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 rounded-xl text-xs font-bold cursor-pointer transition shadow-3xs"
            >
              <X className="w-4 h-4 shrink-0" />
              <span>Keluar Sesi</span>
            </button>
          </div>

        </div>

        {/* AI Limit, Usage Progress and Reset countdown footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/65 space-y-3.5 shrink-0">
          <div className="space-y-2">
            {/* Header and Model Name */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 font-medium text-neutral-700">
                <Cpu className="w-4 h-4 text-neutral-850" />
                <span>Asisten AI Aktif</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-neutral-900 bg-neutral-200/80 px-2 py-0.5 rounded-md">
                gemini-3.5-flash
              </span>
            </div>

            {/* Progress bar tracking usage percent */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-neutral-400 font-medium font-sans">
                  Sisa Limit Pemakaian
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-neutral-800">
                    {usagePercentage}% digunakan
                  </span>
                </div>
              </div>
              
              {/* Visual custom themed progress line bar */}
              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-550 ${
                    usagePercentage >= 80 
                      ? 'bg-neutral-800' 
                      : usagePercentage >= 50 
                      ? 'bg-neutral-600' 
                      : 'bg-neutral-900'
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
            </div>

            {/* Reset countdown clock label */}
            <div className="flex items-center space-x-1.5 text-[10px] text-neutral-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Reset otomatis dlm:</span>
              <span className="font-mono font-bold text-neutral-700">{timeLeft}</span>
            </div>
          </div>

          {/* Swipe back guide notice footer */}
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[9px] text-neutral-400">
            <div className="flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Offline Database Enkripsi</span>
            </div>
            <span className="italic">Geser kiri ⇦</span>
          </div>
        </div>
      </motion.div>
    </>
  );
}
