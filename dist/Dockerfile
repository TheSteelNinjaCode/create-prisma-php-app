# Use an official PHP image with the version you need
FROM php:8.1-apache

# Install system dependencies for Composer and PHP extensions
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    zip \
    && docker-php-ext-install pdo_mysql zip

# Enable Apache mods
RUN a2enmod rewrite headers

# Install Composer globally
COPY --from=composer:latest /usr/bin/composer /usr/local/bin/composer

# Set the working directory in the container
WORKDIR /var/www/html

# Copy the application's composer.json and lock file
COPY composer.json composer.lock ./

# Install PHP dependencies
RUN composer install --no-scripts --no-autoloader

# Copy the rest of the application
COPY . .

# Finish composer
RUN composer dump-autoload --optimize

# Apache config
COPY ./apache.conf /etc/apache2/sites-available/000-default.conf

# Expose port 80 to access the container
EXPOSE 80

# Command to run when starting the container
CMD ["apache2-foreground"]