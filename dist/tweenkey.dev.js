/*
 *  Copyright (c) 2016 Iván Juárez Núñez
 *  This code is under MIT license
 *  https://github.com/radixzz/Tweenkey
 */

( function ( root, factory ) {
  if( typeof define === "function" && define.amd ) {
    define( [], factory );
  } else if( typeof module === "object" && module.exports ) {
    module.exports = ( root.Tweenkey = factory() );
  } else {
    root.Tweenkey = factory();
  }
}(this, function() {
   'use strict';

var wnd = window || {};
var PERFORMANCE = wnd.performance;
var TYPE_FNC = ({}).toString;
var m = Math;

var colorRE = new RegExp(/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i);

function _getTypeCheck( typeStr, fastType ) {
    return function( obj ) {
        return fastType ? typeof obj === typeStr:
            TYPE_FNC.call( obj ) === typeStr;
    };
}
// Global object to be shared between modules
var _isFunction = _getTypeCheck( 'function', true );
var _isNumber = _getTypeCheck( 'number', true );
var _isBoolean = _getTypeCheck( 'boolean', true );
var _isString = _getTypeCheck( 'string', true );
var _isArray = Array.isArray || _getTypeCheck( '[object Array]', false );
var _isColor = function( str ) {
    return colorRE.test( str );
}
var _isObject = function( obj ) { 
    return !!obj && obj.constructor === Object
};

var _flatten = function( arr ) { 
    return [].concat.apply( [], arr );
};

var _hexStrToRGB  = function( str ) {
    var hex = parseInt( str.slice( 1 ), 16 );
    return [
        (( hex >> 16 ) & 0xFF) / 255,
        (( hex >> 8 ) & 0xFF) / 255,
        ( hex & 0xFF ) / 255
    ];
};

var _clamp = function( value, min, max ) {
    return m.min( m.max( value, min ), max );
};

var _now = function() {
    return PERFORMANCE && PERFORMANCE.now && PERFORMANCE.now() || +new Date();
};
var _extend = function( target, source, overwrite ) {
    for ( var key in source ) {
        ( overwrite || !( key in target ) ) && ( target[ key ] = source[ key ] );
    }
    return target;
};
var _noop = function() { return false; }

var _minMax = function( obj, arr, key ) {
    return obj.apply( m, arr.map( function( item ) {
        return item[ key ];
    } ) );
}

var _min = function( arr, key ) {
    return _minMax( m.min, arr, key );
}

var _max = function( arr, key ) {
    return _minMax( m.max, arr, key );
}
/**
 * https://github.com/gre/bezier-easing
 * BezierEasing - use bezier curve for transition easing function
 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
 */

var bezierEase = (function () {
    var NEWTON_ITERATIONS = 4;
    var NEWTON_MIN_SLOPE = 0.001;
    var SUBDIVISION_PRECISION = 0.0000001;
    var SUBDIVISION_MAX_ITERATIONS = 10;

    var kSplineTableSize = 11;
    var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

    var float32ArraySupported = typeof Float32Array === 'function';

    function A(aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
    function B(aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
    function C(aA1) { return 3.0 * aA1; }

    // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
    function calcBezier(aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT; }

    // Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
    function getSlope(aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1); }

    function binarySubdivide(aX, aA, aB, mX1, mX2) {
        var currentX, currentT, i = 0;
        do {
            currentT = aA + (aB - aA) / 2.0;
            currentX = calcBezier(currentT, mX1, mX2) - aX;
            if (currentX > 0.0) {
                aB = currentT;
            } else {
                aA = currentT;
            }
        } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
        return currentT;
    }

    function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
        for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
            var currentSlope = getSlope(aGuessT, mX1, mX2);
            if (currentSlope === 0.0) {
                return aGuessT;
            }
            var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
            aGuessT -= currentX / currentSlope;
        }
        return aGuessT;
    }

    return function bezier(mX1, mY1, mX2, mY2) {
        if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
            throw new Error('bezier x values must be in [0, 1] range');
        }

        // Precompute samples table
        var sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
        if (mX1 !== mY1 || mX2 !== mY2) {
            for (var i = 0; i < kSplineTableSize; ++i) {
                sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
            }
        }

        function getTForX(aX) {
            var intervalStart = 0.0;
            var currentSample = 1;
            var lastSample = kSplineTableSize - 1;

            for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
                intervalStart += kSampleStepSize;
            }
            --currentSample;

            // Interpolate to provide an initial guess for t
            var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
            var guessForT = intervalStart + dist * kSampleStepSize;

            var initialSlope = getSlope(guessForT, mX1, mX2);
            if (initialSlope >= NEWTON_MIN_SLOPE) {
                return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
            } else if (initialSlope === 0.0) {
                return guessForT;
            } else {
                return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
            }
        }

        return function BezierEasing(x) {
            if (mX1 === mY1 && mX2 === mY2) {
                return x; // linear
            }
            // Because JavaScript number are imprecise, we should guarantee the extremes are right.
            if (x === 0) {
                return 0;
            }
            if (x === 1) {
                return 1;
            }
            return calcBezier(getTForX(x), mY1, mY2);
        };
    };
})();

var easeIn  = function( power ) { 
    return function( t ) { 
        return m.pow( t, power )
    }
};

var easeOut = function( power ) { 
    return function( t ) {
        return 1 - m.abs( m.pow( t - 1, power ) )
    }
};

var easeInOut = function( power ) {
    return function( t ) {
        return t < .5 ? easeIn( power )( t * 2 ) / 2 : easeOut( power )( t * 2 - 1 ) / 2 + 0.5
    }
};

