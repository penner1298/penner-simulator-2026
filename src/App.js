import React, { useState, useRef, useEffect } from 'react';
import { DollarSign, Users, ChevronRight, Check, X, Vote, Sparkles, Loader2, TrendingUp, AlertTriangle, ArrowRight, Heart, Wrench, Scale, Brain, Share2, Trophy, Flame, History, Globe, Activity, Lock, RotateCcw, ChevronDown, Shield, Mail, CreditCard, Gavel, AlertCircle, MousePointer2, RefreshCw } from 'lucide-react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// --- FIREBASE CONFIGURATION ---
// This safely handles both Vercel (real) and CodeSandbox (demo) environments
let firebaseConfig;
let isDemoMode = false;

// Detect environment
if (typeof __firebase_config !== 'undefined') {
  try {
    firebaseConfig = JSON.parse(__firebase_config);
  } catch (e) {
    console.error("Failed to parse firebase config", e);
    isDemoMode = true;
  }
} else {
  isDemoMode = true;
}

// If demo mode or config failed, use dummy values to prevent crash on init
if (isDemoMode || !firebaseConfig) {
  firebaseConfig = {
    apiKey: "AIzaSyDummyKey-For-Demo-Only",
    authDomain: "demo.firebaseapp.com",
    projectId: "demo",
    storageBucket: "demo.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
  };
}

// --- SAFE INITIALIZATION ---
let app;
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (e) {
  console.error("Firebase init error:", e);
}

const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- GAME CONFIGURATION ---
const FREEZE_DATE = new Date('2025-12-13T00:00:00');
const IS_FUNDRAISING_ALLOWED = new Date() < FREEZE_DATE;
const DONATION_URL = "https://votepenner.com/donate"; 

// GEMINI API SETUP
const apiKey = ""; 
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

const callGemini = async (prompt) => {
  if (!apiKey) return "AI Advisor is unavailable in this demo.";
  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Connection jamming. Retrying...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Comms link down.";
  }
};

// --- ARCHETYPES ---
const ARCHETYPES = {
  STATUS_QUO: {
    title: "The Bureaucrat",
    icon: AlertTriangle,
    color: "text-slate-500",
    pitch: "You voted to keep the machinery running, even when it's broken. We need to stop funding the 'Stone Age' and start demanding results. Help me force that change.",
    desc: "You tended to accept the 'Ghost Revenue' projections and allowed agencies to justify their own existence. While you kept the lights on, you funded a system that moves at the speed of bureaucracy, not business."
  },
  MANAGER: {
    title: "Establishment Manager",
    icon: Users,
    color: "text-blue-700",
    pitch: "You see the cracks in the foundation, but you're hesitant to rebuild. I need allies who are willing to demand Zero-Based Budgeting and real accountability. Join me.",
    desc: "You managed the decline. You avoided the worst mistakes, but you stopped short of the structural reforms needed to save Rainier School or truly cut red tape. We need to do more than just survive the session."
  },
  PRAGMATIST: {
    title: "Pragmatic Builder",
    icon: Wrench,
    color: "text-blue-900",
    pitch: "You have the right instincts: Cut the red tape, protect the vulnerable. I need your help to take the next step—forcing agencies to justify every dollar, every year.",
    desc: "You voted to drag our state agencies out of the stone age. You recognize that systems should move at the speed of business. You are a strong ally for working families across Washington."
  },
  CHAMPION: {
    title: "Firewall for Reform",
    icon: Shield,
    color: "text-orange-600",
    pitch: "We are 100% aligned. You see exactly what I see: A budget built on phantom money and a system failing its most vulnerable. I need you in my inner circle.",
    desc: "You are the firewall against wasteful spending. You voted to stop 'Ghost Revenue' and fought to save Rainier School. You understand that true compassion means delivering results, not just spending money. You are a Champion of Real Reform."
  }
};

