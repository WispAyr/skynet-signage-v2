/**
 * Skynet Context Engine
 * 
 * Ingests environmental signals (weather, time, audio, occupancy, security),
 * normalizes them, computes a "mood vector", smoothly transitions between states,
 * and broadcasts to all connected signage screens.
 * 
 * The mood vector is a set of continuous 0-1 parameters that templates can
 * react to for ambient, context-aware displays.
 */

import WebSocket from 'ws';

// ============================================================
// Constants & Defaults
// ============================================================

const DEFAULT_MOOD = {
  energy: 0.5,
  warmth: 0.5,
  urgency: 0.0,
  density: 0.3,
  tempo: 0.5,
  brightness: 0.5,
  formality: 0.5,
};

// Lerp speeds per mood parameter
const LERP_SPEEDS = {
  energy: 0.1,
  warmth: 0.03,
  urgency: 0.3,
  density: 0.05,
  tempo: 0.08,
  brightness: 0.03,
  formality: 0.05,
};

const MOOD_UPDATE_INTERVAL = 500;    // ms — lerp tick
const BROADCAST_INTERVAL = 2000;     // ms — push to clients
const DEFAULT_LOCATION = 'default';

// ============================================================
// Utility Functions
// ============================================================

function lerp(current, target, speed = 0.05) {
  return current + (target - current) * speed;
}

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function safeJson(resp) {
  try { return resp.json(); } catch { return null; }
}

// ============================================================
// Signal Collectors
// ============================================================

class WeatherCollector {
  constructor() {
    this.data = null;
    this.interval = null;
    this.POLL_MS = 10 * 60 * 1000; // 10 minutes
  }

  start() {
    this._poll();
    this.interval = setInterval(() => this._poll(), this.POLL_MS);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async _poll() {
    try {
      const resp = await fetch('https://wttr.in/Ayr?format=j1');
      if (!resp.ok) throw new Error(`Weather HTTP ${resp.status}`);
      const json = await resp.json();
      const current = json?.current_condition?.[0];
      if (current) {
        this.data = {
          tempC: parseFloat(current.temp_C) || 10,
          feelsLikeC: parseFloat(current.FeelsLikeC) || 10,
          humidity: parseFloat(current.humidity) || 50,
          weatherCode: parseInt(current.weatherCode) || 0,
          weatherDesc: (current.weatherDesc?.[0]?.value || '').toLowerCase(),
          windSpeedKmph: parseFloat(current.windspeedKmph) || 0,
          cloudCover: parseFloat(current.cloudcover) || 50,
          visibility: parseFloat(current.visibility) || 10,
          uvIndex: parseFloat(current.uvIndex) || 0,
        };
        console.debug('[ContextEngine] Weather updated:', this.data.weatherDesc, `${this.data.tempC}°C`);
      }
    } catch (err) {
      console.debug('[ContextEngine] Weather fetch failed:', err.message);
    }
  }

  getSignals() {
    if (!this.data) return {};
    const d = this.data;
    const desc = d.weatherDesc;

    // Classify weather conditions
    const isSunny = desc.includes('sunny') || desc.includes('clear') || d.weatherCode === 113;
    const isRain = desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower');
    const isStorm = desc.includes('thunder') || desc.includes('storm');
    const isSnow = desc.includes('snow') || desc.includes('sleet') || desc.includes('blizzard');
    const isCloudy = desc.includes('cloud') || desc.includes('overcast');
    const isFog = desc.includes('fog') || desc.includes('mist');

    return {
      weather_temp: d.tempC,
      weather_isSunny: isSunny,
      weather_isRain: isRain,
      weather_isStorm: isStorm,
      weather_isSnow: isSnow,
      weather_isCloudy: isCloudy,
      weather_isFog: isFog,
      weather_windSpeed: d.windSpeedKmph,
      weather_cloudCover: d.cloudCover,
      weather_humidity: d.humidity,
    };
  }
}

class TimeCollector {
  constructor() {
    this.data = null;
    this.interval = null;
    this.POLL_MS = 60 * 1000; // 1 minute
  }

