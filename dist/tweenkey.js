/*
 *  Copyright (c) 2016 Iván Juárez Núñez
 *  This code is under MIT license
 *  https://github.com/radixzz/Tweenkey
 */

( function ( root, factory ) {
  console.log( root );
  if( typeof define === "function" && define.amd ) {
    define( [], factory );
  } else if( typeof module === "object" && module.exports ) {
    module.exports = ( root.Tweenkey = factory() );
  } else {
    root.Tweenkey = factory();
  }
}(this, function() {
   'use strict';

var easing = {
    'EaseOut': function() {
        console.log( 'easeOut!!!' );
    }
};

easing.EaseOut();

var rAF, cAF;
var instance = new function Tweenkey(){};
var tweens = [];
var tickers = [];
var mainTicker;

// Flat dictionary to track all objects properties.
// Id's are formed from objectId + propertyName
var propDict = {};
var propDictIdx = 1;

var m = Math;
var wnd = Window || {};
var TYPE_FNC = ({}).toString;
var PERFORMANCE = wnd.performance;

var TWEEN_SET       = 0;
var TWEEN_TO        = 1;
var TWEEN_FROM      = 2;
var TWEEN_FROM_TO   = 3;

function getTypeCheck( typeStr, fastType ) {
    return function( obj ) {
        return fastType ? typeof obj === typeStr:
            TYPE_FNC.call( obj ) === typeStr;
    };
}

// Global object to be shared between modules
var _g = {
    isFunction      : getTypeCheck( 'function', true ),
    isObject        : getTypeCheck( '[object Object]', false ),
    isArray         : Array.isArray || getTypeCheck( '[object Array]', false ),
    isNumber        : getTypeCheck( 'number', true ),
    isBoolean       : getTypeCheck( 'boolean', true ),
    clamp: function( value, min, max ) {
        return m.min( m.max( value, min ), max );
    },
    now: function() {
        return PERFORMANCE && PERFORMANCE.now && PERFORMANCE.now() || +new Date();
    },
    lerp: function( t, b, c, d ) {
        return c * t / d + b;
    },
    extend: function( target, source, overwrite ) {
        for ( var key in source ) {
            ( overwrite || !( key in target ) ) && ( target[ key ] = source[ key ] );
        }
        return target;
    },
    noop: function() { return false; }
};

/*
    * Disables only <enabled> properties of a tween and removes them from dictionary.
    * Keys param specifies an array containing which properties to disable, by default
    * if no keys param is provided all enabled properties will be disabled.
    */
function disableProperties( tween, keys ) {

    var all = ! _g.isArray( keys );
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

function Property( id, name, originProperties, targetProperties ) {
    this.id = id;
    this.name = name;
    this.originProperties = originProperties;
    this.targetProperties = targetProperties;
    this.enabled = true;
}

Property.prototype.refresh = function() {
    this.start = this.originProperties[ this.name ];
    this.end = this.targetProperties[ this.name ];
}

function Tween( type, params ) {
    
    this._initted = false;
    var target = params.shift();
    
    if ( typeof target == "object" ) {
        initTween( this, target, params );
    } else {
        throw "Invalid Tween";
    }

    return this;
}


function updateTweenProperties( tween ) {
    var currentNode = tween._firstNode;
    var updatedTargets = 0;

    do {
        var updated = false;
        for ( var idx = currentNode.properties.length; idx--; ) {
            var property = currentNode.properties[ idx ];
            if ( property.enabled ) {
                currentNode.target[ property.name ] = tween._ease(
                    tween._progress,
                    property.start,
                    property.end - property.start,
                    1
                );
                updated = true;
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
        var delayStep = _g.clamp( step, 0, tween._delayLeft );
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
            tween._onStart();
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
            tween._onUpdate();
        } else {

            // No updated targets means all properties where overrided
            // We kill the tween early to avoid further notifications
            tween.kill();
        }
    }

    // Tween finished?
    if ( tween._direction == 1 && tween._elapsedTime >= tween._duration ||
        tween._direction == -1 && tween._elapsedTime == 0 ) {

        if ( tween._alive ) {
            
            if ( tween._repeatLeft > 0 ) {
                tween._repeatLeft--;
            }

            if ( tween._repeatLeft == 0 ) {
                tween._onComplete();
                tween.kill();
            } else {
                if ( tween._yoyo ) {
                    tween._direction *= -1;
                } else {
                    tween._elapsedTime = 0;
                }
                tween._delayLeft = tween._repeatDelay;
                tween._onRepeat();
            }
        }
    
    }
}

/*
    * Builds a linked list of all objects and properties to iterate
    * It stores the first linked object in the current tween
    */
function resetTargetProperties( tween, targetProperties, originProperties ) {

    var targets =  _g.isArray( tween._target ) ? tween._target : [ tween._target ];
    var prevNode, firstNode;

    for ( var idx = targets.length; idx--; ) {
        var currentTarget = targets[ idx ];

        // Tag object id without overwrite
        currentTarget._twkId = currentTarget._twkId || propDictIdx++;

        // If originProperties is defined then override start values of the object
        originProperties = originProperties || currentTarget;
        var properties = [];
        for ( var key in targetProperties ) {

            // Tweeneable param names can only be numbers and not tween property names
            // also we check that the property exists on target
            if ( !tween.hasOwnProperty( key ) && key in currentTarget &&
                _g.isNumber( targetProperties[ key ] ) ) {

                var property = new Property(
                        currentTarget._twkId + key,
                        key,
                        originProperties,
                        targetProperties
                    );

                // Swap from and to values if is tween from
                if ( tween._type == TWEEN_FROM || tween._type == TWEEN_FROM_TO ) {
                    property.targetProperties = originProperties;
                    property.originProperties = targetProperties;
                }

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

function pushTweenToRenderer( tween ) {
    if ( ! tween._queued ) {
        resetTargetProperties( tween, tween._params[ 0 ], tween._params[ 1 ] );
        
        tweens.push( tween );
        
        // flag to avoid pushing again to renderer
        tween._queued = true; 

        // refresh all properties
        tween._syncNextTick = true;

        // fire onStart event
        tween._started = false;
    }
}

function initTween( tween, target, params ) {

    var duration = params.shift();
    var params1 = params.shift();
    var params2 = params.shift();

    // Swap duration to params1 if no duration was defined (Tween.set)
    if ( _g.isObject( duration ) ) {
        params1 = duration;
        duration = 0;
    }

    // Select config params
    var cfg = params2 || params1;

    // Initialize tween properties
    var delay = _g.isNumber( cfg.delay ) ? m.max( 0, cfg.delay ) : 0;
    var repeatCount = _g.isNumber( cfg.repeat ) ? cfg.repeat : 0;

    tween._target       = target;
    tween._initted      = true;
    tween._started      = false;
    tween._queued       = false;
    tween._syncNextTick = true;
    tween._direction    = 1;
    tween._progress     = 0;
    tween._elapsedTime  = 0;
    tween._alive        = true;
    tween._delay        = delay;
    tween._delayLeft    = delay;
    tween._repeat       = repeatCount;
    tween._repeatLeft   = repeatCount;
    tween._repeatDelay  = _g.isNumber( cfg.repeatDelay ) ? m.max( 0, cfg.repeatDelay ) : 0;
    tween._yoyo         = _g.isBoolean( cfg.yoyo ) ? cfg.yoyo : false;
    tween._timeScale    = _g.isNumber( cfg.timeScale ) && cfg.timeScale > 0 ? cfg.timeScale: 1;
    tween._duration     = _g.isNumber( duration ) ? m.max( 0, duration ) : 0;
    tween._running      = _g.isBoolean( cfg.autoStart ) ? cfg.autoStart : true;
    tween._ease         = _g.isFunction( cfg.ease ) ? cfg.ease : _g.lerp;
    tween._onStart      = _g.isFunction( cfg.onStart ) ? cfg.onStart : _g.noop;
    tween._onUpdate     = _g.isFunction( cfg.onUpdate ) ? cfg.onUpdate : _g.noop;
    tween._onComplete   = _g.isFunction( cfg.onComplete ) ? cfg.onComplete : _g.noop;
    tween._onRepeat     = _g.isFunction( cfg.onRepeat ) ? cfg.onRepeat : _g.noop;
    tween._params       = [ params1, params2 ];

}

function tweenSeek( tween, time, accountForDelay, inSeconds ) {
    
    if ( ! _g.isNumber( time ) ) {
        return false;
    }

    var accountForDelay = _g.isBoolean( accountForDelay ) ? accountForDelay : false;
    var totalDuration = accountForDelay ? tween._duration + tween._delay : tween._duration;
    time = _g.clamp( time, 0, inSeconds ? totalDuration : 1);
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
        accountForDelay = accountForDelay !== undefined ? accountForDelay : false;
        
        // default for immediateRender is true
        immediateRender = immediateRender !== undefined ? immediateRender : true;

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
        if ( _g.isNumber( scale ) && scale > 0 ) {
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

    var now = _g.now();
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
    this._onTick = _g.isFunction( params.onTick ) ? params.onTick : _g.noop;
    this._alive = true;
    this._timeBehind = 0;
    this.setFPS( params.fps );
    this.resume();
}

Ticker.prototype = {
    pause: function() {
        this._running = false;
        return this;
    },
    resume: function() {
        this._lastTime = _g.now();
        this._running = true;
        rAF( onFrame );
        return this;
    },
    kill: function() {
        this._alive = false;
        return this;
    },
    tick: function( time ) {
        var delta = ( time - this._lastTime ) / 1000 - this._timeBehind;
        this._timeBehind = m.max( this._timeBehind - this._fpsStep, 0 );

        if ( delta > this._fpsStep ) {
            this._lastTime = time;
            this._timeBehind = delta % this._fpsStep;
            this._onTick( m.min( delta, this._fpsStep * 2 ) );
        }

        return this;
    },
    setFPS: function( fps ) {
        if ( _g.isNumber( fps ) && fps > 0 ) {
            this._fpsStep = 1 / fps;
        } else {
            this._fpsStep = 1 / 60;
        }
        return this;
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

function newTweenFactory( type ) {        

    return function create() {

        // fix: avoid optimization bailout
        // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
        var args = [];
        for ( var i = 0; i < arguments.length; ++i ) {
            args[ i ] = arguments[ i ];
        }

        var tween = new Tween( type, args );
        if ( tween._initted ) {
            pushTweenToRenderer( tween );
        }
        return tween;
    };
}

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
        now = _g.now();
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

mainTicker = new Ticker({ onTick: updateTweens });

return _g.extend( instance, {
    set         : newTweenFactory( TWEEN_SET ),
    to          : newTweenFactory( TWEEN_TO ),
    from        : newTweenFactory( TWEEN_FROM ),
    fromTo      : newTweenFactory( TWEEN_FROM_TO ),
    killAll     : executeOnAllTweens( 'kill' ),
    pauseAll    : executeOnAllTweens( 'pause' ),
    resumeAll   : executeOnAllTweens( 'resume' ),
    ticker      : newTicker,
    update      : manualStep,
    autoUpdate  : setAutoUpdate,
    setFPS      : mainTicker.setFPS.bind( mainTicker )
} );

}));