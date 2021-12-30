const SentryWebpackPlugin = require('@sentry/webpack-plugin');

module.exports = {
  // other webpack configuration
  devtool: 'source-map',
  plugins: [
    new SentryWebpackPlugin({
      // sentry-cli configuration - can also be done directly through sentry-cli
      // see https://docs.sentry.io/product/cli/configuration/ for details
      authToken: 'd68c0c946ed8436b84debeb7ebe7de83a45a381f85d94dbe834af04c24a8bf6f',
      org: 'whoosh-finance',
      project: 'whoosh-app',

      // other SentryWebpackPlugin configuration
      include: '.',
      ignore: ['node_modules', 'webpack.config.js'],
    }),
  ],
};