// The following easing functions where taken from:
// https://github.com/tweenjs/tween.js/blob/master/src/Tween.js

var easeBackIn = function ( t ) {
    var s = 1.70158;
    return t * t * ( ( s + 1) * t - s );
};

var easeBackOut = function ( t ) {
    var s = 1.70158;
    return --t * t * ((s + 1) * t + s) + 1;
};

var easeBackInOut = function ( t ) {
    var s = 1.70158 * 1.525;
    if ((t *= 2) < 1) {
        return 0.5 * (t * t * ((s + 1) * t - s));
    }
    return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
};

var easeBounceIn = function (t) {
    return 1 - easeBounceOut(1 - t);
};

var easeBounceOut = function (t) {
    if (t < (1 / 2.75)) {
        return 7.5625 * t * t;
    } else if (t < (2 / 2.75)) {
        return 7.5625 * (t -= (1.5 / 2.75)) * t + 0.75;
    } else if (t < (2.5 / 2.75)) {
        return 7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375;
    } else {
        return 7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375;
    }
};

var easeBounceInOut = function (t) {
    return t < 0.5 ? easeBounceIn(t * 2) * 0.5 : easeBounceOut(t * 2 - 1) * 0.5 + 0.5;
};

var easeElasticIn = function (t) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    return -m.pow(2, 10 * (t - 1)) * m.sin((t - 1.1) * 5 * m.PI);
};

var easeElasticOut = function (t) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    return m.pow(2, -10 * t) * m.sin((t - 0.1) * 5 * m.PI) + 1;
};

var easeElasticInOut = function (t) {
    if (t === 0) { return 0; }
    if (t === 1) { return 1; }
    t *= 2;
    if (t < 1) {
        return -0.5 * m.pow(2, 10 * (t - 1)) * m.sin((t - 1.1) * 5 * m.PI);
    }
    return 0.5 * m.pow(2, -10 * (t - 1)) * m.sin((t - 1.1) * 5 * m.PI) + 1;
};

var easeCircIn = function (t) {
    return 1 - m.sqrt(1 - t * t);
};

var easeCircOut = function (t) {
    return m.sqrt(1 - (--t * t));
};

var easeCircInOut = function (t) {
    if ((t *= 2) < 1) {
        return - 0.5 * (m.sqrt(1 - t * t) - 1);
    }
    return 0.5 * (m.sqrt(1 - (t -= 2) * t) + 1);
};

var easeSineIn = function (t) {
    return 1 - m.cos(t * m.PI / 2);
};

var easeSineOut = function (t) {
	return m.sin(t * m.PI / 2);
};

var easeSineInOut = function (t) {
	return 0.5 * (1 - m.cos(m.PI * t));
};

var easeExpoIn = function (t) {
	return t === 0 ? 0 : m.pow(1024, t - 1);
};

var easeExpoOut = function (t) {
	return t === 1 ? 1 : 1 - m.pow(2, - 10 * t);
};

var easeExpoInOut = function (t) {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if ((t *= 2) < 1) {
        return 0.5 * m.pow(1024, t - 1);
    }
    return 0.5 * (- m.pow(2, - 10 * (t - 1)) + 2);
};

var lerpColor = function( progress, hexStart, hexEnd ) {
    
}

var wrapEasing = function( fn ) {
    return function( progress, start, end ) {
        return start + fn( progress ) * ( end - start );
    }
};

var easing = {
    'linear'    : wrapEasing( easeInOut(1) ),
    'BackIn'    : wrapEasing( easeBackIn ),
    'BackOut'   : wrapEasing( easeBackOut ),
    'BackInOut' : wrapEasing( easeBackInOut ),
    'BounceIn'  : wrapEasing( easeBounceIn ),
    'BounceOut' : wrapEasing( easeBounceOut ),
    'BounceInOut': wrapEasing( easeBounceInOut ),
    'CircIn'    : wrapEasing( easeCircIn ),
    'CircOut'   : wrapEasing( easeCircOut ),
    'CircInOut' : wrapEasing( easeCircInOut ),
    'CubicIn'   : wrapEasing( easeIn(3) ),
    'CubicOut'  : wrapEasing( easeOut(3) ),
    'CubicInOut': wrapEasing( easeInOut(3) ),
    'ElasticIn' : wrapEasing( easeElasticIn ),
    'ElasticOut': wrapEasing( easeElasticOut ),
    'ElasticInOut': wrapEasing( easeElasticInOut ),
    'ExpoIn'    : wrapEasing( easeExpoIn ),
    'ExpoOut'   : wrapEasing( easeExpoOut ),
    'ExpoInOut' : wrapEasing( easeExpoInOut ),
    'QuadIn'    : wrapEasing( easeIn(2) ),
    'QuadOut'   : wrapEasing( easeOut(2) ),
    'QuadInOut' : wrapEasing( easeInOut(2) ),
    'QuartIn'   : wrapEasing( easeIn(4) ),
    'QuartOut'  : wrapEasing( easeOut(4) ),
    'QuartInOut': wrapEasing( easeInOut(4) ),
    'QuintIn'   : wrapEasing( easeIn(5) ),
    'QuintOut'  : wrapEasing( easeOut(5) ),
    'QuintInOut': wrapEasing( easeInOut(5) ),
    'SineIn'    : wrapEasing( easeSineIn ),
    'SineOut'   : wrapEasing( easeSineOut ),
    'SineInOut' : wrapEasing( easeSineInOut )
};

var rAF, cAF;

