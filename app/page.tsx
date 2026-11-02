"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, MapPin, Calendar, Clock, Volume2, VolumeX, Send, ShieldCheck, Flame } from "lucide-react";

// --- PROCEDURAL SOUND SYNTHESIZER ---
class SoundEngine {
  ctx: AudioContext | null = null;
  muted = false;
  private lastScratchAt = 0;
  private lastFuseAt = 0;
  private lastRocketAt = 0;

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextCtor) this.ctx = new AudioContextCtor();
    }
  }

  /** Call from a real user gesture (pointer/touch/click) to satisfy browser audio policies. */
  unlock() {
    this.init();
    if (this.ctx && this.ctx.state !== "running") {
      // resume() must be initiated by a user gesture in browsers that enforce autoplay policy.
      void this.ctx.resume().catch(() => {
        // The next user click/tap can try again; the interaction itself should never fail.
      });
    }
  }

  private getReadyContext(): AudioContext | null {
    this.init();
    if (!this.ctx || this.muted) return null;
    // Helps recover if the browser suspended audio after the tab was backgrounded.
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playScratch(intensity = 0.5) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    // Pointer events can fire dozens of times per second. Rate-limit scratch effects
    // so they stay audible instead of becoming an overloaded wall of noise.
    if (now - this.lastScratchAt < 42) return;
    this.lastScratchAt = now;

    const ctx = this.getReadyContext();
    if (!ctx) return;
    const dur = 0.075;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025)) * Math.min(1, intensity);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1700 + Math.min(1, intensity) * 1500;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0.22;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + dur);
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  playFuseSizzle() {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    // This method is called by a 60 ms timer; only play a fresh sizzle about 5x/sec.
    if (now - this.lastFuseAt < 190) return;
    this.lastFuseAt = now;

    const ctx = this.getReadyContext();
    if (!ctx) return;
    const dur = 0.11;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06)) * 0.28;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 3400;
    const gain = ctx.createGain();
    gain.gain.value = 0.16;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + dur);
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  playRocketWhistleAndBoom() {
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (nowMs - this.lastRocketAt < 1800) return;
    this.lastRocketAt = nowMs;
    const ctx = this.getReadyContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const whistleGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(2600, now + 1.45);
    whistleGain.gain.setValueAtTime(0.035, now);
    whistleGain.gain.linearRampToValueAtTime(0.18, now + 0.35);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(whistleGain);
    whistleGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.5);
    osc.onended = () => {
      osc.disconnect();
      whistleGain.disconnect();
    };

    const dur = 1.45;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.75)) * 0.45;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.linearRampToValueAtTime(2100, now + 1.4);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.008, now + dur);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + dur);
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      noiseGain.disconnect();
    };

    window.setTimeout(() => {
      if (this.muted || !this.ctx || this.ctx.state !== "running") return;
      const activeCtx = this.ctx;
      const t = activeCtx.currentTime;
      const boomOsc = activeCtx.createOscillator();
      const boomGain = activeCtx.createGain();
      boomOsc.type = "triangle";
      boomOsc.frequency.setValueAtTime(130, t);
      boomOsc.frequency.exponentialRampToValueAtTime(28, t + 0.72);
      boomGain.gain.setValueAtTime(0.45, t);
      boomGain.gain.exponentialRampToValueAtTime(0.008, t + 0.75);
      boomOsc.connect(boomGain);
      boomGain.connect(activeCtx.destination);
      boomOsc.start(t);
      boomOsc.stop(t + 0.76);
      boomOsc.onended = () => {
        boomOsc.disconnect();
        boomGain.disconnect();
      };
    }, 1450);
  }
}

