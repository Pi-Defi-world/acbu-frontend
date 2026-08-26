module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm dev',
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
      settings: {
        // run Chrome headless with no sandbox for CI
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertions: {
        // FCP < 1.8s
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        // LCP < 2.5s
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        // TBT < 200ms
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
