(function(module) {
    var _ = require('underscore');

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
        ['obj', function(a){ return _.isObject(a) && !_.isFunction(a) && !_.isArray(a); }],
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
                    
                    if (typeof defaultValue === 'undefined') {
                        defaultValue = null;
                    }

                    return {    // return an object so we know if the type has been primed
                        name: name,
                        required: strict,
                        defaultValue: defaultValue, 
                        parse: function(argsPos, newValue) 
                        {
                            var customFuncMemo = (this.required) ? customFunc(newValue) : true,
                                verifyFuncMemo = verifyFunc(newValue);

                            if (verifyFuncMemo && customFuncMemo) {
                                return {defValue: false, value: newValue, passed: verifyFuncMemo};
                            } else {
                                var received = bitMaskFor(newValue);

                                if (!customFuncMemo && verifyFuncMemo) {
                                    var estr = [
                                        'Type validateFunction error!',
                                        'Supplied value did not pass validation.',
                                        'Expected "' + name + '" in position_' + argsPos + ' to pass.'
                                    ]
                                } else {
                                    var estr = [
                                        'Invalid type supplied!',
                                        'Expected [' + name + '] in position_' + argsPos + '.',
                                        'Received: [' + received.posTypes + '], with value: ' + received.value
                                    ]
                                }

                                if (this.required) {
                                    throw Error(estr.join('\n'));    
                                } else {
                                    return {defValue: true, value: defaultValue, passed: verifyFuncMemo};
                                }
                            }
                        }
                    }
                }, value.name, value.func, value.bits, strict
            );
        });

        return reqTypes;
    }


    var binder = function() {
        if (!_.isFunction(_.last(arguments))) {
            throw new Error('Last argument is not a function; nothing to bind to!');
        }

        var signature = _.initial(arguments);

        return _.partial(function(bindSignatureFuncs, bindFunc) {
            var validArgs = _.rest(arguments, 2),
                newSignature = getSignature(validArgs),
                argsCount = 0;

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
                    var errMsg = 'Missing required [' + transFuncs[bSigIndex].name + '] parameter at position_' + argsCount;
                    throw new Error(errMsg);
                } else {
                    newArgs.push(transFuncs[bSigIndex].defaultValue);;
                }

                bSigIndex++;
            }

            if (passes) {
                bindFunc.apply(this, newArgs);
            } else {
                console.log('oh nohes! defdefdef');
                bindFunc.apply(this, validArgs);
            }

        }, signature, _.last(arguments));
    }

    var req = requiredTypes(true), opt = requiredTypes(false);

    module.exports = {
        force: binder,
        required: req,
        optional: opt
    };
})(typeof exports === 'undefined' ? this['falit'] = {} : module);


