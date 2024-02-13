<?php

require_once "../../bootstrap.php";

$result = determineContentToInclude();
$contentToInclude = $result['path'] ?? '';

ob_start();
if (!empty($contentToInclude)) {
    require_once $contentToInclude;
} else {
    require_once "not-found.php";
}
$content = ob_get_clean();
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="<?php echo htmlspecialchars($metadata['description']); ?>">
    <title><?php echo htmlspecialchars($metadata['title']); ?></title>
    <link rel="shortcut icon" href="<?php echo $baseUrl; ?>favicon.ico" type="image/x-icon">
    <script>
        // Define a global variable to store the base URL.
        const baseUrl = '<?php echo $baseUrl; ?>';
    </script>
</head>

<body>
    <?php echo $content; ?>
    <!-- Additional HTML content can go here. -->
</body>

</html>