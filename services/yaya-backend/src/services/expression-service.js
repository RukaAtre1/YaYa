import { getConfig } from "./config.js";

const EXPRESSION_BUCKETS = {
  calm: "calm",
  steady_care: "steady-care",
  concerned_supportive: "concerned",
  encouraging_push: "encouraging",
  playful_light: "playful"
};

export async function resolveExpressionState(input) {
  const config = getConfig();
  const emotionTag = String(input?.emotionTag ?? "steady_care");
  const cachedState = EXPRESSION_BUCKETS[emotionTag] ?? "steady-care";

  return {
    emotionTag,
    cachedState,
    assetLayer: "static-avatar-cache",
    staticAvatarModel: config.imagenModel,
    dynamicUpdatesEnabled: false,
    optionalDynamicExpressionModel: config.geminiDynamicImageModel || null,
    source: "cached-expression-state"
  };
}
