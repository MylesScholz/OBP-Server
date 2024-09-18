FROM node:20
WORKDIR /app

COPY package.json .
RUN npm install

COPY ./api ./api
COPY ./observationsConsumer.js .

CMD [ "npm", "run", "start" ]