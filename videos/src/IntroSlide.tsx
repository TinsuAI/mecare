import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export type IntroData = {
  num: string;
  title: string;
  pain: string;
  accentColor: string;
};

export const INTRO_FRAMES = 120;

export const IntroSlide: React.FC<{ data: IntroData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, 106, 120], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const contentY = interpolate(frame, [0, 14], [44, 0], { extrapolateRight: "clamp" });
  const titleLines = data.title.split("\n");

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg,#051a14 0%,#0a2e22 60%,#072018 100%)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Plus Jakarta Sans','Segoe UI',Arial,sans-serif",
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${data.accentColor}1a 0%, transparent 65%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -54%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          textAlign: "center",
          padding: "0 80px",
          transform: `translateY(${contentY}px)`,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: data.accentColor,
            color: "#fff",
            fontSize: 27,
            fontWeight: 800,
            padding: "12px 38px",
            borderRadius: 50,
            marginBottom: 54,
            letterSpacing: 2,
          }}
        >
          TÌNH HUỐNG {data.num}
        </div>

        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.18,
            marginBottom: 44,
            textShadow: "0 2px 24px rgba(0,0,0,0.35)",
          }}
        >
          {titleLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        <div
          style={{
            fontSize: 38,
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.55,
            fontStyle: "italic",
          }}
        >
          "{data.pain}"
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.25)",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 5,
        }}
      >
        MECARE · DƯỢC SĨ HẢI
      </div>
    </AbsoluteFill>
  );
};
