"use client";
 

import Link from "next/link";
import { GateForm } from "./GateForm";

function Content({ next, error }: { next: string; error?: string | null }) {
  const hasError = Boolean(error);

  return (
    <div id="gate-root" className="relative min-h-dvh overflow-hidden font-sans"
      style={{
        ["--paper" as any]: "#fbfaf6",
        ["--paper-2" as any]: "#f4efe3",
        ["--ink" as any]: "#1c1c1c",
        ["--ink-soft" as any]: "rgba(28,28,28,0.62)",
        ["--mx" as any]: "35%",
        ["--my" as any]: "30%",
        ["--mat" as any]: 1.1,
      }}
    >
      {/* Background matière (même famille que la home) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="gate-socle" />
        <div className="gate-fibers" />
        <div className="gate-grid" />
        <div className="gate-spot" />
        <div className="gate-sweep" />
        <div className="gate-grain" />
        <div className="gate-vignette" />
      </div>

      <main className="relative mx-auto flex min-h-dvh w-full max-w-[72rem] flex-col items-center justify-center px-6 py-14 sm:px-10">
        {/* Carte légère (pas une grosse card) */}
        <section className="w-full max-w-[26rem]">
          <div className="rounded-[28px] border border-black/[0.06] bg-white/40 backdrop-blur-xl shadow-[0_20px_60px_rgba(10,14,30,0.10)]">
            <div className="px-6 py-7 sm:px-7 sm:py-8">
              {/* Header */}
              <div className="text-center">
                <div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] bg-white/50 text-[color:var(--ink)]/80">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                  </svg>
                </div>

                <h1 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
                  Espace protégé
                </h1>

                <p className="mt-2 text-[0.98rem] leading-[1.7] font-light text-[color:var(--ink-soft)]">
                  Saisissez la <span className="font-medium text-[color:var(--ink)]/85">clé d’accès</span> partagée pour déverrouiller le contenu.
                </p>
              </div>

              {/* Error (discret, pas agressif) */}
              {hasError ? (
                <div className="mt-5 rounded-2xl border border-black/[0.08] bg-white/55 px-4 py-3 text-left">
                  <p className="text-[0.92rem] leading-[1.6] text-[color:var(--ink)]/85">
                    Clé invalide. Réessayez ou contactez votre interlocuteur.
                  </p>
                </div>
              ) : null}

              {/* Form */}
              <div className="mt-6">
                <GateForm next={next} />
              </div>

              {/* Footer links */}
              <div className="mt-6 text-center text-[0.86rem] font-light text-[color:var(--ink-soft)]">
                Besoin d’aide ?{" "}
               
                ·{" "}
                <a
                  href="mailto:hello@impulsion.studio"
                  className="underline underline-offset-4 decoration-black/20 hover:decoration-black/40"
                >
                  arthur@impulsion-ia.fr
                </a>
              </div>
            </div>
          </div>

          {/* Micro signature (optionnel mais premium) */}
          <div className="mt-4 text-center text-[0.78rem] font-light text-[color:var(--ink-soft)]/90">
            Impulsion · accès sécurisé
          </div>
        </section>
      </main>

      <GateBackgroundMotion />
      <GateBackgroundStyles />
    </div>
  );
}

