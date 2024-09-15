<?php

$mainLayoutHead = [
    "<link rel='stylesheet' type='text/css' href='$baseUrl/swagger-docs/dist/swagger-ui.css' />",
    "<link rel='stylesheet' type='text/css' href='$baseUrl/swagger-docs/dist/index.css' />",
    "<link rel='icon' type='image/png' href='$baseUrl/swagger-docs/dist/favicon-32x32.png' sizes='32x32' />",
    "<link rel='icon' type='image/png' href='$baseUrl/swagger-docs/dist/favicon-16x16.png' sizes='16x16' />",
]

?>

<div id="swagger-ui"></div>
<script src="<?php echo $baseUrl ?>/swagger-docs/dist/swagger-ui-bundle.js" charset="UTF-8"> </script>
<script src="<?php echo $baseUrl ?>/swagger-docs/dist/swagger-ui-standalone-preset.js" charset="UTF-8"> </script>
<script src="<?php echo $baseUrl ?>/swagger-docs/dist/swagger-initializer.js" charset="UTF-8"> </script>