module.exports = {
  proxy: "http://localhost",
  serveStatic: ["src/app"],
  files: "src/**/*.*",
  notify: false,
  open: false,
  ghostMode: false,
  codeSync: true, // Disable synchronization of code changes across clients
};
