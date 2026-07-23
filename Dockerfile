FROM node:alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY app.js ./
COPY public ./public
EXPOSE 443
CMD ["node", "app.js"]
