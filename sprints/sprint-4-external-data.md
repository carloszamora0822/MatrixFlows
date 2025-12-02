# Sprint 4: External Data & Weather Screens

## Goal
Integrate external APIs (METAR and OpenWeatherMap) with caching, implement weather screen templates, and add custom message functionality.

## Duration
1 Week

## Deliverables
- METAR API integration with caching
- OpenWeatherMap API integration
- Weather screen templates (CLOUDY/SUNNY)
- Custom message system with border styles
- External data error handling
- Cache management system

## Requirements

### 1. External API Clients

#### METAR Client
```javascript
// backend/lib/clients/metarClient.js
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
      console.log(`METAR cache hit for ${stationId}`);
      return cached;
    }

    try {
      console.log(`Fetching METAR for ${stationId}`);
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
      return metarData;

    } catch (error) {
      console.error(`METAR fetch error for ${stationId}:`, error.message);
      
      // Return cached data if available, even if expired
      const expiredCache = this.cache.get(cacheKey, true);
      if (expiredCache) {
        console.log(`Using expired METAR cache for ${stationId}`);
        return { ...expiredCache, isStale: true };
      }

      throw new Error(`Failed to fetch METAR for ${stationId}: ${error.message}`);
    }
  }

  clearCache(stationId) {
    if (stationId) {
      this.cache.del(`metar_${stationId}`);
    } else {
      this.cache.flushAll();
    }
  }
}

module.exports = new MetarClient();
```

#### OpenWeather Client
```javascript
// backend/lib/clients/weatherClient.js
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
      console.log(`Weather cache hit for ${location}`);
      return cached;
    }

    try {
      console.log(`Fetching weather for ${location}`);
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
      return weatherData;

    } catch (error) {
      console.error(`Weather fetch error for ${location}:`, error.message);
      
      // Return cached data if available, even if expired
      const expiredCache = this.cache.get(cacheKey, true);
      if (expiredCache) {
        console.log(`Using expired weather cache for ${location}`);
        return { ...expiredCache, isStale: true };
      }

      throw new Error(`Failed to fetch weather for ${location}: ${error.message}`);
    }
  }

  clearCache(location) {
    if (location) {
      this.cache.del(`weather_${location}`);
    } else {
      this.cache.flushAll();
    }
  }
}

module.exports = new WeatherClient();
```

### 2. Weather Screen Templates

#### Weather Templates
```javascript
// backend/lib/templates.js (additions)
const templates = {
  // ... existing templates

  weatherCloudy: [
    [0, 0, 0, 0, 0, 0, 0, 0, 69, 69, 69, 69, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 12, 15, 21, 4, 25, 0, 69, 69, 69, 69, 69, 69, 0, 0, 69, 69, 69, 69, 69, 0, 0],
    [36, 36, 4, 5, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 69, 69, 69, 69, 69, 69, 0],
    [36, 36, 13, 16, 8, 0, 0, 69, 69, 69, 69, 69, 69, 69, 0, 0, 0, 0, 0, 0, 0, 0],
    [11, 22, 2, 20, 0, 0, 69, 69, 69, 69, 69, 69, 69, 69, 69, 0, 0, 69, 69, 69, 69, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 69, 69, 69, 69, 69]
  ],

  weatherSunny: [
    [0, 0, 0, 0, 65, 65, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 65, 65, 65, 64, 64, 64, 64, 65, 65, 65, 0, 0, 0, 19, 21, 14, 14, 25, 0, 0],
    [0, 65, 65, 64, 64, 64, 63, 63, 64, 64, 64, 65, 65, 0, 0, 36, 36, 4, 5, 7, 0, 0],
    [65, 65, 64, 64, 63, 63, 63, 63, 63, 63, 64, 64, 65, 65, 0, 36, 36, 13, 16, 8, 0, 0],
    [0, 0, 0, 0, 23, 5, 12, 3, 15, 13, 5, 0, 20, 15, 0, 22, 2, 20, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 5, 14, 20, 15, 14, 20, 9, 12, 12, 5, 0, 1, 18, 0, 0, 0, 0]
  ]
};

module.exports = templates;
```

### 3. Enhanced Screen Engine

