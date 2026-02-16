/**
 * Art API Client
 * Wrapper for multiple museum APIs (ARTIC, Met, Cleveland)
 */

const { createApiClient } = require('../../shared/utils/apiClient');
const artConfig = require('./config');

// API endpoints
const ART_API_BASE = 'https://api.artic.edu/api/v1';
const ART_IIIF_BASE = 'https://www.artic.edu/iiif/2';
const MET_API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';
const CLEVELAND_API_BASE = 'https://openaccess-api.clevelandart.org/api';

const DEFAULT_HEADERS = {
  'User-Agent': 'Dashboard-App/1.0 (contact@example.com)',
  'Accept': 'application/json'
};

/**
 * Art API Client Class
 */
class ArtClient {
  constructor() {
    this.config = artConfig;

    // Create configured API clients
    this.articClient = createApiClient({
      baseURL: ART_API_BASE,
      headers: DEFAULT_HEADERS,
      timeout: 10000
    });

    this.metClient = createApiClient({
      baseURL: MET_API_BASE,
      headers: DEFAULT_HEADERS,
      timeout: 10000
    });

    this.clevelandClient = createApiClient({
      baseURL: CLEVELAND_API_BASE,
      headers: DEFAULT_HEADERS,
      timeout: 10000
    });
  }

  /**
   * Check if text contains religious content
   * @param {string} text - Text to check
   * @returns {boolean}
   */
  containsReligiousContent(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return this.config.religiousKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Check if artwork has religious content
   * @param {Object} artwork - Normalized artwork
   * @returns {boolean}
   */
  isReligiousArtwork(artwork) {
    return this.containsReligiousContent(artwork.title) ||
           this.containsReligiousContent(artwork.artist) ||
           this.containsReligiousContent(artwork.style);
  }

  /**
   * Derive orientation from dimensions
   * @param {number} width
   * @param {number} height
   * @returns {string|null}
   */
  deriveOrientation(width, height) {
    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w === 0 || h === 0) {
      return null;
    }
    if (h > w) return 'portrait';
    if (w > h) return 'landscape';
    return null;
  }

  /**
   * Pick a random item from a list
   * @param {Array} list
   * @returns {*}
   */
  randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  /**
   * Pick a weighted random source
   * @param {Array} sourceEntries - Array of { key, weight }
   * @returns {string} Source key
   */
  pickWeightedSource(sourceEntries) {
    const totalWeight = sourceEntries.reduce((sum, entry) => sum + entry.weight, 0);
    const roll = Math.random() * totalWeight;
    let cursor = 0;
    for (const entry of sourceEntries) {
      cursor += entry.weight;
      if (roll <= cursor) return entry.key;
    }
    return sourceEntries[0]?.key;
  }

  /**
   * Get enabled sources with weights
   * @returns {Array}
   */
  enabledSources() {
    return Object.entries(this.config.sources || {})
      .filter(([, cfg]) => cfg.enabled)
      .map(([key, cfg]) => ({ key, weight: cfg.weight || 1 }));
  }

  /**
   * Normalize ARTIC artwork to standard format
   */
  normalizeArtic(artwork, style) {
    const imageUrl = `${ART_IIIF_BASE}/${artwork.image_id}/full/843,/0/default.jpg`;
    const orientation = artwork.thumbnail
      ? this.deriveOrientation(artwork.thumbnail.width, artwork.thumbnail.height)
      : null;

    return {
      imageUrl,
      title: artwork.title || 'Untitled',
      artist: artwork.artist_display || 'Unknown Artist',
      date: artwork.date_display || 'Unknown Date',
      id: artwork.id?.toString(),
      style: style || 'Unknown Style',
      orientation,
      source: 'Art Institute of Chicago'
    };
  }

