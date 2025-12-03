const axios = require('axios');
const NodeCache = require('node-cache');

class WeatherClient {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseURL = 'https://api.openweathermap.org/data/2.5/weather';
  }

  async getWeather(location = process.env.OPENWEATHER_LOCATION || 'Bentonville,US') {
    if (!this.apiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    try {
      console.log(`🌐 Fetching fresh weather for ${location} (no cache)`);
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
        source: 'openweathermap.org'
      };

      console.log(`✅ Fresh weather fetched for ${location}: ${weatherData.temperature}°F, ${weatherData.condition}`);
      return weatherData;

    } catch (error) {
      console.error(`❌ Weather fetch error for ${location}:`, error.message);
      throw new Error(`Failed to fetch weather for ${location}: ${error.message}`);
    }
  }
}

module.exports = new WeatherClient();
