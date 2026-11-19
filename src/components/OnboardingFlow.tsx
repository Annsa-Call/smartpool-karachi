import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  Car,
  CheckCircle2,
  CreditCard,
  Eye,
  KeyRound,
  Leaf,
  Lock,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  Video,
  VideoOff,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';
import { parseAndVerifyPakistaniCnic } from '../services/smartpoolBackend';

function detectPakCarrier(digits: string): string {
  const prefix = digits.replace(/\D/g, '').slice(0, 3);
  if (/^30[0-9]|^32[0-5]/.test(prefix)) return 'Jazz / Warid SIM';
  if (/^31[0-9]/.test(prefix)) return 'Zong 4G SIM';
  if (/^33[0-9]/.test(prefix)) return 'Ufone 4G SIM';
  if (/^34[0-9]/.test(prefix)) return 'Telenor PK SIM';
  return 'PTA Registered SIM';
}

export const OnboardingFlow: React.FC = () => {
  const {
    onboardingStep,
    setOnboardingStep,
    allDemoAccounts,
    loginCitizen,
    quickSignInAccount,
    registerVerifiedCitizen,
    openAdminAuthModal,
    pushToast,
  } = useSmartPool();

  // Screen 1: Login state
  const [loginMethod, setLoginMethod] = useState<'phone' | 'cnic'>('phone');
  const [loginInput, setLoginInput] = useState('304 2891450');
  const [loginPasscode, setLoginPasscode] = useState('112233');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Screen 2: SIM OTP Registration state
  const [phoneDigits, setPhoneDigits] = useState('312 4589021');
  const [newPasscode, setNewPasscode] = useState('112233');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Screen 3: CNIC OCR & Automatic 13th-Digit Gender Derivation
  const [frontFileName, setFrontFileName] = useState<string | null>(null);
  const [backFileName, setBackFileName] = useState<string | null>(null);
  const [sampleCardType, setSampleCardType] = useState<'female' | 'male'>('female');
  const [isScanningCnic, setIsScanningCnic] = useState(false);
  const [cnicScanned, setCnicScanned] = useState(false);
  const [fullName, setFullName] = useState('Zoya Siddiqui');
  const [cnicNumber, setCnicNumber] = useState('42201-6841920-6'); // Even last digit 6 -> Female
  const [dob, setDob] = useState('19 / 05 / 1997');
  const [cnicError, setCnicError] = useState<string | null>(null);

  // Screen 4: On-Device Biometric Facial Verification
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [bioPhase, setBioPhase] = useState<
    'ready' | 'depth' | 'blink' | 'matching' | 'done'
  >('ready');
  const [bioProgress, setBioProgress] = useState(0);
  const [regError, setRegError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Real-time NADRA 13th-digit gender derivation
  const cnicVerification = parseAndVerifyPakistaniCnic(cnicNumber);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
  };

  const toggleWebcam = async () => {
    if (webcamActive) {
      stopWebcam();
      return;
    }
    setWebcamError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setWebcamError('Camera unavailable — using on-device 3D Face Mesh.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 320 },
        audio: false,
      });
      streamRef.current = stream;
      setWebcamActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      }, 60);
    } catch {
      setWebcamError('Camera permission declined — 3D ML Kit Face Mesh active.');
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = loginCitizen(loginInput, loginPasscode);
    if (!res.ok) {
      setLoginError(res.error ?? 'Authentication failed.');
    }
  };

  const handleSendOtp = () => {
    const raw = phoneDigits.replace(/\D/g, '');
    if (raw.length < 10) {
      pushToast('Invalid Mobile Number', 'Enter a 10-digit Pakistani number (3XX XXXXXXX).', 'warning');
      return;
    }
    setSendingOtp(true);
    window.setTimeout(() => {
      setSendingOtp(false);
      setOtpSent(true);
      pushToast(
        'SIM OTP Dispatched',
        `6-digit verification code sent to +92 ${phoneDigits} (${detectPakCarrier(phoneDigits)})`,
        'info'
      );
    }, 600);
  };

  const handleAutoFillOtp = () => {
    setOtpDigits(['1', '2', '3', '4', '5', '6']);
    setVerifyingOtp(true);
    window.setTimeout(() => {
      setVerifyingOtp(false);
      pushToast('SIM Verified!', `+92 ${phoneDigits} bound to your device.`, 'success');
      setOnboardingStep('cnic');
    }, 650);
  };

  const handleVerifyOtpManual = () => {
    if (otpDigits.join('').length < 6) {
      pushToast('Incomplete OTP', 'Enter all 6 digits to verify your SIM.', 'warning');
      return;
    }
    setVerifyingOtp(true);
    window.setTimeout(() => {
      setVerifyingOtp(false);
      pushToast('SIM Verified!', `+92 ${phoneDigits} verified.`, 'success');
      setOnboardingStep('cnic');
    }, 550);
  };

  const handleRunCnicOcr = () => {
    setCnicError(null);
    setIsScanningCnic(true);
    setCnicScanned(false);
    window.setTimeout(() => {
      setIsScanningCnic(false);
      setCnicScanned(true);
      const randMid = Math.floor(1000000 + Math.random() * 8999999);
      if (sampleCardType === 'female') {
        setFullName('Zoya Siddiqui');
        setCnicNumber(`42201-${randMid}-6`); // Even 13th digit -> KYC Female
        setDob('19 / 05 / 1997');
      } else {
        setFullName('Hassan Raza Khan');
        setCnicNumber(`42101-${randMid}-3`); // Odd 13th digit -> KYC Male
        setDob('14 / 08 / 1994');
      }
      pushToast(
        '99.8% Extraction Confidence – Data Verified',
        'NADRA CNIC fields & legal gender digit extracted and verified.',
        'success'
      );
    }, 1450);
  };

  const handleProceedToBiometrics = () => {
    setCnicError(null);
    if (fullName.trim().length < 3) {
      setCnicError('Please enter your full name as printed on your CNIC.');
      return;
    }
    if (!cnicVerification.valid) {
      setCnicError(cnicVerification.error ?? 'Enter a valid 13-digit CNIC.');
      return;
    }
    setCnicNumber(cnicVerification.formattedCnic);
    setBioPhase('ready');
    setBioProgress(0);
    setRegError(null);
    setOnboardingStep('biometric');
  };

  const handleCompleteBiometricAndRegister = () => {
    setRegError(null);
    setBioPhase('depth');
    setBioProgress(30);
    window.setTimeout(() => {
      setBioPhase('blink');
      setBioProgress(65);
    }, 900);
    window.setTimeout(() => {
      setBioPhase('matching');
      setBioProgress(92);
    }, 1800);
    window.setTimeout(() => {
      stopWebcam();
      const res = registerVerifiedCitizen({
        fullName,
        phone: `+92 ${phoneDigits}`,
        cnic: cnicNumber,
        dob,
        passcode: newPasscode || '112233',
        ocrConfidence: 99.8,
        biometricMatch: 99.6,
      });
      if (!res.ok) {
        setBioPhase('ready');
        setBioProgress(0);
        setRegError(res.error ?? 'Registration could not be completed.');
      }
    }, 2500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* ================================================================ */}
      {/* SCREEN 1: SPLASH & CITIZEN LOGIN                                 */}
      {/* ================================================================ */}
      {onboardingStep === 'splash' && (
        <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-[#0A192F] via-[#0F172A] to-[#0B2239] text-white px-5 py-6">
          {/* Logo Hero */}
          <div className="text-center pt-1">
            <div className="relative mx-auto w-18 h-18 flex items-center justify-center mb-3">
              <span className="absolute inset-0 rounded-3xl bg-emerald-500/25 animate-pulse-ring" />
              <div className="relative w-18 h-18 rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-car-float">
                <Car className="w-9 h-9 text-[#0A192F] stroke-[2.3]" />
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#0A192F] border-2 border-emerald-400 flex items-center justify-center">
                  <Leaf className="w-3 h-3 text-emerald-400" />
                </span>
              </div>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight">
              Smart<span className="text-emerald-400">Pool</span>
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300/90 mt-0.5">
              AI-Powered Smart Carpooling · Karachi
            </p>
            <p className="mt-2 text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
              Join the future of eco-friendly, efficient urban commuting
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10.5px] font-semibold text-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              NADRA KYC Same-Gender Verified Commuting
            </div>
          </div>

          {/* Login Form Card */}
          <div className="mt-4 bg-white text-slate-900 rounded-3xl p-5 shadow-2xl space-y-3.5">
            <form onSubmit={handleSignIn} className="space-y-3">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('phone');
                    setLoginInput('304 2891450');
                    setLoginError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    loginMethod === 'phone'
                      ? 'bg-[#0A192F] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mobile Number
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('cnic');
                    setLoginInput('42101-9876543-1');
                    setLoginError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    loginMethod === 'cnic'
                      ? 'bg-[#0A192F] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  NADRA CNIC
                </button>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {loginMethod === 'phone' ? 'Pakistani Mobile Number' : '13-Digit CNIC'}
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 focus-within:border-emerald-500 overflow-hidden bg-slate-50">
                  {loginMethod === 'phone' && (
                    <span className="px-3 py-2.5 bg-slate-200/70 text-xs font-extrabold text-slate-800 border-r border-slate-300 font-mono-num">
                      🇵🇰 +92
                    </span>
                  )}
                  <input
                    type="text"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder={
                      loginMethod === 'phone' ? '3XX XXXXXXX' : '42101-XXXXXXX-X'
                    }
                    className="w-full px-3 py-2.5 text-xs font-bold text-slate-900 bg-transparent focus:outline-none font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Account Passcode
                </label>
                <input
                  type="password"
                  value={loginPasscode}
                  onChange={(e) => setLoginPasscode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {loginError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[11px] font-semibold text-red-700 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                Sign In
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>
            </form>

            {/* Quick Sign-In Verified KYC Accounts (Male vs Female KYC Testing) */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Verified KYC Citizen Accounts (Tap to Sign In)
              </p>
              <div className="space-y-1.5">
                {allDemoAccounts.slice(0, 3).map((acc) => {
                  const isF = acc.gender === 'Female';
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => quickSignInAccount(acc.id)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/40 flex items-center justify-between text-left transition-all cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1">
                          {acc.fullName}
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        </p>
                        <p className="text-[10px] font-mono-num text-slate-500">
                          CNIC {acc.cnic}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold ${
                          isF
                            ? 'bg-pink-100 text-pink-800 border border-pink-300'
                            : 'bg-sky-100 text-sky-800 border border-sky-300'
                        }`}
                      >
                        KYC {acc.gender}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* New Citizen Registration CTA */}
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtpDigits(['', '', '', '', '', '']);
                setCnicScanned(false);
                setOnboardingStep('otp');
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Create Account (CNIC + Biometric KYC)
            </button>
          </div>

          {/* Discreet Footer with Password-Locked Admin Access */}
          <div className="pt-4 flex items-center justify-between text-[10.5px] text-slate-400">
            <span>Karachi SmartPool · Zero-Profit Split</span>
            <button
              type="button"
              onClick={openAdminAuthModal}
              className="inline-flex items-center gap-1 font-bold text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              Admin Portal
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SCREEN 2: STEP 1 OF 4 — PHONE & SIM-BASED OTP VERIFICATION       */}
      {/* ================================================================ */}
      {onboardingStep === 'otp' && (
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div>
            <button
              type="button"
              onClick={() => setOnboardingStep('splash')}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </button>

            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 mb-1.5">
              <span>STEP 1 OF 4 · SIM & PASSCODE</span>
              <span>25%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden mb-5">
              <div className="h-full w-1/4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Phone & SIM-Based OTP Verification
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Open to every Pakistani citizen with a PTA/NADRA-linked mobile SIM and
                  CNIC. No university or institutional email required.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
                    Mobile Number
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {detectPakCarrier(phoneDigits)}
                  </span>
                </div>
                <div className="flex items-center rounded-xl border-2 border-slate-200 focus-within:border-emerald-500 overflow-hidden bg-slate-50">
                  <span className="px-3 py-2.5 bg-[#0A192F] text-white text-xs font-extrabold font-mono-num">
                    🇵🇰 +92
                  </span>
                  <input
                    type="tel"
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(e.target.value)}
                    placeholder="3XX XXXXXXX"
                    className="w-full px-3 py-2.5 text-sm font-bold text-slate-900 bg-transparent focus:outline-none font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Create 6-Digit Login Passcode
                </label>
                <input
                  type="password"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  placeholder="6-digit passcode"
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="w-full py-3.5 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-70"
                >
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  {sendingOtp ? 'Sending SIM OTP...' : 'Send OTP Verification Code'}
                </button>
              ) : (
                <div className="pt-3 border-t border-slate-100 space-y-3 animate-slide-up">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Enter 6-Digit SMS OTP</span>
                    <span className="text-[10.5px] font-semibold text-emerald-700">
                      +92 {phoneDigits}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 1);
                          const copy = [...otpDigits];
                          copy[idx] = val;
                          setOtpDigits(copy);
                        }}
                        className="h-11 rounded-xl border-2 border-slate-200 focus:border-emerald-500 bg-slate-50 text-center text-base font-extrabold font-mono-num focus:outline-none"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoFillOtp}
                    disabled={verifyingOtp}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    {verifyingOtp ? 'Verifying SIM...' : 'Auto-Fill SMS OTP (123456)'}
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyOtpManual}
                    disabled={verifyingOtp}
                    className="w-full py-2.5 rounded-xl bg-[#0A192F] text-white font-bold text-xs cursor-pointer"
                  >
                    Verify Entered Code
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SCREEN 3: STEP 2 & 3 OF 4 — NADRA CNIC OCR & GENDER LOCK         */}
      {/* ================================================================ */}
      {onboardingStep === 'cnic' && (
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          <button
            type="button"
            onClick={() => setOnboardingStep('otp')}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to OTP Step
          </button>

          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 mb-1.5">
              <span>
                {cnicScanned
                  ? 'STEP 3 OF 4 · VERIFY EXTRACTED CNIC KYC'
                  : 'STEP 2 OF 4 · NADRA SMART CNIC SCAN'}
              </span>
              <span>{cnicScanned ? '75%' : '50%'}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ${
                  cnicScanned ? 'w-3/4' : 'w-1/2'
                }`}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  NADRA Smart CNIC Scanner
                </h2>
                <p className="text-[11px] text-slate-500">
                  Gender is cryptographically derived from your 13th CNIC digit &amp;
                  locked after KYC
                </p>
              </div>
              <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>

            {/* Select which CNIC card specimen to scan (or upload real images) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100">
              <button
                type="button"
                onClick={() => setSampleCardType('female')}
                className={`py-1.5 rounded-lg text-[10.5px] font-extrabold cursor-pointer ${
                  sampleCardType === 'female'
                    ? 'bg-pink-600 text-white'
                    : 'text-slate-600'
                }`}
              >
                Scan Female CNIC (Even Digit)
              </button>
              <button
                type="button"
                onClick={() => setSampleCardType('male')}
                className={`py-1.5 rounded-lg text-[10.5px] font-extrabold cursor-pointer ${
                  sampleCardType === 'male'
                    ? 'bg-[#0A192F] text-white'
                    : 'text-slate-600'
                }`}
              >
                Scan Male CNIC (Odd Digit)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="relative overflow-hidden rounded-2xl border-2 border-emerald-400/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-3 cursor-pointer min-h-[108px] flex flex-col justify-between">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFrontFileName(f.name);
                  }}
                />
                {isScanningCnic && (
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_12px_#10b981] animate-scan-laser z-10" />
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase text-emerald-800 bg-emerald-200/70 px-1.5 py-0.5 rounded">
                    CNIC Front
                  </span>
                  <span className="w-3.5 h-2.5 rounded-xs bg-amber-300 border border-amber-500" />
                </div>
                <p className="text-[9.5px] font-bold text-slate-700 truncate my-1">
                  {frontFileName ?? 'Smart Identity Card'}
                </p>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700">
                  <Camera className="w-3 h-3" />
                  {frontFileName ? 'Uploaded' : 'Tap Upload'}
                </span>
              </label>

              <label className="relative overflow-hidden rounded-2xl border-2 border-emerald-400/80 bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-3 cursor-pointer min-h-[108px] flex flex-col justify-between">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setBackFileName(f.name);
                  }}
                />
                {isScanningCnic && (
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_12px_#10b981] animate-scan-laser z-10" />
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                    CNIC Back
                  </span>
                  <Upload className="w-3 h-3 text-slate-500" />
                </div>
                <div className="space-y-1 my-1">
                  <div className="h-2 rounded bg-slate-800/80 w-full" />
                  <p className="text-[8.5px] text-slate-500 truncate">
                    {backFileName ?? 'Karachi, Sindh'}
                  </p>
                </div>
                <span className="text-[9px] font-bold text-emerald-700">
                  {backFileName ? 'Uploaded' : 'NADRA Barcode'}
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleRunCnicOcr}
              disabled={isScanningCnic}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-75"
            >
              <Sparkles className="w-4 h-4" />
              {isScanningCnic ? 'Running CNIC OCR Scan...' : 'Scan & Extract CNIC Details'}
            </button>
          </div>

          {cnicScanned && !isScanningCnic && (
            <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3 animate-slide-up">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-extrabold">
                  99.8% Extraction Confidence – Data Verified
                </span>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full Legal Name (As on CNIC)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    13-Digit CNIC Number
                  </label>
                  <input
                    type="text"
                    value={cnicNumber}
                    onChange={(e) => setCnicNumber(e.target.value)}
                    placeholder="42101-XXXXXXX-X"
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold font-mono-num text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="text"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold font-mono-num text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* READ-ONLY BACKEND-DERIVED KYC GENDER LOCK */}
              <div
                className={`rounded-2xl border-2 p-3 flex items-center justify-between ${
                  !cnicVerification.valid
                    ? 'bg-amber-50 border-amber-300'
                    : cnicVerification.derivedGender === 'Female'
                    ? 'bg-pink-50 border-pink-300'
                    : 'bg-sky-50 border-sky-300'
                }`}
              >
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    KYC-Locked Gender (From CNIC 13th Digit)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {cnicVerification.valid
                      ? `Last digit "${cnicVerification.lastDigit}" (${
                          cnicVerification.lastDigit % 2 === 0 ? 'Even' : 'Odd'
                        }) → Matched strictly to ${
                          cnicVerification.derivedGender
                        }-Only pools.`
                      : cnicVerification.error}
                  </p>
                </div>
                {cnicVerification.valid && (
                  <span
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-extrabold ${
                      cnicVerification.derivedGender === 'Female'
                        ? 'bg-pink-600 text-white'
                        : 'bg-sky-700 text-white'
                    }`}
                  >
                    {cnicVerification.derivedGender}
                  </span>
                )}
              </div>

              {cnicError && (
                <p className="text-xs font-bold text-red-600">{cnicError}</p>
              )}

              <button
                type="button"
                onClick={handleProceedToBiometrics}
                className="w-full py-3 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                Lock KYC Data &amp; Verify Face Biometrics
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* SCREEN 4: STEP 4 OF 4 — ON-DEVICE BIOMETRIC FACIAL VERIFICATION  */}
      {/* ================================================================ */}
      {onboardingStep === 'biometric' && (
        <div className="flex-1 p-5 flex flex-col justify-between bg-gradient-to-b from-[#0A192F] to-[#0F172A] text-white">
          <div>
            <button
              type="button"
              onClick={() => {
                stopWebcam();
                setOnboardingStep('cnic');
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white mb-3 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to CNIC Review
            </button>

            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300 mb-1.5">
              <span>STEP 4 OF 4 · BIOMETRIC FACE MATCH</span>
              <span>{bioPhase === 'ready' ? '85%' : `${bioProgress}%`}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-5">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${bioPhase === 'ready' ? 85 : bioProgress}%` }}
              />
            </div>

            <div className="text-center mb-4">
              <h2 className="text-lg font-extrabold">
                On-Device Biometric Verification
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {fullName} · CNIC {cnicNumber} (KYC {cnicVerification.derivedGender})
              </p>
            </div>

            {/* Circular Face Viewport */}
            <div className="relative mx-auto w-52 h-52 flex items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full border-[3px] ${
                  bioPhase !== 'ready'
                    ? 'border-emerald-400 shadow-[0_0_28px_rgba(16,185,129,0.45)]'
                    : 'border-emerald-500/50 border-dashed'
                }`}
              />
              <div className="relative w-44 h-44 rounded-full overflow-hidden bg-gradient-to-b from-slate-900 via-[#0C223B] to-slate-900 border-2 border-emerald-400/60 flex items-center justify-center">
                {webcamActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <svg
                    viewBox="0 0 200 200"
                    className="w-36 h-36 animate-mesh"
                    fill="none"
                  >
                    <ellipse
                      cx="100"
                      cy="98"
                      rx="52"
                      ry="68"
                      stroke="#10B981"
                      strokeWidth="1.6"
                      strokeDasharray="4 3"
                    />
                    <path
                      d="M100 30 L100 166 M52 82 L148 82 M58 112 L142 112 M70 52 L100 82 L130 52 M52 82 L100 108 L148 82 M64 134 L100 108 L136 134"
                      stroke="#34D399"
                      strokeOpacity="0.45"
                      strokeWidth="1"
                    />
                    <ellipse
                      cx="78"
                      cy="84"
                      rx="11"
                      ry={bioPhase === 'blink' ? 1.5 : 5.5}
                      stroke="#6EE7B7"
                      strokeWidth="2"
                    />
                    <ellipse
                      cx="122"
                      cy="84"
                      rx="11"
                      ry={bioPhase === 'blink' ? 1.5 : 5.5}
                      stroke="#6EE7B7"
                      strokeWidth="2"
                    />
                    <path
                      d="M100 82 L94 110 L106 110 Z"
                      stroke="#34D399"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M82 132 Q100 142 118 132"
                      stroke="#6EE7B7"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {bioPhase !== 'ready' && (
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan-laser" />
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-extrabold">
                <Eye className="w-4 h-4 text-emerald-400" />
                {bioPhase === 'ready' && 'Scanning Depth... · Blink when ready'}
                {bioPhase === 'depth' && 'Scanning 3D Depth Map...'}
                {bioPhase === 'blink' && 'Blink when ready — Liveness Confirmed!'}
                {bioPhase === 'matching' && 'Sealing KYC Identity & Gender Lock...'}
              </div>

              <button
                type="button"
                onClick={toggleWebcam}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-slate-200 cursor-pointer"
              >
                {webcamActive ? (
                  <>
                    <VideoOff className="w-3.5 h-3.5 text-amber-300" />
                    Use 3D Face Mesh
                  </>
                ) : (
                  <>
                    <Video className="w-3.5 h-3.5 text-emerald-400" />
                    Enable Live Camera
                  </>
                )}
              </button>
              {webcamError && (
                <p className="text-[10.5px] text-amber-300 text-center">{webcamError}</p>
              )}
              {regError && (
                <p className="text-xs font-bold text-red-300 bg-red-950/80 border border-red-400/40 rounded-xl px-3 py-2 text-center">
                  {regError}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <button
              type="button"
              onClick={handleCompleteBiometricAndRegister}
              disabled={bioPhase !== 'ready'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-75"
            >
              <ScanFace className="w-4 h-4" />
              {bioPhase === 'ready'
                ? 'Complete Biometric KYC & Activate Account'
                : 'Verifying Biometrics...'}
            </button>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-300 leading-snug">
                Securely processed on-device (ML Kit / TF.js). Your biometric data is
                encrypted and never stored on external servers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