// borrowed from https://github.com/soulwire/sketch.js/blob/master/js/sketch.js
(function shimAnimationFrame() {
    var vendors, a, b, c, idx, now, dt, id;
    var then = 0;

    vendors = [ 'ms', 'moz', 'webkit', 'o' ];
    a = 'AnimationFrame';
    b = 'request' + a;
    c = 'cancel' + a;

    rAF = wnd[ b ];
    cAF = wnd[ c ];

    for ( var idx = vendors.lenght; !rAF && idx--; ) {
        rAF = wnd[ vendors[ idx ] + 'Request' + a ];
        cAF = wnd[ vendors[ idx ] + 'Cancel' + a ];
    };

    rAF = rAF || function( callback ) {
        now = _now();
        dt = m.max( 0, 16 - ( now - then ) );
        id = setTimeout(function() {
            callback( now + dt );
        }, dt );
        then = now + dt;
        return id;
    };

    cAF = cAF || function( id ) {
        clearTimeout( id );
    };
})();

function plotTimeline( tl, label ) {
    tl._precomputeTimeline( label );
    var computedItems = tl._computedItems;
    var def = Object.keys( tl._definitions );
    var getLabel = function( obj ) {
        for( var i = 0; i < def.length; i++ ) {
            var key = def[ i ];
            if ( tl._definitions[ key ] === obj ) {
                return key;
            }
        }
        return "?";
    }

    var truncText = function( text, limit ) {
        if ( text.length > limit ) {
            text = text.slice( 0, limit - 1 ) + '\u2026';
        }
        return text;
    }

    var charPad = function( size, char ) {
        return Array.apply( null, Array( size ) )
        .map( String.prototype.valueOf, char ).join('');
    }

    var textPad = function( size, padChar, text ) {
        var s = m.round( ( size - text.length ) / 2 );
        var o = size - s - text.length;
        var left = charPad( s, padChar );
        var right = charPad( o, padChar );
        return left + text + right;
    }

    var logLine = function( arr ) {
        arr.unshift( charPad( ~~( arr.length / 2 ), "%c%s" ) );
        console.log.bind(console).apply( wnd, arr );
    }

    var bg = '';
    var pad4 = 'padding: 4px 0;';
    var pad3 = 'padding: 3px 0;';
    var pad2 = 'padding: 0px 0;';

    var totalDuration = _max( computedItems, 'end' );
    var steps = m.round( totalDuration * 10 );
    var tlStr = [];

    // Print main label name and times
    bg = 'background: #E1BEE7; padding-bottom: 6px; border-bottom: 4px solid #ba9dbf;';
    tlStr.push( [ '', '\n\n' ] );
    tlStr.push( [ pad4 + bg, textPad( 14, ' ', tl._startLabel ) ] );
    tlStr.push( [ pad4, ' ' ] );
    for( var i = 0; i < m.ceil( totalDuration ); i++ ) {
        tlStr.push( [ pad4, i + 's' ] );
        tlStr.push( [ pad4, charPad( 9 - i.toString().length, '\u2009' ) ] );
    }

    tlStr.push( [ '', '\n' ] );


    // Print timeline start/end and marks line
    bg = 'background: #C5CAE9; padding-bottom: 4px;';
    tlStr.push( [ bg, textPad( 7, ' ', 'Start' ) ] );
    tlStr.push( [ bg, textPad( 7, ' ', 'End' ) ] );

    bg = 'background: #D1C4E9; color:#B39DDB; padding-bottom: 1px;';
    tlStr.push( [ bg, '\u2009' ] );
    var mark = 0;
    for( var i = 0; i < m.ceil( totalDuration * 2 ); i++ ) {
        tlStr.push( [ bg,  mark % 1 ? '\u25AB' : '\u25BE' ] );
        tlStr.push( [ bg, charPad( 4, '\u2009' ) ] );
        mark += 0.5;
    }
    logLine( _flatten( tlStr ) );

    // Print each timeline item
    var colors = ['E91E63', 'F44336', '9C27B0', '673AB7', '3F51B5', '2196F3' ];
    for( var i = 0; i < computedItems.length; i++ ) {
        var item = computedItems[ i ];
        var sp = charPad( m.round( item.start * 10 ), '\u2219' );
        var tSize = m.max( 2, m.round( ( item.end - item.start ) * 10 ) ) ;
        bg = textPad( tSize, '\u2009', truncText( getLabel( item.obj ), tSize ) );
        var c = colors[ i % colors.length ];
        var strings = _flatten( [
            [ "padding: 2px 0; background: #C5E1A5; color: black;", textPad( 7, ' ', item.start.toFixed( 2 ) ) ],
            [ "padding: 2px 0; background: #FF5252; color: black;", textPad( 7, ' ', item.end.toFixed( 2 ) ) ],
            [ "background: white; color: #802929;", "\u2009\u2009" ],
            [ 'background: white; color: #' + c, sp ],
            [ 'color: white; background: #' + c, bg ]
        ]);
        logLine( strings );
    }
}

// TODO: add a sleep tweens layer to avoid main tweens array from getting too big
var tweens = [];
var tickers = [];
var mainTicker;

var PROP_NUMBER = 0;
var PROP_ARRAY = 1;
var PROP_COLOR = 2;
var PROP_WAYPOINTS = 3;
var PROP_INVALID = 4;

var TL_ITEM_TWEEN = 0;
var TL_ITEM_CALLBACK = 1;
var TL_ITEM_LINE_SYNC = 2;
var TL_ITEM_LINE_ASYNC = 3
var TL_ITEM_DELAY = 4;
var TL_ITEM_LABEL = 5;
var TL_ITEM_INVALID = 6;

// Flat dictionary to track all objects properties.
// Id's are formed from objectId + propertyName
var propDict = {};
var propDictIdx = 1;