// --- MASTER DATA DECK ---
const MASTER_DECK = [
  // --- BUDGET SAVERS ---
  {
    id: 'fiscal_5',
    category: 'Budget',
    title: "Sell Surplus Land",
    description: "The state holds thousands of acres of unused land costing millions to maintain. Sell it?",
    left: { label: "Hold It", forecast: "📉 Costly", budget: -5, voters: 0, pennerPoints: 0, feedback: "Maintenance costs continue to eat into the general fund." },
    right: { label: "Sell It", forecast: "💰 Cash Injection", budget: 20, voters: 5, pennerPoints: 1, feedback: "Smart move. One-time revenue boost without raising taxes." },
    pennerStance: 'right',
    pennerContext: "Government shouldn't be a land baron. Selling unused assets puts property back on the tax rolls.",
    reality: "Fact: State land inventory often sits vacant for decades.",
    communityStats: 85,
    color: "bg-emerald-600"
  },
  {
    id: 'fiscal_6',
    category: 'Budget',
    title: "Software Audit",
    description: "A new $200M IT project is 3 years behind schedule. Pause and audit?",
    left: { label: "Keep Funding", forecast: "🔥 Burning Cash", budget: -15, voters: -10, pennerPoints: 0, feedback: "Sunk cost fallacy. The project continues to bleed money." },
    right: { label: "Audit Now", forecast: "🛑 Stop Loss", budget: 15, voters: 10, pennerPoints: 1, feedback: "Audit revealed massive waste. You saved $50M instantly." },
    pennerStance: 'right',
    pennerContext: "We cannot keep writing blank checks for failed IT projects.",
    reality: "Fact: WA state IT projects are historically over-budget.",
    communityStats: 92,
    color: "bg-blue-700"
  },
  {
    id: 'fiscal_7',
    category: 'Budget',
    title: "Close Tax Loophole",
    description: "Out-of-state banks utilize a loophole to avoid B&O tax. Close it?",
    left: { label: "Keep Loophole", forecast: "🛡️ Lobbyist Win", budget: -5, voters: -5, pennerPoints: 0, feedback: "Lobbyists are happy, but main street pays the difference." },
    right: { label: "Close It", forecast: "⚖️ Fairness", budget: 25, voters: 15, pennerPoints: 1, feedback: "Fairness restored. Revenue collected without hurting local biz." },
    pennerStance: 'right',
    pennerContext: "Tax fairness matters. Out-of-state giants shouldn't pay less than local mom-and-pops.",
    reality: "Fact: Various B&O preferences reviewed annually.",
    communityStats: 80,
    color: "bg-indigo-700"
  },
  // --- ORIGINAL DECK ---
  {
    id: 'fiscal_1',
    category: 'Budget',
    title: "The Rainy Day Fund",
    description: "Revenue is down. The Governor wants to tap the Rainy Day Fund immediately rather than cut waste.",
    left: { label: "Audit First", forecast: "📉 Sustainable", budget: 5, voters: -5, pennerPoints: 1, feedback: "You identified unspent accounts to cover the shortfall. It wasn't a windfall, but it stopped the raid." },
    right: { label: "Raid Fund", forecast: "💸 Kick Can", budget: -15, voters: 5, pennerPoints: 0, feedback: "We survived today, but the state is exposed for the next recession." },
    pennerStance: 'left',
    pennerContext: "We can't treat reserves like a checking account. We must audit before we raid.",
    reality: "Fact: Legislature depleted reserves in 2020 & 2025.",
    communityStats: 65,
    color: "bg-slate-700"
  },
  {
    id: 'fiscal_2',
    category: 'Budget',
    title: "Capital Gains Expansion",
    description: "A bill to lower the Capital Gains tax threshold to $25,000 to capture small business sales.",
    left: { label: "Block It", forecast: "🛡️ Protect Biz", budget: -5, voters: 15, pennerPoints: 1, feedback: "Small business owners breathe a sigh of relief." },
    right: { label: "Pass It", forecast: "💰 Revenue", budget: 20, voters: -25, pennerPoints: 0, feedback: "Revenue spikes, but doctors and shop owners start leaving the state." },
    pennerStance: 'left',
    pennerContext: "An income tax by any other name is still an income tax. I voted NO.",
    reality: "Fact: SB 5096 passed in 2021 (7% tax).",
    communityStats: 72,
    color: "bg-slate-800"
  },
  {
    id: 'fiscal_3',
    category: 'Smart Gov',
    title: "The 85/15 Proposal",
    description: "Agencies want a fee hike for 'Admin Costs'. You propose capping admin overhead at 15%.",
    left: { label: "Grant Hike", forecast: "📈 Bureaucracy", budget: -10, voters: -20, pennerPoints: 0, feedback: "Bureaucracy grows. Service quality stays flat." },
    right: { label: "Cap Overhead", forecast: "✂️ Efficiency", budget: 15, voters: 25, pennerPoints: 1, feedback: "You forced efficiency. More money actually reaches the people." },
    pennerStance: 'right',
    pennerContext: "If they want more money, they must prove it goes to services, not management.",
    reality: "Fact: Admin costs have risen 40% since 2018.",
    communityStats: 88,
    color: "bg-emerald-800"
  },
  {
    id: 'fiscal_4',
    category: 'Smart Gov',
    title: "Zombie Programs",
    description: "A $50M grant program has failed its metrics for 3 years. Renew or Kill?",
    left: { label: "Renew", forecast: "🔄 Status Quo", budget: -20, voters: -15, pennerPoints: 0, feedback: "Good money after bad. Trust in government erodes." },
    right: { label: "Auto-Clawback", forecast: "🛑 Accountability", budget: 20, voters: 15, pennerPoints: 1, feedback: "Funding clawed back. We invest in what actually works." },
    pennerStance: 'right',
    pennerContext: "Accountability isn't optional. Failed programs don't get refunds.",
    reality: "Fact: Automatic sunsets are rarely enforced.",
    communityStats: 85,
    color: "bg-amber-800"
  },
  {
    id: 'care_1',
    category: 'Care',
    title: "Promise of Care: DD",
    description: "Budget writers want to close Rainier School to save money. Residents call it home.",
    left: { label: "Close It", forecast: "💰 Save Money", budget: 15, voters: -35, pennerPoints: 0, feedback: "Residents are displaced. A moral failure." },
    right: { label: "Protect Them", forecast: "❤️ Dignity", budget: -10, voters: 25, pennerPoints: 1, feedback: "You kept the promise to those who cannot care for themselves." },
    pennerStance: 'right',
    pennerContext: "We have a moral duty to our state's most disabled individuals.",
    reality: "Fact: Attempts to close RHCs recur every budget cycle.",
    communityStats: 92,
    color: "bg-blue-800"
  },
  {
    id: 'care_2',
    category: 'Care',
    title: "Childcare Crisis",
    description: "Providers are drowning in paperwork. Do we subsidize the cost or cut the red tape?",
    left: { label: "Subsidize", forecast: "💸 High Cost", budget: -25, voters: 5, pennerPoints: 0, feedback: "Expensive, and didn't create a single new slot." },
    right: { label: "Deregulate", forecast: "👶 Access", budget: 5, voters: 20, pennerPoints: 1, feedback: "Providers open new spots. Costs stabilize for families." },
    pennerStance: 'right',
    pennerContext: "The Promise of Care extends to working families. Fix the shortage by empowering providers.",
    reality: "Fact: Fair Start Act (2021) increased subsidies but costs rose.",
    communityStats: 60,
    color: "bg-indigo-900"
  },
  {
    id: 'care_3',
    category: 'Care',
    title: "Elder Care Rates",
    description: "State payments for nursing homes lag inflation. Facilities are closing.",
    left: { label: "Ignore It", forecast: "📉 Closures", budget: 10, voters: -30, pennerPoints: 0, feedback: "Grandma loses her bed. Emergency rooms flood with seniors." },
    right: { label: "Fund Rates", forecast: "👵 Dignity", budget: -15, voters: 20, pennerPoints: 1, feedback: "Dignity preserved. Seniors get the care they earned." },
    pennerStance: 'right',
    pennerContext: "End-of-life dignity is non-negotiable. We must pay the actual cost of care.",
    reality: "Fact: 15+ Skilled Nursing Facilities closed since 2020.",
    communityStats: 80,
    color: "bg-purple-900"
  },
  {
    id: 'safety_1',
    category: 'Safety',
    title: "Pursuit Reform",
    description: "Criminals flee because they know police can't chase. Restore pursuit authority?",
    left: { label: "Keep Ban", forecast: "⚠️ Crime Up", budget: 0, voters: -35, pennerPoints: 0, feedback: "Crime spikes. Thieves operate with impunity." },
    right: { label: "Restore Pursuit", forecast: "🚓 Order", budget: -5, voters: 25, pennerPoints: 1, feedback: "Order restored. Criminals face consequences again." },
    pennerStance: 'right',
    pennerContext: "Handcuffing police only helps criminals. I co-sponsored the fix.",
    reality: "Fact: Initiative 2113 passed in 2024 restoring pursuit.",
    communityStats: 88,
    color: "bg-slate-900"
  },
  {
    id: 'safety_2',
    category: 'Safety',
    title: "Fentanyl Crisis",
    description: "Public drug use is rampant. Fund mandatory treatment or just harm reduction?",
    left: { label: "Harm Reduction", forecast: "🩹 Band-Aid", budget: 5, voters: -25, pennerPoints: 0, feedback: "The chaos continues. Compassion without accountability fails." },
    right: { label: "Mandatory Rehab", forecast: "🏥 Treatment", budget: -20, voters: 15, pennerPoints: 1, feedback: "Expensive, but lives are saved and streets are cleaner." },
    pennerStance: 'right',
    pennerContext: "Compassion means getting people off the street, not leaving them to die.",
    reality: "Fact: SB 5536 (Blake Fix) passed special session 2023.",
    communityStats: 70,
    color: "bg-red-900"
  },
  {
    id: 'safety_3',
    category: 'Fixes',
    title: "Gas Tax Rebate",
    description: "Gas is $5/gal. A new bill proposes a rebate using surplus funds.",
    left: { label: "Block Rebate", forecast: "🚫 No Relief", budget: 15, voters: -25, pennerPoints: 0, feedback: "State keeps the cash. Families keep suffering." },
    right: { label: "Send Checks", forecast: "💵 Relief", budget: -25, voters: 30, pennerPoints: 1, feedback: "Relief arrives. Families can afford to commute again." },
    pennerStance: 'right',
    pennerContext: "We over-collected. That money belongs to the people, not the government.",
    reality: "Fact: Proposed rebate blocked in committee (2024).",
    communityStats: 90,
    color: "bg-green-800"
  },
  
  // --- THEME: MISC / RANDOM ---
  {
    id: 'misc_1',
    category: 'Energy',
    title: "Natural Gas Ban",
    description: "Ban natural gas in new homes to fight climate change?",
    left: { label: "Protect Choice", forecast: "⚡ Reliable", budget: 0, voters: 15, pennerPoints: 1, feedback: "Grid reliability preserved. Energy bills stay lower." },
    right: { label: "Ban Gas", forecast: "🚫 Costs Up", budget: -10, voters: -15, pennerPoints: 0, feedback: "Construction costs spike. Winter grid strain increases." },
    pennerStance: 'left',
    pennerContext: "Energy choice is affordability. Banning gas hurts the working class.",
    reality: "Fact: HB 1589 (2024) paves way for phase-out.",
    communityStats: 55,
    color: "bg-orange-700"
  },
  {
    id: 'misc_2',
    category: 'Education',
    title: "School Choice",
    description: "Allow state funds to follow the student to private/charter schools?",
    left: { label: "Block It", forecast: "🏫 Status Quo", budget: 0, voters: -15, pennerPoints: 0, feedback: "Status quo. Parents trapped in failing schools." },
    right: { label: "Empower Parents", forecast: "🎓 Options", budget: -10, voters: 20, pennerPoints: 1, feedback: "Competition improves quality. Kids get options." },
    pennerStance: 'right',
    pennerContext: "Every child deserves a great education, regardless of zip code.",
    reality: "Fact: Charter schools capped; choice bills stalled.",
    communityStats: 60,
    color: "bg-cyan-700"
  }
];

