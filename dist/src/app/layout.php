<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="pp-description" content="<?= htmlspecialchars($metadata['description']); ?>">
    <title><?= htmlspecialchars($metadata['title']); ?></title>
    <link rel="icon" href="<?= $baseUrl; ?>/favicon.ico" type="image/x-icon">
</head>

<body>
    <?= $content; ?>
    <!-- Dynamic Footer -->
    <?= implode("\n", $mainLayoutFooter); ?>
</body>

</html>