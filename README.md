Falit.js
=====

Static-typing and optional parameters in native JavaScript.

```javascript
var falit = require('./src/falit_b.js'),
    req = falit.required,
    opt = falit.optional;

function testA(options, message, callback) {
    callback(options, message);
}

var testA = falit.force(
                opt.obj({debug: true})
            ,   req.str
            ,   req.func
            ,   testA)

testA('blake', console.log)
```

work in progress... 

Blake VandeMerwe 2014
