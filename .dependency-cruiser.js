/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    exclude: { path: ['node_modules', '\\.d\\.ts$'] },
    outputType: 'json',
    reporterOptions: { verbose: true },
  },
  forbidden: [
    { name: 'no-cycles', severity: 'error', from: {}, to: { circular: true } },
    { name: 'pages-no-pages', severity: 'error', from: { path: '^src/pages' }, to: { path: '^src/pages' } },
    { name: 'no-feature-to-feature', severity: 'error', from: { path: '^src/features/[^/]+' }, to: { path: '^src/features/[^/]+' } },
    { name: 'pages-layering', severity: 'error', from: { path: '^src/pages' }, to: { pathNot: '^(src/(features|shared|entities))' } },
    { name: 'features-layering', severity: 'error', from: { path: '^src/features' }, to: { path: '^(src/pages)' } },
  ],
};
