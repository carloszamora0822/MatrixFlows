const axios = require('axios');
const NodeCache = require('node-cache');

class MetarClient {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
    this.baseURL = 'https://aviationweather.gov/api/data/metar';
  }

  async getMetar(stationId = 'KVBT') {
    const cacheKey = `metar_${stationId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      console.log(`✅ METAR cache hit for ${stationId}`);
      return cached;
    }

    try {
      console.log(`🌐 Fetching METAR for ${stationId}`);
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
      console.log(`✅ METAR fetched and cached for ${stationId}`);
      return metarData;

    } catch (error) {
      console.error(`❌ METAR fetch error for ${stationId}:`, error.message);
      
      // Return cached data if available, even if expired
      const expiredCache = this.cache.get(cacheKey, true);
      if (expiredCache) {
        console.log(`⚠️  Using expired METAR cache for ${stationId}`);
        return { ...expiredCache, isStale: true };
      }

      throw new Error(`Failed to fetch METAR for ${stationId}: ${error.message}`);
    }
  }

  clearCache(stationId) {
    if (stationId) {
      this.cache.del(`metar_${stationId}`);
      console.log(`🗑️  Cleared METAR cache for ${stationId}`);
    } else {
      this.cache.flushAll();
      console.log(`🗑️  Cleared all METAR cache`);
    }
  }

  getCacheStats() {
    return {
      keys: this.cache.keys(),
      stats: this.cache.getStats()
    };
  }
}

module.exports = new MetarClient();
