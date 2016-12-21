/**
 * @file amd/commonjs 模块信息的解析
 * @author sparklewhy@gmail.com
 */

var estraverse = require('estraverse');
var constant = require('./constant');
var SYNTAX = estraverse.Syntax;
var LITERAL_DEFINE = constant.DEFINE;
var LITERAL_REQUIRE = constant.REQUIRE;
var BUILTIN_MODULES = constant.BUILTIN_MODULES;

/**
 * 判断结点是否字符串直接量
 *
 * @inner
 * @param {Object} node 语法树结点
 * @return {boolean}
 */
function isStringLiteral(node) {
    return node
        && node.type === SYNTAX.Literal
        && typeof node.value === 'string';
}

/**
 * 判断给定的参数是否是数组参数
 *
 * @inner
 * @param {Object} argument 参数
 * @return {boolean}
 */
function isArrayArgument(argument) {
    return argument.type === SYNTAX.ArrayExpression;
}

/**
 * 添加模块 id
 *
 * @inner
 * @param {Array.<string>} target  所有模块 id 数组
 * @param {string} id 要添加的模块 id
 * @param {Object} existedMap 所有添加过的模块 id map
 */
function addModuleId(target, id, existedMap) {
    if (!existedMap[id]) {
        existedMap[id] = true;
        target.push(id);
    }
}

/**
 * 遍历模块 id
 *
 * @inner
 * @param {Object} arrArg 数组参数
 * @param {Array.<string>} target  所有模块 id 数组
 * @param {Object} existedMap 所有添加过的模块 id map
 * @return {Array.<string>} 原始的 id 值数组，可能重复
 */
function traverseModuleId(arrArg, target, existedMap) {
    var value = arrArg.elements;
    var result = [];
    var id;
    for (var i = 0, len = value.length; i < len; i++) {
        var item = value[i];
        if (!isStringLiteral(item)) {
            continue;
        }

        id = item.value;
        result[i] = id;
        addModuleId(target, id, existedMap);
    }

    return result;
}

/**
 * 获取节点的 `require` 信息
 *
 * @inner
 * @param {Object} node ast 节点
 * @return {Object}
 */
function getRequireNodeInfo(node) {
    // `require('xxx')` or `new require('xxx')`
    if (node.type !== SYNTAX.CallExpression
        && node.type !== SYNTAX.NewExpression
    ) {
        return {};
    }

    var arg;
    if (node.callee.name === LITERAL_REQUIRE
        && (arg = node.arguments[0])
    ) {
        if (isStringLiteral(arg)) {
            return {syncRequire: true, arg: arg};
        }
        else if (isArrayArgument(arg)) {
            return {asynRequire: true, arg: arg};
        }
    }

    return {};
}

/**
 * 分析 define 调用，获取模块信息
 *
 * @inner
 * @param {Object} expr define ast
 * @return {Object} 模块信息
 */
function analyseDefineExpr(expr) {
    var moduleId;
    var defineDeps;
    var factoryAst;
    var syncDeps = [];
    var asynDeps = [];
    var syncDepMap = {};
    var asynDepMap = {};
    var args = expr.arguments;

    // 解析参数
    var argument;
    for (var i = 0; i < args.length; i++) {
        argument = args[i];

        if (!moduleId && isStringLiteral(argument)) {
            // 获取module id
            moduleId = argument.value;
        }
        else if (!defineDeps && isArrayArgument(argument)) {
            // 获取依赖
            defineDeps = traverseModuleId(argument, syncDeps, syncDepMap);
        }
        else {
            factoryAst = argument;
            break;
        }
    }

    // 计算 factory function 的形参个数
    var factoryParamCount = 0;
    if (factoryAst && factoryAst.type === SYNTAX.FunctionExpression) {
        factoryParamCount = factoryAst.params.length;
    }

    if (!defineDeps) {
        syncDeps = BUILTIN_MODULES.slice(0, factoryParamCount);
    }

    // 解析模块定义函数，获取内部 `require` 的依赖
    if (factoryAst.type === SYNTAX.FunctionExpression) {
        estraverse.traverse(factoryAst, {
            enter: function (node) {
                var requireInfo = getRequireNodeInfo(node);
                var arg = requireInfo.arg;
                if (requireInfo.syncRequire) {
                    addModuleId(syncDeps, arg.value, syncDepMap);
                }
                else if (requireInfo.asynRequire) {
                    traverseModuleId(arg, asynDeps, asynDepMap);
                }
            }
        });
    }

    return {
        id: moduleId,
        defineDeps: defineDeps, // define 声明的依赖
        syncDeps: syncDeps,     // 模块的所有同步依赖
        asynDeps: asynDeps,     // 模块的所有异步依赖
        factoryAst: factoryAst,
        factoryParamCount: factoryParamCount
    };
}

function addDep(target, deps) {
    deps.forEach(function (item) {
        if (target.indexOf(item) === -1) {
            target.push(item);
        }
    });
}

module.exports = exports = {};

/**
 * 解析 amd 模块信息
 *
 * @param {Object} ast 抽象语法树
 * @param {boolean=} parseNotDefineCode 是否解析非 define 代码，可选，默认 false
 * @return {?Array.<Object>}
 */
exports.getDepInfo = function (ast, parseNotDefineCode) {
    var defineExprs = [];
    var syncDeps = [];
    var asynDeps = [];
    var syncDepMap = {};
    var asynDepMap = {};
    estraverse.traverse(ast, {
        enter: function (node) {
            if (node.type === SYNTAX.CallExpression
                && node.callee.name === LITERAL_DEFINE
            ) {
                defineExprs.push(node);
                this.skip();
            }
            else if (parseNotDefineCode) {
                var requireInfo = getRequireNodeInfo(node);
                var arg = requireInfo.arg;
                if (requireInfo.syncRequire) {
                    addModuleId(syncDeps, arg.value, syncDepMap);
                    this.skip();
                }
                else if (requireInfo.asynRequire) {
                    traverseModuleId(arg, asynDeps, asynDepMap);
                    this.skip();
                }
            }
        }
    });

    var modules = [];
    defineExprs.forEach(function (expr) {
        modules.push(analyseDefineExpr(expr));
    });

    if (modules.length) {
        modules.forEach(function (item) {
            if (!item) {
                return;
            }
            addDep(syncDeps, item.syncDeps || []);
            addDep(asynDeps, item.asynDeps || []);
        });
    }

    return {
        hasDefine: !!modules.length,
        syncDeps: syncDeps,
        asynDeps: asynDeps
    };
};

/**
 * 获取给定代码的抽象语法树
 *
 * @param {string} code js 代码
 * @param {Object=} options 选项
 *        具体参考 http://esprima.org/doc/index.html
 * @return {Object}
 */
exports.getAst = function (code, options) {
    var assign = require('object-assign');
    return require('esprima').parse(
            code,
            assign({attachComment: true}, options || {})
        );
};
