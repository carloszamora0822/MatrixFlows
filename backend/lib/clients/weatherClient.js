const axios = require('axios');
const NodeCache = require('node-cache');

class WeatherClient {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseURL = 'https://api.openweathermap.org/data/2.5/weather';
  }

  async getWeather(location = process.env.OPENWEATHER_LOCATION || 'Bentonville,US') {
    if (!this.apiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    const cacheKey = `weather_${location}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      console.log(`✅ Weather cache hit for ${location}`);
      return cached;
    }

    try {
      console.log(`🌐 Fetching weather for ${location}`);
      const response = await axios.get(this.baseURL, {
        params: {
          q: location,
          units: 'imperial',
          appid: this.apiKey
        },
        timeout: 10000
      });

      const weatherData = {
        location: response.data.name,
        temperature: Math.round(response.data.main.temp),
        windSpeed: Math.round(response.data.wind?.speed || 0),
        description: response.data.weather[0]?.description || 'Unknown',
        condition: response.data.weather[0]?.main || 'Unknown',
        timestamp: new Date().toISOString(),
        source: 'openweathermap.org'
      };

      this.cache.set(cacheKey, weatherData);
      console.log(`✅ Weather fetched and cached for ${location}: ${weatherData.temperature}°F, ${weatherData.condition}`);
      return weatherData;

    } catch (error) {
      console.error(`❌ Weather fetch error for ${location}:`, error.message);
      
      // Return cached data if available, even if expired
      const expiredCache = this.cache.get(cacheKey, true);
      if (expiredCache) {
        console.log(`⚠️  Using expired weather cache for ${location}`);
        return { ...expiredCache, isStale: true };
      }

      throw new Error(`Failed to fetch weather for ${location}: ${error.message}`);
    }
  }

  clearCache(location) {
    if (location) {
      this.cache.del(`weather_${location}`);
      console.log(`🗑️  Cleared weather cache for ${location}`);
    } else {
      this.cache.flushAll();
      console.log(`🗑️  Cleared all weather cache`);
    }
  }

  getCacheStats() {
    return {
      keys: this.cache.keys(),
      stats: this.cache.getStats()
    };
  }
}

module.exports = new WeatherClient();