  start() {
    this._update();
    this.interval = setInterval(() => this._update(), this.POLL_MS);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  _update() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const fractionalHour = hour + minute / 60;
    const month = now.getMonth(); // 0-11
    const dayOfWeek = now.getDay(); // 0=Sun

    // Determine period
    let period = 'night';
    if (fractionalHour >= 5 && fractionalHour < 7) period = 'dawn';
    else if (fractionalHour >= 7 && fractionalHour < 10) period = 'morning';
    else if (fractionalHour >= 10 && fractionalHour < 14) period = 'midday';
    else if (fractionalHour >= 14 && fractionalHour < 17) period = 'afternoon';
    else if (fractionalHour >= 17 && fractionalHour < 19) period = 'golden_hour';
    else if (fractionalHour >= 19 && fractionalHour < 22) period = 'evening';

    // Season (Northern hemisphere, UK)
    let season = 'winter';
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    this.data = {
      hour: fractionalHour,
      period,
      season,
      isWeekend,
      dayOfWeek,
    };
  }

  getSignals() {
    if (!this.data) return {};
    return {
      time_hour: this.data.hour,
      time_period: this.data.period,
      time_season: this.data.season,
      time_isWeekend: this.data.isWeekend,
    };
  }
}

class AudioCollector {
  constructor() {
    this.data = { level: 0, spikeFreq: 0, sustained: false };
    this.ws = null;
    this.reconnectTimer = null;
    this.recentLevels = [];
    this.MAX_LEVELS = 60; // ~60 seconds of data
  }

  start() {
    this._connect();
  }

  stop() {
    if (this.ws) { try { this.ws.close(); } catch {} }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }

  _connect() {
    try {
      this.ws = new WebSocket('ws://localhost:3890/ws');

      this.ws.on('open', () => {
        console.debug('[ContextEngine] Connected to SentryFlow audio WebSocket');
      });

      this.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          // SentryFlow broadcasts audio_level events
          if (msg.type === 'audio_level' || msg.audio_level !== undefined) {
            const level = msg.audio_level ?? msg.level ?? msg.db ?? 0;
            this.recentLevels.push(level);
            if (this.recentLevels.length > this.MAX_LEVELS) {
              this.recentLevels.shift();
            }
            this._computeMetrics();
          }
        } catch {}
      });

      this.ws.on('close', () => {
        this._scheduleReconnect();
      });

      this.ws.on('error', () => {
        this._scheduleReconnect();
      });
    } catch {
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this._connect(), 30000);
  }

  _computeMetrics() {
    const levels = this.recentLevels;
    if (levels.length === 0) return;

    const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
    const max = Math.max(...levels);

    // Spike detection: values > 2x average
    const threshold = avg * 2;
    const spikes = levels.filter(l => l > threshold).length;
    const spikeFreq = spikes / levels.length;

    // Sustained loud: avg over 0.6 (normalized)
    const normalizedAvg = clamp(avg / 100, 0, 1); // assume dB-ish scale 0-100
    const sustained = normalizedAvg > 0.6;

    this.data = {
      level: normalizedAvg,
      spikeFreq: clamp(spikeFreq, 0, 1),
      sustained,
    };
  }

  getSignals() {
    return {
      audio_level: this.data.level,
      audio_spikeFreq: this.data.spikeFreq,
      audio_sustained: this.data.sustained,
    };
  }
}

class OccupancyCollector {
  constructor() {
    this.data = new Map(); // locationId → occupancy fraction (0-1)
    this.interval = null;
    this.POLL_MS = 60 * 1000; // 1 minute
  }