  /**
   * Fetch artwork from Art Institute of Chicago
   */
  async fetchFromArtic(orientation, filters = {}) {
    const sourceConfig = this.config.sources.artic || {};
    const styles = filters.styles || sourceConfig.styles || ['Abstract', 'Modern'];
    const randomStyle = this.randomItem(styles);

    console.log(`🎨 Fetching from ARTIC with style: ${randomStyle}`);

    const response = await this.articClient.get('/artworks/search', {
      params: {
        q: `${randomStyle} painting`,
        fields: 'id,title,artist_display,date_display,image_id,thumbnail',
        limit: 100
      }
    });

    const candidates = (response.data?.data || []).filter(item => item.image_id);
    if (!candidates.length) {
      throw new Error('ARTIC: no artworks with images returned');
    }

    const filtered = orientation
      ? candidates.filter(item => {
          if (!item.thumbnail) return false;
          const ori = this.deriveOrientation(item.thumbnail.width, item.thumbnail.height);
          return ori === orientation;
        })
      : candidates;

    // Filter out religious content
    const nonReligious = (filtered.length ? filtered : candidates).filter(item => {
      const normalized = this.normalizeArtic(item, randomStyle);
      return !this.isReligiousArtwork(normalized);
    });

    if (!nonReligious.length) {
      throw new Error('ARTIC: all artworks filtered out as religious content');
    }

    const pick = this.randomItem(nonReligious);
    return this.normalizeArtic(pick, randomStyle);
  }

  /**
   * Normalize Met artwork to standard format
   */
  normalizeMet(object) {
    const width = object.measurements?.[0]?.elementMeasurements?.Width;
    const height = object.measurements?.[0]?.elementMeasurements?.Height;
    return {
      imageUrl: object.primaryImageSmall || object.primaryImage,
      title: object.title || 'Untitled',
      artist: object.artistDisplayName || 'Unknown Artist',
      date: object.objectDate || object.objectBeginDate || 'Unknown Date',
      id: object.objectID?.toString(),
      style: object.classification || object.department || 'Unknown Style',
      orientation: this.deriveOrientation(width, height),
      source: 'Metropolitan Museum of Art'
    };
  }

  /**
   * Fetch artwork from Metropolitan Museum of Art
   */
  async fetchFromMet(orientation, filters = {}) {
    const sourceConfig = this.config.sources.met || {};
    const departments = sourceConfig.departments || [];
    const searchTerm = filters.styles ? this.randomItem(filters.styles) : 'painting';
    const searchParams = {
      q: searchTerm,
      hasImages: sourceConfig.hasImages !== false
    };
    if (departments.length) {
      searchParams.departmentId = this.randomItem(departments);
    }

    console.log(`🎨 Fetching from Met with search: ${searchTerm}`);

    const search = await this.metClient.get('/search', { params: searchParams });

    const ids = search.data?.objectIDs || [];
    if (!ids.length) {
      throw new Error('Met: no objects returned for query');
    }

    const attempts = Math.min(20, ids.length);
    for (let i = 0; i < attempts; i++) {
      const objectId = ids[Math.floor(Math.random() * ids.length)];
      try {
        const objectRes = await this.metClient.get(`/objects/${objectId}`);
        const object = objectRes.data;
        if (!object || !(object.primaryImage || object.primaryImageSmall)) continue;

        const normalized = this.normalizeMet(object);
        if (orientation && normalized.orientation && normalized.orientation !== orientation) {
          continue;
        }

        if (this.isReligiousArtwork(normalized)) {
          continue;
        }

        return normalized;
      } catch (err) {
        // Skip failed object fetches
        continue;
      }
    }

    throw new Error('Met: unable to find non-religious image matching orientation');
  }

  /**
   * Normalize Cleveland artwork to standard format
   */
  normalizeCleveland(item) {
    const image =
      item.images?.web?.url ||
      item.images?.print?.url ||
      item.images?.digital?.url ||
      item.images?.tiny?.url;
    const width = item.images?.web?.width || item.images?.print?.width;
    const height = item.images?.web?.height || item.images?.print?.height;

    return {
      imageUrl: image,
      title: item.title || 'Untitled',
      artist:
        (item.creators || [])
          .map(c => c.description || c.role || c.name)
          .filter(Boolean)
          .join(', ') || item.creator || 'Unknown Artist',
      date: item.creation_date || item.creation_date_earliest || 'Unknown Date',
      id: item.id?.toString(),
      style: item.department || item.type || 'Unknown Style',
      orientation: this.deriveOrientation(width, height),
      source: 'Cleveland Museum of Art'
    };
  }

