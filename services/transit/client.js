/**
 * Transit API Client
 * Wrapper for CTA Bus Tracker and Train Tracker APIs
 */

const { createApiClient } = require('../../shared/utils/apiClient');
const ctaConfig = require('../../config/services').cta;
const ctaStops = require('./config');

// CTA API endpoints
const CTA_BUS_API_BASE = 'http://www.ctabustracker.com/bustime/api/v2';
const CTA_TRAIN_API_BASE = 'http://lapi.transitchicago.com/api/1.0';

// Mock data for fallback
const MOCK_BUS_DATA = {
  route: '77',
  eastbound: [
    { route: '77', direction: 'Eastbound', destination: 'Belmont Harbor', minutesAway: 5, predictedTime: '12:05', vehicleId: '1234' },
    { route: '77', direction: 'Eastbound', destination: 'Belmont Harbor', minutesAway: 15, predictedTime: '12:15', vehicleId: '1235' }
  ],
  westbound: [
    { route: '77', direction: 'Westbound', destination: 'Austin', minutesAway: 8, predictedTime: '12:08', vehicleId: '1236' },
    { route: '77', direction: 'Westbound', destination: 'Austin', minutesAway: 18, predictedTime: '12:18', vehicleId: '1237' }
  ],
  timestamp: new Date().toISOString()
};

const MOCK_TRAIN_DATA = {
  red: {
    line: 'Red',
    stopName: 'Belmont',
    north: [
      { line: 'Red', destination: 'Howard', minutesAway: 6, arrivalTime: '12:06', isApproaching: false, isDelayed: false, runNumber: '102', direction: 'Northbound' }
    ],
    south: [
      { line: 'Red', destination: '95th/Dan Ryan', minutesAway: 3, arrivalTime: '12:03', isApproaching: false, isDelayed: false, runNumber: '101', direction: 'Southbound' }
    ],
    arrivals: [],
    timestamp: new Date().toISOString()
  },
  brown: {
    line: 'Brown',
    stopName: 'Belmont',
    north: [
      { line: 'Brn', destination: 'Kimball', minutesAway: 12, arrivalTime: '12:12', isApproaching: false, isDelayed: false, runNumber: '202', direction: 'Northbound' }
    ],
    south: [
      { line: 'Brn', destination: 'Loop', minutesAway: 4, arrivalTime: '12:04', isApproaching: false, isDelayed: false, runNumber: '201', direction: 'Southbound' }
    ],
    arrivals: [],
    timestamp: new Date().toISOString()
  }
};

/**
 * Transit API Client Class
 */
class TransitClient {
  constructor(config = {}) {
    this.busApiKey = config.busApiKey || ctaConfig?.busApiKey;
    this.trainApiKey = config.trainApiKey || ctaConfig?.trainApiKey;

    // Create configured API clients
    this.busClient = createApiClient({
      baseURL: CTA_BUS_API_BASE,
      timeout: 10000
    });

    this.trainClient = createApiClient({
      baseURL: CTA_TRAIN_API_BASE,
      timeout: 10000
    });
  }

  /**
   * Fetch bus predictions from CTA Bus Tracker API
   * @param {string} stopId - Bus stop ID
   * @param {string} routeId - Bus route ID
   * @returns {Promise<Array>} Raw predictions
   */
  async fetchBusPredictions(stopId, routeId) {
    if (!this.busApiKey) {
      throw new Error('CTA_BUS_API_KEY not configured');
    }

    try {
      console.log(`🚌 Fetching bus predictions for stop ${stopId}, route ${routeId}`);

      const response = await this.busClient.get('/getpredictions', {
        params: {
          key: this.busApiKey,
          stpid: stopId,
          rt: routeId,
          format: 'json'
        }
      });

      if (response.data['bustime-response']?.error) {
        const errors = response.data['bustime-response'].error;
        const errorMsg = errors[0]?.msg || 'Unknown error';
        if (errorMsg.toLowerCase().includes('no service scheduled')) {
          console.log(`ℹ️  No bus service currently scheduled for stop ${stopId}, route ${routeId}`);
          return [];
        }
        console.warn(`⚠️  CTA Bus API error: ${errorMsg}`);
        return [];
      }

      const predictions = response.data['bustime-response']?.prd || [];
      console.log(`✅ Received ${predictions.length} bus predictions for stop ${stopId}`);
      return predictions;

    } catch (error) {
      this._handleError(error, `Failed to fetch bus predictions for stop ${stopId}`);
    }
  }