  start() {
    this._poll();
    this.interval = setInterval(() => this._poll(), this.POLL_MS);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async _poll() {
    try {
      const resp = await fetch('http://localhost:3000/api/sites');
      if (!resp.ok) throw new Error(`Occupancy HTTP ${resp.status}`);
      const json = await resp.json();
      const sites = Array.isArray(json) ? json : (json.data || json.sites || []);

      for (const site of sites) {
        const id = site.id || site.siteId || site.code;
        const capacity = site.capacity || site.totalSpaces || 100;
        const occupied = site.occupied ?? site.currentOccupancy ?? site.count ?? 0;
        const fraction = clamp(occupied / Math.max(capacity, 1), 0, 1);
        this.data.set(id, fraction);
      }
      console.debug(`[ContextEngine] Occupancy updated: ${this.data.size} sites`);
    } catch (err) {
      console.debug('[ContextEngine] Occupancy fetch failed:', err.message);
    }
  }

  getSignals(locationId) {
    // Try to find matching occupancy for this location
    // Fall back to average of all sites
    if (this.data.has(locationId)) {
      return { occupancy_fraction: this.data.get(locationId) };
    }
    if (this.data.size > 0) {
      const avg = [...this.data.values()].reduce((a, b) => a + b, 0) / this.data.size;
      return { occupancy_fraction: avg };
    }
    return { occupancy_fraction: 0.4 }; // default mid
  }
}

class SecurityCollector {
  constructor() {
    this.alertLevel = 0; // 0=normal, 1, 2, 3
    this.interval = null;
    this.POLL_MS = 30 * 1000; // 30 seconds
  }

  start() {
    this._poll();
    this.interval = setInterval(() => this._poll(), this.POLL_MS);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async _poll() {
    try {
      const resp = await fetch('http://localhost:3890/api/status');
      if (!resp.ok) throw new Error(`Security HTTP ${resp.status}`);
      const json = await resp.json();
      this.alertLevel = json.alertLevel ?? json.level ?? json.securityLevel ?? 0;
      if (typeof this.alertLevel !== 'number') this.alertLevel = 0;
      this.alertLevel = clamp(Math.round(this.alertLevel), 0, 3);
    } catch (err) {
      console.debug('[ContextEngine] Security fetch failed:', err.message);
      // Don't reset — keep last known level
    }
  }

  getSignals() {
    return { security_level: this.alertLevel };
  }
}

class HailoCollector {
  constructor() {
    this.peopleCount = 0;
    this.ws = null;
    this.reconnectTimer = null;
  }

  start() {
    this._connect();
  }

  stop() {
    if (this.ws) { try { this.ws.close(); } catch {} }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }

  _connect() {
    try {
      // Reuse SentryFlow WebSocket for Hailo people-count events
      this.ws = new WebSocket('ws://localhost:3890/ws');

      this.ws.on('open', () => {
        console.debug('[ContextEngine] Connected to SentryFlow for Hailo events');
      });

      this.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'people_count' || msg.type === 'hailo_detection') {
            this.peopleCount = msg.count ?? msg.people ?? msg.detections ?? this.peopleCount;
          }
        } catch {}
      });

      this.ws.on('close', () => {
        this._scheduleReconnect();
      });

      this.ws.on('error', () => {
        this._scheduleReconnect();
      });
    } catch {
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this._connect(), 30000);
  }

  getSignals() {
    return { hailo_peopleCount: this.peopleCount };
  }
}

class CalendarCollector {
  constructor() {
    this.events = [];
  }

  start() {
    // Placeholder — future calendar integration
  }

  stop() {}

  getSignals() {
    return {
      calendar_hasEvent: this.events.length > 0,
      calendar_eventCount: this.events.length,
    };
  }
}

// ============================================================
// Context Processor — maps raw signals to mood targets
// ============================================================

