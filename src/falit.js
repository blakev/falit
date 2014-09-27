// //(function(exports){
// exports.optional = optionalTypes;
// exports.required = requiredTypes;
// //})(typeof exports === 'undefined' ? this['falet'] = {} : exports)
// var defaultReturn = function(){},
//     args = arguments;

// if (args.length <= 0) {
//     return defaultReturn;
// } else {
//     if (typeof args[args.length - 1] != 'function') {
//         throw new Error('Last parameter requires a function to bind to.')
//     }

//     _.each(args, function(x) { console.log(x()); })


//     console.log(args);


// }




// var DEFAULT_RAISE = true;

// var checksParam = function(checks, raises) {
//     var raises = (typeof raises === 'undefined') ? DEFAULT_RAISE : raises;

//     return _.partial(function(raises, original, supplied) {
//         var ret = typeof original === typeof supplied;

//         if (raises && !ret) {
//             raiseString = 'Type (' + typeof supplied + ') does not match required (' + typeof original + ')';
//             throw new Error(raiseString);
//         }

//         return ret;

//     }, raises, checks)
// }

// var optionalParam = function(checksFunc) {
//     return _.partial(function(func, x) {
//         return func(x)
//     }, checksFunc);
// }

// var requiredParam = function(checksFunc, conditional) {

// }
var _ = require('underscore');

function isFloat(x) {
   return typeof x === 'number' && isFinite(x) && x % 1 >= 0;
}

function isInt(x) {
    return typeof x === 'number' && isFinite(x) && x % 1 === 0;
}

var isFunctions = function(arg) {
    var bits = [
        _.isArguments(arg),
        _.isArray(arg),
        _.isBoolean(arg),
        _.isDate(arg),
        _.isElement(arg),
        _.isFinite(arg),
        _.isFunction(arg),
        _.isNaN(arg),
        _.isNull(arg),
        _.isNumber(arg),
        _.isObject(arg),
        _.isRegExp(arg),
        _.isString(arg),
        _.isUndefined(arg),
        isFloat(arg),
        isInt(arg),
    ]

    bits = _.map(bits, function(b, index) {
        return (b === true) ? Math.pow(2, index) : 0;
    })

    return _.reduce(bits, function(memo, x) { // create a bitmask
        return memo + x;
    }, 0);
}

var isFunctionsOrder = [
    'date', 'regx', 'nan', 'null', 'undefined'
    'elem', 'array', 'object', 'arguments','func',
    'str', 'num', 'float', 'int', 'finite', 'boolean', 
]

var req = function() {
    if (customLimitFunc && _.isFunction(customLimitFunc)) {
        var passFunc = customLimitFunc;
    } else {
        var passFunc = null;
    }

    var innerReq = function(check, passFunc) {
        
    }

    return {
        elem:
        array:
        object:
        arguments:
        func:
        str:
        num:
        float:
        int:
        finite:
        bool:
        date:
        regx:
        nan:
        null:
        undefined:
    }
}()

var placeHolders = function() {
    var ret = _.map(isFunctionsOrder, function(e, index) {
        return Math.pow(2, index);
    })

    var retObj = {};

    _.each(_.zip(ret, isFunctionsOrder), function(e, index) {
        retObj[e[0]] = e[1]; // bitsValue: name
    })

    return retObj;
}()


extendSignature = function(a, b) { // extend the passed arguments with null, not 0 bits.
    nullBits = _.map(a, function() {
        return null;
    }).slice(0, a.length - b.length)

    return b.concat(nullBits);
}

binder = function() {
    if (!_.isFunction(_.last(arguments))) {
        throw new Error('Last argument is not a function; nothing to bind to.')
    }

    var getSignature = _.map(_.initial(arguments), isFunctions);

    return _.partial(function(bindSignature, bindFunc) {
        var newSignature = _.map(_.rest(arguments, 2), isFunctions);

        var extendedSig = extendSignature(bindSignature, newSignature);

        _.each(extendedSig, function(arg) {

                console.log(
                    _.map(_.keys(placeHolders), function(bits) {
                        return (arg & parseInt(bits)) ? placeHolders[bits] : 0;
                    })
                )

        })


        console.log(bindSignature);
        console.log(extendedSig);

    }, getSignature, _.last(arguments));
};


var a = binder(1,2,3,'a',1.1, function(){}, {}, [], function(){ console.log('hi') });

a(1,'a',3, null);

