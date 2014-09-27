(function(module) {
    var _ = require('underscore'),
        util = require('util');

    var debug = null;

    var options = {
        debug: false,
        enabled: true,
        throwErrors: true
    }

    var updateOptions = function(options) {
        debug = (process.env.NODE_DEBUG || options.debug) ? util.debug : function() {};
    }

    updateOptions(options);

    var paramTypes = [
        ['any', function(a) { return true; }],
        ['args', _.isArguments],
        ['array', _.isArray],
        ['bool', _.isBoolean],
        ['char', isChar],
        ['date', _.isDate],
        ['element', _.isElement],
        ['finite', _.isFinite],
        ['float', isFloat],
        ['func', _.isFunction],
        ['hex', isHex],
        ['int', isInt],
        ['NaN', _.isNaN],
        ['negNum', function(a) { return _.isNumber(a) && a < 1; }],
        ['null', _.isNull],
        ['num', _.isNumber],
        ['posNum', function(a) { return _.isNumber(a) && a >= 0; }],
        ['obj', function(a) { return _.isObject(a) && !_.isFunction(a) && !_.isArray(a); }],
        ['regex', _.isRegExp],
        ['str', _.isString],
        ['undefined', _.isUndefined]
    ]

    function alwaysTrue() {
        return true;
    }

    function isFloat(x) {
        return typeof x === 'number' && isFinite(x) && x % 1 >= 0;
    }

    function isInt(x) {
        return typeof x === 'number' && isFinite(x) && x % 1 === 0;
    }

    function isChar(x) {
        return typeof x === 'string' && x.length == 1;
    }

    function isHex(x) {
        return typeof x === 'string' && x.slice(0, 2).toLowerCase() == '0x' && function(hexVal) {
            return hexVal.length === _.filter(hexVal.split('')
                , function(v) { 
                    return '0123456789abcdefABCDEF'.indexOf(v) !== -1; 
                }).length;
        }(x.slice(2));
    }

    var getSignature = function(args) {
        return _.map(args, bitMaskFor);
    }

    var bitMaskFor = function(value) {
        var retMaskTypes = [],
            retBitMask = 0;

        _.each(varChecksObj, function(v, key, list) {
            if (v.func(value)) {
                retBitMask += v.bits;
                retMaskTypes.push(v.name);
            }
        })

        return {posTypes: retMaskTypes, bitMask: retBitMask, value: value};
    }

    var varChecksObj = function() {
        var retObj = {};

        _.each(paramTypes, function(pType, index) {
            retObj[pType[0]] = {
                name: pType[0],
                func: pType[1],
                bits: Math.pow(2, index)
            }
        })

        return retObj;
    }()

    var requiredTypes = function(strict) {
        var reqTypes = {};

        _.each(varChecksObj, function(value, key, list) {
            reqTypes[key] = _.partial(
                function(name, verifyFunc, bits, strict, customFunc) {
                    var defaultValue = null;

                    if (strict) {
                        if (!_.isFunction(customFunc)) {
                            customFunc = alwaysTrue;
                        }    
                    } else { // optional parameter with default
                        if (verifyFunc(customFunc)) {
                            defaultValue = customFunc;
                        }
                    }
                    
                    // if no defaultValue was supplied, null it out
                    if (typeof defaultValue === 'undefined') {
                        defaultValue = null;
                    }

                    // return an object so we know if the type has been primed
                    return {
                        // name of the argument type, such as obj array int .. etc    
                        name: name,
                        // required = true, optional = false
                        required: strict, 
                        // default value is null on any required argument and optionals without a default
                        defaultValue: defaultValue, 
                        parse: function(argsPos, newValue) 
                        {
                            var customFuncMemo = (this.required) ? customFunc(newValue) : true,
                                verifyFuncMemo = verifyFunc(newValue);

                            if (verifyFuncMemo && customFuncMemo) {
                                return {
                                    defValue: false, 
                                    value: newValue, 
                                    passed: verifyFuncMemo
                                };
                            } else {
                                var received = bitMaskFor(newValue);

                                if (!customFuncMemo && verifyFuncMemo) {
                                    var estr = [
                                        'Failed validation,', 
                                        '  Supplied value did not pass',
                                        '  Expected: [' + name + '], position: ' + argsPos
                                    ]
                                } else {
                                    var estr = [
                                        'Invalid type,',
                                        '  Expected: [' + name + '], position: ' + argsPos,
                                        '  Received: [' + received.posTypes + '], value: ' + received.value
                                    ]
                                }

                                if (this.required) {
                                    var msg = estr.join('\n');

                                    if (options.throwErrors) {
                                        throw Error(msg);        
                                    } else {
                                        console.log(msg);
                                    }
                                    
                                }
                            
                                return {
                                    defValue: true, 
                                    value: defaultValue, 
                                    passed: verifyFuncMemo
                                };
                            
                            }
                        }
                    }
                }, value.name, value.func, value.bits, strict
            );
        });

        return reqTypes;
    }


    var template = function() {
        var originalArgs = _.rest(arguments, 0);

        return {
            'for': binder(req.func, function(func) {
                return binder.apply(this, originalArgs.concat([func]));            
            })
        }
    }

    var binder = function() {
        if (!_.isFunction(_.last(arguments))) {
            return {
                with: function() { console.log('hi') }
            }
        }

        var signature = _.initial(arguments);

        return _.partial(function(bindSignatureFuncs, bindFunc) {
            var validArgs = _.rest(arguments, 2),  // skips over bindSignatureFuncs and bindFunc
                newSignature = getSignature(validArgs), // gets the signature of the called function
                argsCount = 0; // used for error reporting, to identify argument position

            if (!options.enabled) {
                return bindFunc.apply(this, validArgs);
            }

            var transFuncs = _.map(bindSignatureFuncs, function(f) {
                return (typeof f === 'function') ? f() : f;
            })

            var bSigIndex = 0, // boundSignature array index
                passes = true;

            var newArgs = [];

            _.each(newSignature, function(f, index) {
                if (bSigIndex > transFuncs.length - 1) {
                    return; 
                }

                if (transFuncs[bSigIndex].required) {

                    var posPass = transFuncs[bSigIndex++].parse(argsCount++, f.value);
                        newArgs.push(posPass.value);

                    passes = passes && posPass;

                } else { // optional parameter
                    while (bSigIndex < transFuncs.length) {

                        var posPass = transFuncs[bSigIndex++].parse(argsCount++, f.value);

                            newArgs.push(posPass.value);

                        if (posPass.passed) {
                            break;
                        }
                    }
                }
            })

            while (bSigIndex < transFuncs.length) {
                if (transFuncs[bSigIndex].required) {
                    var errMsg = 'Missing required [' + transFuncs[bSigIndex].name + '], in position: ' + argsCount;
                    if (options.throwErrors) {
                        throw new Error(errMsg);    
                    } else {
                        console.log('ERR: ' + errMsg);
                    }
                    
                } else {
                    newArgs.push(transFuncs[bSigIndex].defaultValue);;
                }

                bSigIndex++;
            }

            if (passes) {
                return bindFunc.apply(this, newArgs);
            }
        }, signature, _.last(arguments));
    }

    // instantiate the optional and required types to return through require('falitjs')
    var opt = requiredTypes(false), req = requiredTypes(true);

    module.exports = {
        binder: binder,
        optional: opt,
        required: req,
        template: template,
        settings: binder(req.obj, function(settings) { // updating settings uses required obj
            options = _.extend({}, options, settings);
            updateOptions(options);
            debug(JSON.stringify(options));
        }),
        whatIs: binder(req.any, function(e) {
            return bitMaskFor(e);
        })
    };
})(typeof exports === 'undefined' ? this['falit'] = {} : module);


