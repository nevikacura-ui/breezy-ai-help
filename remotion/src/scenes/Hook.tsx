import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C, display, body } from "../theme";

const Word: React.FC<{ children: React.ReactNode; delay: number; color?: string }> = ({
  children,
  delay,
  color = C.cream,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.8 } });
  const y = interpolate(s, [0, 1], [78, 0]);
  const blur = interpolate(s, [0, 1], [16, 0]);
  return (
    <span
      style={{
        display: "inline-block",
        transform: `translateY(${y}px)`,
        filter: `blur(${blur}px)`,
        opacity: s,
        color,
        marginRight: 24,
      }}
    >
      {children}
    </span>
  );
};

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const push = interpolate(frame, [0, 100], [1.06, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [26, 70], [0, 320], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  const kicker = interpolate(frame, [8, 26], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          paddingLeft: 190,
          paddingRight: 120,
        }}
      >
        <div
          style={{
            fontFamily: body,
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: C.butter,
            opacity: kicker,
            marginBottom: 34,
          }}
        >
          AskEasy
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 600,
            fontSize: 132,
            lineHeight: 1.02,
            letterSpacing: -3,
          }}
        >
          <div>
            <Word delay={10}>Ask</Word>
            <Word delay={18}>anything.</Word>
          </div>
          <div style={{ marginTop: 6 }}>
            <Word delay={30}>The</Word>
            <Word delay={38} color={C.butter}>
              easy
            </Word>
            <Word delay={46}>way.</Word>
          </div>
        </div>
        <div
          style={{
            marginTop: 44,
            width: lineW,
            height: 2,
            background: `linear-gradient(90deg, ${C.butter}, rgba(167,139,250,0.9), rgba(0,0,0,0))`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
