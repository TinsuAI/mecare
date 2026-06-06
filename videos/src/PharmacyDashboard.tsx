import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

const TEAL = "#0E9E8E";
const TEAL_DARK = "#0B7D70";
const AMBER = "#F59E0B";
const BLUE = "#3b82f6";
const GREEN = "#10b981";

const STATS = [
  { label: "Khách đang theo dõi", value: 247, unit: "", color: TEAL, icon: "👥" },
  { label: "Tỷ lệ tái mua tháng này", value: 68, unit: "%", color: AMBER, icon: "🔄" },
  { label: "Doanh thu tái mua", value: 12.4, unit: "M đ", color: BLUE, icon: "💰" },
  { label: "Nhắc thành công", value: 94, unit: "%", color: GREEN, icon: "✅" },
];

const MONTHLY = [
  { month: "T12", pct: 55 },
  { month: "T1", pct: 62 },
  { month: "T2", pct: 58 },
  { month: "T3", pct: 74 },
  { month: "T4", pct: 81 },
  { month: "T5", pct: 94 },
];

const CUSTOMERS = [
  { name: "Chị Châu", drug: "Metformin 500mg", days: 27, dot: "#e53935" },
  { name: "Anh Minh", drug: "Amlodipine 5mg", days: 25, dot: "#e53935" },
  { name: "Bà Hoa", drug: "Aspirin 100mg", days: 22, dot: AMBER },
  { name: "Anh Tuấn", drug: "Atorvastatin 20mg", days: 20, dot: GREEN },
  { name: "Chị Thu", drug: "Losartan 50mg", days: 18, dot: GREEN },
];

function useCount(target: number, startFrame: number, durationFrames: number) {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const t = Math.min(1, elapsed / durationFrames);
  const eased = 1 - Math.pow(1 - t, 3);
  return Math.round(target * eased);
}

function StatCard({
  stat,
  delayFrame,
}: {
  stat: (typeof STATS)[0];
  delayFrame: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sc = spring({ frame: frame - delayFrame, fps, config: { damping: 18, stiffness: 100 } });
  const opacity = interpolate(sc, [0, 1], [0, 1]);
  const y = interpolate(sc, [0, 1], [30, 0]);

  const isFloat = stat.value % 1 !== 0;
  const rawCount = useCount(isFloat ? stat.value * 10 : stat.value, delayFrame, 50);
  const display = isFloat ? (rawCount / 10).toFixed(1) : rawCount.toString();

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: "24px 20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        borderLeft: `5px solid ${stat.color}`,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
      <div
        style={{
          fontSize: 44,
          fontWeight: 800,
          color: stat.color,
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {display}
        <span style={{ fontSize: 24, fontWeight: 600, marginLeft: 4 }}>{stat.unit}</span>
      </div>
      <div style={{ fontSize: 22, color: "#666", lineHeight: 1.3 }}>{stat.label}</div>
    </div>
  );
}

function BarChart({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: "30px 28px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: "#222", marginBottom: 4 }}>
        Tỷ lệ tái mua theo tháng
      </div>
      <div style={{ fontSize: 22, color: "#999", marginBottom: 24 }}>
        % khách quay lại mua đúng lịch
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 160 }}>
        {MONTHLY.map((m, i) => {
          const delay = startFrame + i * 6;
          const elapsed = Math.max(0, frame - delay);
          const t = Math.min(1, elapsed / 30);
          const eased = 1 - Math.pow(1 - t, 2);
          const height = m.pct * 1.4 * eased;
          const isLast = i === MONTHLY.length - 1;
          return (
            <div
              key={m.month}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
            >
              <div
                style={{
                  fontSize: 21,
                  fontWeight: 700,
                  color: isLast ? TEAL : "#999",
                  opacity: height > 10 ? 1 : 0,
                }}
              >
                {Math.round(m.pct * eased)}%
              </div>
              <div
                style={{
                  width: "100%",
                  height,
                  background: isLast
                    ? `linear-gradient(to top, ${TEAL_DARK}, ${TEAL})`
                    : "#e8f7f6",
                  borderRadius: "8px 8px 0 0",
                  transition: "none",
                }}
              />
              <div style={{ fontSize: 22, color: "#888", fontWeight: 600 }}>{m.month}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomerList({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: "26px 28px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: "#222", marginBottom: 4 }}>
        Cần nhắc hôm nay
      </div>
      <div style={{ fontSize: 22, color: "#999", marginBottom: 20 }}>
        {CUSTOMERS.length} khách sắp hết thuốc
      </div>
      {CUSTOMERS.map((c, i) => {
        const delay = startFrame + i * 8;
        const elapsed = Math.max(0, frame - delay);
        const t = Math.min(1, elapsed / 20);
        const opacity = t;
        const x = interpolate(t, [0, 1], [40, 0]);
        return (
          <div
            key={c.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 0",
              borderBottom: i < CUSTOMERS.length - 1 ? "1px solid #f0f0f0" : "none",
              opacity,
              transform: `translateX(${x}px)`,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: c.dot,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#222" }}>{c.name}</div>
              <div style={{ fontSize: 22, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.drug}
              </div>
            </div>
            <div style={{ fontSize: 22, color: c.dot, fontWeight: 700, flexShrink: 0 }}>
              {c.days} ngày
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const DASHBOARD_FRAMES = 360;

export const PharmacyDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneIntro = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const phoneScale = interpolate(phoneIntro, [0, 1], [0.92, 1]);
  const phoneOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const headerIn = spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 100 } });
  const headerOp = interpolate(headerIn, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: "transparent",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif",
      }}
    >
      {/* glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(14,158,142,0.18) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div
        style={{
          width: 980,
          height: 1840,
          background: "#0a0a0c",
          borderRadius: 78,
          padding: 16,
          boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
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
            background: "#f4f6f8",
          }}
        >
          {/* status bar */}
          <div
            style={{
              height: 54,
              background: TEAL,
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

          {/* dashboard header */}
          <div
            style={{
              background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
              padding: "28px 36px 24px",
              color: "#fff",
              flexShrink: 0,
              opacity: headerOp,
            }}
          >
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>
              Thứ Bảy, 31/05/2026
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, marginBottom: 6 }}>
              Báo cáo chăm sóc KH
            </div>
            <div style={{ fontSize: 23, color: "rgba(255,255,255,0.82)" }}>
              Nhà Thuốc Trúc Tâm · DS. Hải
            </div>
          </div>

          {/* scrollable content */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              padding: "28px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {/* stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {STATS.map((s, i) => (
                <StatCard key={s.label} stat={s} delayFrame={30 + i * 10} />
              ))}
            </div>

            {/* bar chart */}
            <BarChart startFrame={90} />

            {/* customer list */}
            <CustomerList startFrame={140} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
