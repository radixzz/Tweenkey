function getCircleElement(classes) {
    var x = 0;
    var y = 0;
    var scaleX = 0;
    var scaleY = 0;
    var div = document.createElement('div');
    div.classList = 'circle ' + classes;
    document.body.appendChild(div);
    return {
        el: div,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        bgColor: '',
        opacity: 1,
        applyStyle: function () {
            var s = '';
            s += 'transform: matrix(' + this.scaleX + ', 0, 0,' + this.scaleY + ',' + this.x + ',' + this.y + ');';
            s += 'opacity: ' + this.opacity + ';';
            s += this.bgColor != '' ? 'background-color:' + this.bgColor + ';' : '';
            div.setAttribute('style', s);
        }
    }
}

function getInputRange(params, onChange) {
    params = params || {};
    var x = params.x || 0;
    var y = params.y || 0;
    var width = params.width || 100;
    var min = params.min || 0;
    var max = params.max || 10;
    var input = document.createElement('input');
    input.type = "range";
    input.min = min;
    input.max = max;
    input.value = 0;
    input.setAttribute('style', 'width:' +
        width + 'px;' +
        'position: absolute;' +
        'transform: translate(' + x + 'px,' + y + 'px)')
    input.oninput = onChange;
    document.body.appendChild(input);
}

(function () {
    let obj = { x: 0, y: 0 };
    Tweenkey.to(obj, 0.5, {
        x: 1,
        onUpdate: console.log,
        onComplete: function () {
            console.log('completed');
        }
    });

    Tweenkey.to(obj, 0.5, {
        x: 2, y: 3,
        onUpdate: console.log,
        onComplete: function () {
            console.log('completed');
        }
    });

    Tweenkey.to(obj, 0.5, {
        y: 1,
        onUpdate: console.log,
        onComplete: function () {
            console.log('completed');
        }
    });
    setTimeout(() => {
        //Tweenkey.killTweensOf( obj );
    }, 250);

});


// TIMELINE TEST
(function () {

    function getTweenCircle(className, caption, xTarget, yStart) {
        var circle = getCircleElement(className);
        circle.y = yStart;
        circle.applyStyle();

        return Tweenkey.tween(circle, 1, {
            x: xTarget,
            ease: 'BackInOut',
            //repeat: 2,
            onUpdate: function () {
                circle.applyStyle();
            },
            //onStart: function() { console.log( caption + ': onStart' ) },
            //onComplete: function() { console.log( caption + ': onComplete' ) },
            //onRepeat: function() { console.log( caption + ': onRepeat' ) }
        });
    }


    if (false) {
        let circle = getCircleElement('c1');
        circle.y = 30;
        circle.applyStyle();
        let tl = new TimelineMax({
            yoyo: false,
            repeat: 1,
            onComplete: function () { console.log('TLM Complete!') },
            onStart: function () { console.log('TLM Start!') },
            onRepeat: function () { console.log('TLM Repeat!') }
        });

        tl.to(circle, 1, {
            x: 500,
            ease: Back.easeInOut,
            onStart: function () { console.log('onStart') },
            onComplete: function () { console.log('onComplete') },
            onRepeat: function () { console.log('onRepeat') },
            onUpdate: function () { circle.applyStyle() }
        });

        tl.play();

    } else {
        var tl = Tweenkey.timeline({
            timeScale: 1,
            //inverted: true,
            //yoyo: true,
            //repeat: 1,
            repeatDelay: 0.5,
            onComplete: function () { console.log('TL Complete!') },
            onStart: function () { console.log('TL Start!') },
            onRepeat: function () { console.log('TL Repeat!') }
        });

        tl.define('t1', getTweenCircle('circle c0', 'T1', 500, 0));
        tl.define('t2', getTweenCircle('circle c1', 'T2', 500, 60));
        tl.define('t3', getTweenCircle('circle c2', 'T3', 500, 120));
        tl.define('t4', getTweenCircle('circle c3', 'T4', 500, 180));
        tl.define('t5', getTweenCircle('circle c4', 'T5', 500, 240));
        tl.define('t6', getTweenCircle('circle c5', 'T6', 500, 300));

        tl.define('cb', function () { console.log('cb!') });
        tl.define('s1', [{ 't1': 0, 't2': 0.1, 't3': 0.2 }]);
        tl.define('s2', [{ 't4': 0.3, 't5': 0.4, 't6': 0.5 }]);
        tl.define('main', [{ 's1': 0, 's2': 0 }, 'cb']);
        //tl.play( 'main' );
        //tl.timeScale(1);
        //tl.resume();
        //console.log('======');
        tl.plot('main');

    }

    var input = getInputRange({ y: 400, width: 500, max: 100000 }, function () {
        tl.progress(this.value / 100000, true).pause();
    });

});

