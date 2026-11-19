import React, { useState } from 'react';
import {
  BadgeCheck,
  Car,
  Fingerprint,
  Lock,
  LogOut,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  UserCheck,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';
import { analyzeReviewSentiment } from '../utils/nlpAndGeo';

export const ProfileTrustScreen: React.FC = () => {
  const {
    currentUser,
    role,
    switchUserMode,
    activeBookedPool,
    selectedPool,
    activePublisherPool,
    reviews,
    submitPeerReview,
    logoutCitizen,
    openAdminAuthModal,
    resetDemoData,
  } = useSmartPool();

  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  if (!currentUser) return null;

  const isFemale = currentUser.gender === 'Female';
  const initials = currentUser.fullName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const liveSentiment = analyzeReviewSentiment(
    comment,
    currentUser.trustScore,
    stars
  );

  // Strict Role-Scoped Mutual Rating Direction:
  // Passenger Mode rates their verified same-gender Publisher;
  // Publisher Mode rates their verified same-gender Co-Rider.
  const isPublisherMode = role === 'publisher';
  const roleDirection = isPublisherMode
    ? 'driver_to_passenger'
    : 'passenger_to_driver';

  const firstSeatedRider = activePublisherPool
    ? Object.values(activePublisherPool.cabin.seats).find(Boolean)
    : null;

  const targetPool = isPublisherMode
    ? activePublisherPool
    : activeBookedPool ?? selectedPool;

  const targetName = isPublisherMode
    ? firstSeatedRider?.name ??
      (isFemale ? 'Sana Tariq' : 'Bilal Siddiqui')
    : targetPool?.driverName ??
      (isFemale ? 'Dr. Hira Kamal' : 'Kamran Siddiqui');

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    submitPeerReview({
      reviewerName: currentUser.fullName,
      targetName,
      targetGender: currentUser.gender,
      roleDirection,
      stars,
      comment: comment.trim(),
      sentimentScore: liveSentiment.score,
      sentimentLabel: liveSentiment.label,
      tags: liveSentiment.matchedTokens.slice(0, 3).map((t) => t.word),
      corridor: targetPool?.corridorName ?? 'Shahrah-e-Faisal → Saddar',
    });
    setComment('');
    setStars(5);
  };

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Verified Citizen Identity & Immutable NADRA KYC Gender Passport */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0A192F] via-[#0F172A] to-[#064E3B] text-white p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-extrabold shrink-0 border-2 ${
                isFemale
                  ? 'bg-pink-500/30 border-pink-300/60 text-pink-100'
                  : 'bg-sky-500/30 border-sky-300/60 text-sky-100'
              }`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold flex items-center gap-1.5 truncate">
                {currentUser.fullName}
                <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              </h1>
              <p className="text-[11px] text-slate-300 font-mono-num">
                {currentUser.phone} · DOB {currentUser.dob}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border ${
                    isFemale
                      ? 'bg-pink-500/25 border-pink-300/50 text-pink-100'
                      : 'bg-sky-500/25 border-sky-300/50 text-sky-100'
                  }`}
                >
                  <Lock className="w-2.5 h-2.5" />
                  KYC {currentUser.gender} (Immutable)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-[9.5px] font-extrabold font-mono-num">
                  Trust {currentUser.trustScore}% · {currentUser.poolsShared} Pools
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Read-Only NADRA KYC Verification Certificate */}
        <div className="rounded-2xl bg-white/10 border border-white/15 p-3 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider">
            <span className="inline-flex items-center gap-1">
              <Fingerprint className="w-3.5 h-3.5" />
              Verified NADRA KYC Passport
            </span>
            <span className="font-mono-num">{currentUser.kyc.kycId}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[10.5px]">
            <div>
              <span className="text-slate-400 block text-[9.5px]">
                CNIC (13th Digit: {currentUser.kyc.cnicLastDigit})
              </span>
              <span className="font-mono-num font-bold text-white">
                {currentUser.cnic}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9.5px]">
                Backend Gender Isolation
              </span>
              <span className="font-bold text-emerald-300">
                {currentUser.gender}-to-{currentUser.gender} Only
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-300 pt-1 border-t border-white/10">
            SIM OTP Verified · CNIC OCR{' '}
            <strong className="font-mono-num">{currentUser.kyc.ocrConfidence}%</strong> ·
            Biometric Match{' '}
            <strong className="font-mono-num text-emerald-300">
              {currentUser.kyc.biometricMatch}%
            </strong>
            . Gender is permanently locked from your NADRA CNIC.
          </p>
        </div>
      </div>

      {/* Role Switch Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
          Active App Workspace
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => switchUserMode('passenger')}
            className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              role === 'passenger'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-600 mb-1" />
            <p className="text-xs font-extrabold">Passenger Mode</p>
            <p className="text-[10px] opacity-80">
              Browse &amp; book {currentUser.gender}-Only pools
            </p>
          </button>
          <button
            type="button"
            onClick={() => switchUserMode('publisher')}
            className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              role === 'publisher'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <Car className="w-4 h-4 text-emerald-600 mb-1" />
            <p className="text-xs font-extrabold">Publisher Mode</p>
            <p className="text-[10px] opacity-80">
              Offer {currentUser.gender}-Only seats &amp; payouts
            </p>
          </button>
        </div>
      </div>

      {/* Behavioral Trust Score Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Behavioral Trust Index
          </h2>
          <span className="text-xs font-extrabold font-mono-num text-emerald-700">
            {currentUser.trustScore}/100
          </span>
        </div>
        {[
          { label: 'Punctuality & Reliability', score: currentUser.reliabilityScore },
          { label: 'Cabin Safety & Comfort', score: currentUser.comfortScore },
          { label: 'Peer Communication', score: currentUser.communicationScore },
        ].map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-700">
              <span>{item.label}</span>
              <span className="font-mono-num text-emerald-700">{item.score}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Role-Specific Mutual Rating + Live AI NLP Sentiment Engine */}
      <form
        onSubmit={handleReviewSubmit}
        className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {isPublisherMode ? 'Rate Verified Co-Rider' : 'Rate Ride Publisher'}
            </span>
            <h2 className="text-sm font-extrabold text-slate-900 mt-1">
              {targetName}
            </h2>
          </div>
          <Sparkles className="w-4 h-4 text-emerald-600" />
        </div>

        {/* 1-5 Star Selector */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              aria-label={`${n} stars`}
              className="p-1 cursor-pointer"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  n <= stars
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-slate-100 text-slate-300'
                }`}
              />
            </button>
          ))}
          <span className="ml-auto text-xs font-extrabold font-mono-num text-slate-700">
            {stars}.0 / 5.0
          </span>
        </div>

        <textarea
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            isPublisherMode
              ? 'e.g., Very punctual at the meeting corner, polite and respectful...'
              : 'e.g., Punctual, safe smooth driving, clean cabin — or reckless/late...'
          }
          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
        />

        {/* Live NLP Sentiment Classification Preview */}
        {comment.trim().length > 0 && (
          <div
            className={`rounded-xl border p-2.5 text-[11px] flex items-center justify-between gap-2 ${
              liveSentiment.label === 'Negative'
                ? 'bg-red-50 border-red-300 text-red-900'
                : liveSentiment.label === 'Positive'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <span className="font-extrabold font-mono-num">
              NLP: {liveSentiment.score >= 0 ? `+${liveSentiment.score}` : liveSentiment.score}%{' '}
              {liveSentiment.label}
            </span>
            <span className="text-[10px] truncate">
              {liveSentiment.matchedTokens.length > 0
                ? `Detected: ${liveSentiment.matchedTokens
                    .slice(0, 3)
                    .map((t) => t.word)
                    .join(', ')}`
                : `Confidence ${liveSentiment.confidence}%`}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={!comment.trim()}
          className={`w-full py-3 rounded-xl font-extrabold text-xs cursor-pointer ${
            comment.trim()
              ? 'bg-[#0A192F] hover:bg-slate-800 text-white'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Submit {isPublisherMode ? 'Co-Rider' : 'Publisher'} Review
        </button>
      </form>

      {/* Same-Gender Community Peer Reviews */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
          Verified Community Reviews ({reviews.length})
        </h3>
        <div className="space-y-2">
          {reviews.slice(0, 4).map((rev) => (
            <div
              key={rev.id}
              className="rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-900 truncate">
                  {rev.reviewerName} → {rev.targetName}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold font-mono-num shrink-0 ${
                    rev.sentimentLabel === 'Negative'
                      ? 'bg-red-100 text-red-800'
                      : rev.sentimentLabel === 'Positive'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {rev.stars}★ · {rev.sentimentScore >= 0 ? '+' : ''}
                  {rev.sentimentScore}% {rev.sentimentLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">{rev.comment}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Account Controls & Password-Protected Admin Entry */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <button
          type="button"
          onClick={logoutCitizen}
          className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-emerald-400" />
          Sign Out / Switch Verified Account
        </button>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={openAdminAuthModal}
            className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-slate-600" />
            Admin Control Unit
          </button>
          <button
            type="button"
            onClick={resetDemoData}
            className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-red-50 border border-slate-200 text-slate-600 hover:text-red-700 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Local DB
          </button>
        </div>
      </div>
    </div>
  );
};
