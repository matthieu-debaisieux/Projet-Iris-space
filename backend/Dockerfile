# API PHP Slim servie par Apache
FROM php:8.5-apache

# Extension PostgreSQL + réécriture d'URL pour Slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq-dev unzip \
 && docker-php-ext-install pdo_pgsql \
 && a2enmod rewrite \
 && rm -rf /var/lib/apt/lists/*

# Taille des envois : l'appli accepte 10 Mo par fichier et jusqu'à 5 pièces jointes par message
# (les valeurs par défaut de PHP, 2 Mo et 8 Mo, coupaient les envois avant les contrôles de l'appli)
RUN printf 'upload_max_filesize=12M\npost_max_size=64M\nmax_file_uploads=10\n' > /usr/local/etc/php/conf.d/uploads.ini

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
