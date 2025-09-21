# Use official Node.js LTS image
FROM node:21

# Set working directory
WORKDIR /usr/src/app

# Copy package.json first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the project
COPY . .

# Expose server port
EXPOSE 5000

# Start Node server
CMD ["node", "index.js"]
