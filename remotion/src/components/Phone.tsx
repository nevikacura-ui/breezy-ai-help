import React from "react";
import { staticFile, Img } from "remotion";
import { C, body } from "../theme";

export const PHONE_W = 430;
export const PHONE_H = 880;

export const Phone: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
  glow?: number;
}> = ({ children, style, glow = 1 }) => (
  <div
    style={{
      width: PHONE_W,
      height: PHONE_H,
      borderRadius: 54,
      background: "linear-gradient(160deg, #1e1e23 0%, #101014 60%, #0b0b0e 100%)",
      border: "1px solid rgba(242,234,214,0.14)",
      boxShadow: `0 60px 160px rgba(0,0,0,0.72), 0 0 ${90 * glow}px rgba(167,139,250,${0.22 * glow})`,
      padding: 12,
      position: "relative",
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 44,
        background: "radial-gradient(120% 70% at 50% 0%, #16161b 0%, #0a0a0d 70%)",
        border: "1px solid rgba(242,234,214,0.07)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: body,
      }}
    >
      {children}
    </div>
  </div>
);

export const PhoneHeader: React.FC<{ title?: string }> = ({ title }) => (
  <div
    style={{
      height: 76,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderBottom: `1px solid ${C.line}`,
      position: "relative",
      flexShrink: 0,
    }}
  >
    <Img
      src={staticFile("images/logo.png")}
      style={{ height: 34, objectFit: "contain", opacity: 0.98 }}
    />
    {title ? (
      <div
        style={{
          position: "absolute",
          right: 20,
          fontSize: 15,
          color: C.creamDim,
          letterSpacing: 0.4,
        }}
      >
        {title}
      </div>
    ) : null}
  </div>
);

export const Bubble: React.FC<{
  side: "user" | "ai";
  children: React.ReactNode;
  opacity?: number;
  y?: number;
}> = ({ side, children, opacity = 1, y = 0 }) => (
  <div
    style={{
      display: "flex",
      justifyContent: side === "user" ? "flex-end" : "flex-start",
      opacity,
      transform: `translateY(${y}px)`,
    }}
  >
    <div
      style={{
        maxWidth: "82%",
        padding: "14px 18px",
        borderRadius: 24,
        borderBottomRightRadius: side === "user" ? 8 : 24,
        borderBottomLeftRadius: side === "ai" ? 8 : 24,
        background:
          side === "user"
            ? "linear-gradient(135deg, rgba(255,216,77,0.94), rgba(245,184,0,0.9))"
            : "rgba(255,255,255,0.045)",
        border: side === "ai" ? `1px solid ${C.line}` : "none",
        color: side === "user" ? "#17140b" : C.cream,
        fontSize: 19,
        lineHeight: 1.45,
        fontWeight: side === "user" ? 600 : 400,
      }}
    >
      {children}
    </div>
  </div>
);

export const Composer: React.FC<{ text: string; caret?: boolean; ringSpin?: number; ringPulse?: number }> = ({
  text,
  caret = true,
  ringSpin = 0,
  ringPulse = 0,
}) => (
  <div
    style={{
      margin: "0 18px 22px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 12px 12px 20px",
      borderRadius: 999,
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(242,234,214,0.16)",
      flexShrink: 0,
    }}
  >
    <div style={{ flex: 1, fontSize: 19, color: text ? C.cream : "rgba(242,234,214,0.35)" }}>
      {text || "Ask anything…"}
      {caret ? <span style={{ color: C.butter }}>|</span> : null}
    </div>
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: "50%",
        position: "relative",
        transform: `rotate(${ringSpin}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `conic-gradient(from 0deg, ${C.butter}, ${C.lavender}, ${C.mint}, ${C.butter})`,
          opacity: 0.95,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 3,
          borderRadius: "50%",
          background: "#0c0c10",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: -6 - ringPulse * 8,
          borderRadius: "50%",
          border: `1px solid rgba(255,216,77,${0.35 * (1 - ringPulse)})`,
        }}
      />
    </div>
  </div>
);