/*
* Disables only <enabled> properties of a tween and removes them from dictionary.
* Keys param specifies an array containing which properties to disable, by default
* if no keys param is provided all enabled properties will be disabled.
*/
function disableProperties( tween, keys ) {

    var all = ! _isArray( keys );
    var currentNode = tween._firstNode;

    do {
        for ( var idx = currentNode.properties.length; idx--; ) {

            var property = currentNode.properties[ idx ];

            if ( property.enabled && ( all || keys.indexOf(property.name) > -1 ) ) {
                property.enabled = false;
                delete propDict[ property.id ];
            }

        }
    } while ( currentNode = currentNode.next );
}

/*
* Reassigns all <enabled> properties from tween targets into the dictionary,
* if a property exists it will disable it prior deletion
*/
function overrideDictionaryProperties( tween ) {
    var currentNode = tween._firstNode;

    do {
        for ( var idx = currentNode.properties.length; idx--; ) {
            var property = currentNode.properties[ idx ];
            if ( property.enabled ) {
                
                // If there is a running property disable it
                // and remove it from dictionary
                if ( propDict[ property.id ] && propDict[ property.id ] !== property) {
                    propDict[ property.id ].enabled = false;
                    delete propDict[ property.id ];
                }

                propDict[ property.id ] = property;
            }
        }
    } while ( currentNode = currentNode.next );
}

/*
* Sync values between object properties and target properties
*/
function syncTargetProperties( tween ) {
    var currentNode = tween._firstNode;
    do {
        for ( var idx = currentNode.properties.length; idx--; ) {
            currentNode.properties[ idx ].refresh();
        }
    } while ( currentNode = currentNode.next );
}

function getPropertyType( s, e, t ) {

    if ( _isNumber( s ) &&
         _isNumber( e ) &&
         _isNumber( t ) ) {
            return PROP_NUMBER;
    } else if (
        colorRE.test( s ) &&
        colorRE.test( e ) &&
        colorRE.test( t ) ) {
            return PROP_COLOR;
    } else if ( 
        _isArray( s ) &&
        _isArray( e ) &&
        _isArray( t ) ) {
            return PROP_ARRAY;
    } else if (
        _isNumber( s ) &&
        _isArray( e ) &&
        _isNumber( t )
    ) {
        return PROP_WAYPOINTS;
    } else {
        return PROP_INVALID;
    }
}

function TweenProperty( id, name, target, origProps, targetProps ) {
    this.id = id;
    this.name = name;
    this.target = target;
    this.origProps = origProps;
    this.targetProps = targetProps;
    this.enabled = true;
    this.length = 0;
}

TweenProperty.prototype._expandArrayProperties = function( o, t ) {
    var tp = this.target[ this.name ];
    var len = m.max( o.length, t.length );
    for ( var i = 0; i < len; i++ ) {
        o[ i ] = o[ i ] != undefined ? o[ i ] : tp[ i ];
        t[ i ] = t[ i ] != undefined ? t[ i ] : tp[ i ];
    }
    this.length = len;
}

TweenProperty.prototype.refresh = function() {

    this.start = this.origProps[ this.name ];
    if ( this.start === undefined ) {
        this.start = this.target[ this.name ];
    }
    
    this.end = this.targetProps[ this.name ];
    if ( this.end === undefined ) {
        this.end = this.target[ this.name ];
    }

    this.type = getPropertyType(
        this.start, this.end, this.target[ this.name ] );
    
    if ( this.type == PROP_ARRAY ) {
        this._expandArrayProperties( this.start, this.end );
    } else if ( this.type == PROP_WAYPOINTS ) {
        this.waypoints = [ this.start ].concat( this.end );
    } else if ( this.type == PROP_COLOR ) {
        this.colorStart = _hexStrToRGB( this.start );
        this.colorEnd = _hexStrToRGB( this.end );
    }
}

function Tween( params ) {
    
    this._initted = false;
    var target = params.shift();
    
    if ( typeof target == 'object' && params.length > 0 ) {
        initTween( this, target, params );
    } else {
        throw 'Invalid Tween';
    }

    return this;
}

function updateTweenProperties( tween ) {
    var currentNode = tween._firstNode;
    var updatedTargets = 0;

    do {
        var updated = false;
        for ( var idx = currentNode.properties.length; idx--; ) {
            var p = currentNode.properties[ idx ];
            if ( p.enabled && p.type !== PROP_INVALID ) {
                
                switch( p.type ) {
                    case PROP_ARRAY:
                        var arr = currentNode.target[ p.name ];
                        for ( var j = 0; j < p.length; j++ ) {
                            var start = p.start[ j ];
                            var end = p.end[ j ] - start;
                            
                            arr[ j ] = tween._ease(
                                tween._progress,
                                start,
                                end
                            );
                        }
                        break;
                    case PROP_NUMBER:
                        currentNode.target[ p.name ] = tween._ease(
                            tween._progress,
                            p.start,
                            p.end
                        );
                        break;
                    case PROP_WAYPOINTS:
                        var len = p.waypoints.length - 1;
                        var a = len *  tween._progress;
                        var b = m.floor( a );
                        var val = tween._ease(
                            a - b,
                            p.waypoints[ b ],
                            p.waypoints[ b + 1 > len ? len : b + 1 ]
                        );
                        currentNode.target[ p.name ] = val;
                        break;
                    case PROP_COLOR:
                        var prog = tween._progress;
                        var r = tween._ease( prog, p.colorStart[ 0 ], p.colorEnd[ 0 ] );
                        var g = tween._ease( prog, p.colorStart[ 1 ], p.colorEnd[ 1 ] );
                        var b = tween._ease( prog, p.colorStart[ 2 ], p.colorEnd[ 2 ] );
                        var hex = ( ( r * 255 ) << 16 ) + ( ( g * 255) << 8 ) + ( b * 255 | 0 );
                        currentNode.target[ p.name ] = '#' + hex.toString( 16 );
                        break;
                }
                
                updated = p.type !== PROP_INVALID;
            } else {
                // We remove the property entirely to avoid performance
                // issues due many disabled properties loopping.
                // Restarting the loop will bring back the removed
                // properties by calling resetTargetProperties()
                currentNode.properties.splice( idx, 1 );
            }
        }

        updatedTargets += updated | 0;

    } while ( currentNode = currentNode.next );

    return updatedTargets;
}

