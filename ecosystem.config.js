module.exports = {
  apps: [
    {
      name: "mind-bluevaloris",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3030",
      exec_mode: "cluster",
      instances: 2,
      autorestart: true,
      watch: false,
      max_memory_restart: "750M",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: "3030",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
};
