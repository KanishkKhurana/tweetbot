# Use a lightweight Node.js base image
FROM node:20-alpine

# Create app directory
WORKDIR /twitter-scraper-js

# Install dependencies first for better caching
COPY package*.json ./

# Install only production dependencies
RUN npm i

# Copy application source
COPY . .

# Expose the service port
EXPOSE 3000

# Set NODE_ENV to production by default
ENV NODE_ENV=production

# Run the app
CMD ["npm", "start"]
