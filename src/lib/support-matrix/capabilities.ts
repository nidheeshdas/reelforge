export const exportSupportMatrix = {
  video: true,
  textOverlays: true,
  shaderEffects: true,
  audioMixdown: false,
  imageComposition: false,
} as const;

export function getMonetizedSurfaceNotice() {
  return {
    title: 'Current export support',
    description:
      'Credit-backed exports currently focus on video clips, text overlays, and visual effects. Audio mixdown and image composition are still limited in the current export path, so paid surfaces should not promise them as guaranteed deliverables yet.',
  };
}

export function getTemplateMediaDisclaimer() {
  return 'Templates can still collect audio or image references for editor handoff, but the current export path does not guarantee full paid audio/image delivery yet.';
}
