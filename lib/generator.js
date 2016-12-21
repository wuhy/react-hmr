/**
 * @file 对 react hot reload 代码打包合并核心
 * @author sparklewhy@gmail.com
 */

var fs = require('fs');
var path = require('path');
var parser = require('./parser');
var util = require('./util');

var MOD_DIR = 'node_modules';
var workDir = util.normalizePath(process.cwd());

function findupModuleDir(modFilePath) {
    var parentDir = modFilePath;
    if (util.normalizePath(modFilePath) !== workDir) {
        parentDir = path.dirname(modFilePath);
    }
    parentDir = util.normalizePath(parentDir);

    var modDir = path.join(parentDir, MOD_DIR);
    if (util.isDirectoryExists(modDir)) {
        return modDir;
    }

    if (parentDir !== workDir && parentDir.split('/').length > 1) {
        return findupModuleDir(parentDir);
    }
}

function findupModuleFilePath(currDir, modId) {
    var modDir = findupModuleDir(currDir);
    if (!modDir) {
        return;
    }

    try {
        var filePath = require.resolve(path.join(modDir, modId));
        return filePath;
    }
    catch (ex) {
        return findupModuleFilePath(modDir, modId);
    }
}

function getModId(modulePath) {
    modulePath = util.normalizePath(modulePath);
    var index = modulePath.lastIndexOf(MOD_DIR);
    if (index !== -1) {
        return modulePath.substr(index + MOD_DIR.length + 1);
    }
    throw new Error('illegal module path');
}

function getModPackageMetaData(modulePath) {
    modulePath = util.normalizePath(modulePath);
    var index = modulePath.lastIndexOf(MOD_DIR);
    if (index !== -1) {
        var parts = modulePath.substr(
            index + MOD_DIR.length + 1
        ).split('/');
        var pkgMetaFile = path.join(
            modulePath.substr(0, index + MOD_DIR.length + 1) + parts.shift(),
            'package.json'
        );
        if (util.isFileExists(pkgMetaFile)) {
            return require(pkgMetaFile);
        }
    }
}

function getDepFilePath(currModFilePath, depModId, ignoreMods) {
    if (/^\./.test(depModId)) {
        return require.resolve(path.join(path.dirname(currModFilePath), depModId));
    }

    var filterModId = depModId.split('/')[0];
    var ignore = ignoreMods.some(function (item) {
        return filterModId === item;
    });

    if (ignore) {
        return;
    }

    var filePath = null;
    try {
        filePath = require.resolve(depModId);
        return filePath;
    }
    catch (ex) {}

    return findupModuleFilePath(currModFilePath, depModId);
}

function normalizeRequireModuleId(requireModId, modFilePath) {
    if (!/^\./.test(requireModId)) {
        return requireModId;
    }
    var modId = getModId(modFilePath);
    var id = path.join(path.dirname(modId), requireModId);
    return util.normalizePath(id);
}

function amdWrap(code, modFilePath, modPathIdMap, ignoreAMDWrapFileMap) {
    var modId = getModId(modFilePath);
    var usedIds = modPathIdMap[modFilePath];

    if (!usedIds) {
        usedIds = [modId.replace(/\.js$/, '')];
    }
    else {
        // sort the used module id by the id length asc
        usedIds.sort(function (a, b) {
            return a.length - b.length;
        });
    }

    var defineModId = usedIds[0].replace(/(\.dev|\.prod)$/, '');
    if (defineModId.split('/').length === 1) {
        var pkgMetaInfo = getModPackageMetaData(modFilePath);
        if (pkgMetaInfo && pkgMetaInfo.main && pkgMetaInfo.main.split('/').length > 1) {
            var proxyModId = defineModId;
            defineModId = util.normalizePath(
                path.join(defineModId, pkgMetaInfo.main).replace(/\.js$/, '')
            );
            usedIds.push(proxyModId);
        }
    }
    if (!/^\s*define\s*\(\s*/.test(code) && !ignoreAMDWrapFileMap[modFilePath]) {
        code = 'define(\'' + defineModId + '\', function (require, exports, module) {'
            + code + '\n});\n';
    }

    // generate the proxy module
    for (var i = 1, len = usedIds.length; i < len; i++) {
        code += '\ndefine(\'' + usedIds[i]
            + '\', function (require) {return require(\''
            + defineModId + '\');});';
    }
    return code;
}

module.exports = exports = function (options) {
    var entries = options.entry;
    if (!Array.isArray(entries)) {
        entries = [entries];
    }

    // ensure the dep order
    entries = [].concat(entries).reverse().map(function (item) {
        return path.resolve(item);
    });

    // find dep and merge dep files recursively
    var result = [];
    var modPathIdMap = {};
    var filePathMap = {};
    var ignoreAMDWrapFileMap = {};
    while (entries.length) {
        var file = util.normalizePath(entries.shift());
        if (filePathMap[file]) {
            continue;
        }
        filePathMap[file] = 1;

        var content = fs.readFileSync(file).toString();
        var ast = parser.getAst(content);
        var depInfo = parser.getDepInfo(ast, true);
        if (depInfo.hasDefine) {
            ignoreAMDWrapFileMap[file] = 1;
        }

        var allDeps = [].concat(depInfo.syncDeps, depInfo.asynDeps);
        for (var i = 0, len = allDeps.length; i < len; i++) {
            var depId = allDeps[i];
            var depFilePath = getDepFilePath(file, depId, options.ignoreModules || []);

            if (depFilePath) {
                entries.push(depFilePath);

                var ids = modPathIdMap[depFilePath] || [];
                modPathIdMap[depFilePath] = ids;

                var requireId = normalizeRequireModuleId(depId, file);
                if (ids.indexOf(requireId) === -1) {
                    ids.push(requireId);
                }
            }
        }

        result.unshift({
            content: content,
            file: file
        });
    }

    // amd wrap
    result = result.map(function (item) {
        var filePath = item.file;
        return amdWrap(
            item.content, filePath,
            modPathIdMap, ignoreAMDWrapFileMap
        );
    });

    // compress and output combined code
    var combineCode = result.join('\n') + (options.entryCode || '');
    if (options.compressTarget) {
        var compressOpt = options.compress || {};
        (compressOpt === true) && (compressOpt = {});
        fs.writeFileSync(
            options.compressTarget,
            util.compressJS(combineCode, compressOpt)
        );
    }
    fs.writeFileSync(options.target, combineCode);
};
