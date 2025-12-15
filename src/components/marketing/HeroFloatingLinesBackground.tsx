import FloatingLines from "@/components/FloatingLines";

export function HeroFloatingLinesBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <FloatingLines
        linesGradient={[
          "#FFB300", // amber fort
          "#FFCB4D", // amber doux
          "#FFE19A", // ivoire chaud
        ]}
        enabledWaves={["top", "bottom"]}
        lineCount={[10, 10]}
        lineDistance={[12, 12]}
        topWavePosition={{ x: 6, y: 0.55, rotate: -0.4 }}
        bottomWavePosition={{ x: 3, y: -0.55, rotate: -0.3 }}
        animationSpeed={0.45}
        interactive={false}
        parallax={false}
      />
    </div>
  );
}
