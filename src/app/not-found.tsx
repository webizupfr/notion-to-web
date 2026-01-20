"use client";

import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main
      id="nf-root"
      className="relative min-h-dvh overflow-hidden font-sans"
      style={{
        "--paper": "#fbfaf6",
        "--paper-2": "#f4efe3",
        "--ink": "#1c1c1c",
        "--ink-soft": "rgba(28,28,28,0.62)",
        "--mx": "45%",
        "--my": "35%",
        "--mat": 1.05,
      } as React.CSSProperties}
    >
      {/* Background matière (même famille que landing/gate) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="nf-socle" />
        <div className="nf-fibers" />
        <div className="nf-grid" />
        <div className="nf-spot" />
        <div className="nf-sweep" />
        <div className="nf-grain" />
        <div className="nf-vignette" />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-[72rem] flex-col px-6 py-10 sm:px-10">
        {/* Spacer haut */}
        <div className="flex-1" />

        {/* Bloc central (titre + texte) */}
        <section className="mx-auto w-full max-w-[44rem] text-center">
          <p className="text-[0.78rem] font-medium tracking-[0.16em] uppercase text-[color:var(--ink-soft)]">
            404
          </p>

          <h1 className="mt-4 text-[2rem] leading-[1.05] sm:text-[2.6rem] font-semibold tracking-[-0.035em] text-[color:var(--ink)]">
            Page introuvable
          </h1>

          <p className="mt-4 text-[1rem] sm:text-[1.05rem] leading-[1.75] font-light text-[color:var(--ink-soft)]">
            Ce lien ne mène nulle part. Vérifie l’URL, ou reprends ton parcours depuis un point fiable.
          </p>

          {/* Actions discrètes */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[0.95rem]">
            <Link
              href="/"
              className="font-medium text-[color:var(--ink)]/75 hover:text-[color:var(--ink)] transition-colors"
            >
              Retour à l’accueil
            </Link>

            
          </div>
          {/* Élément visuel bas de page */}
          <div className="pointer-events-none mx-auto mt-10 w-full max-w-[52rem] opacity-80">
            <Image
              src="https://res.cloudinary.com/dslusr7eq/image/upload/v1766156179/404.png"
              alt="Illustration de page introuvable"
              width={640}
              height={400}
              className="mx-auto w-full max-w-[480px] object-contain"
            />
          </div>

        </section>

       
       
      </div>

      {/* Motion spotlight (léger) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  try{
    var root = document.getElementById('nf-root');
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

      {/* Styles background (self-contained) */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce){
          .nf-fibers, .nf-grid, .nf-sweep, .nf-grain { animation: none !important; }
        }

        #nf-root .nf-socle{
          position:absolute; inset:0;
          background:
            radial-gradient(120% 90% at 40% 20%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 45%),
            radial-gradient(110% 100% at 70% 65%, rgba(0,0,0,calc(0.05 * var(--mat))) 0%, rgba(0,0,0,0) 58%),
            linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%);
        }

        #nf-root .nf-fibers{
          position:absolute; inset:-15%;
          background:
            repeating-linear-gradient(110deg, rgba(0,0,0,calc(0.012 * var(--mat))) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 8px),
            repeating-linear-gradient(20deg,  rgba(0,0,0,calc(0.010 * var(--mat))) 0px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 10px);
          opacity: calc(0.45 * var(--mat));
          filter: blur(0.75px);
          mix-blend-mode: multiply;
          animation: nfFibers 22s ease-in-out infinite;
          pointer-events:none;
        }
        @keyframes nfFibers{
          0%,100%{ transform: translate3d(-1.0%,-0.35%,0) rotate(-0.12deg); }
          50%{ transform: translate3d(1.0%,0.55%,0) rotate(0.12deg); }
        }

        #nf-root .nf-grid{
          position:absolute; inset:-10%;
          background:
            linear-gradient(to right, rgba(0,0,0,calc(0.028 * var(--mat))) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,calc(0.022 * var(--mat))) 1px, transparent 1px);
          background-size: 150px 150px;
          opacity: calc(0.22 * var(--mat));
          mask-image: radial-gradient(75% 60% at 50% 45%, #000 40%, transparent 82%);
          animation: nfGrid 28s ease-in-out infinite;
          pointer-events:none;
        }
        @keyframes nfGrid{
          0%,100%{ transform: translate3d(0%,0%,0); }
          50%{ transform: translate3d(0.9%,-0.5%,0); }
        }

        #nf-root .nf-spot{
          position:absolute; inset:-30%;
          background:
            radial-gradient(560px 560px at var(--mx) var(--my), rgba(0,0,0,calc(0.07 * var(--mat))) 0%, rgba(0,0,0,0) 62%),
            radial-gradient(980px 760px at calc(var(--mx) + 10%) calc(var(--my) + 10%), rgba(0,0,0,calc(0.03 * var(--mat))) 0%, rgba(0,0,0,0) 74%);
          opacity: 0.9;
          filter: blur(1px);
          pointer-events:none;
        }

        #nf-root .nf-sweep{
          position:absolute; inset:-40%;
          background:
            radial-gradient(55% 38% at 0% 50%, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0) 72%),
            radial-gradient(35% 35% at 20% 55%, rgba(0,0,0,calc(0.023 * var(--mat))) 0%, rgba(0,0,0,0) 70%);
          opacity: calc(0.34 * var(--mat));
          transform: translateX(-25%) rotate(-2deg);
          animation: nfSweep 16s ease-in-out infinite;
          mix-blend-mode: soft-light;
          pointer-events:none;
        }
        @keyframes nfSweep{
          0%,100%{ transform: translateX(-25%) translateY(0%) rotate(-2deg); }
          50%{ transform: translateX(25%) translateY(1.2%) rotate(2deg); }
        }

        #nf-root .nf-grain{
          position:absolute; inset:0;
          background:
            repeating-radial-gradient(circle at 20% 30%, rgba(0,0,0,calc(0.030 * var(--mat))) 0 0.6px, transparent 0.6px 2.5px),
            repeating-radial-gradient(circle at 80% 70%, rgba(0,0,0,calc(0.024 * var(--mat))) 0 0.7px, transparent 0.7px 2.9px);
          opacity: calc(0.16 * var(--mat));
          mix-blend-mode: multiply;
          filter: blur(0.3px);
          animation: nfGrain 2.0s steps(2,end) infinite;
          pointer-events:none;
        }
        @keyframes nfGrain{
          0%{ transform: translate3d(0,0,0); }
          25%{ transform: translate3d(-0.3%, 0.2%,0); }
          50%{ transform: translate3d(0.2%, -0.3%,0); }
          75%{ transform: translate3d(0.12%, 0.12%,0); }
          100%{ transform: translate3d(0,0,0); }
        }

        #nf-root .nf-vignette{
          position:absolute; inset:0;
          background: radial-gradient(90% 85% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,calc(0.10 * var(--mat))) 100%);
          pointer-events:none;
        }
      `}</style>
    </main>
  );
}
