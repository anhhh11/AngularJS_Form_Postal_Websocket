(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.RF = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var R = (typeof window !== "undefined" ? window['R'] : typeof global !== "undefined" ? global['R'] : null);

var util = require('./internal/util');


function Either(left, right) {
  switch (arguments.length) {
    case 0:
      throw new TypeError('no arguments to Either');
    case 1:
      return function(right) {
        return right == null ? Either.Left(left) : Either.Right(right);
      };
    default:
      return right == null ? Either.Left(left) : Either.Right(right);
  }
}

Either.prototype.map = util.returnThis;

Either.of = Either.prototype.of = function(value) {
  return Either.Right(value);
};

Either.prototype.chain = util.returnThis; // throw?

Either.equals = Either.prototype.equals = util.getEquals(Either);


// Right
function _Right(x) {
  this.value = x;
}
util.extend(_Right, Either);

_Right.prototype.map = function(fn) {
  return new _Right(fn(this.value));
};

_Right.prototype.ap = function(that) {
  return that.map(this.value);
};

_Right.prototype.chain = function(f) {
  return f(this.value);
};

_Right.prototype.bimap = function(_, f) {
  return new _Right(f(this.value));
};

_Right.prototype.extend = function(f) {
  return new _Right(f(this));
};

_Right.prototype.toString = function() {
  return 'Either.Right(' + R.toString(this.value) + ')';
};

Either.Right = function(value) {
  return new _Right(value);
};


// Left
function _Left(x) {
  this.value = x;
}
util.extend(_Left, Either);

_Left.prototype.ap = function(that) { return that; };

_Left.prototype.bimap = function(f) {
  return new _Left(f(this.value));
};

_Left.prototype.extend = util.returnThis;

_Left.prototype.toString = function() {
  return 'Either.Left(' + R.toString(this.value) + ')';
};

Either.Left = function(value) {
  return new _Left(value);
};


module.exports = Either;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./internal/util":8}],2:[function(require,module,exports){
(function (global){
var R = (typeof window !== "undefined" ? window['R'] : typeof global !== "undefined" ? global['R'] : null);

// `f` is a function that takes two function arguments: `reject` (failure) and `resolve` (success)
function Future(f) {
  if (!(this instanceof Future)) {
    return new Future(f);
  }
  this.fork = f;
}

// functor
Future.prototype.map = function(f) {
  return this.chain(function(a) { return Future.of(f(a)); });
};

// apply
Future.prototype.ap = function(m) {
  var self = this;

  return new Future(function(rej, res) {
    var applyFn, val;
    var doReject = R.once(rej);

    function resolveIfDone() {
      if (applyFn != null && val != null) {
        return res(applyFn(val));
      }
    }

    self.fork(doReject, function(fn) {
      applyFn = fn;
      resolveIfDone();
    });

    m.fork(doReject, function(v) {
      val = v;
      resolveIfDone();
    });

  });

};

// applicative
Future.of = function(x) {
  // should include a default rejection?
  return new Future(function(_, resolve) { return resolve(x); });
};

Future.prototype.of = Future.of;

// chain
//  f must be a function which returns a value
//  f must return a value of the same Chain
//  chain must return a value of the same Chain
Future.prototype.chain = function(f) {  // Sorella's:
  return new Future(function(reject, resolve) {
    return this.fork(function(a) { return reject(a); },
                     function(b) { return f(b).fork(reject, resolve); });
  }.bind(this));
};

// monad
// A value that implements the Monad specification must also implement the Applicative and Chain specifications.
// see above.

Future.prototype.bimap = function(errFn, successFn) {
  var self = this;
  return new Future(function(reject, resolve) {
    self.fork(function(err) {
      reject(errFn(err));
    }, function(val) {
      resolve(successFn(val));
    });
  });
};

Future.reject = function(val) {
  return new Future(function(reject) {
    reject(val);
  });
};

Future.prototype.toString = function() {
  return 'Future(' + R.toString(this.fork) + ')';
};

module.exports = Future;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
(function (global){
var R = (typeof window !== "undefined" ? window['R'] : typeof global !== "undefined" ? global['R'] : null);

module.exports = IO;

var compose = R.compose;

function IO(fn) {
  if (!(this instanceof IO)) {
    return new IO(fn);
  }
  this.fn = fn;
}

// `f` must return an IO
IO.prototype.chain = function(f) {
  var io = this;
  return new IO(function() {
    return f(io.fn()).fn();
  });
};

IO.prototype.map = function(f) {
  var io = this;
  return new IO(compose(f, io.fn));
};

// `this` IO must wrap a function `f` that takes an IO (`thatIo`) as input
// `f` must return an IO
IO.prototype.ap = function(thatIo) {
  return this.chain(function(f) {
    return thatIo.map(f);
  });
};

IO.runIO = function(io) {
  return io.runIO.apply(io, [].slice.call(arguments, 1));
};

IO.prototype.runIO = function() {
  return this.fn.apply(this, arguments);
};

IO.prototype.of = function(x) {
  return new IO(function() { return x; });
};

IO.of = IO.prototype.of;

// this is really only to accommodate testing ....
IO.prototype.equals = function(that) {
  return this === that ||
    this.fn === that.fn ||
    R.equals(IO.runIO(this), IO.runIO(that));
};

IO.prototype.toString = function() {
  return 'IO(' + R.toString(this.fn) + ')';
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],4:[function(require,module,exports){
(function (global){
var R = (typeof window !== "undefined" ? window['R'] : typeof global !== "undefined" ? global['R'] : null);

var util = require('./internal/util');


/**
 * A data type that holds a value and exposes a monadic api.
 */

/**
 * Constructs a new `Identity[a]` data type that holds a single
 * value `a`.
 * @param {*} a Value of any type
 * @sig a -> Identity[a]
 */
function Identity(x) {
  if (!(this instanceof Identity)) {
    return new Identity(x);
  }
  this.value = x;
}

/**
 * Applicative specification. Creates a new `Identity[a]` holding the value `a`.
 * @param {*} a Value of any type
 * @returns Identity[a]
 * @sig a -> Identity[a]
 */
Identity.of = function(x) {
  return new Identity(x);
};
Identity.prototype.of = Identity.of;

/**
 * Functor specification. Creates a new `Identity[a]` mapping function `f` onto
 * `a` returning any value b.
 * @param {Function} f Maps `a` to any value `b`
 * @returns Identity[b]
 * @sig @Identity[a] => (a -> b) -> Identity[b]
 */
Identity.prototype.map = function(f) {
  return new Identity(f(this.value));
};

/**
 * Apply specification. Applies the function inside the `Identity[a]`
 * type to another applicative type.
 * @param {Applicative[a]} app Applicative that will apply its function
 * @returns Applicative[b]
 * @sig (Identity[a -> b], f: Applicative[_]) => f[a] -> f[b]
 */
Identity.prototype.ap = function(app) {
  return app.map(this.value);
};

/**
 * Chain specification. Transforms the value of the `Identity[a]`
 * type using an unary function to monads. The `Identity[a]` type
 * should contain a function, otherwise an error is thrown.
 *
 * @param {Function} fn Transforms `a` into a `Monad[b]`
 * @returns Monad[b]
 * @sig (Identity[a], m: Monad[_]) => (a -> m[b]) -> m[b]
 */
Identity.prototype.chain = function(fn) {
  return fn(this.value);
};

/**
 * Returns the value of `Identity[a]`
 *
 * @returns a
 * @sig (Identity[a]) => a
 */
Identity.prototype.get = function() {
  return this.value;
};

// equality method to enable testing
Identity.prototype.equals = util.getEquals(Identity);

Identity.prototype.toString = function() {
  return 'Identity(' + R.toString(this.value) + ')';
};

module.exports = Identity;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./internal/util":8}],5:[function(require,module,exports){
(function (global){
var R = (typeof window !== "undefined" ? window['R'] : typeof global !== "undefined" ? global['R'] : null);

var util = require('./internal/util.js');

function Maybe(x) {
  return x == null ? _nothing : Maybe.Just(x);
}

function _Just(x) {
  this.value = x;
}
util.extend(_Just, Maybe);

function _Nothing() {}
util.extend(_Nothing, Maybe);

var _nothing = new _Nothing();

Maybe.Nothing = function() {
  return _nothing;
};

Maybe.Just = function(x) {
  return new _Just(x);
};

Maybe.of = Maybe.Just;

Maybe.prototype.of = Maybe.Just;

Maybe.isJust = function(x) {
  return x instanceof _Just;
};

Maybe.isNothing = function(x) {
  return x === _nothing;
};

// functor
_Just.prototype.map = function(f) {
  return this.of(f(this.value));
};

_Nothing.prototype.map = util.returnThis;

// apply
// takes a Maybe that wraps a function (`app`) and applies its `map`
// method to this Maybe's value, which must be a function.
_Just.prototype.ap = function(m) {
  return m.map(this.value);
};

_Nothing.prototype.ap = util.returnThis;

// applicative
// `of` inherited from `Maybe`


// chain
//  f must be a function which returns a value
//  f must return a value of the same Chain
//  chain must return a value of the same Chain
_Just.prototype.chain = util.baseMap;

_Nothing.prototype.chain = util.returnThis;


//
_Just.prototype.datatype = _Just;

_Nothing.prototype.datatype = _Nothing;

// monad
// A value that implements the Monad specification must also implement the Applicative and Chain specifications.
// see above.

// equality method to enable testing
_Just.prototype.equals = util.getEquals(_Just);

_Nothing.prototype.equals = function(that) {
  return that === _nothing;
};

Maybe.prototype.isNothing = function() {
  return this === _nothing;
};

Maybe.prototype.isJust = function() {
  return this instanceof _Just;
};

_Just.prototype.getOrElse = function() {
  return this.value;
};

_Nothing.prototype.getOrElse = function(a) {
  return a;
};

_Just.prototype.toString = function() {
  return 'Maybe.Just(' + R.toString(this.value) + ')';
};

_Nothing.prototype.toString = function() {
  return 'Maybe.Nothing()';
};

module.exports = Maybe;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./internal/util.js":8}],6:[function(require,module,exports){
(function (global){
var R = (typeof window !== "undefined" ? window['R'] : typeof global !== "undefined" ? global['R'] : null);


function Reader(run) {
  if (!(this instanceof Reader)) {
    return new Reader(run);
  }
  this.run = run;
}

Reader.run = function(reader) {
  return reader.run.apply(reader, [].slice.call(arguments, 1));
};

Reader.prototype.chain = function(f) {
  var reader = this;
  return new Reader(function(r) {
    return f(reader.run(r)).run(r);
  });
};

Reader.prototype.ap = function(a) {
  return this.chain(function(f) {
    return a.map(f);
  });
};

Reader.prototype.map = function(f) {
  return this.chain(function(a) {
    return Reader.of(f(a));
  });
};

Reader.prototype.of = function(a) {
  return new Reader(function() {
    return a;
  });
};
Reader.of = Reader.prototype.of;

Reader.ask = Reader(function(a) {
  return a;
});

Reader.prototype.equals = function(that) {
  return this === that ||
  this.run === that.run ||
  R.equals(Reader.run(this), Reader.run(that));
};

Reader.prototype.toString = function() {
  return 'Reader(' + R.toString(this.run) + ')';
};

module.exports = Reader;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],7:[function(require,module,exports){
(function (global){
var R = (typeof window !== "undefined" ? window['R'] : typeof global !== "undefined" ? global['R'] : null);


function Tuple(x, y) {
  switch (arguments.length) {
    case 0:
      throw new TypeError('no arguments to Tuple');
    case 1:
      return function(y) {
        return new _Tuple(x, y);
      };
    default:
      return new _Tuple(x, y);
  }
}

function _Tuple(x, y) {
  this[0] = x;
  this[1] = y;
  this.length = 2;
}

function ensureConcat(xs) {
  xs.forEach(function(x) {
    if (typeof x.concat != 'function') {
      throw new TypeError(R.toString(x) + ' must be a semigroup to perform this operation');
    }
  });
}

Tuple.of = function(x) {
  return Tuple(x, x);
};

Tuple.fst = function(x) {
  return x[0];
};

Tuple.snd = function(x) {
  return x[1];
};

_Tuple.prototype.of = function(x) {
  return Tuple(this[0], x);
};

// semigroup
_Tuple.prototype.concat = function(x) {
  ensureConcat([this[0], this[1]]);
  return Tuple(this[0].concat(x[0]), this[1].concat(x[1]));
};

// functor
_Tuple.prototype.map = function(f) {
  return Tuple(this[0], f(this[1]));
};

// apply
_Tuple.prototype.ap = function(m) {
  ensureConcat([this[0]]);
  return Tuple(this[0].concat(m[0]), this[1](m[1]));
};

// setoid
_Tuple.prototype.equals = function(that) {
  return that instanceof _Tuple && R.equals(this[0], that[0]) && R.equals(this[1], that[1]);
};

_Tuple.prototype.toString = function() {
  return 'Tuple(' + R.toString(this[0]) + ', ' + R.toString(this[1]) + ')';
};

module.exports = Tuple;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],8:[function(require,module,exports){
(function (global){
var _equals = (typeof window !== "undefined" ? window['R'] : typeof global !== "undefined" ? global['R'] : null).equals;


module.exports = {

  baseMap: function(f) {
    return f(this.value);
  },

  getEquals: function(constructor) {
    return function equals(that) {
      return that instanceof constructor && _equals(this.value, that.value);
    };
  },

  extend: function(Child, Parent) {
    function Ctor() {
      this.constructor = Child;
    }
    Ctor.prototype = Parent.prototype;
    Child.prototype = new Ctor();
    Child.super_ = Parent.prototype;
  },

  identity: function(x) { return x; },

  notImplemented: function(str) {
    return function() {
      throw new Error(str + ' is not implemented');
    };
  },

  notCallable: function(fn) {
    return function() {
      throw new Error(fn + ' cannot be called directly');
    };
  },

  returnThis: function() { return this; }

};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],9:[function(require,module,exports){
(function (global){
var R = (typeof window !== "undefined" ? window['R'] : typeof global !== "undefined" ? global['R'] : null);

module.exports = R.curryN(3, function liftA2(f, a1, a2) {
  return a1.map(f).ap(a2);
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],10:[function(require,module,exports){
(function (global){
var R = (typeof window !== "undefined" ? window['R'] : typeof global !== "undefined" ? global['R'] : null);

module.exports = R.curryN(4, function liftA2(f, a1, a2, a3) {
  return a1.map(f).ap(a2).ap(a3);
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],11:[function(require,module,exports){
module.exports = {
    Either: require('./src/Either'),
    Future: require('./src/Future'),
    Identity: require('./src/Identity'),
    IO: require('./src/IO'),
    lift2: require('./src/lift2'),
    lift3: require('./src/lift3'),
    Maybe: require('./src/Maybe'),
    Tuple: require('./src/Tuple'),
    Reader: require('./src/Reader')
};

},{"./src/Either":1,"./src/Future":2,"./src/IO":3,"./src/Identity":4,"./src/Maybe":5,"./src/Reader":6,"./src/Tuple":7,"./src/lift2":9,"./src/lift3":10}]},{},[11])(11)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvRWl0aGVyLmpzIiwic3JjL0Z1dHVyZS5qcyIsInNyYy9JTy5qcyIsInNyYy9JZGVudGl0eS5qcyIsInNyYy9NYXliZS5qcyIsInNyYy9SZWFkZXIuanMiLCJzcmMvVHVwbGUuanMiLCJzcmMvaW50ZXJuYWwvdXRpbC5qcyIsInNyYy9saWZ0Mi5qcyIsInNyYy9saWZ0My5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFIgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snUiddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUiddIDogbnVsbCk7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi9pbnRlcm5hbC91dGlsJyk7XG5cblxuZnVuY3Rpb24gRWl0aGVyKGxlZnQsIHJpZ2h0KSB7XG4gIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIGNhc2UgMDpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ25vIGFyZ3VtZW50cyB0byBFaXRoZXInKTtcbiAgICBjYXNlIDE6XG4gICAgICByZXR1cm4gZnVuY3Rpb24ocmlnaHQpIHtcbiAgICAgICAgcmV0dXJuIHJpZ2h0ID09IG51bGwgPyBFaXRoZXIuTGVmdChsZWZ0KSA6IEVpdGhlci5SaWdodChyaWdodCk7XG4gICAgICB9O1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gcmlnaHQgPT0gbnVsbCA/IEVpdGhlci5MZWZ0KGxlZnQpIDogRWl0aGVyLlJpZ2h0KHJpZ2h0KTtcbiAgfVxufVxuXG5FaXRoZXIucHJvdG90eXBlLm1hcCA9IHV0aWwucmV0dXJuVGhpcztcblxuRWl0aGVyLm9mID0gRWl0aGVyLnByb3RvdHlwZS5vZiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBFaXRoZXIuUmlnaHQodmFsdWUpO1xufTtcblxuRWl0aGVyLnByb3RvdHlwZS5jaGFpbiA9IHV0aWwucmV0dXJuVGhpczsgLy8gdGhyb3c/XG5cbkVpdGhlci5lcXVhbHMgPSBFaXRoZXIucHJvdG90eXBlLmVxdWFscyA9IHV0aWwuZ2V0RXF1YWxzKEVpdGhlcik7XG5cblxuLy8gUmlnaHRcbmZ1bmN0aW9uIF9SaWdodCh4KSB7XG4gIHRoaXMudmFsdWUgPSB4O1xufVxudXRpbC5leHRlbmQoX1JpZ2h0LCBFaXRoZXIpO1xuXG5fUmlnaHQucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uKGZuKSB7XG4gIHJldHVybiBuZXcgX1JpZ2h0KGZuKHRoaXMudmFsdWUpKTtcbn07XG5cbl9SaWdodC5wcm90b3R5cGUuYXAgPSBmdW5jdGlvbih0aGF0KSB7XG4gIHJldHVybiB0aGF0Lm1hcCh0aGlzLnZhbHVlKTtcbn07XG5cbl9SaWdodC5wcm90b3R5cGUuY2hhaW4gPSBmdW5jdGlvbihmKSB7XG4gIHJldHVybiBmKHRoaXMudmFsdWUpO1xufTtcblxuX1JpZ2h0LnByb3RvdHlwZS5iaW1hcCA9IGZ1bmN0aW9uKF8sIGYpIHtcbiAgcmV0dXJuIG5ldyBfUmlnaHQoZih0aGlzLnZhbHVlKSk7XG59O1xuXG5fUmlnaHQucHJvdG90eXBlLmV4dGVuZCA9IGZ1bmN0aW9uKGYpIHtcbiAgcmV0dXJuIG5ldyBfUmlnaHQoZih0aGlzKSk7XG59O1xuXG5fUmlnaHQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnRWl0aGVyLlJpZ2h0KCcgKyBSLnRvU3RyaW5nKHRoaXMudmFsdWUpICsgJyknO1xufTtcblxuRWl0aGVyLlJpZ2h0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIG5ldyBfUmlnaHQodmFsdWUpO1xufTtcblxuXG4vLyBMZWZ0XG5mdW5jdGlvbiBfTGVmdCh4KSB7XG4gIHRoaXMudmFsdWUgPSB4O1xufVxudXRpbC5leHRlbmQoX0xlZnQsIEVpdGhlcik7XG5cbl9MZWZ0LnByb3RvdHlwZS5hcCA9IGZ1bmN0aW9uKHRoYXQpIHsgcmV0dXJuIHRoYXQ7IH07XG5cbl9MZWZ0LnByb3RvdHlwZS5iaW1hcCA9IGZ1bmN0aW9uKGYpIHtcbiAgcmV0dXJuIG5ldyBfTGVmdChmKHRoaXMudmFsdWUpKTtcbn07XG5cbl9MZWZ0LnByb3RvdHlwZS5leHRlbmQgPSB1dGlsLnJldHVyblRoaXM7XG5cbl9MZWZ0LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ0VpdGhlci5MZWZ0KCcgKyBSLnRvU3RyaW5nKHRoaXMudmFsdWUpICsgJyknO1xufTtcblxuRWl0aGVyLkxlZnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gbmV3IF9MZWZ0KHZhbHVlKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBFaXRoZXI7XG4iLCJ2YXIgUiA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydSJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSJ10gOiBudWxsKTtcblxuLy8gYGZgIGlzIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyB0d28gZnVuY3Rpb24gYXJndW1lbnRzOiBgcmVqZWN0YCAoZmFpbHVyZSkgYW5kIGByZXNvbHZlYCAoc3VjY2VzcylcbmZ1bmN0aW9uIEZ1dHVyZShmKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGdXR1cmUpKSB7XG4gICAgcmV0dXJuIG5ldyBGdXR1cmUoZik7XG4gIH1cbiAgdGhpcy5mb3JrID0gZjtcbn1cblxuLy8gZnVuY3RvclxuRnV0dXJlLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbihmKSB7XG4gIHJldHVybiB0aGlzLmNoYWluKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIEZ1dHVyZS5vZihmKGEpKTsgfSk7XG59O1xuXG4vLyBhcHBseVxuRnV0dXJlLnByb3RvdHlwZS5hcCA9IGZ1bmN0aW9uKG0pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHJldHVybiBuZXcgRnV0dXJlKGZ1bmN0aW9uKHJlaiwgcmVzKSB7XG4gICAgdmFyIGFwcGx5Rm4sIHZhbDtcbiAgICB2YXIgZG9SZWplY3QgPSBSLm9uY2UocmVqKTtcblxuICAgIGZ1bmN0aW9uIHJlc29sdmVJZkRvbmUoKSB7XG4gICAgICBpZiAoYXBwbHlGbiAhPSBudWxsICYmIHZhbCAhPSBudWxsKSB7XG4gICAgICAgIHJldHVybiByZXMoYXBwbHlGbih2YWwpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzZWxmLmZvcmsoZG9SZWplY3QsIGZ1bmN0aW9uKGZuKSB7XG4gICAgICBhcHBseUZuID0gZm47XG4gICAgICByZXNvbHZlSWZEb25lKCk7XG4gICAgfSk7XG5cbiAgICBtLmZvcmsoZG9SZWplY3QsIGZ1bmN0aW9uKHYpIHtcbiAgICAgIHZhbCA9IHY7XG4gICAgICByZXNvbHZlSWZEb25lKCk7XG4gICAgfSk7XG5cbiAgfSk7XG5cbn07XG5cbi8vIGFwcGxpY2F0aXZlXG5GdXR1cmUub2YgPSBmdW5jdGlvbih4KSB7XG4gIC8vIHNob3VsZCBpbmNsdWRlIGEgZGVmYXVsdCByZWplY3Rpb24/XG4gIHJldHVybiBuZXcgRnV0dXJlKGZ1bmN0aW9uKF8sIHJlc29sdmUpIHsgcmV0dXJuIHJlc29sdmUoeCk7IH0pO1xufTtcblxuRnV0dXJlLnByb3RvdHlwZS5vZiA9IEZ1dHVyZS5vZjtcblxuLy8gY2hhaW5cbi8vICBmIG11c3QgYmUgYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGEgdmFsdWVcbi8vICBmIG11c3QgcmV0dXJuIGEgdmFsdWUgb2YgdGhlIHNhbWUgQ2hhaW5cbi8vICBjaGFpbiBtdXN0IHJldHVybiBhIHZhbHVlIG9mIHRoZSBzYW1lIENoYWluXG5GdXR1cmUucHJvdG90eXBlLmNoYWluID0gZnVuY3Rpb24oZikgeyAgLy8gU29yZWxsYSdzOlxuICByZXR1cm4gbmV3IEZ1dHVyZShmdW5jdGlvbihyZWplY3QsIHJlc29sdmUpIHtcbiAgICByZXR1cm4gdGhpcy5mb3JrKGZ1bmN0aW9uKGEpIHsgcmV0dXJuIHJlamVjdChhKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGIpIHsgcmV0dXJuIGYoYikuZm9yayhyZWplY3QsIHJlc29sdmUpOyB9KTtcbiAgfS5iaW5kKHRoaXMpKTtcbn07XG5cbi8vIG1vbmFkXG4vLyBBIHZhbHVlIHRoYXQgaW1wbGVtZW50cyB0aGUgTW9uYWQgc3BlY2lmaWNhdGlvbiBtdXN0IGFsc28gaW1wbGVtZW50IHRoZSBBcHBsaWNhdGl2ZSBhbmQgQ2hhaW4gc3BlY2lmaWNhdGlvbnMuXG4vLyBzZWUgYWJvdmUuXG5cbkZ1dHVyZS5wcm90b3R5cGUuYmltYXAgPSBmdW5jdGlvbihlcnJGbiwgc3VjY2Vzc0ZuKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIG5ldyBGdXR1cmUoZnVuY3Rpb24ocmVqZWN0LCByZXNvbHZlKSB7XG4gICAgc2VsZi5mb3JrKGZ1bmN0aW9uKGVycikge1xuICAgICAgcmVqZWN0KGVyckZuKGVycikpO1xuICAgIH0sIGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmVzb2x2ZShzdWNjZXNzRm4odmFsKSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuRnV0dXJlLnJlamVjdCA9IGZ1bmN0aW9uKHZhbCkge1xuICByZXR1cm4gbmV3IEZ1dHVyZShmdW5jdGlvbihyZWplY3QpIHtcbiAgICByZWplY3QodmFsKTtcbiAgfSk7XG59O1xuXG5GdXR1cmUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnRnV0dXJlKCcgKyBSLnRvU3RyaW5nKHRoaXMuZm9yaykgKyAnKSc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZ1dHVyZTtcbiIsInZhciBSID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1InXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ1InXSA6IG51bGwpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IElPO1xuXG52YXIgY29tcG9zZSA9IFIuY29tcG9zZTtcblxuZnVuY3Rpb24gSU8oZm4pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIElPKSkge1xuICAgIHJldHVybiBuZXcgSU8oZm4pO1xuICB9XG4gIHRoaXMuZm4gPSBmbjtcbn1cblxuLy8gYGZgIG11c3QgcmV0dXJuIGFuIElPXG5JTy5wcm90b3R5cGUuY2hhaW4gPSBmdW5jdGlvbihmKSB7XG4gIHZhciBpbyA9IHRoaXM7XG4gIHJldHVybiBuZXcgSU8oZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGYoaW8uZm4oKSkuZm4oKTtcbiAgfSk7XG59O1xuXG5JTy5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24oZikge1xuICB2YXIgaW8gPSB0aGlzO1xuICByZXR1cm4gbmV3IElPKGNvbXBvc2UoZiwgaW8uZm4pKTtcbn07XG5cbi8vIGB0aGlzYCBJTyBtdXN0IHdyYXAgYSBmdW5jdGlvbiBgZmAgdGhhdCB0YWtlcyBhbiBJTyAoYHRoYXRJb2ApIGFzIGlucHV0XG4vLyBgZmAgbXVzdCByZXR1cm4gYW4gSU9cbklPLnByb3RvdHlwZS5hcCA9IGZ1bmN0aW9uKHRoYXRJbykge1xuICByZXR1cm4gdGhpcy5jaGFpbihmdW5jdGlvbihmKSB7XG4gICAgcmV0dXJuIHRoYXRJby5tYXAoZik7XG4gIH0pO1xufTtcblxuSU8ucnVuSU8gPSBmdW5jdGlvbihpbykge1xuICByZXR1cm4gaW8ucnVuSU8uYXBwbHkoaW8sIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG59O1xuXG5JTy5wcm90b3R5cGUucnVuSU8gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbklPLnByb3RvdHlwZS5vZiA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIG5ldyBJTyhmdW5jdGlvbigpIHsgcmV0dXJuIHg7IH0pO1xufTtcblxuSU8ub2YgPSBJTy5wcm90b3R5cGUub2Y7XG5cbi8vIHRoaXMgaXMgcmVhbGx5IG9ubHkgdG8gYWNjb21tb2RhdGUgdGVzdGluZyAuLi4uXG5JTy5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24odGhhdCkge1xuICByZXR1cm4gdGhpcyA9PT0gdGhhdCB8fFxuICAgIHRoaXMuZm4gPT09IHRoYXQuZm4gfHxcbiAgICBSLmVxdWFscyhJTy5ydW5JTyh0aGlzKSwgSU8ucnVuSU8odGhhdCkpO1xufTtcblxuSU8ucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnSU8oJyArIFIudG9TdHJpbmcodGhpcy5mbikgKyAnKSc7XG59O1xuIiwidmFyIFIgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snUiddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUiddIDogbnVsbCk7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi9pbnRlcm5hbC91dGlsJyk7XG5cblxuLyoqXG4gKiBBIGRhdGEgdHlwZSB0aGF0IGhvbGRzIGEgdmFsdWUgYW5kIGV4cG9zZXMgYSBtb25hZGljIGFwaS5cbiAqL1xuXG4vKipcbiAqIENvbnN0cnVjdHMgYSBuZXcgYElkZW50aXR5W2FdYCBkYXRhIHR5cGUgdGhhdCBob2xkcyBhIHNpbmdsZVxuICogdmFsdWUgYGFgLlxuICogQHBhcmFtIHsqfSBhIFZhbHVlIG9mIGFueSB0eXBlXG4gKiBAc2lnIGEgLT4gSWRlbnRpdHlbYV1cbiAqL1xuZnVuY3Rpb24gSWRlbnRpdHkoeCkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgSWRlbnRpdHkpKSB7XG4gICAgcmV0dXJuIG5ldyBJZGVudGl0eSh4KTtcbiAgfVxuICB0aGlzLnZhbHVlID0geDtcbn1cblxuLyoqXG4gKiBBcHBsaWNhdGl2ZSBzcGVjaWZpY2F0aW9uLiBDcmVhdGVzIGEgbmV3IGBJZGVudGl0eVthXWAgaG9sZGluZyB0aGUgdmFsdWUgYGFgLlxuICogQHBhcmFtIHsqfSBhIFZhbHVlIG9mIGFueSB0eXBlXG4gKiBAcmV0dXJucyBJZGVudGl0eVthXVxuICogQHNpZyBhIC0+IElkZW50aXR5W2FdXG4gKi9cbklkZW50aXR5Lm9mID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gbmV3IElkZW50aXR5KHgpO1xufTtcbklkZW50aXR5LnByb3RvdHlwZS5vZiA9IElkZW50aXR5Lm9mO1xuXG4vKipcbiAqIEZ1bmN0b3Igc3BlY2lmaWNhdGlvbi4gQ3JlYXRlcyBhIG5ldyBgSWRlbnRpdHlbYV1gIG1hcHBpbmcgZnVuY3Rpb24gYGZgIG9udG9cbiAqIGBhYCByZXR1cm5pbmcgYW55IHZhbHVlIGIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmIE1hcHMgYGFgIHRvIGFueSB2YWx1ZSBgYmBcbiAqIEByZXR1cm5zIElkZW50aXR5W2JdXG4gKiBAc2lnIEBJZGVudGl0eVthXSA9PiAoYSAtPiBiKSAtPiBJZGVudGl0eVtiXVxuICovXG5JZGVudGl0eS5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24oZikge1xuICByZXR1cm4gbmV3IElkZW50aXR5KGYodGhpcy52YWx1ZSkpO1xufTtcblxuLyoqXG4gKiBBcHBseSBzcGVjaWZpY2F0aW9uLiBBcHBsaWVzIHRoZSBmdW5jdGlvbiBpbnNpZGUgdGhlIGBJZGVudGl0eVthXWBcbiAqIHR5cGUgdG8gYW5vdGhlciBhcHBsaWNhdGl2ZSB0eXBlLlxuICogQHBhcmFtIHtBcHBsaWNhdGl2ZVthXX0gYXBwIEFwcGxpY2F0aXZlIHRoYXQgd2lsbCBhcHBseSBpdHMgZnVuY3Rpb25cbiAqIEByZXR1cm5zIEFwcGxpY2F0aXZlW2JdXG4gKiBAc2lnIChJZGVudGl0eVthIC0+IGJdLCBmOiBBcHBsaWNhdGl2ZVtfXSkgPT4gZlthXSAtPiBmW2JdXG4gKi9cbklkZW50aXR5LnByb3RvdHlwZS5hcCA9IGZ1bmN0aW9uKGFwcCkge1xuICByZXR1cm4gYXBwLm1hcCh0aGlzLnZhbHVlKTtcbn07XG5cbi8qKlxuICogQ2hhaW4gc3BlY2lmaWNhdGlvbi4gVHJhbnNmb3JtcyB0aGUgdmFsdWUgb2YgdGhlIGBJZGVudGl0eVthXWBcbiAqIHR5cGUgdXNpbmcgYW4gdW5hcnkgZnVuY3Rpb24gdG8gbW9uYWRzLiBUaGUgYElkZW50aXR5W2FdYCB0eXBlXG4gKiBzaG91bGQgY29udGFpbiBhIGZ1bmN0aW9uLCBvdGhlcndpc2UgYW4gZXJyb3IgaXMgdGhyb3duLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRyYW5zZm9ybXMgYGFgIGludG8gYSBgTW9uYWRbYl1gXG4gKiBAcmV0dXJucyBNb25hZFtiXVxuICogQHNpZyAoSWRlbnRpdHlbYV0sIG06IE1vbmFkW19dKSA9PiAoYSAtPiBtW2JdKSAtPiBtW2JdXG4gKi9cbklkZW50aXR5LnByb3RvdHlwZS5jaGFpbiA9IGZ1bmN0aW9uKGZuKSB7XG4gIHJldHVybiBmbih0aGlzLnZhbHVlKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdmFsdWUgb2YgYElkZW50aXR5W2FdYFxuICpcbiAqIEByZXR1cm5zIGFcbiAqIEBzaWcgKElkZW50aXR5W2FdKSA9PiBhXG4gKi9cbklkZW50aXR5LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudmFsdWU7XG59O1xuXG4vLyBlcXVhbGl0eSBtZXRob2QgdG8gZW5hYmxlIHRlc3RpbmdcbklkZW50aXR5LnByb3RvdHlwZS5lcXVhbHMgPSB1dGlsLmdldEVxdWFscyhJZGVudGl0eSk7XG5cbklkZW50aXR5LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ0lkZW50aXR5KCcgKyBSLnRvU3RyaW5nKHRoaXMudmFsdWUpICsgJyknO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJZGVudGl0eTtcbiIsInZhciBSID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1InXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ1InXSA6IG51bGwpO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vaW50ZXJuYWwvdXRpbC5qcycpO1xuXG5mdW5jdGlvbiBNYXliZSh4KSB7XG4gIHJldHVybiB4ID09IG51bGwgPyBfbm90aGluZyA6IE1heWJlLkp1c3QoeCk7XG59XG5cbmZ1bmN0aW9uIF9KdXN0KHgpIHtcbiAgdGhpcy52YWx1ZSA9IHg7XG59XG51dGlsLmV4dGVuZChfSnVzdCwgTWF5YmUpO1xuXG5mdW5jdGlvbiBfTm90aGluZygpIHt9XG51dGlsLmV4dGVuZChfTm90aGluZywgTWF5YmUpO1xuXG52YXIgX25vdGhpbmcgPSBuZXcgX05vdGhpbmcoKTtcblxuTWF5YmUuTm90aGluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gX25vdGhpbmc7XG59O1xuXG5NYXliZS5KdXN0ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gbmV3IF9KdXN0KHgpO1xufTtcblxuTWF5YmUub2YgPSBNYXliZS5KdXN0O1xuXG5NYXliZS5wcm90b3R5cGUub2YgPSBNYXliZS5KdXN0O1xuXG5NYXliZS5pc0p1c3QgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB4IGluc3RhbmNlb2YgX0p1c3Q7XG59O1xuXG5NYXliZS5pc05vdGhpbmcgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB4ID09PSBfbm90aGluZztcbn07XG5cbi8vIGZ1bmN0b3Jcbl9KdXN0LnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbihmKSB7XG4gIHJldHVybiB0aGlzLm9mKGYodGhpcy52YWx1ZSkpO1xufTtcblxuX05vdGhpbmcucHJvdG90eXBlLm1hcCA9IHV0aWwucmV0dXJuVGhpcztcblxuLy8gYXBwbHlcbi8vIHRha2VzIGEgTWF5YmUgdGhhdCB3cmFwcyBhIGZ1bmN0aW9uIChgYXBwYCkgYW5kIGFwcGxpZXMgaXRzIGBtYXBgXG4vLyBtZXRob2QgdG8gdGhpcyBNYXliZSdzIHZhbHVlLCB3aGljaCBtdXN0IGJlIGEgZnVuY3Rpb24uXG5fSnVzdC5wcm90b3R5cGUuYXAgPSBmdW5jdGlvbihtKSB7XG4gIHJldHVybiBtLm1hcCh0aGlzLnZhbHVlKTtcbn07XG5cbl9Ob3RoaW5nLnByb3RvdHlwZS5hcCA9IHV0aWwucmV0dXJuVGhpcztcblxuLy8gYXBwbGljYXRpdmVcbi8vIGBvZmAgaW5oZXJpdGVkIGZyb20gYE1heWJlYFxuXG5cbi8vIGNoYWluXG4vLyAgZiBtdXN0IGJlIGEgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhIHZhbHVlXG4vLyAgZiBtdXN0IHJldHVybiBhIHZhbHVlIG9mIHRoZSBzYW1lIENoYWluXG4vLyAgY2hhaW4gbXVzdCByZXR1cm4gYSB2YWx1ZSBvZiB0aGUgc2FtZSBDaGFpblxuX0p1c3QucHJvdG90eXBlLmNoYWluID0gdXRpbC5iYXNlTWFwO1xuXG5fTm90aGluZy5wcm90b3R5cGUuY2hhaW4gPSB1dGlsLnJldHVyblRoaXM7XG5cblxuLy9cbl9KdXN0LnByb3RvdHlwZS5kYXRhdHlwZSA9IF9KdXN0O1xuXG5fTm90aGluZy5wcm90b3R5cGUuZGF0YXR5cGUgPSBfTm90aGluZztcblxuLy8gbW9uYWRcbi8vIEEgdmFsdWUgdGhhdCBpbXBsZW1lbnRzIHRoZSBNb25hZCBzcGVjaWZpY2F0aW9uIG11c3QgYWxzbyBpbXBsZW1lbnQgdGhlIEFwcGxpY2F0aXZlIGFuZCBDaGFpbiBzcGVjaWZpY2F0aW9ucy5cbi8vIHNlZSBhYm92ZS5cblxuLy8gZXF1YWxpdHkgbWV0aG9kIHRvIGVuYWJsZSB0ZXN0aW5nXG5fSnVzdC5wcm90b3R5cGUuZXF1YWxzID0gdXRpbC5nZXRFcXVhbHMoX0p1c3QpO1xuXG5fTm90aGluZy5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24odGhhdCkge1xuICByZXR1cm4gdGhhdCA9PT0gX25vdGhpbmc7XG59O1xuXG5NYXliZS5wcm90b3R5cGUuaXNOb3RoaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzID09PSBfbm90aGluZztcbn07XG5cbk1heWJlLnByb3RvdHlwZS5pc0p1c3QgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfSnVzdDtcbn07XG5cbl9KdXN0LnByb3RvdHlwZS5nZXRPckVsc2UgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudmFsdWU7XG59O1xuXG5fTm90aGluZy5wcm90b3R5cGUuZ2V0T3JFbHNlID0gZnVuY3Rpb24oYSkge1xuICByZXR1cm4gYTtcbn07XG5cbl9KdXN0LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ01heWJlLkp1c3QoJyArIFIudG9TdHJpbmcodGhpcy52YWx1ZSkgKyAnKSc7XG59O1xuXG5fTm90aGluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICdNYXliZS5Ob3RoaW5nKCknO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNYXliZTtcbiIsInZhciBSID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1InXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ1InXSA6IG51bGwpO1xuXG5cbmZ1bmN0aW9uIFJlYWRlcihydW4pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJlYWRlcikpIHtcbiAgICByZXR1cm4gbmV3IFJlYWRlcihydW4pO1xuICB9XG4gIHRoaXMucnVuID0gcnVuO1xufVxuXG5SZWFkZXIucnVuID0gZnVuY3Rpb24ocmVhZGVyKSB7XG4gIHJldHVybiByZWFkZXIucnVuLmFwcGx5KHJlYWRlciwgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbn07XG5cblJlYWRlci5wcm90b3R5cGUuY2hhaW4gPSBmdW5jdGlvbihmKSB7XG4gIHZhciByZWFkZXIgPSB0aGlzO1xuICByZXR1cm4gbmV3IFJlYWRlcihmdW5jdGlvbihyKSB7XG4gICAgcmV0dXJuIGYocmVhZGVyLnJ1bihyKSkucnVuKHIpO1xuICB9KTtcbn07XG5cblJlYWRlci5wcm90b3R5cGUuYXAgPSBmdW5jdGlvbihhKSB7XG4gIHJldHVybiB0aGlzLmNoYWluKGZ1bmN0aW9uKGYpIHtcbiAgICByZXR1cm4gYS5tYXAoZik7XG4gIH0pO1xufTtcblxuUmVhZGVyLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbihmKSB7XG4gIHJldHVybiB0aGlzLmNoYWluKGZ1bmN0aW9uKGEpIHtcbiAgICByZXR1cm4gUmVhZGVyLm9mKGYoYSkpO1xuICB9KTtcbn07XG5cblJlYWRlci5wcm90b3R5cGUub2YgPSBmdW5jdGlvbihhKSB7XG4gIHJldHVybiBuZXcgUmVhZGVyKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhO1xuICB9KTtcbn07XG5SZWFkZXIub2YgPSBSZWFkZXIucHJvdG90eXBlLm9mO1xuXG5SZWFkZXIuYXNrID0gUmVhZGVyKGZ1bmN0aW9uKGEpIHtcbiAgcmV0dXJuIGE7XG59KTtcblxuUmVhZGVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbih0aGF0KSB7XG4gIHJldHVybiB0aGlzID09PSB0aGF0IHx8XG4gIHRoaXMucnVuID09PSB0aGF0LnJ1biB8fFxuICBSLmVxdWFscyhSZWFkZXIucnVuKHRoaXMpLCBSZWFkZXIucnVuKHRoYXQpKTtcbn07XG5cblJlYWRlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICdSZWFkZXIoJyArIFIudG9TdHJpbmcodGhpcy5ydW4pICsgJyknO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFkZXI7XG4iLCJ2YXIgUiA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydSJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSJ10gOiBudWxsKTtcblxuXG5mdW5jdGlvbiBUdXBsZSh4LCB5KSB7XG4gIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIGNhc2UgMDpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ25vIGFyZ3VtZW50cyB0byBUdXBsZScpO1xuICAgIGNhc2UgMTpcbiAgICAgIHJldHVybiBmdW5jdGlvbih5KSB7XG4gICAgICAgIHJldHVybiBuZXcgX1R1cGxlKHgsIHkpO1xuICAgICAgfTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIG5ldyBfVHVwbGUoeCwgeSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX1R1cGxlKHgsIHkpIHtcbiAgdGhpc1swXSA9IHg7XG4gIHRoaXNbMV0gPSB5O1xuICB0aGlzLmxlbmd0aCA9IDI7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZUNvbmNhdCh4cykge1xuICB4cy5mb3JFYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAodHlwZW9mIHguY29uY2F0ICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoUi50b1N0cmluZyh4KSArICcgbXVzdCBiZSBhIHNlbWlncm91cCB0byBwZXJmb3JtIHRoaXMgb3BlcmF0aW9uJyk7XG4gICAgfVxuICB9KTtcbn1cblxuVHVwbGUub2YgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiBUdXBsZSh4LCB4KTtcbn07XG5cblR1cGxlLmZzdCA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHhbMF07XG59O1xuXG5UdXBsZS5zbmQgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB4WzFdO1xufTtcblxuX1R1cGxlLnByb3RvdHlwZS5vZiA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIFR1cGxlKHRoaXNbMF0sIHgpO1xufTtcblxuLy8gc2VtaWdyb3VwXG5fVHVwbGUucHJvdG90eXBlLmNvbmNhdCA9IGZ1bmN0aW9uKHgpIHtcbiAgZW5zdXJlQ29uY2F0KFt0aGlzWzBdLCB0aGlzWzFdXSk7XG4gIHJldHVybiBUdXBsZSh0aGlzWzBdLmNvbmNhdCh4WzBdKSwgdGhpc1sxXS5jb25jYXQoeFsxXSkpO1xufTtcblxuLy8gZnVuY3RvclxuX1R1cGxlLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbihmKSB7XG4gIHJldHVybiBUdXBsZSh0aGlzWzBdLCBmKHRoaXNbMV0pKTtcbn07XG5cbi8vIGFwcGx5XG5fVHVwbGUucHJvdG90eXBlLmFwID0gZnVuY3Rpb24obSkge1xuICBlbnN1cmVDb25jYXQoW3RoaXNbMF1dKTtcbiAgcmV0dXJuIFR1cGxlKHRoaXNbMF0uY29uY2F0KG1bMF0pLCB0aGlzWzFdKG1bMV0pKTtcbn07XG5cbi8vIHNldG9pZFxuX1R1cGxlLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbih0aGF0KSB7XG4gIHJldHVybiB0aGF0IGluc3RhbmNlb2YgX1R1cGxlICYmIFIuZXF1YWxzKHRoaXNbMF0sIHRoYXRbMF0pICYmIFIuZXF1YWxzKHRoaXNbMV0sIHRoYXRbMV0pO1xufTtcblxuX1R1cGxlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ1R1cGxlKCcgKyBSLnRvU3RyaW5nKHRoaXNbMF0pICsgJywgJyArIFIudG9TdHJpbmcodGhpc1sxXSkgKyAnKSc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFR1cGxlO1xuIiwidmFyIF9lcXVhbHMgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snUiddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUiddIDogbnVsbCkuZXF1YWxzO1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGJhc2VNYXA6IGZ1bmN0aW9uKGYpIHtcbiAgICByZXR1cm4gZih0aGlzLnZhbHVlKTtcbiAgfSxcblxuICBnZXRFcXVhbHM6IGZ1bmN0aW9uKGNvbnN0cnVjdG9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGVxdWFscyh0aGF0KSB7XG4gICAgICByZXR1cm4gdGhhdCBpbnN0YW5jZW9mIGNvbnN0cnVjdG9yICYmIF9lcXVhbHModGhpcy52YWx1ZSwgdGhhdC52YWx1ZSk7XG4gICAgfTtcbiAgfSxcblxuICBleHRlbmQ6IGZ1bmN0aW9uKENoaWxkLCBQYXJlbnQpIHtcbiAgICBmdW5jdGlvbiBDdG9yKCkge1xuICAgICAgdGhpcy5jb25zdHJ1Y3RvciA9IENoaWxkO1xuICAgIH1cbiAgICBDdG9yLnByb3RvdHlwZSA9IFBhcmVudC5wcm90b3R5cGU7XG4gICAgQ2hpbGQucHJvdG90eXBlID0gbmV3IEN0b3IoKTtcbiAgICBDaGlsZC5zdXBlcl8gPSBQYXJlbnQucHJvdG90eXBlO1xuICB9LFxuXG4gIGlkZW50aXR5OiBmdW5jdGlvbih4KSB7IHJldHVybiB4OyB9LFxuXG4gIG5vdEltcGxlbWVudGVkOiBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3Ioc3RyICsgJyBpcyBub3QgaW1wbGVtZW50ZWQnKTtcbiAgICB9O1xuICB9LFxuXG4gIG5vdENhbGxhYmxlOiBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihmbiArICcgY2Fubm90IGJlIGNhbGxlZCBkaXJlY3RseScpO1xuICAgIH07XG4gIH0sXG5cbiAgcmV0dXJuVGhpczogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9XG5cbn07XG4iLCJ2YXIgUiA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydSJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSJ10gOiBudWxsKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSLmN1cnJ5TigzLCBmdW5jdGlvbiBsaWZ0QTIoZiwgYTEsIGEyKSB7XG4gIHJldHVybiBhMS5tYXAoZikuYXAoYTIpO1xufSk7XG4iLCJ2YXIgUiA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydSJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSJ10gOiBudWxsKTtcblxubW9kdWxlLmV4cG9ydHMgPSBSLmN1cnJ5Tig0LCBmdW5jdGlvbiBsaWZ0QTIoZiwgYTEsIGEyLCBhMykge1xuICByZXR1cm4gYTEubWFwKGYpLmFwKGEyKS5hcChhMyk7XG59KTtcbiJdfQ==