  /**
   * Fetch artwork from Cleveland Museum of Art
   */
  async fetchFromCleveland(orientation, filters = {}) {
    const sourceConfig = this.config.sources.cleveland || {};
    const searchTerm = filters.styles ? this.randomItem(filters.styles) : null;
    const params = {
      has_image: 1,
      limit: 50
    };
    if (sourceConfig.type) params.type = sourceConfig.type;
    if (searchTerm) params.q = searchTerm;

    console.log(`🎨 Fetching from Cleveland`);

    const response = await this.clevelandClient.get('/artworks', { params });

    const candidates = response.data?.data?.filter(item => item.images) || [];
    if (!candidates.length) {
      throw new Error('Cleveland: no artworks with images returned');
    }

    const filtered = orientation
      ? candidates.filter(item => {
          const width = item.images?.web?.width || item.images?.print?.width;
          const height = item.images?.web?.height || item.images?.print?.height;
          const ori = this.deriveOrientation(width, height);
          return !ori || ori === orientation;
        })
      : candidates;

    // Filter out religious content
    const nonReligious = (filtered.length ? filtered : candidates).filter(item => {
      const normalized = this.normalizeCleveland(item);
      return !this.isReligiousArtwork(normalized);
    });

    if (!nonReligious.length) {
      throw new Error('Cleveland: all artworks filtered out as religious content');
    }

    const pick = this.randomItem(nonReligious);
    const normalized = this.normalizeCleveland(pick);
    if (!normalized.imageUrl) {
      throw new Error('Cleveland: selected artwork missing image url');
    }

    return normalized;
  }

  /**
   * Fetch from a specific source
   * @param {string} sourceKey - Source key (artic, met, cleveland)
   * @param {string} orientation - Target orientation
   * @param {Object} filters - Style filters
   * @returns {Promise<Object>} Normalized artwork
   */
  async fetchFromSource(sourceKey, orientation, filters = {}) {
    switch (sourceKey) {
      case 'artic':
        return this.fetchFromArtic(orientation, filters);
      case 'met':
        return this.fetchFromMet(orientation, filters);
      case 'cleveland':
        return this.fetchFromCleveland(orientation, filters);
      default:
        throw new Error(`Unknown art source: ${sourceKey}`);
    }
  }

  /**
   * Fetch a pool of artworks
   * @param {number} poolSize - Size of pool
   * @param {string} orientation - Target orientation
   * @param {Object} filters - Style filters
   * @returns {Promise<Array>} Array of artworks
   */
  async fetchArtworkPool(poolSize = this.config.poolSize, orientation = null, filters = {}) {
    const sources = this.enabledSources();
    if (!sources.length) {
      throw new Error('No art sources enabled');
    }

    const artworks = [];
    const seen = new Set();
    const maxAttempts = poolSize * 4;

    for (let attempt = 0; attempt < maxAttempts && artworks.length < poolSize; attempt++) {
      const sourceKey = this.pickWeightedSource(sources);
      try {
        const artwork = await this.fetchFromSource(sourceKey, orientation, filters);
        const dedupeKey = `${artwork.source}:${artwork.id}`;
        if (!artwork || !artwork.imageUrl || seen.has(dedupeKey)) {
          continue;
        }
        seen.add(dedupeKey);
        artworks.push(artwork);
        console.log(`✅ Added ${orientation || 'any'} artwork from ${sourceKey}: ${artwork.title} (${artworks.length}/${poolSize})`);

        if (artworks.length < poolSize) {
          await this.sleep(this.config.retryDelayMs);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to fetch ${orientation || 'any'} artwork from ${sourceKey} (attempt ${attempt + 1}): ${error.message}`);
        await this.sleep(this.config.retryDelayMs);
      }
    }

    if (!artworks.length) {
      throw new Error(`Failed to fetch any ${orientation || ''} artworks for pool`);
    }

    console.log(`🎨 Created ${orientation || 'any'} artwork pool with ${artworks.length} artworks`);
    return artworks;
  }

  /**
   * Sleep for a given duration
   * @param {number} ms
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create an Art client instance
 * @returns {ArtClient} Art client instance
 */
function createArtClient() {
  return new ArtClient();
}

module.exports = {
  ArtClient,
  createArtClient
};
