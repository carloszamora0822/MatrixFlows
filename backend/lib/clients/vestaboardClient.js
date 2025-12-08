const axios = require('axios');

class VestaboardClient {
  constructor() {
    this.baseURL = 'https://rw.vestaboard.com';
  }

  /**
   * Post a message to a Vestaboard
   * @param {string} writeKey - Vestaboard Read/Write API key
   * @param {Array<Array<number>>} matrix - 6x22 character code matrix
   * @returns {Promise<object>} Response from Vestaboard API
   */
  async postMessage(writeKey, matrix) {
    if (!writeKey) {
      throw new Error('Vestaboard write key is required');
    }

    if (!this.validateMatrix(matrix)) {
      throw new Error('Invalid matrix format');
    }

    try {
      const postTime = new Date();
      
      // Check time since last post for this API key
      if (global.lastVestaboardPost && global.lastVestaboardPost[writeKey]) {
        const timeSinceLastPost = (postTime.getTime() - global.lastVestaboardPost[writeKey]) / 1000;
        console.log(`📤 Posting to Vestaboard at ${postTime.toISOString()}`);
        console.log(`⏱️  Time since last post: ${timeSinceLastPost.toFixed(1)}s`);
        
        if (timeSinceLastPost < 15) {
          console.warn(`⚠️  WARNING: Only ${timeSinceLastPost.toFixed(1)}s since last post (minimum 15s recommended)`);
        }
      } else {
        console.log(`📤 Posting to Vestaboard at ${postTime.toISOString()} (first post for this key)`);
      }
      
      const response = await axios.post(
        `${this.baseURL}/`,
        matrix,
        {
          headers: {
            'X-Vestaboard-Read-Write-Key': writeKey,
            'Content-Type': 'application/json'
          },
          timeout: 15000,
          validateStatus: (status) => status < 500 // Accept any status < 500 as valid
        }
      );

      const responseTime = new Date();
      const duration = responseTime.getTime() - postTime.getTime();
      
      // Handle 304 Not Modified
      if (response.status === 304) {
        console.log(`✅ Vestaboard 304 Not Modified (${duration}ms) at ${responseTime.toISOString()}`);
        return {
          success: true,
          status: 304,
          data: { message: 'Not modified - board already displaying this content' }
        };
      }
      
      console.log(`✅ Vestaboard update successful (${duration}ms) at ${responseTime.toISOString()}`);
      
      // Store last post time globally for rate limit tracking
      if (!global.lastVestaboardPost) global.lastVestaboardPost = {};
      global.lastVestaboardPost[writeKey] = responseTime.getTime();
      
      return {
        success: true,
        status: response.status,
        data: response.data
      };

    } catch (error) {
      console.error(`❌ Vestaboard update failed:`, error.message);
      
      if (error.response) {
        // 304 = Not Modified (board already displaying this content) - treat as success!
        if (error.response.status === 304) {
          console.log(`✅ Vestaboard already displaying this content (304 Not Modified)`);
          return {
            success: true,
            status: 304,
            data: { message: 'Not modified - board already displaying this content' }
          };
        }
        
        // API returned an error
        throw new Error(`Vestaboard API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        // Request made but no response
        throw new Error('Vestaboard API timeout or network error');
      } else {
        // Something else went wrong
        throw new Error(`Vestaboard client error: ${error.message}`);
      }
    }
  }

  /**
   * Validate matrix format
   * @param {Array<Array<number>>} matrix
   * @returns {boolean}
   */
  validateMatrix(matrix) {
    if (!Array.isArray(matrix)) return false;
    if (matrix.length !== 6) return false;

    for (const row of matrix) {
      if (!Array.isArray(row)) return false;
      if (row.length !== 22) return false;
      
      for (const code of row) {
        if (typeof code !== 'number') return false;
        if (code < 0 || code > 70) return false;
      }
    }

    return true;
  }

  /**
   * Test connection to Vestaboard
   * @param {string} writeKey
   * @returns {Promise<boolean>}
   */
  async testConnection(writeKey) {
    try {
      // Create a simple test matrix (blank screen)
      const testMatrix = new Array(6).fill(null).map(() => new Array(22).fill(0));
      await this.postMessage(writeKey, testMatrix);
      return true;
    } catch (error) {
      console.error('Vestaboard connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = new VestaboardClient();