#### Weather Screen Rendering
```javascript
// backend/lib/screenEngine.js (additions)
const metarClient = require('./clients/metarClient');
const weatherClient = require('./clients/weatherClient');

class ScreenEngine {
  // ... existing methods

  async renderWeather(config) {
    try {
      const weather = await weatherClient.getWeather(config.locationOverride);
      
      // Select template based on weather condition
      const template = this.selectWeatherTemplate(weather.condition);
      const matrix = JSON.parse(JSON.stringify(template));

      // Replace temperature placeholders
      const tempCodes = this.numberToCodes(weather.temperature);
      this.replacePlaceholders(matrix, [36, 36], tempCodes, 2, 0); // Row 2, starting from first 36,36

      // Replace wind speed placeholders  
      const windCodes = this.numberToCodes(weather.windSpeed);
      this.replacePlaceholders(matrix, [36, 36], windCodes, 3, 0); // Row 3, starting from first 36,36

      return matrix;

    } catch (error) {
      console.error('Weather rendering error:', error);
      return this.renderWeatherError(error.message);
    }
  }

  async renderMetar(config) {
    try {
      const metar = await metarClient.getMetar(config.stationId || 'KVBT');
      const matrix = new Array(6).fill(null).map(() => new Array(22).fill(0));

      // Header row
      const headerText = this.centerText(`METAR ${metar.stationId}`, 0, 21);
      for (let i = 0; i < headerText.length; i++) {
        matrix[0][i] = headerText[i];
      }

      // Wrap METAR text across remaining rows
      const metarLines = this.wrapText(metar.rawText, 22, 5);
      for (let row = 0; row < metarLines.length && row < 5; row++) {
        const lineCodes = this.textToCodes(metarLines[row]);
        for (let col = 0; col < lineCodes.length && col < 22; col++) {
          matrix[row + 1][col] = lineCodes[col];
        }
      }

      return matrix;

    } catch (error) {
      console.error('METAR rendering error:', error);
      return this.renderMetarError(error.message);
    }
  }

  selectWeatherTemplate(condition) {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
      return templates.weatherSunny;
    }
    return templates.weatherCloudy; // Default fallback
  }

  numberToCodes(number) {
    return number.toString().split('').map(digit => this.charMap[digit] || 0);
  }

  replacePlaceholders(matrix, searchPattern, replacementCodes, startRow, occurrence) {
    let found = 0;
    for (let row = startRow; row < matrix.length; row++) {
      for (let col = 0; col <= matrix[row].length - searchPattern.length; col++) {
        let matches = true;
        for (let i = 0; i < searchPattern.length; i++) {
          if (matrix[row][col + i] !== searchPattern[i]) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          if (found === occurrence) {
            // Replace with new codes
            for (let i = 0; i < replacementCodes.length && i < searchPattern.length; i++) {
              matrix[row][col + i] = replacementCodes[i];
            }
            return;
          }
          found++;
        }
      }
    }
  }

  wrapText(text, maxWidth, maxLines) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if (lines.length >= maxLines) break;
      
      if ((currentLine + word).length <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word.substring(0, maxWidth));
        }
      }
    }

    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }

    return lines;
  }

  renderWeatherError(message) {
    const matrix = new Array(6).fill(null).map(() => new Array(22).fill(0));
    const errorText = this.centerText('WEATHER ERROR', 0, 21);
    const messageText = this.centerText('DATA UNAVAILABLE', 0, 21);
    
    for (let i = 0; i < errorText.length; i++) matrix[1][i] = errorText[i];
    for (let i = 0; i < messageText.length; i++) matrix[3][i] = messageText[i];
    
    return matrix;
  }

  renderMetarError(message) {
    const matrix = new Array(6).fill(null).map(() => new Array(22).fill(0));
    const errorText = this.centerText('METAR ERROR', 0, 21);
    const messageText = this.centerText('DATA UNAVAILABLE', 0, 21);
    
    for (let i = 0; i < errorText.length; i++) matrix[1][i] = errorText[i];
    for (let i = 0; i < messageText.length; i++) matrix[3][i] = messageText[i];
    
    return matrix;
  }
}
```

### 4. Custom Message System

#### Custom Message Model
```javascript
// backend/models/CustomMessage.js
const mongoose = require('mongoose');

const customMessageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => `cm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  orgId: {
    type: String,
    required: true,
    default: 'VBT'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  style: {
    type: String,
    required: true,
    enum: ['solid_red', 'blue_corners', 'rainbow_border', 'simple_border'],
    default: 'simple_border'
  },
  maxLines: {
    type: Number,
    min: 1,
    max: 4,
    default: 4
  },
  createdBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CustomMessage', customMessageSchema);
```

#### Custom Message Templates
```javascript
// backend/lib/customMessageTemplates.js
const templates = {
  solid_red: [
    [63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63],
    [63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63],
    [63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63],
    [63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63],
    [63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63],
    [63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63]
  ],

  blue_corners: [
    [67, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 67, 67],
    [67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 67],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 67],
    [67, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 67, 67]
  ],

  rainbow_border: [
    [63, 64, 65, 66, 67, 68, 63, 64, 65, 66, 67, 68, 63, 64, 65, 66, 67, 68, 63, 64, 65, 66],
    [68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 67],
    [67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 66],
    [66, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65],
    [65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64],
    [64, 63, 68, 67, 66, 65, 64, 63, 68, 67, 66, 65, 64, 63, 68, 67, 66, 65, 64, 63, 68, 67]
  ],

  simple_border: [
    [69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69],
    [69, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69],
    [69, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69],
    [69, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69],
    [69, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69],
    [69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69]
  ]
};

