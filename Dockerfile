FROM node:20-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY . .
RUN npm run tsc

EXPOSE 7999
VOLUME [ "/data" ]
ENV DATA_DIR=/data

CMD [ "node", "dist/index.js" ]