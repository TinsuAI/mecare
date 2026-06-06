import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

export const FPS = 30;

export type Msg = {
  type: "recv" | "sent" | "divider";
  text: string;
  time?: string;
  sender?: string;
  senderColor?: string;
  avatar?: string;
  avatarBg?: string;
  avatarFontSize?: number;
  ai?: boolean;
  preloaded?: boolean;
};

export type Scenario = {
  id: string;
  title: string;
  statusTime?: string;
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
};

const stripLen = (html: string) =>
  String(html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, " ")
    .trim().length;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type Slot = { typingStart: number; appear: number; read: number };

export function buildSchedule(messages: Msg[]): Slot[] {
  const START = 16;
  let t = START;
  return messages.map((m) => {
    if (m.preloaded) {
      return { typingStart: -1, appear: -100, read: 0 };
    }
    const chars = stripLen(m.text);
    if (m.type === "divider") {
      const o: Slot = { typingStart: -1, appear: t, read: 22 };
      t += 22;
      return o;
    }
    const typingStart = t;
    const typing = clamp(18 + chars * 0.35, 24, 55);
    t += typing;
    const appear = t;
    const read = clamp(chars * 0.8, 30, 100);
    t += read;
    return { typingStart, appear, read };
  });
}

export function totalFrames(messages: Msg[]): number {
  const s = buildSchedule(messages);
  const last = s[s.length - 1];
  return Math.ceil(last.appear + last.read + 48);
}

export const STYLE = `
.zc-bubble{padding:18px 24px;font-size:30px;line-height:1.46;font-family:'Plus Jakarta Sans','Segoe UI',sans-serif;word-break:break-word;display:inline-block;max-width:100%;box-sizing:border-box;}
.zc-bubble.recv{background:#fff;border-radius:8px 32px 32px 32px;color:#111;box-shadow:0 2px 4px rgba(0,0,0,0.08);}
.zc-bubble.recv.ai-msg{background:#eef9f7;border:1.5px solid rgba(14,158,142,0.22);}
.zc-bubble.sent{background:#0E9E8E;border-radius:32px 8px 32px 32px;color:#fff;}
.zc-bubble strong{font-weight:700;}
.zc-bubble em{font-style:italic;opacity:.93;}
.zc-bubble a{color:#0E9E8E;text-decoration:underline;word-break:break-all;}
.zc-bubble.sent a{color:#fff;}
.uc-card{background:rgba(255,255,255,0.88);border:1.5px solid rgba(14,158,142,0.28);border-radius:14px;padding:14px 16px;font-size:26px;line-height:1.5;margin-top:10px;color:#111;}
.uc-card b{display:block;font-weight:700;margin-bottom:4px;font-size:27px;}
.uc-card.profile{border-color:rgba(14,158,142,0.45);background:rgba(14,158,142,0.07);}
.uc-card.done{border-color:rgba(45,140,89,0.45);background:rgba(45,140,89,0.09);}
.uc-field{display:flex;gap:8px;align-items:flex-start;margin:3px 0;font-size:25px;}
.uc-field-label{color:#666;min-width:120px;}
.uc-field-val{color:#111;font-weight:600;}
`;

export function Avatar({ bg, fs, char }: { bg: string; fs: number; char: string }) {
  return (
    <div
      style={{
        width: 62,
        height: 62,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: fs,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {char}
    </div>
  );
}

export function Bubble({
  m,
  appear,
  headerBg,
  headerFs,
  frame,
}: {
  m: Msg;
  appear: number;
  headerBg: string;
  headerFs: number;
  frame: number;
}) {
  const since = frame - appear;
  const sc = spring({ frame: since, fps: FPS, config: { damping: 16, stiffness: 130 } });
  const opacity = interpolate(sc, [0, 1], [0, 1]);
  const translateY = interpolate(sc, [0, 1], [22, 0]);

  if (m.type === "divider") {
    return (
      <div
        style={{
          textAlign: "center",
          color: "#999",
          fontSize: 25,
          padding: "14px 0",
          opacity,
        }}
      >
        {m.text}
      </div>
    );
  }

  const isSent = m.type === "sent";
  const avatarBg = m.avatarBg || headerBg;
  const avatarFs = m.avatarFontSize || headerFs;
  const avatarChar = m.avatar || "?";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isSent ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 14,
        marginBottom: 18,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {!isSent && <Avatar bg={avatarBg} fs={avatarFs} char={avatarChar} />}
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "72%" }}>
        {m.sender && !isSent && (
          <div
            style={{
              fontSize: 23,
              fontWeight: 700,
              color: m.senderColor || "#333",
              marginBottom: 5,
              marginLeft: 4,
            }}
          >
            {m.sender}
          </div>
        )}
        <div
          className={`zc-bubble ${isSent ? "sent" : "recv"}${m.ai ? " ai-msg" : ""}`}
          dangerouslySetInnerHTML={{
            __html: m.text
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/\n/g, "<br>"),
          }}
        />
        {m.time && (
          <div
            style={{
              fontSize: 22,
              color: "#aaa",
              marginTop: 5,
              textAlign: isSent ? "right" : "left",
              marginRight: isSent ? 4 : 0,
              marginLeft: isSent ? 0 : 4,
            }}
          >
            {m.time}
          </div>
        )}
      </div>
    </div>
  );
}

export function Typing({
  m,
  headerBg,
  headerFs,
  frame,
}: {
  m: Msg;
  headerBg: string;
  headerFs: number;
  frame: number;
}) {
  const dot = Math.floor(frame / 10) % 3;
  const avatarBg = m.avatarBg || headerBg;
  const avatarFs = m.avatarFontSize || headerFs;
  const avatarChar = m.avatar || "?";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 14,
        marginBottom: 18,
      }}
    >
      <Avatar bg={avatarBg} fs={avatarFs} char={avatarChar} />
      <div className="zc-bubble recv" style={{ padding: "18px 28px", minWidth: 80 }}>
        <span style={{ letterSpacing: 4 }}>
          {["·", "·", "·"].map((d, i) => (
            <span key={i} style={{ opacity: i <= dot ? 1 : 0.3 }}>
              {d}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

export const ZaloChat: React.FC<{ scenario: Scenario }> = ({ scenario }) => {
  const { messages, header } = scenario;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sched = buildSchedule(messages);
  const hBg = header.avatarBg || "#0E9E8E";
  const hFs = header.avatarFontSize || 26;

  const intro = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const phoneScale = interpolate(intro, [0, 1], [0.94, 1]);
  const phoneOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "transparent",
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
          {/* status bar */}
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
            <span>{scenario.statusTime || "9:41"}</span>
            <span style={{ fontSize: 22, letterSpacing: 4 }}>● ● ●</span>
          </div>
          {/* chat header */}
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
          {/* messages */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              padding: "30px 36px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              background: "#f0f1f3",
            }}
          >
            {messages.map((m, i) => {
              const sc = sched[i];
              if (frame < sc.appear) {
                if (m.type !== "divider" && sc.typingStart >= 0 && frame >= sc.typingStart) {
                  return <Typing key={i} m={m} headerBg={hBg} headerFs={hFs} frame={frame} />;
                }
                return null;
              }
              return <Bubble key={i} m={m} appear={sc.appear} headerBg={hBg} headerFs={hFs} frame={frame} />;
            })}
          </div>
          {/* input bar */}
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
      </div>
    </AbsoluteFill>
  );
};