/*
* Updates the properties of a given tween
*/
function tweenTick( tween, dt ) {
    var step = dt * tween._timeScale;

    if ( tween._delayLeft > 0 ) {
        var delayStep = _clamp( step, 0, tween._delayLeft );
        tween._delayLeft -= delayStep;
        step -= delayStep;
    }

    if ( tween._delayLeft == 0 ) {

        if ( tween._syncNextTick ) {
            tween._syncNextTick = false;
            // Update current properties from targets
            syncTargetProperties( tween );

            // Kill all previous active properties in tween
            overrideDictionaryProperties( tween );
        }

        if ( ! tween._started ) {
            tween._started = true;
            // Fire onStart notification
            tween._onStart( tween._target );
        }

        tween._elapsedTime += step * tween._direction;
        if ( tween._elapsedTime < 0 ) {
            tween._elapsedTime = 0;
        }

        // Default progress for tween.set
        tween._progress = 1;
        if ( tween._duration > 0 ) {
            
            tween._progress = m.round( ( tween._elapsedTime / tween._duration ) * 10000 ) / 10000;

            if ( tween._progress > 1 ) {
                tween._progress = 1;
            }

            if ( tween._progress < 0 ) {
                tween._progress = 0;
            }

        }

        // Update tween properties with current progress
        var updatedTargets = updateTweenProperties( tween );

        // Fire onUpdate notification only if one or more properties were updated
        if ( updatedTargets > 0 ) {
            tween._onUpdate( tween._target );
        } else {

            // No updated targets means all properties where overrided
            // We kill the tween early to avoid further notifications
            tween.kill();
        }
    }

    // Tween finished?
    if ( tween._delayLeft === 0 && tween._direction == 1 &&
        tween._elapsedTime >= tween._duration ||
        tween._direction == -1 && tween._elapsedTime == 0 ) {

        if ( tween._alive ) {
            if ( tween._repeatLeft > 0 ) {
                tween._repeatLeft--;
            }

            if ( tween._repeatLeft == 0 ) {
                tween._onComplete( tween._target );
                tween.kill();
            } else {
                if ( tween._yoyo ) {
                    tween._direction *= -1;
                } else {
                    tween._elapsedTime = 0;
                }
                tween._delayLeft = tween._repeatDelay;
                tween._onRepeat( tween._target );
            }
        }
    
    }
}

/*
* Builds a linked list of all objects and properties to iterate
* It stores the first linked object in the current tween
*/
function resetTargetProperties( tween, targetProperties, originProperties ) {

    var targets =  _isArray( tween._target ) ? tween._target : [ tween._target ];
    var prevNode, firstNode;

    // merge keys of targetProperties and originProperties without duplicates
    var allKeys = Object.keys( targetProperties );
	var oKeys = Object.keys( originProperties );
	for ( var i = 0; i < oKeys.length; i++ ) {
		if ( ! targetProperties[ oKeys[ i ] ] ) {
			allKeys.push( oKeys[ i ] );
		}
	}

    for ( var idx = targets.length; idx--; ) {
        var currentTarget = targets[ idx ];

        // Tag object id without overwrite
        currentTarget._twkId = currentTarget._twkId || propDictIdx++;

        var properties = [];
        for ( var pIdx = 0; pIdx < allKeys.length; pIdx++ ) {
            var key = allKeys[ pIdx ];

            // Check if key is not a tween property
            // also we check that the property exists on target
            if ( !tween.hasOwnProperty( key ) && key in currentTarget ) {
                var property = new TweenProperty(
                    currentTarget._twkId + key,
                    key,
                    currentTarget,
                    originProperties,
                    targetProperties
                );

                property.refresh();
                properties.push( property );
            }
        }

        var currentNode = {
            target      : currentTarget,
            properties  : properties
        };

        firstNode = firstNode || currentNode;

        if ( prevNode ) {
            prevNode.next = currentNode;
        }

        prevNode = currentNode;
    }

    tween._firstNode = firstNode;
}

function popTweenFromRenderer( tween ) {
    var idx = tweens.indexOf( tween );
    if ( idx !== -1 ) {
        tweens.splice( idx, 1 );
        tween._queued = false;
    }
}

function pushTweenToRenderer( tween ) {
    if ( ! tween._queued ) {
        resetTargetProperties( tween, tween._to, tween._from );
        
        tweens.push( tween );
        
        // flag to avoid pushing again to renderer
        tween._queued = true; 

        // refresh all properties
        tween._syncNextTick = true;

        // fire onStart event
        tween._started = false;
    }
}

function getEasing( val ) {
    if ( easing[ val ] ) {
        return easing[ val ];
    } else if ( _isArray( val ) && val.length == 4 ) {
        return wrapEasing( bezierEase.apply( this, val ) );
    } else {
        if ( val != undefined ) {
            var easingNames = Object.keys( easing ).join(' | ');
            console.warn( 'Invalid easing name: ' + val );
            console.warn( 'Available easings: ' + easingNames );
        }
        return easing.linear;
    }
}

