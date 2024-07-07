# Use an official Node.js runtime as the base image
FROM registry.access.redhat.com/ubi8/nodejs-20:1-46.1717586532

USER root

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY *.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the app source code to the working directory
COPY ./src ./src
COPY ./dist ./dist
COPY ./misc ./misc
COPY ./.env ./.env
# Build the TypeScript app
RUN npm run build

# Expose the port that the app will listen on
EXPOSE 8080

# Start the app
CMD [ "npm", "start" ]