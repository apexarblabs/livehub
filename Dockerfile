FROM node:20-alpine
WORKDIR /app
COPY livehub-news-monitor.js .
EXPOSE 3025
CMD ["node", "livehub-news-monitor.js"]