// SINGLE TWEEN
(function () {

    var circle = getCircleElement('c1');
    circle.applyStyle();
    var t = Tweenkey.to(circle, 1, {
        x: 500,
        //to: { x: 100 },
        //delay: 0.5,
        //repeat: 10,
        //inverted: true,
        //yoyo: true,
        //repeatDelay: 0.5,
        //autoStart: false,
        onUpdate: function () {
            //console.log( 'update:', circle.x );
            circle.applyStyle();
            //console.log( 'update' );
        },
        onStart: function () {
            console.log('TK start!');
        },
        onComplete: function () {
            console.log('TK completed!');
        },
        onRepeat: function () {
            console.log('TK repeat');
        }
    });

    var input = getInputRange({ y: 100, width: 1400, max: 100000 }, function () {
        //t.totalProgress( this.value / 100000, false ).pause();
        t.progress(this.value / 100000, true).pause();

    });

    setTimeout(() => { Tweenkey.killTweensOf(circle); }, 500);

});

(function () {
    var circle = getCircleElement('c1');
    circle.y = 140;

    circle.applyStyle();

    var t = TweenMax.to(circle, 1.01, {
        ease: Linear.easeNone,
        x: 500,
        delay: 1,
        repeat: 2,
        //repeatDelay: 1,
        yoyo: true,
        onRepeat: function () {
            console.log('TM repeat');
        },
        onStart: function () {
            console.log('TM start');
        },
        onComplete: function () {
            console.log('TM complete');
        },
        onUpdate: function () {
            circle.applyStyle();
            //console.log( 'update' );
        }
    });

    var input = getInputRange({ y: 200, width: 300, max: 1000 }, function () {
        //t.progress( this.value / 1000, false );
        t.totalProgress(this.value / 1000).pause();
    });

});

// COLOR INTERPOLATION TEST
(function () {
    var colors = [
        '#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#D32F2F', '#C62828', '#B71C1C',
        '#FF8A80', '#FF5252', '#FF1744', '#D50000', '#FCE4EC', '#F8BBD0', '#F48FB1', '#F06292', '#EC407A', '#E91E63',
        '#D81B60', '#C2185B', '#AD1457', '#880E4F', '#FF80AB', '#FF4081', '#F50057', '#C51162', '#F3E5F5', '#E1BEE7',
        '#CE93D8', '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2', '#6A1B9A', '#4A148C', '#EA80FC', '#E040FB',
        '#D500F9', '#AA00FF', '#EDE7F6', '#D1C4E9', '#B39DDB', '#9575CD', '#7E57C2', '#673AB7', '#5E35B1', '#512DA8',
        '#4527A0', '#311B92', '#B388FF', '#7C4DFF', '#651FFF', '#6200EA', '#E8EAF6', '#C5CAE9', '#9FA8DA', '#7986CB',
        '#5C6BC0', '#3F51B5', '#3949AB', '#303F9F', '#283593', '#1A237E', '#8C9EFF', '#536DFE', '#3D5AFE', '#304FFE',
        '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1976D2', '#1565C0', '#0D47A1',
        '#82B1FF', '#448AFF', '#2979FF', '#2962FF', '#E1F5FE', '#B3E5FC', '#81D4FA', '#4FC3F7', '#29B6F6', '#03A9F4',
        '#039BE5', '#0288D1', '#0277BD', '#01579B', '#80D8FF', '#40C4FF', '#00B0FF', '#0091EA', '#E0F7FA', '#B2EBF2',
        '#80DEEA', '#4DD0E1', '#26C6DA', '#00BCD4', '#00ACC1', '#0097A7', '#00838F', '#006064', '#84FFFF', '#18FFFF',
        '#00E5FF', '#00B8D4', '#E0F2F1', '#B2DFDB', '#80CBC4', '#4DB6AC', '#26A69A', '#009688', '#00897B', '#00796B',
        '#00695C', '#004D40', '#A7FFEB', '#64FFDA', '#1DE9B6', '#00BFA5', '#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784',
        '#66BB6A', '#4CAF50', '#43A047', '#388E3C', '#2E7D32', '#1B5E20', '#B9F6CA', '#69F0AE', '#00E676', '#00C853',
        '#F1F8E9', '#DCEDC8', '#C5E1A5', '#AED581', '#9CCC65', '#8BC34A', '#7CB342', '#689F38', '#558B2F', '#33691E',
        '#CCFF90', '#B2FF59', '#76FF03', '#64DD17', '#F9FBE7', '#F0F4C3', '#E6EE9C', '#DCE775', '#D4E157', '#CDDC39',
        '#C0CA33', '#AFB42B', '#9E9D24', '#827717', '#F4FF81', '#EEFF41', '#C6FF00', '#AEEA00', '#FFFDE7', '#FFF9C4',
        '#FFF59D', '#FFF176', '#FFEE58', '#FFEB3B', '#FDD835', '#FBC02D', '#F9A825', '#F57F17', '#FFFF8D', '#FFFF00',
        '#FFEA00', '#FFD600', '#FFF8E1', '#FFECB3', '#FFE082', '#FFD54F', '#FFCA28', '#FFC107', '#FFB300', '#FFA000',
        '#FF8F00', '#FF6F00', '#FFE57F', '#FFD740', '#FFC400', '#FFAB00', '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D',
        '#FFA726', '#FF9800', '#FB8C00', '#F57C00', '#EF6C00', '#E65100', '#FFD180', '#FFAB40', '#FF9100', '#FF6D00',
        '#FBE9E7', '#FFCCBC', '#FFAB91', '#FF8A65', '#FF7043', '#FF5722', '#F4511E', '#E64A19', '#D84315', '#BF360C',
        '#FF9E80', '#FF6E40', '#FF3D00', '#DD2C00', '#EFEBE9', '#D7CCC8', '#BCAAA4', '#A1887F', '#8D6E63', '#795548',
        '#6D4C41', '#5D4037', '#4E342E', '#3E2723', '#FAFAFA', '#F5F5F5', '#EEEEEE', '#E0E0E0', '#BDBDBD', '#9E9E9E',
        '#757575', '#616161', '#424242', '#212121', '#ECEFF1', '#CFD8DC', '#B0BEC5', '#90A4AE', '#78909C', '#607D8B',
        '#546E7A', '#455A64', '#37474F', '#263238'
    ];

    var getRandomColor = function () {
        return colors[Math.round(Math.random() * colors.length)];
    }

    var addColorRect = function () {
        var div = document.createElement('div');
        var colorFrom = getRandomColor();
        div.setAttribute('style', "background:" + colorFrom + "; width: 40px; height: 40px; float: left;");
        document.body.appendChild(div);
        var obj = { color: colorFrom };
        var t = Tweenkey.tween(obj, 1, {
            yoyo: true,
            to: { color: getRandomColor() },
            onUpdate: function (obj) {
                div.style.background = obj.color;
            }
        });
    }

    for (var i = 0; i < 1000; i++) {
        addColorRect();
    }
});

