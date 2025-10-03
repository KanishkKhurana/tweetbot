# Twitter Scraper API

A Node.js API that fetches tweet content using the Twitter API v2. This service can extract tweet content from tweet IDs or Twitter URLs.

## Features

- ✅ Fetch tweet content by ID or URL
- ✅ Extract tweet ID from various Twitter URL formats
- ✅ Comprehensive tweet data including author, metrics, media, and entities
- ✅ Error handling for private tweets, rate limits, and invalid IDs
- ✅ RESTful API with multiple endpoints
- ✅ CORS enabled for web applications

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Twitter API Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use an existing one
3. Generate API keys and access tokens
4. Copy `env.example` to `.env` and fill in your credentials:

```bash
cp env.example .env
```

Edit `.env` with your Twitter API credentials:

```env
TWITTER_BEARER_TOKEN=your_bearer_token_here
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here
PORT=3000
```

### 3. Run the Server

```bash
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### GET /tweet/:tweetId
Fetch tweet content by ID

**Example:**
```bash
curl http://localhost:3000/tweet/1234567890
```

### POST /tweet
Fetch tweet content by URL or ID in request body

**Example:**
```bash
curl -X POST http://localhost:3000/tweet \
  -H "Content-Type: application/json" \
  -d '{"tweetUrl": "https://twitter.com/username/status/1234567890"}'
```

Or with tweet ID:
```bash
curl -X POST http://localhost:3000/tweet \
  -H "Content-Type: application/json" \
  -d '{"tweetId": "1234567890"}'
```

### GET /health
Health check endpoint

### GET /
API documentation

## Response Format

### Success Response
"Tweet content here..."

### Error Response
```json
{
  "success": false,
  "error": "Tweet not found or may be private",
  "code": 404
}
```

## Supported URL Formats

The API can extract tweet IDs from various Twitter URL formats:

- `https://twitter.com/username/status/1234567890`
- `https://x.com/username/status/1234567890`
- `https://t.co/abc123` (shortened URLs)
- Direct tweet ID: `1234567890`

## Error Handling

The API handles various error scenarios:

- **404**: Tweet not found or private
- **403**: Access denied (private/deleted tweet)
- **429**: Rate limit exceeded
- **400**: Invalid tweet URL/ID format
- **500**: Internal server error

## Rate Limits

Twitter API v2 has rate limits. The API will return a 429 error when rate limits are exceeded. Consider implementing caching or request queuing for production use.

## License

ISC
