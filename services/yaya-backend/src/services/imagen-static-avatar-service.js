import { sampleAvatar } from "../sample-data.js";
import { getConfig } from "./config.js";

export async function buildImagenStaticAvatarProfile() {
  const config = getConfig();

  return {
    ...sampleAvatar,
    visualPrompt: `${sampleAvatar.visualPrompt} Render final static assets with ${config.imagenModel}.`,
    assetLayer: "static-avatar",
    model: config.imagenModel,
    dynamicExpressionModel: config.geminiDynamicImageModel || null
  };
}