// CIRCLES POPPING TEST
(function () {

    var pool = [];

    var allocCircles = function (quantity) {
        while (quantity-- > 0) {
            var el = document.createElement('div');
            el.className = 'circle c' + ~~(Math.random() * 9);
            document.body.appendChild(el);
            pool.push(el);
        }
    }

    var spawnCircle = function (x, y, time) {
        var circle = pool.pop();
        if (circle) {
            if (true) {
                let t = TweenMax.fromTo({ scale: 0 }, time, {
                    scale: 2
                }, {
                        scale: 0,
                        ease: Bounce.easeOut,
                        onUpdate: function (target) {
                            target = this.target;
                            var s = 'opacity: 1;';
                            s += 'transform: matrix(' + target.scale + ', 0, 0,' + target.scale + ',' + x + ',' + y + ');';
                            circle.setAttribute('style', s);
                        },
                        onComplete: function () {
                            circle.setAttribute('style', 'opacity: 0');
                            pool.push(circle);
                        }
                    });

                
                
                
            } else {
                let obj = { scale: 0 };
                Tweenkey.tween(obj, time, {
                    from: {
                        scale: 2
                    },
                    to: {
                        scale: 0
                    },
                    ease: 'BounceOut',
                    onUpdate: function (target) {
                        var s = 'opacity: 1;';
                        s += 'transform: matrix(' + target.scale + ', 0, 0,' + target.scale + ',' + x + ',' + y + ');';
                        circle.setAttribute('style', s);
                    },
                    onComplete: function () {
                        //console.log('completed!');
                        circle.setAttribute('style', 'opacity: 0');
                        pool.push(circle);
                    }
                });

                
            }
        }
    }

    var avg = 0;
    var samples = 0;
    var spawn = function (x, y) {
        //Tweenkey.killAll();
        //TweenMax.killAll();
        var t = window.performance.now();
        for (var i = 2000; i--;) {
            spawnCircle(
                x + (Math.random() - 0.5) * 100,
                y + (Math.random() - 0.5) * 100,
                Math.random() + 0.5
            );
        }
        var e = window.performance.now() - t;
        samples = Math.min(samples + 1, 10);
        avg = avg * (samples - 1) / samples + e / samples;
        //console.log( avg );
    }

    var bindEvents = function () {
        document.onmousemove = function (e) {
            spawn(e.clientX, e.clientY);
            //TweenMax.pauseAll();
            //Tweenkey.pauseAll();
            setTimeout( ()=> { 
               // TweenMax.resumeAll();
                //Tweenkey.resumeAll();
                
            }, 500 );
        }

        document.onclick = function () {
            Tweenkey.killAll();
        }
    }

    setInterval(function () {
        var x = Math.random() * window.innerWidth;
        var y = Math.random() * window.innerHeight;
        //spawn( x, y );
    }, 200);

    allocCircles( 5000 );
    bindEvents();
})();