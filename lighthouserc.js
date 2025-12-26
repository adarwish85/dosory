module.exports = {
    ci: {
        collect: {
            url: ['http://localhost:3000/', 'http://localhost:3000/login'],
            startServerCommand: 'npm run start',
            startServerReadyPattern: 'ready started server',
            numberOfRuns: 3,
        },
        assert: {
            assertions: {
                // Performance budgets
                'categories:performance': ['warn', { minScore: 0.8 }],
                'categories:accessibility': ['error', { minScore: 0.9 }],
                'categories:best-practices': ['warn', { minScore: 0.9 }],
                'categories:seo': ['warn', { minScore: 0.9 }],

                // Core Web Vitals
                'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
                'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
                'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
                'total-blocking-time': ['warn', { maxNumericValue: 300 }],

                // Additional metrics
                'speed-index': ['warn', { maxNumericValue: 3000 }],
                'interactive': ['warn', { maxNumericValue: 3800 }],
            },
        },
        upload: {
            target: 'temporary-public-storage',
        },
    },
};
