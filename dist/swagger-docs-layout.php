<?php use Lib\MainLayout; ?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Prisma PHP Swagger UI</title>
</head>

<body>
    <?= $content; ?>
    <!-- Dynamic Footer -->
    <?= MainLayout::outputFooterScripts() ?>
</body>

</html>