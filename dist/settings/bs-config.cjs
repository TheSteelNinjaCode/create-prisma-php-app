module.exports = {
  proxy: "http://localhost",
  serveStatic: ["src/app"],
  files: "src/**/*.*",
  notify: false,
  open: false,
  ghostMode: false,
};
