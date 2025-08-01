// config-overrides.js
module.exports = function override(config, env) {
  // Permitir solicitudes desde cualquier host (incluido ngrok)
  config.devServer = {
    ...config.devServer,
    allowedHosts: 'all', // Permite todos los hosts, incluyendo ngrok
  };
  return config;
};
