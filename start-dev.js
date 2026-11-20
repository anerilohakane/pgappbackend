const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');
const mongoose = require('mongoose');

async function start() {
  console.log('[DevRunner] Starting MongoMemoryServer for full-cycle testing...');
  const mongod = await MongoMemoryServer.create({ instance: { port: 27017, dbName: 'pg_management' } });
  const uri = mongod.getUri();
  console.log('[DevRunner] MongoDB running at:', uri);

  // Seed default data
  process.env.MONGODB_URI = uri;
  require('./scripts/seed.js');

  // Let seed run for 2 seconds then start Next.js
  setTimeout(() => {
    console.log('[DevRunner] Launching Next.js server on port 5000...');
    const nextProcess = spawn('npx', ['next', 'start', '-p', '5000'], {
      cwd: __dirname,
      env: { ...process.env, MONGODB_URI: uri, PORT: '5000' },
      stdio: 'inherit',
      shell: true,
    });

    nextProcess.on('close', (code) => {
      console.log(`Next.js process exited with code ${code}`);
      mongod.stop();
    });
  }, 3000);
}

start();

