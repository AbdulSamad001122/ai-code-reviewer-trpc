"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  ArrowRight,
  Check,
  CheckCircle,
  ChatText,
  GitPullRequest,
  Kanban,
  Notebook,
  Lightning,
  ShieldCheck,
  Sparkle,
  Crown,
  ChartLineUp,
  Cpu,
  Clock,
  Warning,
} from "@phosphor-icons/react";

type TabType = "discovery" | "prd" | "kanban" | "review" | "release";
type MetricTab = "ai-vs-human" | "review-cycle" | "regressions";

export default function LandingPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [activeTab, setActiveTab] = useState<TabType>("discovery");
  const [metricTab, setMetricTab] = useState<MetricTab>("ai-vs-human");
  const [activeAgent, setActiveAgent] = useState<"pm" | "architect" | "developer" | "qa">("pm");
  const [typedText, setTypedText] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  React.useEffect(() => {
    const agents: ("pm" | "architect" | "developer" | "qa")[] = ["pm", "architect", "developer", "qa"];
    const timer = setInterval(() => {
      setActiveAgent((prev) => {
        const index = agents.indexOf(prev);
        return agents[(index + 1) % agents.length];
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const messages = {
      pm: '[PM] Drafting specifications & product requirements for "billing-gateway"...',
      architect: '[Architect] Scaffolding database models and trpc schema...',
      developer: '[Developer] Coding trpc routers/billing.ts & generating feature branch...',
      qa: '[QA] Executing spec verification. 100% PRD goals met. Approved.'
    };
    
    const targetText = messages[activeAgent];
    setTypedText("");
    
    let index = 0;
    const interval = setInterval(() => {
      setTypedText(targetText.substring(0, index + 1));
      index++;
      if (index >= targetText.length) {
        clearInterval(interval);
      }
    }, 15);
    
    return () => clearInterval(interval);
  }, [activeAgent]);

  React.useEffect(() => {
    const tabs: TabType[] = ["discovery", "prd", "kanban", "review", "release"];
    const timer = setTimeout(() => {
      const currentIndex = tabs.indexOf(activeTab);
      const nextIndex = (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[nextIndex]);
    }, 1000);
    return () => clearTimeout(timer);
  }, [activeTab]);
  const [demoEmail, setDemoEmail] = useState("");
  const [demoBooked, setDemoBooked] = useState(false);

  const handleStart = () => {
    setIsNavigating(true);
    if (session) {
      router.push("/dashboard");
    } else {
      router.push("/sign-in");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#051112] text-white font-sans antialiased selection:bg-[#D7FFA4] selection:text-[#0F2124] overflow-x-hidden">
      {/* CSS Styles for custom animations and layout effects */}
      <style>{`
        @keyframes rotate-rays-slow {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes zoom-rays {
          0% {
            opacity: 0.08;
            transform: translate(-50%, -50%) scale(0.7);
          }
          50% {
            opacity: 0.45;
          }
          100% {
            opacity: 0.08;
            transform: translate(-50%, -50%) scale(1.4);
          }
        }
        @keyframes mascot-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes wing-wiggle {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-15deg); }
        }
        @keyframes shimmer-line {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes float-y-1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes float-y-2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes float-y-3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer-fast {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.85); opacity: 0.7; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .animate-rotate-slow {
          animation: rotate-rays-slow 180s linear infinite;
        }
        .animate-zoom-rays {
          animation: zoom-rays 12s infinite linear;
        }
        .animate-mascot {
          animation: mascot-bounce 3.5s ease-in-out infinite;
        }
        .animate-wing {
          animation: wing-wiggle 1.2s ease-in-out infinite;
          transform-origin: 22px 24px;
        }
        .animate-shimmer {
          stroke-dasharray: 8 16;
          animation: shimmer-line 4s linear infinite;
        }
        .animate-float-1 {
          animation: float-y-1 4s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-y-2 4.5s ease-in-out infinite;
        }
        .animate-float-3 {
          animation: float-y-3 3.5s ease-in-out infinite;
        }
        .animate-pipeline-glow {
          stroke-dasharray: 6 12;
          animation: shimmer-fast 1.5s linear infinite;
        }
        .animate-pulse-ring {
          transform-origin: 300px 240px;
          animation: pulse-ring 3s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
        }
      `}</style>

      {/* Luminous Background Tunnel & Coordinate Grid Lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* Radial mask */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#051112_90%)] z-10" />

        {/* Shiny Background Glow Flare */}
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,rgba(0,242,254,0.14)_0%,rgba(215,255,164,0.08)_40%,transparent_75%)] blur-3xl" />

        {/* Supersonik style rotating rays */}
        <svg viewBox="0 0 1000 1000" className="absolute top-[40%] left-1/2 w-[220vw] h-[220vh] opacity-35 mix-blend-screen animate-rotate-slow">
          <defs>
            <radialGradient id="ray-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#D7FFA4" stopOpacity="0.65" />
              <stop offset="35%" stopColor="#00FF87" stopOpacity="0.2" />
              <stop offset="70%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g>
            <path d="M500,500 L200,-500 L320,-500 Z" fill="url(#ray-grad)" />
            <path d="M500,500 L680,-500 L800,-500 Z" fill="url(#ray-grad)" />
            <path d="M500,500 L1500,150 L1500,270 Z" fill="url(#ray-grad)" />
            <path d="M500,500 L1500,720 L1500,850 Z" fill="url(#ray-grad)" />
            <path d="M500,500 L820,1500 L680,1500 Z" fill="url(#ray-grad)" />
            <path d="M500,500 L320,1500 L180,1500 Z" fill="url(#ray-grad)" />
            <path d="M500,500 L-500,780 L-500,650 Z" fill="url(#ray-grad)" />
            <path d="M500,500 L-500,220 L-500,80 Z" fill="url(#ray-grad)" />
          </g>
        </svg>

        {/* Outward Zoom tunnel */}
        <svg viewBox="0 0 1000 1000" className="absolute top-[40%] left-1/2 w-[200vw] h-[200vh] mix-blend-screen animate-zoom-rays">
          <defs>
            <radialGradient id="zoom-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#D7FFA4" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.1" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g>
            <path d="M500,500 L150,-400 L280,-400 Z" fill="url(#zoom-grad)" />
            <path d="M500,500 L720,-400 L850,-400 Z" fill="url(#zoom-grad)" />
            <path d="M500,500 L1400,220 L1400,350 Z" fill="url(#zoom-grad)" />
            <path d="M500,500 L1400,680 L1400,800 Z" fill="url(#zoom-grad)" />
          </g>
        </svg>

        {/* Concentric wireframe orbits behind mascot (Weave inspired background grids) */}
        <svg viewBox="0 0 1000 1000" className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160vw] h-[160vh] opacity-15">
          <circle cx="500" cy="500" r="100" stroke="#D7FFA4" strokeWidth="0.8" fill="none" className="animate-shimmer" />
          <circle cx="500" cy="500" r="220" stroke="#D7FFA4" strokeWidth="0.8" fill="none" strokeDasharray="4 8" />
          <circle cx="500" cy="500" r="340" stroke="#00f2fe" strokeWidth="0.8" fill="none" className="animate-shimmer" />
          <circle cx="500" cy="500" r="460" stroke="#00f2fe" strokeWidth="0.8" fill="none" strokeDasharray="6 12" />
        </svg>
      </div>

      {/* Navbar */}
      <header className="relative z-20 w-full px-6 lg:px-10 xl:px-16">
        <nav className="relative mx-auto flex h-20 max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#D7FFA4] text-[#0F2124] font-black text-lg shadow-[0_0_15px_rgba(215,255,164,0.3)]">
              T
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              TheShip<span className="text-[#D7FFA4]">.ai</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#demo" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Products</a>
            <a href="#metrics" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Enterprise</a>
            <a href="#pricing" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            {isPending ? (
              <div className="flex items-center gap-4 animate-pulse opacity-60">
                <button
                  disabled
                  className="text-xs font-semibold text-white/40 cursor-not-allowed mr-2"
                >
                  Sign In
                </button>
                <button
                  disabled
                  className="flex h-10 items-center justify-center rounded-lg bg-[#D7FFA4]/20 px-4 text-xs font-bold text-[#D7FFA4]/40 cursor-not-allowed"
                >
                  Get Started
                </button>
              </div>
            ) : session ? (
              <button
                onClick={handleStart}
                disabled={isNavigating}
                className="flex items-center gap-1.5 rounded-lg bg-[#D7FFA4] px-4 py-2.5 text-xs font-bold text-[#0F2124] transition-all hover:bg-[#cbf58e] hover:shadow-[0_0_15px_rgba(215,255,164,0.4)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isNavigating ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5 text-[#0F2124]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  <>Go to Dashboard <ArrowRight weight="bold" className="size-3.5" /></>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsNavigating(true);
                    router.push("/sign-in");
                  }}
                  disabled={isNavigating}
                  className="text-xs font-semibold text-white/80 hover:text-white transition-colors mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sign In
                </button>
                <button
                  onClick={handleStart}
                  disabled={isNavigating}
                  className="flex h-10 items-center justify-center rounded-lg bg-[#D7FFA4] px-4 text-xs font-bold text-[#0F2124] transition hover:bg-[#cbf58e] cursor-pointer shadow-[0_0_15px_rgba(215,255,164,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isNavigating ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin h-3.5 w-3.5 text-[#0F2124]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    "Get Started"
                  )}
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section: Weave-styled Split Layout */}
      <section className="relative z-10 pt-16 pb-20 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-start">
          
          {/* Left Title: Massive typography */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
              Measure the value<br/>
              your code gets from AI.
            </h1>
          </div>

          {/* Right Description & Action Block */}
          <div className="space-y-5 lg:pt-3">
            <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-md">
              TheShip normalizes engineering delivery into a single automated pipeline. Calibrated to expert reviews, structured task validation, and DORA metrics, not line counts.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleStart}
                disabled={isNavigating}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#D7FFA4] px-6 text-xs font-bold text-[#0F2124] transition hover:bg-[#cbf58e] cursor-pointer shadow-[0_0_15px_rgba(215,255,164,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isNavigating ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5 text-[#0F2124]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  "Get Started for Free"
                )}
              </button>
              <a
                href="#demo"
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Book a Demo
              </a>
            </div>
          </div>
        </div>

        {/* Weave-style Total Output / Review Velocity Card & Winking Mascot */}
        <div className="mt-16 relative flex flex-col lg:flex-row items-center justify-between gap-10 bg-[#0F2124]/40 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          
          <div className="flex-1 w-full space-y-6">
            
            {/* Header of Metrics */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#D7FFA4]">Total output / Feature Velocity</span>
                </div>
                <p className="text-xs text-white/50">Normalized units of review. Benchmarked against comparable teams, last 13 weeks.</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-2xl font-black text-white">9.6 <span className="text-xs font-normal text-white/50">/week</span></span>
                <span className="block text-[10px] text-emerald-400 font-semibold">• 95th percentile</span>
              </div>
            </div>

            {/* Metric Tab Selector */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMetricTab("ai-vs-human")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${metricTab === "ai-vs-human" ? "bg-white/10 text-white border border-white/20" : "text-white/50 hover:text-white"}`}
              >
                AI vs manual
              </button>
              <button
                onClick={() => setMetricTab("review-cycle")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${metricTab === "review-cycle" ? "bg-white/10 text-white border border-white/20" : "text-white/50 hover:text-white"}`}
              >
                Review cycle time
              </button>
              <button
                onClick={() => setMetricTab("regressions")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${metricTab === "regressions" ? "bg-white/10 text-white border border-white/20" : "text-white/50 hover:text-white"}`}
              >
                Regressions caught
              </button>
            </div>

            {/* Stacked Bar Chart */}
            <div className="h-44 w-full flex items-end justify-between gap-2.5 pt-4">
              {metricTab === "ai-vs-human" ? (
                <>
                  {/* Jan 19 */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="w-full flex flex-col justify-end gap-1 h-36">
                      <div className="w-full bg-[#10b981] h-[55%] rounded-sm hover:brightness-110 transition-all cursor-help" title="AI work: 55%" />
                      <div className="w-full bg-[#f97316] h-[30%] rounded-sm hover:brightness-110 transition-all cursor-help" title="Manual work: 30%" />
                    </div>
                    <span className="text-[10px] text-white/40">Jan 19</span>
                  </div>
                  {/* Jan 26 */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="w-full flex flex-col justify-end gap-1 h-36">
                      <div className="w-full bg-[#10b981] h-[60%] rounded-sm hover:brightness-110 transition-all" />
                      <div className="w-full bg-[#f97316] h-[25%] rounded-sm hover:brightness-110 transition-all" />
                    </div>
                    <span className="text-[10px] text-white/40">Jan 26</span>
                  </div>
                  {/* Feb 2 */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="w-full flex flex-col justify-end gap-1 h-36">
                      <div className="w-full bg-[#10b981] h-[75%] rounded-sm hover:brightness-110 transition-all" />
                      <div className="w-full bg-[#f97316] h-[15%] rounded-sm hover:brightness-110 transition-all" />
                    </div>
                    <span className="text-[10px] text-white/40">Feb 2</span>
                  </div>
                  {/* Feb 9 */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="w-full flex flex-col justify-end gap-1 h-36">
                      <div className="w-full bg-[#10b981] h-[80%] rounded-sm hover:brightness-110 transition-all" />
                      <div className="w-full bg-[#f97316] h-[10%] rounded-sm hover:brightness-110 transition-all" />
                    </div>
                    <span className="text-[10px] text-white/40">Feb 9</span>
                  </div>
                  {/* Feb 16 */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="w-full flex flex-col justify-end gap-1 h-36">
                      <div className="w-full bg-[#10b981] h-[90%] rounded-sm hover:brightness-110 transition-all" />
                      <div className="w-full bg-[#f97316] h-[5%] rounded-sm hover:brightness-110 transition-all" />
                    </div>
                    <span className="text-[10px] text-white/40">Feb 16</span>
                  </div>
                </>
              ) : metricTab === "review-cycle" ? (
                <>
                  <div className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col justify-end h-36">
                      <div className="w-full bg-[#06b6d4] h-[80%] rounded-sm" />
                    </div>
                    <span className="text-[10px] text-white/40">Jan 19</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col justify-end h-36">
                      <div className="w-full bg-[#06b6d4] h-[60%] rounded-sm" />
                    </div>
                    <span className="text-[10px] text-white/40">Jan 26</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col justify-end h-36">
                      <div className="w-full bg-[#06b6d4] h-[40%] rounded-sm" />
                    </div>
                    <span className="text-[10px] text-white/40">Feb 2</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col justify-end h-36">
                      <div className="w-full bg-[#06b6d4] h-[25%] rounded-sm" />
                    </div>
                    <span className="text-[10px] text-white/40">Feb 9</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col justify-end h-36">
                      <div className="w-full bg-[#06b6d4] h-[12%] rounded-sm" />
                    </div>
                    <span className="text-[10px] text-white/40">Feb 16</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col justify-end h-36">
                      <div className="w-full bg-amber-500 h-[20%] rounded-sm" />
                    </div>
                    <span className="text-[10px] text-white/40">Jan 19</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col justify-end h-36">
                      <div className="w-full bg-amber-500 h-[35%] rounded-sm" />
                    </div>
                    <span className="text-[10px] text-white/40">Jan 26</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col justify-end h-36">
                      <div className="w-full bg-amber-500 h-[60%] rounded-sm" />
                    </div>
                    <span className="text-[10px] text-white/40">Feb 2</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col justify-end h-36">
                      <div className="w-full bg-amber-500 h-[75%] rounded-sm" />
                    </div>
                    <span className="text-[10px] text-white/40">Feb 9</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col justify-end h-36">
                      <div className="w-full bg-amber-500 h-[95%] rounded-sm" />
                    </div>
                    <span className="text-[10px] text-white/40">Feb 16</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Unique Winking Developer Mascot (Cute robot parrot for TheShip) */}
          <div className="w-48 h-48 shrink-0 flex items-center justify-center animate-mascot relative">
            {/* Small glowing circle behind mascot */}
            <div className="absolute inset-0 bg-[#D7FFA4]/10 rounded-full blur-2xl pointer-events-none" />

            <svg viewBox="0 0 100 100" className="w-40 h-40">
              {/* Legs */}
              <line x1="42" y1="78" x2="42" y2="90" stroke="#D7FFA4" strokeWidth="3" strokeLinecap="round" />
              <line x1="58" y1="78" x2="58" y2="90" stroke="#D7FFA4" strokeWidth="3" strokeLinecap="round" />
              <circle cx="42" cy="90" r="3" fill="#D7FFA4" />
              <circle cx="58" cy="90" r="3" fill="#D7FFA4" />

              {/* Main Body */}
              <rect x="25" y="25" width="50" height="55" rx="20" fill="url(#bodyGrad)" stroke="#D7FFA4" strokeWidth="2.5" />

              {/* Head Gradient definition */}
              <defs>
                <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0F2124" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>

              {/* Head screen */}
              <rect x="33" y="33" width="34" height="24" rx="8" fill="#0A1A1B" stroke="#white" strokeWidth="1" />

              {/* Winking Eyes */}
              {/* Left Eye: Happy wink */}
              <path d="M40,43 L45,43" stroke="#D7FFA4" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M40,43 Q42.5,40 45,43" stroke="#D7FFA4" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              
              {/* Right Eye: Round winking eye */}
              <circle cx="58" cy="44" r="3.5" fill="#D7FFA4" />

              {/* Beak / mouth */}
              <polygon points="46,50 54,50 50,56" fill="#f97316" stroke="#f97316" strokeWidth="1" strokeLinejoin="round" />

              {/* Left Wing (Wiggling wing) */}
              <path d="M25,48 C15,48 10,40 8,36" stroke="#D7FFA4" strokeWidth="3.5" strokeLinecap="round" className="animate-wing" />

              {/* Right Wing */}
              <path d="M75,48 C82,53 88,58 90,62" stroke="#D7FFA4" strokeWidth="3.5" strokeLinecap="round" />

              {/* Little antenna with glowing dot */}
              <line x1="50" y1="25" x2="50" y2="14" stroke="#D7FFA4" strokeWidth="2.5" />
              <circle cx="50" cy="14" r="4.5" fill="#D7FFA4" className="animate-pulse" />
            </svg>
          </div>

        </div>
      </section>

      {/* Interactive Playground Section */}
      <section id="demo" className="bg-[#0A1A1B] border-y border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#D7FFA4]">Interactive Playground</p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2">See how TheShip AI builds your software</h2>
            <p className="text-sm text-white/50 mt-3">Click through the steps of the feature delivery cycle below.</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Tab buttons */}
            <div className="flex flex-row lg:flex-col overflow-x-auto gap-2 p-1.5 bg-[#0F2124]/40 border border-white/5 rounded-xl lg:h-fit shrink-0 scrollbar-none">
              <button
                onClick={() => setActiveTab("discovery")}
                className={`flex items-center gap-3 w-full shrink-0 px-4 py-3 rounded-lg text-left text-xs font-semibold transition-all cursor-pointer ${activeTab === "discovery" ? "bg-[#D7FFA4] text-[#0F2124] font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
              >
                <ChatText className="size-4" /> Step 1: Discovery Chat
              </button>
              <button
                onClick={() => setActiveTab("prd")}
                className={`flex items-center gap-3 w-full shrink-0 px-4 py-3 rounded-lg text-left text-xs font-semibold transition-all cursor-pointer ${activeTab === "prd" ? "bg-[#D7FFA4] text-[#0F2124] font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
              >
                <Notebook className="size-4" /> Step 2: AI spec (PRD)
              </button>
              <button
                onClick={() => setActiveTab("kanban")}
                className={`flex items-center gap-3 w-full shrink-0 px-4 py-3 rounded-lg text-left text-xs font-semibold transition-all cursor-pointer ${activeTab === "kanban" ? "bg-[#D7FFA4] text-[#0F2124] font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
              >
                <Kanban className="size-4" /> Step 3: Kanban Planning
              </button>
              <button
                onClick={() => setActiveTab("review")}
                className={`flex items-center gap-3 w-full shrink-0 px-4 py-3 rounded-lg text-left text-xs font-semibold transition-all cursor-pointer ${activeTab === "review" ? "bg-[#D7FFA4] text-[#0F2124] font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
              >
                <GitPullRequest className="size-4" /> Step 4: AI Code Review
              </button>
              <button
                onClick={() => setActiveTab("release")}
                className={`flex items-center gap-3 w-full shrink-0 px-4 py-3 rounded-lg text-left text-xs font-semibold transition-all cursor-pointer ${activeTab === "release" ? "bg-[#D7FFA4] text-[#0F2124] font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
              >
                <CheckCircle className="size-4" /> Step 5: Release Approved
              </button>
            </div>

            {/* Tab content display */}
            <div className="border border-white/5 rounded-2xl bg-[#0F2124]/40 overflow-hidden shadow-2xl min-h-[480px] flex flex-col">
              {/* Header bar of window */}
              <div className="bg-[#0F2124]/80 px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-500/20 border border-red-500/30" />
                  <div className="size-3 rounded-full bg-amber-500/20 border border-amber-500/30" />
                  <div className="size-3 rounded-full bg-green-500/20 border border-green-500/30" />
                </div>
                <div className="text-[10px] font-mono text-white/30 ml-4 max-w-sm truncate bg-[#0A1A1B] px-3 py-1 rounded border border-white/5">
                  {activeTab === "discovery" && "theship.ai/dashboard/project/feature-discovery"}
                  {activeTab === "prd" && "theship.ai/dashboard/project/features/prd_spec"}
                  {activeTab === "kanban" && "theship.ai/dashboard/project/kanban-board"}
                  {activeTab === "review" && "github.com/theship-ai/app/pull/42"}
                  {activeTab === "release" && "theship.ai/dashboard/release-center"}
                </div>
              </div>

              {/* Body Content */}
              <div className="flex-1 p-6 font-sans text-sm">
                {activeTab === "discovery" && (
                  <div className="space-y-4 max-w-3xl">
                    <div className="flex items-start gap-3">
                      <div className="size-7 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold">U</div>
                      <div className="bg-white/5 p-3 rounded-lg border border-white/5 max-w-md">
                        <p className="text-white font-medium text-xs">User Request</p>
                        <p className="text-white/80 mt-1">I want to integrate a dark mode toggle button in the navbar.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="size-7 rounded bg-[#D7FFA4] text-[#0F2124] flex items-center justify-center text-[10px] font-extrabold">PM</div>
                      <div className="bg-[#D7FFA4]/10 p-3 rounded-lg border border-[#D7FFA4]/20 max-w-md">
                        <p className="text-[#D7FFA4] font-medium text-xs">AI PM Agent</p>
                        <p className="text-white/90 mt-1">Should the dark mode toggle switch automatically based on the user's system preferences as well, or only manually?</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "prd" && (
                  <div className="space-y-4 max-w-3xl">
                    <div className="border border-white/10 rounded-lg p-5 bg-card/10 space-y-4">
                      <h3 className="text-base font-bold text-white border-b border-white/5 pb-2">Product Requirements Document: Dark Mode Support</h3>
                      
                      <div>
                        <h4 className="text-xs font-semibold text-[#D7FFA4] uppercase tracking-wider">1. Problem Statement</h4>
                        <p className="text-xs text-white/80 mt-1">Users require a dark mode toggle to improve legibility and reduce eye strain.</p>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-semibold text-[#D7FFA4] uppercase tracking-wider">2. Goals & Scope</h4>
                        <ul className="text-xs list-disc list-inside text-white/80 mt-1 space-y-1">
                          <li>Integrate a manual dark/light toggle in the navbar.</li>
                          <li>Respect OS system preferences on first visit.</li>
                          <li>Ensure state is persisted in localStorage.</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-[#D7FFA4] uppercase tracking-wider">3. Acceptance Criteria</h4>
                        <ul className="text-xs list-decimal list-inside text-white/80 mt-1 space-y-1">
                          <li>Toggle is keyboard accessible.</li>
                          <li>All cards and sidebars transition colors smoothly.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "kanban" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* To Do column */}
                    <div className="border border-white/5 rounded-lg p-3 bg-white/5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                        <span className="text-xs font-bold text-white/80">To Do</span>
                        <Badge variant="outline" className="text-[10px]">1</Badge>
                      </div>
                      <div className="bg-white/5 border border-white/5 p-3 rounded-md space-y-1.5 shadow-sm">
                        <h4 className="text-xs font-bold text-white">Add transition styling for background changes</h4>
                        <p className="text-[10px] text-white/50">Apply smooth duration-300 transitions to global cards and text layouts.</p>
                      </div>
                    </div>

                    {/* In Progress */}
                    <div className="border border-white/5 rounded-lg p-3 bg-white/5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                        <span className="text-xs font-bold text-white/80">In Progress</span>
                        <Badge variant="outline" className="text-[10px]">1</Badge>
                      </div>
                      <div className="bg-white/5 border border-[#D7FFA4]/20 p-3 rounded-md space-y-1.5 shadow-sm ring-1 ring-[#D7FFA4]/10">
                        <h4 className="text-xs font-bold text-[#D7FFA4]">Create ThemeProvider and theme toggle context</h4>
                        <p className="text-[10px] text-white/60">Define ThemeContext and hook up custom toggle functionality.</p>
                      </div>
                    </div>

                    {/* Done */}
                    <div className="border border-white/5 rounded-lg p-3 bg-white/5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                        <span className="text-xs font-bold text-white/80">Done</span>
                        <Badge variant="outline" className="text-[10px]">2</Badge>
                      </div>
                      <div className="bg-white/5 border border-white/5 p-3 rounded-md space-y-1 opacity-50">
                        <h4 className="text-xs font-bold text-white line-through">Add Toggle button in navbar UI</h4>
                      </div>
                      <div className="bg-white/5 border border-white/5 p-3 rounded-md space-y-1 opacity-50 mt-2">
                        <h4 className="text-xs font-bold text-white line-through">Set up localStorage theme caching</h4>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "review" && (
                  <div className="space-y-4">
                    {/* PR Diff mock */}
                    <div className="border border-white/10 rounded-lg overflow-hidden font-mono text-xs">
                      <div className="bg-white/5 px-4 py-2 border-b border-white/5 text-white/60">
                        src/components/navbar.tsx
                      </div>
                      <div className="p-3 bg-black/40 space-y-0.5">
                        <div className="text-zinc-500">@@ -15,5 +15,9 @@ export function Navbar() &#123;</div>
                        <div className="text-red-300 bg-red-950/20 px-2">-   return &lt;div className="h-16"&gt;;</div>
                        <div className="text-green-300 bg-green-950/20 px-2">+   const &#123; theme, toggleTheme &#125; = useTheme();</div>
                        <div className="text-green-300 bg-green-950/20 px-2">+   return (</div>
                        <div className="text-green-300 bg-green-950/20 px-2">+     &lt;div className="h-16"&gt;</div>
                        <div className="text-green-300 bg-green-950/20 px-2">+       &lt;button onClick=&#123;toggleTheme&#125;&gt;Toggle&lt;/button&gt;</div>
                      </div>
                    </div>

                    {/* AI Code Review annotation */}
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-500 font-bold">AI</div>
                        <span className="text-xs font-bold text-amber-500">Code Review Warning</span>
                      </div>
                      <p className="text-xs text-white/80">
                        The toggle button does not have an `aria-label` or accessible text tag, which breaks the keyboard accessibility goal specified in Section 3 of the PRD.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "release" && (
                  <div className="max-w-xl mx-auto border border-white/10 p-6 rounded-xl bg-gradient-to-b from-white/5 to-transparent space-y-6 text-center">
                    <div className="size-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                      <CheckCircle weight="fill" className="size-8" />
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-white">All specifications satisfied</h3>
                      <p className="text-xs text-muted-foreground">
                        AI PM and QA tests confirmed that all goals and acceptance criteria outlined in the PRD are fully implemented.
                      </p>
                    </div>

                    <div className="flex justify-center gap-3">
                      <button className="px-5 py-2.5 rounded-lg border border-red-500/30 text-red-400 bg-red-950/10 text-xs font-semibold hover:bg-red-950/20 transition-all cursor-pointer">
                        Reject Release
                      </button>
                      <button className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer">
                        Approve Release
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Runlayer-inspired Metrics & Agent Stack Section */}
      <section id="metrics" className="bg-[#061214] border-t border-white/5 py-28 overflow-hidden relative">
        {/* Subtle luminous glow flares */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,242,254,0.06)_0%,transparent_70%)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(215,255,164,0.04)_0%,transparent_70%)] blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            {/* Left Column (Tagline, Description, Book a Demo Form) */}
            <div className="lg:col-span-5 space-y-6">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#D7FFA4]">Agentic Pipeline</p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.05] max-w-lg">
                All in on AI.
              </h2>
              <p className="text-base sm:text-lg text-white/60 leading-relaxed max-w-md pt-1">
                Give every team the golden path to use agents, then watch adoption multiply. AI enablement, code validation, and delivery control in one platform.
              </p>

              {/* Interactive Book a Demo form */}
              <div className="pt-4">
                {demoBooked ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 max-w-md">
                    <p className="text-sm font-semibold text-emerald-400">🎉 Demo request received!</p>
                    <p className="text-xs text-white/50 mt-1">Our team will reach out to you shortly to schedule your personalized demo session.</p>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (demoEmail) {
                        setDemoBooked(true);
                      }
                    }}
                    className="flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-0 sm:bg-white/5 sm:border sm:border-white/10 sm:rounded-full p-1.5 max-w-md w-full"
                  >
                    <input
                      type="email"
                      required
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      placeholder="Enter your email..."
                      className="bg-white/5 border border-white/10 rounded-full sm:bg-transparent sm:border-0 px-5 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-0 w-full"
                    />
                    <button
                      type="submit"
                      className="bg-white hover:bg-white/90 text-black px-6 py-3 rounded-full text-sm font-bold transition-all shadow-lg shrink-0 cursor-pointer"
                    >
                      Book a Demo
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column (Isometric Animated SVG stack) */}
            <div className="lg:col-span-7 flex justify-center items-center w-full relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

              <svg viewBox="0 0 600 500" className="w-full h-auto max-w-[600px] select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="cyanGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#D7FFA4" stopOpacity="0.15"/>
                  </radialGradient>
                  <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D7FFA4" />
                    <stop offset="100%" stopColor="#00F2FE" />
                  </linearGradient>
                  <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Blueprint Isometric Grid Lines */}
                <g stroke="white" strokeOpacity="0.02" strokeWidth="1">
                  {/* Up-Right Grid lines */}
                  <path d="M 50,300 L 450,100" />
                  <path d="M 100,350 L 500,150" />
                  <path d="M 150,400 L 550,200" />
                  <path d="M 200,450 L 600,250" />
                  {/* Down-Right Grid lines */}
                  <path d="M 200,100 L 500,250" />
                  <path d="M 150,150 L 450,300" />
                  <path d="M 100,200 L 400,350" />
                  <path d="M 50,250 L 350,400" />
                </g>

                {/* Active radar/pulse ring under CPU */}
                <ellipse cx="300" cy="240" rx="90" ry="48" fill="none" stroke="url(#cyanGlow)" strokeWidth="1.5" className="animate-pulse-ring" />

                {/* Pipeline Connection Lines (Solid underlays) */}
                <g stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 300,240 L 430,175 L 430,150" />
                  <path d="M 300,240 L 410,185 L 470,215" />
                  <path d="M 300,240 L 440,310 L 510,275 L 510,260" />
                  <path d="M 300,240 L 200,290 L 170,310" />
                  <path d="M 300,240 L 260,260 L 260,340 L 240,350" />
                  <path d="M 300,240 L 330,255 L 330,380 L 310,390" />
                </g>

                {/* Glowing Dashed Pipeline Overlays (Data streams flowing) */}
                <g strokeLinecap="round" strokeLinejoin="round">
                  {/* To GitHub stack (lime) */}
                  <path d="M 300,240 L 430,175 L 430,150" stroke="#D7FFA4" strokeWidth="2" className="animate-pipeline-glow" style={{ animationDelay: "0.2s", animationDuration: "1.4s" }} />
                  {/* To PRD Server (cyan) */}
                  <path d="M 300,240 L 410,185 L 470,215" stroke="#00F2FE" strokeWidth="2" className="animate-pipeline-glow" style={{ animationDelay: "0.5s", animationDuration: "2s" }} />
                  {/* To Kanban Server (lime) */}
                  <path d="M 300,240 L 440,310 L 510,275 L 510,260" stroke="#D7FFA4" strokeWidth="2" className="animate-pipeline-glow" style={{ animationDelay: "0s", animationDuration: "1.7s" }} />
                  {/* To Cursor Card (cyan) */}
                  <path d="M 300,240 L 200,290 L 170,310" stroke="#00F2FE" strokeWidth="2" className="animate-pipeline-glow" style={{ animationDelay: "0.4s", animationDuration: "1.5s" }} />
                  {/* To VS Code Card (lime) */}
                  <path d="M 300,240 L 260,260 L 260,340 L 240,350" stroke="#D7FFA4" strokeWidth="2" className="animate-pipeline-glow" style={{ animationDelay: "0.1s", animationDuration: "2.1s" }} />
                  {/* To Claude Code Card (cyan) */}
                  <path d="M 300,240 L 330,255 L 330,380 L 310,390" stroke="#00F2FE" strokeWidth="2" className="animate-pipeline-glow" style={{ animationDelay: "0.7s", animationDuration: "1.8s" }} />
                </g>

                {/* Central CPU / Engine Layer Block */}
                <g>
                  {/* Base layer */}
                  <polygon points="300,208 360,240 300,272 240,240" fill="#0A2226" stroke="#0F333A" strokeWidth="1" />
                  <polygon points="240,240 300,272 300,280 240,248" fill="#07191C" />
                  <polygon points="300,272 360,240 360,248 300,280" fill="#041012" />

                  {/* Middle glow border */}
                  <polygon points="300,206 352,234 300,262 248,234" fill="none" stroke="#00F2FE" strokeWidth="2" strokeOpacity="0.9" filter="url(#glow)" />

                  {/* Top cap processor block */}
                  <polygon points="300,202 345,226 300,250 255,226" fill="#132729" stroke="#1B3538" strokeWidth="1" />
                  <polygon points="255,226 300,250 300,260 255,236" fill="#0D1E20" />
                  <polygon points="300,250 345,226 345,236 300,260" fill="#081416" />

                  {/* Skewed Flat Logo Content on top of CPU cap */}
                  <g transform="matrix(0.866, 0.5, -0.866, 0.5, 300, 226)">
                    <rect x="-14" y="-14" width="28" height="28" rx="5" fill="#D7FFA4" filter="url(#glow)" opacity="0.9" />
                    <text x="0" y="5.5" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="16" fill="#0F2124" textAnchor="middle">S</text>
                  </g>
                </g>

                {/* Left Floating Cards (Cursor, VS Code, Claude Code) */}
                
                {/* 1. Cursor Card */}
                <g className="animate-float-2">
                  <g transform="matrix(0.866, 0.5, -0.866, 0.5, 170, 310)">
                    <rect x="-42" y="-15" width="84" height="30" rx="6" fill="rgba(0,0,0,0.5)" filter="url(#glow)" />
                    <rect x="-40" y="-17" width="80" height="28" rx="5" fill="#051214" stroke="#00F2FE" strokeWidth="1.5" strokeOpacity="0.8" />
                    <text x="-10" y="3.5" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="9" fill="white" letterSpacing="0.05em">Cursor</text>
                    {/* Cursor arrow icon */}
                    <polygon points="-26,-6 -26,6 -18,0" fill="#00F2FE" />
                  </g>
                </g>

                {/* 2. VS Code Card */}
                <g className="animate-float-1">
                  <g transform="matrix(0.866, 0.5, -0.866, 0.5, 240, 350)">
                    <rect x="-42" y="-15" width="84" height="30" rx="6" fill="rgba(0,0,0,0.5)" filter="url(#glow)" />
                    <rect x="-40" y="-17" width="80" height="28" rx="5" fill="#051214" stroke="#D7FFA4" strokeWidth="1.5" strokeOpacity="0.8" />
                    <text x="-10" y="3.5" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="9" fill="white" letterSpacing="0.05em">VS Code</text>
                    {/* Diamond code layout */}
                    <path d="M -26 0 L -22 -5 L -18 0 L -22 5 Z" fill="#D7FFA4" />
                  </g>
                </g>

                {/* 3. Claude Code Card */}
                <g className="animate-float-3">
                  <g transform="matrix(0.866, 0.5, -0.866, 0.5, 310, 390)">
                    <rect x="-46" y="-15" width="92" height="30" rx="6" fill="rgba(0,0,0,0.5)" filter="url(#glow)" />
                    <rect x="-44" y="-17" width="88" height="28" rx="5" fill="#051214" stroke="#00F2FE" strokeWidth="1.5" strokeOpacity="0.8" />
                    <text x="-10" y="3.5" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="9" fill="white" letterSpacing="0.05em">Claude Code</text>
                    {/* Starburst icon */}
                    <path d="M -24,0 L -20,0 M -22,-2 L -22,2 M -24,-2 L -20,2 M -24,2 L -20,-2" stroke="#00F2FE" strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                </g>

                {/* Right Stack Server Nodes */}
                
                {/* 1. GitHub Server Node (at 430, 150) */}
                <g>
                  {/* Bottom Slice */}
                  <polygon points="430,154 462,170 430,186 398,170" fill="#0E2326" stroke="#123035" />
                  <polygon points="398,170 430,186 430,193 398,177" fill="#091B1D" />
                  <polygon points="430,186 462,170 462,177 430,193" fill="#061314" />
                  {/* Middle Slice */}
                  <polygon points="430,139 462,155 430,171 398,155" fill="#0E2326" stroke="#123035" />
                  <polygon points="398,155 430,171 430,178 398,162" fill="#091B1D" />
                  <polygon points="430,171 462,155 462,162 430,178" fill="#061314" />
                  <polygon points="430,171 462,155 462,157 430,173" fill="#00F2FE" filter="url(#glow)" opacity="0.8" />
                  {/* Top Slice */}
                  <polygon points="430,124 462,140 430,156 398,140" fill="#132F33" stroke="#173D42" />
                  <polygon points="398,140 430,156 430,163 398,147" fill="#0B2326" />
                  <polygon points="430,156 462,140 462,147 430,163" fill="#07191B" />
                  <polygon points="430,156 462,140 462,142 430,158" fill="#D7FFA4" filter="url(#glow)" opacity="0.8" />
                  {/* Git branches on top face */}
                  <g transform="matrix(0.866, 0.5, -0.866, 0.5, 430, 135)">
                    <line x1="-12" y1="-2" x2="12" y2="-2" stroke="#00F2FE" strokeWidth="1.5" />
                    <path d="M -4 -2 Q 4 -10 12 -10" fill="none" stroke="#D7FFA4" strokeWidth="1.5" />
                    <circle cx="-10" cy="-2" r="2.5" fill="#00F2FE" />
                    <circle cx="10" cy="-10" r="2.5" fill="#D7FFA4" />
                    <circle cx="10" cy="-2" r="2.5" fill="#00F2FE" />
                  </g>
                </g>

                {/* 2. AI PRD Server Node (at 470, 205) */}
                <g>
                  {/* Bottom Slice */}
                  <polygon points="470,204 502,220 470,236 438,220" fill="#0E2326" stroke="#123035" />
                  <polygon points="438,220 470,236 470,243 438,227" fill="#091B1D" />
                  <polygon points="470,236 502,220 502,227 470,243" fill="#061314" />
                  {/* Top Slice */}
                  <polygon points="470,189 502,205 470,221 438,205" fill="#132F33" stroke="#173D42" />
                  <polygon points="438,205 470,221 470,228 438,212" fill="#0B2326" />
                  <polygon points="470,221 502,205 502,212 470,228" fill="#07191B" />
                  <polygon points="470,221 502,205 502,207 470,223" fill="#D7FFA4" filter="url(#glow)" opacity="0.8" />
                  {/* Doc icon on top face */}
                  <g transform="matrix(0.866, 0.5, -0.866, 0.5, 470, 200)">
                    <rect x="-8" y="-10" width="16" height="20" rx="1.5" fill="none" stroke="#D7FFA4" strokeWidth="1.5" />
                    <line x1="-4" y1="-5" x2="4" y2="-5" stroke="white" strokeWidth="1" />
                    <line x1="-4" y1="-1" x2="2" y2="-1" stroke="white" strokeWidth="1" />
                    <line x1="-4" y1="3" x2="4" y2="3" stroke="#00F2FE" strokeWidth="1" />
                  </g>
                </g>

                {/* 3. Kanban Server Node (at 510, 260) */}
                <g>
                  {/* Bottom Slice */}
                  <polygon points="510,259 542,275 510,291 478,275" fill="#0E2326" stroke="#123035" />
                  <polygon points="478,275 510,291 510,298 478,282" fill="#091B1D" />
                  <polygon points="510,291 542,275 542,282 510,298" fill="#061314" />
                  {/* Top Slice */}
                  <polygon points="510,244 542,260 510,276 478,260" fill="#132F33" stroke="#173D42" />
                  <polygon points="478,260 510,276 510,283 478,267" fill="#0B2326" />
                  <polygon points="510,276 542,260 542,267 510,283" fill="#07191B" />
                  <polygon points="510,276 542,260 542,262 510,278" fill="#00F2FE" filter="url(#glow)" opacity="0.8" />
                  {/* Kanban columns on top face */}
                  <g transform="matrix(0.866, 0.5, -0.866, 0.5, 510, 255)">
                    <rect x="-10" y="-8" width="5" height="16" rx="1" fill="none" stroke="#D7FFA4" strokeWidth="1" />
                    <rect x="-2.5" y="-8" width="5" height="16" rx="1" fill="none" stroke="#00F2FE" strokeWidth="1" />
                    <rect x="5" y="-8" width="5" height="16" rx="1" fill="none" stroke="white" strokeWidth="1" />
                    <line x1="-8" y1="-3" x2="-7" y2="-3" stroke="#D7FFA4" strokeWidth="1" />
                    <line x1="-0.5" y1="1" x2="0.5" y2="1" stroke="#00F2FE" strokeWidth="1" />
                  </g>
                </g>

                {/* Bottom-Right Floating Chips (Security, Observability, Auditing) */}
                
                {/* 1. Security Chip */}
                <g className="animate-float-2">
                  <g transform="matrix(0.866, 0.5, -0.866, 0.5, 370, 460)">
                    <rect x="-42" y="-12" width="84" height="24" rx="12" fill="rgba(5, 17, 18, 0.85)" stroke="rgba(215,255,164,0.4)" strokeWidth="1.2" />
                    <text x="4" y="3" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="8.5" fill="#D7FFA4" textAnchor="middle">Security</text>
                    <path d="M -22,-4 L -18,-6 L -14,-4 L -14,0 C -14,3 -18,6 -18,6 C -18,6 -22,3 -22,0 Z" fill="none" stroke="#D7FFA4" strokeWidth="1" />
                  </g>
                </g>

                {/* 2. Observability Chip */}
                <g className="animate-float-1">
                  <g transform="matrix(0.866, 0.5, -0.866, 0.5, 440, 420)">
                    <rect x="-52" y="-12" width="104" height="24" rx="12" fill="rgba(5, 17, 18, 0.85)" stroke="rgba(0,242,254,0.4)" strokeWidth="1.2" />
                    <text x="6" y="3" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="8.5" fill="#00F2FE" textAnchor="middle">Observability</text>
                    <circle cx="-22" cy="0" r="2.5" fill="#00F2FE" />
                    <path d="M -29,0 Q -22,-6 -15,0 Q -22,6 -29,0 Z" fill="none" stroke="#00F2FE" strokeWidth="1" />
                  </g>
                </g>

                {/* 3. Auditing Chip */}
                <g className="animate-float-3">
                  <g transform="matrix(0.866, 0.5, -0.866, 0.5, 510, 380)">
                    <rect x="-42" y="-12" width="84" height="24" rx="12" fill="rgba(5, 17, 18, 0.85)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
                    <text x="4" y="3" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="8.5" fill="white" textAnchor="middle">Auditing</text>
                    <circle cx="-20" cy="0" r="4.5" fill="none" stroke="white" strokeWidth="1" />
                    <path d="M -22,0 L -20,2 L -17,-1" fill="none" stroke="white" strokeWidth="1" />
                  </g>
                </g>
              </svg>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-[#0A1A1B] border-t border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#D7FFA4]">Flexible Plans</p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2">Transparent, tier-based pricing</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {/* Free Card */}
            <div className="border border-white/5 bg-[#0F2124] rounded-2xl p-6 flex flex-col justify-between hover:border-white/10 transition-all">
              <div>
                <Badge variant="outline" className="text-white/70 border-white/10">Free</Badge>
                <div className="mt-4 flex items-baseline gap-1 text-white">
                  <span className="text-4xl font-extrabold">$0</span>
                </div>
                <p className="text-xs text-white/50 mt-2">For individuals starting out.</p>
                <ul className="text-xs space-y-3 mt-6 text-white/70 border-t border-white/5 pt-6">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#D7FFA4]" /> 1 Workspace limit
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#D7FFA4]" /> 1 Project limit
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#D7FFA4]" /> 1 Feature per project
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#D7FFA4]" /> 2 PR Reviews analyzed
                  </li>
                </ul>
              </div>
              <button
                onClick={handleStart}
                disabled={isNavigating}
                className="mt-8 w-full py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isNavigating ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  "Get Started Free"
                )}
              </button>
            </div>

            {/* Pro Starter Card */}
            <div className="border border-[#D7FFA4]/30 bg-[#0F2124] rounded-2xl p-6 flex flex-col justify-between hover:border-[#D7FFA4]/40 transition-all relative overflow-hidden shadow-lg shadow-[#D7FFA4]/2">
              <div className="absolute top-0 right-0 h-16 w-16 translate-x-8 -translate-y-8 bg-[#D7FFA4]/10 rotate-45" />
              <div>
                <Badge variant="secondary" className="bg-[#D7FFA4] text-[#0F2124] border-none font-bold">Pro Starter</Badge>
                <div className="mt-4 flex items-baseline gap-1 text-white">
                  <span className="text-4xl font-extrabold">$3</span>
                  <span className="text-xs text-white/50">/month</span>
                </div>
                <p className="text-xs text-white/50 mt-2">Perfect for growing side projects.</p>
                <ul className="text-xs space-y-3 mt-6 text-white/70 border-t border-white/5 pt-6">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#D7FFA4]" /> 1 Workspace limit
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#D7FFA4]" /> 3 Projects limit
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#D7FFA4]" /> 3 Features per project
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-[#D7FFA4]" /> 12 PR Reviews analyzed
                  </li>
                </ul>
              </div>
              <button
                onClick={handleStart}
                disabled={isNavigating}
                className="mt-8 w-full py-2.5 rounded-lg bg-[#D7FFA4] text-[#0F2124] hover:bg-[#cbf58e] transition-all text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isNavigating ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5 text-[#0F2124]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  "Upgrade in Settings"
                )}
              </button>
            </div>

            {/* Pro Unlimited Card */}
            <div className="border border-white/5 bg-[#0F2124] rounded-2xl p-6 flex flex-col justify-between hover:border-white/10 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 h-20 w-20 translate-x-10 -translate-y-10 bg-amber-500/10 rotate-45" />
              <div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-500 flex items-center gap-1 w-fit bg-amber-500/5">
                  <Crown weight="fill" className="size-3" /> Unlimited
                </Badge>
                <div className="mt-4 flex items-baseline gap-1 text-white">
                  <span className="text-4xl font-extrabold">$9</span>
                  <span className="text-xs text-white/50">/month</span>
                </div>
                <p className="text-xs text-white/50 mt-2">For heavy use and team scales.</p>
                <ul className="text-xs space-y-3 mt-6 text-white/70 border-t border-white/5 pt-6">
                  <li className="flex items-center gap-2">
                    <Sparkle weight="bold" className="size-4 text-amber-500" /> **Unlimited Workspaces**
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkle weight="bold" className="size-4 text-amber-500" /> **Unlimited Projects**
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkle weight="bold" className="size-4 text-amber-500" /> **Unlimited Features**
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkle weight="bold" className="size-4 text-amber-500" /> **Unlimited PR Reviews**
                  </li>
                </ul>
              </div>
              <button
                onClick={handleStart}
                disabled={isNavigating}
                className="mt-8 w-full py-2.5 rounded-lg border border-amber-500/20 text-amber-500 hover:bg-amber-500/5 transition-all text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isNavigating ? (
                  <span className="flex items-baseline justify-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5 text-amber-500 self-center" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  "Upgrade in Settings"
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="border-t border-white/5 py-16 bg-[#0B1719]">
        <div className="mx-auto max-w-7xl px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Start shipping with AI today</h2>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            Integrate TheShip AI into your GitHub organization and speed up your delivery cycle.
          </p>
          <div className="pt-2">
            <button
              onClick={handleStart}
              disabled={isNavigating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D7FFA4] px-8 py-3 text-sm font-bold text-[#0F2124] transition-all hover:bg-[#cbf58e] hover:shadow-[0_0_20px_rgba(215,255,164,0.4)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isNavigating ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin h-3.5 w-3.5 text-[#0F2124]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                <>Get Started Free <ArrowRight weight="bold" className="size-3.5" /></>
              )}
            </button>
          </div>
          <p className="text-[10px] text-white/30 pt-8">
            © {new Date().getFullYear()} TheShip AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Minimal placeholder sub-components to support Next/React compilation if not already loaded from package
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl ${className}`}>{children}</div>;
}

function Badge({ children, className, variant = "default" }: { children: React.ReactNode; className?: string; variant?: "default" | "secondary" | "outline" }) {
  const variantClasses =
    variant === "default"
      ? "bg-primary text-primary-foreground"
      : variant === "secondary"
      ? "bg-secondary text-secondary-foreground"
      : "border border-border text-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variantClasses} ${className}`}>
      {children}
    </span>
  );
}
