<?php

$welcome = 'Welcome to the Prisma PHP Backend Only Starter Kit! This starter kit provides a powerful foundation for building robust PHP applications with Prisma PHP ORM, a modern database toolkit. To create a new route, follow these steps:
1. Create a new folder inside the "src/app" directory with the name of your route.
2. Inside the newly created folder, create a route.php file. src/app/your-route/route.php
3. Define your route logic inside the route.php file.

This will serve as your API endpoint for the newly created route. Feel free to customize and extend the functionality as needed. Happy coding!

For more information, visit the official Prisma PHP documentation: https://prismaphp.tsnc.tech/docs?doc=get-started-api';

echo json_encode($welcome);
