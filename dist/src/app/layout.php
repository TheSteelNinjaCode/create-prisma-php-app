<?php require_once "../../bootstrap.php"; ?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="<?php echo htmlspecialchars($metadata['description']); ?>">
    <title><?php echo htmlspecialchars($metadata['title']); ?></title>
    <link rel="shortcut icon" href="<?php echo $baseUrl; ?>favicon.ico" type="image/x-icon">
    <script>
        const baseUrl = '<?php echo $baseUrl; ?>';
    </script>
</head>

<body>
    <!-- don't place any HTML content here. This section is reserved to show the notFound content. -->
    <?php if (isset($notFound)) {
        echo $notFound;
        exit;
    } ?>

    <!-- Additional HTML content can go here. -->
    <?php echo $content; ?>
    <!-- Additional HTML content can go here. -->
</body>

</html>