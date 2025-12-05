FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    git unzip libicu-dev libzip-dev zlib1g-dev libpng-dev \
    && docker-php-ext-install intl pdo_mysql zip gd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html/html

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copier uniquement le projet Symfony déjà généré
COPY html/ /var/www/html/html

EXPOSE 8000

CMD php -S 0.0.0.0:8000 -t public