// Server page (stable SSR)
export default function Gate({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const nextRaw = (searchParams?.next as string | undefined) || "/";
  const error = (searchParams?.e as string | undefined) || null;
  return <Content next={nextRaw} error={error} />;
}

/** Motion spotlight — client-only, scoped to #gate-root */
function GateBackgroundMotion() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function(){
  try{
    var root = document.getElementById('gate-root');
    if(!root) return;
    var raf = 0;
    function onMove(e){
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function(){
        var x = (e.clientX / window.innerWidth) * 100;
        var y = (e.clientY / window.innerHeight) * 100;
        root.style.setProperty('--mx', x.toFixed(2) + '%');
        root.style.setProperty('--my', y.toFixed(2) + '%');
      });
    }
    window.addEventListener('mousemove', onMove, { passive:true });
  }catch(e){}
})();`,
      }}
    />
  );
}

/** Styles background — self-contained */
function GateBackgroundStyles() {
  return (
    <style jsx global>{`
      @media (prefers-reduced-motion: reduce){
        .gate-fibers, .gate-grid, .gate-sweep, .gate-grain { animation: none !important; }
      }

      #gate-root .gate-socle{
        position:absolute; inset:0;
        background:
          radial-gradient(120% 90% at 40% 20%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 45%),
          radial-gradient(110% 100% at 70% 65%, rgba(0,0,0,calc(0.05 * var(--mat))) 0%, rgba(0,0,0,0) 58%),
          linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%);
      }

      #gate-root .gate-fibers{
        position:absolute; inset:-15%;
        background:
          repeating-linear-gradient(110deg, rgba(0,0,0,calc(0.013 * var(--mat))) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 8px),
          repeating-linear-gradient(20deg,  rgba(0,0,0,calc(0.010 * var(--mat))) 0px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 10px);
        opacity: calc(0.48 * var(--mat));
        filter: blur(0.7px);
        mix-blend-mode: multiply;
        animation: gateFibers 20s ease-in-out infinite;
        pointer-events:none;
      }
      @keyframes gateFibers{
        0%,100%{ transform: translate3d(-1.1%,-0.4%,0) rotate(-0.15deg); }
        50%{ transform: translate3d(1.1%,0.6%,0) rotate(0.15deg); }
      }

      #gate-root .gate-grid{
        position:absolute; inset:-10%;
        background:
          linear-gradient(to right, rgba(0,0,0,calc(0.032 * var(--mat))) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,calc(0.024 * var(--mat))) 1px, transparent 1px);
        background-size: 140px 140px;
        opacity: calc(0.24 * var(--mat));
        mask-image: radial-gradient(70% 60% at 45% 40%, #000 40%, transparent 80%);
        animation: gateGrid 26s ease-in-out infinite;
        pointer-events:none;
      }
      @keyframes gateGrid{
        0%,100%{ transform: translate3d(0%,0%,0); }
        50%{ transform: translate3d(1%,-0.6%,0); }
      }

      #gate-root .gate-spot{
        position:absolute; inset:-30%;
        background:
          radial-gradient(520px 520px at var(--mx) var(--my), rgba(0,0,0,calc(0.075 * var(--mat))) 0%, rgba(0,0,0,0) 62%),
          radial-gradient(900px 700px at calc(var(--mx) + 10%) calc(var(--my) + 10%), rgba(0,0,0,calc(0.03 * var(--mat))) 0%, rgba(0,0,0,0) 72%);
        opacity: 0.92;
        filter: blur(1px);
        pointer-events:none;
      }

      #gate-root .gate-sweep{
        position:absolute; inset:-40%;
        background:
          radial-gradient(55% 38% at 0% 50%, rgba(255,255,255,0.70) 0%, rgba(255,255,255,0) 72%),
          radial-gradient(35% 35% at 20% 55%, rgba(0,0,0,calc(0.025 * var(--mat))) 0%, rgba(0,0,0,0) 70%);
        opacity: calc(0.40 * var(--mat));
        transform: translateX(-26%) rotate(-2deg);
        animation: gateSweep 14s ease-in-out infinite;
        mix-blend-mode: soft-light;
        pointer-events:none;
      }
      @keyframes gateSweep{
        0%,100%{ transform: translateX(-26%) translateY(0%) rotate(-2deg); }
        50%{ transform: translateX(26%) translateY(1.5%) rotate(2deg); }
      }

      #gate-root .gate-grain{
        position:absolute; inset:0;
        background:
          repeating-radial-gradient(circle at 20% 30%, rgba(0,0,0,calc(0.032 * var(--mat))) 0 0.6px, transparent 0.6px 2.4px),
          repeating-radial-gradient(circle at 80% 70%, rgba(0,0,0,calc(0.026 * var(--mat))) 0 0.7px, transparent 0.7px 2.8px);
        opacity: calc(0.18 * var(--mat));
        mix-blend-mode: multiply;
        filter: blur(0.28px);
        animation: gateGrain 1.8s steps(2,end) infinite;
        pointer-events:none;
      }
      @keyframes gateGrain{
        0%{ transform: translate3d(0,0,0); }
        25%{ transform: translate3d(-0.35%, 0.25%,0); }
        50%{ transform: translate3d(0.25%, -0.35%,0); }
        75%{ transform: translate3d(0.15%, 0.15%,0); }
        100%{ transform: translate3d(0,0,0); }
      }

      #gate-root .gate-vignette{
        position:absolute; inset:0;
        background: radial-gradient(90% 85% at 50% 40%, rgba(0,0,0,0) 54%, rgba(0,0,0,calc(0.10 * var(--mat))) 100%);
        pointer-events:none;
      }
    `}</style>
  );
}
