/**
 * Remotion Integration for Skynet Signage
 * Enables on-demand video rendering and auto-push to displays
 */

const REMOTION_URL = process.env.REMOTION_URL || 'http://localhost:3500';

// Job tracking with auto-push configuration
const renderQueue = new Map();

/**
 * Submit a render job to Remotion and optionally auto-push when complete
 */
async function submitRender(options) {
  const {
    compositionId,
    props = {},
    category = 'signage',
    tags = [],
    filename,
    pushOnComplete = true,
    pushTarget = 'all',
    pushDuration = null, // null = video duration
  } = options;

  // Submit to Remotion
  const response = await fetch(`${REMOTION_URL}/api/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ compositionId, props, category, tags, filename }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Remotion render failed: ${error}`);
  }

  const { jobId } = await response.json();

  // Track job with push config
  renderQueue.set(jobId, {
    jobId,
    compositionId,
    props,
    category,
    status: 'queued',
    pushOnComplete,
    pushTarget,
    pushDuration,
    createdAt: new Date().toISOString(),
    completedAt: null,
    videoId: null,
    error: null,
  });

  return { jobId, status: 'queued' };
}

/**
 * Check job status and trigger push if complete
 */
async function checkJob(jobId, pushCallback) {
  const tracked = renderQueue.get(jobId);
  if (!tracked) return null;

  const response = await fetch(`${REMOTION_URL}/api/render/${jobId}`);
  if (!response.ok) return tracked;

  const job = await response.json();
  tracked.status = job.status;
  tracked.progress = job.progress;

  if (job.status === 'completed' && tracked.pushOnComplete && !tracked.completedAt) {
    tracked.completedAt = new Date().toISOString();
    tracked.videoId = job.id;

    // Trigger push to screens
    if (pushCallback) {
      const videoUrl = `${REMOTION_URL}/api/videos/${jobId}/stream`;
      await pushCallback({
        target: tracked.pushTarget,
        type: 'media',
        content: {
          url: videoUrl,
          type: 'video',
          compositionId: tracked.compositionId,
          loop: false,
        },
        duration: tracked.pushDuration,
      });
      console.log(`🎬 Auto-pushed video ${jobId} to ${tracked.pushTarget}`);
    }
  } else if (job.status === 'failed') {
    tracked.error = job.error;
    tracked.completedAt = new Date().toISOString();
  }

  return tracked;
}

/**
 * Get all compositions from Remotion
 */
async function getCompositions() {
  const response = await fetch(`${REMOTION_URL}/api/compositions`);
  if (!response.ok) throw new Error('Failed to fetch compositions');
  return response.json();
}

/**
 * Get dimension presets from Remotion
 */
async function getPresets() {
  const response = await fetch(`${REMOTION_URL}/api/presets`);
  if (!response.ok) throw new Error('Failed to fetch presets');
  return response.json();
}

/**
 * Get available videos from Remotion
 */
async function getVideos(category = null) {
  const url = category 
    ? `${REMOTION_URL}/api/videos?category=${category}`
    : `${REMOTION_URL}/api/videos`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch videos');
  return response.json();
}

/**
 * Get all tracked render jobs
 */
function getJobs() {
  return Array.from(renderQueue.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Get video stream URL
 */
function getVideoStreamUrl(videoId) {
  return `${REMOTION_URL}/api/videos/${videoId}/stream`;
}

/**
 * Get preview image URL
 */
function getPreviewUrl(compositionId, props = {}) {
  const propsParam = encodeURIComponent(JSON.stringify(props));
  return `${REMOTION_URL}/api/preview/${compositionId}?props=${propsParam}`;
}

/**
 * Branding presets - common configurations
 */
const BRANDING_PRESETS = {
  // Intros
  'intro-default': {
    compositionId: 'ParkwiseIntro',
    props: { variant: 'color' },
    category: 'branding',
    tags: ['intro', 'parkwise'],
  },
  'intro-short': {
    compositionId: 'ParkwiseIntroShort',
    props: { variant: 'color' },
    category: 'branding',
    tags: ['intro', 'short'],
  },
  'intro-portrait': {
    compositionId: 'Portrait-ParkwiseIntro',
    props: { variant: 'color' },
    category: 'branding',
    tags: ['intro', 'portrait', 'kiosk'],
  },
  
  // Alerts
  'alert-landscape': {
    compositionId: 'AlertBanner',
    category: 'alerts',
    tags: ['alert'],
  },
  'alert-portrait': {
    compositionId: 'Portrait-AlertBanner',
    category: 'alerts',
    tags: ['alert', 'portrait'],
  },
  
  // Stats
  'stats-landscape': {
    compositionId: 'StatsDisplay',
    category: 'signage',
    tags: ['stats', 'data'],
  },
  'stats-portrait': {
    compositionId: 'Portrait-StatsDisplay',
    category: 'signage',
    tags: ['stats', 'portrait'],
  },
  
  // Ambient/Background
  'ambient-cubes': {
    compositionId: 'FloatingCubes',
    category: 'signage',
    tags: ['ambient', '3d'],
  },
  'ambient-tunnel': {
    compositionId: 'TunnelFlight',
    category: 'signage',
    tags: ['ambient', '3d'],
  },
  'ambient-logo-spin': {
    compositionId: 'Logo3DSpin',
    category: 'branding',
    tags: ['ambient', '3d', 'logo'],
  },
};

/**
 * Render using a branding preset
 */
async function renderPreset(presetId, overrides = {}) {
  const preset = BRANDING_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}. Available: ${Object.keys(BRANDING_PRESETS).join(', ')}`);
  }

  return submitRender({
    ...preset,
    props: { ...preset.props, ...overrides.props },
    ...overrides,
  });
}

export {
  submitRender,
  checkJob,
  getCompositions,
  getPresets,
  getVideos,
  getJobs,
  getVideoStreamUrl,
  getPreviewUrl,
  renderPreset,
  renderQueue,
  BRANDING_PRESETS,
  REMOTION_URL,
};
