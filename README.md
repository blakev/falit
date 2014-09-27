Falit.js
=====
[![Downloads](http://img.shields.io/npm/dm/falitjs.svg)](https://www.npmjs.org/package/falitjs)
[![License MIT](http://img.shields.io/badge/license-MIT-green.svg)](https://github.com/blakev/falitjs/blob/master/LICENSE)
[![NPM Version](http://img.shields.io/npm/v/falitjs.svg)](https://www.npmjs.org/package/falitjs)

Static-typing and optional parameters in native JavaScript.

```
npm install falitjs
```

```javascript
var falit = require('falitjs'),
    req = falit.required,
    opt = falit.optional,
    _ = require('underscore');

// configure falit settings
falit.settings({
    debug: true,
    throwErrors: false
})

// common usage pattern
var add = falit.binder(
        req.int, // a 
        req.int, // b
        function(a, b) {
        
            return a + b;
        });

add(5, 5)

// template usage pattern
var tmpl = falit.template(req.int, req.int, opt.func(console.log)),

    mul = tmpl.for(function(a, b, callback){ return callback(a * b)}),
    add = tmpl.for(function(a, b, callback){ return callback(a + b)});

var dbl = falit.binder(req.num, function(x){ return x * 2});

var add5 = _.partial(add, 5);

add(5, 5)
add(5, 5, add5)
mul(5, mul(5, 5, dbl))
```

Returns

```
10
10
15
250
[Finished in 0.0s]
```
## todo
- unit tests (nodejs)
- remove underscore.js ([underscorejs.org](http://underscorejs.org)) dependency
- multiple, valid, types: `falit.binder(oneOf(req.hex, req.posNum), ...)`
- performance benchmarks
- ensure nodejs + webkit compatibility
- ensure crossbrowser compatibility

## API

###require('falitjs')
#### .binder([required parameters,] [optional parameters,] function)

##### Available Types
- `any`
- `args`
- `array`
- `bool`
- `char`
- `date`
- `element`
- `finite`
- `float`
- `func`
- `hex`
- `int`
- `NaN`
- `negNum`
- `null`
- `num`
- `posNum`
- `obj`
- `regex`
- `str`
- `undefined`

#### .optional.*type*[(defaultValue)]
#### .required.*type*[(validationFn)]
Used as place holder objects in `.binder` and `.template`

[`opt`|`req`].*availableType* will reserve the parameter slot for a that given type.

```javascript
falit.binder(required.int, required.obj, optional.func, ...)
```

Calling the placeholder will allow one of two things to happen:
- `optional.availableType(..value of type..)` will initiate a default value when omitted.
- `required.availableType(req.func)` will pass the supplied varable through a custom validation.

Example:
```javascript
var add5 = falit.binder(opt.int(0), function(a){ return a + 5; });

>>> add5()
5

>>> add5(10)
15
```

Example:
```javascript
var checkStr = function(s){ return s.length < 10; }
var shortString = falit.binder(req.str(checkStr), function(s){ console.log(s); })

>>> shortString('blake')
blake

>>> shortString('blake vandemerwe')
Failed validation,
  Supplied value did not pass
  Expected: [str], position: 0

null
```

Example:
```
var realExample = falit.binder(
        opt.int(0),
        opt.obj({debug: false}),
        req.func,
        function(delaySec, options, callback) {
            callback(null, [delaySec, options]);
        }
    )

>>> realExample(console.log)
null [ null, { debug: false } ]

>>> realExample(10, console.log)
null [ 10, { debug: false } ]

>>> realExample({debug: true}, console.log)
null [ null, { debug: true } ]
```

The following fails, because the first argument doesn't match the first two optionals
and then is validated against `req.func`.

```javascript
>>> realExample(1.5, {debug: true}, console.log) 

Error: Invalid type,
  Expected: [func], position: 2
  Received: [any,finite,float,num,posNum], value: 1.5
```

Changing the `realExample` template to `opt.any, opt.obj({debug: true}), req.func` fails in the following
example because the callback `console.log` was matched against `opt.any` and we're thrown an error
that says we're missing a required argument.

```javascript
>>> realExample(console.log)

Error: Missing required [func], in position: 1

           position: 1 --------v
>>> realExample(console.log, _____)

>>> realExample(console.log, console.log)
null [ [Function], { debug: true } ]

>>> realExample({}, {}, console.log)
null [ {}, {} ]

```

#### .settings(req.obj)
- `debug`, default: `false`
    - Determines whether debug messages should be printed to console or not.
- `enabled`, default: `true`
    - Enable type-checking; disabling is useful in production environment to reduce overhead.
- `throwErrors`, default: `true`
    - `throw new Error` on violation, when set to `false` execution integrity is unknown.


#### .template([required parameters,] [optional parameters])
.template(..) works like .binder(..) except that the last parameter is not treated as the function
being bound to. Instead, you can construct a pattern of required and optional parameters that can be used
in multiple instances for similar functions.

Example:
```javascript

var twoInts = falit.template(req.int, req.int);

var add = twoInts.for(function(a, b){ return a + b; }),
    mul = twoInts.for(function(a, b){ return a * b; });

>>> add(5,5)
10

>>> mul(5,5)
25

>>> add('a', 5)
Invalid type,
  Expected: [int], position: 0
  Received: [any,char,str], value: a

>>> add(1.5, 1.5)
Invalid type,
  Expected: [int], position: 0
  Received: [any,finite,float,num,posNum], value: 1.5
```
##### .for(req.func)
Applies a required function to a template.

#### .whatIs(req.any)
Returns the meta-data associated with a given parameter. Useful for checking what types a known
value will pass validation on.

Example:
```javascript
>>> falit.whatIs([1,2,3])
{ posTypes: [ 'any', 'array' ], 
  bitMask: 5, 
  value: [ 1, 2, 3 ] }

>>> falit.whatIs(-1.5)
{ posTypes: [ 'any', 'finite', 'negNum', 'num' ],
  bitMask: 41089,
  value: -1.5 }

>>> falit.whatIs(undefined)
{ posTypes: [ 'any', 'undefined' ],
  bitMask: 1048577,
  value: undefined }

>>> falit.whatIs(Infinity)
{ posTypes: [ 'any', 'num', 'posNum' ],
  bitMask: 98305,
  value: Infinity }

>>> falit.whatIs(/\S+/)
{ posTypes: [ 'any', 'obj', 'regex' ],
  bitMask: 393217,
  value: /\S+/ }
```

#### Contributors
[Blake VandeMerwe](https://github.com/blakev)
