FROM node:10
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package*.json /usr/src/app/
RUN npm install -g typescript
RUN npm install
COPY . /usr/src/app
RUN npm run build
EXPOSE 5000
CMD [ "npm", "start" ]