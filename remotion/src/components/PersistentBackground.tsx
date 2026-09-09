import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { C } from "../theme";

const Glow: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  drift: number;
  phase: number;
  opacity: number;
}> = ({ x, y, size, color, drift, phase, opacity }) => {
  const frame = useCurrentFrame();
  const t = (frame + phase) / 220;
  const dx = Math.sin(t * Math.PI * 2) * drift;
  const dy = Math.cos(t * Math.PI * 2 * 0.7) * drift * 0.6;
  return (
    <div
      style={{
        position: "absolute",
        left: x + dx,
        top: y + dy,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 68%)`,
        opacity,
      }}
    />
  );
};

export const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const breathe = interpolate(Math.sin(frame / 90), [-1, 1], [0.9, 1.06]);
  return (
    <AbsoluteFill style={{ backgroundColor: C.onyx, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, #17171c 0%, #0b0b0e 55%, #07070a 100%)",
        }}
      />
      <div style={{ opacity: breathe }}>
        <Glow x={-220} y={-160} size={980} color="rgba(167,139,250,0.20)" drift={40} phase={0} opacity={1} />
        <Glow x={1180} y={520} size={1120} color="rgba(255,216,77,0.13)" drift={54} phase={70} opacity={1} />
        <Glow x={520} y={760} size={820} color="rgba(189,233,201,0.07)" drift={30} phase={140} opacity={1} />
      </div>
      {/* fine grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(242,234,214,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(242,234,214,0.028) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          maskImage: "radial-gradient(70% 60% at 50% 45%, #000 0%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 45%, #000 0%, transparent 100%)",
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(75% 65% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