function initTween( tween, target, params ) {

    var duration = params.shift();
    var cfg = params.shift();

    // expecting duration in position 1
    // buf if an object was given instead
    // then treat it as Tween.set
    if ( _isObject( duration ) ) {
        cfg = duration;
        duration = 0;
    }

    // Initialize tween properties
    var delay = _isNumber( cfg.delay ) ? m.max( 0, cfg.delay ) : 0;
    var repeatCount = _isNumber( cfg.repeat ) ? cfg.repeat : 0;

    tween._target       = target;
    tween._started      = false;
    tween._queued       = false;
    tween._syncNextTick = true;
    tween._direction    = 1;
    tween._progress     = 0;
    tween._elapsedTime  = 0;
    tween._alive        = true;
    tween._delay        = delay;
    tween._delayLeft    = delay;
    tween._yoyo         = _isBoolean( cfg.yoyo ) ? cfg.yoyo : false;
    tween._repeat       = tween._yoyo ? -1 : repeatCount;
    tween._repeatLeft   = tween._repeat;
    tween._ease         = getEasing( cfg.ease );
    tween._from         = _isObject( cfg.from ) ? cfg.from : {};
    tween._to           = _isObject( cfg.to ) ? cfg.to: {};
    tween._repeatDelay  = _isNumber( cfg.repeatDelay ) ? m.max( 0, cfg.repeatDelay ) : 0;
    tween._timeScale    = _isNumber( cfg.timeScale ) && cfg.timeScale > 0 ? cfg.timeScale: 1;
    tween._duration     = _isNumber( duration ) ? m.max( 0, duration ) : 0;
    tween._running      = _isBoolean( cfg.autoStart ) ? cfg.autoStart : true;
    tween._onStart      = _isFunction( cfg.onStart ) ? cfg.onStart : _noop;
    tween._onUpdate     = _isFunction( cfg.onUpdate ) ? cfg.onUpdate : _noop;
    tween._onComplete   = _isFunction( cfg.onComplete ) ? cfg.onComplete : _noop;
    tween._onRepeat     = _isFunction( cfg.onRepeat ) ? cfg.onRepeat : _noop;
    tween._initted      = _isBoolean( cfg.initted ) ? cfg.initted : true;
    tween._params       = cfg;

}

function tweenSeek( tween, time, accountForDelay, inSeconds ) {
    
    if ( ! _isNumber( time ) ) {
        return false;
    }

    var accountForDelay = _isBoolean( accountForDelay ) ? accountForDelay : false;
    var totalDuration = accountForDelay ? tween._duration + tween._delay : tween._duration;
    time = _clamp( time, 0, inSeconds ? totalDuration : 1);
    var timeSeconds = inSeconds ? time : time * totalDuration;
    
    tween._elapsedTime = timeSeconds;

    if ( accountForDelay && timeSeconds > tween._delay ) {
        tween._delayLeft = timeSeconds - ( timeSeconds - tween._delay );
        tween._elapsedTime -= tween._delayLeft;
    }
    
}

Tween.prototype = {
    delay: function( seconds ) {
        this._delayLeft = this._delay = seconds;
        return this;
    },
    progress: function( progress, accountForDelay ) {
        tweenSeek( this, progress, accountForDelay, false );
        return this;
    },
    time: function( seconds, accountForDelay ) {
        tweenSeek( this, seconds, accountForDelay, true );
        return this;
    },
    render: function() {
        overrideDictionaryProperties( this );
        updateTweenProperties( this );
    },
    restart: function( accountForDelay, immediateRender ) {

        // default for accountForDelay is false
        accountForDelay = _isBoolean( accountForDelay ) ? accountForDelay : false;
        
        // default for immediateRender is true
        immediateRender = _isBoolean( immediateRender ) ? immediateRender : true;

        this._elapsedTime = 0;
        this._progress = 0;

        this._delayLeft = accountForDelay ? this._delay : 0;
        this._alive = true;
        this._direction = 1;
        this._started = false;
        this.resume();

        if ( immediateRender || this._delayLeft > 0 ) {
            this.render();
        }

        return this;
    },
    reverse: function() {
        this._direction *= -1;
        return this;
    },
    timeScale: function( scale ) {
        if ( _isNumber( scale ) && scale > 0 ) {
            this._timeScale = scale;
        }
        return this;
    },
    kill: function() {
        if ( arguments.length > 0 ) {

            // fix: avoid optimization bailout
            var args = [];
            for ( var i = 0; i < arguments.length; ++i ) {
                args[ i ] = arguments[ i ];
            }
            disableProperties( this, args );
        } else {
            this._alive = false;
            this._running = false;
        }
        return this;
    },
    pause: function() {
        this._running = false;
        return this;
    },
    resume: function() {
        this._running = true;
        pushTweenToRenderer( this );
        return this;
    },
    stop: function() {
        popTweenFromRenderer( this );
        return this;
    },
    duration: function() {
        var s = this._timeScale;
        var d = this._duration / s;
        if ( this._repeat > 1 ) {
            var repeatTime = ( this._repeat - 1 ) * this._repeatDelay;
            d = ( d * this._repeat ) + repeatTime / s;
        }
        return d + this._delay / s;
    },
    toString: function() {
        return '[object Tween]';
    }
};

function executeOnAllTweens ( funcName ) {
    return function() {
        for ( var idx = tweens.length; idx--; ) {
            var tween = tweens[ idx ];
            tween[ funcName ].apply( tween, arguments );
        }
    };
}

