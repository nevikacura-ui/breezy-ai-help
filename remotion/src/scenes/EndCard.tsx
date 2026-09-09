import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { C, display, body } from "../theme";

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logo = spring({ frame: frame - 4, fps, config: { damping: 200, mass: 1.1 } });
  const name = spring({ frame: frame - 26, fps, config: { damping: 200 } });
  const domain = spring({ frame: frame - 44, fps, config: { damping: 200 } });
  const glow = interpolate(Math.sin(frame / 26), [-1, 1], [0.35, 0.7]);
  const drift = Math.sin(frame / 60) * 6;
  const lineW = interpolate(frame, [30, 70], [0, 460], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255,216,77,${0.10 * glow * 2}) 0%, rgba(167,139,250,0.06) 40%, rgba(0,0,0,0) 68%)`,
        }}
      />
      <Img
        src={staticFile("images/logo.png")}
        style={{
          width: 720,
          objectFit: "contain",
          opacity: logo,
          transform: `translateY(${interpolate(logo, [0, 1], [40, drift])}px) scale(${interpolate(logo, [0, 1], [0.9, 1])})`,
          filter: `blur(${interpolate(logo, [0, 1], [14, 0])}px) drop-shadow(0 30px 90px rgba(0,0,0,0.6))`,
        }}
      />
      <div
        style={{
          width: lineW,
          height: 1,
          background: `linear-gradient(90deg, rgba(0,0,0,0), ${C.butter}, rgba(0,0,0,0))`,
          marginTop: 10,
          opacity: 0.75,
        }}
      />
      <div
        style={{
          fontFamily: display,
          fontSize: 46,
          fontWeight: 500,
          letterSpacing: 2,
          color: C.cream,
          marginTop: 28,
          opacity: name,
          transform: `translateY(${interpolate(name, [0, 1], [24, 0])}px)`,
        }}
      >
        Your everyday AI companion
      </div>
      <div
        style={{
          fontFamily: body,
          fontSize: 34,
          letterSpacing: 8,
          color: C.butter,
          marginTop: 26,
          opacity: domain,
          transform: `translateY(${interpolate(domain, [0, 1], [18, 0])}px)`,
        }}
      >
        askeasy.ai
      </div>
    </AbsoluteFill>
  );
};
