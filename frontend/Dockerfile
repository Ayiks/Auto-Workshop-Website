FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install

RUN npm ci 
COPY . .
# Build-time variable for React
RUN VITE_API_URL=/api npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
