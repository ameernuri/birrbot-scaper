module.exports = {
  apps : [{
    name: "BirrBot",
      script: 'bun',           // Command to run bun
      args: 'run start',      // Arguments to pass to bun
      exec_mode: 'fork',       // Use fork mode
      interpreter: 'none',     // Do not use Node.js to interpret
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