// --- HELPER: Randomize Deck ---
const getRandomDeck = (count = 10, filterType = null, excludeIds = []) => {
  let deck = MASTER_DECK.filter(card => !excludeIds.includes(card.id));
  
  if (filterType) {
    const typeDeck = deck.filter(card => card.category === filterType);
    if (typeDeck.length >= count) {
      deck = typeDeck;
    }
  }
  
  const shuffled = deck.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// --- UI COMPONENTS ---

const Meter = ({ icon: Icon, value, color, label, lastChange }) => {
  const isDanger = value <= 0; 
  
  return (
    <div className="flex flex-col items-center w-1/2 px-4 relative">
      {lastChange !== 0 && (
        <div className={`absolute -top-6 text-lg font-black animate-float-up drop-shadow-md ${lastChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {lastChange > 0 ? '+' : ''}{lastChange}
        </div>
      )}
      <div className={`flex items-center space-x-2 mb-1 text-xs font-bold tracking-widest uppercase ${isDanger ? 'text-red-600 animate-pulse' : 'text-slate-500'}`}>
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <div className={`w-full h-4 bg-slate-200 rounded-full overflow-hidden border-2 ${isDanger ? 'border-red-400' : 'border-slate-300'} shadow-inner relative`}>
        {/* Center Line for 0 */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-400 opacity-50 z-10"></div>
        
        {/* Bar Logic: Handle Negative & Positive */}
        <div 
          className={`h-full transition-all duration-500 ease-out ${isDanger ? 'bg-red-500' : color}`} 
          style={{ 
            width: `${Math.min(50, Math.abs(value) / 2)}%`,
            marginLeft: value < 0 ? `${50 - Math.min(50, Math.abs(value) / 2)}%` : '50%',
          }}
        />
      </div>
      <span className={`text-sm mt-1 font-mono font-bold ${isDanger ? 'text-red-600' : 'text-slate-500'}`}>
        {value > 0 ? '+' : ''}{value}%
      </span>
    </div>
  );
};

const IntroScreen = ({ onStart }) => (
  <div className="flex flex-col items-center justify-center min-h-full bg-gradient-to-br from-slate-50 to-blue-50 p-6 text-center animate-in fade-in duration-500 font-sans relative pb-20">
    <div className="bg-white p-6 rounded-full shadow-xl mb-8 border-4 border-slate-200 relative overflow-hidden group">
      <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition duration-500"></div>
      <Wrench size={64} className="text-blue-900 relative z-10" />
    </div>
    <div className="mb-4">
      <span className="bg-blue-900 text-white text-xs font-bold px-4 py-1.5 uppercase tracking-widest rounded-full shadow-md">Washington 2026</span>
    </div>
    <h1 className="text-5xl font-black text-slate-900 mb-2 tracking-tight leading-none">FIX<br/><span className="text-blue-900">WASHINGTON</span></h1>
    <div className="w-24 h-2 bg-orange-600 mb-8 rounded-full"></div>
    
    <p className="text-slate-600 mb-8 max-w-md leading-relaxed text-md font-medium">
      You have <strong>60 Days</strong> to balance the budget and restore public trust.
      <br/><br/>
      Can you break the 30-year cycle of bad policy?
    </p>

    <button 
      onClick={onStart}
      className="w-full max-w-xs bg-blue-900 hover:bg-blue-800 text-white font-black text-lg py-5 px-8 rounded-xl shadow-xl transform transition active:scale-95 flex items-center justify-center space-x-3 border-b-4 border-slate-900"
    >
      <span>Start Session</span>
      <ChevronRight size={24} />
    </button>
    
    <div className="absolute bottom-8 left-0 right-0 text-center">
      <a href="https://votepenner.com/donate" target="_blank" className="text-xs text-slate-400 uppercase tracking-widest font-bold hover:text-blue-600 transition">
        Paid for by VotePenner
      </a>
    </div>
  </div>
);

const BriefingScreen = ({ onNext }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-slate-900 text-white p-8 text-center animate-in fade-in duration-500 font-sans relative">
      <div className="mb-6">
        <AlertCircle size={64} className="text-red-500 animate-pulse" />
      </div>
      <h1 className="text-3xl font-black mb-4 uppercase tracking-tight text-red-500">SITUATION REPORT</h1>
      <div className="w-24 h-1 bg-slate-700 mb-8 mx-auto"></div>
      
      <div className="space-y-6 max-w-md text-left mb-8">
         <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-red-500">
           <h3 className="font-bold text-red-400 text-sm uppercase mb-1">Budget Crisis</h3>
           <p className="text-slate-300 text-sm leading-relaxed">The revenue forecast is woefully lacking due to successively poor fiscal decisions. We are starting in a deep deficit.</p>
         </div>
         <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-orange-500">
           <h3 className="font-bold text-orange-400 text-sm uppercase mb-1">Public Pressure</h3>
           <p className="text-slate-300 text-sm leading-relaxed">The public and non-profits demand more from the budget, but the average citizen is taxed more than ever.</p>
         </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-8 leading-tight">
        How will you navigate the <span className="text-blue-400">60-day session?</span>
      </h2>

      <button 
        onClick={onNext}
        className="w-full max-w-xs bg-red-600 hover:bg-red-500 text-white font-black text-lg py-5 px-8 rounded-xl shadow-xl transform transition active:scale-95 flex items-center justify-center space-x-3 border-b-4 border-red-800"
      >
        <span>Enter Chamber</span>
        <ArrowRight size={24} />
      </button>
    </div>
  );
};

// Special Session Alert Screen
const SpecialSessionScreen = ({ onContinue }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-red-900 text-white p-8 text-center animate-in zoom-in duration-500 font-sans relative">
      <Gavel size={80} className="text-white mb-6 drop-shadow-lg" />
      <h1 className="text-4xl font-black mb-2 uppercase tracking-tight">Special Session</h1>
      <h2 className="text-xl font-bold text-red-200 mb-8 uppercase tracking-widest">Budget Emergency</h2>
      
      <p className="text-white text-lg font-medium mb-8 max-w-xs mx-auto leading-relaxed">
        The legislature failed to balance the budget on time. You have 5 extra days to fix the deficit.
        <br/><br/>
        <strong>Focus: Budget Cuts & Revenue.</strong>
      </p>

      <button 
        onClick={onContinue}
        className="w-full max-w-xs bg-white text-red-900 font-black text-lg py-5 px-8 rounded-xl shadow-xl transform transition active:scale-95 flex items-center justify-center space-x-3 border-b-4 border-red-950"
      >
        <span>Convene Session</span>
        <ArrowRight size={24} />
      </button>
    </div>
  );
};

const GoverningStyleMatrix = ({ budget, voters }) => {
  // Determine Style
  let title = "The Pragmatist";
  let desc = "Balanced approach.";
  let color = "text-purple-600";

  if (budget > 40 && voters > 40) {
    title = "The Statesman";
    desc = "You achieved the impossible: Fiscal discipline AND public popularity.";
    color = "text-green-600";
  } else if (budget > 40 && voters <= 40) {
    title = "The Austerity Hawk";
    desc = "You saved the budget, but the public is hurting. A tough, necessary medicine.";
    color = "text-blue-700";
  } else if (budget <= 15 && voters > 40) {
    title = "The Populist";
    desc = "The people love you, but the state credit card is maxed out. Dangerous fun.";
    color = "text-orange-600";
  } else if (budget <= 15 && voters <= 40) {
    title = "Gridlock Victim";
    desc = "You tried to please everyone and pleased no one. The deficit grew and trust fell.";
    color = "text-red-600";
  }

  return (
    <div className="w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200 shadow-lg mb-6">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
        <Activity size={20} className="text-slate-400" />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">State of the State</span>
      </div>
      
      {/* 2x2 Matrix Viz */}
      <div className="relative w-full h-32 bg-slate-50 rounded-lg border border-slate-200 mb-4 flex items-center justify-center overflow-hidden">
         <div className="absolute w-full h-px bg-slate-300 top-1/2"></div>
         <div className="absolute h-full w-px bg-slate-300 left-1/2"></div>
         
         <div className="absolute top-1 left-2 text-[8px] text-slate-400 uppercase font-bold">Hawk</div>
         <div className="absolute bottom-1 left-2 text-[8px] text-slate-400 uppercase font-bold">Spend</div>
         <div className="absolute bottom-1 right-2 text-[8px] text-slate-400 uppercase font-bold">Popular</div>
         <div className="absolute bottom-1 left-1/2 -ml-4 text-[8px] text-slate-400 uppercase font-bold">Unpopular</div>

         {/* Player Dot */}
         <div 
           className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-md ${budget > 20 ? 'bg-blue-500' : 'bg-red-500'}`}
           style={{
             top: `${100 - Math.min(100, Math.max(0, budget))}%`, 
             left: `${Math.min(100, Math.max(0, voters))}%`
           }}
         ></div>
      </div>

      <div className={`text-center font-black text-xl ${color} uppercase leading-tight`}>
        {title}
      </div>
      <p className="text-center text-xs text-slate-500 mt-2 font-medium leading-relaxed">
        {desc}
      </p>
    </div>
  );
};


const SessionEndChoiceScreen = ({ onExtend, onFinish, stats }) => (
  <div className="flex flex-col items-center justify-center min-h-full bg-slate-900 text-white p-6 text-center animate-in zoom-in duration-300">
    <h1 className="text-3xl font-black mb-2 uppercase">Session Ended</h1>
    <p className="text-slate-400 mb-8 uppercase tracking-widest text-xs">Day 60 / 60</p>
    
    <div className="w-full max-w-sm bg-slate-800 p-6 rounded-xl border border-slate-700 mb-8">
       <h2 className="text-lg font-bold text-white mb-4">Current Status</h2>
       <div className="space-y-3">
         <div className="flex justify-between items-center">
           <span className="text-slate-400 text-sm font-bold uppercase">Budget</span>
           <span className={`text-lg font-mono font-bold ${stats.budget <= 0 ? 'text-red-500' : 'text-green-500'}`}>{stats.budget > 0 ? '+' : ''}{stats.budget}%</span>
         </div>
         <div className="flex justify-between items-center">
           <span className="text-slate-400 text-sm font-bold uppercase">Trust</span>
           <span className={`text-lg font-mono font-bold ${stats.voters <= 0 ? 'text-red-500' : 'text-blue-500'}`}>{stats.voters > 0 ? '+' : ''}{stats.voters}%</span>
         </div>
       </div>
       {stats.budget <= 0 && (
         <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-xs font-bold">
            ⚠️ WARNING: Deficit Spending.
         </div>
       )}
    </div>

    <div className="space-y-4 w-full max-w-xs">
       <button onClick={onExtend} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl shadow-lg border-b-4 border-orange-800 flex items-center justify-center gap-2">
         <Gavel size={20} /> Force Special Session
         <span className="text-[10px] font-normal opacity-80 block ml-1">(Review & Change Votes)</span>
       </button>
       <button onClick={() => onFinish(stats)} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl border-b-4 border-slate-900 flex items-center justify-center gap-2">
         Adjourn Sine Die
         <span className="text-[10px] font-normal opacity-80 block ml-1">(See Final Score)</span>
       </button>
    </div>
  </div>
);

const ReviewSessionScreen = ({ votes, onFinish }) => {
  // Initialize with existing votes
  const [currentVotes, setCurrentVotes] = useState(votes);
  
  const calculateStats = () => {
    let budget = -15; // Match STARTING STATS (Crisis Mode)
    let voters = 25;
    let score = 0;
    
    currentVotes.forEach(vote => {
      const card = MASTER_DECK.find(c => c.id === vote.cardId);
      if (!card) return;
      
      const impact = vote.direction === 'left' ? card.left : card.right;
      budget += impact.budget;
      voters += impact.voters;
      score += impact.pennerPoints;
    });
    
    return { budget, voters, score };
  };
  
  const liveStats = calculateStats();
  
  const toggleVote = (index) => {
    const newVotes = [...currentVotes];
    const currentDir = newVotes[index].direction;
    newVotes[index].direction = currentDir === 'left' ? 'right' : 'left';
    setCurrentVotes(newVotes);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans max-w-md mx-auto shadow-2xl border-x border-slate-200 overflow-hidden relative">
       {/* Header */}
       <div className="bg-slate-900 p-6 pb-8 text-white z-10 shadow-lg flex-none">
         <h2 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
            <Gavel className="text-orange-500" /> Special Session
         </h2>
         <p className="text-slate-300 text-xs mb-6">Review your votes. Fix the budget. Restore trust.</p>
         
         <div className="flex gap-4">
            <Meter icon={DollarSign} label="State Budget" value={liveStats.budget} color="bg-green-500" lastChange={0} />
            <Meter icon={Users} label="Voter Trust" value={liveStats.voters} color="bg-blue-500" lastChange={0} />
         </div>
       </div>
       
       {/* Scrollable List */}
       <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 bg-slate-100">
         {currentVotes.map((vote, idx) => {
            const card = MASTER_DECK.find(c => c.id === vote.cardId);
            if (!card) return null;
            
            const isLeft = vote.direction === 'left';
            const isAligned = vote.direction === card.pennerStance;

            return (
              <div key={vote.cardId} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-3">
                   <h3 className="font-bold text-slate-800 text-sm">{card.title}</h3>
                   {isAligned ? (
                     <span className="text-[10px] font-bold px-2 py-1 rounded uppercase bg-blue-100 text-blue-700">Agreed</span>
                   ) : (
                     <span className="text-[10px] font-bold px-2 py-1 rounded uppercase bg-orange-100 text-orange-700">Different</span>
                   )}
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                   <button 
                     onClick={() => toggleVote(idx)}
                     className={`flex-1 py-3 text-xs font-bold rounded-md transition-all border ${isLeft ? 'bg-white text-slate-900 shadow-sm border-blue-500 ring-1 ring-blue-500' : 'text-slate-400 border-transparent hover:bg-slate-200'}`}
                   >
                     {card.left.label}
                   </button>
                   <RefreshCw size={16} className="text-slate-300" />
                   <button 
                     onClick={() => toggleVote(idx)}
                     className={`flex-1 py-3 text-xs font-bold rounded-md transition-all border ${!isLeft ? 'bg-white text-slate-900 shadow-sm border-blue-500 ring-1 ring-blue-500' : 'text-slate-400 border-transparent hover:bg-slate-200'}`}
                   >
                     {card.right.label}
                   </button>
                </div>
                
                <div className="mt-2 flex gap-3 justify-center text-[10px] font-mono text-slate-400">
                   <span>Bud: {isLeft ? card.left.budget : card.right.budget}</span>
                   <span>Vote: {isLeft ? card.left.voters : card.right.voters}</span>
                </div>
              </div>
            );
         })}
       </div>
       
       {/* Footer Action */}
       <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex-none">
          <button 
            onClick={() => onFinish(liveStats, liveStats.score)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-lg py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            <span>Adjourn Sine Die</span>
            <ArrowRight size={20} />
          </button>
       </div>
    </div>
  );
};

// Reform Gauge (Spectrum)
const ReformSpectrum = ({ score }) => {
  const getLabel = (s) => {
    if (s < 30) return "Status Quo";
    if (s < 60) return "Progressive";
    if (s < 80) return "Pragmatic"; // Adjusted based on user feedback
    return "Reform";
  };

  return (
    <div className="w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200 shadow-lg mb-6">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
        <Activity size={20} className="text-slate-400" />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Reform Spectrum</span>
      </div>
      
      <div className="relative w-full h-8 bg-gradient-to-r from-slate-300 via-blue-200 to-orange-400 rounded-full overflow-hidden mb-3 border border-slate-300">
        <div 
          className="absolute top-0 bottom-0 w-1 bg-black shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-1000 ease-out"
          style={{ left: `${score}%` }}
        ></div>
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 font-mono uppercase font-bold">
        <span>Status Quo</span>
        <span>Real Reform</span>
      </div>
    </div>
  );
};

const GameOverScreen = ({ stats, outcome, pennerScore, onReset, user, totalCards }) => {
  const [step, setStep] = useState('capture'); // capture, donation
  const [email, setEmail] = useState('');
  const [zip, setZip] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highScore, setHighScore] = useState(0);
  
  const alignment = Math.min(100, Math.round((pennerScore / totalCards) * 100));

  useEffect(() => {
    const savedScore = localStorage.getItem('pennerSimHighScore') || 0;
    if (alignment > savedScore) {
      localStorage.setItem('pennerSimHighScore', alignment);
      setHighScore(alignment);
    } else {
      setHighScore(savedScore);
    }

    if(auth && !auth.currentUser) {
       signInAnonymously(auth).catch(err => console.log("Auth skipped in demo"));
    }
  }, [alignment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Save to Firebase
    try {
        if (!isDemoMode && auth.currentUser) {
            const archetype = getArchetype();
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), {
              email,
              zip,
              archetype: archetype.title,
              score: alignment,
              timestamp: serverTimestamp(),
              userId: auth.currentUser.uid
            });
        }
    } catch (err) {
        console.warn("Lead save skipped:", err.message);
    }
    
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('donation');
    }, 600);
  };

  const getArchetype = () => {
    if (alignment >= 85) return ARCHETYPES.CHAMPION; // Adjusted threshold
    if (alignment >= 60) return ARCHETYPES.PRAGMATIST;
    if (alignment >= 30) return ARCHETYPES.MANAGER;
    return ARCHETYPES.STATUS_QUO;
  };

  const archetype = getArchetype();

  const handleShare = async () => {
    const text = `I scored ${alignment}% alignment with Rep. Penner's Reform Agenda! Can you fix Washington?`;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: 'Fix Washington', text: text, url: url }); } catch (err) { console.log('Share canceled'); }
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      alert("Result copied to clipboard!");
    }
  };

  // --- SCREEN: DATA CAPTURE ---
  if (step === 'capture') {
    return (
      <div className="flex flex-col items-center justify-start pt-12 min-h-full bg-slate-50 text-slate-900 p-6 text-center animate-in zoom-in duration-300 overflow-y-auto font-sans relative pb-12">
        
        <div className="mb-4 transform transition hover:scale-110 duration-300 bg-white p-4 rounded-full border border-slate-200 shadow-lg">
          <archetype.icon size={64} className={`${archetype.color} drop-shadow-lg`} />
        </div>
        
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your Reform Profile</h2>
        <h1 className={`text-3xl font-black mb-4 ${archetype.color} uppercase leading-none tracking-tight`}>{archetype.title}</h1>
        
        <p className="text-sm text-slate-600 mb-8 leading-relaxed max-w-xs mx-auto border-b border-slate-200 pb-8">
          {archetype.desc}
        </p>
  
        <ReformSpectrum score={alignment} />
  
        <div className="w-full max-w-sm bg-white p-5 mb-8 border border-slate-200 rounded-xl shadow-sm">
          <div className="flex justify-center items-center mb-2">
             <div className="text-center">
               <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Alignment with Penner's Reform Agenda</div>
               <div className="text-5xl font-black text-slate-800 mt-2">{alignment}%</div>
             </div>
          </div>
          <button onClick={handleShare} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition transform active:scale-95 shadow-lg mt-4">
            <Share2 size={20} /> <span>Challenge Friends</span>
          </button>
        </div>
  
        <div className="w-full max-w-sm bg-white p-6 border-2 border-orange-500 rounded-2xl shadow-xl relative overflow-hidden mb-12">
          <h3 className="font-black text-xl mb-2 text-slate-900 flex items-center justify-center gap-2 uppercase tracking-tight relative z-10">
            <Mail size={24} className="text-orange-600" /> Join My Inner Circle
          </h3>
          <p className="text-xs text-slate-500 mb-6 font-medium relative z-10 leading-relaxed">
            I need to be able to contact you when these critical votes come up. Let's fix this together.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
            <input type="email" placeholder="Email Address" required className="w-full p-3 bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-orange-500 rounded-lg placeholder-slate-400" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="text" placeholder="Zip Code" required maxLength={5} className="w-full p-3 bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-orange-500 rounded-lg placeholder-slate-400" value={zip} onChange={(e) => setZip(e.target.value)} />
            <button type="submit" disabled={isSubmitting} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-lg text-sm transition shadow-md uppercase tracking-widest flex justify-center items-center">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Connect with Joshua"}
            </button>
          </form>
        </div>
        <button onClick={onReset} className="text-slate-400 text-xs font-bold uppercase hover:text-slate-600">No Thanks, Play Again</button>
      </div>
    );
  }

  if (step === 'donation') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full bg-slate-50 text-slate-900 p-6 text-center animate-in slide-in-from-right duration-500 font-sans">
         <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-orange-600"></div>
            <div className="mb-6 flex justify-center"><div className="bg-blue-100 p-4 rounded-full"><Trophy size={48} className="text-blue-700" /></div></div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 leading-tight">Thank you for joining the team.</h2>
            <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-blue-600 text-left mb-8"><p className="text-sm text-slate-700 italic font-medium leading-relaxed">"{archetype.pitch}"</p><p className="text-xs text-slate-400 mt-2 font-bold uppercase">- Rep. Joshua Penner</p></div>
            {IS_FUNDRAISING_ALLOWED ? (<a href={DONATION_URL} target="_blank" className="block w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 uppercase tracking-widest text-sm flex items-center justify-center gap-2"><CreditCard size={18} /> Donate $20.26</a>) : (<div className="p-4 bg-slate-100 rounded-lg text-xs text-slate-500">Fundraising is currently frozen for the legislative session. Thank you for your support!</div>)}
            <button onClick={onReset} className="mt-6 w-full text-slate-400 hover:text-blue-600 text-xs uppercase tracking-widest font-bold py-4">Return to Simulator</button>
         </div>
      </div>
    );
  }
};

