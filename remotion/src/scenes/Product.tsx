import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C, display, body } from "../theme";
import { Phone, PhoneHeader, Bubble, Composer } from "../components/Phone";

const QUESTION = "Remind me to call the clinic at 6";
const ANSWER = ["Done — reminder set for 6:00 PM.", "I'll ping your phone even if AskEasy is closed."];

const Step: React.FC<{ label: string; index: number; active: number }> = ({ label, index, active }) => {
  const on = interpolate(active, [index - 0.6, index], [0.25, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: 0.35 + on * 0.65 }}>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: on > 0.7 ? C.butter : "rgba(242,234,214,0.25)",
          boxShadow: on > 0.7 ? `0 0 22px ${C.butter}` : "none",
        }}
      />
      <div
        style={{
          fontFamily: display,
          fontSize: 40,
          fontWeight: 500,
          letterSpacing: -0.5,
          color: on > 0.7 ? C.cream : "rgba(242,234,214,0.5)",
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const Product: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const phoneY = interpolate(enter, [0, 1], [120, 0]);

  const typed = QUESTION.slice(0, Math.max(0, Math.floor(interpolate(frame, [8, 46], [0, QUESTION.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))));
  const sent = frame > 50;
  const userIn = spring({ frame: frame - 52, fps, config: { damping: 200 } });
  const thinking = frame > 56 && frame < 76;
  const ringPulse = thinking ? (frame % 20) / 20 : 0;
  const spin = frame * 2.2;

  const active = interpolate(frame, [10, 52, 82], [0, 1, 2], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center" }}>
      <div style={{ width: 760, paddingLeft: 170, display: "flex", flexDirection: "column", gap: 40 }}>
        <div style={{ fontFamily: body, fontSize: 20, letterSpacing: 5, color: C.lavender, textTransform: "uppercase", opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" }) }}>
          One conversation
        </div>
        <Step label="Ask" index={0} active={active} />
        <Step label="Understand" index={1} active={active} />
        <Step label="Done" index={2} active={active} />
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", transform: `translateY(${phoneY}px)`, opacity: enter }}>
        <Phone style={{ transform: "perspective(2200px) rotateY(-9deg) rotateX(2deg)" }}>
          <PhoneHeader title="Eazy" />
          <div style={{ flex: 1, padding: "26px 18px", display: "flex", flexDirection: "column", gap: 14, justifyContent: "flex-end" }}>
            {sent ? (
              <Bubble side="user" opacity={userIn} y={interpolate(userIn, [0, 1], [24, 0])}>
                {QUESTION}
              </Bubble>
            ) : null}
            {ANSWER.map((line, i) => {
              const d = 78 + i * 16;
              const o = interpolate(frame, [d, d + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              if (o <= 0) return null;
              return (
                <Bubble key={i} side="ai" opacity={o} y={interpolate(o, [0, 1], [18, 0])}>
                  {line}
                </Bubble>
              );
            })}
          </div>
          <Composer text={sent ? "" : typed} caret={!sent} ringSpin={spin} ringPulse={ringPulse} />
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