class ContextProcessor {
  /**
   * Compute a target mood vector from raw signals.
   * Returns a MoodVector with values in [0, 1].
   */
  computeTargetMood(signals) {
    // Start from neutral
    const mood = { ...DEFAULT_MOOD };

    // ---- TIME ----
    this._applyTime(mood, signals);

    // ---- WEATHER ----
    this._applyWeather(mood, signals);

    // ---- AUDIO ----
    this._applyAudio(mood, signals);

    // ---- OCCUPANCY ----
    this._applyOccupancy(mood, signals);

    // ---- HAILO (people density) ----
    this._applyHailo(mood, signals);

    // ---- SECURITY (priority override) ----
    this._applySecurity(mood, signals);

    // Clamp all values
    for (const k of Object.keys(mood)) {
      mood[k] = clamp(mood[k]);
    }

    return mood;
  }

  _applyTime(mood, s) {
    const period = s.time_period;
    if (!period) return;

    switch (period) {
      case 'dawn':
        mood.warmth += 0.15;
        mood.brightness = 0.3;
        mood.tempo = 0.2;
        mood.energy = 0.25;
        mood.formality = 0.3;
        break;
      case 'morning':
        mood.brightness = 0.75;
        mood.energy = 0.7;
        mood.formality = 0.7;
        mood.warmth = 0.4;
        mood.tempo = 0.5;
        break;
      case 'midday':
        mood.brightness = 0.9;
        mood.energy = 0.8;
        mood.formality = 0.6;
        mood.warmth = 0.5;
        mood.tempo = 0.6;
        break;
      case 'afternoon':
        mood.brightness = 0.7;
        mood.energy = 0.55;
        mood.formality = 0.55;
        mood.warmth = 0.5;
        mood.tempo = 0.45;
        break;
      case 'golden_hour':
        mood.warmth = 0.9;
        mood.brightness = 0.7;
        mood.energy = 0.45;
        mood.formality = 0.4;
        mood.tempo = 0.35;
        break;
      case 'evening':
        mood.brightness = 0.35;
        mood.warmth = 0.7;
        mood.energy = 0.35;
        mood.formality = 0.3;
        mood.tempo = 0.3;
        break;
      case 'night':
        mood.brightness = 0.15;
        mood.energy = 0.15;
        mood.tempo = 0.15;
        mood.warmth = 0.4;
        mood.formality = 0.2;
        break;
    }

    // Weekend: slightly more relaxed
    if (s.time_isWeekend) {
      mood.formality -= 0.15;
      mood.energy -= 0.05;
    }
  }

  _applyWeather(mood, s) {
    if (s.weather_isSunny) {
      mood.brightness += 0.15;
      mood.warmth += 0.1;
      mood.energy += 0.1;
    }
    if (s.weather_isRain) {
      mood.warmth += 0.1; // cosy
      mood.brightness -= 0.15;
      mood.tempo -= 0.1;
    }
    if (s.weather_isStorm) {
      mood.energy += 0.2;
      mood.urgency += 0.15;
      mood.tempo += 0.15;
    }
    if (s.weather_isSnow) {
      mood.brightness += 0.1;
      mood.tempo -= 0.15;
      mood.density += 0.2; // particle effects
    }
    if (s.weather_isFog) {
      mood.brightness -= 0.1;
      mood.tempo -= 0.1;
      mood.density -= 0.1;
    }

    // Temperature effects
    const temp = s.weather_temp;
    if (temp !== undefined) {
      if (temp > 25) {
        mood.warmth = Math.max(mood.warmth, 0.9);
        mood.energy -= 0.15; // lazy heat
      } else if (temp < 5) {
        mood.warmth += 0.15; // compensate with warm colours
        mood.density -= 0.1;
      }
    }
  }

  _applyAudio(mood, s) {
    const level = s.audio_level || 0;
    const spikes = s.audio_spikeFreq || 0;

    // Volume → energy
    mood.energy += level * 0.3;

    // Spike frequency → tempo
    mood.tempo += spikes * 0.3;

    // Sustained loud → density
    if (s.audio_sustained) {
      mood.density += 0.15;
    }
  }