const sound = new SoundEngine();

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export default function RocketDiwaliInvite() {
  const [stage, setStage] = useState<"unlit" | "lit" | "launching" | "revealed">("unlit");
  const [strikeHeat, setStrikeHeat] = useState(0);
  const [fuseHeat, setFuseHeat] = useState(0);
  const [statusHint, setStatusHint] = useState("Scrub the matchstick FAST across the strip below!");
  const [selectedRole, setSelectedRole] = useState<string>("Teen Patti Shark 🃏");
  const [muted, setMuted] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, complete: false });
  const [cursorPos, setCursorPos] = useState({ x: 500, y: 600 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strikeStripRef = useRef<HTMLDivElement>(null);
  const fuseRef = useRef<HTMLDivElement>(null);
  const rocketNozzleRef = useRef<HTMLDivElement>(null);

  const particlesRef = useRef<Particle[]>([]);
  const pointerPos = useRef({ x: 500, y: 600 });
  const lastPointerRef = useRef({ x: 500, y: 600, time: 0 });
  const isOverFuseRef = useRef(false);
  const strikeHeatRef = useRef(0);
  const fuseHeatRef = useRef(0);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  // 3D Tilt for Revealed Invite
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  const rotateX = useTransform(cardY, [-300, 300], [10, -10]);
  const rotateY = useTransform(cardX, [-300, 300], [-10, 10]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCursorPos({ x: window.innerWidth * 0.24, y: window.innerHeight * 0.59 });
      pointerPos.current = { x: window.innerWidth * 0.24, y: window.innerHeight * 0.59 };
      lastPointerRef.current.time = Date.now();
    }
  }, []);

  // Live countdown to 5 November 2026, 6:00 PM (Jaipur / IST).
  useEffect(() => {
    const target = new Date("2026-11-05T18:00:00+05:30").getTime();
    const updateCountdown = () => {
      const remaining = Math.max(0, target - Date.now());
      const totalSeconds = Math.floor(remaining / 1000);
      setCountdown({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
        complete: remaining === 0,
      });
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Friction Cooling & Hold-on-Fuse Ignition Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (stageRef.current === "unlit" && strikeHeatRef.current > 0) {
        strikeHeatRef.current = Math.max(0, strikeHeatRef.current - 4.5);
        setStrikeHeat(Math.round(strikeHeatRef.current));
      }

      if (stageRef.current === "lit") {
        if (isOverFuseRef.current) {
          fuseHeatRef.current = Math.min(100, fuseHeatRef.current + 6.5);
          setFuseHeat(Math.round(fuseHeatRef.current));
          sound.playFuseSizzle();

          if (fuseRef.current) {
            const rect = fuseRef.current.getBoundingClientRect();
            spawnSparks(rect.left + rect.width / 2, rect.top + rect.height / 2, 6, 4);
          }

          if (fuseHeatRef.current >= 100) {
            isOverFuseRef.current = false;
            launchRocketWithInvite();
          }
        } else if (fuseHeatRef.current > 0) {
          fuseHeatRef.current = Math.max(0, fuseHeatRef.current - 5);
          setFuseHeat(Math.round(fuseHeatRef.current));
        }
      }
    }, 60);

    return () => clearInterval(interval);
  }, []);

  // 60FPS Particle Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (stageRef.current === "lit") {
        for (let i = 0; i < 3; i++) {
          particlesRef.current.push({
            x: pointerPos.current.x + (Math.random() - 0.5) * 8,
            y: pointerPos.current.y - 12,
            vx: (Math.random() - 0.5) * 2.5,
            vy: -(Math.random() * 3.5 + 1.5),
            size: Math.random() * 3.5 + 1.5,
            color: ["#FFF", "#FDE047", "#F97316", "#EF4444"][Math.floor(Math.random() * 4)],
            alpha: 1,
            decay: 0.035,
          });
        }
      }

      if (stageRef.current === "launching" && rocketNozzleRef.current) {
        const rect = rocketNozzleRef.current.getBoundingClientRect();
        const nozzleX = rect.left + rect.width / 2;
        const nozzleY = rect.top + rect.height / 2;

        for (let i = 0; i < 18; i++) {
          particlesRef.current.push({
            x: nozzleX + (Math.random() - 0.5) * 14,
            y: nozzleY,
            vx: (Math.random() - 0.5) * 6,
            vy: Math.random() * 10 + 4,
            size: Math.random() * 5 + 2,
            color: ["#FFF", "#FEF08A", "#F59E0B", "#EA580C", "#DC2626"][Math.floor(Math.random() * 5)],
            alpha: 1,
            decay: Math.random() * 0.025 + 0.015,
          });
        }
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const spawnSparks = (x: number, y: number, count = 20, speedMult = 6) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * speedMult + 1.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.5 + 1.5,
        color: ["#FFF", "#FDE047", "#F97316", "#EF4444"][Math.floor(Math.random() * 4)],
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02,
      });
    }
  };

  const checkOverlap = (point: { x: number; y: number }, ref: React.RefObject<HTMLDivElement | null>, pad = 20) => {
    if (!ref.current) return false;
    const rect = ref.current.getBoundingClientRect();
    return (
      point.x >= rect.left - pad &&
      point.x <= rect.right + pad &&
      point.y >= rect.top - pad &&
      point.y <= rect.bottom + pad
    );
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    const now = Date.now();
    const dt = Math.max(1, now - lastPointerRef.current.time);
    const dist = Math.hypot(clientX - lastPointerRef.current.x, clientY - lastPointerRef.current.y);
    const velocity = (dist / dt) * 1000;

    lastPointerRef.current = { x: clientX, y: clientY, time: now };
    pointerPos.current = { x: clientX, y: clientY };
    setCursorPos({ x: clientX, y: clientY });

    if (typeof window !== "undefined") {
      cardX.set(clientX - window.innerWidth / 2);
      cardY.set(clientY - window.innerHeight / 2);
    }

    if (stageRef.current === "unlit") {
      if (checkOverlap({ x: clientX, y: clientY }, strikeStripRef, 15)) {
        // Make the scratch audible for ordinary strip movement too; only fast movement
        // builds meaningful heat. SoundEngine rate-limits playback to avoid a noisy burst.
        if (velocity > 120) {
          sound.playScratch(Math.min(1, Math.max(0.16, velocity / 1800)));
        }

        if (velocity > 1100) {
          const addedHeat = Math.min(22, velocity / 140);
          strikeHeatRef.current = Math.min(100, strikeHeatRef.current + addedHeat);
          setStrikeHeat(Math.round(strikeHeatRef.current));
          spawnSparks(clientX, clientY, 10, 7);

          if (strikeHeatRef.current >= 100) {
            setStage("lit");
            setStatusHint("Match Lit! Now HOLD the flame steady on the Rocket's Red Fuse!");
            spawnSparks(clientX, clientY, 50, 10);
            if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(120);
          } else {
            setStatusHint("Sparks flying! Keep scrubbing fast back & forth!");
          }
        } else if (velocity > 200) {
          spawnSparks(clientX, clientY, 2, 2);
          setStatusHint("Too slow! Scrub FASTER across the strip to ignite!");
        }
      }
    }

    if (stageRef.current === "lit") {
      const onFuse = checkOverlap({ x: clientX, y: clientY }, fuseRef, 26);
      isOverFuseRef.current = onFuse;
      if (onFuse) {
        setStatusHint(`Heating Rocket Fuse... Keep holding steady! (${fuseHeatRef.current}%)`);
      } else {
        setStatusHint("Hold the flame steady on the glowing Red Rocket Fuse!");
      }
    }
  };

  const launchRocketWithInvite = () => {
    setStage("launching");
    setStatusHint("LIFT OFF! Hoisting your invitation... 🚀");
    sound.playRocketWhistleAndBoom();
    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 30, 600, 50, 900]);
    }

    setTimeout(() => {
      confetti({
        particleCount: 160,
        spread: 130,
        startVelocity: 60,
        origin: { x: 0.5, y: 0.15 },
        colors: ["#FDE047", "#F59E0B", "#EF4444", "#FFF", "#A855F7"],
      });
      setStage("revealed");
    }, 1550);
  };

  const roles = [
    "Teen Patti Shark 🃏",
    "Bartender's Nightmare 🥃",
    "Designated Patakha 🧨",
    "Here for the Mithai 🍬",
  ];

  const handleWhatsAppRSVP = () => {
    const text = encodeURIComponent(
      `🚀 Your Rocket Invite just landed!\n\nCount me in for the Diwali Bash on 5th Nov (6 PM onwards)!\n🎭 Vibe: ${selectedRole}\nLet's gooo! 🧨🔥`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div
      onPointerDown={() => sound.unlock()}
      onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onTouchMove={(e) => {
        if (e.touches[0]) {
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      className={`relative h-[100dvh] min-h-[620px] w-screen overflow-hidden select-none bg-[#100703] text-amber-50 ${
        stage === "unlit" || stage === "lit" ? "cursor-none" : ""
      }`}
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 50% 42%, rgba(118, 48, 12, 0.32) 0%, rgba(33, 12, 5, 0.15) 37%, transparent 68%),
          radial-gradient(ellipse at 50% 100%, rgba(180, 83, 9, 0.22) 0%, transparent 42%),
          linear-gradient(180deg, #100704 0%, #1b0a05 53%, #100704 100%)
        `,
      }}
    >
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-30" />

      {/* Festive architectural frame and ambient Diwali details */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-[8px] border border-amber-500/20" />
        <div className="absolute inset-[14px] border border-amber-200/[0.08]" />
        <div className="absolute left-0 top-0 h-full w-16 sm:w-24 bg-gradient-to-r from-amber-900/25 to-transparent" />
        <div className="absolute right-0 top-0 h-full w-16 sm:w-24 bg-gradient-to-l from-amber-900/25 to-transparent" />
        <div className="absolute left-4 top-0 h-[48%] w-px bg-gradient-to-b from-amber-300/80 via-amber-700/25 to-transparent sm:left-7" />
        <div className="absolute right-4 top-0 h-[48%] w-px bg-gradient-to-b from-amber-300/80 via-amber-700/25 to-transparent sm:right-7" />

        {/* Marigold garlands */}
        <div className="absolute left-0 top-0 flex flex-col items-center gap-0 text-xl leading-none drop-shadow-[0_0_12px_rgba(245,158,11,0.55)] sm:text-3xl">
          <span>🌼</span><span>✿</span><span>🌼</span><span>✿</span><span>🌼</span><span>✿</span>
        </div>
        <div className="absolute right-0 top-0 flex flex-col items-center gap-0 text-xl leading-none drop-shadow-[0_0_12px_rgba(245,158,11,0.55)] sm:text-3xl">
          <span>🌼</span><span>✿</span><span>🌼</span><span>✿</span><span>🌼</span><span>✿</span>
        </div>

        {/* Delicate rangoli halo behind the rocket */}
        <div
          className="absolute left-1/2 top-[37%] aspect-square w-[min(82vw,670px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-35"
          style={{
            backgroundImage: `
              repeating-conic-gradient(from 0deg, rgba(217, 119, 6, 0.42) 0deg 0.7deg, transparent 0.7deg 12deg),
              radial-gradient(circle, transparent 0 27%, rgba(217,119,6,0.15) 27.2% 27.5%, transparent 27.8% 39%, rgba(217,119,6,0.18) 39.2% 39.5%, transparent 39.8% 51%, rgba(217,119,6,0.2) 51.2% 51.5%, transparent 51.8% 63%, rgba(217,119,6,0.15) 63.2% 63.5%, transparent 63.8%)`,
            maskImage: "radial-gradient(circle, black 20%, transparent 72%)",
          }}
        />
        <div className="absolute left-1/2 top-[39%] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-500/10 shadow-[0_0_90px_rgba(180,83,9,0.08)] sm:h-[460px] sm:w-[460px]" />

        {/* Diyas and petals framing the floor */}
        <div className="absolute bottom-12 left-1 text-4xl opacity-90 drop-shadow-[0_0_20px_rgba(245,158,11,0.7)] sm:bottom-10 sm:left-6 sm:text-6xl">🪔</div>
        <div className="absolute bottom-5 left-[9%] text-2xl opacity-80 sm:bottom-8 sm:text-4xl">🌼</div>
        <div className="absolute bottom-14 right-1 text-4xl opacity-90 drop-shadow-[0_0_20px_rgba(245,158,11,0.7)] sm:bottom-10 sm:right-6 sm:text-6xl">🪔</div>
        <div className="absolute bottom-5 right-[9%] text-2xl opacity-80 sm:bottom-8 sm:text-4xl">🌼</div>
        <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-[#080402]/65 via-[#160804]/25 to-transparent" />
      </div>

      {/* VIP header and sound control */}
      <header className="absolute inset-x-0 top-4 z-40 px-5 sm:top-5 sm:px-10">
        <div className="relative mx-auto flex max-w-6xl items-center justify-center">
          <div className="flex items-center gap-2 rounded-full border border-amber-500/50 bg-[#1b0c04]/80 px-4 py-2 shadow-[0_0_25px_rgba(217,119,6,0.13)] backdrop-blur-md sm:px-6">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.19em] text-amber-200 sm:text-[11px] sm:tracking-[0.23em]">
              VIP DIWALI INVITATION
            </span>
          </div>
          <button
            onClick={() => {
              sound.unlock();
              sound.muted = !muted;
              setMuted(!muted);
            }}
            aria-label={muted ? "Turn sound on" : "Mute sound"}
            className="absolute right-0 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/50 bg-[#1b0c04]/80 text-amber-200 shadow-[0_0_20px_rgba(217,119,6,0.12)] transition hover:bg-amber-500/15 sm:right-2 sm:h-12 sm:w-12"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Friction meter and instruction */}
      {stage !== "revealed" && (
        <div className="absolute inset-x-4 top-[8.5%] z-40 mx-auto flex flex-col items-center text-center sm:top-[8%]">
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.28em] text-amber-400 sm:text-[11px] sm:tracking-[0.34em]">
            {stage === "unlit" && `FRICTION HEAT: ${strikeHeat}%`}
            {stage === "lit" && `FUSE IGNITION: ${fuseHeat}%`}
            {stage === "launching" && "T-MINUS ZERO  •  LIFT OFF"}
          </p>
          <div className="mb-4 h-[7px] w-52 overflow-hidden rounded-full border border-amber-600/60 bg-black/60 shadow-[0_0_14px_rgba(217,119,6,0.12)] sm:w-72">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-700 via-yellow-400 to-orange-500 transition-all duration-75"
              style={{ width: `${stage === "unlit" ? strikeHeat : fuseHeat}%` }}
            />
          </div>
          <h1 className="max-w-[720px] font-serif text-[23px] font-semibold leading-[1.12] text-[#fff0c9] drop-shadow-[0_2px_18px_rgba(245,158,11,0.13)] sm:text-[31px] md:text-[36px]">
            {statusHint}
          </h1>
          <div className="mt-4 flex w-56 items-center gap-3 text-amber-500/80 sm:w-72" aria-hidden="true">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-500/60" />
            <span className="text-base">❀</span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-500/60" />
          </div>
        </div>
      )}

      {/* The fuse line visually connects the rocket to the striker strip */}
      {stage !== "revealed" && (
        <div
          className="pointer-events-none fixed left-1/2 top-[47%] z-10 h-[39%] w-[3px] -translate-x-1/2 shadow-[0_0_13px_rgba(245,158,11,0.65)]"
          style={{
            backgroundImage: "repeating-linear-gradient(180deg, #FDE68A 0px, #FDE68A 5px, #B45309 5px, #B45309 10px)",
          }}
        />
      )}

      {/* Decorative rocket: its fuse remains the actual interaction target */}
      {stage !== "revealed" && (
        <motion.div
          initial={{ x: "-50%", y: 0 }}
          animate={stage === "launching" ? { x: "-50%", y: "-82vh" } : { x: "-50%", y: 0 }}
          transition={{ duration: 1.55, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed left-1/2 top-[26%] z-20 flex w-44 flex-col items-center sm:top-[25%] sm:w-48"
        >
          <motion.div
            animate={stage === "launching" ? { x: [-2, 2, -3, 3, 0] } : { y: stage === "lit" ? [0, -2, 0] : 0 }}
            transition={stage === "launching" ? { repeat: Infinity, duration: 0.1 } : { repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className="relative flex flex-col items-center"
          >
            <svg width="126" height="210" viewBox="0 0 120 210" fill="none" className="drop-shadow-[0_16px_28px_rgba(0,0,0,0.75)]">
              <defs>
                <linearGradient id="rocketCone" x1="18" y1="8" x2="100" y2="60" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFF1B7" />
                  <stop offset="38%" stopColor="#FBBF24" />
                  <stop offset="72%" stopColor="#B45309" />
                  <stop offset="100%" stopColor="#78350F" />
                </linearGradient>
                <linearGradient id="rocketTube" x1="30" y1="50" x2="90" y2="140" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#064E3B" />
                  <stop offset="45%" stopColor="#047857" />
                  <stop offset="100%" stopColor="#022C22" />
                </linearGradient>
                <linearGradient id="rocketTip" x1="36" y1="6" x2="84" y2="55" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FECACA" />
                  <stop offset="42%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#7F1D1D" />
                </linearGradient>
              </defs>
              {/* fuse tail */}
              <path d="M60 128 L60 208" stroke="#5B2709" strokeWidth="7" strokeLinecap="round" />
              <path d="M60 128 L60 208" stroke="#FDE68A" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 5" />
              {/* fins */}
              <path d="M36 101 L17 141 L37 134 Z" fill="url(#rocketCone)" stroke="#713F12" strokeWidth="1.5" />
              <path d="M84 101 L103 141 L83 134 Z" fill="url(#rocketCone)" stroke="#713F12" strokeWidth="1.5" />
              {/* emerald body */}
              <rect x="36" y="49" width="48" height="87" rx="4" fill="url(#rocketTube)" stroke="#FBBF24" strokeWidth="2.2" />
              <path d="M39 56 H81 M39 129 H81" stroke="#FDE68A" strokeWidth="2" />
              <path d="M36 70 L84 57 L84 69 L36 82 Z" fill="url(#rocketCone)" />
              <path d="M36 112 L84 99 L84 111 L36 124 Z" fill="url(#rocketCone)" />
              {/* jewel-like floral medallion */}
              <circle cx="60" cy="91" r="15" fill="#083B2E" stroke="#FCD34D" strokeWidth="1.4" />
              <circle cx="60" cy="91" r="10" stroke="#F59E0B" strokeWidth="1" />
              <path d="M60 80 L63 87 L70 91 L63 94 L60 102 L57 94 L50 91 L57 87 Z" fill="#FDE68A" stroke="#B45309" strokeWidth="0.8" />
              <circle cx="60" cy="91" r="2.2" fill="#DC2626" />
              <path d="M44 61 H76 M44 125 H76" stroke="#FFF1B7" strokeWidth="1" strokeDasharray="2 3" />
              {/* red-and-gold crown */}
              <path d="M60 5 L28 51 L92 51 Z" fill="url(#rocketTip)" stroke="#FBBF24" strokeWidth="2" />
              <path d="M60 11 L44 43 L60 36 L76 43 Z" fill="#FCA5A5" opacity="0.48" />
              <path d="M34 49 H86" stroke="#FDE68A" strokeWidth="3" />
            </svg>

            <div
              ref={fuseRef}
              className={`relative -mt-[66px] flex h-[68px] w-[62px] flex-col items-center justify-center rounded-full transition-all ${
                stage === "lit"
                  ? "bg-amber-500/15 ring-2 ring-amber-300 shadow-[0_0_40px_rgba(251,191,36,0.9)]"
                  : ""
              }`}
            >
              <div ref={rocketNozzleRef} className="h-2 w-2" />
              <div className="h-7 w-[3px] rounded-full bg-gradient-to-b from-yellow-100 via-amber-400 to-red-600" />
              <div
                className={`-mt-1 h-4 w-4 rounded-full border border-amber-200 transition-all ${
                  fuseHeat > 0
                    ? "scale-125 bg-white shadow-[0_0_20px_#FFF]"
                    : "animate-pulse bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.9)]"
                }`}
              />
              <span className="absolute -bottom-1 rounded-sm border border-amber-400/70 bg-[#130702]/95 px-1.5 py-1 text-[7px] font-bold uppercase tracking-[0.12em] text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                Launch here
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Wide ornate match striker */}
      {stage === "unlit" && (
        <div className="fixed inset-x-0 bottom-7 z-[35] flex justify-center px-6 sm:bottom-8">
          <div
            ref={strikeStripRef}
            className="group relative h-[66px] w-full max-w-[780px] rounded-[22px] p-[3px] shadow-[0_0_35px_rgba(217,119,6,0.23),0_12px_35px_rgba(0,0,0,0.45)] sm:h-[78px]"
            style={{ background: "linear-gradient(110deg, #78350F 0%, #FBBF24 18%, #7C2D12 36%, #FDE68A 51%, #92400E 70%, #FBBF24 86%, #78350F 100%)" }}
          >
            <div
              className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[19px] border border-amber-200/40 bg-[#170803]"
              style={{
                backgroundImage: `
                  radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.22), transparent 68%),
                  radial-gradient(circle, rgba(217,119,6,0.75) 1px, transparent 1.4px),
                  linear-gradient(180deg, #271005 0%, #100602 100%)`,
                backgroundSize: "auto, 7px 7px, auto",
              }}
            >
              <div className="pointer-events-none absolute inset-x-3 top-2 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
              <div className="pointer-events-none absolute inset-x-3 bottom-2 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
              <span className="absolute left-3 text-base text-amber-400 sm:left-5 sm:text-xl">❀</span>
              <span className="absolute right-3 text-base text-amber-400 sm:right-5 sm:text-xl">❀</span>
              <div className="relative mx-10 rounded-md border border-amber-500/45 bg-black/65 px-3 py-2 sm:px-6 sm:py-2.5">
                <span className="whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-amber-200 sm:text-[11px] sm:tracking-[0.24em]">
                  ✦ &nbsp; Scrub matchstick here &nbsp; ✦
                </span>
              </div>
              {strikeHeat > 0 && (
                <div className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/15 to-transparent transition-all" style={{ width: `${strikeHeat}%` }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* The matchstick follows the visitor's pointer; fire appears after ignition */}
      {(stage === "unlit" || stage === "lit") && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            transform: "translate(-50%, -12px) rotate(-18deg)",
          }}
        >
          <div className="relative flex flex-col items-center drop-shadow-[0_5px_8px_rgba(0,0,0,0.7)]">
            {stage === "lit" && (
              <div className="absolute -top-11 flex items-center justify-center">
                <div className="h-16 w-16 animate-pulse rounded-full bg-amber-400/40 blur-xl" />
                <Flame className="absolute h-12 w-12 rotate-[18deg] animate-bounce fill-orange-500 text-amber-300 drop-shadow-[0_0_25px_rgba(251,191,36,1)]" />
                <div className="absolute bottom-2 h-3 w-3 rounded-full bg-white blur-[1px]" />
              </div>
            )}
            <div
              className={`relative z-10 h-6 w-4 rounded-full border shadow-lg transition-colors ${
                stage === "lit"
                  ? "border-amber-200 bg-orange-500 shadow-[0_0_18px_#F59E0B]"
                  : strikeHeat > 50
                  ? "border-yellow-200 bg-orange-500 shadow-[0_0_12px_#EA580C]"
                  : "border-red-950 bg-gradient-to-b from-red-400 via-red-600 to-red-950"
              }`}
            >
              <span className="absolute left-1 top-1 h-2 w-1 rounded-full bg-red-200/70 blur-[1px]" />
            </div>
            <div className="h-24 w-[10px] rounded-b-sm border-x border-amber-700/20 bg-gradient-to-r from-[#a65f21] via-[#ffe6a1] to-[#d68c35] shadow-[inset_1px_0_2px_rgba(255,255,255,0.7)]" />
          </div>
        </div>
      )}

      {/* Invitation reveal after the rocket launches */}
      {stage === "revealed" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#100703]/75 p-4 backdrop-blur-md sm:p-6">
          <motion.div
            style={{
              rotateX,
              rotateY,
              transformPerspective: 1100,
              background: "linear-gradient(135deg, #FFF0B1 0%, #E9A13C 28%, #B96920 65%, #F6D77E 100%)",
            }}
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 16, stiffness: 120 }}
            className="my-auto w-full max-w-md rounded-[28px] p-[2px] shadow-[0_0_90px_rgba(245,158,11,0.35)]"
          >
            <div
              className="relative overflow-hidden rounded-[26px] border border-[#8A4B16]/45 p-5 sm:p-7"
              style={{
                background: "linear-gradient(155deg, #F8D88B 0%, #E9AC4C 38%, #D58A32 72%, #F4CB70 100%)",
                color: "#351707",
                boxShadow: "inset 0 1px 0 rgba(255,248,210,.7), inset 0 -1px 0 rgba(91,39,8,.3)",
              }}
            >
              <div className="pointer-events-none absolute inset-2 rounded-[20px] border border-[#783B10]/20" />
              <div className="relative mb-4 flex items-center justify-between border-b border-[#7A3B10]/25 pb-3.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#61300B]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#61300B] sm:text-xs">Official Royal Pass</span>
                </div>
                <span className="rounded border border-[#82420F]/30 bg-[#6C310B]/[0.08] px-2.5 py-1 font-mono text-[10px] font-bold text-[#572608]">5 NOV • 6 PM</span>
              </div>

              <div className="relative mb-5 space-y-1 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#75400F]">You are invited to</p>
                <h2 className="font-serif text-2xl font-bold tracking-tight text-[#3B1A08] drop-shadow-[0_1px_0_rgba(255,231,165,0.35)] sm:text-3xl">DIWALI ROYALE</h2>
                <p className="pt-1 font-serif text-sm italic text-[#633513]">Lights • Loved ones • A little beautiful chaos</p>
                <div className="pt-2 text-[#7C410D]">✦ ❀ ✦</div>
              </div>

              <div className="relative mb-5 grid grid-cols-2 gap-2.5">
                <div className="flex items-center gap-2.5 rounded-xl border border-[#7A3B10]/25 bg-[#7A3B10]/[0.07] p-3">
                  <Calendar className="h-4 w-4 shrink-0 text-[#75400F]" />
                  <div><p className="text-[9px] font-semibold uppercase tracking-wider text-[#714016]/85">Date</p><p className="text-xs font-bold text-[#351707]">Thu, 5 Nov 2026</p></div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-[#7A3B10]/25 bg-[#7A3B10]/[0.07] p-3">
                  <Clock className="h-4 w-4 shrink-0 text-[#75400F]" />
                  <div><p className="text-[9px] font-semibold uppercase tracking-wider text-[#714016]/85">Time</p><p className="text-xs font-bold text-[#351707]">6 PM onwards</p></div>
                </div>
                <div className="col-span-2 flex items-center gap-2.5 rounded-xl border border-[#7A3B10]/25 bg-[#7A3B10]/[0.07] p-3">
                  <MapPin className="h-4 w-4 shrink-0 text-[#75400F]" />
                  <div><p className="text-[9px] font-semibold uppercase tracking-wider text-[#714016]/85">Venue</p><p className="text-xs font-bold text-[#351707]">Jaipur • Pin unlocks on WhatsApp RSVP</p></div>
                </div>
              </div>

              <div className="relative mb-5 rounded-xl border border-[#7A3B10]/30 bg-[#7A3B10]/[0.08] px-3 py-3 text-center">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-[#714016]/90">Countdown to the celebration</p>
                {countdown.complete ? (
                  <p className="font-serif text-lg font-bold text-[#3B1A08]">The celebration has begun! ✨</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Days", value: countdown.days },
                      { label: "Hours", value: countdown.hours },
                      { label: "Minutes", value: countdown.minutes },
                      { label: "Seconds", value: countdown.seconds },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border border-[#804418]/20 bg-[#FFF0C4]/35 py-2">
                        <p className="font-mono text-xl font-black tabular-nums text-[#3B1A08] sm:text-2xl">{String(item.value).padStart(2, "0")}</p>
                        <p className="text-[8px] font-bold uppercase tracking-wider text-[#714016]">{item.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[9px] font-semibold text-[#714016]/85">5 November 2026 • 6:00 PM IST</p>
              </div>

              <div className="relative mb-5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#75400F]">Pick your vibe for the night</p>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                        selectedRole === role
                          ? "border-[#4A2108] bg-[#54270B] font-bold text-[#FFF0C4] shadow-[0_3px_12px_rgba(70,29,5,0.22)]"
                          : "border-[#804418]/25 bg-[#6A330C]/[0.05] text-[#55290C] hover:border-[#62300D]/60 hover:bg-[#6A330C]/[0.09]"
                      }`}
                    >{role}</button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleWhatsAppRSVP}
                className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f8d985] via-amber-300 to-[#d97706] py-3.5 text-[10px] font-black uppercase tracking-[0.19em] text-[#2A1205] shadow-[0_0_30px_rgba(90,39,5,0.18)] transition hover:brightness-110 active:scale-[0.98] sm:text-xs"
              >
                <Send className="h-4 w-4" /> Confirm my attendance
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
