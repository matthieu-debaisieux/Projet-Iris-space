# API PHP Slim servie par Apache
FROM php:8.5-apache

# Extension PostgreSQL + réécriture d'URL pour Slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq-dev unzip \
 && docker-php-ext-install pdo_pgsql \
 && a2enmod rewrite \
 && rm -rf /var/lib/apt/lists/*

# Apache sert le dossier public/
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
 && sed -ri 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html

# Dépendances d'abord (meilleur cache Docker)
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction

COPY . .
RUN composer dump-autoload --optimize --no-dev

EXPOSE 80
