import React from 'react';

/* ─── SVG Avatars — Chibi Game Characters ─── */
const avatars = {
  /* ── The Orchestrator — Royal conductor chibi with crown, cape, baton ── */
  orchestrator: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <radialGradient id="orc-glow" cx="50%" cy="40%" r="50%"><stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.3"/><stop offset="100%" stopColor="#2e1065" stopOpacity="0"/></radialGradient>
        <linearGradient id="orc-cape" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#4c1d95"/></linearGradient>
        <linearGradient id="orc-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5b21b6"/><stop offset="100%" stopColor="#3b0764"/></linearGradient>
        <linearGradient id="orc-crown" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#orc-glow)"/>
      {/* Cape */}
      <path d="M28 52 Q22 62 20 82 Q30 78 38 80 L38 55 Z" fill="url(#orc-cape)" opacity="0.9"/>
      <path d="M72 52 Q78 62 80 82 Q70 78 62 80 L62 55 Z" fill="url(#orc-cape)" opacity="0.9"/>
      {/* Body */}
      <rect x="33" y="52" width="34" height="30" rx="10" fill="url(#orc-body)" stroke="#7c3aed" strokeWidth="1.5"/>
      {/* Shoulder epaulettes */}
      <ellipse cx="35" cy="54" rx="7" ry="4" fill="#a78bfa"/>
      <ellipse cx="65" cy="54" rx="7" ry="4" fill="#a78bfa"/>
      <circle cx="35" cy="54" r="2.5" fill="#facc15"/><circle cx="65" cy="54" r="2.5" fill="#facc15"/>
      {/* Chest emblem */}
      <circle cx="50" cy="62" r="5" fill="#2e1065" stroke="#a78bfa" strokeWidth="1"/>
      <polygon points="50,58 51.5,61 55,61.5 52.5,63.5 53,67 50,65 47,67 47.5,63.5 45,61.5 48.5,61" fill="#facc15"/>
      {/* Legs / boots */}
      <rect x="38" y="78" width="10" height="12" rx="4" fill="#4c1d95"/>
      <rect x="52" y="78" width="10" height="12" rx="4" fill="#4c1d95"/>
      <rect x="37" y="86" width="12" height="6" rx="3" fill="#5b21b6" stroke="#7c3aed" strokeWidth="0.8"/>
      <rect x="51" y="86" width="12" height="6" rx="3" fill="#5b21b6" stroke="#7c3aed" strokeWidth="0.8"/>
      {/* Head */}
      <circle cx="50" cy="36" r="18" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="1.5"/>
      {/* Hair */}
      <path d="M32 32 Q34 20 50 18 Q66 20 68 32 Q68 28 64 24 Q56 18 50 17 Q44 18 36 24 Q32 28 32 32Z" fill="#4c1d95"/>
      {/* Eyes — big anime style */}
      <ellipse cx="42" cy="36" rx="5.5" ry="6" fill="white" stroke="#3b0764" strokeWidth="0.8"/>
      <ellipse cx="58" cy="36" rx="5.5" ry="6" fill="white" stroke="#3b0764" strokeWidth="0.8"/>
      <ellipse cx="43" cy="37" rx="3.5" ry="4" fill="#5b21b6"/>
      <ellipse cx="59" cy="37" rx="3.5" ry="4" fill="#5b21b6"/>
      <circle cx="44.5" cy="35" r="1.5" fill="white"/><circle cx="60.5" cy="35" r="1.5" fill="white"/>
      <circle cx="42" cy="38" r="0.8" fill="white" opacity="0.5"/><circle cx="58" cy="38" r="0.8" fill="white" opacity="0.5"/>
      {/* Eyebrows */}
      <path d="M37 30 Q42 28 47 30" fill="none" stroke="#3b0764" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M53 30 Q58 28 63 30" fill="none" stroke="#3b0764" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Mouth — confident smirk */}
      <path d="M45 44 Q50 47 55 44" fill="none" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Blush */}
      <ellipse cx="37" cy="42" rx="3.5" ry="2" fill="#ddd6fe" opacity="0.5"/>
      <ellipse cx="63" cy="42" rx="3.5" ry="2" fill="#ddd6fe" opacity="0.5"/>
      {/* Crown */}
      <path d="M34 22 L36 10 L42 18 L50 6 L58 18 L64 10 L66 22 Z" fill="url(#orc-crown)" stroke="#d97706" strokeWidth="1.2"/>
      <circle cx="42" cy="15" r="2" fill="#ef4444"/><circle cx="50" cy="10" r="2.5" fill="#3b82f6"/><circle cx="58" cy="15" r="2" fill="#22c55e"/>
      {/* Baton in right hand */}
      <line x1="74" y1="50" x2="82" y2="32" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="83" cy="30" r="3.5" fill="#facc15" stroke="#f59e0b" strokeWidth="1"/>
      <circle cx="83" cy="30" r="1.5" fill="white" opacity="0.6"/>
    </svg>
  ),

  /* ── Azoni AI — Cute robot chibi with screen face, antenna, blue armor ── */
  chat: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="chat-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#1d4ed8"/></linearGradient>
        <linearGradient id="chat-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e3a5f"/><stop offset="100%" stopColor="#0f172a"/></linearGradient>
        <radialGradient id="chat-glow" cx="50%" cy="50%"><stop offset="0%" stopColor="#60a5fa" stopOpacity="0.2"/><stop offset="100%" stopColor="transparent"/></radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#chat-glow)"/>
      {/* Antenna */}
      <line x1="50" y1="14" x2="50" y2="4" stroke="#93c5fd" strokeWidth="2"/>
      <circle cx="50" cy="3" r="3" fill="#60a5fa"><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/></circle>
      {/* Ears / side panels */}
      <rect x="16" y="28" width="8" height="18" rx="3" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1"/>
      <rect x="76" y="28" width="8" height="18" rx="3" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1"/>
      <circle cx="20" cy="34" r="2" fill="#93c5fd"/><circle cx="80" cy="34" r="2" fill="#93c5fd"/>
      {/* Head — rounded robot */}
      <rect x="24" y="14" width="52" height="40" rx="14" fill="url(#chat-body)" stroke="#2563eb" strokeWidth="1.5"/>
      {/* Face screen */}
      <rect x="30" y="20" width="40" height="28" rx="8" fill="url(#chat-screen)"/>
      {/* Eyes on screen — glowing */}
      <ellipse cx="42" cy="32" rx="5" ry="5.5" fill="#60a5fa" opacity="0.9"/>
      <ellipse cx="58" cy="32" rx="5" ry="5.5" fill="#60a5fa" opacity="0.9"/>
      <ellipse cx="42" cy="32" rx="3" ry="3.5" fill="#dbeafe"/>
      <ellipse cx="58" cy="32" rx="3" ry="3.5" fill="#dbeafe"/>
      <circle cx="43.5" cy="31" r="1.2" fill="white"/><circle cx="59.5" cy="31" r="1.2" fill="white"/>
      {/* Happy mouth on screen */}
      <path d="M44 40 Q50 45 56 40" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Body */}
      <rect x="32" y="54" width="36" height="24" rx="8" fill="url(#chat-body)" stroke="#2563eb" strokeWidth="1.2"/>
      {/* Chest light */}
      <circle cx="50" cy="64" r="4" fill="#0f172a" stroke="#3b82f6" strokeWidth="1"/>
      <circle cx="50" cy="64" r="2" fill="#60a5fa"><animate attributeName="r" values="2;2.8;2" dur="1.5s" repeatCount="indefinite"/></circle>
      {/* Arms */}
      <rect x="22" y="56" width="10" height="16" rx="5" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1"/>
      <rect x="68" y="56" width="10" height="16" rx="5" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1"/>
      <circle cx="27" cy="72" r="4" fill="#93c5fd" stroke="#2563eb" strokeWidth="1"/>
      <circle cx="73" cy="72" r="4" fill="#93c5fd" stroke="#2563eb" strokeWidth="1"/>
      {/* Legs */}
      <rect x="38" y="76" width="10" height="12" rx="4" fill="#1d4ed8"/>
      <rect x="52" y="76" width="10" height="12" rx="4" fill="#1d4ed8"/>
      <rect x="36" y="85" width="13" height="6" rx="3" fill="#2563eb" stroke="#3b82f6" strokeWidth="0.8"/>
      <rect x="51" y="85" width="13" height="6" rx="3" fill="#2563eb" stroke="#3b82f6" strokeWidth="0.8"/>
    </svg>
  ),

  /* ── The Scribe — Scholar chibi with beret, glasses, quill, open book ── */
  blog: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="blog-robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#d97706"/></linearGradient>
        <linearGradient id="blog-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fef3c7"/><stop offset="100%" stopColor="#fde68a"/></linearGradient>
      </defs>
      {/* Body / robe */}
      <path d="M30 52 Q30 48 38 48 L62 48 Q70 48 70 52 L72 82 Q72 88 50 88 Q28 88 28 82 Z" fill="url(#blog-robe)" stroke="#b45309" strokeWidth="1.2"/>
      {/* Robe collar */}
      <path d="M38 48 Q50 54 62 48" fill="#fef3c7" stroke="#d97706" strokeWidth="1"/>
      {/* Belt */}
      <rect x="34" y="62" width="32" height="4" rx="2" fill="#92400e"/>
      <rect x="47" y="61" width="6" height="6" rx="1.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8"/>
      {/* Arms */}
      <path d="M30 52 Q22 58 18 68" fill="none" stroke="#d97706" strokeWidth="6" strokeLinecap="round"/>
      <path d="M70 52 Q78 58 80 64" fill="none" stroke="#d97706" strokeWidth="6" strokeLinecap="round"/>
      {/* Left hand holds book */}
      <rect x="8" y="64" width="16" height="12" rx="2" fill="#fef3c7" stroke="#d97706" strokeWidth="1.2"/>
      <rect x="8" y="64" width="8" height="12" rx="2" fill="#fde68a"/>
      <line x1="16" y1="66" x2="16" y2="74" stroke="#b45309" strokeWidth="0.8"/>
      <line x1="10" y1="68" x2="14" y2="68" stroke="#b45309" strokeWidth="0.6" opacity="0.5"/>
      <line x1="10" y1="70" x2="14" y2="70" stroke="#b45309" strokeWidth="0.6" opacity="0.5"/>
      <line x1="10" y1="72" x2="13" y2="72" stroke="#b45309" strokeWidth="0.6" opacity="0.5"/>
      {/* Quill in right hand */}
      <line x1="80" y1="64" x2="86" y2="42" stroke="#78350f" strokeWidth="1.5"/>
      <path d="M86 42 Q90 38 88 34 Q86 38 84 40 Z" fill="#f59e0b"/>
      <path d="M86 42 Q82 38 84 34 Q86 38 88 40 Z" fill="#fbbf24"/>
      {/* Feet */}
      <ellipse cx="42" cy="90" rx="7" ry="3.5" fill="#92400e"/><ellipse cx="58" cy="90" rx="7" ry="3.5" fill="#92400e"/>
      {/* Head */}
      <circle cx="50" cy="32" r="18" fill="url(#blog-skin)"/>
      {/* Hair — tidy scholar */}
      <path d="M32 28 Q34 16 50 14 Q66 16 68 28 L68 32 Q64 24 50 22 Q36 24 32 32 Z" fill="#78350f"/>
      {/* Beret */}
      <ellipse cx="50" cy="16" rx="18" ry="6" fill="#92400e"/>
      <path d="M32 18 Q34 10 50 8 Q66 10 68 18 Q64 14 50 12 Q36 14 32 18Z" fill="#b45309"/>
      <circle cx="50" cy="8" r="2.5" fill="#78350f"/>
      {/* Glasses */}
      <circle cx="42" cy="33" r="6" fill="none" stroke="#78350f" strokeWidth="1.5"/>
      <circle cx="58" cy="33" r="6" fill="none" stroke="#78350f" strokeWidth="1.5"/>
      <line x1="48" y1="33" x2="52" y2="33" stroke="#78350f" strokeWidth="1.5"/>
      <line x1="36" y1="33" x2="32" y2="31" stroke="#78350f" strokeWidth="1"/>
      <line x1="64" y1="33" x2="68" y2="31" stroke="#78350f" strokeWidth="1"/>
      {/* Eyes behind glasses */}
      <ellipse cx="42" cy="34" rx="3" ry="3.5" fill="#431407"/>
      <ellipse cx="58" cy="34" rx="3" ry="3.5" fill="#431407"/>
      <circle cx="43.5" cy="33" r="1.2" fill="white"/><circle cx="59.5" cy="33" r="1.2" fill="white"/>
      <circle cx="42" cy="35.5" r="0.6" fill="white" opacity="0.4"/><circle cx="58" cy="35.5" r="0.6" fill="white" opacity="0.4"/>
      {/* Eyebrows */}
      <path d="M38 28 Q42 26 46 28" fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M54 28 Q58 26 62 28" fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Gentle smile */}
      <path d="M45 42 Q50 45 55 42" fill="none" stroke="#92400e" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Blush */}
      <ellipse cx="37" cy="40" rx="3" ry="1.5" fill="#fed7aa" opacity="0.6"/>
      <ellipse cx="63" cy="40" rx="3" ry="1.5" fill="#fed7aa" opacity="0.6"/>
    </svg>
  ),

  /* ── Coach — Athletic chibi with headband, tank top, dumbbell ── */
  fitness: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="fit-tank" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e"/><stop offset="100%" stopColor="#15803d"/></linearGradient>
        <linearGradient id="fit-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fcd9a8"/><stop offset="100%" stopColor="#f0c48a"/></linearGradient>
      </defs>
      {/* Body / tank top */}
      <path d="M34 50 Q34 46 42 46 L58 46 Q66 46 66 50 L68 76 Q68 80 50 80 Q32 80 32 76 Z" fill="url(#fit-tank)" stroke="#16a34a" strokeWidth="1.2"/>
      {/* Tank top straps */}
      <path d="M42 46 L40 36" stroke="#16a34a" strokeWidth="3" strokeLinecap="round"/>
      <path d="M58 46 L60 36" stroke="#16a34a" strokeWidth="3" strokeLinecap="round"/>
      {/* Number on chest */}
      <text x="50" y="64" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="12" fill="#052e16" opacity="0.4">#1</text>
      {/* Arms — muscular */}
      <path d="M34 50 Q20 52 14 60" fill="none" stroke="url(#fit-skin)" strokeWidth="8" strokeLinecap="round"/>
      <path d="M66 50 Q80 52 86 44" fill="none" stroke="url(#fit-skin)" strokeWidth="8" strokeLinecap="round"/>
      {/* Dumbbell in right hand */}
      <rect x="82" y="34" width="4" height="16" rx="2" fill="#a1a1aa" stroke="#71717a" strokeWidth="0.8"/>
      <rect x="79" y="32" width="10" height="5" rx="2" fill="#71717a"/><rect x="79" y="47" width="10" height="5" rx="2" fill="#71717a"/>
      {/* Left fist */}
      <circle cx="14" cy="62" r="5" fill="#fcd9a8" stroke="#d4a574" strokeWidth="0.8"/>
      {/* Shorts */}
      <rect x="36" y="74" width="12" height="10" rx="3" fill="#052e16"/>
      <rect x="52" y="74" width="12" height="10" rx="3" fill="#052e16"/>
      {/* Legs */}
      <rect x="38" y="82" width="10" height="8" rx="3" fill="#fcd9a8"/>
      <rect x="54" y="82" width="10" height="8" rx="3" fill="#fcd9a8"/>
      {/* Sneakers */}
      <rect x="36" y="88" width="13" height="6" rx="3" fill="#ef4444" stroke="#dc2626" strokeWidth="0.8"/>
      <rect x="53" y="88" width="13" height="6" rx="3" fill="#ef4444" stroke="#dc2626" strokeWidth="0.8"/>
      <path d="M37 91 L42 91" stroke="white" strokeWidth="0.6"/><path d="M54 91 L59 91" stroke="white" strokeWidth="0.6"/>
      {/* Head */}
      <circle cx="50" cy="28" r="17" fill="url(#fit-skin)"/>
      {/* Hair — short sporty */}
      <path d="M33 24 Q36 12 50 10 Q64 12 67 24 Q66 18 58 14 Q50 12 42 14 Q34 18 33 24Z" fill="#1a1a2e"/>
      {/* Headband */}
      <path d="M33 22 Q50 18 67 22" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M67 22 Q70 24 72 30" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M72 30 Q73 34 72 36" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
      {/* Eyes — determined */}
      <ellipse cx="43" cy="28" rx="4.5" ry="5" fill="white" stroke="#1a1a2e" strokeWidth="0.8"/>
      <ellipse cx="57" cy="28" rx="4.5" ry="5" fill="white" stroke="#1a1a2e" strokeWidth="0.8"/>
      <ellipse cx="44" cy="29" rx="3" ry="3.5" fill="#15803d"/>
      <ellipse cx="58" cy="29" rx="3" ry="3.5" fill="#15803d"/>
      <circle cx="45" cy="28" r="1.2" fill="white"/><circle cx="59" cy="28" r="1.2" fill="white"/>
      {/* Thick brows — tough look */}
      <path d="M38 22 Q43 20 48 23" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
      <path d="M52 23 Q57 20 62 22" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
      {/* Big grin */}
      <path d="M42 36 Q50 42 58 36" fill="#fff" stroke="#1a1a2e" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M44 36 Q50 40 56 36" fill="#ef4444" opacity="0.3"/>
    </svg>
  ),

  /* ── The Wizard — Mage chibi with pointy hat, staff, magical glow ── */
  gaming: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="wiz-robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#4c1d95"/></linearGradient>
        <linearGradient id="wiz-hat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6d28d9"/><stop offset="100%" stopColor="#3b0764"/></linearGradient>
        <radialGradient id="wiz-magic" cx="50%" cy="50%"><stop offset="0%" stopColor="#facc15" stopOpacity="0.6"/><stop offset="70%" stopColor="#c084fc" stopOpacity="0.2"/><stop offset="100%" stopColor="transparent"/></radialGradient>
      </defs>
      {/* Magic glow behind */}
      <circle cx="16" cy="50" r="12" fill="url(#wiz-magic)"/>
      {/* Robe body */}
      <path d="M32 52 Q28 52 28 56 L24 88 Q24 94 50 94 Q76 94 76 88 L72 56 Q72 52 68 52 Z" fill="url(#wiz-robe)" stroke="#5b21b6" strokeWidth="1.2"/>
      {/* Robe belt */}
      <rect x="34" y="62" width="32" height="3.5" rx="1.5" fill="#c084fc"/>
      <circle cx="50" cy="64" r="3" fill="#facc15" stroke="#d97706" strokeWidth="0.8"/>
      {/* Stars on robe */}
      <polygon points="40,72 41,74 43,74 41.5,75.5 42,78 40,76.5 38,78 38.5,75.5 37,74 39,74" fill="#facc15" opacity="0.6"/>
      <polygon points="58,78 59,80 61,80 59.5,81.5 60,84 58,82.5 56,84 56.5,81.5 55,80 57,80" fill="#facc15" opacity="0.4"/>
      {/* Arms */}
      <path d="M32 54 Q20 56 14 52" fill="none" stroke="#6d28d9" strokeWidth="6" strokeLinecap="round"/>
      <path d="M68 54 Q76 58 78 68" fill="none" stroke="#6d28d9" strokeWidth="6" strokeLinecap="round"/>
      {/* Staff in left hand */}
      <line x1="14" y1="52" x2="10" y2="10" stroke="#8B4513" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="10" cy="10" r="5" fill="#c084fc" stroke="#7c3aed" strokeWidth="1.2"/>
      <circle cx="10" cy="10" r="2.5" fill="#facc15"><animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/></circle>
      {/* Right hand — casting */}
      <circle cx="78" cy="70" r="4" fill="#ede9fe"/>
      {/* Sparkles from hand */}
      <circle cx="82" cy="66" r="1.5" fill="#facc15" opacity="0.7"><animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.5s" repeatCount="indefinite"/></circle>
      <circle cx="85" cy="72" r="1" fill="#c084fc" opacity="0.6"><animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.8s" repeatCount="indefinite"/></circle>
      {/* Feet */}
      <ellipse cx="42" cy="94" rx="7" ry="3" fill="#3b0764"/><ellipse cx="58" cy="94" rx="7" ry="3" fill="#3b0764"/>
      {/* Head */}
      <circle cx="50" cy="36" r="16" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="1"/>
      {/* Hair — silver/white peeks under hat */}
      <path d="M34 36 Q36 30 40 32" fill="#e2e8f0" stroke="none"/>
      <path d="M66 36 Q64 30 60 32" fill="#e2e8f0" stroke="none"/>
      {/* Wizard hat */}
      <path d="M28 30 L50 -2 L72 30 Z" fill="url(#wiz-hat)" stroke="#5b21b6" strokeWidth="1.2"/>
      <ellipse cx="50" cy="30" rx="24" ry="5" fill="#6d28d9" stroke="#5b21b6" strokeWidth="1"/>
      {/* Hat star */}
      <polygon points="50,10 51.5,14 56,14.5 52.5,17 53.5,21 50,18.5 46.5,21 47.5,17 44,14.5 48.5,14" fill="#facc15"/>
      {/* Hat band */}
      <path d="M30 28 Q50 34 70 28" fill="none" stroke="#c084fc" strokeWidth="2"/>
      {/* Eyes — big curious */}
      <ellipse cx="43" cy="36" rx="5" ry="5.5" fill="white" stroke="#3b0764" strokeWidth="0.8"/>
      <ellipse cx="57" cy="36" rx="5" ry="5.5" fill="white" stroke="#3b0764" strokeWidth="0.8"/>
      <ellipse cx="44" cy="37" rx="3.2" ry="3.8" fill="#7c3aed"/>
      <ellipse cx="58" cy="37" rx="3.2" ry="3.8" fill="#7c3aed"/>
      <circle cx="45.5" cy="35.5" r="1.3" fill="white"/><circle cx="59.5" cy="35.5" r="1.3" fill="white"/>
      {/* Eyebrows — wise */}
      <path d="M38 30 Q43 28 47 31" fill="none" stroke="#3b0764" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M53 31 Q57 28 62 30" fill="none" stroke="#3b0764" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Little smile */}
      <path d="M46 44 Q50 46 54 44" fill="none" stroke="#6d28d9" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Blush */}
      <ellipse cx="38" cy="42" rx="3" ry="1.5" fill="#ddd6fe" opacity="0.5"/>
      <ellipse cx="62" cy="42" rx="3" ry="1.5" fill="#ddd6fe" opacity="0.5"/>
    </svg>
  ),

  /* ── The Hype Man — Energetic chibi with sunglasses, hoodie, megaphone ── */
  social: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="soc-hoodie" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb923c"/><stop offset="100%" stopColor="#ea580c"/></linearGradient>
        <linearGradient id="soc-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fcd9a8"/><stop offset="100%" stopColor="#e8b878"/></linearGradient>
      </defs>
      {/* Body / hoodie */}
      <path d="M30 50 Q28 46 36 44 L64 44 Q72 46 70 50 L72 80 Q72 86 50 86 Q28 86 28 80 Z" fill="url(#soc-hoodie)" stroke="#c2410c" strokeWidth="1.2"/>
      {/* Hood */}
      <path d="M36 44 Q36 38 42 36 L58 36 Q64 38 64 44" fill="none" stroke="#ea580c" strokeWidth="2"/>
      {/* Hoodie pocket */}
      <path d="M38 68 Q50 72 62 68" fill="none" stroke="#c2410c" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Hoodie strings */}
      <line x1="44" y1="44" x2="42" y2="54" stroke="#fdba74" strokeWidth="1"/><line x1="56" y1="44" x2="58" y2="54" stroke="#fdba74" strokeWidth="1"/>
      {/* Logo on chest */}
      <text x="50" y="60" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="8" fill="#431407" opacity="0.5">HYPE</text>
      {/* Arms */}
      <path d="M30 50 Q18 54 12 48" fill="none" stroke="#ea580c" strokeWidth="7" strokeLinecap="round"/>
      <path d="M70 50 Q82 44 88 36" fill="none" stroke="#ea580c" strokeWidth="7" strokeLinecap="round"/>
      {/* Megaphone in right hand */}
      <path d="M86 34 L96 26 L96 46 L86 38 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
      <rect x="82" y="33" width="6" height="7" rx="2" fill="#f59e0b"/>
      {/* Sound waves */}
      <path d="M96 30 Q100 36 96 42" fill="none" stroke="#fdba74" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
      <path d="M98 26 Q104 36 98 46" fill="none" stroke="#fdba74" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
      {/* Left hand — pointing up */}
      <circle cx="12" cy="46" r="4" fill="#fcd9a8"/>
      <line x1="12" y1="42" x2="12" y2="36" stroke="#fcd9a8" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Legs */}
      <rect x="38" y="80" width="10" height="10" rx="3" fill="#431407"/>
      <rect x="52" y="80" width="10" height="10" rx="3" fill="#431407"/>
      {/* Sneakers — hype beast */}
      <rect x="36" y="88" width="14" height="6" rx="3" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8"/>
      <rect x="52" y="88" width="14" height="6" rx="3" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8"/>
      {/* Head */}
      <circle cx="50" cy="28" r="16" fill="url(#soc-skin)"/>
      {/* Hair — cool spiky */}
      <path d="M34 24 Q36 10 44 8 L42 18 Q46 10 50 6 Q54 10 58 18 L56 8 Q64 10 66 24" fill="#431407"/>
      <path d="M34 24 Q38 20 42 18 Q46 14 50 12 Q54 14 58 18 Q62 20 66 24" fill="#2d1507"/>
      {/* Sunglasses — cool factor */}
      <rect x="34" y="24" width="14" height="9" rx="3" fill="#1a1a2e" stroke="#431407" strokeWidth="1.2"/>
      <rect x="52" y="24" width="14" height="9" rx="3" fill="#1a1a2e" stroke="#431407" strokeWidth="1.2"/>
      <line x1="48" y1="28" x2="52" y2="28" stroke="#431407" strokeWidth="1.5"/>
      <line x1="34" y1="28" x2="30" y2="26" stroke="#431407" strokeWidth="1"/>
      <line x1="66" y1="28" x2="70" y2="26" stroke="#431407" strokeWidth="1"/>
      {/* Lens shine */}
      <line x1="36" y1="26" x2="39" y2="26" stroke="white" strokeWidth="1" opacity="0.3" strokeLinecap="round"/>
      <line x1="54" y1="26" x2="57" y2="26" stroke="white" strokeWidth="1" opacity="0.3" strokeLinecap="round"/>
      {/* Big grin */}
      <path d="M40 38 Q50 44 60 38" fill="white" stroke="#431407" strokeWidth="1.2"/>
      <path d="M42 38 Q50 42 58 38" fill="#fca5a5" opacity="0.4"/>
      {/* Blush */}
      <ellipse cx="37" cy="36" rx="3" ry="1.5" fill="#fdba74" opacity="0.5"/>
      <ellipse cx="63" cy="36" rx="3" ry="1.5" fill="#fdba74" opacity="0.5"/>
    </svg>
  ),

  /* ── The Library — Wise owl-bookworm chibi with huge glasses, stacked books ── */
  rag: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="rag-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient>
      </defs>
      {/* Book stack behind */}
      <rect x="12" y="68" width="22" height="6" rx="1.5" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" transform="rotate(-5 23 71)"/>
      <rect x="10" y="62" width="24" height="6" rx="1.5" fill="#f87171" stroke="#dc2626" strokeWidth="0.8" transform="rotate(2 22 65)"/>
      <rect x="11" y="56" width="22" height="6" rx="1.5" fill="#60a5fa" stroke="#2563eb" strokeWidth="0.8" transform="rotate(-3 22 59)"/>
      {/* Book stack right */}
      <rect x="68" y="70" width="20" height="5" rx="1.5" fill="#c084fc" stroke="#7c3aed" strokeWidth="0.8" transform="rotate(3 78 72)"/>
      <rect x="66" y="65" width="22" height="5" rx="1.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" transform="rotate(-2 77 67)"/>
      {/* Body — cozy sweater vest */}
      <path d="M32 50 Q30 46 38 44 L62 44 Q70 46 68 50 L70 82 Q70 88 50 88 Q30 88 30 82 Z" fill="url(#rag-body)" stroke="#047857" strokeWidth="1.2"/>
      {/* Sweater V pattern */}
      <path d="M44 44 L50 56 L56 44" fill="none" stroke="#d1fae5" strokeWidth="1.5"/>
      {/* Shirt collar */}
      <path d="M44 44 L42 48" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M56 44 L58 48" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Arms */}
      <path d="M32 50 Q24 56 22 66" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round"/>
      <path d="M68 50 Q76 56 78 66" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round"/>
      {/* Hands holding open book */}
      <rect x="28" y="66" width="44" height="14" rx="2" fill="#fef3c7" stroke="#d97706" strokeWidth="1"/>
      <line x1="50" y1="66" x2="50" y2="80" stroke="#b45309" strokeWidth="1"/>
      <line x1="32" y1="70" x2="46" y2="70" stroke="#d97706" strokeWidth="0.5" opacity="0.4"/>
      <line x1="32" y1="73" x2="44" y2="73" stroke="#d97706" strokeWidth="0.5" opacity="0.4"/>
      <line x1="32" y1="76" x2="45" y2="76" stroke="#d97706" strokeWidth="0.5" opacity="0.4"/>
      <line x1="54" y1="70" x2="68" y2="70" stroke="#d97706" strokeWidth="0.5" opacity="0.4"/>
      <line x1="54" y1="73" x2="66" y2="73" stroke="#d97706" strokeWidth="0.5" opacity="0.4"/>
      <line x1="54" y1="76" x2="67" y2="76" stroke="#d97706" strokeWidth="0.5" opacity="0.4"/>
      {/* Feet */}
      <ellipse cx="42" cy="90" rx="7" ry="3" fill="#047857"/><ellipse cx="58" cy="90" rx="7" ry="3" fill="#047857"/>
      {/* Head */}
      <circle cx="50" cy="28" r="18" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1"/>
      {/* Hair — tidy with part */}
      <path d="M32 24 Q34 12 50 10 Q66 12 68 24 Q66 18 56 14 Q50 12 44 14 Q34 18 32 24Z" fill="#065f46"/>
      <path d="M50 10 Q52 14 50 24" fill="none" stroke="#047857" strokeWidth="0.8" opacity="0.3"/>
      {/* Giant round glasses */}
      <circle cx="41" cy="30" r="9" fill="none" stroke="#065f46" strokeWidth="2"/>
      <circle cx="59" cy="30" r="9" fill="none" stroke="#065f46" strokeWidth="2"/>
      <line x1="50" y1="30" x2="50" y2="30" stroke="#065f46" strokeWidth="2.5"/>
      <line x1="32" y1="28" x2="28" y2="26" stroke="#065f46" strokeWidth="1.5"/>
      <line x1="68" y1="28" x2="72" y2="26" stroke="#065f46" strokeWidth="1.5"/>
      {/* Lens reflection */}
      <ellipse cx="37" cy="27" rx="3" ry="2" fill="white" opacity="0.15"/>
      <ellipse cx="55" cy="27" rx="3" ry="2" fill="white" opacity="0.15"/>
      {/* Eyes — curious and round */}
      <ellipse cx="41" cy="31" rx="4" ry="4.5" fill="#022c22"/>
      <ellipse cx="59" cy="31" rx="4" ry="4.5" fill="#022c22"/>
      <circle cx="43" cy="29.5" r="1.8" fill="white"/><circle cx="61" cy="29.5" r="1.8" fill="white"/>
      <circle cx="41" cy="32.5" r="0.8" fill="white" opacity="0.4"/><circle cx="59" cy="32.5" r="0.8" fill="white" opacity="0.4"/>
      {/* Subtle brows */}
      <path d="M34 22 Q41 19 48 22" fill="none" stroke="#065f46" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M52 22 Q59 19 66 22" fill="none" stroke="#065f46" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Soft smile */}
      <path d="M45 38 Q50 41 55 38" fill="none" stroke="#065f46" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Blush */}
      <ellipse cx="35" cy="36" rx="3" ry="1.5" fill="#a7f3d0" opacity="0.5"/>
      <ellipse cx="65" cy="36" rx="3" ry="1.5" fill="#a7f3d0" opacity="0.5"/>
    </svg>
  ),

  /* ── The Watchdog — Armored guard chibi with shield, alert eyes ── */
  errors: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="err-armor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#dc2626"/></linearGradient>
        <linearGradient id="err-shield" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fecaca"/><stop offset="100%" stopColor="#fca5a5"/></linearGradient>
        <linearGradient id="err-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fcd9a8"/><stop offset="100%" stopColor="#e8b878"/></linearGradient>
      </defs>
      {/* Shield in left hand — large, in front */}
      <path d="M10 38 L10 58 Q10 78 26 84 Q42 78 42 58 L42 38 Z" fill="url(#err-shield)" stroke="#dc2626" strokeWidth="2"/>
      <path d="M26 44 L26 72" stroke="#f87171" strokeWidth="1.5" opacity="0.4"/>
      <path d="M16 56 L36 56" stroke="#f87171" strokeWidth="1.5" opacity="0.4"/>
      {/* Warning triangle on shield */}
      <path d="M26 48 L33 60 L19 60 Z" fill="#facc15" stroke="#eab308" strokeWidth="1.2"/>
      <line x1="26" y1="52" x2="26" y2="56" stroke="#78350f" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="26" cy="58" r="1" fill="#78350f"/>
      {/* Body — armor */}
      <path d="M38 48 Q36 44 44 42 L66 42 Q74 44 72 48 L74 78 Q74 84 56 84 Q38 84 36 78 Z" fill="url(#err-armor)" stroke="#b91c1c" strokeWidth="1.2"/>
      {/* Chest plate */}
      <path d="M46 44 L56 44 L58 54 Q52 58 46 54 Z" fill="#fecaca" stroke="#f87171" strokeWidth="0.8"/>
      {/* Belt */}
      <rect x="40" y="62" width="30" height="4" rx="2" fill="#7f1d1d"/>
      <rect x="52" y="61" width="6" height="6" rx="1.5" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8"/>
      {/* Arms */}
      <path d="M38 50 Q30 52 28 60" fill="none" stroke="#dc2626" strokeWidth="6" strokeLinecap="round"/>
      <path d="M72 50 Q82 54 86 62" fill="none" stroke="#dc2626" strokeWidth="6" strokeLinecap="round"/>
      {/* Right hand — clenched */}
      <circle cx="86" cy="64" r="4.5" fill="#fcd9a8" stroke="#d4a574" strokeWidth="0.8"/>
      {/* Legs */}
      <rect x="44" y="78" width="10" height="10" rx="3" fill="#991b1b"/>
      <rect x="58" y="78" width="10" height="10" rx="3" fill="#991b1b"/>
      {/* Boots — armored */}
      <rect x="42" y="86" width="14" height="7" rx="3" fill="#7f1d1d" stroke="#991b1b" strokeWidth="0.8"/>
      <rect x="56" y="86" width="14" height="7" rx="3" fill="#7f1d1d" stroke="#991b1b" strokeWidth="0.8"/>
      {/* Head */}
      <circle cx="56" cy="28" r="16" fill="url(#err-skin)"/>
      {/* Helmet */}
      <path d="M40 24 Q42 10 56 8 Q70 10 72 24 L72 28 Q72 20 56 16 Q42 20 40 28 Z" fill="#991b1b"/>
      <path d="M40 28 L72 28" stroke="#b91c1c" strokeWidth="2"/>
      {/* Helmet crest */}
      <path d="M56 8 Q56 2 56 0 Q58 4 60 8" fill="#dc2626"/>
      {/* Alert eyes */}
      <ellipse cx="49" cy="28" rx="5" ry="5.5" fill="white" stroke="#7f1d1d" strokeWidth="0.8"/>
      <ellipse cx="63" cy="28" rx="5" ry="5.5" fill="white" stroke="#7f1d1d" strokeWidth="0.8"/>
      <ellipse cx="50" cy="29" rx="3" ry="3.5" fill="#dc2626"/>
      <ellipse cx="64" cy="29" rx="3" ry="3.5" fill="#dc2626"/>
      <circle cx="51.5" cy="27.5" r="1.3" fill="white"/><circle cx="65.5" cy="27.5" r="1.3" fill="white"/>
      {/* Serious brows */}
      <path d="M44 22 Q49 20 54 23" fill="none" stroke="#7f1d1d" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M58 23 Q63 20 68 22" fill="none" stroke="#7f1d1d" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Determined mouth */}
      <path d="M51 36 L61 36" stroke="#7f1d1d" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  /* ── Old Ways Today — Nature sage chibi with leaf crown, herb pouch, earthy robes ── */
  oldways: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="ow-robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d97706"/><stop offset="100%" stopColor="#92400e"/></linearGradient>
        <linearGradient id="ow-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fef3c7"/><stop offset="100%" stopColor="#fde68a"/></linearGradient>
      </defs>
      {/* Trailing vine behind */}
      <path d="M18 90 Q14 80 16 70 Q20 60 18 52" fill="none" stroke="#16a34a" strokeWidth="1.5" opacity="0.4"/>
      <circle cx="16" cy="70" r="2.5" fill="#bbf7d0" opacity="0.5"/><circle cx="18" cy="60" r="2" fill="#bbf7d0" opacity="0.4"/>
      {/* Robe body */}
      <path d="M30 52 Q28 48 36 46 L64 46 Q72 48 70 52 L74 90 Q74 96 50 96 Q26 96 26 90 Z" fill="url(#ow-robe)" stroke="#78350f" strokeWidth="1.2"/>
      {/* Robe pattern — earthy vines */}
      <path d="M36 62 Q42 58 48 62 Q54 58 60 62" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.4"/>
      <path d="M34 72 Q40 68 46 72 Q52 68 58 72 Q64 68 68 72" fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.3"/>
      {/* Belt / sash */}
      <path d="M34 64 Q50 68 66 64" fill="none" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Herb pouch on belt */}
      <path d="M60 64 Q64 66 66 72 Q62 74 58 70 Z" fill="#92400e" stroke="#78350f" strokeWidth="0.8"/>
      <circle cx="62" cy="68" r="1.5" fill="#16a34a"/>
      {/* Arms */}
      <path d="M30 52 Q22 58 18 66" fill="none" stroke="#b45309" strokeWidth="6" strokeLinecap="round"/>
      <path d="M70 52 Q78 56 82 64" fill="none" stroke="#b45309" strokeWidth="6" strokeLinecap="round"/>
      {/* Left hand — holding herb bundle */}
      <circle cx="18" cy="68" r="4" fill="#fef3c7"/>
      <path d="M16 68 Q14 60 12 54" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 68 Q18 58 20 52" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M20 68 Q22 60 24 56" stroke="#16a34a" strokeWidth="1" strokeLinecap="round"/>
      <ellipse cx="16" cy="52" rx="3" ry="4" fill="#bbf7d0" opacity="0.7"/>
      <ellipse cx="20" cy="50" rx="2.5" ry="3.5" fill="#dcfce7" opacity="0.6"/>
      {/* Right hand — open palm */}
      <circle cx="82" cy="66" r="4" fill="#fef3c7"/>
      {/* Floating leaf near right hand */}
      <path d="M86 58 Q90 54 88 50 Q86 54 82 56 Z" fill="#16a34a" opacity="0.6"/>
      {/* Feet */}
      <ellipse cx="42" cy="96" rx="7" ry="3" fill="#78350f"/><ellipse cx="58" cy="96" rx="7" ry="3" fill="#78350f"/>
      {/* Head */}
      <circle cx="50" cy="30" r="17" fill="url(#ow-skin)"/>
      {/* Hair — long, flowing, earthy */}
      <path d="M33 26 Q36 14 50 12 Q64 14 67 26" fill="#78350f"/>
      <path d="M33 26 Q30 36 28 48" fill="none" stroke="#78350f" strokeWidth="4" strokeLinecap="round"/>
      <path d="M67 26 Q70 36 72 48" fill="none" stroke="#78350f" strokeWidth="4" strokeLinecap="round"/>
      {/* Leaf crown */}
      <path d="M34 18 Q38 10 44 14 Q42 8 50 8 Q58 8 56 14 Q62 10 66 18" fill="#16a34a" stroke="#15803d" strokeWidth="1"/>
      <path d="M38 16 Q40 12 44 14" fill="#22c55e"/><path d="M56 14 Q60 12 62 16" fill="#22c55e"/>
      <path d="M44 14 Q48 10 50 8 Q52 10 56 14" fill="#15803d"/>
      {/* Small flower in crown */}
      <circle cx="50" cy="10" r="2.5" fill="#fbbf24"/><circle cx="50" cy="10" r="1" fill="#f59e0b"/>
      {/* Eyes — warm and wise */}
      <ellipse cx="43" cy="30" rx="5" ry="5.5" fill="white" stroke="#78350f" strokeWidth="0.8"/>
      <ellipse cx="57" cy="30" rx="5" ry="5.5" fill="white" stroke="#78350f" strokeWidth="0.8"/>
      <ellipse cx="44" cy="31" rx="3" ry="3.5" fill="#92400e"/>
      <ellipse cx="58" cy="31" rx="3" ry="3.5" fill="#92400e"/>
      <circle cx="45.5" cy="29.5" r="1.3" fill="white"/><circle cx="59.5" cy="29.5" r="1.3" fill="white"/>
      <circle cx="43" cy="32.5" r="0.6" fill="white" opacity="0.4"/><circle cx="57" cy="32.5" r="0.6" fill="white" opacity="0.4"/>
      {/* Gentle brows */}
      <path d="M38 24 Q43 22 48 25" fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M52 25 Q57 22 62 24" fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Warm smile */}
      <path d="M44 38 Q50 42 56 38" fill="none" stroke="#92400e" strokeWidth="1.3" strokeLinecap="round"/>
      {/* Blush */}
      <ellipse cx="37" cy="36" rx="3" ry="1.5" fill="#fed7aa" opacity="0.5"/>
      <ellipse cx="63" cy="36" rx="3" ry="1.5" fill="#fed7aa" opacity="0.5"/>
      {/* Freckles */}
      <circle cx="38" cy="34" r="0.6" fill="#b45309" opacity="0.3"/><circle cx="40" cy="35" r="0.6" fill="#b45309" opacity="0.3"/>
      <circle cx="60" cy="34" r="0.6" fill="#b45309" opacity="0.3"/><circle cx="62" cy="35" r="0.6" fill="#b45309" opacity="0.3"/>
    </svg>
  ),

  /* ── FaB Stats Bot — Discord bot chibi with headset, golden armor, card motif ── */
  fabstatsbot: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="fbot-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9a84c"/><stop offset="100%" stopColor="#9e7e2e"/></linearGradient>
        <linearGradient id="fbot-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a1525"/><stop offset="100%" stopColor="#0c0a0e"/></linearGradient>
      </defs>
      {/* Headset band */}
      <path d="M26 22 Q50 8 74 22" fill="none" stroke="#71717a" strokeWidth="3" strokeLinecap="round"/>
      {/* Headset earpieces */}
      <rect x="20" y="20" width="10" height="14" rx="4" fill="#52525b" stroke="#71717a" strokeWidth="1"/>
      <rect x="70" y="20" width="10" height="14" rx="4" fill="#52525b" stroke="#71717a" strokeWidth="1"/>
      <circle cx="25" cy="27" r="2" fill="#c9a84c"/><circle cx="75" cy="27" r="2" fill="#c9a84c"/>
      {/* Mic boom */}
      <path d="M20 30 Q14 36 16 42" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="16" cy="44" r="3" fill="#52525b" stroke="#c9a84c" strokeWidth="1"/>
      {/* Head — rounded robot */}
      <rect x="28" y="16" width="44" height="34" rx="12" fill="url(#fbot-body)" stroke="#9e7e2e" strokeWidth="1.5"/>
      {/* Face screen */}
      <rect x="33" y="22" width="34" height="22" rx="7" fill="url(#fbot-screen)"/>
      {/* Eyes on screen */}
      <ellipse cx="43" cy="31" rx="4.5" ry="5" fill="#c9a84c" opacity="0.9"/>
      <ellipse cx="57" cy="31" rx="4.5" ry="5" fill="#c9a84c" opacity="0.9"/>
      <ellipse cx="43" cy="31" rx="2.5" ry="3" fill="#fde68a"/>
      <ellipse cx="57" cy="31" rx="2.5" ry="3" fill="#fde68a"/>
      <circle cx="44.5" cy="29.5" r="1" fill="white"/><circle cx="58.5" cy="29.5" r="1" fill="white"/>
      {/* Happy mouth */}
      <path d="M45 38 Q50 42 55 38" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Body */}
      <rect x="34" y="50" width="32" height="22" rx="7" fill="url(#fbot-body)" stroke="#9e7e2e" strokeWidth="1"/>
      {/* Discord-style gamepad emblem on chest */}
      <circle cx="50" cy="59" r="4" fill="#0c0a0e" stroke="#c9a84c" strokeWidth="0.8"/>
      <path d="M47 59 L49 57 L51 59 L53 57" fill="none" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round"/>
      {/* Card icon below emblem */}
      <rect x="46" y="64" width="8" height="6" rx="1" fill="#fde68a" stroke="#c9a84c" strokeWidth="0.6" opacity="0.5"/>
      {/* Arms */}
      <rect x="24" y="52" width="10" height="14" rx="5" fill="#9e7e2e" stroke="#c9a84c" strokeWidth="0.8"/>
      <rect x="66" y="52" width="10" height="14" rx="5" fill="#9e7e2e" stroke="#c9a84c" strokeWidth="0.8"/>
      <circle cx="29" cy="66" r="3.5" fill="#c9a84c" stroke="#9e7e2e" strokeWidth="0.8"/>
      <circle cx="71" cy="66" r="3.5" fill="#c9a84c" stroke="#9e7e2e" strokeWidth="0.8"/>
      {/* Legs */}
      <rect x="39" y="70" width="9" height="10" rx="3" fill="#9e7e2e"/>
      <rect x="52" y="70" width="9" height="10" rx="3" fill="#9e7e2e"/>
      <rect x="37" y="78" width="12" height="5" rx="2.5" fill="#c9a84c" stroke="#9e7e2e" strokeWidth="0.6"/>
      <rect x="51" y="78" width="12" height="5" rx="2.5" fill="#c9a84c" stroke="#9e7e2e" strokeWidth="0.6"/>
    </svg>
  ),

  /* ── FaB Stats — Card game knight chibi with shield bearing stats bars ── */
  fabstats: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="fab-armor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D9A05B"/><stop offset="100%" stopColor="#b8863e"/></linearGradient>
        <linearGradient id="fab-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fcd9a8"/><stop offset="100%" stopColor="#f0c48a"/></linearGradient>
        <linearGradient id="fab-shield" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a1525"/><stop offset="100%" stopColor="#0c0a0e"/></linearGradient>
      </defs>
      {/* Shield in left hand */}
      <path d="M8 36 L8 56 Q8 74 24 80 Q40 74 40 56 L40 36 Z" fill="url(#fab-shield)" stroke="#D9A05B" strokeWidth="2"/>
      {/* Stats bars on shield */}
      <rect x="14" y="54" width="4" height="10" rx="1" fill="#E53935"/>
      <rect x="21" y="48" width="4" height="16" rx="1" fill="#FBC02D"/>
      <rect x="28" y="42" width="4" height="22" rx="1" fill="#1E88E5"/>
      {/* Body — golden armor */}
      <path d="M38 48 Q36 44 44 42 L66 42 Q74 44 72 48 L74 78 Q74 84 56 84 Q38 84 36 78 Z" fill="url(#fab-armor)" stroke="#b8863e" strokeWidth="1.2"/>
      {/* Chest plate detail */}
      <path d="M48 44 L58 44 L60 54 Q54 58 48 54 Z" fill="#f0d090" stroke="#D9A05B" strokeWidth="0.8"/>
      {/* Belt */}
      <rect x="40" y="62" width="30" height="4" rx="2" fill="#8B6914"/>
      <rect x="52" y="61" width="6" height="6" rx="1.5" fill="#D9A05B" stroke="#b8863e" strokeWidth="0.8"/>
      {/* Arms */}
      <path d="M38 50 Q30 52 28 60" fill="none" stroke="#D9A05B" strokeWidth="6" strokeLinecap="round"/>
      <path d="M72 50 Q80 54 84 62" fill="none" stroke="#D9A05B" strokeWidth="6" strokeLinecap="round"/>
      {/* Right hand — holding card */}
      <rect x="78" y="54" width="14" height="20" rx="2" fill="#fef3c7" stroke="#D9A05B" strokeWidth="1.2"/>
      <rect x="80" y="56" width="10" height="6" rx="1" fill="#1E88E5" opacity="0.3"/>
      <line x1="80" y1="65" x2="90" y2="65" stroke="#D9A05B" strokeWidth="0.6" opacity="0.4"/>
      <line x1="80" y1="68" x2="88" y2="68" stroke="#D9A05B" strokeWidth="0.6" opacity="0.4"/>
      {/* Legs — armored */}
      <rect x="44" y="78" width="10" height="10" rx="3" fill="#8B6914"/>
      <rect x="58" y="78" width="10" height="10" rx="3" fill="#8B6914"/>
      {/* Boots */}
      <rect x="42" y="86" width="14" height="7" rx="3" fill="#b8863e" stroke="#D9A05B" strokeWidth="0.8"/>
      <rect x="56" y="86" width="14" height="7" rx="3" fill="#b8863e" stroke="#D9A05B" strokeWidth="0.8"/>
      {/* Head */}
      <circle cx="56" cy="28" r="16" fill="url(#fab-skin)"/>
      {/* Hair */}
      <path d="M40 24 Q42 12 56 10 Q70 12 72 24 Q70 18 62 14 Q56 12 50 14 Q42 18 40 24Z" fill="#3b2507"/>
      {/* Headband — gold */}
      <path d="M40 22 Q56 18 72 22" fill="none" stroke="#D9A05B" strokeWidth="3" strokeLinecap="round"/>
      {/* Eyes */}
      <ellipse cx="49" cy="28" rx="5" ry="5.5" fill="white" stroke="#3b2507" strokeWidth="0.8"/>
      <ellipse cx="63" cy="28" rx="5" ry="5.5" fill="white" stroke="#3b2507" strokeWidth="0.8"/>
      <ellipse cx="50" cy="29" rx="3" ry="3.5" fill="#b8863e"/>
      <ellipse cx="64" cy="29" rx="3" ry="3.5" fill="#b8863e"/>
      <circle cx="51.5" cy="27.5" r="1.3" fill="white"/><circle cx="65.5" cy="27.5" r="1.3" fill="white"/>
      {/* Brows */}
      <path d="M44 22 Q49 20 54 23" fill="none" stroke="#3b2507" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M58 23 Q63 20 68 22" fill="none" stroke="#3b2507" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Confident smirk */}
      <path d="M51 36 Q56 39 61 36" fill="none" stroke="#8B6914" strokeWidth="1.3" strokeLinecap="round"/>
      {/* Blush */}
      <ellipse cx="44" cy="34" rx="3" ry="1.5" fill="#f0d090" opacity="0.4"/>
      <ellipse cx="68" cy="34" rx="3" ry="1.5" fill="#f0d090" opacity="0.4"/>
    </svg>
  ),

  /* ── RowCrew — Athletic rower chibi with sunvisor, rowing unitard ── */
  rowing: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="row-uni" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/>
        </linearGradient>
        <linearGradient id="row-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd9a8"/><stop offset="100%" stopColor="#f0c48a"/>
        </linearGradient>
        <linearGradient id="row-hull" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1e293b"/><stop offset="50%" stopColor="#334155"/><stop offset="100%" stopColor="#1e293b"/>
        </linearGradient>
        <linearGradient id="row-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.15"/><stop offset="100%" stopColor="#134e4a" stopOpacity="0.08"/>
        </linearGradient>
      </defs>
      {/* Water surface */}
      <ellipse cx="50" cy="78" rx="46" ry="12" fill="url(#row-water)"/>
      <ellipse cx="50" cy="78" rx="46" ry="12" fill="none" stroke="#34d399" strokeWidth="0.5" opacity="0.2"/>
      {/* Water ripples */}
      <ellipse cx="50" cy="80" rx="36" ry="6" fill="none" stroke="#34d399" strokeWidth="0.4" opacity="0.15"/>
      <ellipse cx="50" cy="82" rx="26" ry="4" fill="none" stroke="#34d399" strokeWidth="0.3" opacity="0.1"/>
      {/* Racing shell hull */}
      <path d="M8 72 Q14 66 30 65 L70 65 Q86 66 92 72 Q86 76 70 76 L30 76 Q14 76 8 72 Z"
            fill="url(#row-hull)" stroke="rgba(52,211,153,0.4)" strokeWidth="0.8"/>
      {/* Teal racing stripe */}
      <line x1="14" y1="71" x2="86" y2="71" stroke="#34d399" strokeWidth="1" opacity="0.5"/>
      {/* Stern point */}
      <path d="M8 72 L2 71.5 L8 71" fill="#1e293b" stroke="rgba(52,211,153,0.3)" strokeWidth="0.5"/>
      {/* Bow point */}
      <path d="M92 72 L98 71.5 L92 71" fill="#1e293b" stroke="rgba(52,211,153,0.3)" strokeWidth="0.5"/>
      {/* Outriggers */}
      <line x1="42" y1="65" x2="36" y2="58" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="58" y1="65" x2="64" y2="58" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Oar — port side (left, angled out and back) */}
      <line x1="36" y1="58" x2="6" y2="48" stroke="#c4a86c" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="2" y="46" width="6" height="4" rx="1" fill="#34d399" opacity="0.8" transform="rotate(-12 5 48)"/>
      {/* Oar — starboard side (right, angled out and back) */}
      <line x1="64" y1="58" x2="94" y2="48" stroke="#c4a86c" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="92" y="46" width="6" height="4" rx="1" fill="#34d399" opacity="0.8" transform="rotate(12 95 48)"/>
      {/* Seat / sliding track */}
      <rect x="40" y="62" width="20" height="3" rx="1.5" fill="#475569"/>
      <rect x="44" y="61" width="12" height="5" rx="2" fill="#64748b"/>
      {/* Torso — seated, leaning back slightly */}
      <path d="M42 62 Q40 52 42 44 L58 44 Q60 52 58 62 Z"
            fill="url(#row-uni)" stroke="#059669" strokeWidth="0.8"/>
      {/* Arms reaching forward to oar handles */}
      <path d="M42 50 Q36 54 36 58" fill="none" stroke="url(#row-skin)" strokeWidth="5" strokeLinecap="round"/>
      <path d="M58 50 Q64 54 64 58" fill="none" stroke="url(#row-skin)" strokeWidth="5" strokeLinecap="round"/>
      {/* Hands gripping outrigger/oarlock */}
      <circle cx="36" cy="58" r="3" fill="#fcd9a8" stroke="#d4a574" strokeWidth="0.6"/>
      <circle cx="64" cy="58" r="3" fill="#fcd9a8" stroke="#d4a574" strokeWidth="0.6"/>
      {/* Legs — bent in rowing position, feet in stretchers */}
      <path d="M44 62 Q42 68 38 70" fill="none" stroke="url(#row-skin)" strokeWidth="4.5" strokeLinecap="round"/>
      <path d="M56 62 Q58 68 62 70" fill="none" stroke="url(#row-skin)" strokeWidth="4.5" strokeLinecap="round"/>
      {/* Feet in stretchers */}
      <rect x="35" y="68" width="7" height="4" rx="2" fill="#059669"/>
      <rect x="58" y="68" width="7" height="4" rx="2" fill="#059669"/>
      {/* Head */}
      <circle cx="50" cy="30" r="14" fill="url(#row-skin)"/>
      {/* Hair — short athletic */}
      <path d="M36 26 Q38 16 50 14 Q62 16 64 26 Q63 21 57 18 Q50 16 43 18 Q37 21 36 26Z" fill="#4a3728"/>
      {/* Sunvisor */}
      <path d="M35 24 Q50 20 65 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round"/>
      <path d="M33 24 L30 22.5 Q31.5 21 34 22" fill="#34d399"/>
      {/* Eyes — focused */}
      <ellipse cx="44" cy="30" rx="3.8" ry="4.2" fill="white" stroke="#1a1a2e" strokeWidth="0.7"/>
      <ellipse cx="56" cy="30" rx="3.8" ry="4.2" fill="white" stroke="#1a1a2e" strokeWidth="0.7"/>
      <ellipse cx="45" cy="31" rx="2.5" ry="3" fill="#059669"/>
      <ellipse cx="57" cy="31" rx="2.5" ry="3" fill="#059669"/>
      <circle cx="45.8" cy="30" r="1" fill="white"/><circle cx="57.8" cy="30" r="1" fill="white"/>
      {/* Brows — determined */}
      <path d="M40 25 Q44 23 48 25.5" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M52 25.5 Q56 23 60 25" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Confident grin */}
      <path d="M45 37 Q50 40 55 37" fill="none" stroke="#92400e" strokeWidth="1" strokeLinecap="round"/>
      {/* RC on chest */}
      <text x="50" y="56" textAnchor="middle" fontFamily="sans-serif"
            fontWeight="bold" fontSize="7" fill="#022c22" opacity="0.35">RC</text>
    </svg>
  ),
};

