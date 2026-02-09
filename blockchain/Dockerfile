# UPDATE: Use Node 20 to match package.json "engines" requirement
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the smart contract code
COPY . .

# Expose the port
EXPOSE 9999

# Start the server using the "start" script in package.json
CMD ["npm", "start"]