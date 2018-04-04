process.env.CHROME_BIN = require('puppeteer').executablePath()

module.exports = config => {
  config.set({
    frameworks: ['jasmine'],
    files: [
      'src/rilti.js',
      {
        pattern: 'test/**/*.js'
      }
    ],
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    singleRun: false,
    concurrency: Infinity,
    browsers: ['ChromeNoHead', 'FirefoxHeadless'],
    customLaunchers: {
      FirefoxHeadless: {
        base: 'Firefox',
        flags: ['-headless']
      },
      ChromeNoHead: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox']
      }
    }
  })
}