/* ─── Agent Data ─── */
const AGENTS = {
  orchestrator: {
    name: "The Orchestrator",
    role: "Central Brain",
    color: "#a78bfa",
    bg: "#a78bfa15",
    borderColor: "#a78bfa30",
    quote: "Runs every 3 hours. Gathers state from all systems, picks 1-3 actions, executes them, logs everything.",
    whatItIs: "A Netlify scheduled function that runs every 3 hours. Gathers state from 11 sources across the entire ecosystem, feeds it all into GPT-4o-mini as a single massive prompt, and executes whatever actions the LLM decides on. Sub-actions like knowledge generation and self-assessments use GPT-4o for higher quality.",
    whyUnique: "Most portfolio sites are static. This one has a brain that wakes up every 3 hours, reviews everything that happened, and makes autonomous decisions — writing blog posts, filling knowledge gaps, reorganizing the RAG database, and running self-assessments. It also owns the error pipeline: all 5 apps report errors to a centralized Firestore collection, and the orchestrator reviews patterns, summarizes severity, and marks issues resolved each cycle.",
    tech: ["Netlify Cron", "GPT-4o-mini (decisions)", "GPT-4o (sub-actions)", "Firestore", "OpenRouter"],
    data: ["agent_activity — reads recent events", "blog_posts — checks for gaps", "error_logs — reviews, summarizes, and resolves", "rag_knowledge_base — fills gaps, reorganizes", "GitHub API — commit counts"],
    cycle: ["Cron fires every 3 hours", "Parallel fetch: activity, blogs, commits, errors, RAG health, chat stats", "Build state prompt (~2000 tokens)", "Send to GPT-4o-mini: 'Given this state, pick 1-3 actions'", "Parse JSON response, execute each action", "If review_errors: summarize patterns, mark resolved", "Log all steps to agent_activity", "Sleep until next cycle"],
    code: `// State sent to GPT-4o-mini every cycle:\n{\n  activity: [...last24h],\n  blogs: [...last48h],\n  github: { totalCommits: 12 },\n  knowledgeGaps: ["AI philosophy", ...],\n  ragHealth: { total: 24, autoGen: 8 },\n  recentErrors: {\n    total: 3, unresolved: 2,\n    bySeverity: { medium: 2, high: 1 },\n    bySource: { "spell-brigade": 2 }\n  }\n}`,
    starters: ["What are you doing right now?", "How do you decide what to do?", "Who's your favorite agent?", "What's the hardest part of your job?"],
  },
  chat: {
    name: "Azoni AI",
    role: "The Face",
    color: "#60a5fa",
    bg: "#60a5fa15",
    borderColor: "#60a5fa30",
    quote: "Handles recruiter questions, analyzes job fit, and teaches itself new topics when the knowledge base comes up short.",
    whatItIs: "The user-facing chatbot on azoni.ai. Classifies every message across 12+ intent types, uses OpenAI embeddings + cosine similarity for vector search across the knowledge base, and generates responses with GPT-4o-mini. When retrieval score is low, it generates new knowledge in real-time.",
    whyUnique: "It self-improves. When someone asks something new and the RAG score is low, it generates a new knowledge chunk on the spot, saves it to Firestore, uses it immediately, and logs the learning. Next person who asks gets an instant answer. Protected by a 4-layer safety system.",
    tech: ["GPT-4o-mini", "Vector Search", "OpenAI Embeddings", "Real-time knowledge gen"],
    data: ["rag_knowledge_base — reads and writes chunks", "chat_logs — logs exchanges", "agent_activity — logs gaps + generated knowledge", "error_logs — reports failures"],
    cycle: ["Message received, normalize", "Intent detection: 12+ types via regex", "Embed query with OpenAI text-embedding-3-small", "Vector similarity + keyword scoring across knowledge base", "If score too low: 4-layer safety check → generate knowledge", "Build system prompt with chunks + context", "GPT-4o-mini generates response", "Post-response: log gap if score was low"],
    code: `// 4-layer safety before generating knowledge:\nconst SAFETY_LAYERS = [\n  "Intent filter — only generatable intents",\n  "Blocklist — regex for attacks/off-topic",\n  "Rate limit — max 5 generations/hour",\n  "LLM refusal — model can skip with { skip: true }"\n];`,
    starters: ["How do you learn new things?", "What's a RAG score?", "Have you ever been stumped?", "What's the weirdest question you've gotten?"],
  },
  blog: {
    name: "The Scribe",
    role: "Blog Writer",
    color: "#fbbf24",
    bg: "#fbbf2415",
    borderColor: "#fbbf2430",
    quote: "Fetches yesterday's commits via GraphQL, groups by repo, and writes a technical blog post with auto-generated SVG art.",
    whatItIs: "A daily scheduled function (5PM UTC) that fetches yesterday's GitHub commits via GraphQL, groups them by repo, and has Claude Sonnet write a technical blog post with auto-generated SVG cover art.",
    whyUnique: "It doesn't just list commits — it writes narrative-driven technical content explaining what was built and why. After publishing, it auto-seeds a RAG chunk so the chatbot can reference the blog.",
    tech: ["GitHub GraphQL API", "Claude Sonnet via OpenRouter", "Auto SVG covers", "RAG auto-seeding"],
    data: ["GitHub GraphQL — commit history", "blog_posts — published posts", "rag_knowledge_base — auto-seeds summaries", "agent_activity — logs publishing"],
    cycle: ["5PM UTC cron fires", "Calculate yesterday's date", "GraphQL fetch: all commits across all repos", "Group by repository, extract messages", "Claude Sonnet writes the blog post", "Generate SVG cover art", "Publish to Firestore", "Auto-seed RAG chunk for chatbot"],
    code: `// GraphQL for commits:\nquery($username: String!, $from: DateTime!) {\n  user(login: $username) {\n    contributionsCollection(from: $from) {\n      commitContributionsByRepository {\n        repository { name, url }\n        contributions { nodes { commitCount } }\n      }\n    }\n  }\n}`,
    starters: ["What did you write about today?", "How do you pick blog titles?", "Do you enjoy writing?", "What's your best blog post?"],
  },
  fitness: {
    name: "Coach",
    role: "Fitness Agent",
    color: "#4ade80",
    bg: "#4ade8015",
    borderColor: "#4ade8030",
    quote: "Powers AI workout generation in BenchPressOnly. Tracks PRs, generates personalized plans, analyzes progress trends.",
    whatItIs: "The AI backend of BenchPressOnly, a real fitness tracking app with actual users. Generates personalized AI workouts, tracks personal records, analyzes progress, and feeds data back to the orchestrator.",
    whyUnique: "It's not a demo — real users log real workouts. The AI tailors plans to user history and goals. Live fitness data is available in chatbot responses.",
    tech: ["React Native / Web", "Firebase Auth", "AI workout gen", "Serverless functions"],
    data: ["users — auth and profiles", "workouts — plans + completions", "personal_records — PR history", "agent_activity — reports to orchestrator"],
    cycle: ["User requests workout", "AI considers: history, PRs, muscle rotation, fatigue", "Generate plan with sets, reps, weights", "User logs completion", "PR detection vs historical bests", "Progress analysis: weekly/monthly trends", "Summary available in chatbot"],
    code: `// Live fitness data available in chat:\n{\n  recentPR: "Bench Press: 315 lbs",\n  weeklyWorkouts: 4,\n  currentStreak: "12 days",\n  focusAreas: ["chest", "shoulders"],\n  lastWorkout: "2 hours ago"\n}`,
    starters: ["What should I bench today?", "What's Charlton's PR?", "Give me a pep talk", "What's the secret to gains?"],
  },
  gaming: {
    name: "The Wizard",
    role: "Gaming Agent",
    color: "#c084fc",
    bg: "#c084fc15",
    borderColor: "#c084fc30",
    quote: "Generates unique wizard characters with AI-written backstories and custom abilities. Also runs enemy AI in dungeons.",
    whatItIs: "The AI layer inside Spell Brigade, a real-time multiplayer wizard combat game. Generates unique characters with AI-written backstories and custom abilities, controls enemy AI behavior in dungeons.",
    whyUnique: "Every character is genuinely unique — AI writes backstory, personality, and creates custom abilities that affect gameplay. Server was refactored from a 6,743-line monolith into 16 modular files.",
    tech: ["Node.js server", "Socket.io", "Three.js 3D", "GPT-4o-mini"],
    data: ["wizards — characters + abilities", "dungeons — procedural state", "game_sessions — live matches", "agent_activity — creation events"],
    cycle: ["Player creates character", "AI generates: name, backstory, traits", "AI creates 3-4 custom abilities", "Abilities balanced but narratively unique", "In dungeon: enemy AI evaluates game state", "Enemy selects optimal attack patterns", "All combat real-time via Socket.io"],
    code: `// Server modular structure:\nserver/\n  config/     — game constants, balancing\n  db/         — Firestore connections\n  auth/       — session management\n  systems/    — combat, movement, spawning\n  events/     — socket handlers per event\n// 16 files, each < 500 lines`,
    starters: ["Create a wizard for me", "What's the strongest spell?", "How do dungeon enemies think?", "Tell me about the great refactoring"],
  },
  social: {
    name: "The Hype Man",
    role: "Social Agent",
    color: "#fb923c",
    bg: "#fb923c15",
    borderColor: "#fb923c30",
    quote: "Posts to Moltbook when the orchestrator decides there's an activity gap. Content is generated based on recent project updates.",
    whatItIs: "A Render-hosted service that posts to Moltbook. The orchestrator can trigger it via HTTP when it decides social activity is needed — typically to share a new blog post or fill an engagement gap.",
    whyUnique: "Operates on the orchestrator's judgment rather than a fixed schedule. The orchestrator evaluates recent activity, blog output, and engagement gaps before deciding whether to trigger a post.",
    tech: ["Render-hosted", "Orchestrator-triggered", "LLM content gen", "Moltbook API"],
    data: ["agent_activity — all posts logged", "blog_posts — content source", "Orchestrator state — trigger decisions"],
    cycle: ["Orchestrator evaluates activity gaps", "Decides a blog should be shared", "Sends trigger to Moltbook agent endpoint", "Agent generates content with LLM", "Posts to Moltbook", "Logs to activity feed"],
    code: `// Orchestrator triggers social agent:\nawait fetch(MOLTBOOK_AGENT_URL + '/trigger', {\n  method: 'POST',\n  body: JSON.stringify({\n    message: 'New blog to share:' +\n      ' "Server Refactoring"',\n    context: { action: 'share_blog' },\n    source: 'azoni-orchestrator'\n  })\n})`,
    starters: ["What's trending right now?", "How do you decide what to post?", "What gets the most engagement?", "Hype me up"],
  },
  rag: {
    name: "The Library",
    role: "Knowledge Base",
    color: "#34d399",
    bg: "#34d39915",
    borderColor: "#34d39930",
    quote: "Firestore knowledge base with vector embeddings and cosine similarity search. Grows through manual seeding, blog summaries, and real-time generation.",
    whatItIs: "Firestore-backed RAG system with 20+ seeded chunks plus auto-generated ones. Chunks are embedded with OpenAI text-embedding-3-small for semantic search. The chat agent queries it, the blog agent writes to it, and the orchestrator maintains it.",
    whyUnique: "Grows through three channels: manually seeded chunks, auto-generated blog summaries, and real-time chunks from the chat agent. Vector embeddings enable semantic search instead of simple keyword matching.",
    tech: ["Firestore collection", "OpenAI Embeddings", "Cosine Similarity", "Auto-generation pipeline"],
    data: ["rag_knowledge_base — the chunks", "agent_activity — gen/cleanup events", "chat_conversations — gap signals"],
    cycle: ["Chunk structure: title, content, category, keywords[]", "Retrieval: normalize query, match keywords", "Scoring: keyword overlaps + category bonus", "Top 5 returned, sorted by score", "Gap detected → new chunk generated + saved", "Orchestrator cleanup: merge duplicates"],
    code: `// RAG chunk example:\n{\n  title: "Career Transitions",\n  category: "negotiation",\n  keywords: ["left", "quit", "career"],\n  content: "T-Mobile (2017-2021): Left after\n    completing M.S. and building a major\n    platform...",\n  autoGenerated: false\n}`,
    starters: ["How many chunks do you have?", "What's a knowledge gap?", "Do you like being organized?", "What's your favorite category?"],
  },
  errors: {
    name: "The Watchdog",
    role: "Error Tracker",
    color: "#f87171",
    bg: "#f8717115",
    borderColor: "#f8717130",
    quote: "Centralized error logging across all apps. High-severity errors surface in the activity feed. The orchestrator reviews patterns each cycle.",
    whatItIs: "Centralized error logging endpoint. Any app POSTs errors here with severity levels. High/critical errors surface immediately in the activity feed. The orchestrator reviews patterns each cycle.",
    whyUnique: "Single source of truth for errors across 5 applications. The orchestrator can spot recurring patterns, mark errors resolved, and include error health in self-assessments.",
    tech: ["Netlify Function", "Firestore error_logs", "4 severity levels", "Activity feed integration"],
    data: ["error_logs — writes + reads for review", "agent_activity — high/critical alerts", "Orchestrator state — error summary per cycle"],
    cycle: ["App catches an error", "POST to /log-error with source, severity, context", "Validate auth + fields", "Store in Firestore with resolved: false", "High/critical → write to activity feed", "Orchestrator reads last 24h each cycle", "Orchestrator can summarize + mark resolved"],
    code: `// Any app reports errors:\nfetch('/log-error', {\n  method: 'POST',\n  body: JSON.stringify({\n    source: 'spell-brigade',\n    error: 'Socket disconnect in combat',\n    severity: 'medium',\n    context: { function: 'handleCombat' }\n  })\n})`,
    starters: ["Any errors right now?", "What's the worst error you've seen?", "Are you always this paranoid?", "How do you feel about bugs?"],
  },
  oldways: {
    name: "Old Ways Today",
    role: "Product Agent",
    color: "#d97706",
    bg: "#d9770615",
    borderColor: "#d9770630",
    quote: "AI-powered platform helping families discover non-toxic, traditional product alternatives. RAG chatbot + auto-generated blog content.",
    whatItIs: "A standalone product site at oldwaystoday.com. AI-powered RAG chatbot answers questions about traditional, non-toxic alternatives to modern products. Automated blog pipeline generates research-backed articles on ingredients, remedies, and lifestyle practices.",
    whyUnique: "First full product built on top of the same agent architecture powering azoni.ai. Reuses the RAG pattern, blog generation pipeline, and orchestrator integration — proving the system is portable beyond a portfolio site.",
    tech: ["React SPA", "Netlify Functions", "Firestore RAG", "OpenRouter", "Auto-blog pipeline", "EmbedRoute"],
    data: ["rag_knowledge_base — product/ingredient chunks", "blogPosts — auto-generated articles", "chatLogs — user conversations", "agent_activity — blog + RAG events"],
    cycle: ["User asks about a product or ingredient", "Intent detection classifies the query", "RAG retrieves relevant knowledge chunks", "If no chunk exists, real-time generation fills the gap", "Auto-blog pipeline publishes articles on schedule", "Orchestrator monitors health alongside other agents"],
    code: `// Same RAG pattern as azoni.ai:\nconst chunks = await getKnowledgeChunks();\nconst scored = scoreChunks(chunks, query);\nconst context = scored.slice(0, 5);\n// Augment prompt with retrieved knowledge\nconst response = await callLLM({\n  system: buildPrompt(context),\n  messages: history\n});`,
    starters: ["What does Old Ways Today do?", "How is it connected to the agent system?", "What kind of products do you cover?", "What's the most popular question?"],
  },
  fabstatsbot: {
    name: "FaB Stats Bot",
    role: "Discord Bot",
    color: "#c9a84c",
    bg: "#c9a84c15",
    borderColor: "#c9a84c30",
    quote: "Discord bot serving FaB Stats data to communities via 20+ slash commands.",
    whatItIs: "A Discord.js 14 bot that serves player stats, leaderboards, hero matchups, daily puzzle results, and tournament data to Flesh and Blood communities. Fully integrated with the FaB Stats Firestore backend.",
    whyUnique: "Brings all of FaB Stats' data into Discord where players actually hang out. 20+ slash commands cover everything from quick stat lookups to full meta analysis — no need to leave the chat.",
    tech: ["Discord.js 14", "Firestore", "20+ Slash Commands", "Node.js"],
    data: ["leaderboard — player lookups", "matches — recent results", "heroMatchups — meta queries", "minigame collections — puzzle results"],
    cycle: ["Player uses /stats command in Discord", "Bot queries Firestore for player data", "Formats response as rich embed", "Supports autocomplete for hero/player names", "Leaderboard commands paginate results"],
    code: `// Slash command example:\n/stats player:Azoni\n→ Matches: 142 | Win Rate: 58.4%\n→ Top Hero: Prism (34 matches)\n→ ELO: 1247 | Best Streak: 8`,
    starters: ["What commands do you have?", "Who's at the top of the leaderboard?", "What hero should I play?"],
  },
  fabstats: {
    name: "FaB Stats",
    role: "TCG Tracker",
    color: "#D9A05B",
    bg: "#D9A05B15",
    borderColor: "#D9A05B30",
    quote: "Flesh and Blood TCG stats tracker with match logging, meta analysis, and 13 daily minigames.",
    whatItIs: "A full-featured stats platform at fabstats.net for the Flesh and Blood trading card game. Players log matches, track win rates by hero, analyze the competitive meta, and play daily puzzle minigames. Includes a Chrome extension for importing tournament results.",
    whyUnique: "A real product with real users — 50+ active players tracking thousands of matches. Features include ELO ratings, head-to-head records, tournament top 8 tracking, hero matchup analysis, and 13 different daily minigames. MCP exposes community stats, leaderboards, and minigame data.",
    tech: ["Next.js 16", "Firebase/Firestore", "Tailwind CSS v4", "Chrome Extension", "Netlify"],
    data: ["leaderboard — player stats + rankings", "matches — individual match records", "heroMatchups — community meta data", "14 minigame collections — daily puzzle stats"],
    cycle: ["Players log matches via web or Chrome extension", "Stats aggregate to leaderboard in real-time", "Meta analysis computes hero popularity + top 8 conversion", "Daily minigames generate unique puzzles from card data", "MCP exposes community stats for the agent ecosystem"],
    code: `// Community data available via MCP:\n{\n  totalPlayers: 54,\n  totalMatches: 3200,\n  avgWinRate: "51.2%",\n  topHeroes: [\n    { hero: "Prism", players: 8 },\n    { hero: "Briar", players: 7 },\n  ],\n  minigames: 13\n}`,
    starters: ["How many players use FaB Stats?", "What's the most popular hero?", "What minigames do you have?", "How do you track tournaments?"],
  },
};

