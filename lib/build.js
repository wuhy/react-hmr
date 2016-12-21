/**
 * @file react-hot-loader 代码打包合并
 * @author sparklewhy@gmail.com
 */

module.exports = exports = {};

var path = require('path');
var generator = require('./generator');
var entryCode = 'define("react-hot-loader/patch", function (){return require("react-hot-loader/lib/patch");});';
generator({
    ignoreModules: [
        'react',
        'react-dom'
    ],
    entry: [
        path.join(require.resolve('react-hot-loader'), '..', 'lib/patch.dev.js'),
        path.join(require.resolve('react-hot-loader'), '..', 'lib/AppContainer.dev.js')
    ],
    target: 'dist/react-hot-loader.dev.js',
    compressTarget: 'dist/react-hot-loader.dev.min.js',
    entryCode: entryCode
});
generator({
    ignoreModules: [
        'react',
        'react-dom'
    ],
    entry: [
        path.join(require.resolve('react-hot-loader'), '..', 'lib/patch.prod.js'),
        path.join(require.resolve('react-hot-loader'), '..', 'lib/AppContainer.prod.js')
    ],
    target: 'dist/react-hot-loader.prod.js',
    compressTarget: 'dist/react-hot-loader.prod.min.js',
    entryCode: entryCode
});
