import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { ZaloChat, FPS, totalFrames } from "./ZaloChat";
import { scenarios } from "./scenarios";
import { IntroSlide, IntroData, INTRO_FRAMES } from "./IntroSlide";
import { PharmacyDashboard, DASHBOARD_FRAMES } from "./PharmacyDashboard";

export { FPS };

const GAP = 24;

const introData: IntroData[] = [
  {
    num: "01",
    title: "Chào Khách Sau\nMua Tại Quầy",
    pain: "Khách mua xong đi, không có cách nào giữ liên lạc",
    accentColor: "#0E9E8E",
  },
  {
    num: "02",
    title: "Nhắc Uống Thuốc\nVà Hỏi Thăm Lại",
    pain: "Mua thuốc về nhà uống không đúng cách, không ai nhắc nhở theo dõi",
    accentColor: "#00897b",
  },
  {
    num: "03",
    title: "Khách Hỏi Thuốc\n11 Giờ Đêm",
    pain: "Sáng ra trả lời, khách đã mua chỗ khác rồi",
    accentColor: "#1565c0",
  },
  {
    num: "04",
    title: "Hỏi Thăm Sức Khoẻ\nVà Upsell Tự Nhiên",
    pain: "Hỏi thăm sức khoẻ mà bỏ lỡ cơ hội bán thêm ngay lúc đó",
    accentColor: "#8e44ad",
  },
  {
    num: "05",
    title: "Nhắc Tái Mua\nTự Động",
    pain: "Hết thuốc mà quên nhắc, khách mua chỗ khác",
    accentColor: "#e65100",
  },
  {
    num: "06",
    title: "Chiến Dịch\nQuảng Cáo Sản Phẩm",
    pain: "Bán sản phẩm bổ trợ mà không biết ai đang cần, tiếp cận sai người",
    accentColor: "#2e7d32",
  },
  {
    num: "07",
    title: "Chủ Hiệu Thuốc\nXem Dashboard",
    pain: "Không có số liệu để biết khách nào cần chăm sóc",
    accentColor: "#F59E0B",
  },
];

const chatDurations = [
  totalFrames(scenarios[0].messages),        // UC-01
  totalFrames(scenarios[1].messages),        // UC-02
  totalFrames(scenarios[2].messages),        // UC-03
  totalFrames(scenarios[3].messages) + 120,  // UC-04 +4s hold sau tin nhắn cuối
  totalFrames(scenarios[4].messages),        // UC-05
  totalFrames(scenarios[5].messages),        // UC-06
  DASHBOARD_FRAMES,                          // UC-07 dashboard
];

const N = introData.length;

const segOffsets: number[] = [];
{
  let t = 0;
  for (let i = 0; i < N; i++) {
    segOffsets.push(t);
    t += INTRO_FRAMES + chatDurations[i] + (i < N - 1 ? GAP : 0);
  }
}

export const showcaseTotalFrames = segOffsets[N - 1] + INTRO_FRAMES + chatDurations[N - 1];

export const MeCareShowcase: React.FC<{ playAudio?: boolean }> = ({ playAudio = true }) => {
  return (
    <AbsoluteFill style={{ background: "transparent" }}>
      {playAudio && <Audio src={staticFile("bg-music.mp3")} volume={0.18} loop />}
      {Array.from({ length: N }, (_, i) => {
        const introStart = segOffsets[i];
        const chatStart = introStart + INTRO_FRAMES;
        const chatDur = chatDurations[i];

        return (
          <React.Fragment key={i}>
            <Sequence from={introStart} durationInFrames={INTRO_FRAMES}>
              <IntroSlide data={introData[i]} />
            </Sequence>
            <Sequence from={chatStart} durationInFrames={chatDur}>
              {i === N - 1 ? (
                <PharmacyDashboard />
              ) : (
                <ZaloChat scenario={scenarios[i] as never} />
              )}
            </Sequence>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
