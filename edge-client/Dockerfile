FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