// --- MAIN GAME APP ---

export default function App() {
  const [gameState, setGameState] = useState('intro'); 
  // STARTING STATS: Crisis Mode (-15% Budget, 25% Trust)
  const [stats, setStats] = useState({ budget: -15, voters: 25 }); 
  const [lastChange, setLastChange] = useState({ budget: 0, voters: 0 });
  const [pennerScore, setPennerScore] = useState(0); 
  const [streak, setStreak] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [outcome, setOutcome] = useState(null);
  const [activeDeck, setActiveDeck] = useState([]);
  const [history, setHistory] = useState([]); 
  const [votes, setVotes] = useState([]); 
  const [user, setUser] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [feedbackState, setFeedbackState] = useState(null); 
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [advisorText, setAdvisorText] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [playedCardIds, setPlayedCardIds] = useState([]);

  useEffect(() => {
    const initAuth = async () => {
      if (!isDemoMode && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { 
          try { await signInWithCustomToken(auth, __initial_auth_token); } catch(e) { console.warn("Auth failed", e) }
      } else if (!isDemoMode) { 
          try { await signInAnonymously(auth); } catch(e) { console.warn("Auth failed", e) }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setFeedbackState(null);
    setAdvisorOpen(false);
    setAdvisorText('');
    setLastChange({ budget: 0, voters: 0 });
  }, [cardIndex, gameState]);

  const currentCard = activeDeck[cardIndex];

  const handleStart = () => { setGameState('briefing'); };

  const handleEnterSession = () => {
    const deck = getRandomDeck(10, null, []);
    setActiveDeck(deck);
    setPlayedCardIds(deck.map(c => c.id)); 
    setStats({ budget: -15, voters: 25 }); 
    setPennerScore(0);
    setStreak(0);
    setCardIndex(0);
    setHistory([]);
    setVotes([]);
    setOutcome(null);
    setGameState('playing');
  };

  const handleExtend = () => { setGameState('review_session'); };

  const handleReviewFinish = (finalStats, finalScore) => {
    setStats(finalStats);
    setPennerScore(finalScore); 
    setOutcome('win');
    setGameState('gameover');
  };
  
  const handleFinishSession = (finalStats) => {
      setOutcome('win');
      setGameState('gameover');
  };

  const handleAskAdvisor = async (e) => {
    e.stopPropagation();
    setAdvisorOpen(true);
    if (advisorText) return; 
    setAdvisorLoading(true);
    const prompt = `You are a cynical but pragmatic political strategist in Olympia, WA. The issue is: "${currentCard.title} - ${currentCard.description}". The options are: Left="${currentCard.left.label}" or Right="${currentCard.right.label}". Explain the political trade-off in 2 sentences. Be punchy.`;
    const result = await callGemini(prompt);
    setAdvisorText(result);
    setAdvisorLoading(false);
  };

  const handleUndo = () => {
    if (feedbackState) { setFeedbackState(null); if(history.length > 0) { const lastState = history[history.length - 1]; setStats(lastState.stats); setPennerScore(lastState.pennerScore); setStreak(lastState.streak); setVotes(prev => prev.slice(0, -1)); setHistory(prev => prev.slice(0, -1)); } return; }
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setStats(lastState.stats);
    setPennerScore(lastState.pennerScore);
    setStreak(lastState.streak);
    setCardIndex(lastState.cardIndex);
    setVotes(prev => prev.slice(0, -1)); 
    setHistory(prev => prev.slice(0, -1)); 
  };

  const commitSwipe = (direction) => {
    setHistory(prev => [...prev, { stats: {...stats}, pennerScore, streak, cardIndex }]);
    
    // Record Vote
    setVotes(prev => [...prev, { cardId: currentCard.id, direction: direction }]);

    const impacts = currentCard[direction];
    const isAligned = direction === currentCard.pennerStance;
    
    setFeedbackState({ result: impacts.feedback, impacts: impacts, pennerContext: currentCard.pennerContext, isAligned: isAligned, reality: currentCard.reality, communityStats: currentCard.communityStats });

    if (isAligned) setStreak(prev => prev + 1);
    else setStreak(0);

    setLastChange({ budget: impacts.budget, voters: impacts.voters });
    const newStats = { budget: stats.budget + impacts.budget, voters: stats.voters + impacts.voters };
    setStats(newStats);
    setPennerScore(prev => prev + impacts.pennerPoints);
  };

  const handleFeedbackClick = () => {
    if (!feedbackState) return;
    handleNextTurn();
  };

  const handleNextTurn = () => {
    const isLastCard = cardIndex + 1 >= activeDeck.length;
    if (isLastCard) {
        setGameState('session_end_choice'); 
    } else {
      setCardIndex(prev => prev + 1);
    }
  };

  const getCardStyle = () => {
    return { transform: `translateX(0px) rotate(0deg)`, opacity: feedbackState ? 0 : 1, transition: 'none', cursor: 'default' };
  };

  if (gameState === 'intro') return <IntroScreen onStart={handleStart} />;
  if (gameState === 'briefing') return <BriefingScreen onNext={handleEnterSession} />;
  if (gameState === 'session_end_choice') return <SessionEndChoiceScreen onExtend={handleExtend} onFinish={handleFinishSession} stats={stats} />;
  if (gameState === 'review_session') return <ReviewSessionScreen votes={votes} onFinish={handleReviewFinish} />;
  if (gameState === 'gameover') return <GameOverScreen stats={stats} outcome={outcome} pennerScore={pennerScore} onReset={handleStart} onExtend={handleExtend} user={user} totalCards={activeDeck.length} />;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans max-w-md mx-auto shadow-2xl border-x border-slate-200 overflow-y-auto relative">
      {/* HUD */}
      <div className="bg-white pt-8 pb-2 px-4 border-b border-slate-200 z-10 flex-none sticky top-0 shadow-sm">
        <div className="flex justify-between items-start w-full mb-4 gap-4">
          <button onClick={handleUndo} disabled={history.length === 0 || (feedbackState && false)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center shadow-sm border border-slate-300 active:scale-95 shrink-0 transition" title="Motion to Reconsider">
             <RotateCcw size={14} />
          </button>
          <div className="flex-1 flex gap-4">
            <Meter icon={DollarSign} label="State Budget" value={stats.budget} color="bg-green-500" lastChange={lastChange.budget} />
            <Meter icon={Users} label="Voter Trust" value={stats.voters} color="bg-blue-500" lastChange={lastChange.voters} />
          </div>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono uppercase tracking-widest mt-1">
          <div className="flex items-center gap-1">
             <span className="font-bold text-slate-600">Day {(cardIndex * 6) + 1}</span>
             <span className="text-slate-300">/ 60</span>
          </div>
          {streak > 1 && (
            <span className="flex items-center gap-1 text-orange-500 font-bold animate-pulse">
              <Flame size={12} /> {streak}x Combo
            </span>
          )}
        </div>
      </div>

      {/* GAME AREA */}
      <div className="flex-1 relative flex items-center justify-center p-4 bg-slate-50 select-none overflow-hidden min-h-[500px]">
        {/* FEEDBACK POPUP */}
        {feedbackState && (
           <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200 bg-slate-900/70 backdrop-blur-md cursor-pointer" onClick={handleFeedbackClick}>
             <div className="bg-white p-0 shadow-2xl text-center border border-slate-200 w-full max-w-xs relative rounded-2xl overflow-hidden">
               <div className="bg-slate-50 p-4 border-b border-slate-100">
                 <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">Outcome</h3>
               </div>
               <div className="p-6 space-y-6">
                 <div className="flex justify-center gap-2">
                    {feedbackState.impacts.budget !== 0 && (<div className={`px-3 py-1 text-xs font-bold rounded-full ${feedbackState.impacts.budget > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>BUDGET {feedbackState.impacts.budget > 0 ? '+' : ''}{feedbackState.impacts.budget}</div>)}
                    {feedbackState.impacts.voters !== 0 && (<div className={`px-3 py-1 text-xs font-bold rounded-full ${feedbackState.impacts.voters > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>TRUST {feedbackState.impacts.voters > 0 ? '+' : ''}{feedbackState.impacts.voters}</div>)}
                 </div>
                 <p className="text-slate-700 text-md font-medium leading-relaxed">{feedbackState.result}</p>
                 <div className={`p-4 text-left rounded-xl border-l-4 ${feedbackState.isAligned ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}`}>
                   <div className="flex items-center gap-2 mb-2">
                     {feedbackState.isAligned ? <Check size={18} className="text-green-600" /> : <Wrench size={18} className="text-orange-500" />}
                     <span className={`text-xs font-black uppercase tracking-wider ${feedbackState.isAligned ? 'text-green-700' : 'text-orange-700'}`}>{feedbackState.isAligned ? "We Agree" : "Different Approach"}</span>
                   </div>
                   <p className="text-slate-600 text-xs italic leading-relaxed mb-3">"{feedbackState.pennerContext}"</p>
                   <div className="pt-3 border-t border-black/5 flex gap-2 items-start"><History size={12} className="text-slate-400 mt-0.5 shrink-0" /><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">{feedbackState.reality}</p></div>
                 </div>
                 <div className="flex justify-center items-center gap-1 text-slate-400 text-[10px] uppercase tracking-widest font-bold pt-2"><Globe size={12} /><span>{feedbackState.communityStats}% of players voted this way</span></div>
               </div>
               <div className="bg-blue-600 p-3 text-white font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 animate-pulse">Touch to Continue <ChevronDown size={16} /></div>
             </div>
           </div>
        )}
        {/* BACKGROUND & ACTIVE CARDS */}
        <div className="absolute w-full max-w-sm h-[60vh] min-h-[450px] bg-white shadow-sm border border-slate-200 transform scale-95 translate-y-4 z-0 rounded-3xl" />
        {currentCard && (
          <div key={currentCard.id} className="absolute w-full max-w-sm h-[60vh] min-h-[450px] bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-20 rounded-3xl" style={getCardStyle()}>
            <div className={`h-32 ${currentCard.color} flex items-center justify-center text-white p-4 relative`}>
              {currentCard.category === 'Budget' && <DollarSign size={64} className="opacity-90 text-white/20"/>}
              {currentCard.category === 'Care' && <Heart size={64} className="opacity-90 text-white/20"/>}
              {currentCard.category === 'Safety' && <Shield size={64} className="opacity-90 text-white/20"/>}
              {currentCard.category === 'Smart Gov' && <Brain size={64} className="opacity-90 text-white/20"/>}
              {currentCard.category === 'Fixes' && <Wrench size={64} className="opacity-90 text-white/20"/>}
              <div className="absolute top-4 left-4 bg-black/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">{currentCard.category}</div>
              <button onClick={handleAskAdvisor} className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-md transition hover:scale-110 active:scale-95 border border-white/10" title="Intel Brief"><Sparkles size={20} /></button>
            </div>
            {advisorOpen && (
              <div className="absolute inset-0 z-40 bg-slate-900/95 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-200">
                 <h3 className="text-purple-400 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={14} /> Intel Briefing</h3>
                 {advisorLoading ? (<div className="text-slate-400 flex flex-col items-center gap-2"><Loader2 size={24} className="animate-spin" /><span className="text-xs"> analyzing...</span></div>) : (<p className="text-slate-300 font-medium leading-relaxed text-sm border-l-2 border-purple-500 pl-4 text-left">{advisorText}</p>)}
                 <button onClick={(e) => { e.stopPropagation(); setAdvisorOpen(false); }} className="mt-8 text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider border border-slate-700 px-4 py-2 rounded">Close Intel</button>
              </div>
            )}
            <div className="flex-1 p-8 flex flex-col justify-between bg-white">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-3 leading-tight uppercase tracking-tight">{currentCard.title}</h2>
                <p className="text-slate-600 text-md leading-relaxed font-medium">{currentCard.description}</p>
              </div>
              <div className="space-y-2 mt-4">
                 <div className="flex justify-between px-1"><span className="text-[10px] uppercase font-bold text-slate-400">Action</span><span className="text-[10px] uppercase font-bold text-slate-400">Impact</span></div>
                <div className="flex justify-between items-stretch gap-3">
                  <button onClick={() => { commitSwipe('left'); }} className="w-1/2 bg-orange-50 rounded-xl p-3 border border-orange-200 flex flex-col justify-between text-left transition-colors hover:bg-orange-100 active:scale-95">
                    <span className="text-orange-700 font-black text-xs leading-tight mb-1 uppercase">{currentCard.left.label}</span>
                    <span className="text-[10px] text-orange-500 font-bold flex items-center gap-1 uppercase tracking-tight">{currentCard.left.forecast}</span>
                  </button>
                  <button onClick={() => { commitSwipe('right'); }} className="w-1/2 bg-blue-50 rounded-xl p-3 border border-blue-200 flex flex-col justify-between text-right items-end transition-colors hover:bg-blue-100 active:scale-95">
                    <span className="text-blue-700 font-black text-xs leading-tight mb-1 uppercase">{currentCard.right.label}</span>
                    <span className="text-[10px] text-blue-500 font-bold flex items-center gap-1 uppercase tracking-tight">{currentCard.right.forecast}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 h-2 bg-slate-200 z-50"><div className="h-full bg-gradient-to-r from-orange-500 to-blue-600 transition-all duration-500" style={{ width: `${((cardIndex) / activeDeck.length) * 100}%` }}></div></div>
    </div>
  );
}
