<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="pp-description" content="<?php echo htmlspecialchars($metadata['description']); ?>">
    <title><?php echo htmlspecialchars($metadata['title']); ?></title>
    <link rel="icon" href="<?php echo $baseUrl; ?>favicon.ico" type="image/x-icon">
</head>

<body>
    <?php echo $content; ?>
</body>

</html>