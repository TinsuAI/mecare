import React from "react";
import { Composition } from "remotion";
import { ZaloChat, FPS, totalFrames } from "./ZaloChat";
import { MeCareShowcase, showcaseTotalFrames } from "./MeCareShowcase";
import { PharmacyDashboard, DASHBOARD_FRAMES } from "./PharmacyDashboard";
import { scenarios } from "./scenarios";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {scenarios.map((s) => (
        <Composition
          key={s.id}
          id={s.id}
          component={ZaloChat as React.FC<Record<string, unknown>>}
          durationInFrames={totalFrames(s.messages)}
          fps={FPS}
          width={1080}
          height={1920}
          defaultProps={{ scenario: s } as Record<string, unknown>}
        />
      ))}

      <Composition
        id="pharmacy-dashboard"
        component={PharmacyDashboard}
        durationInFrames={DASHBOARD_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />

      <Composition
        id="mecare-showcase"
        component={MeCareShowcase}
        durationInFrames={showcaseTotalFrames}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
