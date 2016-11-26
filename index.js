/* MIT License
 *
 * Copyright (c) 2016 schreiben
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

 "use strict";

(function(){

  const fs = require('fs');
  const path = require('path');
  const rmdir = require('rmdir');
  const zlib = require('zlib');
  const tar = require('tar-fs');
  const request = require('request');
  const ProgressBar = require('progress');

  const install = exports.install = (org, project, dir, artifact, callback) => {
    callback = callback || (() => {});
    var artifactDir = path.join(dir, artifact);
    rmdir(artifactDir);
    var infoUrl = 'https://api.github.com/repos/' + org + '/' + project + '/releases/latest';
    request({ url: infoUrl, headers: { 'User-Agent': 'node-grd' } }, (err, res, body) => {
      var info = JSON.parse(body);
      var artifactAsset = info.assets.find(
        item => item.name.startsWith(artifact) && item.name.endsWith('tar.gz')
      );
      if (artifactAsset) {
        request
          .get({
            url: artifactAsset.browser_download_url,
            headers: {
              connection: 'keep-alive',
              'User-Agent': 'node-grd'
            },
            agent: false
          })
          .on('response', res => {
            var len = parseInt(res.headers['content-length'], 10);
            var bar = new ProgressBar('  downloading and preparing ' + artifact + ' [:bar] :percent :etas', {
              complete: '=',
              incomplete: ' ',
              width: 80,
              total: len
            });
            res.on('data', chunk => bar.tick(chunk.length));
          })
          .on('error', err => {
            console.error(`problem with request: ${err.message}`);
            callback(err);
          })
          .on('end', callback)
          .pipe(zlib.createUnzip())
          .pipe(tar.extract(artifactDir));
      } else {
        var msg = 'There was no artifact of name ' + artifact + ' in the latest release of ' + org + '/' + project + '.';
        console.error(msg);
        callback(msg);
      }
    });
  };

  const smoketest = exports.smoketest = callback =>
    install(
      'schreiben',
      'node-grd',
      __dirname,
      'dummy',
      err => callback(!err || fs.readFileSync(path.join(__dirname, 'dummy', 'dummy.txt'), 'utf8') === 'Hello, World!')
    );

})();
