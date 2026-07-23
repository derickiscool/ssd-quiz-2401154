FROM node:alpine
RUN adduser -D -g app app
WORKDIR /app
COPY package.json ./
RUN npm install --production && chown -R app:app /app
COPY app.js ./
COPY public ./public
COPY ssl ./ssl
RUN chown -R app:app /app
USER app
EXPOSE 3000
CMD ["node", "app.js"]
