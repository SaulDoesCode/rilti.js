const isTravis = process.env.CI === 'true'

if (!isTravis) {
  process.env.CHROME_BIN = require('puppeteer').executablePath()
}

module.exports = config => {
  config.set({
    frameworks: ['jasmine'],
    files: [
      'dist/rilti.js',
      {pattern: 'test/**/*.js'}
    ],
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: !isTravis,
    singleRun: isTravis,
    concurrency: Infinity,
    browsers: [isTravis ? 'FirefoxHeadless' : 'ChromeNoHead'],
    customLaunchers: {
      FirefoxHeadless: {
        base: 'Firefox',
        flags: ['-headless']
      },
      ChromeNoHead: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-translate', '--disable-web-security', '--disable-extensions', '--remote-debugging-port=9223']
      }
    }
  })
}
