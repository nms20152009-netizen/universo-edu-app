module.exports = {
  apps: [
    {
      name: "universo-edu",
      script: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
        DATABASE_URL: "file:./db/custom.db",
        NEXT_TELEMETRY_DISABLED: "1"
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_memory_restart: "1G",
      watch: false,
      ignore_watch: ["node_modules", ".next", "db", "logs"],
      max_restarts: 10,
      min_uptime: "10s",
      listen_timeout: 3000,
      kill_timeout: 5000
    }
  ],
  deploy: {
    production: {
      user: "ubuntu",
      host: "localhost",
      ref: "origin/main",
      repo: "git@github.com:nms20152009-netizen/universo-edu.git",
      path: "/home/ubuntu",
      "post-deploy": "bun install && bun run build && pm2 restart ecosystem.config.js --env production"
    }
  }
};