  _applyOccupancy(mood, s) {
    const occ = s.occupancy_fraction;
    if (occ === undefined) return;

    if (occ < 0.2) {
      // Empty
      mood.density -= 0.15;
    } else if (occ > 0.7 && occ <= 0.9) {
      // Busy
      mood.density += 0.15;
      mood.formality += 0.1;
    } else if (occ > 0.9) {
      // Full
      mood.urgency += 0.2;
      mood.density += 0.2;
    }
  }

  _applyHailo(mood, s) {
    const count = s.hailo_peopleCount || 0;
    // Normalize: 0 people → 0, 20+ people → 1
    const normalized = clamp(count / 20, 0, 1);
    mood.density += normalized * 0.15;
    mood.energy += normalized * 0.1;
  }

  _applySecurity(mood, s) {
    const level = s.security_level || 0;

    if (level === 0) {
      // Normal — no override
      return;
    }

    if (level >= 1) {
      mood.urgency = Math.max(mood.urgency, 0.3);
    }
    if (level >= 2) {
      mood.urgency = Math.max(mood.urgency, 0.6);
      // Override warmth/brightness
      mood.warmth = 0.2;
      mood.brightness = 0.6;
      mood.energy = 0.7;
      mood.tempo = 0.7;
    }
    if (level >= 3) {
      // Full alert override
      mood.urgency = 1.0;
      mood.energy = 1.0;
      mood.tempo = 1.0;
      mood.brightness = 0.8;
      mood.warmth = 0.0;
      mood.density = 0.2;
      mood.formality = 1.0;
    }
  }
}

// ============================================================
// Context Engine — main orchestrator
// ============================================================

export class ContextEngine {
  /**
   * @param {import('better-sqlite3').Database} db — signage DB (not used for mood storage but available)
   * @param {import('socket.io').Server} io — Socket.IO server for broadcasting
   */
  constructor(db, io) {
    this.db = db;
    this.io = io;
    this.processor = new ContextProcessor();

    // Collectors
    this.weather = new WeatherCollector();
    this.time = new TimeCollector();
    this.audio = new AudioCollector();
    this.occupancy = new OccupancyCollector();
    this.security = new SecurityCollector();
    this.hailo = new HailoCollector();
    this.calendar = new CalendarCollector();

    // State: per-location current mood (smoothed)
    this.currentMoods = new Map(); // locationId → MoodVector
    // Target moods (what we're lerping toward)
    this.targetMoods = new Map();  // locationId → MoodVector
    // Raw signals cache
    this.signals = new Map();      // locationId → signals object

    // Timers
    this._lerpTimer = null;
    this._broadcastTimer = null;
    this._signalTimer = null;

    this._started = false;
  }

  /**
   * Start all collectors and the mood update loop.
   */
  start() {
    if (this._started) return;
    this._started = true;

    console.log('🧠 Context Engine starting...');

    // Start collectors
    this.weather.start();
    this.time.start();
    this.audio.start();
    this.occupancy.start();
    this.security.start();
    this.hailo.start();
    this.calendar.start();

    // Compute signals → target mood every 2 seconds
    this._signalTimer = setInterval(() => this._computeTargets(), 2000);

    // Lerp current mood toward target every 500ms
    this._lerpTimer = setInterval(() => this._lerpStep(), MOOD_UPDATE_INTERVAL);

    // Broadcast to WebSocket clients every 2 seconds
    this._broadcastTimer = setInterval(() => this._broadcast(), BROADCAST_INTERVAL);

    // Initial computation after a short delay for collectors to fetch
    setTimeout(() => this._computeTargets(), 2000);

    console.log('🧠 Context Engine started — broadcasting mood vectors');
  }