function updateTweens( delta ) {

    // clear killed tweens
    for ( var idx = tweens.length; idx--; ) {
        if ( ! tweens[ idx ]._alive ) {
            tweens[ idx ]._queued = false;
            tweens.splice( idx, 1 );
        }
    }

    // update tweens (order matters)
    for ( var idx = 0, length = tweens.length; idx < length; idx++  ) {
        tweens[ idx ]._running && tweenTick( tweens[ idx ], delta );
    }
}

function onFrame() {
    var now = _now();
    var requestNextFrame = false;

    if ( mainTicker._running ) {
        mainTicker.tick( now );
        requestNextFrame = true;
    }

    // Update tickers
    for ( var idx = tickers.length; idx--; ) {
        
        var ticker = tickers[ idx ];
        
        if ( ticker._running ) {
            ticker.tick( now );
            requestNextFrame = true;
        }

        if ( ! ticker._alive ) {
            tickers.splice( idx, 1 );
        }
    }

    if ( requestNextFrame ) {
        rAF( onFrame );
    }
}

function newTicker( params ) {
    var ticker = new Ticker( params );
    tickers.push(ticker);
    return ticker;
}

function Ticker( params ) {
    params = params || {};
    this._onTick = _isFunction( params.onTick ) ? params.onTick : _noop;
    this._alive = true;
    this.setFPS( params.fps );
    this.resume();
}

Ticker.prototype = {
    pause: function() {
        this._running = false;
        return this;
    },
    resume: function() {
        this._then = _now();
        this._running = true;
        rAF( onFrame );
        return this;
    },
    kill: function() {
        this._alive = false;
        return this;
    },
    tick: function( time ) {
        var delta = time - this._then;

        if ( delta > this._fpsStep ) {
            var drop = delta % this._fpsStep;
            this._then = time - drop;
            this._onTick( m.min( delta - drop, this._fpsStep * 2 ) / 1000 );
        }

        return this;
    },
    setFPS: function( fps ) {
        this.fps = _isNumber( fps ) && fps > 0 ? fps : 60;
        this._fpsStep = 1000 / this.fps;
    },
    toString: function() {
        return '[object Ticker]';
    }
}

function setAutoUpdate( enabled ) {
    if ( enabled ) {
        mainTicker.resume();
    } else {
        mainTicker.pause();
    }
}

function manualStep( step ) {
    step = typeof step == 'number' ? step : mainTicker._fpsStep;
    if ( step < 0 ) {
        step = 0;
    }
    ! mainTicker._running && updateTweens( step );
}

function newTweenFactory() {        
    return function create() {

        // fix: avoid optimization bailout
        // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
        var i = arguments.length;
        var args = [];
        while (i--) args[i] = arguments[i];

        var tween = new Tween( args );
        if ( tween._initted ) {
            pushTweenToRenderer( tween );
        }
        return tween;
    };
}

function getDefinitionType( obj ) {
    if ( obj instanceof Tween ) {
        return TL_ITEM_TWEEN;
    } else if ( _isNumber( obj ) ){
        return TL_ITEM_DELAY;
    } else if ( _isString( obj ) ) {
        return TL_ITEM_LABEL;
    } else if ( _isFunction( obj ) ) {
        return TL_ITEM_CALLBACK;
    } else if ( _isArray( obj ) ) {
        return TL_ITEM_LINE_SYNC;
    } else if ( _isObject( obj ) ) {
        return TL_ITEM_LINE_ASYNC;
    } else {
        return TL_ITEM_INVALID;
    }
}

function isValidLine( labels, lineArray ) {
    var valid = true;
    for( var i = 0; i < lineArray.length; i++ ) {
        var item = lineArray[ i ];
        var type = getDefinitionType( item );
        if ( type == TL_ITEM_INVALID ) {
            valid = false;
        } else if ( type == TL_ITEM_LABEL ) {
            valid = labels[ item ] !== undefined;
        
        // validate nested arrays recursively
        } else if ( type == TL_ITEM_LINE_SYNC ) {
            valid = isValidLine( labels, item );
        
        // validate that objects have only numbers assigned
        // only numbers are valid
        } else if ( type == TL_ITEM_LINE_ASYNC ) {
            var keys = Object.keys( item );
            for( var j = 0; j < keys.length; j++ ) {
                var key = keys[ j ];
                if ( !_isNumber( item[ key ] ) ) {
                    valid = false;
                    break;
                }
            }
        }

        if ( ! valid ) {
            console.warn( 'Unknown label value:', item );
            break;
        }
    }
    return valid;
}

function TimelineItem( obj, type, start, end ) {
    this.obj = obj;
    this.type = type;
    this.start = start;
    this.end = end;
}

// Get the final object of a label
// resolves indirections of n labels to an object
function resolveLabel( items, val ) {
    return _isString( val ) ? resolveLabel( items, items[ val ] ) : val;
}

// Resolves all labels in items to their final objects
// returns a flatten array with all the items
function resolveItemLabels( items, arr ) {
    var done = true;
    for( var i = 0; i < arr.length; i++ ) {
        var val = resolveLabel( items, arr[ i ] );

        if ( _isString( val ) ) {
            done = false;
            break;
        }

        if ( _isArray( val ) ) {
            arr[ i ] = resolveItemLabels( items, val );
        } else {
            arr[ i ] = val;
        }
    }

    if ( ! done ) {
        arr = resolveItemLabels( items, arr );
    }
    
    return _flatten( arr );
}