module.exports = templates;
```

### 5. API Endpoints

#### Weather Test Endpoint
```javascript
// backend/api/external/weather.js
const { connectDB } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const weatherClient = require('../../lib/clients/weatherClient');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  try {
    await connectDB();
    
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const { location } = req.query;
    const weather = await weatherClient.getWeather(location);

    res.status(200).json(weather);

  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({
      error: {
        code: 'EXTERNAL_API_ERROR',
        message: error.message
      }
    });
  }
};
```

#### Custom Messages API
```javascript
// backend/api/custom-messages/index.js
const { connectDB } = require('../../lib/db');
const { requireAuth, requireRole } = require('../../lib/auth');
const CustomMessage = require('../../models/CustomMessage');
const { validateCustomMessageInput } = require('../../lib/validation');

module.exports = async (req, res) => {
  try {
    await connectDB();
    
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    switch (req.method) {
      case 'GET':
        return await getCustomMessages(req, res);
      case 'POST':
        await new Promise((resolve, reject) => {
          requireRole(['admin', 'editor'])(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        return await createCustomMessage(req, res);
      default:
        return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
    }
  } catch (error) {
    console.error('Custom Messages API error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

const getCustomMessages = async (req, res) => {
  const messages = await CustomMessage.find({ orgId: 'VBT' })
    .sort({ createdAt: -1 })
    .select('-__v');

  res.status(200).json(messages);
};

const createCustomMessage = async (req, res) => {
  const { title, message, style, maxLines } = req.body;
  
  const validation = validateCustomMessageInput({ title, message, style, maxLines });
  if (!validation.isValid) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { fieldErrors: validation.errors }
      }
    });
  }

  const customMessage = new CustomMessage({
    title: title.trim(),
    message: message.trim(),
    style,
    maxLines: maxLines || 4,
    createdBy: req.user.userId,
    orgId: 'VBT'
  });

  await customMessage.save();

  res.status(201).json({
    id: customMessage.id,
    title: customMessage.title,
    style: customMessage.style,
    createdAt: customMessage.createdAt
  });
};
```

### 6. Frontend Components

#### Weather Test Page
```javascript
// frontend/src/pages/external/WeatherTest.js
import React, { useState } from 'react';
import Layout from '../../components/layout/Layout';
import MatrixPreview from '../../components/ui/MatrixPreview';
import { useScreenPreview } from '../../hooks/useScreenPreview';

const WeatherTest = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [metarData, setMetarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { matrix, generatePreview } = useScreenPreview();

  const testWeather = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/external/weather', {
        credentials: 'include'
      });
      const data = await response.json();
      setWeatherData(data);
      await generatePreview('WEATHER');
    } catch (error) {
      console.error('Weather test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const testMetar = async () => {
    setLoading(true);
    try {
      await generatePreview('METAR');
    } catch (error) {
      console.error('METAR test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">External Data Testing</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Weather API Test</h2>
                <button
                  onClick={testWeather}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Testing...' : 'Test Weather API'}
                </button>
                
                {weatherData && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900">Weather Data:</h3>
                    <pre className="text-sm text-gray-600 mt-2">
                      {JSON.stringify(weatherData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">METAR API Test</h2>
                <button
                  onClick={testMetar}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Testing...' : 'Test METAR API'}
                </button>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Screen Preview</h2>
              <MatrixPreview matrix={matrix} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default WeatherTest;
```

## Testing Checklist
- [ ] METAR API integration working
- [ ] OpenWeatherMap API integration working
- [ ] Weather screen templates rendering correctly
- [ ] Custom message system functional
- [ ] API caching working properly
- [ ] Error handling for external API failures
- [ ] Weather condition template selection working
- [ ] Custom message border styles displaying
- [ ] Cache management and TTL working

## Definition of Done
- External API clients implemented with caching
- Weather screen templates working
- Custom message system complete
- Error handling for API failures
- Cache management system functional
- All external data screens rendering correctly
- API endpoints for testing external data
- Frontend components for testing external APIs
