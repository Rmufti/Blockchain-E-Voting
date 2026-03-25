FROM node:18
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy your actual smart contract code
COPY . .

# Expose the port Fabric uses to talk to the chaincode
EXPOSE 9999

# Start the server and explicitly pass the Docker environment variables
CMD npm start -- --chaincode-address=$CHAINCODE_SERVER_ADDRESS --chaincode-id=$CORE_CHAINCODE_ID_NAME