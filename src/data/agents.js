import React from 'react';

/* ─── SVG Avatars — Chibi Game Characters ─── */
const avatars = {
  /* ── The Orchestrator — Royal conductor chibi with crown, cape, baton ── */
  orchestrator: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="orc-cape" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#4c1d95"/></linearGradient>
        <linearGradient id="orc-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5b21b6"/><stop offset="100%" stopColor="#3b0764"/></linearGradient>
        <linearGradient id="orc-crown" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient>
        <linearGradient id="orc-cape-inner" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6d28d9"/><stop offset="100%" stopColor="#581c87"/></linearGradient>
      </defs>
      {/* Cape — flowing, with inner lining */}
      <path d="M28 52 Q22 62 18 84 Q28 78 38 82 L38 55 Z" fill="url(#orc-cape)" opacity="0.9">
        <animateTransform attributeName="transform" type="rotate" values="0 28 52;-1 28 52;0 28 52;1 28 52;0 28 52" dur="4s" repeatCount="indefinite"/>
      </path>
      <path d="M72 52 Q78 62 82 84 Q72 78 62 82 L62 55 Z" fill="url(#orc-cape)" opacity="0.9">
        <animateTransform attributeName="transform" type="rotate" values="0 72 52;1 72 52;0 72 52;-1 72 52;0 72 52" dur="4s" repeatCount="indefinite"/>
      </path>
      {/* Cape inner lining */}
      <path d="M30 54 Q26 62 22 78 L36 76 L36 56 Z" fill="url(#orc-cape-inner)" opacity="0.5"/>
      <path d="M70 54 Q74 62 78 78 L64 76 L64 56 Z" fill="url(#orc-cape-inner)" opacity="0.5"/>
      {/* Cape clasp chain */}
      <path d="M38 53 Q50 56 62 53" fill="none" stroke="#facc15" strokeWidth="0.6" opacity="0.5" strokeDasharray="2 2"/>
      {/* Body — royal tunic */}
      <rect x="33" y="52" width="34" height="30" rx="10" fill="url(#orc-body)" stroke="#7c3aed" strokeWidth="1.5"/>
      {/* Tunic trim lines */}
      <path d="M37 80 L37 56" stroke="#a78bfa" strokeWidth="0.5" opacity="0.3"/>
      <path d="M63 80 L63 56" stroke="#a78bfa" strokeWidth="0.5" opacity="0.3"/>
      {/* Shoulder epaulettes with fringe */}
      <ellipse cx="35" cy="54" rx="8" ry="4.5" fill="#a78bfa"/>
      <ellipse cx="65" cy="54" rx="8" ry="4.5" fill="#a78bfa"/>
      <circle cx="35" cy="54" r="2.5" fill="#facc15"/><circle cx="65" cy="54" r="2.5" fill="#facc15"/>
      {/* Epaulette fringe */}
      <path d="M28 56 L29 59 M30 56.5 L31 59.5 M32 57 L32.5 60" stroke="#c4b5fd" strokeWidth="0.5" opacity="0.4"/>
      <path d="M68 57 L67.5 60 M70 56.5 L69 59.5 M72 56 L71 59" stroke="#c4b5fd" strokeWidth="0.5" opacity="0.4"/>
      {/* Chest emblem — star medal */}
      <circle cx="50" cy="62" r="5.5" fill="#2e1065" stroke="#a78bfa" strokeWidth="1"/>
      <polygon points="50,57.5 51.5,60.5 55,61 52.5,63 53,66.5 50,64.5 47,66.5 47.5,63 45,61 48.5,60.5" fill="#facc15"/>
      {/* Sash across chest */}
      <path d="M38 54 L56 72" stroke="#c084fc" strokeWidth="2" opacity="0.25" strokeLinecap="round"/>
      {/* Legs / boots */}
      <rect x="38" y="78" width="10" height="12" rx="4" fill="#4c1d95"/>
      <rect x="52" y="78" width="10" height="12" rx="4" fill="#4c1d95"/>
      <rect x="37" y="86" width="12" height="6" rx="3" fill="#5b21b6" stroke="#7c3aed" strokeWidth="0.8"/>
      <rect x="51" y="86" width="12" height="6" rx="3" fill="#5b21b6" stroke="#7c3aed" strokeWidth="0.8"/>
      {/* Boot buckles */}
      <rect x="41" y="87" width="4" height="2" rx="0.5" fill="#facc15" opacity="0.6"/>
      <rect x="55" y="87" width="4" height="2" rx="0.5" fill="#facc15" opacity="0.6"/>
      {/* Head */}
      <circle cx="50" cy="36" r="18" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="1.5"/>
      {/* Hair */}
      <path d="M32 32 Q34 20 50 18 Q66 20 68 32 Q68 28 64 24 Q56 18 50 17 Q44 18 36 24 Q32 28 32 32Z" fill="#4c1d95"/>
      {/* Side locks */}
      <path d="M32 32 Q30 38 31 42" stroke="#4c1d95" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M68 32 Q70 38 69 42" stroke="#4c1d95" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Eyes — big anime style */}
      <ellipse cx="42" cy="36" rx="5.5" ry="6" fill="white" stroke="#3b0764" strokeWidth="0.8"/>
      <ellipse cx="58" cy="36" rx="5.5" ry="6" fill="white" stroke="#3b0764" strokeWidth="0.8"/>
      <ellipse cx="43" cy="37" rx="3.5" ry="4" fill="#5b21b6"/>
      <ellipse cx="59" cy="37" rx="3.5" ry="4" fill="#5b21b6"/>
      <circle cx="44.5" cy="35" r="1.5" fill="white"/><circle cx="60.5" cy="35" r="1.5" fill="white"/>
      <circle cx="42" cy="38" r="0.8" fill="white" opacity="0.5"/><circle cx="58" cy="38" r="0.8" fill="white" opacity="0.5"/>
      {/* Eyelashes */}
      <path d="M36.5 32 L37.5 34" stroke="#3b0764" strokeWidth="0.6"/><path d="M63.5 32 L62.5 34" stroke="#3b0764" strokeWidth="0.6"/>
      {/* Eyebrows — commanding */}
      <path d="M37 30 Q42 27.5 47 30" fill="none" stroke="#3b0764" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M53 30 Q58 27.5 63 30" fill="none" stroke="#3b0764" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Mouth — confident smirk */}
      <path d="M45 44 Q50 47 55 44" fill="none" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Blush */}
      <ellipse cx="37" cy="42" rx="3.5" ry="2" fill="#ddd6fe" opacity="0.5"/>
      <ellipse cx="63" cy="42" rx="3.5" ry="2" fill="#ddd6fe" opacity="0.5"/>
      {/* Crown — more detailed with inner gems */}
      <path d="M34 22 L36 10 L42 18 L50 5 L58 18 L64 10 L66 22 Z" fill="url(#orc-crown)" stroke="#d97706" strokeWidth="1.2"/>
      {/* Crown band */}
      <path d="M34 22 L66 22" stroke="#b45309" strokeWidth="1.5"/>
      {/* Crown gems */}
      <circle cx="42" cy="15" r="2" fill="#ef4444" stroke="#dc2626" strokeWidth="0.4"/>
      <circle cx="50" cy="9" r="2.5" fill="#3b82f6" stroke="#2563eb" strokeWidth="0.4"/>
      <circle cx="58" cy="15" r="2" fill="#22c55e" stroke="#16a34a" strokeWidth="0.4"/>
      {/* Gem highlights */}
      <circle cx="41.5" cy="14.5" r="0.7" fill="white" opacity="0.5"/>
      <circle cx="49.5" cy="8.5" r="0.8" fill="white" opacity="0.5"/>
      <circle cx="57.5" cy="14.5" r="0.7" fill="white" opacity="0.5"/>
      {/* Baton in right hand — conducting */}
      <line x1="74" y1="50" x2="82" y2="30" stroke="#d4d4d8" strokeWidth="2.5" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" values="0 74 50;-6 74 50;0 74 50;6 74 50;0 74 50" dur="2s" repeatCount="indefinite"/>
      </line>
      <circle cx="83" cy="28" r="3.5" fill="#facc15" stroke="#f59e0b" strokeWidth="1">
        <animateTransform attributeName="transform" type="rotate" values="0 74 50;-6 74 50;0 74 50;6 74 50;0 74 50" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="83" cy="28" r="1.5" fill="white" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" values="0 74 50;-6 74 50;0 74 50;6 74 50;0 74 50" dur="2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  ),

  /* ── Azoni AI — Cute robot chibi with screen face, antenna, blue armor ── */
  chat: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="chat-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#1d4ed8"/></linearGradient>
        <linearGradient id="chat-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e3a5f"/><stop offset="100%" stopColor="#0f172a"/></linearGradient>
      </defs>
      {/* Antenna */}
      <line x1="50" y1="14" x2="50" y2="4" stroke="#93c5fd" strokeWidth="2"/>
      <circle cx="50" cy="3" r="3" fill="#60a5fa"><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/></circle>
      {/* Antenna signal rings */}
      <circle cx="50" cy="3" r="5" fill="none" stroke="#60a5fa" strokeWidth="0.5" opacity="0.3"><animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/></circle>
      {/* Ears / side panels with vent slots */}
      <rect x="16" y="26" width="8" height="20" rx="3" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1"/>
      <rect x="76" y="26" width="8" height="20" rx="3" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1"/>
      <circle cx="20" cy="33" r="2" fill="#93c5fd"/><circle cx="80" cy="33" r="2" fill="#93c5fd"/>
      {/* Vent lines on ear panels */}
      <line x1="18" y1="38" x2="22" y2="38" stroke="#1d4ed8" strokeWidth="0.6"/><line x1="18" y1="40" x2="22" y2="40" stroke="#1d4ed8" strokeWidth="0.6"/><line x1="18" y1="42" x2="22" y2="42" stroke="#1d4ed8" strokeWidth="0.6"/>
      <line x1="78" y1="38" x2="82" y2="38" stroke="#1d4ed8" strokeWidth="0.6"/><line x1="78" y1="40" x2="82" y2="40" stroke="#1d4ed8" strokeWidth="0.6"/><line x1="78" y1="42" x2="82" y2="42" stroke="#1d4ed8" strokeWidth="0.6"/>
      {/* Head — rounded robot */}
      <rect x="24" y="14" width="52" height="40" rx="14" fill="url(#chat-body)" stroke="#2563eb" strokeWidth="1.5"/>
      {/* Head panel seam */}
      <path d="M30 14 L30 20" stroke="#1d4ed8" strokeWidth="0.5" opacity="0.3"/>
      <path d="M70 14 L70 20" stroke="#1d4ed8" strokeWidth="0.5" opacity="0.3"/>
      {/* Face screen — with bezel */}
      <rect x="29" y="19" width="42" height="30" rx="9" fill="#1d4ed8" opacity="0.5"/>
      <rect x="30" y="20" width="40" height="28" rx="8" fill="url(#chat-screen)"/>
      {/* Screen scan line */}
      <rect x="30" y="20" width="40" height="1" rx="0.5" fill="#60a5fa" opacity="0.08"><animate attributeName="y" values="20;48;20" dur="3s" repeatCount="indefinite"/></rect>
      {/* Eyes on screen — glowing with blink */}
      <ellipse cx="42" cy="32" rx="5" ry="5.5" fill="#60a5fa" opacity="0.9"><animate attributeName="ry" values="5.5;5.5;0.5;5.5;5.5" dur="4s" repeatCount="indefinite" keyTimes="0;0.45;0.5;0.55;1"/></ellipse>
      <ellipse cx="58" cy="32" rx="5" ry="5.5" fill="#60a5fa" opacity="0.9"><animate attributeName="ry" values="5.5;5.5;0.5;5.5;5.5" dur="4s" repeatCount="indefinite" keyTimes="0;0.45;0.5;0.55;1"/></ellipse>
      <ellipse cx="42" cy="32" rx="3" ry="3.5" fill="#dbeafe"/>
      <ellipse cx="58" cy="32" rx="3" ry="3.5" fill="#dbeafe"/>
      <circle cx="43.5" cy="31" r="1.2" fill="white"/><circle cx="59.5" cy="31" r="1.2" fill="white"/>
      {/* Happy mouth on screen */}
      <path d="M44 40 Q50 45 56 40" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Status indicator dot on face frame */}
      <circle cx="33" cy="44" r="1.5" fill="#4ade80"><animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/></circle>
      {/* Body */}
      <rect x="32" y="54" width="36" height="24" rx="8" fill="url(#chat-body)" stroke="#2563eb" strokeWidth="1.2"/>
      {/* Body panel lines */}
      <path d="M38 54 L38 60" stroke="#1d4ed8" strokeWidth="0.4" opacity="0.3"/>
      <path d="M62 54 L62 60" stroke="#1d4ed8" strokeWidth="0.4" opacity="0.3"/>
      {/* Chest light */}
      <circle cx="50" cy="64" r="4" fill="#0f172a" stroke="#3b82f6" strokeWidth="1"/>
      <circle cx="50" cy="64" r="2" fill="#60a5fa"><animate attributeName="r" values="2;2.8;2" dur="1.5s" repeatCount="indefinite"/></circle>
      {/* Chest plate rivets */}
      <circle cx="40" cy="58" r="1" fill="#1d4ed8"/><circle cx="60" cy="58" r="1" fill="#1d4ed8"/>
      <circle cx="40" cy="74" r="1" fill="#1d4ed8"/><circle cx="60" cy="74" r="1" fill="#1d4ed8"/>
      {/* Arms — with joint rings */}
      <rect x="22" y="56" width="10" height="16" rx="5" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1"/>
      <rect x="68" y="56" width="10" height="16" rx="5" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1"/>
      {/* Arm joint rings */}
      <ellipse cx="27" cy="60" rx="5" ry="1.5" fill="none" stroke="#93c5fd" strokeWidth="0.5" opacity="0.3"/>
      <ellipse cx="73" cy="60" rx="5" ry="1.5" fill="none" stroke="#93c5fd" strokeWidth="0.5" opacity="0.3"/>
      {/* Hands */}
      <circle cx="27" cy="72" r="4" fill="#93c5fd" stroke="#2563eb" strokeWidth="1"/>
      <circle cx="73" cy="72" r="4" fill="#93c5fd" stroke="#2563eb" strokeWidth="1"/>
      {/* Finger segments on hands */}
      <path d="M25 69 L24 67" stroke="#60a5fa" strokeWidth="1" strokeLinecap="round"/>
      <path d="M75 69 L76 67" stroke="#60a5fa" strokeWidth="1" strokeLinecap="round"/>
      {/* Legs */}
      <rect x="38" y="76" width="10" height="12" rx="4" fill="#1d4ed8"/>
      <rect x="52" y="76" width="10" height="12" rx="4" fill="#1d4ed8"/>
      {/* Knee joints */}
      <ellipse cx="43" cy="80" rx="5" ry="1" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3"/>
      <ellipse cx="57" cy="80" rx="5" ry="1" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3"/>
      {/* Feet */}
      <rect x="36" y="85" width="13" height="6" rx="3" fill="#2563eb" stroke="#3b82f6" strokeWidth="0.8"/>
      <rect x="51" y="85" width="13" height="6" rx="3" fill="#2563eb" stroke="#3b82f6" strokeWidth="0.8"/>
      {/* Foot grip lines */}
      <line x1="38" y1="89" x2="42" y2="89" stroke="#1d4ed8" strokeWidth="0.5"/><line x1="44" y1="89" x2="47" y2="89" stroke="#1d4ed8" strokeWidth="0.5"/>
      <line x1="53" y1="89" x2="57" y2="89" stroke="#1d4ed8" strokeWidth="0.5"/><line x1="59" y1="89" x2="62" y2="89" stroke="#1d4ed8" strokeWidth="0.5"/>
    </svg>
  ),

  /* ── The Scribe — Scholar chibi with beret, glasses, quill, open book ── */
  blog: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="blog-robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#d97706"/></linearGradient>
        <linearGradient id="blog-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fef3c7"/><stop offset="100%" stopColor="#fde68a"/></linearGradient>
      </defs>
      {/* Body / scholar robe */}
      <path d="M30 52 Q30 48 38 48 L62 48 Q70 48 70 52 L72 82 Q72 88 50 88 Q28 88 28 82 Z" fill="url(#blog-robe)" stroke="#b45309" strokeWidth="1.2"/>
      {/* Robe seam / fold lines */}
      <path d="M42 52 Q43 68 44 82" stroke="#b45309" strokeWidth="0.5" opacity="0.2"/>
      <path d="M56 52 Q57 68 58 82" stroke="#b45309" strokeWidth="0.5" opacity="0.2"/>
      {/* Robe collar — layered */}
      <path d="M38 48 Q50 55 62 48" fill="#fef3c7" stroke="#d97706" strokeWidth="1"/>
      <path d="M40 49 Q50 53 60 49" fill="none" stroke="#d97706" strokeWidth="0.5" opacity="0.3"/>
      {/* Vest overlay */}
      <path d="M40 50 L40 62 Q50 65 60 62 L60 50" fill="none" stroke="#92400e" strokeWidth="1" opacity="0.3"/>
      {/* Belt with book clasp */}
      <rect x="34" y="62" width="32" height="4" rx="2" fill="#92400e"/>
      <rect x="47" y="61" width="6" height="6" rx="1.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8"/>
      {/* Small book icon on belt clasp */}
      <rect x="48.5" y="62.5" width="3" height="3" rx="0.3" fill="#92400e" opacity="0.5"/>
      {/* Arms */}
      <path d="M30 52 Q22 58 18 68" fill="none" stroke="#d97706" strokeWidth="6" strokeLinecap="round"/>
      <path d="M70 52 Q78 58 80 64" fill="none" stroke="#d97706" strokeWidth="6" strokeLinecap="round"/>
      {/* Sleeve cuffs */}
      <circle cx="18" cy="68" r="4.5" fill="none" stroke="#b45309" strokeWidth="1"/>
      <circle cx="80" cy="64" r="4" fill="none" stroke="#b45309" strokeWidth="1"/>
      {/* Left hand holds open book — detailed */}
      <rect x="7" y="63" width="17" height="13" rx="2" fill="#fef3c7" stroke="#d97706" strokeWidth="1.2"/>
      {/* Book left page */}
      <rect x="7" y="63" width="8.5" height="13" rx="2" fill="#fde68a"/>
      {/* Book spine */}
      <line x1="15.5" y1="64" x2="15.5" y2="75" stroke="#b45309" strokeWidth="1"/>
      {/* Text lines on pages */}
      <line x1="9" y1="67" x2="13" y2="67" stroke="#b45309" strokeWidth="0.5" opacity="0.4"/>
      <line x1="9" y1="69" x2="14" y2="69" stroke="#b45309" strokeWidth="0.5" opacity="0.35"/>
      <line x1="9" y1="71" x2="12" y2="71" stroke="#b45309" strokeWidth="0.5" opacity="0.3"/>
      <line x1="17" y1="67" x2="22" y2="67" stroke="#b45309" strokeWidth="0.5" opacity="0.35"/>
      <line x1="17" y1="69" x2="21" y2="69" stroke="#b45309" strokeWidth="0.5" opacity="0.3"/>
      <line x1="17" y1="71" x2="22" y2="71" stroke="#b45309" strokeWidth="0.5" opacity="0.25"/>
      {/* Book bookmark ribbon */}
      <path d="M22 63 L23 68 L21 68 Z" fill="#ef4444" opacity="0.5"/>
      {/* Quill in right hand — animated writing */}
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 80 64;-3 80 64;0 80 64;3 80 64;0 80 64" dur="2.5s" repeatCount="indefinite"/>
        <line x1="80" y1="64" x2="86" y2="42" stroke="#78350f" strokeWidth="1.5"/>
        {/* Feather — more detailed */}
        <path d="M86 42 Q90 37 88 32" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.3"/>
        <path d="M86 42 Q91 38 89 33 Q87 38 84.5 40.5 Z" fill="#f59e0b"/>
        <path d="M86 42 Q81 38 83 33 Q85 38 87.5 40.5 Z" fill="#fbbf24"/>
        {/* Feather barbs */}
        <path d="M88 36 L90 35" stroke="#d97706" strokeWidth="0.4" opacity="0.3"/>
        <path d="M87.5 38 L89.5 37.5" stroke="#d97706" strokeWidth="0.4" opacity="0.3"/>
      </g>
      {/* Ink drop on quill tip */}
      <circle cx="80" cy="65" r="1" fill="#1a1a2e" opacity="0.4"/>
      {/* Feet — scholar shoes */}
      <ellipse cx="42" cy="90" rx="7" ry="3.5" fill="#92400e"/><ellipse cx="58" cy="90" rx="7" ry="3.5" fill="#92400e"/>
      {/* Shoe buckles */}
      <rect x="40" y="89" width="3" height="2" rx="0.5" fill="#d97706" opacity="0.5"/>
      <rect x="56" y="89" width="3" height="2" rx="0.5" fill="#d97706" opacity="0.5"/>
      {/* Head */}
      <circle cx="50" cy="32" r="18" fill="url(#blog-skin)"/>
      {/* Hair — tidy scholar with texture */}
      <path d="M32 28 Q34 16 50 14 Q66 16 68 28 L68 32 Q64 24 50 22 Q36 24 32 32 Z" fill="#78350f"/>
      {/* Hair strands */}
      <path d="M36 26 Q38 22 42 20" stroke="#5c2d0e" strokeWidth="0.5" opacity="0.3"/>
      <path d="M64 26 Q62 22 58 20" stroke="#5c2d0e" strokeWidth="0.5" opacity="0.3"/>
      {/* Beret — more structured */}
      <ellipse cx="50" cy="16" rx="18" ry="6" fill="#92400e"/>
      <path d="M32 18 Q34 10 50 8 Q66 10 68 18 Q64 14 50 12 Q36 14 32 18Z" fill="#b45309"/>
      <circle cx="50" cy="8" r="2.5" fill="#78350f"/>
      {/* Beret stitching */}
      <path d="M36 16 Q50 12 64 16" fill="none" stroke="#78350f" strokeWidth="0.4" opacity="0.4" strokeDasharray="1.5 1.5"/>
      {/* Glasses — round scholar */}
      <circle cx="42" cy="33" r="6" fill="none" stroke="#78350f" strokeWidth="1.5"/>
      <circle cx="58" cy="33" r="6" fill="none" stroke="#78350f" strokeWidth="1.5"/>
      <line x1="48" y1="33" x2="52" y2="33" stroke="#78350f" strokeWidth="1.5"/>
      <line x1="36" y1="33" x2="32" y2="31" stroke="#78350f" strokeWidth="1"/>
      <line x1="64" y1="33" x2="68" y2="31" stroke="#78350f" strokeWidth="1"/>
      {/* Lens reflections */}
      <ellipse cx="39" cy="31" rx="2" ry="1.5" fill="white" opacity="0.1"/>
      <ellipse cx="55" cy="31" rx="2" ry="1.5" fill="white" opacity="0.1"/>
      {/* Eyes behind glasses */}
      <ellipse cx="42" cy="34" rx="3" ry="3.5" fill="#431407"/>
      <ellipse cx="58" cy="34" rx="3" ry="3.5" fill="#431407"/>
      <circle cx="43.5" cy="33" r="1.2" fill="white"/><circle cx="59.5" cy="33" r="1.2" fill="white"/>
      <circle cx="42" cy="35.5" r="0.6" fill="white" opacity="0.4"/><circle cx="58" cy="35.5" r="0.6" fill="white" opacity="0.4"/>
      {/* Eyebrows — thoughtful */}
      <path d="M38 28 Q42 25.5 46 28" fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M54 28 Q58 25.5 62 28" fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round"/>
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
      {/* Tank top stitching detail */}
      <path d="M34 50 Q50 48 66 50" fill="none" stroke="#15803d" strokeWidth="0.5" opacity="0.4"/>
      {/* Number on chest */}
      <text x="50" y="64" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="12" fill="#052e16" opacity="0.4">#1</text>
      {/* Chest muscle line */}
      <path d="M44 50 Q50 52 56 50" fill="none" stroke="#052e16" strokeWidth="0.5" opacity="0.15"/>
      {/* Arms — muscular with definition */}
      <path d="M34 50 Q20 52 14 60" fill="none" stroke="url(#fit-skin)" strokeWidth="9" strokeLinecap="round"/>
      <path d="M66 50 Q80 52 86 44" fill="none" stroke="url(#fit-skin)" strokeWidth="9" strokeLinecap="round"/>
      {/* Bicep definition */}
      <path d="M24 54 Q22 56 22 58" stroke="#d4a574" strokeWidth="0.6" opacity="0.3"/>
      <path d="M76 48 Q80 46 82 44" stroke="#d4a574" strokeWidth="0.6" opacity="0.3"/>
      {/* Wrist sweatbands */}
      <circle cx="14" cy="58" r="5.5" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.7"/>
      {/* Dumbbell in right hand — more detailed */}
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 84 42;-4 84 42;0 84 42;4 84 42;0 84 42" dur="2s" repeatCount="indefinite"/>
        <rect x="82" y="34" width="4" height="16" rx="2" fill="#a1a1aa" stroke="#71717a" strokeWidth="0.8"/>
        {/* Dumbbell knurling */}
        <line x1="83" y1="38" x2="85" y2="38" stroke="#6b6b6b" strokeWidth="0.3"/>
        <line x1="83" y1="40" x2="85" y2="40" stroke="#6b6b6b" strokeWidth="0.3"/>
        <line x1="83" y1="42" x2="85" y2="42" stroke="#6b6b6b" strokeWidth="0.3"/>
        <line x1="83" y1="44" x2="85" y2="44" stroke="#6b6b6b" strokeWidth="0.3"/>
        {/* Weight plates */}
        <rect x="79" y="32" width="10" height="5" rx="2" fill="#71717a"/>
        <rect x="79" y="47" width="10" height="5" rx="2" fill="#71717a"/>
        {/* Outer plates */}
        <rect x="78" y="33" width="3" height="3" rx="1" fill="#52525b"/>
        <rect x="87" y="33" width="3" height="3" rx="1" fill="#52525b"/>
        <rect x="78" y="48" width="3" height="3" rx="1" fill="#52525b"/>
        <rect x="87" y="48" width="3" height="3" rx="1" fill="#52525b"/>
      </g>
      {/* Left fist — clenched */}
      <circle cx="14" cy="62" r="5" fill="#fcd9a8" stroke="#d4a574" strokeWidth="0.8"/>
      {/* Knuckle lines */}
      <path d="M11 61 L12 62.5" stroke="#d4a574" strokeWidth="0.4" opacity="0.4"/>
      <path d="M13 60.5 L14 62" stroke="#d4a574" strokeWidth="0.4" opacity="0.4"/>
      {/* Shorts — athletic */}
      <rect x="36" y="74" width="12" height="10" rx="3" fill="#052e16"/>
      <rect x="52" y="74" width="12" height="10" rx="3" fill="#052e16"/>
      {/* Shorts stripe */}
      <path d="M36 76 L48 76" stroke="#16a34a" strokeWidth="0.8" opacity="0.3"/>
      <path d="M52 76 L64 76" stroke="#16a34a" strokeWidth="0.8" opacity="0.3"/>
      {/* Legs — muscular */}
      <rect x="38" y="82" width="10" height="8" rx="3" fill="#fcd9a8"/>
      <rect x="54" y="82" width="10" height="8" rx="3" fill="#fcd9a8"/>
      {/* Calf definition */}
      <path d="M42 84 Q43 86 42 88" stroke="#d4a574" strokeWidth="0.4" opacity="0.25"/>
      <path d="M58 84 Q59 86 58 88" stroke="#d4a574" strokeWidth="0.4" opacity="0.25"/>
      {/* Sneakers — detailed */}
      <rect x="36" y="88" width="13" height="6" rx="3" fill="#ef4444" stroke="#dc2626" strokeWidth="0.8"/>
      <rect x="53" y="88" width="13" height="6" rx="3" fill="#ef4444" stroke="#dc2626" strokeWidth="0.8"/>
      {/* Shoe laces */}
      <path d="M38 90 L41 90 M42 90 L44 90" stroke="white" strokeWidth="0.6"/>
      <path d="M55 90 L58 90 M59 90 L61 90" stroke="white" strokeWidth="0.6"/>
      {/* Nike-style swoosh */}
      <path d="M38 92 Q42 90 47 92" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4"/>
      <path d="M55 92 Q59 90 64 92" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4"/>
      {/* Head */}
      <circle cx="50" cy="28" r="17" fill="url(#fit-skin)"/>
      {/* Hair — short sporty buzz */}
      <path d="M33 24 Q36 12 50 10 Q64 12 67 24 Q66 18 58 14 Q50 12 42 14 Q34 18 33 24Z" fill="#1a1a2e"/>
      {/* Hair texture */}
      <path d="M38 16 L40 18" stroke="#2a2a3e" strokeWidth="0.4" opacity="0.3"/>
      <path d="M50 12 L50 15" stroke="#2a2a3e" strokeWidth="0.4" opacity="0.3"/>
      <path d="M60 16 L62 18" stroke="#2a2a3e" strokeWidth="0.4" opacity="0.3"/>
      {/* Headband — with logo detail */}
      <path d="M33 22 Q50 18 67 22" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M67 22 Q70 24 72 30" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M72 30 Q73 34 72 36" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
      {/* Headband knot detail */}
      <circle cx="72" cy="30" r="1.5" fill="#dc2626"/>
      {/* Sweat drop */}
      <path d="M68 28 Q69 24 68 22" fill="none" stroke="#93c5fd" strokeWidth="0.8" opacity="0.4"/>
      <circle cx="68" cy="28" r="1" fill="#93c5fd" opacity="0.3"/>
      {/* Eyes — determined, intense */}
      <ellipse cx="43" cy="28" rx="4.5" ry="5" fill="white" stroke="#1a1a2e" strokeWidth="0.8"/>
      <ellipse cx="57" cy="28" rx="4.5" ry="5" fill="white" stroke="#1a1a2e" strokeWidth="0.8"/>
      <ellipse cx="44" cy="29" rx="3" ry="3.5" fill="#15803d"/>
      <ellipse cx="58" cy="29" rx="3" ry="3.5" fill="#15803d"/>
      <circle cx="45" cy="28" r="1.2" fill="white"/><circle cx="59" cy="28" r="1.2" fill="white"/>
      {/* Lower eyelid (intense look) */}
      <path d="M39 31 Q43 33 47 31" fill="none" stroke="#1a1a2e" strokeWidth="0.5" opacity="0.2"/>
      <path d="M53 31 Q57 33 61 31" fill="none" stroke="#1a1a2e" strokeWidth="0.5" opacity="0.2"/>
      {/* Thick brows — tough look */}
      <path d="M38 22 Q43 19.5 48 23" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
      <path d="M52 23 Q57 19.5 62 22" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
      {/* Big grin — teeth showing */}
      <path d="M42 36 Q50 42 58 36" fill="#fff" stroke="#1a1a2e" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M44 36 Q50 40 56 36" fill="#ef4444" opacity="0.3"/>
      {/* Tooth line */}
      <line x1="50" y1="36" x2="50" y2="39" stroke="#e5e5e5" strokeWidth="0.5" opacity="0.3"/>
    </svg>
  ),

  /* ── The Wizard — Mage chibi with pointy hat, staff, magical glow ── */
  gaming: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="wiz-robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#4c1d95"/></linearGradient>
        <linearGradient id="wiz-hat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6d28d9"/><stop offset="100%" stopColor="#3b0764"/></linearGradient>
      </defs>
      {/* Robe body — layered with hem */}
      <path d="M32 52 Q28 52 28 56 L24 88 Q24 94 50 94 Q76 94 76 88 L72 56 Q72 52 68 52 Z" fill="url(#wiz-robe)" stroke="#5b21b6" strokeWidth="1.2"/>
      {/* Robe fold lines */}
      <path d="M36 58 Q38 74 34 90" stroke="#4c1d95" strokeWidth="0.6" opacity="0.3"/>
      <path d="M64 58 Q62 74 66 90" stroke="#4c1d95" strokeWidth="0.6" opacity="0.3"/>
      {/* Robe hem decoration */}
      <path d="M26 88 Q30 86 34 88 Q38 90 42 88 Q46 86 50 88 Q54 90 58 88 Q62 86 66 88 Q70 90 74 88" fill="none" stroke="#c084fc" strokeWidth="0.8" opacity="0.3"/>
      {/* Robe belt — braided cord */}
      <rect x="34" y="62" width="32" height="3.5" rx="1.5" fill="#c084fc"/>
      <path d="M36 63 Q38 61.5 40 63 Q42 64.5 44 63 Q46 61.5 48 63" fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.3"/>
      <circle cx="50" cy="64" r="3" fill="#facc15" stroke="#d97706" strokeWidth="0.8"/>
      {/* Gem in belt buckle */}
      <circle cx="50" cy="64" r="1.5" fill="#fef08a" opacity="0.6"/>
      {/* Embroidered stars on robe */}
      <polygon points="40,72 41,74 43,74 41.5,75.5 42,78 40,76.5 38,78 38.5,75.5 37,74 39,74" fill="#facc15" opacity="0.5"/>
      <polygon points="58,78 59,80 61,80 59.5,81.5 60,84 58,82.5 56,84 56.5,81.5 55,80 57,80" fill="#facc15" opacity="0.35"/>
      {/* Small moon on robe */}
      <path d="M46 82 Q44 80 46 78 Q48 80 46 82Z" fill="#c084fc" opacity="0.3"/>
      {/* Arms — with robe sleeves */}
      <path d="M32 54 Q20 56 14 52" fill="none" stroke="#6d28d9" strokeWidth="7" strokeLinecap="round"/>
      <path d="M68 54 Q76 58 78 68" fill="none" stroke="#6d28d9" strokeWidth="7" strokeLinecap="round"/>
      {/* Sleeve ends — flared */}
      <path d="M14 48 Q12 52 16 54" fill="none" stroke="#5b21b6" strokeWidth="1" opacity="0.4"/>
      <path d="M76 66 Q74 70 80 70" fill="none" stroke="#5b21b6" strokeWidth="1" opacity="0.4"/>
      {/* Staff in left hand — gnarled wood with crystal */}
      <path d="M14 52 Q12 34 10 10" fill="none" stroke="#8B4513" strokeWidth="3" strokeLinecap="round"/>
      {/* Staff wood grain */}
      <path d="M12 30 Q13 28 12 26" stroke="#6d3a0f" strokeWidth="0.5" opacity="0.3"/>
      <path d="M11 20 Q12 18 11 16" stroke="#6d3a0f" strokeWidth="0.5" opacity="0.3"/>
      {/* Crystal orb on staff */}
      <circle cx="10" cy="10" r="5.5" fill="#c084fc" stroke="#7c3aed" strokeWidth="1.2"/>
      <circle cx="10" cy="10" r="3" fill="#ddd6fe" opacity="0.4"/>
      <circle cx="10" cy="10" r="2" fill="#facc15"><animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.5s" repeatCount="indefinite"/></circle>
      {/* Crystal highlight */}
      <circle cx="8.5" cy="8.5" r="1.2" fill="white" opacity="0.4"/>
      {/* Right hand — casting pose */}
      <circle cx="78" cy="70" r="4" fill="#ede9fe"/>
      {/* Magical particles floating from hand */}
      <circle cx="82" cy="66" r="1.5" fill="#facc15" opacity="0.6"><animate attributeName="cy" values="66;62;66" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite"/></circle>
      <circle cx="85" cy="72" r="1" fill="#c084fc" opacity="0.5"><animate attributeName="cy" values="72;68;72" dur="2.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite"/></circle>
      <circle cx="80" cy="64" r="0.8" fill="#a78bfa" opacity="0.4"><animate attributeName="cy" values="64;60;64" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite"/></circle>
      {/* Feet — pointy wizard boots */}
      <path d="M35 92 Q35 96 42 96 Q48 96 50 94 L38 92 Z" fill="#3b0764"/>
      <path d="M65 92 Q65 96 58 96 Q52 96 50 94 L62 92 Z" fill="#3b0764"/>
      {/* Curled toe tips */}
      <circle cx="35" cy="94" r="1.5" fill="#3b0764"/>
      <circle cx="65" cy="94" r="1.5" fill="#3b0764"/>
      {/* Head */}
      <circle cx="50" cy="36" r="16" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="1"/>
      {/* Hair — silver/white peeks under hat */}
      <path d="M34 36 Q36 30 40 32" fill="#e2e8f0" stroke="none"/>
      <path d="M66 36 Q64 30 60 32" fill="#e2e8f0" stroke="none"/>
      {/* Long beard wisps */}
      <path d="M44 46 Q42 52 40 56" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M50 48 Q50 54 48 58" stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
      {/* Wizard hat — more detailed */}
      <path d="M28 30 L50 -2 L72 30 Z" fill="url(#wiz-hat)" stroke="#5b21b6" strokeWidth="1.2"/>
      <ellipse cx="50" cy="30" rx="24" ry="5" fill="#6d28d9" stroke="#5b21b6" strokeWidth="1"/>
      {/* Hat wrinkle */}
      <path d="M40 18 Q46 20 50 14" fill="none" stroke="#5b21b6" strokeWidth="0.6" opacity="0.3"/>
      {/* Hat star — larger */}
      <polygon points="50,8 52,13 57,13.5 53.5,17 54.5,22 50,19 45.5,22 46.5,17 43,13.5 48,13" fill="#facc15"/>
      {/* Hat band — decorated */}
      <path d="M30 28 Q50 34 70 28" fill="none" stroke="#c084fc" strokeWidth="2"/>
      <path d="M34 29 Q50 33 66 29" fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.3"/>
      {/* Eyes — big curious wizard eyes */}
      <ellipse cx="43" cy="36" rx="5" ry="5.5" fill="white" stroke="#3b0764" strokeWidth="0.8"/>
      <ellipse cx="57" cy="36" rx="5" ry="5.5" fill="white" stroke="#3b0764" strokeWidth="0.8"/>
      <ellipse cx="44" cy="37" rx="3.2" ry="3.8" fill="#7c3aed"/>
      <ellipse cx="58" cy="37" rx="3.2" ry="3.8" fill="#7c3aed"/>
      {/* Star-shaped pupil highlight */}
      <circle cx="45.5" cy="35.5" r="1.3" fill="white"/><circle cx="59.5" cy="35.5" r="1.3" fill="white"/>
      <circle cx="43" cy="38" r="0.5" fill="white" opacity="0.3"/><circle cx="57" cy="38" r="0.5" fill="white" opacity="0.3"/>
      {/* Wise eyebrows */}
      <path d="M38 30 Q43 27.5 47 31" fill="none" stroke="#3b0764" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M53 31 Q57 27.5 62 30" fill="none" stroke="#3b0764" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Knowing smile */}
      <path d="M46 44 Q50 46.5 54 44" fill="none" stroke="#6d28d9" strokeWidth="1.2" strokeLinecap="round"/>
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
      {/* Hood — layered */}
      <path d="M36 44 Q36 38 42 36 L58 36 Q64 38 64 44" fill="none" stroke="#ea580c" strokeWidth="2"/>
      <path d="M38 44 Q38 40 44 38 L56 38 Q62 40 62 44" fill="none" stroke="#c2410c" strokeWidth="0.8" opacity="0.3"/>
      {/* Hoodie front zipper */}
      <line x1="50" y1="44" x2="50" y2="78" stroke="#c2410c" strokeWidth="0.8" opacity="0.3"/>
      {/* Hoodie pocket — kangaroo style */}
      <path d="M38 66 Q38 72 44 72 L56 72 Q62 72 62 66" fill="none" stroke="#c2410c" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M38 66 L62 66" stroke="#c2410c" strokeWidth="0.6" opacity="0.3"/>
      {/* Hoodie strings with aglets */}
      <line x1="44" y1="44" x2="42" y2="56" stroke="#fdba74" strokeWidth="1"/>
      <line x1="56" y1="44" x2="58" y2="56" stroke="#fdba74" strokeWidth="1"/>
      <circle cx="42" cy="56.5" r="1" fill="#d97706" opacity="0.4"/>
      <circle cx="58" cy="56.5" r="1" fill="#d97706" opacity="0.4"/>
      {/* Logo on chest */}
      <text x="50" y="60" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="8" fill="#431407" opacity="0.5">HYPE</text>
      {/* Arms */}
      <path d="M30 50 Q18 54 12 48" fill="none" stroke="#ea580c" strokeWidth="7" strokeLinecap="round"/>
      <path d="M70 50 Q82 44 88 36" fill="none" stroke="#ea580c" strokeWidth="7" strokeLinecap="round"/>
      {/* Sleeve ribbing */}
      <circle cx="12" cy="48" r="5" fill="none" stroke="#c2410c" strokeWidth="0.8" opacity="0.3"/>
      {/* Megaphone in right hand — detailed */}
      <path d="M86 34 L97 25 L97 47 L86 38 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
      <rect x="82" y="33" width="6" height="7" rx="2" fill="#f59e0b"/>
      {/* Megaphone grip ridges */}
      <line x1="83" y1="35" x2="87" y2="35" stroke="#d97706" strokeWidth="0.4" opacity="0.3"/>
      <line x1="83" y1="37" x2="87" y2="37" stroke="#d97706" strokeWidth="0.4" opacity="0.3"/>
      {/* Megaphone interior */}
      <ellipse cx="97" cy="36" rx="1" ry="10" fill="none" stroke="#d97706" strokeWidth="0.5" opacity="0.3"/>
      {/* Sound waves — animated */}
      <path d="M97 30 Q101 36 97 42" fill="none" stroke="#fdba74" strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1s" repeatCount="indefinite"/>
      </path>
      <path d="M99 26 Q105 36 99 46" fill="none" stroke="#fdba74" strokeWidth="1" strokeLinecap="round" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.05;0.3" dur="1.2s" repeatCount="indefinite"/>
      </path>
      {/* Left hand — pointing up (finger gun) */}
      <circle cx="12" cy="46" r="4" fill="#fcd9a8"/>
      <line x1="12" y1="42" x2="12" y2="35" stroke="#fcd9a8" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="15" y1="44" x2="18" y2="42" stroke="#fcd9a8" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Legs — joggers */}
      <rect x="38" y="80" width="10" height="10" rx="3" fill="#431407"/>
      <rect x="52" y="80" width="10" height="10" rx="3" fill="#431407"/>
      {/* Jogger stripes */}
      <line x1="38" y1="84" x2="48" y2="84" stroke="#fb923c" strokeWidth="0.6" opacity="0.25"/>
      <line x1="52" y1="84" x2="62" y2="84" stroke="#fb923c" strokeWidth="0.6" opacity="0.25"/>
      {/* Sneakers — hype beast with detail */}
      <rect x="36" y="88" width="14" height="6" rx="3" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8"/>
      <rect x="52" y="88" width="14" height="6" rx="3" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8"/>
      {/* Shoe detail — chunky sole */}
      <rect x="36" y="92" width="14" height="2" rx="1" fill="#f59e0b" opacity="0.5"/>
      <rect x="52" y="92" width="14" height="2" rx="1" fill="#f59e0b" opacity="0.5"/>
      {/* Lace pattern */}
      <path d="M39 89 L41 91 M43 89 L45 91" stroke="#92400e" strokeWidth="0.4" opacity="0.4"/>
      <path d="M55 89 L57 91 M59 89 L61 91" stroke="#92400e" strokeWidth="0.4" opacity="0.4"/>
      {/* Head */}
      <circle cx="50" cy="28" r="16" fill="url(#soc-skin)"/>
      {/* Hair — cool spiky with more definition */}
      <path d="M34 24 Q36 10 44 8 L42 18 Q46 10 50 5 Q54 10 58 18 L56 8 Q64 10 66 24" fill="#431407"/>
      <path d="M34 24 Q38 20 42 18 Q46 14 50 12 Q54 14 58 18 Q62 20 66 24" fill="#2d1507"/>
      {/* Hair highlight streaks */}
      <path d="M44 10 L43 16" stroke="#5c3310" strokeWidth="0.6" opacity="0.3"/>
      <path d="M56 10 L57 16" stroke="#5c3310" strokeWidth="0.6" opacity="0.3"/>
      <path d="M50 6 L50 12" stroke="#5c3310" strokeWidth="0.5" opacity="0.3"/>
      {/* Sunglasses — aviator style */}
      <rect x="34" y="24" width="14" height="9" rx="3" fill="#1a1a2e" stroke="#431407" strokeWidth="1.2"/>
      <rect x="52" y="24" width="14" height="9" rx="3" fill="#1a1a2e" stroke="#431407" strokeWidth="1.2"/>
      <line x1="48" y1="28" x2="52" y2="28" stroke="#431407" strokeWidth="1.5"/>
      <line x1="34" y1="28" x2="30" y2="26" stroke="#431407" strokeWidth="1"/>
      <line x1="66" y1="28" x2="70" y2="26" stroke="#431407" strokeWidth="1"/>
      {/* Lens gradient shine */}
      <rect x="35" y="25" width="5" height="2" rx="1" fill="white" opacity="0.15"/>
      <rect x="53" y="25" width="5" height="2" rx="1" fill="white" opacity="0.15"/>
      {/* Big grin — teeth */}
      <path d="M40 38 Q50 44 60 38" fill="white" stroke="#431407" strokeWidth="1.2"/>
      <path d="M42 38 Q50 42 58 38" fill="#fca5a5" opacity="0.4"/>
      {/* Tooth lines */}
      <line x1="46" y1="38" x2="46" y2="40" stroke="#e5e5e5" strokeWidth="0.3" opacity="0.4"/>
      <line x1="50" y1="38" x2="50" y2="41" stroke="#e5e5e5" strokeWidth="0.3" opacity="0.4"/>
      <line x1="54" y1="38" x2="54" y2="40" stroke="#e5e5e5" strokeWidth="0.3" opacity="0.4"/>
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
      {/* Book stack left — with spine details */}
      <rect x="12" y="68" width="22" height="6" rx="1.5" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" transform="rotate(-5 23 71)"/>
      <rect x="12" y="68" width="3" height="6" rx="0.5" fill="#b45309" opacity="0.3" transform="rotate(-5 23 71)"/>
      <rect x="10" y="62" width="24" height="6" rx="1.5" fill="#f87171" stroke="#dc2626" strokeWidth="0.8" transform="rotate(2 22 65)"/>
      <rect x="10" y="62" width="3" height="6" rx="0.5" fill="#991b1b" opacity="0.3" transform="rotate(2 22 65)"/>
      <rect x="11" y="56" width="22" height="6" rx="1.5" fill="#60a5fa" stroke="#2563eb" strokeWidth="0.8" transform="rotate(-3 22 59)"/>
      <rect x="11" y="56" width="3" height="6" rx="0.5" fill="#1d4ed8" opacity="0.3" transform="rotate(-3 22 59)"/>
      {/* Book stack right — with labels */}
      <rect x="68" y="70" width="20" height="5" rx="1.5" fill="#c084fc" stroke="#7c3aed" strokeWidth="0.8" transform="rotate(3 78 72)"/>
      <rect x="66" y="65" width="22" height="5" rx="1.5" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" transform="rotate(-2 77 67)"/>
      <rect x="67" y="60" width="18" height="5" rx="1.5" fill="#4ade80" stroke="#16a34a" strokeWidth="0.8" transform="rotate(1 76 62)"/>
      {/* Body — cozy sweater vest */}
      <path d="M32 50 Q30 46 38 44 L62 44 Q70 46 68 50 L70 82 Q70 88 50 88 Q30 88 30 82 Z" fill="url(#rag-body)" stroke="#047857" strokeWidth="1.2"/>
      {/* Sweater knit texture */}
      <path d="M36 56 Q38 54 40 56 Q42 58 44 56" fill="none" stroke="#d1fae5" strokeWidth="0.5" opacity="0.2"/>
      <path d="M56 56 Q58 54 60 56 Q62 58 64 56" fill="none" stroke="#d1fae5" strokeWidth="0.5" opacity="0.2"/>
      {/* Sweater V pattern */}
      <path d="M44 44 L50 56 L56 44" fill="none" stroke="#d1fae5" strokeWidth="1.5"/>
      {/* Shirt collar — button-up visible */}
      <path d="M44 44 L42 48" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M56 44 L58 48" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Collar button */}
      <circle cx="50" cy="45" r="0.8" fill="#d1fae5" opacity="0.5"/>
      {/* Elbow patches */}
      <ellipse cx="24" cy="58" rx="3" ry="4" fill="#047857" opacity="0.3"/>
      <ellipse cx="76" cy="58" rx="3" ry="4" fill="#047857" opacity="0.3"/>
      {/* Arms */}
      <path d="M32 50 Q24 56 22 66" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round"/>
      <path d="M68 50 Q76 56 78 66" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round"/>
      {/* Hands holding open book — detailed */}
      <rect x="28" y="66" width="44" height="14" rx="2" fill="#fef3c7" stroke="#d97706" strokeWidth="1"/>
      {/* Book spine */}
      <line x1="50" y1="66" x2="50" y2="80" stroke="#b45309" strokeWidth="1"/>
      {/* Page text lines — left page */}
      <line x1="32" y1="70" x2="46" y2="70" stroke="#d97706" strokeWidth="0.5" opacity="0.4"/>
      <line x1="32" y1="72.5" x2="44" y2="72.5" stroke="#d97706" strokeWidth="0.5" opacity="0.35"/>
      <line x1="32" y1="75" x2="45" y2="75" stroke="#d97706" strokeWidth="0.5" opacity="0.3"/>
      <line x1="32" y1="77.5" x2="42" y2="77.5" stroke="#d97706" strokeWidth="0.5" opacity="0.25"/>
      {/* Page text lines — right page */}
      <line x1="54" y1="70" x2="68" y2="70" stroke="#d97706" strokeWidth="0.5" opacity="0.4"/>
      <line x1="54" y1="72.5" x2="66" y2="72.5" stroke="#d97706" strokeWidth="0.5" opacity="0.35"/>
      <line x1="54" y1="75" x2="67" y2="75" stroke="#d97706" strokeWidth="0.5" opacity="0.3"/>
      <line x1="54" y1="77.5" x2="64" y2="77.5" stroke="#d97706" strokeWidth="0.5" opacity="0.25"/>
      {/* Page corner curl */}
      <path d="M70 66 L72 66 L70 68 Z" fill="#fde68a" stroke="#d97706" strokeWidth="0.3"/>
      {/* Bookmark */}
      <line x1="48" y1="66" x2="47" y2="62" stroke="#ef4444" strokeWidth="1" opacity="0.4"/>
      {/* Feet — loafers */}
      <ellipse cx="42" cy="90" rx="7" ry="3" fill="#047857"/><ellipse cx="58" cy="90" rx="7" ry="3" fill="#047857"/>
      {/* Head */}
      <circle cx="50" cy="28" r="18" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1"/>
      {/* Hair — tidy with part and texture */}
      <path d="M32 24 Q34 12 50 10 Q66 12 68 24 Q66 18 56 14 Q50 12 44 14 Q34 18 32 24Z" fill="#065f46"/>
      <path d="M50 10 Q52 14 50 24" fill="none" stroke="#047857" strokeWidth="0.8" opacity="0.3"/>
      {/* Hair texture */}
      <path d="M38 16 Q40 14 42 16" stroke="#04543e" strokeWidth="0.4" opacity="0.3"/>
      <path d="M58 16 Q60 14 62 16" stroke="#04543e" strokeWidth="0.4" opacity="0.3"/>
      {/* Giant round glasses — thick frame */}
      <circle cx="41" cy="30" r="9" fill="none" stroke="#065f46" strokeWidth="2.2"/>
      <circle cx="59" cy="30" r="9" fill="none" stroke="#065f46" strokeWidth="2.2"/>
      <line x1="50" y1="30" x2="50" y2="30" stroke="#065f46" strokeWidth="2.5"/>
      <line x1="32" y1="28" x2="28" y2="26" stroke="#065f46" strokeWidth="1.5"/>
      <line x1="68" y1="28" x2="72" y2="26" stroke="#065f46" strokeWidth="1.5"/>
      {/* Lens reflections */}
      <ellipse cx="37" cy="27" rx="3" ry="2" fill="white" opacity="0.12"/>
      <ellipse cx="55" cy="27" rx="3" ry="2" fill="white" opacity="0.12"/>
      {/* Eyes — wide curious reading */}
      <ellipse cx="41" cy="31" rx="4.5" ry="5" fill="#022c22"/>
      <ellipse cx="59" cy="31" rx="4.5" ry="5" fill="#022c22"/>
      <circle cx="43" cy="29.5" r="1.8" fill="white"/><circle cx="61" cy="29.5" r="1.8" fill="white"/>
      <circle cx="41" cy="32.5" r="0.8" fill="white" opacity="0.4"/><circle cx="59" cy="32.5" r="0.8" fill="white" opacity="0.4"/>
      {/* Reading focus — slightly narrowed bottom */}
      <path d="M37 34 Q41 36 45 34" fill="#ecfdf5" opacity="0.15"/>
      <path d="M55 34 Q59 36 63 34" fill="#ecfdf5" opacity="0.15"/>
      {/* Subtle brows — concentrated */}
      <path d="M34 22 Q41 19 48 22" fill="none" stroke="#065f46" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M52 22 Q59 19 66 22" fill="none" stroke="#065f46" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Soft knowing smile */}
      <path d="M45 38 Q50 41 55 38" fill="none" stroke="#065f46" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Blush */}
      <ellipse cx="35" cy="36" rx="3" ry="1.5" fill="#a7f3d0" opacity="0.5"/>
      <ellipse cx="65" cy="36" rx="3" ry="1.5" fill="#a7f3d0" opacity="0.5"/>
    </svg>
  ),

  /* ── The Medic — Office medic chibi with shield, alert eyes ── */
  medic: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="err-armor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#dc2626"/></linearGradient>
        <linearGradient id="err-shield" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fecaca"/><stop offset="100%" stopColor="#fca5a5"/></linearGradient>
        <linearGradient id="err-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fcd9a8"/><stop offset="100%" stopColor="#e8b878"/></linearGradient>
      </defs>
      {/* Shield in left hand — large, detailed */}
      <path d="M10 38 L10 58 Q10 78 26 84 Q42 78 42 58 L42 38 Z" fill="url(#err-shield)" stroke="#dc2626" strokeWidth="2"/>
      {/* Shield rim detail */}
      <path d="M12 40 L12 57 Q12 76 26 82 Q40 76 40 57 L40 40 Z" fill="none" stroke="#f87171" strokeWidth="0.5" opacity="0.3"/>
      {/* Cross lines on shield */}
      <path d="M26 42 L26 74" stroke="#f87171" strokeWidth="1" opacity="0.3"/>
      <path d="M14 56 L38 56" stroke="#f87171" strokeWidth="1" opacity="0.3"/>
      {/* Warning triangle on shield — beveled */}
      <path d="M26 47 L34 61 L18 61 Z" fill="#facc15" stroke="#eab308" strokeWidth="1.2"/>
      <path d="M26 49 L32 59 L20 59 Z" fill="none" stroke="#fde68a" strokeWidth="0.5" opacity="0.3"/>
      <line x1="26" y1="52" x2="26" y2="56" stroke="#78350f" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="26" cy="58.5" r="1" fill="#78350f"/>
      {/* Shield rivets */}
      <circle cx="14" cy="42" r="1.2" fill="#dc2626" opacity="0.5"/>
      <circle cx="38" cy="42" r="1.2" fill="#dc2626" opacity="0.5"/>
      <circle cx="26" cy="80" r="1.2" fill="#dc2626" opacity="0.5"/>
      {/* Body — layered armor */}
      <path d="M38 48 Q36 44 44 42 L66 42 Q74 44 72 48 L74 78 Q74 84 56 84 Q38 84 36 78 Z" fill="url(#err-armor)" stroke="#b91c1c" strokeWidth="1.2"/>
      {/* Armor plate lines */}
      <path d="M42 48 L42 62" stroke="#b91c1c" strokeWidth="0.5" opacity="0.3"/>
      <path d="M68 48 L68 62" stroke="#b91c1c" strokeWidth="0.5" opacity="0.3"/>
      {/* Chest plate — V shape */}
      <path d="M46 44 L56 44 L58 54 Q52 58 46 54 Z" fill="#fecaca" stroke="#f87171" strokeWidth="0.8"/>
      {/* Chest plate inner detail */}
      <path d="M48 46 L54 46 L56 52 Q52 55 48 52 Z" fill="none" stroke="#f87171" strokeWidth="0.4" opacity="0.3"/>
      {/* Shoulder pauldrons */}
      <ellipse cx="40" cy="46" rx="6" ry="3" fill="#dc2626" stroke="#b91c1c" strokeWidth="0.6"/>
      <ellipse cx="70" cy="46" rx="6" ry="3" fill="#dc2626" stroke="#b91c1c" strokeWidth="0.6"/>
      {/* Belt — with utility pouch */}
      <rect x="40" y="62" width="30" height="4" rx="2" fill="#7f1d1d"/>
      <rect x="52" y="61" width="6" height="6" rx="1.5" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8"/>
      {/* Belt pouch */}
      <rect x="62" y="62" width="5" height="4" rx="1" fill="#991b1b" stroke="#7f1d1d" strokeWidth="0.5"/>
      {/* Arms — armored */}
      <path d="M38 50 Q30 52 28 60" fill="none" stroke="#dc2626" strokeWidth="7" strokeLinecap="round"/>
      <path d="M72 50 Q82 54 86 62" fill="none" stroke="#dc2626" strokeWidth="7" strokeLinecap="round"/>
      {/* Arm armor rings */}
      <path d="M30 54 Q32 56 30 58" stroke="#b91c1c" strokeWidth="0.5" opacity="0.3"/>
      <path d="M82 56 Q84 58 82 60" stroke="#b91c1c" strokeWidth="0.5" opacity="0.3"/>
      {/* Gauntlet on right hand */}
      <circle cx="86" cy="64" r="5" fill="#dc2626" stroke="#b91c1c" strokeWidth="0.8"/>
      <circle cx="86" cy="64" r="3" fill="#fcd9a8"/>
      {/* Legs — greaves */}
      <rect x="44" y="78" width="10" height="10" rx="3" fill="#991b1b"/>
      <rect x="58" y="78" width="10" height="10" rx="3" fill="#991b1b"/>
      {/* Knee guards */}
      <ellipse cx="49" cy="80" rx="4" ry="2" fill="#b91c1c" opacity="0.4"/>
      <ellipse cx="63" cy="80" rx="4" ry="2" fill="#b91c1c" opacity="0.4"/>
      {/* Boots — armored with buckles */}
      <rect x="42" y="86" width="14" height="7" rx="3" fill="#7f1d1d" stroke="#991b1b" strokeWidth="0.8"/>
      <rect x="56" y="86" width="14" height="7" rx="3" fill="#7f1d1d" stroke="#991b1b" strokeWidth="0.8"/>
      {/* Boot armor plates */}
      <rect x="44" y="87" width="4" height="2" rx="0.5" fill="#991b1b" opacity="0.4"/>
      <rect x="58" y="87" width="4" height="2" rx="0.5" fill="#991b1b" opacity="0.4"/>
      {/* Boot toe guards */}
      <path d="M42 91 Q49 93 55 91" fill="none" stroke="#991b1b" strokeWidth="0.5" opacity="0.3"/>
      <path d="M56 91 Q63 93 69 91" fill="none" stroke="#991b1b" strokeWidth="0.5" opacity="0.3"/>
      {/* Head */}
      <circle cx="56" cy="28" r="16" fill="url(#err-skin)"/>
      {/* Scar on cheek */}
      <path d="M66 32 L69 35" stroke="#d4a574" strokeWidth="0.8" opacity="0.4"/>
      {/* Helmet — more detailed */}
      <path d="M40 24 Q42 10 56 8 Q70 10 72 24 L72 28 Q72 20 56 16 Q42 20 40 28 Z" fill="#991b1b"/>
      <path d="M40 28 L72 28" stroke="#b91c1c" strokeWidth="2"/>
      {/* Helmet visor ridge */}
      <path d="M42 26 L70 26" stroke="#7f1d1d" strokeWidth="0.8" opacity="0.5"/>
      {/* Helmet rivet line */}
      <circle cx="44" cy="24" r="0.8" fill="#b91c1c" opacity="0.4"/>
      <circle cx="56" cy="22" r="0.8" fill="#b91c1c" opacity="0.4"/>
      <circle cx="68" cy="24" r="0.8" fill="#b91c1c" opacity="0.4"/>
      {/* Helmet crest — plume */}
      <path d="M56 8 Q56 2 55 0 Q58 4 60 8" fill="#dc2626"/>
      <path d="M56 8 Q54 3 56 0" fill="none" stroke="#f87171" strokeWidth="0.4" opacity="0.3"/>
      {/* Alert eyes — scanning */}
      <ellipse cx="49" cy="28" rx="5" ry="5.5" fill="white" stroke="#7f1d1d" strokeWidth="0.8"/>
      <ellipse cx="63" cy="28" rx="5" ry="5.5" fill="white" stroke="#7f1d1d" strokeWidth="0.8"/>
      <ellipse cx="50" cy="29" rx="3" ry="3.5" fill="#dc2626"/>
      <ellipse cx="64" cy="29" rx="3" ry="3.5" fill="#dc2626"/>
      <circle cx="51.5" cy="27.5" r="1.3" fill="white"/><circle cx="65.5" cy="27.5" r="1.3" fill="white"/>
      {/* Serious furrowed brows */}
      <path d="M44 22 Q49 19.5 54 23" fill="none" stroke="#7f1d1d" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M58 23 Q63 19.5 68 22" fill="none" stroke="#7f1d1d" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Determined mouth — slight frown */}
      <path d="M51 36 Q56 35 61 36" fill="none" stroke="#7f1d1d" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  /* ── Old Ways Today — Nature sage chibi with leaf crown, herb pouch, earthy robes ── */
  oldways: (s) => (
    <svg viewBox="0 0 100 100" width={s} height={s}>
      <defs>
        <linearGradient id="ow-robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d97706"/><stop offset="100%" stopColor="#92400e"/></linearGradient>
        <linearGradient id="ow-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fef3c7"/><stop offset="100%" stopColor="#fde68a"/></linearGradient>
      </defs>
      {/* Trailing vine behind — with leaves */}
      <path d="M18 92 Q14 82 16 72 Q20 62 18 52" fill="none" stroke="#16a34a" strokeWidth="1.5" opacity="0.35"/>
      <path d="M16 72 Q14 70 12 72 Q14 74 16 72Z" fill="#bbf7d0" opacity="0.4"/>
      <path d="M18 62 Q16 60 14 62 Q16 64 18 62Z" fill="#bbf7d0" opacity="0.35"/>
      <circle cx="17" cy="56" r="2" fill="#dcfce7" opacity="0.3"/>
      {/* Robe body — layered with embroidery */}
      <path d="M30 52 Q28 48 36 46 L64 46 Q72 48 70 52 L74 90 Q74 96 50 96 Q26 96 26 90 Z" fill="url(#ow-robe)" stroke="#78350f" strokeWidth="1.2"/>
      {/* Robe fold lines */}
      <path d="M38 54 Q40 72 36 92" stroke="#78350f" strokeWidth="0.5" opacity="0.2"/>
      <path d="M62 54 Q60 72 64 92" stroke="#78350f" strokeWidth="0.5" opacity="0.2"/>
      {/* Robe embroidery — vine pattern */}
      <path d="M36 62 Q42 58 48 62 Q54 58 60 62" fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.35"/>
      <path d="M34 72 Q40 68 46 72 Q52 68 58 72 Q64 68 68 72" fill="none" stroke="#fbbf24" strokeWidth="0.7" opacity="0.25"/>
      {/* Small embroidered leaf motifs */}
      <path d="M44 60 Q46 58 48 60 Q46 62 44 60Z" fill="#16a34a" opacity="0.2"/>
      <path d="M54 60 Q56 58 58 60 Q56 62 54 60Z" fill="#16a34a" opacity="0.2"/>
      {/* Robe hem — decorative border */}
      <path d="M28 90 Q34 88 38 90 Q42 92 46 90 Q50 88 54 90 Q58 92 62 90 Q66 88 72 90" fill="none" stroke="#fbbf24" strokeWidth="0.6" opacity="0.3"/>
      {/* Belt / sash — woven cord */}
      <path d="M34 64 Q50 68 66 64" fill="none" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M36 63 Q50 67 64 63" fill="none" stroke="#92400e" strokeWidth="0.5" opacity="0.3"/>
      {/* Herb pouch on belt — with drawstring */}
      <path d="M60 64 Q64 66 66 72 Q62 74 58 70 Z" fill="#92400e" stroke="#78350f" strokeWidth="0.8"/>
      <path d="M60 65 L62 64" stroke="#78350f" strokeWidth="0.5" opacity="0.4"/>
      <circle cx="62" cy="68" r="1.5" fill="#16a34a"/>
      {/* Second small pouch */}
      <path d="M38 65 Q36 68 38 70 Q40 68 38 65Z" fill="#7f5520" stroke="#78350f" strokeWidth="0.5"/>
      {/* Arms — robed */}
      <path d="M30 52 Q22 58 18 66" fill="none" stroke="#b45309" strokeWidth="6" strokeLinecap="round"/>
      <path d="M70 52 Q78 56 82 64" fill="none" stroke="#b45309" strokeWidth="6" strokeLinecap="round"/>
      {/* Sleeve trim */}
      <circle cx="18" cy="66" r="4.5" fill="none" stroke="#d97706" strokeWidth="0.8" opacity="0.3"/>
      {/* Left hand — holding herb bundle, detailed */}
      <circle cx="18" cy="68" r="4" fill="#fef3c7"/>
      <path d="M16 68 Q14 60 12 54" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 68 Q18 58 20 52" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M20 68 Q22 60 24 56" stroke="#16a34a" strokeWidth="1" strokeLinecap="round"/>
      {/* Herb leaf clusters */}
      <path d="M12 54 Q10 52 8 54 Q10 56 12 54Z" fill="#bbf7d0" opacity="0.6"/>
      <path d="M20 52 Q18 50 16 52 Q18 54 20 52Z" fill="#dcfce7" opacity="0.5"/>
      <path d="M24 56 Q22 54 20 56 Q22 58 24 56Z" fill="#bbf7d0" opacity="0.5"/>
      {/* Lavender sprig */}
      <path d="M14 56 Q13 52 14 48" stroke="#a78bfa" strokeWidth="0.8" opacity="0.4"/>
      <circle cx="14" cy="49" r="1" fill="#c084fc" opacity="0.4"/>
      <circle cx="13.5" cy="51" r="0.8" fill="#c084fc" opacity="0.3"/>
      {/* Right hand — open palm with floating leaf */}
      <circle cx="82" cy="66" r="4" fill="#fef3c7"/>
      {/* Floating leaf — gently bobbing */}
      <path d="M86 56 Q90 52 88 48 Q86 52 82 54 Z" fill="#16a34a" opacity="0.5">
        <animateTransform attributeName="transform" type="translate" values="0 0;1 -2;0 0;-1 2;0 0" dur="3s" repeatCount="indefinite"/>
      </path>
      {/* Feet — sandals */}
      <ellipse cx="42" cy="96" rx="7" ry="3" fill="#78350f"/>
      <ellipse cx="58" cy="96" rx="7" ry="3" fill="#78350f"/>
      {/* Sandal strap */}
      <path d="M39 95 Q42 93 45 95" fill="none" stroke="#5c2d0e" strokeWidth="0.5" opacity="0.4"/>
      <path d="M55 95 Q58 93 61 95" fill="none" stroke="#5c2d0e" strokeWidth="0.5" opacity="0.4"/>
      {/* Head */}
      <circle cx="50" cy="30" r="17" fill="url(#ow-skin)"/>
      {/* Hair — long, flowing, earthy with braids */}
      <path d="M33 26 Q36 14 50 12 Q64 14 67 26" fill="#78350f"/>
      <path d="M33 26 Q30 36 28 48" fill="none" stroke="#78350f" strokeWidth="4" strokeLinecap="round"/>
      <path d="M67 26 Q70 36 72 48" fill="none" stroke="#78350f" strokeWidth="4" strokeLinecap="round"/>
      {/* Small braid detail on side */}
      <path d="M29 36 Q30 38 29 40 Q28 42 29 44" stroke="#5c2d0e" strokeWidth="0.6" opacity="0.3"/>
      <path d="M71 36 Q72 38 71 40 Q70 42 71 44" stroke="#5c2d0e" strokeWidth="0.6" opacity="0.3"/>
      {/* Leaf crown — detailed */}
      <path d="M34 18 Q38 10 44 14 Q42 8 50 8 Q58 8 56 14 Q62 10 66 18" fill="#16a34a" stroke="#15803d" strokeWidth="1"/>
      <path d="M38 16 Q40 12 44 14" fill="#22c55e"/><path d="M56 14 Q60 12 62 16" fill="#22c55e"/>
      <path d="M44 14 Q48 10 50 8 Q52 10 56 14" fill="#15803d"/>
      {/* Crown leaf veins */}
      <path d="M40 14 L42 12" stroke="#065f46" strokeWidth="0.3" opacity="0.3"/>
      <path d="M60 14 L58 12" stroke="#065f46" strokeWidth="0.3" opacity="0.3"/>
      {/* Flower in crown — more detailed */}
      <circle cx="50" cy="9.5" r="3" fill="#fbbf24"/>
      <circle cx="50" cy="9.5" r="1.5" fill="#f59e0b"/>
      {/* Flower petals */}
      <circle cx="48" cy="8" r="1" fill="#fde68a" opacity="0.5"/>
      <circle cx="52" cy="8" r="1" fill="#fde68a" opacity="0.5"/>
      <circle cx="48" cy="11" r="1" fill="#fde68a" opacity="0.5"/>
      <circle cx="52" cy="11" r="1" fill="#fde68a" opacity="0.5"/>
      {/* Eyes — warm and wise */}
      <ellipse cx="43" cy="30" rx="5" ry="5.5" fill="white" stroke="#78350f" strokeWidth="0.8"/>
      <ellipse cx="57" cy="30" rx="5" ry="5.5" fill="white" stroke="#78350f" strokeWidth="0.8"/>
      <ellipse cx="44" cy="31" rx="3" ry="3.5" fill="#92400e"/>
      <ellipse cx="58" cy="31" rx="3" ry="3.5" fill="#92400e"/>
      <circle cx="45.5" cy="29.5" r="1.3" fill="white"/><circle cx="59.5" cy="29.5" r="1.3" fill="white"/>
      <circle cx="43" cy="32.5" r="0.6" fill="white" opacity="0.4"/><circle cx="57" cy="32.5" r="0.6" fill="white" opacity="0.4"/>
      {/* Crow's feet — wisdom lines */}
      <path d="M36 30 L38 30.5" stroke="#b45309" strokeWidth="0.3" opacity="0.2"/>
      <path d="M62 30.5 L64 30" stroke="#b45309" strokeWidth="0.3" opacity="0.2"/>
      {/* Gentle wise brows */}
      <path d="M38 24 Q43 22 48 25" fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M52 25 Q57 22 62 24" fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Warm knowing smile */}
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
      {/* Headset band — detailed with cushion */}
      <path d="M26 22 Q50 8 74 22" fill="none" stroke="#71717a" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M26 22 Q50 10 74 22" fill="none" stroke="#a1a1aa" strokeWidth="0.5" opacity="0.2"/>
      {/* Headset earpieces — detailed */}
      <rect x="19" y="19" width="11" height="16" rx="4" fill="#52525b" stroke="#71717a" strokeWidth="1"/>
      <rect x="70" y="19" width="11" height="16" rx="4" fill="#52525b" stroke="#71717a" strokeWidth="1"/>
      {/* Earpiece cushions */}
      <rect x="21" y="22" width="7" height="10" rx="3" fill="#3f3f46" opacity="0.5"/>
      <rect x="72" y="22" width="7" height="10" rx="3" fill="#3f3f46" opacity="0.5"/>
      {/* Earpiece indicators */}
      <circle cx="25" cy="27" r="2" fill="#c9a84c"/><circle cx="75" cy="27" r="2" fill="#c9a84c"/>
      <circle cx="25" cy="27" r="1" fill="#fde68a" opacity="0.5"/><circle cx="75" cy="27" r="1" fill="#fde68a" opacity="0.5"/>
      {/* Mic boom — with flex joint */}
      <path d="M20 30 Q14 36 16 42" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="18" cy="34" r="1.5" fill="#52525b"/>
      <circle cx="16" cy="44" r="3.5" fill="#52525b" stroke="#c9a84c" strokeWidth="1"/>
      {/* Mic mesh */}
      <circle cx="16" cy="44" r="2" fill="none" stroke="#71717a" strokeWidth="0.4"/>
      {/* Head — rounded robot */}
      <rect x="28" y="16" width="44" height="34" rx="12" fill="url(#fbot-body)" stroke="#9e7e2e" strokeWidth="1.5"/>
      {/* Head panel seams */}
      <path d="M34 16 L34 22" stroke="#9e7e2e" strokeWidth="0.4" opacity="0.3"/>
      <path d="M66 16 L66 22" stroke="#9e7e2e" strokeWidth="0.4" opacity="0.3"/>
      {/* Face screen — with bezel */}
      <rect x="32" y="21" width="36" height="24" rx="8" fill="#1a1525" opacity="0.5"/>
      <rect x="33" y="22" width="34" height="22" rx="7" fill="url(#fbot-screen)"/>
      {/* Eyes on screen — with blink */}
      <ellipse cx="43" cy="31" rx="4.5" ry="5" fill="#c9a84c" opacity="0.9"><animate attributeName="ry" values="5;5;0.5;5;5" dur="5s" repeatCount="indefinite" keyTimes="0;0.45;0.5;0.55;1"/></ellipse>
      <ellipse cx="57" cy="31" rx="4.5" ry="5" fill="#c9a84c" opacity="0.9"><animate attributeName="ry" values="5;5;0.5;5;5" dur="5s" repeatCount="indefinite" keyTimes="0;0.45;0.5;0.55;1"/></ellipse>
      <ellipse cx="43" cy="31" rx="2.5" ry="3" fill="#fde68a"/>
      <ellipse cx="57" cy="31" rx="2.5" ry="3" fill="#fde68a"/>
      <circle cx="44.5" cy="29.5" r="1" fill="white"/><circle cx="58.5" cy="29.5" r="1" fill="white"/>
      {/* Happy mouth */}
      <path d="M45 38 Q50 42 55 38" fill="none" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Status LED */}
      <circle cx="36" cy="40" r="1.2" fill="#4ade80"><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/></circle>
      {/* Body */}
      <rect x="34" y="50" width="32" height="22" rx="7" fill="url(#fbot-body)" stroke="#9e7e2e" strokeWidth="1"/>
      {/* Body panel lines */}
      <path d="M40 50 L40 55" stroke="#9e7e2e" strokeWidth="0.4" opacity="0.3"/>
      <path d="M60 50 L60 55" stroke="#9e7e2e" strokeWidth="0.4" opacity="0.3"/>
      {/* Discord-style gamepad emblem */}
      <circle cx="50" cy="58" r="4" fill="#0c0a0e" stroke="#c9a84c" strokeWidth="0.8"/>
      <path d="M47 58 L49 56 L51 58 L53 56" fill="none" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round"/>
      {/* Card icon below — with suit */}
      <rect x="46" y="64" width="8" height="6" rx="1" fill="#fde68a" stroke="#c9a84c" strokeWidth="0.6" opacity="0.5"/>
      <text x="50" y="69" textAnchor="middle" fontSize="4" fill="#9e7e2e" opacity="0.5" fontFamily="sans-serif">♦</text>
      {/* Chest rivets */}
      <circle cx="38" cy="54" r="0.8" fill="#9e7e2e" opacity="0.4"/>
      <circle cx="62" cy="54" r="0.8" fill="#9e7e2e" opacity="0.4"/>
      {/* Arms — with joint detail */}
      <rect x="24" y="52" width="10" height="14" rx="5" fill="#9e7e2e" stroke="#c9a84c" strokeWidth="0.8"/>
      <rect x="66" y="52" width="10" height="14" rx="5" fill="#9e7e2e" stroke="#c9a84c" strokeWidth="0.8"/>
      {/* Arm joints */}
      <ellipse cx="29" cy="56" rx="5" ry="1.2" fill="none" stroke="#c9a84c" strokeWidth="0.4" opacity="0.3"/>
      <ellipse cx="71" cy="56" rx="5" ry="1.2" fill="none" stroke="#c9a84c" strokeWidth="0.4" opacity="0.3"/>
      {/* Hands */}
      <circle cx="29" cy="66" r="3.5" fill="#c9a84c" stroke="#9e7e2e" strokeWidth="0.8"/>
      <circle cx="71" cy="66" r="3.5" fill="#c9a84c" stroke="#9e7e2e" strokeWidth="0.8"/>
      {/* Legs */}
      <rect x="39" y="70" width="9" height="10" rx="3" fill="#9e7e2e"/>
      <rect x="52" y="70" width="9" height="10" rx="3" fill="#9e7e2e"/>
      {/* Knee joints */}
      <ellipse cx="43.5" cy="74" rx="4.5" ry="1" fill="none" stroke="#c9a84c" strokeWidth="0.4" opacity="0.3"/>
      <ellipse cx="56.5" cy="74" rx="4.5" ry="1" fill="none" stroke="#c9a84c" strokeWidth="0.4" opacity="0.3"/>
      {/* Feet */}
      <rect x="37" y="78" width="12" height="5" rx="2.5" fill="#c9a84c" stroke="#9e7e2e" strokeWidth="0.6"/>
      <rect x="51" y="78" width="12" height="5" rx="2.5" fill="#c9a84c" stroke="#9e7e2e" strokeWidth="0.6"/>
      {/* Foot grip */}
      <line x1="39" y1="81" x2="42" y2="81" stroke="#9e7e2e" strokeWidth="0.4" opacity="0.3"/>
      <line x1="53" y1="81" x2="56" y2="81" stroke="#9e7e2e" strokeWidth="0.4" opacity="0.3"/>
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
      {/* Shield in left hand — detailed */}
      <path d="M8 36 L8 56 Q8 74 24 80 Q40 74 40 56 L40 36 Z" fill="url(#fab-shield)" stroke="#D9A05B" strokeWidth="2"/>
      {/* Shield inner border */}
      <path d="M11 38 L11 55 Q11 72 24 78 Q37 72 37 55 L37 38 Z" fill="none" stroke="#D9A05B" strokeWidth="0.5" opacity="0.2"/>
      {/* Stats bars on shield — with labels */}
      <rect x="14" y="54" width="4" height="10" rx="1" fill="#E53935"/>
      <rect x="21" y="48" width="4" height="16" rx="1" fill="#FBC02D"/>
      <rect x="28" y="42" width="4" height="22" rx="1" fill="#1E88E5"/>
      {/* Bar value indicators */}
      <rect x="14" y="54" width="4" height="1" rx="0.5" fill="white" opacity="0.3"/>
      <rect x="21" y="48" width="4" height="1" rx="0.5" fill="white" opacity="0.3"/>
      <rect x="28" y="42" width="4" height="1" rx="0.5" fill="white" opacity="0.3"/>
      {/* Shield corner rivets */}
      <circle cx="12" cy="40" r="1.2" fill="#D9A05B" opacity="0.5"/>
      <circle cx="36" cy="40" r="1.2" fill="#D9A05B" opacity="0.5"/>
      <circle cx="24" cy="76" r="1.2" fill="#D9A05B" opacity="0.5"/>
      {/* Body — golden armor, layered */}
      <path d="M38 48 Q36 44 44 42 L66 42 Q74 44 72 48 L74 78 Q74 84 56 84 Q38 84 36 78 Z" fill="url(#fab-armor)" stroke="#b8863e" strokeWidth="1.2"/>
      {/* Armor segment lines */}
      <path d="M44 48 L44 62" stroke="#b8863e" strokeWidth="0.4" opacity="0.3"/>
      <path d="M66 48 L66 62" stroke="#b8863e" strokeWidth="0.4" opacity="0.3"/>
      {/* Chest plate — V-shape with engraving */}
      <path d="M48 44 L58 44 L60 54 Q54 58 48 54 Z" fill="#f0d090" stroke="#D9A05B" strokeWidth="0.8"/>
      <path d="M50 46 L56 46 L58 52 Q54 55 50 52 Z" fill="none" stroke="#D9A05B" strokeWidth="0.4" opacity="0.25"/>
      {/* Shoulder guards */}
      <ellipse cx="40" cy="46" rx="5" ry="2.5" fill="#D9A05B" stroke="#b8863e" strokeWidth="0.5"/>
      <ellipse cx="70" cy="46" rx="5" ry="2.5" fill="#D9A05B" stroke="#b8863e" strokeWidth="0.5"/>
      {/* Belt — with card suit buckle */}
      <rect x="40" y="62" width="30" height="4" rx="2" fill="#8B6914"/>
      <rect x="52" y="61" width="6" height="6" rx="1.5" fill="#D9A05B" stroke="#b8863e" strokeWidth="0.8"/>
      {/* Diamond suit on buckle */}
      <polygon points="55,62 56.5,64 55,66 53.5,64" fill="#8B6914" opacity="0.5"/>
      {/* Arms — armored */}
      <path d="M38 50 Q30 52 28 60" fill="none" stroke="#D9A05B" strokeWidth="6" strokeLinecap="round"/>
      <path d="M72 50 Q80 54 84 62" fill="none" stroke="#D9A05B" strokeWidth="6" strokeLinecap="round"/>
      {/* Right hand — holding card, detailed */}
      <rect x="78" y="53" width="14" height="21" rx="2" fill="#fef3c7" stroke="#D9A05B" strokeWidth="1.2"/>
      {/* Card art area */}
      <rect x="80" y="55" width="10" height="7" rx="1" fill="#1E88E5" opacity="0.25"/>
      {/* Card text lines */}
      <line x1="80" y1="65" x2="90" y2="65" stroke="#D9A05B" strokeWidth="0.6" opacity="0.4"/>
      <line x1="80" y1="67.5" x2="88" y2="67.5" stroke="#D9A05B" strokeWidth="0.5" opacity="0.3"/>
      <line x1="80" y1="70" x2="86" y2="70" stroke="#D9A05B" strokeWidth="0.5" opacity="0.25"/>
      {/* Card suit in corner */}
      <text x="81" y="60" fontSize="3" fill="#D9A05B" opacity="0.5" fontFamily="sans-serif">♦</text>
      {/* Legs — armored */}
      <rect x="44" y="78" width="10" height="10" rx="3" fill="#8B6914"/>
      <rect x="58" y="78" width="10" height="10" rx="3" fill="#8B6914"/>
      {/* Knee plates */}
      <ellipse cx="49" cy="80" rx="4" ry="1.5" fill="#b8863e" opacity="0.3"/>
      <ellipse cx="63" cy="80" rx="4" ry="1.5" fill="#b8863e" opacity="0.3"/>
      {/* Boots — with armor */}
      <rect x="42" y="86" width="14" height="7" rx="3" fill="#b8863e" stroke="#D9A05B" strokeWidth="0.8"/>
      <rect x="56" y="86" width="14" height="7" rx="3" fill="#b8863e" stroke="#D9A05B" strokeWidth="0.8"/>
      {/* Boot toe plates */}
      <path d="M42 91 Q49 93 55 91" fill="none" stroke="#D9A05B" strokeWidth="0.5" opacity="0.3"/>
      <path d="M56 91 Q63 93 69 91" fill="none" stroke="#D9A05B" strokeWidth="0.5" opacity="0.3"/>
      {/* Head */}
      <circle cx="56" cy="28" r="16" fill="url(#fab-skin)"/>
      {/* Hair — with texture */}
      <path d="M40 24 Q42 12 56 10 Q70 12 72 24 Q70 18 62 14 Q56 12 50 14 Q42 18 40 24Z" fill="#3b2507"/>
      <path d="M48 14 Q50 12 52 14" stroke="#2d1b05" strokeWidth="0.4" opacity="0.3"/>
      <path d="M58 14 Q60 12 62 14" stroke="#2d1b05" strokeWidth="0.4" opacity="0.3"/>
      {/* Headband — gold with gem */}
      <path d="M40 22 Q56 18 72 22" fill="none" stroke="#D9A05B" strokeWidth="3" strokeLinecap="round"/>
      {/* Center gem on headband */}
      <circle cx="56" cy="20" r="2" fill="#1E88E5" stroke="#D9A05B" strokeWidth="0.6"/>
      <circle cx="55.5" cy="19.5" r="0.7" fill="white" opacity="0.4"/>
      {/* Eyes — confident */}
      <ellipse cx="49" cy="28" rx="5" ry="5.5" fill="white" stroke="#3b2507" strokeWidth="0.8"/>
      <ellipse cx="63" cy="28" rx="5" ry="5.5" fill="white" stroke="#3b2507" strokeWidth="0.8"/>
      <ellipse cx="50" cy="29" rx="3" ry="3.5" fill="#b8863e"/>
      <ellipse cx="64" cy="29" rx="3" ry="3.5" fill="#b8863e"/>
      <circle cx="51.5" cy="27.5" r="1.3" fill="white"/><circle cx="65.5" cy="27.5" r="1.3" fill="white"/>
      {/* Lower lid — sharp look */}
      <path d="M45 31 Q49 33 53 31" fill="none" stroke="#3b2507" strokeWidth="0.4" opacity="0.2"/>
      <path d="M59 31 Q63 33 67 31" fill="none" stroke="#3b2507" strokeWidth="0.4" opacity="0.2"/>
      {/* Strong brows */}
      <path d="M44 22 Q49 19.5 54 23" fill="none" stroke="#3b2507" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M58 23 Q63 19.5 68 22" fill="none" stroke="#3b2507" strokeWidth="1.5" strokeLinecap="round"/>
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
  medic: {
    name: "The Medic",
    role: "Health Monitor",
    color: "#f87171",
    bg: "#f8717115",
    borderColor: "#f8717130",
    quote: "Makes rounds every 2 minutes, checks vitals on every station, and reports status changes.",
    whatItIs: "The office medic — makes regular rounds checking each station's health and connectivity. Logs checkup results and surfaces issues immediately so nothing goes unnoticed.",
    whyUnique: "Separated from the Conductor so orchestration and health monitoring are independent concerns. The Medic's sole job is making rounds and verifying station health.",
    tech: ["MCP Health API", "Interval patrols", "Status change detection", "Inspection logging"],
    data: ["MCP health endpoints — per-domain status", "agent_activity — inspection logs", "Station status — online/offline/unknown"],
    cycle: ["Timer fires every 2 minutes", "Pick next station to check", "Walk over (leisurely pace)", "At arrival: check vitals via MCP health API", "Log checkup result (online/offline/unknown)", "Chat with station agent + show diagnosis", "Return to station, repeat"],
    code: `// Health rounds cycle:\nconst makeRounds = () => {\n  const target = nextStation();\n  walkTo(target, 'checkup');\n  // On arrival:\n  const health = await refreshHealth();\n  logCheckup(target, health[domain]);\n};\nsetInterval(makeRounds, 120000);`,
    starters: ["How's everyone doing?", "Any stations feeling under the weather?", "What was your last checkup?", "Do you ever take a break?"],
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

const AGENT_ORDER = ['orchestrator', 'chat', 'blog', 'fitness', 'gaming', 'social', 'oldways', 'fabstats', 'fabstatsbot', 'medic'];
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
  medic: {
    shortDesc: "Makes rounds every 2 minutes, checks station health via MCP endpoints, and logs checkup results. Independent of the Conductor's orchestration cycle.",
    status: 'On Rounds', statusType: 'live',
    links: [{ label: 'Activity →', url: '/activity' }],
  },
};

export { avatars, AGENTS, AGENT_ORDER, SITE_AGENTS, PRODUCT_AGENTS, AGENT_HOME_DATA };