const isTravis = process.env.CI === 'true'

module.exports = config => {
  config.set({
    frameworks: ['jasmine'],
    files: [
      'src/rilti.js',
      {pattern: 'test/**/*.js'}
    ],
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: !isTravis,
    singleRun: isTravis,
    concurrency: Infinity,
    browsers: ['FirefoxHeadless'],
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
