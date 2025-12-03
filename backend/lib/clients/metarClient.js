const axios = require('axios');
const NodeCache = require('node-cache');

class MetarClient {
  constructor() {
    this.baseURL = 'https://aviationweather.gov/api/data/metar';
  }

  async getMetar(stationId = 'KVBT') {
    try {
      console.log(`🌐 Fetching fresh METAR for ${stationId} (no cache)`);
      const response = await axios.get(`${this.baseURL}?ids=${stationId}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'VBT-Vestaboard-System/1.0'
        }
      });

      if (!response.data || response.data.trim() === '') {
        throw new Error('Empty METAR response');
      }

      const metarData = {
        stationId,
        rawText: response.data.trim(),
        timestamp: new Date().toISOString(),
        source: 'aviationweather.gov'
      };

      console.log(`✅ Fresh METAR fetched for ${stationId}`);
      return metarData;

    } catch (error) {
      console.error(`❌ METAR fetch error for ${stationId}:`, error.message);
      throw new Error(`Failed to fetch METAR for ${stationId}: ${error.message}`);
    }
  }
}

module.exports = new MetarClient();
