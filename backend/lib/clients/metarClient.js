const axios = require('axios');
const NodeCache = require('node-cache');

class MetarClient {
  constructor() {
    this.baseURL = 'https://aviationweather.gov/api/data/metar';
    this.cache = new NodeCache({ stdTTL: 40 * 60 }); // 40 minutes cache
  }

  async getMetar(stationId = 'KVBT') {
    const cacheKey = `metar_${stationId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      const cacheAge = Math.floor((Date.now() - new Date(cached.timestamp).getTime()) / 1000 / 60);
      console.log(`✅ METAR cache hit for ${stationId} (cached ${cacheAge} min ago, 40min TTL)`);
      console.log(`   Data: ${cached.rawText.substring(0, 50)}...`);
      return cached;
    }

    try {
      console.log(`🌐 Fetching fresh METAR for ${stationId} (cache miss)`);
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

      this.cache.set(cacheKey, metarData);
      console.log(`✅ Fresh METAR fetched and cached for ${stationId}`);
      return metarData;

    } catch (error) {
      console.error(`❌ METAR fetch error for ${stationId}:`, error.message);
      
      // Return stale cache if available (better than nothing)
      const staleCache = this.cache.get(cacheKey, true);
      if (staleCache) {
        console.log(`⚠️  Using stale cache for ${stationId} due to error`);
        return staleCache;
      }
      
      throw new Error(`Failed to fetch METAR for ${stationId}: ${error.message}`);
    }
  }
}

module.exports = new MetarClient();
