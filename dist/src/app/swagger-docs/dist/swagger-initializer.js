window.onload = function () {
  //<editor-fold desc="Changeable Configuration Block">

  const host = window.location.hostname;
  const port = window.location.port;

  // Set the URL dynamically based on the environment
  let swaggerUrl;

  if (host === "localhost") {
    // For local development, handle different possible ports
    swaggerUrl = `http://${host}:${
      port || 3000
    }/swagger-docs/apis/pphp-swagger.json`;
  } else {
    // For production, use the domain without hardcoding the port
    swaggerUrl = `https://${host}/swagger-docs/pphp-swagger.json`;
  }

  window.ui = SwaggerUIBundle({
    url: swaggerUrl,
    dom_id: "#swagger-ui",
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: "StandaloneLayout",

    // Add custom header using requestInterceptor
    requestInterceptor: (request) => {
      request.headers["HTTP_PPHP_X_FILE_REQUEST"] = "true"; // Set your custom header here
      return request;
    },
  });

  //</editor-fold>
};
