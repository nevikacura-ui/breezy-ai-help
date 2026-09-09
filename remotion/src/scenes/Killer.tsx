import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { C, display, body } from "../theme";
import { Phone, PhoneHeader, Bubble, Composer } from "../components/Phone";

export const Killer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const lineA = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const lineB = spring({ frame: frame - 22, fps, config: { damping: 18, stiffness: 130 } });

  const notif = spring({ frame: frame - 44, fps, config: { damping: 16, stiffness: 150 } });
  const pulse = interpolate(Math.sin((frame - 44) / 6), [-1, 1], [0.9, 1.02]);
  const dim = interpolate(frame, [44, 58], [1, 0.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center" }}>
      <div style={{ width: 900, paddingLeft: 170 }}>
        <div
          style={{
            fontFamily: body,
            fontSize: 18,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: C.butter,
            opacity: enter,
            marginBottom: 22,
          }}
        >
          The difference
        </div>
        <div style={{ fontFamily: display, fontWeight: 600, fontSize: 96, lineHeight: 1.03, letterSpacing: -3 }}>
          <div
            style={{
              color: "rgba(242,234,214,0.55)",
              opacity: lineA,
              transform: `translateY(${interpolate(lineA, [0, 1], [40, 0])}px)`,
            }}
          >
            It doesn't just answer.
          </div>
          <div
            style={{
              color: C.butter,
              opacity: lineB,
              transform: `translateY(${interpolate(lineB, [0, 1], [56, 0])}px) scale(${interpolate(lineB, [0, 1], [0.94, 1])})`,
              textShadow: "0 0 70px rgba(255,216,77,0.30)",
              marginTop: 8,
            }}
          >
            It follows through.
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative", opacity: enter }}>
        <Phone style={{ transform: "perspective(2200px) rotateY(8deg)" }} glow={1.3}>
          <PhoneHeader title="6:00 PM" />
          <div style={{ flex: 1, padding: "26px 18px", display: "flex", flexDirection: "column", gap: 14, justifyContent: "flex-end", opacity: dim }}>
            <Bubble side="user">Remind me to call the clinic at 6</Bubble>
            <Bubble side="ai">Reminder set. I'll notify you.</Bubble>
          </div>
          <Composer text="" ringSpin={frame * 1.6} />

          {/* push notification */}
          <div
            style={{
              position: "absolute",
              top: 96,
              left: 20,
              right: 20,
              opacity: notif,
              transform: `translateY(${interpolate(notif, [0, 1], [-26, 0])}px) scale(${pulse})`,
              background: "rgba(30,30,35,0.96)",
              border: "1px solid rgba(255,216,77,0.4)",
              borderRadius: 26,
              padding: "16px 18px",
              display: "flex",
              gap: 14,
              alignItems: "center",
              boxShadow: "0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(255,216,77,0.18)",
            }}
          >
            <Img src={staticFile("images/logo.png")} style={{ width: 44, height: 44, objectFit: "contain" }} />
            <div>
              <div style={{ color: C.cream, fontSize: 19, fontWeight: 600 }}>Call the clinic</div>
              <div style={{ color: C.creamDim, fontSize: 16, marginTop: 2 }}>AskEasy · now</div>
            </div>
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
