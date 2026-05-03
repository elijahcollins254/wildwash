'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Zap, RotateCw, Minus, Trophy, TrendingUp, Heart, AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import GamesNavBar from '@/components/GamesNavBar';
import Modal from '@/components/ui/Modal';

interface WheelSegment {
  id: number;
  label: string;
  multiplier: number;
  color: string;
  probability: number;
}

interface WalletBalance {
  balance: number;
  total_deposits?: number;
  total_winnings?: number;
  total_losses?: number;
}

interface LoyaltyTier {
  name: string;
  minSpins: number;
  bonus: number; // percentage bonus to winnings
  color: string;
}

interface MultiSpinResponse {
  spins: Array<{
    result: WheelSegment;
    winnings: number;
  }>;
  summary: {
    total_spins: number;
    total_winnings: number;
    total_cost: number;
  };
  balance: {
    current: number;
    total_winnings: number;
  };
}

const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 1, label: '2x', multiplier: 2, color: '#D97706', probability: 0.15 },
  { id: 2, label: '0.5x', multiplier: 0.5, color: '#6B21A8', probability: 0.25 },
  { id: 3, label: '3x', multiplier: 3, color: '#F59E0B', probability: 0.08 },
  { id: 4, label: 'LOSE', multiplier: 0, color: '#374151', probability: 0.25 },
  { id: 5, label: '1.5x', multiplier: 1.5, color: '#FBBF24', probability: 0.17 },
  { id: 6, label: '5x', multiplier: 5, color: '#FCD34D', probability: 0.05 },
  { id: 7, label: '1x', multiplier: 1, color: '#78350F', probability: 0.03 },
  { id: 8, label: '2.5x', multiplier: 2.5, color: '#B45309', probability: 0.02 },
];

const LOYALTY_TIERS: LoyaltyTier[] = [
  { name: 'Bronze', minSpins: 0, bonus: 0, color: '#78350F' },
  { name: 'Silver', minSpins: 10, bonus: 2, color: '#C0C0C0' },
  { name: 'Gold', minSpins: 25, bonus: 5, color: '#FBBF24' },
  { name: 'Platinum', minSpins: 50, bonus: 10, color: '#FCD34D' },
];

const SPIN_COST = 20; // KES
const INITIAL_BALANCE = 200; // KES starting balance
const WITHDRAWAL_MINIMUM = 500; // KES minimum to withdraw
const DAILY_LIMIT = 5000; // KES max spend per day
const WEEKLY_LIMIT = 20000; // KES max spend per week