  /**
   * Fetch train arrivals from CTA Train Tracker API
   * @param {string} stopId - Train station map ID
   * @returns {Promise<Array>} Raw arrivals
   */
  async fetchTrainArrivals(stopId) {
    if (!this.trainApiKey) {
      throw new Error('CTA_TRAIN_API_KEY not configured');
    }

    try {
      console.log(`🚇 Fetching train arrivals for station ${stopId}`);

      const response = await this.trainClient.get('/ttarrivals.aspx', {
        params: {
          key: this.trainApiKey,
          mapid: stopId,
          outputType: 'JSON'
        }
      });

      if (response.data.ctatt?.errCd && response.data.ctatt.errCd !== "0") {
        const errorCode = response.data.ctatt?.errCd;
        const errorMsg = response.data.ctatt?.errNm || 'Unknown error';
        console.warn(`⚠️  CTA Train API error: [${errorCode}] ${errorMsg}`);
        return [];
      }

      const arrivals = response.data.ctatt?.eta || [];
      console.log(`✅ Received ${arrivals.length} train arrivals for station ${stopId}`);
      return arrivals;

    } catch (error) {
      this._handleError(error, `Failed to fetch train arrivals for station ${stopId}`);
    }
  }

  /**
   * Format bus predictions with time calculations
   * @param {Array} predictions - Raw predictions
   * @param {string} direction - Direction filter
   * @returns {Array} Formatted predictions
   */
  formatBusPredictions(predictions, direction) {
    const now = new Date();

    return predictions
      .map(pred => {
        // Parse CTA time format: YYYYMMDD HH:mm
        const [datePart, timePart] = pred.prdtm.split(' ');
        const year = parseInt(datePart.substring(0, 4));
        const month = parseInt(datePart.substring(4, 6)) - 1;
        const day = parseInt(datePart.substring(6, 8));
        const [hours, minutes] = timePart.split(':').map(Number);

        const predTime = new Date(year, month, day, hours, minutes);
        const minutesAway = Math.max(0, Math.round((predTime - now) / 60000));

        return {
          route: pred.rt,
          direction: pred.rtdir,
          destination: pred.des,
          minutesAway,
          predictedTime: timePart,
          vehicleId: pred.vid
        };
      })
      .filter(pred => pred.direction.toLowerCase() === direction.toLowerCase())
      .sort((a, b) => a.minutesAway - b.minutesAway);
  }

  /**
   * Format train arrivals with time calculations
   * @param {Array} arrivals - Raw arrivals
   * @param {Object} options - Options
   * @param {string} options.lineCode - Line code filter (Red, Brn, etc.)
   * @returns {Array} Formatted arrivals
   */
  formatTrainArrivals(arrivals, { lineCode = null } = {}) {
    const now = new Date();
    const filtered = lineCode ? arrivals.filter(a => a.rt === lineCode) : arrivals;

    return filtered
      .map(arrival => {
        // Parse CTA time format: YYYYMMDD HH:mm:ss
        const [datePart, timePart] = arrival.arrT.split(' ');
        const year = parseInt(datePart.substring(0, 4));
        const month = parseInt(datePart.substring(4, 6)) - 1;
        const day = parseInt(datePart.substring(6, 8));
        const [hours, minutes, seconds] = timePart.split(':').map(Number);

        const arrivalTime = new Date(year, month, day, hours, minutes, seconds);
        const minutesAway = Math.max(0, Math.round((arrivalTime - now) / 60000));

        return {
          line: arrival.rt,
          destination: arrival.destNm,
          minutesAway,
          arrivalTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
          isApproaching: arrival.isApp === '1',
          isDelayed: arrival.isDly === '1',
          runNumber: arrival.rn,
          directionCode: arrival.trDr
        };
      })
      .sort((a, b) => a.minutesAway - b.minutesAway);
  }

  /**
   * Split train arrivals by direction for Belmont station
   * @param {string} lineCode - Line code (Red or Brn)
   * @param {Array} items - Formatted arrivals
   * @param {number} limitPerDirection - Max items per direction
   * @returns {Object} { north, south }
   */
  splitByDirectionForBelmont(lineCode, items, limitPerDirection = ctaStops.trainLimitPerDirection) {
    const directions = ctaStops.directions;
    const lineKey = lineCode === 'Red' ? 'red' : 'brown';
    const northDests = directions[lineKey]?.north || [];
    const southDests = directions[lineKey]?.south || [];

    let north = items.filter(x => northDests.includes(x.destination));
    let south = items.filter(x => southDests.includes(x.destination));

    if (Number.isInteger(limitPerDirection)) {
      north = north.slice(0, limitPerDirection);
      south = south.slice(0, limitPerDirection);
    }

    // Add direction field
    north = north.map(x => ({ ...x, direction: 'Northbound' }));
    south = south.map(x => ({ ...x, direction: 'Southbound' }));

    return { north, south };
  }

