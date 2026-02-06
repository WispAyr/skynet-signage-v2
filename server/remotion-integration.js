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
 * Branding presets - common configurations for office displays
 * Each preset includes sensible defaults that can be overridden
 */
const BRANDING_PRESETS = {
  // ============ WELCOME / INTRO ============
  'welcome-corporate': {
    compositionId: 'WelcomeMessage',
    props: { 
      brand: 'parkwise',
      style: 'corporate',
      showLogo: true,
      showTime: true,
    },
    category: 'welcome',
    tags: ['welcome', 'intro', 'office'],
    description: 'Professional welcome message with company branding',
  },
  'welcome-friendly': {
    compositionId: 'WelcomeFriendly',
    props: { 
      brand: 'parkwise',
      style: 'friendly',
      showLogo: true,
    },
    category: 'welcome',
    tags: ['welcome', 'intro', 'friendly'],
    description: 'Warm, friendly welcome with particle effects',
  },
  'welcome-premium': {
    compositionId: 'WelcomePremium',
    props: { 
      brand: 'parkwise',
      style: 'premium',
      showLogo: true,
    },
    category: 'welcome',
    tags: ['welcome', 'intro', 'premium'],
    description: 'Elegant premium welcome for executive displays',
  },
  'welcome-portrait': {
    compositionId: 'Portrait-WelcomeMessage',
    props: { 
      brand: 'parkwise',
      style: 'corporate',
    },
    category: 'welcome',
    tags: ['welcome', 'portrait', 'kiosk'],
    description: 'Portrait welcome for kiosks and totems',
  },

  // ============ ANNOUNCEMENTS / ALERTS ============
  'announcement-info': {
    compositionId: 'AlertBanner',
    props: { 
      level: 'info',
      message: 'Announcement',
      subtitle: '',
    },
    category: 'announcements',
    tags: ['announcement', 'alert', 'info'],
    description: 'Informational announcement banner',
  },
  'announcement-success': {
    compositionId: 'AlertBanner',
    props: { 
      level: 'success',
      message: 'Good News!',
    },
    category: 'announcements',
    tags: ['announcement', 'success'],
    description: 'Success/celebration announcement',
  },
  'announcement-warning': {
    compositionId: 'AlertBanner',
    props: { 
      level: 'warning',
      message: 'Important Notice',
    },
    category: 'announcements',
    tags: ['announcement', 'warning'],
    description: 'Warning/attention announcement',
  },
  'announcement-urgent': {
    compositionId: 'AlertBanner',
    props: { 
      level: 'critical',
      message: 'Urgent',
    },
    category: 'announcements',
    tags: ['announcement', 'urgent', 'critical'],
    description: 'Critical/urgent announcement with effects',
  },
  'announcement-portrait': {
    compositionId: 'Portrait-AlertBanner',
    props: { 
      level: 'info',
      message: 'Notice',
    },
    category: 'announcements',
    tags: ['announcement', 'portrait'],
    description: 'Portrait announcement for kiosks',
  },

  // ============ STATS / METRICS ============
  'stats-dashboard': {
    compositionId: 'StatsDisplay',
    props: {
      title: 'Live Statistics',
      stats: [
        { label: 'Occupancy', value: 75, icon: '🚗', color: '#00b398' },
        { label: 'Available', value: 25, icon: '✅', color: '#22c55e' },
        { label: 'Today', value: 156, icon: '📊', color: '#3b82f6' },
        { label: 'Revenue', value: '£847', icon: '💰', color: '#eab308' },
      ],
      showLogo: true,
      theme: 'dark',
    },
    category: 'stats',
    tags: ['stats', 'metrics', 'dashboard', 'data'],
    description: 'Four-stat dashboard display',
  },
  'stats-occupancy': {
    compositionId: 'StatsDisplay',
    props: {
      title: 'Car Park Status',
      stats: [
        { label: 'Total Spaces', value: 500, color: '#00b398' },
        { label: 'Available', value: 125, color: '#22c55e' },
      ],
      showLogo: true,
      theme: 'dark',
    },
    category: 'stats',
    tags: ['stats', 'occupancy', 'parking'],
    description: 'Simple occupancy display',
  },
  'stats-revenue': {
    compositionId: 'StatsDisplay',
    props: {
      title: 'Revenue Overview',
      stats: [
        { label: 'Today', value: '£1,250', icon: '📈', color: '#22c55e' },
        { label: 'This Week', value: '£8,420', icon: '📊', color: '#3b82f6' },
        { label: 'This Month', value: '£34,500', icon: '💰', color: '#eab308' },
      ],
      showLogo: true,
    },
    category: 'stats',
    tags: ['stats', 'revenue', 'finance'],
    description: 'Revenue metrics display',
  },
  'stats-portrait': {
    compositionId: 'Portrait-StatsDisplay',
    props: {
      title: 'Status',
      stats: [
        { label: 'Spaces', value: 100, color: '#00b398' },
        { label: 'Free', value: 42, color: '#22c55e' },
      ],
      showLogo: true,
    },
    category: 'stats',
    tags: ['stats', 'portrait', 'kiosk'],
    description: 'Portrait stats for kiosks',
  },

  // ============ EVENT COUNTDOWN ============
  'countdown-event': {
    compositionId: 'EventCountdown',
    props: {
      brand: 'parkwise',
      eventName: 'Annual Conference',
      targetDate: '2025-06-15',
      showLogo: true,
    },
    category: 'countdown',
    tags: ['countdown', 'event', 'timer'],
    description: 'Countdown to a specific event',
  },
  'countdown-launch': {
    compositionId: 'EventCountdown',
    props: {
      brand: 'parkwise',
      eventName: 'Product Launch',
      subtitle: 'Something big is coming',
      showLogo: true,
    },
    category: 'countdown',
    tags: ['countdown', 'launch', 'product'],
    description: 'Product launch countdown',
  },
  'countdown-deadline': {
    compositionId: 'EventCountdown',
    props: {
      brand: 'parkwise',
      eventName: 'Deadline',
      subtitle: 'Time remaining',
      showLogo: false,
    },
    category: 'countdown',
    tags: ['countdown', 'deadline'],
    description: 'Deadline countdown display',
  },
  'countdown-portrait': {
    compositionId: 'Portrait-EventCountdown',
    props: {
      brand: 'parkwise',
      eventName: 'Event',
    },
    category: 'countdown',
    tags: ['countdown', 'portrait'],
    description: 'Portrait countdown for kiosks',
  },

  // ============ TEAM SPOTLIGHT ============
  'spotlight-employee': {
    compositionId: 'TeamSpotlight',
    props: {
      brand: 'parkwise',
      name: 'Employee Name',
      role: 'Position',
      department: 'Department',
      achievement: 'Recognition for outstanding work',
      showLogo: true,
      style: 'modern',
    },
    category: 'spotlight',
    tags: ['team', 'employee', 'recognition'],
    description: 'Employee recognition spotlight',
  },
  'spotlight-celebration': {
    compositionId: 'TeamSpotlightCelebration',
    props: {
      brand: 'parkwise',
      name: 'Celebrating',
      role: 'Achievement',
      showLogo: true,
      style: 'celebration',
    },
    category: 'spotlight',
    tags: ['team', 'celebration', 'achievement'],
    description: 'Celebration spotlight with confetti',
  },
  'spotlight-minimal': {
    compositionId: 'TeamSpotlightMinimal',
    props: {
      brand: 'parkwise',
      name: 'Name',
      role: 'Role',
      showLogo: true,
      style: 'minimal',
    },
    category: 'spotlight',
    tags: ['team', 'minimal'],
    description: 'Clean minimal team member display',
  },
  'spotlight-portrait': {
    compositionId: 'Portrait-TeamSpotlight',
    props: {
      brand: 'parkwise',
      name: 'Name',
      role: 'Role',
    },
    category: 'spotlight',
    tags: ['team', 'portrait'],
    description: 'Portrait team spotlight',
  },

  // ============ QUOTE OF THE DAY ============
  'quote-elegant': {
    compositionId: 'QuoteDisplay',
    props: {
      brand: 'parkwise',
      quote: 'Innovation distinguishes between a leader and a follower.',
      author: 'Steve Jobs',
      showLogo: true,
      style: 'elegant',
    },
    category: 'quotes',
    tags: ['quote', 'motivational', 'elegant'],
    description: 'Elegant inspirational quote',
  },
  'quote-bold': {
    compositionId: 'QuoteBold',
    props: {
      brand: 'parkwise',
      quote: 'The future belongs to those who believe in the beauty of their dreams.',
      author: 'Eleanor Roosevelt',
      showLogo: true,
      style: 'bold',
    },
    category: 'quotes',
    tags: ['quote', 'bold', 'impactful'],
    description: 'Bold impactful quote display',
  },
  'quote-minimal': {
    compositionId: 'QuoteMinimal',
    props: {
      brand: 'parkwise',
      quote: 'Simplicity is the ultimate sophistication.',
      author: 'Leonardo da Vinci',
      showLogo: true,
      style: 'minimal',
    },
    category: 'quotes',
    tags: ['quote', 'minimal', 'clean'],
    description: 'Clean minimal quote',
  },
  'quote-tech': {
    compositionId: 'QuoteTech',
    props: {
      brand: 'parkwise',
      quote: 'Any sufficiently advanced technology is indistinguishable from magic.',
      author: 'Arthur C. Clarke',
      showLogo: true,
      style: 'tech',
    },
    category: 'quotes',
    tags: ['quote', 'tech', 'modern'],
    description: 'Tech-styled quote with grid background',
  },
  'quote-portrait': {
    compositionId: 'Portrait-QuoteDisplay',
    props: {
      brand: 'parkwise',
      quote: 'Great things are done by a series of small things brought together.',
      author: 'Vincent van Gogh',
    },
    category: 'quotes',
    tags: ['quote', 'portrait'],
    description: 'Portrait quote for kiosks',
  },

  // ============ BRANDED INTROS ============
  'intro-logo-reveal': {
    compositionId: 'BrandedLogoReveal',
    props: { 
      brand: 'parkwise',
      template: 'logo-reveal',
      logoVariant: 'color',
    },
    category: 'branding',
    tags: ['intro', 'logo', 'cinematic'],
    description: 'Cinematic logo reveal with lens flare',
  },
  'intro-logo-bounce': {
    compositionId: 'BrandedLogoBounce',
    props: { 
      brand: 'parkwise',
      template: 'logo-bounce',
    },
    category: 'branding',
    tags: ['intro', 'logo', 'playful'],
    description: 'Playful bouncing logo animation',
  },
  'intro-logo-glitch': {
    compositionId: 'BrandedLogoGlitch',
    props: { 
      brand: 'parkwise',
      template: 'logo-glitch',
    },
    category: 'branding',
    tags: ['intro', 'logo', 'tech', 'glitch'],
    description: 'Tech glitch logo effect',
  },
  'intro-default': {
    compositionId: 'ParkwiseIntro',
    props: { variant: 'color' },
    category: 'branding',
    tags: ['intro', 'parkwise'],
    description: 'Default Parkwise intro',
  },
  'intro-short': {
    compositionId: 'ParkwiseIntroShort',
    props: { variant: 'color' },
    category: 'branding',
    tags: ['intro', 'short'],
    description: 'Short 2-second intro',
  },
  'intro-portrait': {
    compositionId: 'Portrait-ParkwiseIntro',
    props: { variant: 'color' },
    category: 'branding',
    tags: ['intro', 'portrait', 'kiosk'],
    description: 'Portrait intro for kiosks',
  },

  // ============ AMBIENT / BACKGROUND ============
  'ambient-cubes': {
    compositionId: 'FloatingCubes',
    props: { brand: 'parkwise', cubeCount: 8 },
    category: 'ambient',
    tags: ['ambient', '3d', 'background'],
    description: 'Floating 3D cubes ambient',
  },
  'ambient-tunnel': {
    compositionId: 'TunnelFlight',
    props: { brand: 'parkwise', speed: 0.5 },
    category: 'ambient',
    tags: ['ambient', '3d', 'dynamic'],
    description: 'Tunnel flight through animation',
  },
  'ambient-logo-spin': {
    compositionId: 'Logo3DSpin',
    props: { brand: 'parkwise' },
    category: 'ambient',
    tags: ['ambient', '3d', 'logo'],
    description: '3D spinning logo ambient',
  },
  'ambient-particles': {
    compositionId: 'BrandedLogoParticles',
    props: { brand: 'parkwise' },
    category: 'ambient',
    tags: ['ambient', 'particles', 'logo'],
    description: 'Particle effect with logo',
  },

  // ============ LOWER THIRDS ============
  'lower-third-tech': {
    compositionId: 'LowerThirdTech',
    props: {
      title: 'Speaker Name',
      subtitle: 'Title / Company',
      style: 'tech',
      showLogo: true,
    },
    category: 'lower-thirds',
    tags: ['lower-third', 'name', 'speaker'],
    description: 'Tech-styled name lower third',
  },
  'lower-third-corporate': {
    compositionId: 'LowerThirdCorporate',
    props: {
      title: 'Name',
      subtitle: 'Position',
      style: 'corporate',
      showLogo: true,
    },
    category: 'lower-thirds',
    tags: ['lower-third', 'corporate'],
    description: 'Corporate name lower third',
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
