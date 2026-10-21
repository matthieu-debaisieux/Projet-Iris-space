# Étape 1 : build de l'application Vite
FROM node:22-alpine AS build
WORKDIR /app

# Dépendances d'abord (meilleur cache Docker)
COPY package.json package-lock.json ./
RUN npm ci

# Code source, puis build de production dans dist/
COPY . .
RUN npm run build

# Étape 2 : service statique via nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
