import { getConfig } from "./config.js";

const MOOD_BUCKETS = {
  calm: "calm-loop",
  steady_care: "warm-loop",
  concerned_supportive: "concern-loop",
  encouraging_push: "encourage-loop",
  playful_light: "light-loop"
};

export async function resolveLyriaAmbienceLoop(input) {
  const config = getConfig();
  const emotionTag = String(input?.emotionTag ?? "steady_care");

  return {
    emotionTag,
    moodBucket: MOOD_BUCKETS[emotionTag] ?? "warm-loop",
    switchPerTurn: false,
    layer: "ambience",
    model: config.lyriaModel,
    source: "lyria-emotion-bucket"
  };
}