  /**
   * Stop everything gracefully.
   */
  stop() {
    this._started = false;
    this.weather.stop();
    this.time.stop();
    this.audio.stop();
    this.occupancy.stop();
    this.security.stop();
    this.hailo.stop();
    this.calendar.stop();

    if (this._lerpTimer) clearInterval(this._lerpTimer);
    if (this._broadcastTimer) clearInterval(this._broadcastTimer);
    if (this._signalTimer) clearInterval(this._signalTimer);

    console.log('🧠 Context Engine stopped');
  }

  /**
   * Get current mood for a location (for REST API).
   */
  getMood(locationId = DEFAULT_LOCATION) {
    return this.currentMoods.get(locationId) || { ...DEFAULT_MOOD };
  }

  /**
   * Get raw signals for a location (for debugging).
   */
  getSignals(locationId = DEFAULT_LOCATION) {
    return this.signals.get(locationId) || {};
  }

  /**
   * Get all active location moods.
   */
  getAllMoods() {
    const result = {};
    for (const [id, mood] of this.currentMoods) {
      result[id] = { mood, signals: this.signals.get(id) || {} };
    }
    return result;
  }

  // ---- Internal ----

  _getLocationIds() {
    // Get all location IDs that have screens, plus a default
    const ids = new Set([DEFAULT_LOCATION]);
    try {
      const rows = this.db.prepare(
        "SELECT DISTINCT location_id FROM screens WHERE location_id IS NOT NULL AND location_id != ''"
      ).all();
      for (const r of rows) {
        if (r.location_id) ids.add(r.location_id);
      }
    } catch {}
    return [...ids];
  }

  _computeTargets() {
    const locationIds = this._getLocationIds();

    for (const locationId of locationIds) {
      // Gather all signals
      const signals = {
        ...this.weather.getSignals(),
        ...this.time.getSignals(),
        ...this.audio.getSignals(),
        ...this.occupancy.getSignals(locationId),
        ...this.security.getSignals(),
        ...this.hailo.getSignals(),
        ...this.calendar.getSignals(),
      };

      this.signals.set(locationId, signals);

      // Compute target mood
      const target = this.processor.computeTargetMood(signals);
      this.targetMoods.set(locationId, target);

      // Initialize current mood if not set
      if (!this.currentMoods.has(locationId)) {
        this.currentMoods.set(locationId, { ...target });
      }
    }
  }

  _lerpStep() {
    let anyChanged = false;

    for (const [locationId, target] of this.targetMoods) {
      const current = this.currentMoods.get(locationId);
      if (!current) continue;

      const updated = {};
      for (const key of Object.keys(DEFAULT_MOOD)) {
        const speed = LERP_SPEEDS[key] || 0.05;
        const newVal = lerp(current[key], target[key], speed);
        updated[key] = Math.round(newVal * 1000) / 1000; // 3 decimal places
        if (Math.abs(updated[key] - current[key]) > 0.001) {
          anyChanged = true;
        }
      }

      this.currentMoods.set(locationId, updated);
    }

    return anyChanged;
  }

  _broadcast() {
    if (!this.io) return;

    for (const [locationId, mood] of this.currentMoods) {
      const message = {
        type: 'context:mood',
        locationId,
        mood,
        signals: this.signals.get(locationId) || {},
        timestamp: Date.now(),
      };

      this.io.emit('context:mood', message);
    }
  }

  /**
   * Set up the REST endpoint on an Express app.
   */
  setupRoutes(app) {
    // Get mood for a specific location
    app.get('/api/context/:locationId', (req, res) => {
      const locationId = req.params.locationId;
      const mood = this.getMood(locationId);
      const signals = this.getSignals(locationId);
      res.json({
        success: true,
        locationId,
        mood,
        signals,
        timestamp: Date.now(),
      });
    });

    // Get all location moods
    app.get('/api/context', (req, res) => {
      res.json({
        success: true,
        locations: this.getAllMoods(),
        timestamp: Date.now(),
      });
    });

    console.log('🧠 Context Engine routes registered: /api/context, /api/context/:locationId');
  }
}
