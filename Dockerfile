FROM node:20-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

EXPOSE 7999
VOLUME [ "/data" ]

CMD [ "node", "index.js" ]