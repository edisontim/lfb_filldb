# use node 16 image
FROM node:16.15.1-alpine 

# setup working directory as /app
WORKDIR /app

# copy app files
COPY . .

# npm install
RUN npm ci

CMD ["npm", "run", "start:prod"]