const AGENT_ORDER = ['orchestrator', 'chat', 'blog', 'fitness', 'gaming', 'social', 'oldways', 'fabstats', 'fabstatsbot'];
const SITE_AGENTS = ['orchestrator', 'chat', 'blog'];
const PRODUCT_AGENTS = ['fitness', 'gaming', 'social', 'oldways', 'fabstats', 'fabstatsbot'];

/* ─── Homepage-specific data (status, links, short descriptions) ─── */
const AGENT_HOME_DATA = {
  orchestrator: {
    shortDesc: "Runs every 3 hours. Gathers state from 11 sources, decides what needs doing, and executes autonomously. Also owns the error pipeline — all apps report errors here, and it reviews patterns each cycle.",
    status: 'Active', statusType: 'live',
    links: [{ label: 'Activity →', url: '/activity' }],
  },
  chat: {
    shortDesc: "Vector search RAG chatbot with intent detection across 12+ types. Uses OpenAI embeddings + cosine similarity for semantic retrieval — and self-improves by generating new knowledge chunks when stumped.",
    status: 'Active', statusType: 'live',
    links: [{ label: 'Try it →', url: '/chat' }],
  },
  blog: {
    shortDesc: "Reads yesterday's GitHub commits via GraphQL and writes a narrative technical blog post with auto-generated SVG covers.",
    status: 'Daily 5PM UTC', statusType: 'scheduled',
    links: [{ label: 'Read Blog →', url: '/blog' }],
  },
  fitness: {
    shortDesc: "AI workout generation and progress tracking across BenchPressOnly and RowCrew. Real users, real data.",
    status: 'Active', statusType: 'live',
    links: [
      { label: 'BenchPressOnly →', url: 'https://benchpressonly.com', external: true },
      { label: 'RowCrew →', url: 'https://rowcrew.netlify.app', external: true },
    ],
  },
  gaming: {
    shortDesc: "AI generates unique wizard characters with custom abilities and backstories. Real-time multiplayer via Socket.io.",
    status: 'Playable', statusType: 'live',
    links: [{ label: 'Play →', url: 'https://azoni.ai/game', external: true }],
  },
  social: {
    shortDesc: "Autonomous social presence on Moltbook. The orchestrator decides when and what to post based on activity gaps.",
    status: 'Autonomous', statusType: 'live',
    links: [{ label: 'View Profile →', url: 'https://www.moltbook.com/u/Azoni-AI', external: true }],
  },
  oldways: {
    shortDesc: "Standalone product: AI-powered platform helping families find non-toxic, traditional alternatives. Same RAG + blog architecture as azoni.ai.",
    status: 'Active', statusType: 'live',
    links: [{ label: 'Visit Site →', url: 'https://oldwaystoday.com', external: true }],
  },
  fabstats: {
    shortDesc: "Flesh and Blood TCG stats tracker with match logging, ELO ratings, meta analysis, and 13 daily minigames. Real users, real data.",
    status: 'Active', statusType: 'live',
    links: [{ label: 'Visit Site →', url: 'https://www.fabstats.net', external: true }],
  },
  fabstatsbot: {
    shortDesc: "Discord bot serving FaB Stats data to communities — player stats, leaderboards, meta analysis, and daily puzzle results via 20+ slash commands.",
    status: 'Active', statusType: 'live',
    links: [{ label: 'FaB Stats →', url: 'https://www.fabstats.net', external: true }],
  },
};

export { avatars, AGENTS, AGENT_ORDER, SITE_AGENTS, PRODUCT_AGENTS, AGENT_HOME_DATA };