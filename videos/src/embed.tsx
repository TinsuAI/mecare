import React from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { MeCareShowcase, showcaseTotalFrames, FPS } from "./MeCareShowcase";

function MeCarePlayer() {
  return (
    <Player
      component={MeCareShowcase}
      durationInFrames={showcaseTotalFrames}
      fps={FPS}
      compositionWidth={1080}
      compositionHeight={1920}
      inputProps={{ playAudio: false }}
      style={{ width: "100%", background: "transparent" }}
      autoPlay
      loop
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
    />
  );
}

const el = document.getElementById("mecare-player");
if (el) {
  createRoot(el).render(<MeCarePlayer />);
}
