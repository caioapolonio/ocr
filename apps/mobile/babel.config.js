module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // inline-import permite `import migration from './0000_x.sql'` (migrations Drizzle)
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
