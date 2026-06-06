import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from "remotion";
import { buildSchedule, totalFrames, Msg, Slot, STYLE, Bubble, Typing } from "./ZaloChat";

export type MultiScene = {
  header: {
    name: string;
    sub: string;
    avatar?: string;
    avatarBg?: string;
    avatarFontSize?: number;
    placeholder?: string;
    badge?: string;
  };
  messages: Msg[];
  timing?: "fast" | "normal";
};

export type MultiScenario = {
  id: string;
  title: string;
  scenes: MultiScene[];
};

const TRANS = 30;

const stripLen = (html: string) =>
  String(html || "").replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, " ").trim().length;

function buildFastSchedule(messages: Msg[]): Slot[] {
  const START = 6;
  let t = START;
  return messages.map((m) => {
    if (m.preloaded) {
      return { typingStart: -1, appear: -100, read: 0 };
    }
    const chars = stripLen(m.text);
    if (m.type === "divider") {
      const o: Slot = { typingStart: -1, appear: t, read: 10 };
      t += 10;
      return o;
    }
    const appear = t;
    const read = Math.max(8, Math.min(20, 5 + chars * 0.16));
    t += read;
    return { typingStart: -1, appear, read };
  });
}

function sceneDur(scene: MultiScene): number {
  if (scene.timing === "fast") {
    const sched = buildFastSchedule(scene.messages);
    const last = sched[scene.messages.length - 1];
    return Math.ceil(last.appear + last.read + 24);
  }
  return totalFrames(scene.messages);
}

function buildTimeline(scenes: MultiScene[]) {
  let t = 0;
  return scenes.map((s, i) => {
    const dur = sceneDur(s);
    const start = t;
    const transStart = t + dur;
    t += dur + (i < scenes.length - 1 ? TRANS : 0);
    return { start, dur, transStart };
  });
}

export function totalFramesMulti(scenes: MultiScene[]): number {
  const tl = buildTimeline(scenes);
  const last = tl[tl.length - 1];
  return last.start + last.dur;
}

function ChatScreen({ scene, localFrame }: { scene: MultiScene; localFrame: number }) {
  const { header, messages } = scene;
  const hBg = header.avatarBg || "#0E9E8E";
  const hFs = header.avatarFontSize || 26;
  const sched = scene.timing === "fast" ? buildFastSchedule(messages) : buildSchedule(messages);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#f0f1f3" }}>
      <div
        style={{
          background: "linear-gradient(135deg,#0E9E8E,#0B7D70)",
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "20px 30px",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 46, fontWeight: 300 }}>‹</div>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: hBg,
            border: "3px solid rgba(255,255,255,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: hFs,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {header.avatar || "💊"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 33, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {header.name}
          </div>
          <div style={{ fontSize: 23, color: "rgba(255,255,255,0.88)", marginTop: 3 }}>{header.sub}</div>
        </div>
      </div>
      {header.badge && (
        <div
          style={{
            background: "rgba(14,158,142,0.1)",
            color: "#0B7D70",
            fontSize: 23,
            textAlign: "center",
            padding: "10px 20px",
            fontWeight: 600,
            borderBottom: "1px solid rgba(14,158,142,0.2)",
            flexShrink: 0,
          }}
        >
          {header.badge}
        </div>
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          padding: "30px 36px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        {messages.map((m, i) => {
          const sc = sched[i];
          if (localFrame < sc.appear) {
            if (m.type !== "divider" && sc.typingStart >= 0 && localFrame >= sc.typingStart) {
              return <Typing key={i} m={m} headerBg={hBg} headerFs={hFs} frame={localFrame} />;
            }
            return null;
          }
          return <Bubble key={i} m={m} appear={sc.appear} headerBg={hBg} headerFs={hFs} frame={localFrame} />;

        })}
      </div>
      <div
        style={{
          height: 104,
          background: "#fff",
          borderTop: "1px solid #e6e6e6",
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 32px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 60,
            background: "#f0f1f3",
            borderRadius: 30,
            display: "flex",
            alignItems: "center",
            padding: "0 26px",
            color: "#9aa0a8",
            fontSize: 27,
          }}
        >
          {header.placeholder || "Nhắn tin..."}
        </div>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#0E9E8E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" width="30" height="30" fill="#fff">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export const ZaloChatMultiScene: React.FC<{ scenario: MultiScenario }> = ({ scenario }) => {
  const { scenes } = scenario;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timeline = buildTimeline(scenes);

  const lastTl = timeline[scenes.length - 1];
  let sceneIdx = scenes.length - 1;
  let localFrame = Math.max(0, frame - lastTl.start);
  let transitioning = false;
  let transProgress = 0;
  let nextIdx = -1;

  for (let i = 0; i < timeline.length; i++) {
    const { start, transStart } = timeline[i];
    if (frame < transStart) {
      sceneIdx = i;
      localFrame = frame - start;
      transitioning = false;
      nextIdx = -1;
      break;
    }
    if (i < scenes.length - 1 && frame < transStart + TRANS) {
      sceneIdx = i;
      localFrame = frame - start;
      transitioning = true;
      transProgress = (frame - transStart) / TRANS;
      nextIdx = i + 1;
      break;
    }
  }

  const intro = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const phoneScale = interpolate(intro, [0, 1], [0.94, 1]);
  const phoneOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const SLIDE = 948;
  const eased = Easing.inOut(Easing.ease)(transProgress);
  const curX = transitioning ? eased * -SLIDE : 0;
  const nxtX = transitioning ? SLIDE + eased * -SLIDE : SLIDE;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg,#051a14 0%,#0a3028 45%,#0E9E8E 200%)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div
        style={{
          width: 980,
          height: 1840,
          background: "#0a0a0c",
          borderRadius: 78,
          padding: 16,
          boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
          transform: `scale(${phoneScale})`,
          opacity: phoneOp,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 62,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              height: 54,
              background: "#0E9E8E",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 44px",
              color: "#fff",
              fontSize: 24,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <span>9:41</span>
            <span style={{ fontSize: 22, letterSpacing: 4 }}>● ● ●</span>
          </div>
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, transform: `translateX(${curX}px)` }}>
              <ChatScreen scene={scenes[sceneIdx]} localFrame={localFrame} />
            </div>
            {transitioning && nextIdx >= 0 && (
              <div style={{ position: "absolute", inset: 0, transform: `translateX(${nxtX}px)` }}>
                <ChatScreen scene={scenes[nextIdx]} localFrame={0} />
              </div>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
