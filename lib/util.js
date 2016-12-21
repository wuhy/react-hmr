/**
 * @file 工具方法定义
 * @author sparklewhy@gmail.com
 */

var fs = require('fs');

/**
 * 获取给定的文件路径的状态信息
 *
 * @inner
 * @param {string} target 文件的目标路径
 * @return {?Object}
 */
function getFileState(target) {
    try {
        var state = fs.statSync(target);
        return state;
    }
    catch (ex) {
    }
}

/**
 * 判断给定的文件路径是否存在
 *
 * @param {string} target 要判断的目标路径
 * @return {boolean}
 */
exports.isPathExists = function (target) {
    return !!getFileState(target);
};

/**
 * 判断给定的目录路径是否存在
 *
 * @param {string} target 要判断的目标路径
 * @return {boolean}
 */
exports.isDirectoryExists = function (target) {
    var state = getFileState(target);
    return state && state.isDirectory();
};

/**
 * 判断给定的文件路径是否存在
 *
 * @param {string} target 要判断的目标路径
 * @return {boolean}
 */
exports.isFileExists = function (target) {
    var state = getFileState(target);
    return state && state.isFile();
};

/**
 * 对给定路径进行规范化，统一用 `/` 方式
 *
 * @param {string} sourcePath 要规范化的路径
 * @return {string}
 */
exports.normalizePath = function (sourcePath) {
    return sourcePath.replace(/\\/g, '/');
};

/**
 * 压缩 js 代码
 *
 * @param {string} code 要压缩的代码
 * @param {Object} options 压缩选项
 * @return {string}
 */
exports.compressJS = function (code, options) {
    var uglifyJS = require('uglify-js');
    (options || (options = {}));
    options.fromString = true;
    return uglifyJS.minify(code, options).code;
};
