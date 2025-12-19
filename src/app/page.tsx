"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";

type ActTone = "primary" | "secondary";
type Act = { id: string; tone: ActTone; lines: string[] };

const TITLE = ["Impulsion", "Studio d’innovation."];

const ACTS: Act[] = [
  { id: "act-2", tone: "secondary", lines: ["Pas un cabinet de conseil.", "Pas une école.", "Pas une plateforme."] },
  {
    id: "act-3",
    tone: "primary",
    lines: ["Nous apprenons en construisant.", "Nous comprenons en expérimentant.", "Nous décidons en situation réelle."],
  },
  { id: "act-4", tone: "primary", lines: ["L’innovation ce n’est pas avoir des idées.", "C’est un processus."] },
  {
    id: "act-5",
    tone: "secondary",
    lines: ["Nous travaillons avec", "des équipes,", "des entrepreneurs,", "des organisations complexes.", "", "Mais jamais de la même manière."],
  },
];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => setReduced(!!mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

type HomeRootStyle = CSSProperties & {
  "--paper": string;
  "--paper-2": string;
  "--ink": string;
  "--ink-soft": string;
  "--mx": string;
  "--my": string;
  "--mat": number | string;
};

export default function Home() {
  const reducedMotion = usePrefersReducedMotion();

  // Spotlight local scope
  useEffect(() => {
    if (reducedMotion) return;
    const el = document.getElementById("home-root");
    if (!el) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        el.style.setProperty("--mx", `${x.toFixed(2)}%`);
        el.style.setProperty("--my", `${y.toFixed(2)}%`);
      });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, [reducedMotion]);

  // Sequence (NON loop) — robust scheduling
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const [done, setDone] = useState(false);

  const timeoutsRef = useRef<number[]>([]);
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current = [];
  };

  const timings = useMemo(
    () => ({
      enter: 700,
      hold: 2600,
      exit: 650,
      gap: 140,
      endPause: 350,
    }),
    []
  );

  useEffect(() => {
    if (reducedMotion) {
      setDone(true);
      return;
    }

    clearAllTimeouts();
    setDone(false);
    setPhase("enter");
    setIdx(0);

    const lastIndex = ACTS.length - 1;

    const schedule = (ms: number, fn: () => void) => {
      const t = window.setTimeout(fn, ms);
      timeoutsRef.current.push(t);
    };

    const playAct = (i: number) => {
      // clamp + stop
      const safeI = Math.max(0, Math.min(i, lastIndex));
      setIdx(safeI);
      setPhase("enter");

      schedule(timings.enter, () => {
        setPhase("hold");

        schedule(timings.hold, () => {
          if (safeI >= lastIndex) {
            // final: stay on hold + mark done (no exit)
            schedule(timings.endPause, () => setDone(true));
            return;
          }

          setPhase("exit");

          schedule(timings.exit, () => {
            schedule(timings.gap, () => playAct(safeI + 1));
          });
        });
      });
    };

    playAct(0);

    return () => clearAllTimeouts();
    // timings is stable (useMemo)
  }, [reducedMotion, timings]);

  // ✅ Guard: always have a valid act
  const current: Act = ACTS[Math.min(idx, ACTS.length - 1)];

  const rootStyle: HomeRootStyle = {
    "--paper": "#fbfaf6",
    "--paper-2": "#f4efe3",
    "--ink": "#1c1c1c",
    "--ink-soft": "rgba(28,28,28,0.62)",
    "--mx": "35%",
    "--my": "30%",
    "--mat": 1.25,
  };

  return (
    <div
      id="home-root"
      className="relative min-h-screen overflow-hidden font-sans"
      style={rootStyle}
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="home-socle" />
        <div className="home-fibers" />
        <div className="home-grid" />
        <div className="home-spot" />
        <div className="home-sweep" />
        <div className="home-grain" />
        <div className="home-vignette" />
      </div>

      {/* 3 zones layout */}
     <main className="relative mx-auto flex min-h-screen w-full max-w-[72rem] flex-col px-6 py-10 sm:px-10">
  {/* Spacer haut : pousse le bloc plus bas */}
  <div className="flex-1" />

  {/* Bloc central : TITRE + SCÈNE (collés) */}
  <section className="mx-auto w-full max-w-[52rem] text-center">
    {/* Titre (stable) */}
    <div className="min-h-[5.2rem] sm:min-h-[5.8rem]">
      <div className="text-[2.05rem] leading-[1.02] sm:text-[2.8rem] font-semibold tracking-[-0.04em] text-[color:var(--ink)]">
        {TITLE[0]}
      </div>
      <div className="mt-2 text-[1rem] sm:text-[1.12rem] leading-[1.45] font-medium tracking-[-0.01em] text-[color:var(--ink)]/90">
        {TITLE[1]}
      </div>
    </div>

    {/* Scène juste dessous (collée) */}
    <div className="mt-5 sm:mt-6 min-h-[11rem] sm:min-h-[13rem]">
      {!reducedMotion ? (
        <SceneBlock act={current} phase={phase} done={done} />
      ) : (
        <StaticAllActs />
      )}
    </div>
  </section>

  {/* Spacer bas : garde de l’air avant les portes */}
  <div className="h-10 sm:h-12" />

  {/* Portes (bas de page) */}
  <footer className="mx-auto w-full max-w-[52rem] pb-2">
    <Doors done={done} />
  </footer>
</main>


      {/* CSS embarqué (identique à ta v4, inchangé) */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .home-fibers, .home-grid, .home-sweep, .home-grain { animation: none !important; }
        }

        #home-root .home-socle{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 40% 20%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 45%),
            radial-gradient(110% 100% at 70% 65%, rgba(0,0,0,calc(0.06 * var(--mat))) 0%, rgba(0,0,0,0) 55%),
            linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%);
        }

        #home-root .home-fibers{
          position:absolute; inset:-15%;
          background:
            repeating-linear-gradient(110deg, rgba(0,0,0,calc(0.015 * var(--mat))) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 8px),
            repeating-linear-gradient(20deg,  rgba(0,0,0,calc(0.012 * var(--mat))) 0px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 10px);
          opacity: calc(0.55 * var(--mat));
          filter: blur(0.6px);
          mix-blend-mode: multiply;
          animation: fibersDrift 18s ease-in-out infinite;
          pointer-events:none;
        }
        @keyframes fibersDrift{
          0%,100%{ transform: translate3d(-1.5%,-0.5%,0) rotate(-0.2deg); }
          50%{ transform: translate3d(1.5%,0.8%,0) rotate(0.2deg); }
        }

        #home-root .home-grid{
          position:absolute; inset:-10%;
          background:
            linear-gradient(to right, rgba(0,0,0,calc(0.04 * var(--mat))) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,calc(0.03 * var(--mat))) 1px, transparent 1px);
          background-size: 120px 120px;
          opacity: calc(0.35 * var(--mat));
          mask-image: radial-gradient(70% 60% at 40% 35%, #000 45%, transparent 80%);
          animation: gridFloat 22s ease-in-out infinite;
          pointer-events:none;
        }
        @keyframes gridFloat{
          0%,100%{ transform: translate3d(0%,0%,0); }
          50%{ transform: translate3d(1.2%,-0.8%,0); }
        }

        #home-root .home-spot{
          position:absolute; inset:-30%;
          background:
            radial-gradient(520px 520px at var(--mx) var(--my), rgba(0,0,0,calc(0.09 * var(--mat))) 0%, rgba(0,0,0,0) 62%),
            radial-gradient(900px 700px at calc(var(--mx) + 10%) calc(var(--my) + 10%), rgba(0,0,0,calc(0.04 * var(--mat))) 0%, rgba(0,0,0,0) 70%);
          opacity: 0.95;
          filter: blur(0.8px);
          pointer-events:none;
        }

        #home-root .home-sweep{
          position:absolute; inset:-40%;
          background:
            radial-gradient(55% 38% at 0% 50%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 72%),
            radial-gradient(35% 35% at 20% 55%, rgba(0,0,0,calc(0.03 * var(--mat))) 0%, rgba(0,0,0,0) 70%);
          opacity: calc(0.55 * var(--mat));
          transform: translateX(-28%) rotate(-2deg);
          animation: homeSweep 12s ease-in-out infinite;
          mix-blend-mode: soft-light;
          pointer-events:none;
        }
        @keyframes homeSweep{
          0%,100%{ transform: translateX(-28%) translateY(0%) rotate(-2deg); }
          50%{ transform: translateX(28%) translateY(2%) rotate(2deg); }
        }

        #home-root .home-grain{
          position:absolute; inset:0;
          background:
            repeating-radial-gradient(circle at 20% 30%, rgba(0,0,0,calc(0.04 * var(--mat))) 0 0.6px, transparent 0.6px 2.2px),
            repeating-radial-gradient(circle at 80% 70%, rgba(0,0,0,calc(0.03 * var(--mat))) 0 0.7px, transparent 0.7px 2.6px);
          opacity: calc(0.22 * var(--mat));
          mix-blend-mode: multiply;
          filter: blur(0.25px);
          animation: grainJitter 1.6s steps(2, end) infinite;
          pointer-events:none;
        }
        @keyframes grainJitter{
          0%{ transform: translate3d(0,0,0); }
          25%{ transform: translate3d(-0.4%, 0.3%,0); }
          50%{ transform: translate3d(0.3%, -0.4%,0); }
          75%{ transform: translate3d(0.2%, 0.2%,0); }
          100%{ transform: translate3d(0,0,0); }
        }

        #home-root .home-vignette{
          position:absolute; inset:0;
          background: radial-gradient(90% 85% at 50% 40%, rgba(0,0,0,0) 52%, rgba(0,0,0,calc(0.12 * var(--mat))) 100%);
          pointer-events:none;
        }
      `}</style>
    </div>
  );
}

function SceneBlock({ act, phase, done }: { act: Act; phase: "enter" | "hold" | "exit"; done: boolean }) {
  const isPrimary = act.tone === "primary";

  const phaseClass =
    phase === "enter"
      ? "opacity-0 translate-y-3 blur-[2px]"
      : phase === "exit"
        ? "opacity-0 -translate-y-2 blur-[2px]"
        : "opacity-100 translate-y-0 blur-0";

  const textClass = isPrimary
    ? "text-[1.25rem] sm:text-[1.6rem] leading-[1.55] font-semibold tracking-[-0.02em] text-[color:var(--ink)]"
    : "text-[1.02rem] sm:text-[1.15rem] leading-[1.95] font-light tracking-[-0.01em] text-[color:var(--ink-soft)]";

  return (
    <div className={clsx("mx-auto max-w-[46rem] transition-[opacity,transform,filter] duration-[650ms] ease-out", phaseClass)} aria-live="polite">
      <div className={clsx("text-center", textClass, done && "opacity-95")}>
        {act.lines.map((line, i) => {
          if (line === "") return <div key={i} className="h-4" />;

          const act4Punch = act.id === "act-4" && i === 1 ? "mt-2 inline-block font-semibold tracking-[-0.03em]" : "";
          const act5Form =
            act.id === "act-5" && i > 0 && line !== "Mais jamais de la même manière."
              ? "opacity-90"
              : act.id === "act-5" && line === "Mais jamais de la même manière."
                ? "mt-3 opacity-100"
                : "";

          return (
            <p key={i} className={clsx(act4Punch, act5Form)}>
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function Doors({ done }: { done: boolean }) {
  return (
    <div
      className={clsx(
        "flex justify-center gap-10 sm:gap-16 text-[0.9rem] sm:text-[0.95rem] tracking-[-0.01em] transition-opacity duration-700",
        done ? "opacity-80" : "opacity-50"
      )}
    >
      <Link
        href="/studio"
        className="font-medium text-[color:var(--ink)]/70 hover:text-[color:var(--ink)] transition-colors"
      >
        Entreprise
      </Link>
      <Link
        href="/lab"
        className="font-medium text-[color:var(--ink)]/70 hover:text-[color:var(--ink)] transition-colors"
      >
        Entrepreneur
      </Link>
      <Link
        href="/campus"
        className="font-medium text-[color:var(--ink)]/70 hover:text-[color:var(--ink)] transition-colors"
      >
        Écoles & Universités
      </Link>
    </div>
  );
}


function StaticAllActs() {
  return (
    <div className="mx-auto max-w-[46rem] text-center">
      <div className="space-y-8">
        {ACTS.map((a) => (
          <div
            key={a.id}
            className={a.tone === "primary"
              ? "text-[1.25rem] sm:text-[1.55rem] font-semibold text-[color:var(--ink)]"
              : "text-[1.05rem] font-light text-[color:var(--ink-soft)]"}
          >
            {a.lines.map((l, i) => (l === "" ? <div key={i} className="h-3" /> : <p key={i}>{l}</p>))}
          </div>
        ))}
      </div>
    </div>
  );
}
