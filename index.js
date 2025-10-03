require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Twitter API client
const twitterClient = new TwitterApi({
  appKey: process.env.API_KEY,
  appSecret: process.env.KEY_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_TOKEN_SECRET,
});

// Read-only client for fetching tweets
const readOnlyClient = twitterClient.readOnly;

/**
 * Extract tweet ID from various Twitter URL formats
 * @param {string} input - Tweet URL or ID
 * @returns {string|null} - Extracted tweet ID or null if invalid
 */
function extractTweetId(input) {
  if (!input) return null;
  
  // If it's already just a numeric ID
  if (/^\d+$/.test(input.trim())) {
    return input.trim();
  }
  
  // Extract from various Twitter URL formats
  const patterns = [
    /twitter\.com\/\w+\/status\/(\d+)/,
    /x\.com\/\w+\/status\/(\d+)/,
    /t\.co\/\w+/,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Try URL parsing for more robust extraction
  try {
    const url = new URL(input);
    const pathParts = url.pathname.split('/').filter(part => part);
    const statusIndex = pathParts.indexOf('status');
    
    if (statusIndex !== -1 && pathParts[statusIndex + 1]) {
      const tweetId = pathParts[statusIndex + 1];
      if (/^\d+$/.test(tweetId)) {
        return tweetId;
      }
    }
  } catch (e) {
    // Not a valid URL, continue
  }
  
  return null;
}

/**
 * Fetch tweet content by ID
 * @param {string} tweetId - The tweet ID
 * @returns {Object} - Tweet data or error
 */
async function fetchTweetContent(tweetId) {
  try {
    const tweet = await readOnlyClient.v2.singleTweet(tweetId, {
      'tweet.fields': [
        'created_at',
        'author_id',
        'public_metrics',
        'context_annotations',
        'entities',
        'lang',
        'possibly_sensitive',
        'referenced_tweets',
        'reply_settings',
        'source'
      ],
      'user.fields': [
        'name',
        'username',
        'verified',
        'public_metrics',
        'profile_image_url'
      ],
      'media.fields': [
        'type',
        'url',
        'preview_image_url',
        'alt_text'
      ],
      'expansions': ['author_id', 'attachments.media_keys']
    });

    return {
      success: true,
      data: {
        id: tweet.data.id,
        text: tweet.data.text,
        created_at: tweet.data.created_at,
        author: tweet.includes?.users?.[0] || null,
        public_metrics: tweet.data.public_metrics,
        entities: tweet.data.entities,
        media: tweet.includes?.media || [],
        lang: tweet.data.lang,
        possibly_sensitive: tweet.data.possibly_sensitive,
        referenced_tweets: tweet.data.referenced_tweets,
        reply_settings: tweet.data.reply_settings,
        source: tweet.data.source
      }
    };
  } catch (error) {
    console.error('Error fetching tweet:', error);
    
    if (error.code === 404) {
      return {
        success: false,
        error: 'Tweet not found or may be private',
        code: 404
      };
    } else if (error.code === 403) {
      return {
        success: false,
        error: 'Access denied - tweet may be private or deleted',
        code: 403
      };
    } else if (error.code === 429) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        code: 429
      };
    } else {
      return {
        success: false,
        error: error.message || 'Failed to fetch tweet',
        code: error.code || 500
      };
    }
  }
}

// API Routes

/**
 * GET /tweet/:tweetId
 * Fetch tweet content by ID
 */
app.get('/tweet/:tweetId', async (req, res) => {
  const { tweetId } = req.params;
  
  if (!tweetId) {
    return res.status(400).json({
      success: false,
      error: 'Tweet ID is required'
    });
  }

  const result = await fetchTweetContent(tweetId);
  
  if (result.success) {
    res.json(result.data.text);
  } else {
    res.status(result.code || 500).json(result);
  }
});

/**
 * POST /tweet
 * Fetch tweet content by URL or ID
 */
app.post('/tweet', async (req, res) => {
  // Support multiple field names for flexibility
  const { tweetUrl, url, link, tweetId } = req.body;
  const input = tweetUrl || url || link || tweetId;
  
  if (!input) {
    return res.status(400).json({
      success: false,
      error: 'Tweet URL or ID is required. Use: {"tweetUrl": "https://x.com/username/status/1234567890"}'
    });
  }

  const extractedId = extractTweetId(input);
  
  if (!extractedId) {
    return res.status(400).json({
      success: false,
      error: 'Invalid tweet URL or ID format. Please provide a valid Twitter/X URL or tweet ID.'
    });
  }

  const result = await fetchTweetContent(extractedId);
  
  if (result.success) {
    res.json(result.data.text);
  } else {
    res.status(result.code || 500).json(result);
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Twitter Scraper API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /
 * API documentation
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Twitter Scraper API',
    version: '1.0.0',
    endpoints: {
      'GET /tweet/:tweetId': 'Fetch tweet by ID',
      'POST /tweet': 'Fetch tweet by URL or ID in request body',
      'GET /health': 'Health check',
      'GET /': 'API documentation'
    },
    examples: {
      'GET /tweet/1234567890': 'Fetch tweet with ID 1234567890',
      'POST /tweet': {
        body: {
          tweetUrl: 'https://twitter.com/username/status/1234567890',
          tweetId: '1234567890'
        }
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Twitter Scraper API running on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  
  // Check if environment variables are set
  if (!process.env.BEARER_TOKEN && !process.env.API_KEY) {
    console.warn('⚠️  Warning: Twitter API credentials not found in environment variables');
    console.warn('   Please set up your .env file with Twitter API credentials');
    console.warn('   See env.example for reference');
  }
});

module.exports = app;
