// File: src/index.ts


import bootstrap from './app';

// Start the application
bootstrap().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});