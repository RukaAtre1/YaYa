import { buildImagenStaticAvatarProfile } from "./imagen-static-avatar-service.js";

export async function buildAvatarProfile() {
  const avatar = await buildImagenStaticAvatarProfile();

  return {
    ...avatar,
    dynamicExpressionUpdatesEnabled: false,
    cachedExpressionStates: ["calm", "concerned", "encouraging", "steady-care"]
  };
}