  /**
   * Get Route 77 bus predictions
   * @returns {Promise<Object>} Formatted bus data
   */
  async getRoute77Buses() {
    try {
      const { route77 } = ctaStops.bus;

      const [eastboundPreds, westboundPreds] = await Promise.all([
        this.fetchBusPredictions(route77.eastbound.stopId, route77.routeId),
        this.fetchBusPredictions(route77.westbound.stopId, route77.routeId)
      ]);

      const eastbound = this.formatBusPredictions(eastboundPreds, route77.eastbound.direction);
      const westbound = this.formatBusPredictions(westboundPreds, route77.westbound.direction);

      return {
        route: '77',
        eastbound,
        westbound,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting Route 77 buses:', error.message);
      console.warn('⚠️  Returning mock bus data');
      return MOCK_BUS_DATA;
    }
  }

  /**
   * Get Red Line train arrivals
   * @returns {Promise<Object>} Formatted Red Line data
   */
  async getRedLine() {
    try {
      const { redLine } = ctaStops.train;
      const stop = redLine.stops[0];

      const arrivals = await this.fetchTrainArrivals(stop.stopId);
      const normalized = this.formatTrainArrivals(arrivals, { lineCode: 'Red' });
      const { north, south } = this.splitByDirectionForBelmont('Red', normalized);

      // Compatibility: include flat arrivals array
      const arrivalsCompat = [...north, ...south].sort((a, b) => a.minutesAway - b.minutesAway);

      return {
        line: 'Red',
        stopName: stop.stopName,
        north,
        south,
        arrivals: arrivalsCompat,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting Red Line:', error.message);
      console.warn('⚠️  Returning mock Red Line data');
      return MOCK_TRAIN_DATA.red;
    }
  }

  /**
   * Get Brown Line train arrivals
   * @returns {Promise<Object>} Formatted Brown Line data
   */
  async getBrownLine() {
    try {
      const { brownLine } = ctaStops.train;
      const stop = brownLine.stops[0];

      const arrivals = await this.fetchTrainArrivals(stop.stopId);
      const normalized = this.formatTrainArrivals(arrivals, { lineCode: 'Brn' });
      const { north, south } = this.splitByDirectionForBelmont('Brn', normalized);

      // Compatibility: include flat arrivals array
      const arrivalsCompat = [...north, ...south].sort((a, b) => a.minutesAway - b.minutesAway);

      return {
        line: 'Brown',
        stopName: stop.stopName,
        north,
        south,
        arrivals: arrivalsCompat,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting Brown Line:', error.message);
      console.warn('⚠️  Returning mock Brown Line data');
      return MOCK_TRAIN_DATA.brown;
    }
  }

  /**
   * Get all bus data
   * @returns {Promise<Object>} All bus data
   */
  async getBuses() {
    try {
      const route77 = await this.getRoute77Buses();
      return {
        routes: { '77': route77 },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting all buses:', error.message);
      return {
        routes: { '77': MOCK_BUS_DATA },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all train data
   * @returns {Promise<Object>} All train data
   */
  async getTrains() {
    try {
      const [redLine, brownLine] = await Promise.all([
        this.getRedLine(),
        this.getBrownLine()
      ]);

      return {
        lines: { red: redLine, brown: brownLine },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting all trains:', error.message);
      return {
        lines: {
          red: MOCK_TRAIN_DATA.red,
          brown: MOCK_TRAIN_DATA.brown
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all transit data
   * @returns {Promise<Object>} Combined bus and train data
   */
  async getAll() {
    try {
      const [buses, trains] = await Promise.all([
        this.getBuses(),
        this.getTrains()
      ]);

      return {
        buses,
        trains,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting all transit data:', error.message);
      return {
        buses: { routes: { '77': MOCK_BUS_DATA }, timestamp: new Date().toISOString() },
        trains: { lines: { red: MOCK_TRAIN_DATA.red, brown: MOCK_TRAIN_DATA.brown }, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Handle API errors
   * @private
   */
  _handleError(error, message) {
    console.error(`❌ Transit API Error: ${message}`, error.message);

    if (error.response) {
      const formattedError = new Error(error.response.data?.message || message);
      formattedError.status = error.response.status;
      throw formattedError;
    }

    const formattedError = new Error(message);
    formattedError.status = 500;
    formattedError.originalError = error.message;
    throw formattedError;
  }
}

/**
 * Create a Transit client instance
 * @param {Object} config - Optional config override
 * @returns {TransitClient} Transit client instance
 */
function createTransitClient(config = {}) {
  return new TransitClient(config);
}

module.exports = {
  TransitClient,
  createTransitClient,
  MOCK_BUS_DATA,
  MOCK_TRAIN_DATA
};
