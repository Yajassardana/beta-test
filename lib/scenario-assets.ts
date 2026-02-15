/**
 * Static asset manifest for scenarios.
 *
 * Next.js public/ files are not dynamically listable at runtime.
 * When you add or remove assets in public/scenarios/{id}/, update
 * this manifest to match.
 *
 * Convention:
 *   public/scenarios/{scenario-id}/
 *     profile.png   -- child photo for home page card
 *     intro.mp4     -- intro video before interaction
 *     *.png/jpg     -- additional images for within-scenario use
 */

export interface EmotionImage {
  range: [number, number];
  image: string;
}

export interface ScenarioAssetManifest {
  profile?: string;
  intro?: string;
  images?: string[];
  emotionImages?: EmotionImage[];
}

export const SCENARIO_ASSETS: Record<string, ScenarioAssetManifest> = {
  "toy-store": {},
  "im-stupid": {
    images: ["crying.png", "crying_less.png", "crying_stop.png", "happy.png"],
    emotionImages: [
      { range: [1, 3], image: "crying.png" },
      { range: [4, 6], image: "crying_less.png" },
      { range: [7, 8], image: "crying_stop.png" },
      { range: [9, 10], image: "happy.png" },
    ],
    profile: "profile.png",
    intro: "intro.mp4",
  },
  "i-hate-you": {},
  "the-lie": {},
};

function basePath(scenarioId: string): string {
  return `/scenarios/${scenarioId}`;
}

export function getProfileImagePath(scenarioId: string): string | null {
  const manifest = SCENARIO_ASSETS[scenarioId];
  if (!manifest?.profile) return null;
  return `${basePath(scenarioId)}/${manifest.profile}`;
}

export function getIntroVideoPath(scenarioId: string): string | null {
  const manifest = SCENARIO_ASSETS[scenarioId];
  if (!manifest?.intro) return null;
  return `${basePath(scenarioId)}/${manifest.intro}`;
}

export function resolveProfilePath(scenarioId: string, manifest: Record<string, ScenarioAssetManifest>): string | null {
  const m = manifest[scenarioId];
  if (!m?.profile) return null;
  return `${basePath(scenarioId)}/${m.profile}`;
}

export function resolveIntroPath(scenarioId: string, manifest: Record<string, ScenarioAssetManifest>): string | null {
  const m = manifest[scenarioId];
  if (!m?.intro) return null;
  return `${basePath(scenarioId)}/${m.intro}`;
}

export function resolveEmotionImage(
  scenarioId: string,
  emotionalState: number,
  manifest: ScenarioAssetManifest | undefined,
): string | null {
  if (!manifest?.emotionImages?.length) return null;
  const match = manifest.emotionImages.find(
    (ei) => emotionalState >= ei.range[0] && emotionalState <= ei.range[1],
  );
  return match ? `${basePath(scenarioId)}/${match.image}` : null;
}

export function getScenarioAssetInfo(scenarioId: string): {
  hasProfile: boolean;
  hasIntro: boolean;
  imageCount: number;
  allFiles: string[];
} {
  const manifest = SCENARIO_ASSETS[scenarioId];
  if (!manifest) {
    return { hasProfile: false, hasIntro: false, imageCount: 0, allFiles: [] };
  }

  const allFiles: string[] = [];
  if (manifest.profile) allFiles.push(manifest.profile);
  if (manifest.intro) allFiles.push(manifest.intro);
  if (manifest.images) allFiles.push(...manifest.images);

  return {
    hasProfile: !!manifest.profile,
    hasIntro: !!manifest.intro,
    imageCount: manifest.images?.length ?? 0,
    allFiles,
  };
}
