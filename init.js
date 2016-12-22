const command = require('child_process').exec;
const fs = require('fs');

const exec = cmd => new Promise((resolve, reject) => command(cmd, (err, stdout) => err ? reject(err) : resolve(stdout)));

function formatBytes(bytes, decimals) {
    if (bytes == 0) return '0 Bytes';
    let k = 1000,
        i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toPrecision(decimals + 1 || 3) + ' ' + 'Bytes,KB,MB,GB,TB,PB,EB,ZB,YB'.split(',')[i];
}

//exec('caddy.exe');

fs.watch('./src/', (_, filename) => {
  if(filename.includes('.js')) {
    const minname = filename.split('.').map(e => e == 'js' ? 'min.js' : e).join('.');
    exec(`babili ./src/${filename} -o ./dist/${minname}`).then(() => {
      try {
        console.log("unminified "+ filename + " " + formatBytes(fs.statSync(`./src/${filename}`).size), "\tminified "  + minname + " " + formatBytes(fs.statSync(`./dist/${minname}`).size));
      } catch(e) {
        console.log('error with minification of ' + filename);
      }
    });
  }

});
