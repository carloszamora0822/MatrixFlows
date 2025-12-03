const axios = require('axios');
const NodeCache = require('node-cache');

class WeatherClient {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseURL = 'https://api.openweathermap.org/data/2.5/weather';
    this.cache = new NodeCache({ stdTTL: 40 * 60 }); // 40 minutes cache
  }

  async getWeather(location = process.env.OPENWEATHER_LOCATION || 'Bentonville,US') {
    if (!this.apiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    const cacheKey = `weather_${location}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      const cacheAge = Math.floor((Date.now() - new Date(cached.timestamp).getTime()) / 1000 / 60);
      console.log(`✅ Weather cache hit for ${location} (cached ${cacheAge} min ago, 40min TTL)`);
      console.log(`   ${cached.temperature}°F, ${cached.condition}, Wind ${cached.windSpeed} mph`);
      return cached;
    }

    try {
      console.log(`🌐 Fetching fresh weather for ${location} (cache miss)`);
      const response = await axios.get(this.baseURL, {
        params: {
          q: location,
          units: 'imperial',
          appid: this.apiKey
        },
        timeout: 10000
      });

      // Check if it's nighttime (after sunset or before sunrise)
      const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp
      const sunrise = response.data.sys.sunrise;
      const sunset = response.data.sys.sunset;
      const isNight = currentTime < sunrise || currentTime > sunset;

      // Log raw API response for debugging
      console.log(`🌐 Raw API data for ${location}:`);
      console.log(`   Temperature: ${response.data.main.temp}°F`);
      console.log(`   Wind Speed: ${response.data.wind?.speed} mph (raw from API)`);
      console.log(`   Condition: ${response.data.weather[0]?.main}`);
      console.log(`   Description: ${response.data.weather[0]?.description}`);

      const weatherData = {
        location: response.data.name,
        temperature: Math.round(response.data.main.temp),
        windSpeed: Math.round(response.data.wind?.speed || 0),
        description: response.data.weather[0]?.description || 'Unknown',
        condition: response.data.weather[0]?.main || 'Unknown',
        isNight: isNight,
        sunrise: sunrise,
        sunset: sunset,
        timestamp: new Date().toISOString(),
        source: 'openweathermap.org',
        rawWindData: response.data.wind // Store raw wind data for debugging
      };

      this.cache.set(cacheKey, weatherData);
      console.log(`✅ Fresh weather fetched and cached for ${location}`);
      console.log(`   Final data: ${weatherData.temperature}°F, ${weatherData.condition}, Wind ${weatherData.windSpeed} mph`);
      return weatherData;

    } catch (error) {
      console.error(`❌ Weather fetch error for ${location}:`, error.message);
      
      // Return stale cache if available (better than nothing)
      const staleCache = this.cache.get(cacheKey, true);
      if (staleCache) {
        console.log(`⚠️  Using stale cache for ${location} due to error`);
        return staleCache;
      }
      
      throw new Error(`Failed to fetch weather for ${location}: ${error.message}`);
    }
  }
}

module.exports = new WeatherClient();