export default function GamesPage() {
  const [activeTab, setActiveTab] = useState<'spin' | 'history' | 'stats'>('spin');
  const [wallet, setWallet] = useState<number>(0);
  const [spinCost, setSpinCost] = useState<number>(SPIN_COST);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [lastResult, setLastResult] = useState<WheelSegment | null>(null);
  const [gameHistory, setGameHistory] = useState<Array<{
    spin: number;
    result: WheelSegment;
    winnings: number;
    timestamp: Date;
  }>>([]);
  const [totalWinnings, setTotalWinnings] = useState<number>(0);
  
  // Multi-spin state
  const [isMultiSpinMode, setIsMultiSpinMode] = useState<boolean>(false);
  const [multiSpinCount, setMultiSpinCount] = useState<number>(5);
  const [multiSpinResults, setMultiSpinResults] = useState<any[]>([]);
  const [multiSpinSummary, setMultiSpinSummary] = useState<any>(null);
  
  // Refs for wheel scroll/flick handling
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const scrollAccumRef = useRef<number>(0);
  const wheelTimeoutRef = useRef<number | null>(null);
  
  // New ethical features
  const [totalSpins, setTotalSpins] = useState<number>(0);
  const [dailySpend, setDailySpend] = useState<number>(0);
  const [weeklySpend, setWeeklySpend] = useState<number>(0);
  const [lastPlayDate, setLastPlayDate] = useState<Date | null>(null);
  const [userSatisfaction, setUserSatisfaction] = useState<number>(100); // 0-100 score
  const [showResponsibleGaming, setShowResponsibleGaming] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalOpen(true);
  };

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://api.wildwash.app/api';

  // Fetch wallet balance from backend
  const fetchWalletFromBackend = async () => {
    try {
      const authState = localStorage.getItem('wildwash_auth_state');
      let token = null;
      if (authState) {
        try {
          const parsed = JSON.parse(authState);
          token = parsed.token;
        } catch (e) {
          // Token parsing failed
        }
      }

      const response = await axios.get<WalletBalance>(
        `${apiBase}/casino/wallet-balance/`,
        {
          headers: {
            ...(token && { 'Authorization': `Token ${token}` }),
          },
        }
      );

      if (response.data?.balance !== undefined) {
        setWallet(response.data.balance);
        // Update localStorage for backup
        localStorage.setItem('game_wallet', response.data.balance.toString());
      }
    } catch (err) {
      // Fallback to localStorage if API fails
      const savedWallet = localStorage.getItem('game_wallet');
      if (savedWallet) {
        setWallet(parseFloat(savedWallet));
      }
    }
  };

  // Load wallet from localStorage and backend
  useEffect(() => {
    // First, load from localStorage for immediate display
    const savedWallet = localStorage.getItem('game_wallet');
    if (savedWallet) {
      setWallet(parseFloat(savedWallet));
    } else {
      setWallet(INITIAL_BALANCE);
    }

    // Then fetch from backend to get the latest database value
    fetchWalletFromBackend();

    const savedHistory = localStorage.getItem('game_history');
    const savedWinnings = localStorage.getItem('game_winnings');
    const savedTotalSpins = localStorage.getItem('game_totalSpins');
    const savedDailySpend = localStorage.getItem('game_dailySpend');
    const savedWeeklySpend = localStorage.getItem('game_weeklySpend');
    const savedLastPlayDate = localStorage.getItem('game_lastPlayDate');
    
    if (savedHistory) {
      const history = JSON.parse(savedHistory);
      setGameHistory(history);
      setTotalSpins(history.length);
    }
    if (savedWinnings) setTotalWinnings(parseFloat(savedWinnings));
    if (savedTotalSpins) setTotalSpins(parseInt(savedTotalSpins));
    if (savedDailySpend) setDailySpend(parseFloat(savedDailySpend));
    if (savedWeeklySpend) setWeeklySpend(parseFloat(savedWeeklySpend));
    if (savedLastPlayDate) setLastPlayDate(new Date(savedLastPlayDate));
  }, []);

  // Save wallet to localStorage
  useEffect(() => {
    localStorage.setItem('game_wallet', wallet.toString());
  }, [wallet]);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('game_history', JSON.stringify(gameHistory));
  }, [gameHistory]);

  // Save winnings to localStorage
  useEffect(() => {
    localStorage.setItem('game_winnings', totalWinnings.toString());
  }, [totalWinnings]);

  // Calculate loyalty tier
  const getLoyaltyTier = () => {
    let tier = LOYALTY_TIERS[0];
    for (const t of LOYALTY_TIERS) {
      if (totalSpins >= t.minSpins) {
        tier = t;
      }
    }
    return tier;
  };

  // Check responsible gaming limits
  const checkSpendingLimits = (): { canPlay: boolean; reason?: string } => {
    const today = new Date();
    const isNewDay = !lastPlayDate || lastPlayDate.toDateString() !== today.toDateString();
    
    // Reset daily limit if new day
    if (isNewDay && lastPlayDate) {
      setDailySpend(0);
    }

    if (dailySpend + spinCost > DAILY_LIMIT) {
      return {
        canPlay: false,
        reason: `Daily limit reached (KES ${DAILY_LIMIT}). Come back tomorrow!`
      };
    }

    if (weeklySpend + spinCost > WEEKLY_LIMIT) {
      return {
        canPlay: false,
        reason: `Weekly limit reached (KES ${WEEKLY_LIMIT}). Enjoy a break and come back next week!`
      };
    }

    return { canPlay: true };
  };

  const getRandomSegment = (): WheelSegment => {
    const random = Math.random();
    let probability = 0;

    for (const segment of WHEEL_SEGMENTS) {
      probability += segment.probability;
      if (random <= probability) {
        return segment;
      }
    }

    return WHEEL_SEGMENTS[WHEEL_SEGMENTS.length - 1];
  };

  const handleSpin = () => {
    // Check spending limits first
    const limitCheck = checkSpendingLimits();
    if (!limitCheck.canPlay) {
      showModal('Limit Reached', limitCheck.reason || '', 'warning');
      return;
    }

    if (wallet < spinCost) {
      showModal('Insufficient Funds', `You need KES ${spinCost} to spin.`, 'error');
      return;
    }

    setIsSpinning(true);
    setWallet(prev => prev - spinCost);
    setDailySpend(prev => prev + spinCost);
    setWeeklySpend(prev => prev + spinCost);
    setLastPlayDate(new Date());

    // Get result immediately and calculate final rotation
    const result = getRandomSegment();
    const segmentIndex = WHEEL_SEGMENTS.indexOf(result);
    const segmentDegrees = (segmentIndex / WHEEL_SEGMENTS.length) * 360;
    
    // Calculate how much to spin to land on this segment (multiple full rotations + final position)
    const randomSpins = Math.random() * 3 + 5; // 5-8 full rotations
    const finalRotation = rotation + randomSpins * 360 + (360 - segmentDegrees);
    
    // Animate wheel with smooth easing
    let currentRotation = rotation;
    const startTime = Date.now();
    const duration = 3000; // 3 second spin
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function - start fast, end slow
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const newRotation = rotation + (finalRotation - rotation) * easeOut;
      setRotation(newRotation);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Spin complete - apply loyalty bonus
        const tier = getLoyaltyTier();
        const loyaltyMultiplier = 1 + (tier.bonus / 100);
        
        let winnings = spinCost * result.multiplier;
        if (result.multiplier > 0) {
          winnings = winnings * loyaltyMultiplier; // Apply bonus only on wins
        }
        
        const netWinnings = winnings - spinCost;

        setLastResult(result);
        setWallet(prev => prev + winnings);
        setTotalWinnings(prev => prev + netWinnings);
        setTotalSpins(prev => prev + 1);
        
        // Update user satisfaction based on performance
        const winRate = Math.random() < (1 - 0.25 - 0.25) ? 1 : 0; // Approximate win rate
        setUserSatisfaction(prev => Math.max(0, prev + (result.multiplier > 1 ? 5 : -3)));
        
        setGameHistory(prev => [
          {
            spin: prev.length + 1,
            result,
            winnings,
            timestamp: new Date(),
          },
          ...prev,
        ]);

        // Sync spin result with backend
        syncSpinWithBackend(spinCost, winnings, result.multiplier, result.label);

        setIsSpinning(false);
      }
    };
    
    requestAnimationFrame(animate);
  };

  // Sync spin result with backend
  const syncSpinWithBackend = async (cost: number, winnings: number, multiplier: number, resultLabel: string) => {
    try {
      const authState = localStorage.getItem('wildwash_auth_state');
      let token = null;
      if (authState) {
        try {
          const parsed = JSON.parse(authState);
          token = parsed.token;
        } catch (e) {
          // Token parsing failed
        }
      }

      const response = await axios.post<WalletBalance>(
        `${apiBase}/casino/wallet/record_spin/`,
        {
          spin_cost: cost,
          winnings: winnings,
          multiplier: multiplier,
          result_label: resultLabel,
        },
        {
          headers: {
            ...(token && { 'Authorization': `Token ${token}` }),
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200 && response.data?.balance !== undefined) {
        // Update local wallet with backend balance to ensure sync
        setWallet(response.data.balance);
        localStorage.setItem('game_wallet', response.data.balance.toString());
      }
    } catch (err: any) {
      console.error('Error syncing spin with backend:', err);
      // Don't show error to user - spin was already processed locally
      // The backend will sync when they refresh or revisit the page
    }
  };

  // Handle multi-spin purchase and automatic spinning
  const handleMultiSpin = async () => {
    if (isSpinning || isMultiSpinMode) return;

    // Check spending limits
    const totalCost = spinCost * multiSpinCount;
    const limitCheck = checkSpendingLimits();
    
    if (!limitCheck.canPlay) {
      showModal('Limit Reached', limitCheck.reason || '', 'warning');
      return;
    }

    if (wallet < totalCost) {
      showModal('Insufficient Funds', `You need KES ${totalCost} for ${multiSpinCount} spins.`, 'error');
      return;
    }

    setIsMultiSpinMode(true);
    setMultiSpinResults([]);
    setMultiSpinSummary(null);

    try {
      const authState = localStorage.getItem('wildwash_auth_state');
      let token = null;
      if (authState) {
        try {
          const parsed = JSON.parse(authState);
          token = parsed.token;
        } catch (e) {
          // Token parsing failed
        }
      }

      // Call backend for multi-spin
      const response = await axios.post<MultiSpinResponse>(
        `${apiBase}/casino/wallet/multi_spin/`,
        {
          num_spins: multiSpinCount,
          spin_cost: spinCost,
        },
        {
          headers: {
            ...(token && { 'Authorization': `Token ${token}` }),
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200 && response.data?.spins) {
        const { spins, summary, balance } = response.data;
        
        // Initialize tracking for balance updates
        let currentBalance = balance.current;
        
        // Animate each spin with full wheel animation
        for (let i = 0; i < spins.length; i++) {
          const spin = spins[i];
          
          // Animate wheel rotation for this spin (4 second animation per spin with more rotations)
          const segmentIndex = WHEEL_SEGMENTS.findIndex(s => s.label === spin.result.label);
          if (segmentIndex !== -1) {
            const segmentDegrees = (segmentIndex / WHEEL_SEGMENTS.length) * 360;
            const randomSpins = Math.random() * 5 + 10; // 10-15 full rotations (more dramatic)
            const finalRotation = rotation + (i === 0 ? 0 : randomSpins * 360) + (360 - segmentDegrees);
            
            // Animate wheel with smooth easing
            let currentRotation = rotation;
            const startTime = Date.now();
            const duration = 4000; // 4 second spin (longer for more rotations)
            
            await new Promise(resolve => {
              const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function - start fast, end slow
                const easeOut = 1 - Math.pow(1 - progress, 3);
                
                const newRotation = rotation + (finalRotation - rotation) * easeOut;
                setRotation(newRotation);
                
                if (progress < 1) {
                  requestAnimationFrame(animate);
                } else {
                  // Spin complete - add to results and update rotation
                  setRotation(finalRotation);
                  setLastResult(spin.result);
                  resolve(null);
                }
              };
              requestAnimationFrame(animate);
            });
          }
          
          // Update balance immediately after this spin completes
          currentBalance = currentBalance - spinCost + spin.winnings;
          setWallet(currentBalance);
          
          // Add this spin to results
          setMultiSpinResults(prev => [...prev, spin]);
          
          // Update total winnings live
          setTotalWinnings(prev => prev + (spin.winnings - spinCost));
          
          // Wait before next spin (0.3s delay between spins - quicker)
          if (i < spins.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        
        // Update final stats from backend
        setWallet(balance.current);
        setTotalWinnings(balance.total_winnings);
        setTotalSpins(prev => prev + multiSpinCount);
        setDailySpend(prev => prev + (spinCost * multiSpinCount));
        setWeeklySpend(prev => prev + (spinCost * multiSpinCount));
        setLastPlayDate(new Date());
        
        // Store summary after all spins complete
        setMultiSpinSummary(summary);
        
        // Add to game history
        const newHistory = spins.map((spin: any, idx: number) => ({
          spin: totalSpins + idx + 1,
          result: spin.result,
          winnings: spin.winnings,
          timestamp: new Date(Date.now() - (multiSpinCount - idx - 1) * 3500),
        }));
        
        // Show multi-spin complete modal
        showModal('Multi-Spin Complete', `You completed ${multiSpinCount} spins and won KES ${summary.total_winnings}!`, 'success');
        
        setGameHistory(prev => [...newHistory, ...prev]);
        
        // Sync with localStorage
        localStorage.setItem('game_wallet', balance.current.toString());
        localStorage.setItem('game_winnings', balance.total_winnings.toString());
      }
    } catch (err: any) {
      console.error('Error performing multi-spin:', err);
      showModal('Error', err.response?.data?.detail || 'Error performing multi-spin. Please try again.', 'error');
      
      // Reset state on error
      setIsMultiSpinMode(false);
      setMultiSpinResults([]);
      setMultiSpinSummary(null);
    } finally {
      setIsMultiSpinMode(false);
    }
  };

  const canSpin = wallet >= spinCost && !isSpinning;
  const canMultiSpin = wallet >= (spinCost * multiSpinCount) && !isSpinning && !isMultiSpinMode;
  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) {
        window.clearTimeout(wheelTimeoutRef.current);
        wheelTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle mouse wheel interactions on the wheel: small scrolls rotate visually,
  // a quick flick (large accumulated delta) triggers a real spin (consumes spin cost)
  const handleWheel = (e: React.WheelEvent) => {
    if (isSpinning) return;
    // prevent page scroll while interacting directly with the wheel
    e.preventDefault();

    const delta = e.deltaY;
    // Immediate visual rotation for feedback
    setRotation(prev => prev + delta * 0.7);

    // Accumulate deltas to detect flicks
    scrollAccumRef.current += delta;

    if (wheelTimeoutRef.current) {
      window.clearTimeout(wheelTimeoutRef.current);
    }

    // If user stops scrolling for 120ms, evaluate accumulated delta
    wheelTimeoutRef.current = window.setTimeout(() => {
      const acc = scrollAccumRef.current;
      scrollAccumRef.current = 0;
      wheelTimeoutRef.current = null;

      const FLICK_THRESHOLD = 150; // adjust sensitivity
      if (Math.abs(acc) > FLICK_THRESHOLD) {
        // Try to trigger an actual spin (same checks as clicking the button)
        const limitCheck = checkSpendingLimits();
        if (!limitCheck.canPlay) {
          showModal('Limit Reached', limitCheck.reason || '', 'warning');
          return;
        }

        if (wallet < spinCost) {
          showModal('Insufficient Funds', `You need KES ${spinCost} to spin.`, 'error');
          return;
        }

        handleSpin();
      }
    }, 120);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white relative">
      {/* Luxury background effects */}
      <div className="fixed inset-0 pointer-events-none opacity-30 z-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-500 rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-amber-600 rounded-full blur-3xl opacity-10"></div>
      </div>

      <div className="relative z-10 pt-4 sm:pt-8 px-3 sm:px-6 lg:px-8 pb-8">
        {/* Back to Casino Button */}
        <Link
          href="/casino"
          className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-medium mb-4 sm:mb-6 transition-colors uppercase tracking-wider text-xs sm:text-sm"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          Back to VIP Casino
        </Link>

        {/* Games Navigation Bar */}
        <GamesNavBar balance={wallet} />

        {/* Custom Tab Navigation */}
        <div className="max-w-7xl mx-auto mt-4 sm:mt-6">
          <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-slate-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('spin')}
              className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold uppercase tracking-wider transition-all text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'spin'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Spin Wheel
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold uppercase tracking-wider transition-all text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'history'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold uppercase tracking-wider transition-all text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'stats'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Stats
            </button>
          </div>

        {/* Tab Content - Spin Wheel */}
        {activeTab === 'spin' && (
        <div className="max-w-7xl mx-auto mt-4 sm:mt-6">
              {/* Main Spin Section with Side Stats */}
              <style>{`
                @keyframes wheelSpin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                @keyframes glow {
                  0%, 100% { box-shadow: 0 0 20px rgba(250, 204, 21, 0.5), 0 0 40px rgba(239, 68, 68, 0.3); }
                  50% { box-shadow: 0 0 40px rgba(250, 204, 21, 0.8), 0 0 60px rgba(239, 68, 68, 0.5); }
                }
                @keyframes pulse-scale {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.05); }
                }
                .wheel-spinning {
                  animation: wheelSpin 0.1s linear infinite !important;
                }
                .wheel-glow {
                  animation: glow 0.6s ease-in-out infinite;
                }
                .pulse-button {
                  animation: pulse-scale 0.6s ease-in-out infinite;
                }
              `}</style>

              {/* TOP SECTION - Net Wins & Multi-Spin (Compact Horizontal) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {/* Net Winnings Card */}
                <div className={`bg-gradient-to-br ${totalWinnings >= 0 ? 'from-emerald-900/40 to-emerald-950/40 border-emerald-400/40' : 'from-red-900/40 to-red-950/40 border-red-400/40'} border rounded-xl p-4 sm:p-6 backdrop-blur-md`}>
                  <p className={`${totalWinnings >= 0 ? 'text-emerald-200/70' : 'text-red-200/70'} text-xs font-semibold uppercase tracking-wider mb-1 sm:mb-2`}>Net Wins</p>
                  <p className={`text-3xl sm:text-4xl font-bold ${totalWinnings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalWinnings}</p>
                  <p className={`${totalWinnings >= 0 ? 'text-emerald-200/50' : 'text-red-200/50'} text-xs mt-1 sm:mt-2`}>KES</p>
                </div>

                {/* Multi-Spin Quick Purchase Card */}
                <div className="bg-gradient-to-br from-slate-900/60 to-slate-950/60 border border-amber-400/30 rounded-xl p-4 sm:p-6 backdrop-blur-md">
                  <h4 className="text-amber-300 font-bold uppercase tracking-wider mb-3 sm:mb-4 text-xs sm:text-sm">Quick Multi-Spin</h4>
                  
                  <div className="flex items-center justify-between gap-2 sm:gap-3 flex-col sm:flex-row">
                    {/* Counter */}
                    <div className="flex items-center justify-center gap-2 bg-slate-800/40 rounded-lg p-2 w-full sm:w-auto">
                      <button
                        onClick={() => setMultiSpinCount(prev => Math.max(1, prev - 1))}
                        disabled={isSpinning || isMultiSpinMode || multiSpinCount <= 1}
                        className="bg-amber-600/40 hover:bg-amber-600/60 disabled:opacity-50 text-amber-300 font-bold px-2 py-1 rounded text-sm transition-all"
                      >
                        −
                      </button>
                      <div className="text-center min-w-12">
                        <span className="text-lg sm:text-xl font-bold text-amber-400">{multiSpinCount}</span>
                      </div>
                      <button
                        onClick={() => setMultiSpinCount(prev => Math.min(50, prev + 1))}
                        disabled={isSpinning || isMultiSpinMode || multiSpinCount >= 50}
                        className="bg-amber-600/40 hover:bg-amber-600/60 disabled:opacity-50 text-amber-300 font-bold px-2 py-1 rounded text-sm transition-all"
                      >
                        +
                      </button>
                    </div>

                    {/* Cost & Button */}
                    <div className="flex-1 w-full sm:w-auto">
                      <p className="text-amber-200/70 text-xs mb-1">Cost: <span className="font-bold text-amber-400">KES {(spinCost * multiSpinCount).toLocaleString()}</span></p>
                      <button
                        onClick={handleMultiSpin}
                        disabled={!canMultiSpin}
                        className={`w-full py-2 rounded-lg font-bold uppercase tracking-wider transition-all text-xs sm:text-sm ${
                          canMultiSpin
                            ? 'bg-gradient-to-r from-purple-600 via-purple-700 to-purple-600 text-white hover:from-purple-500 hover:via-purple-600 hover:to-purple-500 hover:shadow-lg hover:shadow-purple-500/50 shadow-md'
                            : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isMultiSpinMode 
                          ? `SPINNING ${multiSpinResults.length + 1}/${multiSpinCount}...` 
                          : `BUY`
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE SECTION - Wheel with Surrounding Stats (Desktop Grid / Mobile Stack) */}
              <div className="w-full flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 items-center justify-center">
                {/* MOBILE: Stats Row - Above Wheel (lg:hidden) */}
                <div className="w-full lg:hidden grid grid-cols-4 gap-2 sm:gap-3 max-w-4xl px-0 col-span-3">
                  {/* Current Balance */}
                  <div className="bg-gradient-to-br from-green-900/40 to-green-950/40 border border-green-400/40 rounded-lg p-2 sm:p-3 backdrop-blur-md text-center">
                    <p className="text-green-200/70 text-xs font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">Balance</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-400">{wallet}</p>
                    <p className="text-green-200/50 text-xs">KES</p>
                  </div>

                  {/* Total Spins */}
                  <div className="bg-gradient-to-br from-blue-900/40 to-blue-950/40 border border-blue-400/40 rounded-lg p-2 sm:p-3 backdrop-blur-md text-center">
                    <p className="text-blue-200/70 text-xs font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">Spins</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-400">{totalSpins}</p>
                    <p className="text-blue-200/50 text-xs">Total</p>
                  </div>

                  {/* ROI */}
                  <div className="bg-gradient-to-br from-purple-900/40 to-purple-950/40 border border-purple-400/40 rounded-lg p-2 sm:p-3 backdrop-blur-md text-center">
                    <p className="text-purple-200/70 text-xs font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">ROI</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-400">
                      {totalSpins > 0 ? ((totalWinnings / (totalSpins * spinCost)) * 100).toFixed(0) : 0}%
                    </p>
                    <p className="text-purple-200/50 text-xs">Return</p>
                  </div>

                  {/* Loyalty Tier */}
                  {(() => {
                    const tier = getLoyaltyTier();
                    return (
                      <div className="bg-gradient-to-br from-amber-900/40 to-amber-950/40 border border-amber-400/40 rounded-lg p-2 sm:p-3 backdrop-blur-md text-center">
                        <p className="text-amber-200/70 text-xs font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">Tier</p>
                        <p className="text-xl sm:text-2xl font-bold" style={{ color: tier.color }}>{tier.name}</p>
                        <p className="text-amber-200/50 text-xs">+{tier.bonus}%</p>
                      </div>
                    );
                  })()}
                </div>

                {/* DESKTOP: Left Stats (hidden on mobile) */}
                <div className="hidden lg:flex flex-col gap-4 items-end justify-center h-80">
                  {/* Current Balance */}
                  <div className="bg-gradient-to-br from-green-900/40 to-green-950/40 border border-green-400/40 rounded-lg p-4 backdrop-blur-md text-center w-32">
                    <p className="text-green-200/70 text-xs font-semibold uppercase tracking-wider mb-1">Balance</p>
                    <p className="text-xl font-bold text-green-400">{wallet}</p>
                    <p className="text-green-200/50 text-xs">KES</p>
                  </div>

                  {/* Total Spins */}
                  <div className="bg-gradient-to-br from-blue-900/40 to-blue-950/40 border border-blue-400/40 rounded-lg p-4 backdrop-blur-md text-center w-32">
                    <p className="text-blue-200/70 text-xs font-semibold uppercase tracking-wider mb-1">Spins</p>
                    <p className="text-xl font-bold text-blue-400">{totalSpins}</p>
                    <p className="text-blue-200/50 text-xs">Total</p>
                  </div>
                </div>

                {/* CENTER - WHEEL (Large & Centered) */}
                <div className="flex flex-col items-center justify-center lg:col-span-1 w-full">
                  <div className={`relative w-64 h-64 sm:w-80 sm:h-80 mb-4 sm:mb-6 flex-shrink-0 ${isSpinning ? 'wheel-glow' : ''}`}>
                    {/* Outer ring glow effect */}
                    {isSpinning && (
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 opacity-20 blur-xl animate-pulse"></div>
                    )}
                    
                    {/* Wheel */}
                    <div
                      ref={wheelRef}
                      onWheel={handleWheel}
                      className={`w-full h-full rounded-full border-8 border-yellow-400 shadow-2xl flex items-center justify-center transition-transform ${
                        isSpinning ? 'wheel-spinning' : ''
                      }`}
                      style={{
                        cursor: 'grab',
                        transform: !isSpinning ? `rotate(${rotation}deg)` : undefined,
                        transitionDuration: isSpinning ? '0s' : '0s',
                        background: `conic-gradient(from 0deg, ${WHEEL_SEGMENTS.map((seg, i) => {
                          const start = (i / WHEEL_SEGMENTS.length) * 360;
                          const end = ((i + 1) / WHEEL_SEGMENTS.length) * 360;
                          return seg.color + ' ' + start + 'deg ' + end + 'deg';
                        }).join(', ')})`,
                      }}
                    >
                      {/* Center hub - enhanced */}
                      <div className="w-16 h-16 bg-gradient-to-br from-black via-slate-900 to-black rounded-full flex items-center justify-center border-4 border-yellow-400 shadow-lg">
                        <div className="w-11 h-11 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/50">
                          <Zap className="w-6 h-6 text-black animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Pointer - More Visible */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
                      <div className="relative w-6">
                        {/* Outer glow */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-10 border-l-transparent border-r-transparent border-t-amber-200 drop-shadow-2xl" style={{
                          filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 1)) drop-shadow(0 0 6px rgba(251, 146, 21, 1))'
                        }}></div>
                        {/* Main pointer - more visible */}
                        <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-5 border-r-5 border-t-9 border-l-transparent border-r-transparent border-t-white drop-shadow-lg" style={{
                          filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))'
                        }}></div>
                      </div>
                    </div>

                    {/* Wheel Labels */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {WHEEL_SEGMENTS.map((segment, index) => {
                        const angle = (index / WHEEL_SEGMENTS.length) * 360 + 360 / (WHEEL_SEGMENTS.length * 2);
                        const radian = (angle * Math.PI) / 180;
                        const radius = 100;
                        const x = Math.cos(radian) * radius;
                        const y = Math.sin(radian) * radius;

                        return (
                          <div
                            key={segment.id}
                            className="absolute font-bold text-sm text-white drop-shadow-lg"
                            style={{
                              transform: `translate(${x}px, ${y}px)`,
                            }}
                          >
                            {segment.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Spin Button */}
                  <button
                    onClick={handleSpin}
                    disabled={!canSpin}
                    className={`w-32 sm:w-40 py-2 sm:py-3 rounded-full font-bold text-sm sm:text-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wider ${
                      canSpin
                        ? `bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-black hover:from-amber-400 hover:via-amber-500 hover:to-amber-400 hover:shadow-2xl hover:shadow-amber-500/50 shadow-lg`
                        : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <RotateCw className={`w-4 h-4 sm:w-6 sm:h-6 ${isSpinning ? 'animate-spin' : ''}`} />
                    <span className="text-xs sm:text-sm">{isSpinning ? 'SPINNING...' : 'SPIN'}</span>
                  </button>
                </div>

                {/* DESKTOP: Right Stats (hidden on mobile) */}
                <div className="hidden lg:flex flex-col gap-4 items-start justify-center h-80">
                  {/* ROI */}
                  <div className="bg-gradient-to-br from-purple-900/40 to-purple-950/40 border border-purple-400/40 rounded-lg p-4 backdrop-blur-md text-center w-32">
                    <p className="text-purple-200/70 text-xs font-semibold uppercase tracking-wider mb-1">ROI</p>
                    <p className="text-xl font-bold text-purple-400">
                      {totalSpins > 0 ? ((totalWinnings / (totalSpins * spinCost)) * 100).toFixed(0) : 0}%
                    </p>
                    <p className="text-purple-200/50 text-xs">Return</p>
                  </div>

                  {/* Loyalty Tier */}
                  {(() => {
                    const tier = getLoyaltyTier();
                    return (
                      <div className="bg-gradient-to-br from-amber-900/40 to-amber-950/40 border border-amber-400/40 rounded-lg p-4 backdrop-blur-md text-center w-32">
                        <p className="text-amber-200/70 text-xs font-semibold uppercase tracking-wider mb-1">Tier</p>
                        <p className="text-xl font-bold" style={{ color: tier.color }}>{tier.name}</p>
                        <p className="text-amber-200/50 text-xs">+{tier.bonus}%</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
        )}

        {/* Tab Content - Game History */}
        {activeTab === 'history' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 sm:p-5 backdrop-blur-md max-w-7xl mx-auto">
            {/* Recent Spins History */}
            {gameHistory.length > 0 ? (
              gameHistory.map((entry, index) => (
                <div key={index} className="flex justify-between items-center py-2 sm:py-3 border-b border-slate-700 last:border-0 text-xs sm:text-base gap-2">
                  <span className="text-slate-300">Spin {entry.spin}</span>
                  <span className="font-semibold text-amber-400">{entry.result.label}</span>
                  <span className={entry.winnings > spinCost ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                    {entry.winnings - spinCost > 0 ? '+' : ''}{entry.winnings - spinCost} KES
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-8 text-sm">No spins yet. Start playing to see your history!</p>
            )}
          </div>
        )}

        {/* Tab Content - Stats & Limits */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-7xl mx-auto">
            {/* Loyalty Tier & Spending Limits */}
            <div className="space-y-4 sm:space-y-6">
              {/* Loyalty Tier */}
              {(() => {
                const tier = getLoyaltyTier();
                return (
                  <div className="bg-gradient-to-br from-amber-900/20 to-amber-950/40 border border-amber-400/40 rounded-2xl p-4 sm:p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                      <h3 className="text-lg sm:text-xl font-bold text-amber-300">Loyalty Tier</h3>
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: tier.color }}>{tier.name}</p>
                    <p className="text-slate-300 mb-3 sm:mb-4 text-sm">Next milestone: {tier.minSpins} spins</p>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-amber-400 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((totalSpins / tier.minSpins) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-amber-200/70 text-xs sm:text-sm mt-3">Bonus: +{tier.bonus}% on all winnings</p>
                  </div>
                );
              })()}

              {/* Daily & Weekly Limits */}
              <div className="bg-gradient-to-br from-amber-900/20 to-slate-900/40 border border-amber-400/30 rounded-2xl p-4 sm:p-6 backdrop-blur-md">
                <div className="flex items-start gap-3 mb-3 sm:mb-4">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                  <h3 className="text-lg sm:text-xl font-bold text-amber-300">Spending Limits</h3>
                </div>
                
                <div className="mb-4 sm:mb-5">
                  <div className="flex justify-between mb-2 text-xs sm:text-sm">
                    <span className="text-slate-300">Daily Limit</span>
                    <span className="text-amber-400 font-semibold">{dailySpend} / {DAILY_LIMIT} KES</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${dailySpend > DAILY_LIMIT * 0.8 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min((dailySpend / DAILY_LIMIT) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2 text-xs sm:text-sm">
                    <span className="text-slate-300">Weekly Limit</span>
                    <span className="text-amber-400 font-semibold">{weeklySpend} / {WEEKLY_LIMIT} KES</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${weeklySpend > WEEKLY_LIMIT * 0.8 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min((weeklySpend / WEEKLY_LIMIT) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Stats & Odds */}
            <div className="space-y-4 sm:space-y-6">
              {/* Overall Stats */}
              <div className="bg-gradient-to-br from-blue-900/20 to-blue-950/40 border border-blue-400/40 rounded-2xl p-4 sm:p-6 backdrop-blur-md">
                <h3 className="text-lg sm:text-xl font-bold text-blue-300 mb-3 sm:mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                  Your Stats
                </h3>
                <div className="space-y-2 sm:space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Total Spins</span>
                    <span className="text-blue-400 font-bold">{totalSpins}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Total Wagered</span>
                    <span className="text-amber-400 font-bold">{totalSpins * spinCost} KES</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Net Winnings</span>
                    <span className={totalWinnings >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                      {totalWinnings >= 0 ? '+' : ''}{totalWinnings} KES
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 sm:pt-3 border-t border-blue-400/20">
                    <span className="text-slate-300">ROI</span>
                    <span className={`font-bold ${totalSpins > 0 && ((totalWinnings / (totalSpins * spinCost)) * 100) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {totalSpins > 0 ? ((totalWinnings / (totalSpins * spinCost)) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Game Odds */}
              <div className="bg-gradient-to-br from-slate-900/60 via-blue-900/20 to-slate-950/60 border border-blue-400/30 rounded-2xl p-4 sm:p-6 backdrop-blur-md">
                <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 text-blue-300">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  Game Odds
                </h3>
                <div className="space-y-2 text-xs sm:text-sm">
                  {WHEEL_SEGMENTS.map((seg) => (
                    <div key={seg.id} className="flex justify-between items-center">
                      <span className="text-slate-300">{seg.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 sm:w-20 bg-slate-700 rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full bg-amber-400"
                            style={{ width: `${seg.probability * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-amber-300 text-xs font-semibold">{(seg.probability * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3 sm:mt-4 border-t border-blue-400/20 pt-2 sm:pt-3">
                  ✓ All odds are fair and transparent
                </p>
              </div>
            </div>
          </div>
        )}
        </div>

        <div className="text-center text-amber-200/60 text-xs sm:text-sm py-6 sm:py-8 uppercase tracking-wider max-w-7xl mx-auto mt-4 sm:mt-8">
          <p>⚠️ Remember: This is for entertainment only. Gamble responsibly.</p>
        </div>
      </div>
      
      <Modal
        isOpen={modalOpen}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
