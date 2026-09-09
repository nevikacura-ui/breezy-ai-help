import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
  Img,
} from "remotion";
import { C, display, body } from "../theme";

const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: "rgba(23,23,26,0.72)",
      border: `1px solid ${C.line}`,
      borderRadius: 34,
      boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
      padding: 34,
      ...style,
    }}
  >
    {children}
  </div>
);

const Beat: React.FC<{
  index: number;
  kicker: string;
  title: string;
  children: React.ReactNode;
}> = ({ index, kicker, title, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  const out = interpolate(frame, [46, 60], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dir = index % 2 === 0 ? 1 : -1;
  return (
    <AbsoluteFill
      style={{
        opacity: s * out,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 96,
        transform: `translateX(${interpolate(s, [0, 1], [70 * dir, 0])}px) scale(${interpolate(out, [0, 1], [1.05, 1])})`,
      }}
    >
      <div style={{ width: 620 }}>
        <div
          style={{
            fontFamily: body,
            fontSize: 18,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: C.lavender,
            marginBottom: 18,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontFamily: display,
            fontSize: 78,
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: -2,
            whiteSpace: "pre-line",
            color: C.cream,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ width: 640 }}>{children}</div>
    </AbsoluteFill>
  );
};

const AgentCard: React.FC<{ img: string; name: string; tag: string; delay: number }> = ({ img, name, tag, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 140 } });
  return (
    <Panel
      style={{
        flex: 1,
        padding: 22,
        textAlign: "center",
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
      }}
    >
      <Img src={staticFile(img)} style={{ width: 118, height: 118, objectFit: "contain" }} />
      <div style={{ fontFamily: display, fontSize: 26, fontWeight: 600, color: C.cream, marginTop: 8 }}>{name}</div>
      <div style={{ fontFamily: body, fontSize: 16, color: C.creamDim, marginTop: 4 }}>{tag}</div>
    </Panel>
  );
};

const Chip: React.FC<{ label: string; delay: number; accent?: boolean }> = ({ label, delay, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 160 } });
  return (
    <div
      style={{
        padding: "14px 26px",
        borderRadius: 999,
        border: `1px solid ${accent ? "rgba(255,216,77,0.6)" : C.line}`,
        background: accent ? "rgba(255,216,77,0.14)" : "rgba(255,255,255,0.04)",
        color: accent ? C.butter : C.cream,
        fontFamily: body,
        fontSize: 26,
        opacity: s,
        transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
      }}
    >
      {label}
    </div>
  );
};

const Wave: React.FC = () => {
  const frame = useCurrentFrame();
  const bars = new Array(34).fill(0);
  return (
    <Panel style={{ display: "flex", alignItems: "center", gap: 22 }}>
      <div
        style={{
          width: 78,
          height: 78,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.butter}, ${C.butterDeep})`,
          flexShrink: 0,
          boxShadow: `0 0 46px rgba(255,216,77,0.4)`,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 7, height: 92, flex: 1 }}>
        {bars.map((_, i) => {
          const h = 14 + Math.abs(Math.sin((frame / 7) + i / 2.2)) * (i % 3 === 0 ? 74 : 46);
          const appear = interpolate(frame, [4 + i * 0.7, 14 + i * 0.7], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                width: 6,
                height: h,
                borderRadius: 4,
                opacity: appear,
                background: i % 2 === 0 ? C.lavenderSoft : "rgba(242,234,214,0.45)",
              }}
            />
          );
        })}
      </div>
    </Panel>
  );
};

export const Features: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={64}>
      <Beat index={0} kicker="Your cast" title={"Agents with\na personality."}>
        <div style={{ display: "flex", gap: 20 }}>
          <AgentCard img="images/easy.png" name="Eazy" tag="Everyday" delay={4} />
          <AgentCard img="images/buddy-vera.png" name="Vera" tag="Study" delay={9} />
          <AgentCard img="images/buddy-neo.png" name="Arjun" tag="Ideas" delay={14} />
        </div>
      </Beat>
    </Sequence>
    <Sequence from={52} durationInFrames={64}>
      <Beat index={1} kicker="Ten languages" title={"Answers in\nyour language."}>
        <Panel style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <Chip label="English" delay={2} accent />
          <Chip label="हिन्दी" delay={6} />
          <Chip label="मैथिली" delay={10} />
          <Chip label="বাংলা" delay={14} />
          <Chip label="தமிழ்" delay={18} />
          <Chip label="मराठी" delay={22} />
        </Panel>
      </Beat>
    </Sequence>
    <Sequence from={104} durationInFrames={62}>
      <Beat index={2} kicker="Hands free" title={"Hold, speak,\ndone."}>
        <Wave />
      </Beat>
    </Sequence>
  </AbsoluteFill>
);
