FROM node:20
WORKDIR /app

CMD [ "node", "observationsConsumer.js" ]