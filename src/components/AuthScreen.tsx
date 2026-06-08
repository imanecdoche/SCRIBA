import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../utils/firebase';
import { LogIn, Key, Mail, Chrome, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

export default function AuthScreen({ appLogo = '✍️' }: { appLogo?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail || !password) {
      setError('Email dan Password wajib diisi.');
      return;
    }
    setError(null);
    setResetSuccess(null);
    setLoading(true);

    try {
      if (isRegistering) {
        // Register flow
        await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        // Simple login flow
        try {
          await signInWithEmailAndPassword(auth, normalizedEmail, password);
        } catch (loginErr: any) {
          const lErrCode = loginErr.code || '';
          const lErrMsg = loginErr.message || '';
          
          // If user logs in with the required default credentials but they do not exist yet online,
          // instantly register them in background to fulfill user request.
          if (
            (lErrCode === 'auth/user-not-found' || 
             lErrCode === 'auth/invalid-credential' || 
             lErrMsg.includes('user-not-found') || 
             lErrMsg.includes('invalid-credential')) &&
            normalizedEmail === 'kazokuhairy@gmail.com' &&
            password === 'fatih123'
          ) {
            try {
              await createUserWithEmailAndPassword(auth, normalizedEmail, password);
            } catch (regErr: any) {
              const rErrCode = regErr.code || '';
              const rErrMsg = regErr.message || '';
              if (rErrCode === 'auth/email-already-in-use' || rErrMsg.includes('email-already-in-use')) {
                throw new Error('Email kazokuhairy@gmail.com sudah terdaftar dengan sandi yang berbeda. Silakan masukkan kata sandi Anda yang benar, atau klik "Lupa Kata Sandi?" untuk menyetel ulang.');
              }
              throw regErr;
            }
          } else {
            throw loginErr;
          }
        }
      }
    } catch (err: any) {
      const errorCode = err.code || '';
      const errorMessage = err.message || '';
      
      const isExpectedAuthError = 
        errorCode.startsWith('auth/') || 
        errorMessage.includes('email-already-in-use') ||
        errorMessage.includes('invalid-credential') ||
        errorMessage.includes('user-not-found') ||
        errorMessage.includes('weak-password') ||
        errorMessage.includes('invalid-email') ||
        errorMessage.includes('sudah terdaftar dengan sandi yang berbeda');

      if (!isExpectedAuthError) {
        console.error(err);
      } else {
        console.warn('Authentication warning:', errorMessage);
      }

      let errMsg = 'Terjadi kesalahan sistem. Silakan coba lagi.';

      if (errorCode === 'auth/email-already-in-use' || errorMessage.includes('email-already-in-use')) {
        errMsg = 'Alamat email ini sudah terdaftar sebagai akun SCRIBA. Silakan gunakan menu login atau tombol Masuk dengan Google.';
      } else if (errorCode === 'auth/weak-password' || errorMessage.includes('weak-password')) {
        errMsg = 'Password terlalu lemah (minimal 6 karakter).';
      } else if (errorCode === 'auth/invalid-email' || errorMessage.includes('invalid-email')) {
        errMsg = 'Format alamat email tidak valid.';
      } else if (
        errorCode === 'auth/user-not-found' || 
        errorCode === 'auth/invalid-credential' || 
        errorMessage.includes('user-not-found') || 
        errorMessage.includes('invalid-credential')
      ) {
        if (normalizedEmail === 'kazokuhairy@gmail.com') {
          errMsg = 'Kata sandi salah untuk email kazokuhairy@gmail.com. Silakan gunakan kata sandi Anda yang benar atau klik tombol "Lupa Kata Sandi?" di bawah ini.';
        } else {
          errMsg = 'Email atau password salah. Jika Anda mendaftar melalui tombol Google sebelumnya, silakan masuk menggunakan Google.';
        }
      } else if (errorMessage) {
        errMsg = errorMessage.replace('FirebaseError: ', '').replace('Firebase: ', '').replace('Error ', '').trim();
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Harap masukkan alamat email Anda terlebih dahulu.');
      return;
    }
    setError(null);
    setResetSuccess(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setResetSuccess('Tautan atur ulang kata sandi berhasil dikirim! Silakan periksa kotak masuk atau spam email Anda.');
    } catch (err: any) {
      const errorCode = err.code || '';
      const errorMessage = err.message || '';
      
      const isExpectedAuthError = 
        errorCode.startsWith('auth/') || 
        errorMessage.includes('invalid-email') ||
        errorMessage.includes('user-not-found');

      if (!isExpectedAuthError) {
        console.error(err);
      } else {
        console.warn('Authentication warning:', errorMessage);
      }

      let errMsg = 'Gagal mengirim email pemulihan. Silakan periksa kembali ketikan email Anda.';
      if (errorCode === 'auth/user-not-found' || errorMessage.includes('user-not-found')) {
        errMsg = 'Alamat email ini tidak terdaftar sebagai akun SCRIBA.';
      } else if (errorCode === 'auth/invalid-email' || errorMessage.includes('invalid-email')) {
        errMsg = 'Format alamat email tidak valid.';
      } else if (errorMessage) {
        errMsg = errorMessage.replace('FirebaseError: ', '').replace('Firebase: ', '').replace('Error ', '').trim();
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Use popup for the AI Studio preview environment as per the guidelines
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Gagal masuk menggunakan Google. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-sm text-neutral-900 duration-200">
        
        {/* Header Branding */}
        <div className="text-center space-y-3 mb-8">
          {appLogo && (appLogo.startsWith('data:image/') || appLogo.startsWith('http://') || appLogo.startsWith('https://')) ? (
            <div className="flex justify-center select-none py-2">
              <img src={appLogo} alt="Scriba kustom logo" className="h-16 w-auto object-contain max-w-[280px]" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="p-3 bg-neutral-900 rounded-2xl text-white shadow-sm flex items-center justify-center w-14 h-14 overflow-hidden select-none">
                  <span className="text-2xl">{appLogo || '✍️'}</span>
                </div>
              </div>
              <h1 className="font-montserrat font-black tracking-widest text-2xl text-neutral-900 mt-2">
                SCRIBA
              </h1>
            </>
          )}
          <p className="text-[10px] text-neutral-450 font-bold uppercase tracking-widest leading-none">
            Novel Draft Workspace Cloud
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-55 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 font-medium shadow-3xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-650" />
            <span className="flex-1 leading-relaxed">{error}</span>
          </div>
        )}

        {resetSuccess && (
          <div className="mb-5 p-3.5 bg-neutral-900 border border-neutral-900 rounded-2xl flex items-start gap-2.5 text-xs text-white font-medium shadow-3xs">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-white animate-pulse" />
            <span className="flex-1 leading-relaxed">{resetSuccess}</span>
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <p className="text-xs text-neutral-500 leading-relaxed mb-4">
              Masukkan email Anda di bawah ini. Kami akan mengirimkan tautan pemulihan untuk mengatur ulang kata sandi Anda.
            </p>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                Alamat Email Pemulihan
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3 px-4 rounded-2xl text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
              <span>Kirim Link Atur Ulang</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setError(null);
                setResetSuccess(null);
              }}
              className="w-full border border-neutral-200 hover:border-neutral-900 bg-white text-neutral-850 font-bold py-3 px-4 rounded-2xl text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
            >
              <span>Kembali ke Login</span>
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                  Alamat Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                    Kata Sandi
                  </label>
                  {!isRegistering && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError(null);
                        setResetSuccess(null);
                      }}
                      className="text-[9px] font-bold text-neutral-450 uppercase tracking-widest hover:text-neutral-900 transition-colors cursor-pointer"
                    >
                      Lupa kata sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3 px-4 rounded-2xl text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{isRegistering ? 'Daftar Akun Baru' : 'Masuk sekarang'}</span>
              </button>
            </form>

            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-neutral-200 w-full" />
              <span className="absolute bg-white px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                atau gunakan
              </span>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              type="button"
              className="w-full border border-neutral-200 hover:border-neutral-900 bg-white text-neutral-800 font-bold py-3 px-4 rounded-2xl text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-3xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Chrome className="w-4 h-4 text-neutral-850" />
              )}
              <span>Masuk dengan Google</span>
            </button>

            {/* Auth Sub-mode switcher toggle */}
            <div className="mt-8 text-center text-xs text-neutral-500 font-medium">
              {isRegistering ? (
                <p>
                  Selesai memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(false);
                      setError(null);
                      setResetSuccess(null);
                    }}
                    className="text-neutral-900 font-bold underline hover:text-neutral-700 cursor-pointer"
                  >
                    Masuk di sini
                  </button>
                </p>
              ) : (
                <p>
                  Belum memiliki akun SCRIBA?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(true);
                      setError(null);
                      setResetSuccess(null);
                    }}
                    className="text-neutral-900 font-bold underline hover:text-neutral-700 cursor-pointer"
                  >
                    Daftar sekarang
                  </button>
                </p>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