// adjust current items to start from 0
// shifting negative offsets over all items
function absShiftTimeLineItems( items ) {
    var minOffset = _min( items, 'start' );
    if ( minOffset < 0 ) {
        var shift = m.abs( minOffset );
        for ( var i = 0; i < items.length; i++ ) {
            items[ i ].start += shift;
            items[ i ].end += shift;
        }
    }
    return items;
}

function getItemsDuration( items ) {
    return _max( items, 'end' ) - _min( items, 'start' );
}

function computeTimeLineItems( items, startLabel, offset ) {
    offset = offset || 0 ;
    var result = [];
    var line = resolveLabel( items, startLabel );
    line = _isArray( line ) ? line : [ line ];

    // resolve all labels to objects and flatten all
    // excluding async blocks
    var rLine = resolveItemLabels( items, line );
    for ( var i = 0; i < rLine.length; i++ ) {
        var obj = rLine[ i ];
        var type = getDefinitionType( obj );
        if ( type == TL_ITEM_DELAY ) {
            offset += obj;
        } else {
            var start = offset; 
            var end = offset;
            
            if ( type == TL_ITEM_TWEEN ) {
                end = start + obj.duration();
            }

            if ( type == TL_ITEM_LINE_ASYNC ) {
                var keys = Object.keys( obj );
                var subItems = [];
                var min = 0;
                for( var j = 0; j < keys.length; j++ ) {
                    var key = keys[ j ];
                    min = m.min( min, obj[ key ] );

                    // apply global offset
                    var aOffset = obj[ key ] + offset;

                    // compute label recursively
                    subItems = subItems.concat(
                        computeTimeLineItems( items, key, aOffset ) );
                }
                result = result.concat( subItems );
                
                // add current block duration to global offset ( positive only )
                offset += getItemsDuration( subItems );

                // sub negative displacement in block to global offset
                offset += min < 0 ? min : 0;
            } else {
                result.push( new TimelineItem( obj, type, start, end ) );
                offset += end - start;
            }
        }
    }
    return result;
}

function Timeline ( params ) {
    params = params || {};
    this.timeScale( params.timeScale );
    this.delay( params.delay );
    this.yoyo( params.yoyo );
    this._direction = 1;
    this._definitions = {};
    this._elapsedTime = 0;
    this._computedItems = [];
    this._startLabel = '';
    this._ticker = newTicker({
        onTick: this.tick.bind( this )
    });
    this._ticker.pause();
}

Timeline.prototype = {
    let: function( label, obj ) {
        var type = getDefinitionType( obj );
        if ( _isString( label ) && type != TL_ITEM_INVALID ) {
            
            var isLine = type == TL_ITEM_LINE_SYNC || type == TL_ITEM_LINE_ASYNC;
            if ( isLine && !isValidLine( this._definitions, obj ) ) {
                return this;
            }
            
            if ( type == TL_ITEM_TWEEN ) {
                // remove tween object from main renderer
                obj.stop();
            }

            this._definitions[ label ] = obj;
            this._needsRecompute = true;
        }
    },
    tick: function( dt ) {
        this._precomputeTimeline();
        this._elapsedTime += ( dt * this._timeScale ) * direction;
        
        for( var i = 0; i < this._computedItems.length; i++ ) {
            var item = this._computedItems[ i ];
            if ( direction == 1 && this._elapsedTime >= item.start ||
                 direction == -1 && this._elapsedTime <= item.end ) {
                if ( item.type == TL_ITEM_TWEEN ) {
                    item.obj._elapsedTime = this._elapsedTime - item.start;
                    tweenTick( item.obj, 0 );
                }

                if ( item.type = TL_ITEM_CALLBACK ) {
                    item.obj.apply( this );
                }
            }
        }
    },
    delay: function( value ) {
        this._delay = _isNumber( value ) ? value : 0;
    },
    _precomputeTimeline: function( label ) {
        if ( this._needsRecompute ) {
            label = label || this._startLabel;
            var items = computeTimeLineItems( this._definitions, label );
            this._computedItems = absShiftTimeLineItems( items );
            this._duration = getItemsDuration( this._computedItems );
            this._needsRecompute = false;
        }
    },
    plot: function( label ) {
        if ( typeof plotTimeline !== 'undefined' )
            plotTimeline( this, label );
    },
    reverse: function() {
        this._direction *= -1; 
    },
    yoyo: function( value ) {
        this._yoyo = _isBoolean( value ) ? value: false;
    },
    duration: function() {
        this._precomputeTimeline();
        return this._duration;
    },
    timeScale: function( value ) {
        this._timeScale = _isNumber( value ) ? m.max( 0, value ) : 1;
    },
    seek: function() {
        return this;
    },
    pause: function() {
        this._ticker.pause();
        return this;
    },
    resume: function() {
        this._ticker.resume();
        return this;
    },
    play: function( label ) {
        this._startLabel = label;
        this._ticker.resume();
        return this;
    },
    kill: function() {
        this._ticker.kill();
        return this;
    }
};

function newTimeline( params ) {
    return new Timeline( params );
}

mainTicker = new Ticker({ onTick: updateTweens });

var instance = new function Tweenkey(){};

return _extend( instance, {
    set         : newTweenFactory(),
    tween       : newTweenFactory(),
    killAll     : executeOnAllTweens( 'kill' ),
    killTweensOf: function() { console.log('todo'); },
    pauseAll    : executeOnAllTweens( 'pause' ),
    resumeAll   : executeOnAllTweens( 'resume' ),
    timeline    : newTimeline,
    ticker      : newTicker,
    update      : manualStep,
    autoUpdate  : setAutoUpdate,
    setFPS      : mainTicker.setFPS.bind( mainTicker )
} );


}));