/* Turkey Escape — Chapter 1: the kitchen.
   Art: Tina's scenes + character sheets (Luma). Rules: see the game spec in the Videos project. */
(function () {
  "use strict";
  var TE = window.TurkeyEscape;
  var W = 1280, H = 720;

  // ------------------------------------------------------------ tuning
  // type scale (px): hero logo / panel title / subtitle — the rest lives in game.css (--t-*)
  var TYPE = { hero: 120, h1: 96, h2: 40 };

  var T = {
    // pace: hold to walk; the longer you hold, the faster (and louder) you go. Let go to stop.
    paceMin: 0.25, paceUp: 0.9, paceDown: 3.5, tapBoost: 0.12, tapCap: 0.88,       // starting pace, how fast it builds per second, how fast it drops
    speed: [0.1, 1.4],                                 // floor units per second at the slowest / fastest pace
    stride: [0.8, 0.27],                               // seconds per step at the slowest / fastest pace
    stepNoise: [0.04, 0.34],                           // noise each step makes, slowest / fastest (grows with pace²)
    clutterNoise: 0.75, laneNoise: 0.05, laneSpeed: 3.2, steerSpeed: 1.7, nudge: 0.16,
    peckNoise: 0.29, noiseFade: 1.6, fadeDelay: 0.15,
    quietBelow: 0.24,   // the parrot sleeps through anything under this line
    wakeGain: 1.1, wakeRecover: 0.1, stirAt: 0.01, tooLoud: 0.9, redFor: 1.2,  // the meter shows pace; red (TOO LOUD) for 0.5 s wakes the sleeper
    pecksNeeded: 10, peckCooldown: 0.22,
    length: 10,         // floor distance to the finish: right at the doorway
    wakes: 3,           // the parrot opens its eyes twice (a feather each), the third time it screams
    timeLimit: 25
  };

  // ------------------------------------------------------------ scenes, one per chapter
  var SCENE1 = {
    bg: "img/kitchen.svg",
    vp: { x: 690, y: 385 },           // doorway / floor horizon in 1280x720 plate space
    D: 14, E: 262, F: 330,
    parrot: { x: 684, y: 267, w: 104, hook: 56, slant: 7 },   // perch hangs from the doorway's top frame (background image coordinates)
    laneX: 1.0, lanes: 2,                                       // five lanes: -2 … 2, so you can roam the whole floor
    // kitchen mess, one row every 1.2 floor units; every row leaves at least two lanes open
    clutter: [ // six rows of mess; every row leaves at least two lanes open, and the gaps drift so you steer
      { z: 1.5, lane: -1, kind: "forks" }, { z: 1.5, lane: 1, kind: "chips" },
      { z: 2.9, lane: -2, kind: "cereal" }, { z: 2.9, lane: 0, kind: "spoon" }, { z: 2.9, lane: 2, kind: "tray" },
      { z: 4.3, lane: -1, kind: "tray" }, { z: 4.3, lane: 1, kind: "box" },
      { z: 5.7, lane: 0, kind: "box" }, { z: 5.7, lane: 2, kind: "cereal" },
      { z: 7.1, lane: -2, kind: "chips" }, { z: 7.1, lane: 0, kind: "forks" }, { z: 7.1, lane: 2, kind: "spoon" },
      { z: 8.3, lane: -1, kind: "spoon" }, { z: 8.3, lane: 1, kind: "tray" }
    ]
  };
  // Chapter 2: under the dining table. The cat (Tina's sheet) sleeps in the hallway arch at the far end;
  // robot vacuums glide left and right between the chair legs, and bumping one is loud enough to wake it.
  var SCENE2 = {
    bg: "img/dining.svg",
    vp: { x: 661, y: 400 },
    D: 14, E: 262, F: 330,
    door: { x0: 588, x1: 735, y0: 208, y1: 396 },            // the arch to the hallway (background image coordinates)
    cat: { x: 637, y: 277, w: 158 },                           // curled up on the seat of the head chair, in front of the arch
    seatFront: { x0: 546, x1: 729, y0: 274, y1: 306 },        // the seat top, for the cat's contact shadow
    laneX: 1.0, lanes: 2,
    clutter: [],                                              // no mess here: just the robot vacuums
    vacs: [ // floor row, start x, speed (lanes per second); they bounce between the chair legs at ±2.2
      { z: 2.0, x: -1.6, v: 1.1 }, { z: 3.8, x: 1.2, v: -1.3 }, { z: 5.6, x: -0.4, v: 1.5 }, { z: 7.4, x: 1.8, v: -1.7 }
    ]
  };
  // Chapter 3 (the last): the living room. The uncle dozed off on the sofa with his torch still on; his dangling arm
  // sways as he snores, so the beam sweeps the floor. Step into the light and he wakes. The back door's pet flap is the way out.
  var SCENE3 = {
    bg: "img/living.svg", length: 10, tiltK: 25, // the uncle lies at floor level, so the camera barely needs to look up and the floor stays in view
    vp: { x: 640, y: 364 }, bgv: { x: 676, y: 364 }, bgk: 1.12,  // picture re-centred so the pet flap sits dead ahead
    wall: { src: "img/living-wall.svg", x: 469.9, y: 214.6, w: 332.6, h: 148.2 }, // a crisp close-up of the far wall, laid over the picture
    D: 12, E: 427, F: 330,
    uncle: { sleep: { x: 562, y: 369, w: 160.6 }, wake: { x: 541.7, y: 337, w: 120.4 } }, // on the sofa (picture coordinates)
    torch: { x: 535.3, y: 364 }, torchUp: { x: 516.7, y: 287.6 }, // the torch: dangling while he sleeps, raised at us when he wakes
    beam: { r: 0.52, zr: 0.85, far: 9.4, zc: 5.2, zAmp: 2.0, xAmp: 2.3, speed: 0.5, zSpeed: 0.23 }, // a pool of torchlight on the floor: size, where it roams, how fast
    laneX: 1.0, lanes: 2,
    clutter: [
      { z: 2.7, lane: 1, kind: "remote" }, { z: 2.7, lane: -2, kind: "slipper" },
      { z: 4.0, lane: -1, kind: "popcorn" }, { z: 4.0, lane: 2, kind: "duck" },
      { z: 5.3, lane: 0, kind: "slipper" }, { z: 5.3, lane: -2, kind: "remote" },
      { z: 6.6, lane: 1, kind: "duck" }, { z: 6.6, lane: -1, kind: "popcorn" },
      { z: 7.9, lane: -2, kind: "slipper" }, { z: 7.9, lane: 2, kind: "popcorn" },
      { z: 9.2, lane: -1, kind: "duck" }, { z: 9.2, lane: 1, kind: "slipper" }
    ]
  };
  // Chapter 4 (the last): the back hall. The mastiff sleeps in his bed beside the pet flap. Every few seconds he sniffs
  // the air: freeze while he sniffs, or he smells you and wakes.
  var SCENE4 = {
    bg: "img/hall.svg", length: 10, tiltK: 25,
    vp: { x: 640, y: 390 }, bgv: { x: 634, y: 390 }, bgk: 1.03,
    wall: { src: "img/hall-wall.svg", x: 505, y: 206.4, w: 260.1, h: 184.2 },
    D: 12, E: 396, F: 330,
    dog: { x: 752, y: 405, w: 111.2 }, endImg: "img/ending.svg", endLayout: "right", // the ending: turkey bottom-left under the umbrella, words over the sea            // on the floor just in front of the end wall (its base line is y 390.6)                            // in his bed beside the door (picture coordinates)
    laneX: 1.0, lanes: 2,
    clutter: [
      { z: 2.8, lane: 0, kind: "boot" }, { z: 2.8, lane: 2, kind: "ball" },       // two things per row, so every row leaves three lanes open
      { z: 4.1, lane: -2, kind: "leash" }, { z: 4.1, lane: 1, kind: "bone" },
      { z: 5.4, lane: -1, kind: "ball" }, { z: 5.4, lane: 2, kind: "leash" },
      { z: 6.7, lane: -2, kind: "bone" }, { z: 6.7, lane: 0, kind: "boot" },
      { z: 8.0, lane: 1, kind: "leash" }, { z: 8.0, lane: -1, kind: "bone" },
      { z: 9.3, lane: 0, kind: "ball" }, { z: 9.3, lane: 2, kind: "boot" }
    ],
    sniff: { rest: [3.0, 5.0], len: 1.6, grace: 0.45 } // he sniffs for 1.6 s; move after the first beat of it and he smells you
  };
  var CHAPTERS = { 1: { scene: SCENE1, cage: true, time: 47 }, 2: { scene: SCENE2, cage: false, time: 42 }, 3: { scene: SCENE3, cage: false, time: 42 }, 4: { scene: SCENE4, cage: false, time: 46 } };
  var LAST = 4; // playtested: a good run clears with ~2-3 s to spare
  var SCENE = SCENE1;
  var CLUTTER = { // width on the floor (world units), sound word, sound
    forks: { w: 0.55, word: "CLINK!", sfx: "forks" }, chips: { w: 0.5, word: "CRINKLE!", sfx: "chips" },
    cereal: { w: 0.6, word: "CRUNCH!", sfx: "cereal" }, tray: { w: 0.66, word: "CLANG!", sfx: "tray" },
    spoon: { w: 0.55, word: "CLACK!", sfx: "spoon" }, box: { w: 0.5, word: "THUD!", sfx: "box" },
    duck: { w: 0.34, word: "SQUEAK!", sfx: "squeak" }, remote: { w: 0.42, word: "CLICK!", sfx: "clicky" },
    slipper: { w: 0.48, word: "FLUMP!", sfx: "flump" }, popcorn: { w: 0.46, word: "CRUNCH!", sfx: "crunch" },
    boot: { w: 0.52, word: "THUMP!", sfx: "boots" }, ball: { w: 0.24, word: "SQUEAK!", sfx: "squeak" },
    leash: { w: 0.46, word: "JINGLE!", sfx: "leash" }, bone: { w: 0.4, word: "CLACK!", sfx: "bone" }
  };

  // ------------------------------------------------------------ assets
  var TOUCH_TEST = false; try { TOUCH_TEST = /[?#&]touch\b/.test(location.href) || sessionStorage.getItem("te-touch") === "1"; } catch (e) { } // T on the title screen previews the phone version on a computer
  var TOUCH = TOUCH_TEST || (window.matchMedia && matchMedia("(pointer: coarse)").matches) || ("ontouchstart" in window && navigator.maxTouchPoints > 0);
  var IMG = {}, SRC = { bg1: SCENE1.bg, bg2: SCENE2.bg, bg3: SCENE3.bg, uncleSleep: "img/uncle-sleep.svg", unclePeek: "img/uncle-peek.svg", uncleWake: "img/uncle-wake.svg", wall3: SCENE3.wall.src, wall4: SCENE4.wall.src, bg4: SCENE4.bg, dogSleep: "img/dog-sleep.svg", dogPeek: "img/dog-peek.svg", dogSniff: "img/dog-sniff.svg", dogSniffPeek: "img/dog-sniffpeek.svg", dogWake: "img/dog-wake.svg", vacuum: "img/vac.svg", vacRed: "img/vac-red.svg", catSleep: "img/cat-sleep.svg", catPeek: "img/cat-peek.svg", peek: "img/parrot-peek.svg", catDoze: "img/cat-hiss.svg", title: (new URLSearchParams(location.search).get("t") ? "img/title-" + new URLSearchParams(location.search).get("t") + ".jpg" : "img/title-main.webp"), bars: "img/cage.webp", beak: "img/beak.svg", latch: "img/latch.webp",
    sleep: "img/parrot-sleep.svg", doze: "img/parrot-doze.webp", alert: "img/parrot-alert.webp", squawk: "img/parrot-squawk.svg",
    print: "img/print.webp", back: "img/turkey-head.webp", shock: "img/turkey-head-shock.webp", wings: "img/turkey-head-wings.webp", footL: "img/foot-left.webp", footR: "img/foot-right.webp", turkey: "img/turkey-smug.webp", starOn: "img/star-full.webp", starOff: "img/star-empty.webp" };
  Object.keys(CLUTTER).forEach(function (k) { SRC["c_" + k] = "img/clutter-" + k + ".svg"; });
  // panel art is fetched + decoded up front, so a panel opens in the same frame instead of waiting on the network
  var PN = {}, PN_NAMES = ["up", "lr", "arrows", "wave", "clock", "feather", "forks", "parrot-sleep", "parrot-squawk", "turkey-win", "turkey-smug", "vacuum", "cat-sleep", "cat-hiss", "uncle-sleep", "uncle-wake", "torch", "turkey-win", "dog-sleep", "dog-sniff", "dog-wake"];
  function loadOne(src) {
    return new Promise(function (res) {
      var im = new Image(); im.decoding = "async";
      im.onload = function () { (im.decode ? im.decode() : Promise.resolve()).catch(function () { }).then(function () { res(im); }); };
      im.onerror = function () { res(null); }; im.src = src;
    });
  }
  function bake(im) { // vector art is rasterised once; drawing a complex SVG every frame is slow
    if (!im) return im;
    if (!/\.svg/.test(im.src)) { var c0 = document.createElement("canvas"); c0.width = im.width; c0.height = im.height; c0.getContext("2d").drawImage(im, 0, 0); c0.src = im.src; return im.width > 200 ? mips(c0) : im; }
    var sc = TOUCH ? Math.max(1, Math.min(1.25, 2000 / im.width)) : Math.max(1, Math.min(2, 3200 / im.width)), c = document.createElement("canvas"); // 2x so the camera can zoom in without blur
    c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); c.src = im.src; mips(c); return c;
  }
  function mips(c) { // smaller copies, each half the size, made with smooth downscaling: far-away things are drawn from the
    var lv = [c], cur = c;  // nearest copy, so thin outlines stay clean instead of shimmering or breaking up
    while (cur.width > 96 && cur.height > 96 && lv.length < 6) {
      var n = document.createElement("canvas"); n.width = Math.max(1, Math.round(cur.width / 2)); n.height = Math.max(1, Math.round(cur.height / 2));
      var x = n.getContext("2d"); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; x.drawImage(cur, 0, 0, n.width, n.height); lv.push(n); cur = n;
    }
    c.mips = lv; return c;
  }
  function loadImages() {
    var core = Promise.all(Object.keys(SRC).map(function (k) { return loadOne(SRC[k]).then(function (im) { if (im) IMG[k] = bake(im); }); }));
    PN_NAMES.forEach(function (n) { loadOne("img/pn-" + n + ".webp").then(function (im) { if (im) PN[n] = im; }); });
    core.then(function () { // warm the panel art and lettering once, off screen, so the first panel is not the slow one
      setTimeout(function () {
        var w = document.createElement("div"); w.style.cssText = "position:absolute;left:-4000px;top:0;opacity:.01;pointer-events:none";
        PN_NAMES.forEach(function (n) { w.appendChild(pn(n)); });
        if (window.TurkeyEscape && TurkeyEscape.Lettering) try { w.appendChild(TurkeyEscape.Lettering({ text: "HOW TO PLAY CHAPTER 1 PAUSED CAUGHT 0123456789", size: 64 })); } catch (e) { }
        document.getElementById("stage").appendChild(w);
        requestAnimationFrame(function () { requestAnimationFrame(function () { w.remove(); }); });
      }, 300);
    });
    return core;
  }

  // ------------------------------------------------------------ audio: Luma files when present, synth fallback otherwise
  var AC = null, muted = false, music = null, SND = {};
  var AUDIO = ["music", "scream", "parrotWake", "unlatch", "forks", "cereal", "tray", "spoon", "catWake", "catHiss", "squeak", "crunch", "clicky", "flump", "snore", "uncleWake", "uncleShout", "bone", "woof", "sniff", "leash", "boots", "growl"]; // the rest (peck, latch, click, tick, rooster, win, fail, chips, box, steps) are the built-in sounds in SYNTH
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (AC && AC.state === "suspended") AC.resume(); return AC; }
  // Luma-made tracks not yet copied into audio/ stream from Luma until they are
  // Luma sound effects (5 s clips, sound at the start); local audio/<name>.mp3 wins when present
  var REMOTE = {}; // no outside sound links: every sound is a file here or a built-in synth
  var CUT = { latchDrop: 1.6, uiClick: .35, tray: 1.3, chips: .8, cereal: 1, forks: 1.1, spoon: .7, box: .7, peck: .3, unlatch: 1.6, parrotWake: 1.4, scream: 1.8, tick: .3, rooster: 2.6, win: 3, fail: 2.6, squeak: 0.5, crunch: 1.4, clicky: 0.7, flump: 0.6, snore: 2, uncleWake: 1.7, uncleShout: 0.6, bone: 1, woof: 0.9, sniff: 1.5, leash: 1.05, boots: 0.6, growl: 1.3 };
  var wantMusic = false;
  document.addEventListener("pointerdown", function () { ac(); wantMusic = true; startMusic(); }, { once: true });
  document.addEventListener("keydown", function () { ac(); wantMusic = true; startMusic(); }, { once: true });
  function loadAudio() {
    AUDIO.forEach(function (k) {
      var a = new Audio(); a.preload = "auto"; a.src = "audio/" + k + ".mp3";
      a.addEventListener("canplaythrough", function () { SND[k] = a; if (k === "music" && wantMusic) startMusic(); }, { once: true });
      if (REMOTE[k]) a.addEventListener("error", function () { if (a.src.indexOf(REMOTE[k]) < 0) { a.src = REMOTE[k]; a.load(); } });
    });
  }
  function tone(type, f0, f1, dur, vol, delay) {
    var a = ac(); if (!a || muted) return; var t = a.currentTime + (delay || 0);
    var o = a.createOscillator(), v = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(v); v.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(dur, vol, hp) {
    var a = ac(); if (!a || muted) return; var n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    var s = a.createBufferSource(), f = a.createBiquadFilter(), v = a.createGain(); s.buffer = buf; f.type = "highpass"; f.frequency.value = hp || 800; v.gain.value = vol;
    s.connect(f); f.connect(v); v.connect(a.destination); s.start();
  }
  var SYNTH = {
    peck: function () { tone("square", 1500, 800, 0.05, 0.07); hiss(0.04, 0.2, 3000); },
    unlatch: function () { tone("square", 900, 1300, 0.06, 0.08); tone("sawtooth", 180, 120, 0.5, 0.05, 0.08); },
    step: function (v) { // claws on tile: three quick nail clicks, quieter when tiptoeing
      [0, 0.028, 0.05].forEach(function (d, i) { tone("square", 2900 - i * 350, 2200 - i * 300, 0.018, 0.05 * v, d); hiss(0.016, 0.22 * v, 4200); });
      tone("sine", 180, 110, 0.05, 0.05 * v);
    },
    uiClick: function (v) { tone("sine", 700, 1100, 0.06, 0.12 * (v || 1)); tone("triangle", 1400, 1600, 0.03, 0.05 * (v || 1), 0.02); },
    forks: function () { [2400, 3100, 2750, 3600].forEach(function (f, i) { tone("triangle", f, f * 0.99, 0.28, 0.035, i * 0.05); }); },          // metal jingle
    chips: function () { for (var i = 0; i < 7; i++) setTimeout(function () { hiss(0.03, 0.22, 5000); }, i * 28 + Math.random() * 20); },        // bag crinkle
    cereal: function () { for (var i = 0; i < 9; i++) setTimeout(function () { tone("square", 900 + Math.random() * 900, 400, 0.02, 0.03); }, i * 22); hiss(0.18, 0.12, 2000); }, // rattling flakes
    tray: function () { tone("triangle", 330, 320, 0.9, 0.09); tone("triangle", 497, 490, 0.7, 0.05); tone("square", 1200, 900, 0.05, 0.04); }, // big metal clang
    spoon: function () { tone("sine", 620, 380, 0.08, 0.14); tone("sine", 900, 600, 0.05, 0.06, 0.07); },                                        // wooden clack-clack
    box: function () { tone("sine", 110, 55, 0.25, 0.22); hiss(0.08, 0.15, 400); },                                                              // cardboard thud
    clatter: function () { [700, 1187, 1690, 2380].forEach(function (f, i) { tone("square", f, f * 0.97, 0.35, 0.03, i * 0.04); }); hiss(0.12, 0.2, 3000); },
    crunch: function () { for (var i = 0; i < 4; i++) setTimeout(function () { hiss(0.05, 0.3, 1500); }, i * 45); },
    parrotWake: function () { tone("sine", 1200, 2000, 0.1, 0.1); tone("sine", 1800, 1400, 0.12, 0.08, 0.12); },
    scream: function () { tone("sawtooth", 900, 2200, 0.25, 0.12); tone("sawtooth", 2000, 900, 0.4, 0.12, 0.25); },
    vroom: function () { tone("sawtooth", 90, 240, 0.5, 0.16); tone("sawtooth", 180, 520, 0.6, 0.1, 0.05); hiss(0.7, 0.35, 900); tone("square", 1400, 900, 0.25, 0.04, 0.1); }, // vacuum roar
    catWake: function () { tone("sine", 480, 720, 0.12, 0.09); tone("sine", 720, 520, 0.22, 0.08, 0.12); },                                     // a grumpy "mrrp?"
    catHiss: function () { hiss(0.9, 0.45, 2500); tone("sawtooth", 700, 1500, 0.3, 0.07, 0.1); tone("sawtooth", 1500, 600, 0.5, 0.07, 0.4); }, // HISSS
    squeak: function () { tone("sine", 900, 1700, 0.12, 0.14); tone("sine", 1700, 1100, 0.16, 0.12, 0.12); },                                   // rubber duck
    clicky: function () { tone("square", 1800, 1600, 0.02, 0.08); tone("square", 1500, 1300, 0.02, 0.06, 0.07); },                            // remote buttons
    flump: function () { tone("sine", 140, 70, 0.18, 0.2); hiss(0.1, 0.12, 600); },                                                          // soft slipper
    uncleWake: function () { tone("sawtooth", 160, 230, 0.15, 0.08); tone("sawtooth", 230, 150, 0.25, 0.07, 0.15); },                        // "hnn-whuh?"
    uncleShout: function () { tone("sawtooth", 220, 420, 0.25, 0.12); tone("sawtooth", 420, 300, 0.45, 0.12, 0.25); },                       // "HEY!"
    sniff: function () { [0, 0.16, 0.32].forEach(function (d) { setTimeout(function () { hiss(0.09, 0.32, 1800); }, d * 1000); }); },          // sniff-sniff-sniff
    huff: function () { hiss(0.7, 0.5, 250); tone("sine", 90, 45, 0.6, 0.12); },                                                              // a big gusty exhale
    woof: function () { [0, 0.28].forEach(function (d) { tone("sawtooth", 260, 140, 0.18, 0.16, d); hiss(0.12, 0.2, 500); }); },             // WOOF WOOF
    growl: function () { tone("sawtooth", 95, 80, 0.7, 0.06); hiss(0.6, 0.05, 200); },                                                        // a low grumble
    snore: function () { tone("sawtooth", 70, 95, 0.9, 0.025); hiss(0.9, 0.04, 300); },
    tick: function () { tone("square", 2000, 1800, 0.03, 0.04); },
    rooster: function () { tone("sawtooth", 500, 900, 0.25, 0.1); tone("sawtooth", 900, 700, 0.5, 0.1, 0.25); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone("triangle", f, f, 0.22, 0.12, i * 0.11); }); },
    fail: function () { [392, 330, 262].forEach(function (f, i) { tone("triangle", f, f * 0.98, 0.3, 0.1, i * 0.18); }); }
  };
  var snoring = null;
  function stopSnore() { if (snoring) { snoring.pause(); snoring = null; } }
  function sfx(k, vol, rate) {
    if (muted) return; vol = vol == null ? 1 : vol;
    if (SND[k]) { var a = SND[k].cloneNode(); a.volume = Math.min(1, 0.8 * vol); if (k === "snore") snoring = a; if (rate) { a.preservesPitch = false; a.playbackRate = rate; } a.play().catch(function () { });
      if (CUT[k]) setTimeout(function () { var f = setInterval(function () { a.volume = Math.max(0, a.volume - 0.15); if (a.volume <= 0) { a.pause(); clearInterval(f); } }, 30); }, CUT[k] * 1000);
      return; }
    if (SYNTH[k]) SYNTH[k](vol);
  }
  function startMusic() {
    if (muted || !SND.music) return;
    if (!music) { music = SND.music; music.loop = true; } music.volume = 0.3;
    wantMusic = true;
    music.play().catch(function () { });
  }
  function stopMusic() { if (music) music.pause(); }
  var beach = { buf: null, src: null, gain: null, want: false };
  function beachBuf() { // decode once; trim the encoder's silent padding so the loop point lands on real sound
    if (beach.buf || beach.loading || !ac()) return; beach.loading = true;
    fetch("audio/beach.mp3").then(function (r) { return r.arrayBuffer(); }).then(function (a) { return new Promise(function (res, rej) { AC.decodeAudioData(a, res, rej); }); })
      .then(function (b) { var d = b.getChannelData(0), n = d.length, i = 0, j = n - 1; while (i < n && Math.abs(d[i]) < 1e-4) i++; while (j > i && Math.abs(d[j]) < 1e-4) j--;
        beach.buf = b; beach.a = i / b.sampleRate; beach.b = (j + 1) / b.sampleRate; if (beach.want) startBeach(); }).catch(function () { });
  }
  function startBeach() {
    beach.want = true; if (muted) return; var a = ac(); if (!a) return; if (!beach.buf) { beachBuf(); return; } if (beach.src) return;
    var g = a.createGain(); g.gain.setValueAtTime(0, a.currentTime); g.gain.linearRampToValueAtTime(0.35, a.currentTime + 1.5); g.connect(a.destination);
    var s = a.createBufferSource(); s.buffer = beach.buf; s.loop = true; s.loopStart = beach.a; s.loopEnd = beach.b; s.connect(g); s.start(0, beach.a);
    beach.src = s; beach.gain = g;
  }
  function stopBeach(keepWant) {
    if (!keepWant) beach.want = false; if (!beach.src) return; var a = AC, g = beach.gain, s = beach.src; beach.src = null;
    try { g.gain.cancelScheduledValues(a.currentTime); g.gain.setValueAtTime(g.gain.value, a.currentTime); g.gain.linearRampToValueAtTime(0, a.currentTime + 0.4); s.stop(a.currentTime + 0.45); } catch (e) { }
  }
  function toggleMute() { muted = !muted; if (muted) stopMusic(); else startMusic(); var b = $("mute"); if (b) b.classList.toggle("off", muted); if (muted) stopBeach(true); else if (beach.want) startBeach(); }

  // ------------------------------------------------------------ state
  var S;
  function fresh(ch) {
    ch = ch || 1; var C = CHAPTERS[ch]; SCENE = C.scene;
    return {
      ch: ch, vac: (SCENE.vacs || []).map(function (v) { return { z: v.z, x: v.x, v: v.v, cd: 0, stun: 0, hitAt: -9 }; }),
      mode: "title", phase: C.cage ? "cage" : "walk", time: 0, left: C.time || T.timeLimit,
      wakesLeft: T.wakes, noise: 0, still: 9, wake: 0, react: 0, pl: 0, burst: 0, red: 0,
      pecks: 0, peckCd: 0, peckAnim: 0, open: -1,
      cam: { x: 0, z: 0 }, lane: 0, tx: 0, hit: {}, hitAt: {}, hitDir: {}, from: null, hold: false, pace: 0, ph: 0, moving: false, steps: 0, side: 1,
      shake: 0, pops: [], exitT: 0, freeze: 0,
      beam: { ph: 0, lit: 0, grace: 0, snore: 0 },
      dog: { st: "sleep", t: 3.5, since: 0 }
    };
  }

  var view = document.getElementById("view"), g = view.getContext("2d");
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  (function () { var raw = g.drawImage.bind(g); // pick the mip level that is just bigger than the size it is drawn at on screen
    g.drawImage = function (im, a, b, w, h) {
      if (im && im.mips && arguments.length === 5) {
        var t = g.getTransform(), sx = Math.hypot(t.a, t.b) * Math.abs(w) / im.width, sy = Math.hypot(t.c, t.d) * Math.abs(h) / im.height, k = Math.max(sx, sy), L = 0;
        while (L < im.mips.length - 1 && k <= 0.5 / Math.pow(2, L)) L++;
        return raw(im.mips[L], a, b, w, h);
      }
      return raw.apply(null, arguments);
    };
  })();
  var $ = function (id) { return document.getElementById(id); };

  // ------------------------------------------------------------ camera
  function zoom() { return SCENE.D / (SCENE.D - S.cam.z); }
  function pan() { return -S.cam.x * SCENE.F / (SCENE.D - S.cam.z) * 3.2; }
  function tilt() { return (zoom() - 1) * (SCENE.tiltK != null ? SCENE.tiltK : 135); } // look up a little as we near the doorway, keeping the parrot in view
  function plate(x, y) { var z = zoom(); return [SCENE.vp.x + (x - SCENE.vp.x) * z + pan(), SCENE.vp.y + (y - SCENE.vp.y) * z + tilt()]; }
  function bgQ(X, Y) { // background picture px -> plate px. A scene can re-centre and enlarge its picture (bgv = the picture's own vanishing point, bgk = scale)
    var x = X * (W + 60) / W - 30, y = Y * (H + 40) / H - 20, v = SCENE.bgv, k = SCENE.bgk || 1;
    if (!v) return [x, y];
    var vx = v.x * (W + 60) / W - 30, vy = v.y * (H + 40) / H - 20; return [SCENE.vp.x + (x - vx) * k, SCENE.vp.y + (y - vy) * k];
  }
  function bgPt(X, Y) { var q = bgQ(X, Y); return plate(q[0], q[1]); } // a point on the room picture, as drawn
  // you bump into a floor thing when it is right at the turkey's feet on screen (still visible), not after it has slid off the bottom
  function hitDz() { return SCENE.E / Math.max(60, H + 60 - SCENE.vp.y - tilt()); } // its base just at the bottom edge: right under the turkey, the top still in view }
  function floorPt(X, Z) {
    var dz = Z - S.cam.z; if (dz < 0.3) return null;
    var far = Math.min(1, dz / Math.max(1, SCENE.D - S.cam.z)); // far things move with the room picture; near things in true perspective, so whatever is in your path ends up right under the turkey
    return { x: SCENE.vp.x + (X - S.cam.x) * SCENE.F / dz + pan() * far, y: SCENE.vp.y + SCENE.E / dz + tilt(), s: SCENE.F / dz };
  }
  function ease(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }

  // gait: one step = foot lifts and reaches forward, plants, then the body rolls over it
  function gait() {
    if (S.mode === "exiting") { var ph = (S.exitT * 2.6) % 1; return { k: ph, side: Math.floor(S.exitT * 2.6) % 2 ? 1 : -1, walking: true }; }
    if (!S.moving) return { k: 0, side: S.side, walking: false };
    return { k: S.ph, side: S.side, walking: true };
  }

  // ------------------------------------------------------------ comic words
  // Word rules: every sound effect is YELLOW, sized by how loud it is (tap < SNIFF, ? < crash words, STOMP! < VRRRM! and the sleepers' shouts).
  // WHITE is for calm messages to the player: Zzz. PINK is for losing a life: −1 pops just below the feather pill (never behind it). Too loud is shown by the meter itself (it swells and rattles).
  function word(str, x, y, size, fill, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    g.font = size + "px 'Turkey Bubble', 'Lilita One', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.lineWidth = size * 0.22; g.strokeStyle = "#0d0a10"; g.strokeText(str, 0, 0);
    g.fillStyle = fill === "#ffffff" ? "#9d97c4" : fill === "#f2287f" ? "#9c1050" : "#b8740a"; g.fillText(str, -size * 0.04, size * 0.07); // a darker shade of its own colour for depth, not pink
    g.fillStyle = fill; g.fillText(str, 0, 0); g.restore();
  }
  function pop(txt, x, y, size, fill, life) { S.pops.push({ text: txt, x: x, y: y, size: size || 64, fill: fill || "#ebb316", rot: (Math.random() - 0.5) * 0.3, t: 0, life: life || 0.9 }); }

  // ------------------------------------------------------------ render
  // title scene depth: the sides sit slightly out of focus; wherever the light points comes sharp
  var blurTitle = null, focusMask = null, focusCv = null, plateMask = null, TQ = 1.5;
  function drawFocus() {
    if (!blurTitle) {
      blurTitle = document.createElement("canvas"); blurTitle.width = W * TQ; blurTitle.height = H * TQ;
      var bg = blurTitle.getContext("2d"); bg.scale(TQ, TQ); bg.drawImage(IMG.title, 0, 0, W, H); bg.filter = "blur(2.5px)"; bg.drawImage(IMG.title, 0, 0, W, H); // same geometry, so nothing shifts as focus moves
      focusMask = document.createElement("canvas"); focusMask.width = 2000; focusMask.height = 1200;
      var mg = focusMask.getContext("2d"), gr = mg.createLinearGradient(200, 0, 1800, 0); // a wide, very soft band: sharp in the middle, fading out over a long distance
      gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.3, "rgba(255,255,255,.55)"); gr.addColorStop(0.5, "#fff"); gr.addColorStop(0.7, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      mg.fillStyle = gr; mg.beginPath(); mg.moveTo(1000 - 450, 0); mg.lineTo(1000 + 450, 0); mg.lineTo(1000 + 900, 1200); mg.lineTo(1000 - 900, 1200); mg.closePath(); mg.fill();
      focusCv = document.createElement("canvas"); focusCv.width = W * TQ; focusCv.height = H * TQ; focusCv.getContext("2d").scale(TQ, TQ);
      plateMask = document.createElement("canvas"); plateMask.width = W * TQ; plateMask.height = H * TQ; // the platter is always in focus
      var pm = plateMask.getContext("2d"); pm.scale(TQ, TQ); pm.filter = "blur(30px)"; pm.fillStyle = "#fff";
      pm.beginPath(); pm.ellipse(640, 558, 525, 150, 0, 0, 7); pm.fill();
    }
    var sp = SPOT, ang = Math.atan2(sp.x - 640, Math.max(200, sp.y + 140)) * 0.9, fc = focusCv.getContext("2d");
    fc.globalCompositeOperation = "source-over"; fc.clearRect(0, 0, W, H);
    fc.save(); fc.translate(640, -160); fc.rotate(-ang); fc.drawImage(focusMask, -1000, -40); fc.restore(); fc.drawImage(plateMask, 0, 0, W, H);
    fc.globalCompositeOperation = "source-in"; fc.drawImage(IMG.title, 0, 0, W, H);
    g.drawImage(blurTitle, 0, 0, W, H); g.drawImage(focusCv, 0, 0, W, H);
  }
  var coneCache = null, SPOT = { x: 640, y: 560, tx: 640, ty: 560, at: 0 };
  (function () {
    function aim(e) { var c = document.getElementById("view"), r = c.getBoundingClientRect(), p = e.touches ? e.touches[0] : e;
      SPOT.tx = Math.max(60, Math.min(W - 60, (p.clientX - r.left) / r.width * W)); SPOT.ty = Math.max(120, Math.min(H - 40, (p.clientY - r.top) / r.height * H)); SPOT.at = performance.now(); }
    window.addEventListener("pointermove", aim, { passive: true }); window.addEventListener("touchmove", aim, { passive: true });
  })();
  function render(dt) {
    if (S.mode === "title" || S.mode === "how") { // the game's own front door scene, not a chapter
      g.fillStyle = "#0d0a10"; g.fillRect(0, 0, W, H);
      if (IMG.title) { if (S.mode === "title") drawFocus(); else g.drawImage(IMG.title, 0, 0, W, H); }
      if (S.mode === "title") { // the overhead light flickers a little, like an old bulb
        var t = S.time, fl = 0.5 + 0.25 * Math.sin(t * 7.3) + 0.15 * Math.sin(t * 13.1 + 1) + (Math.sin(t * 2.1) > 0.97 ? -0.6 : 0);
        fl = Math.max(0, Math.min(1, fl));
        g.save(); g.globalCompositeOperation = "lighter";
        var cone = g.createLinearGradient(0, 0, 0, 560);
        cone.addColorStop(0, "rgba(205,185,255," + (0.30 + fl * 0.16) + ")"); cone.addColorStop(0.75, "rgba(170,140,255," + (0.11 + fl * 0.06) + ")"); cone.addColorStop(1, "rgba(200,180,255,0)");
        // the spotlight follows the mouse: the beam swings from the lamp and its pool lands where you point
        var sp = SPOT; sp.x += (sp.tx - sp.x) * Math.min(1, dt * 3.5); sp.y += (sp.ty - sp.y) * Math.min(1, dt * 3.5);
        if (performance.now() - sp.at > 3500) { sp.tx = 640; sp.ty = 560; }
        var lean = (sp.x - 640) / 600;
        g.globalCompositeOperation = "lighter";
        if (!coneCache) { // a cone that starts above the frame, so its top edge never shows when it swings; blurred once
          coneCache = document.createElement("canvas"); coneCache.width = 1100; coneCache.height = 980;
          var cg = coneCache.getContext("2d"), cg2 = cg.createLinearGradient(0, 0, 0, 920);
          cg2.addColorStop(0, "rgba(225,210,255,1)"); cg2.addColorStop(0.15, "rgba(225,210,255,1)"); cg2.addColorStop(0.65, "rgba(185,160,255,.5)"); cg2.addColorStop(1, "rgba(200,180,255,.06)");
          cg.fillStyle = cg2; cg.filter = "blur(16px)";
          cg.beginPath(); cg.moveTo(550 - 150, 20); cg.lineTo(550 + 150, 20); cg.lineTo(550 + 390, 940); cg.lineTo(550 - 390, 940); cg.closePath(); cg.fill();
        }
        var ang = Math.atan2(sp.x - 640, Math.max(200, sp.y + 140)) * 0.9; // aim from the lamp toward the pointer
        g.save(); g.translate(640, -160); g.rotate(-ang);
        g.globalAlpha = 0.24 + fl * 0.1; g.drawImage(coneCache, -550, -20); g.globalAlpha = 1; g.restore();
        for (var d = 0; d < 26; d++) { // dust drifting in the beam
          var dx = 470 + ((d * 97) % 340) + Math.sin(t * 0.4 + d) * 30 + (d % 5) * ((d * 13) % 7) * 6, dy = ((d * 53 + t * (8 + d % 4)) % 520) + 20; dx = 640 + (dx - 640) * (0.25 + dy / 700) + Math.sin(ang) * (dy + 30); dy = 30 + (dy + 0) * Math.cos(ang) - 30;
          g.fillStyle = "rgba(235,225,255," + (0.35 + 0.35 * Math.sin(t * 2 + d)) * fl + ")"; g.beginPath(); g.arc(dx, dy, 1.6, 0, 7); g.fill();
        }
        g.restore();
        trailPrints(t);
        g.fillStyle = "rgba(10,4,30," + (0.12 * (1 - fl)) + ")"; g.fillRect(0, 0, W, H); // the room dips slightly when the bulb flickers
      }
      return;
    }
    var gt = gait(), k = gt.k;
    // body motion: a soft bob that dips as the foot plants, a sway toward the stepping side, a little roll
    var bob = gt.walking ? -Math.sin(k * Math.PI) * 10 + Math.sin(k * Math.PI * 2) * 3 : Math.sin(S.time * 1.6) * 1.5;
    var sway = gt.walking ? Math.sin(k * Math.PI) * 9 * gt.side : 0;
    var roll = gt.walking ? Math.sin(k * Math.PI) * 0.012 * gt.side : 0;
    var amp = 0.45 + 0.55 * S.pace; bob *= amp; sway *= amp; roll *= amp; // tiptoeing barely bobs, hurrying bounces
    var wb = bob, ws = sway, wr = roll; bob *= 0.25; sway *= 0.2; roll *= 0.3; // shoulder camera: the world stays calm, the turkey does the waddling
    g.save();
    g.fillStyle = "#0d0a10"; g.fillRect(0, 0, W, H);
    var sh = S.shake > 0 ? S.shake * 12 : 0;
    var run = S.phase === "walk" && S.mode === "play" && tier() === 2 ? 1 : 0; S.runK = (S.runK || 0) + (run - (S.runK || 0)) * 0.12; // RUN tier only: camera punch + speed lines (eased in and out)
    g.translate(W / 2 + sway + (Math.random() - 0.5) * sh, H / 2 + bob + (Math.random() - 0.5) * sh); g.rotate(roll); g.scale(1 + 0.07 * S.runK, 1 + 0.07 * S.runK); g.translate(-W / 2, -H / 2); // sprinting punches the camera in
    var z = zoom(), p0 = plate(0, 0);
    var bgIm = IMG["bg" + S.ch], b0 = bgPt(0, 0), bk = SCENE.bgk || 1; if (bgIm) g.drawImage(bgIm, b0[0], b0[1], (W + 60) * z * bk, (H + 40) * z * bk);
    if (S.vac.length) drawVacTracks();
    if (S.phase === "walk" || S.open >= 0) SCENE.clutter.concat(S.vac).slice().sort(function (a, b) { return b.z - a.z; }).forEach(function (o) { if (o.kind) drawClutter(o); else drawVac(o); });
    if (SCENE.wall && IMG["wall" + S.ch]) { var Wl = SCENE.wall, w0 = bgPt(Wl.x, Wl.y), w1 = bgPt(Wl.x + Wl.w, Wl.y + Wl.h); g.drawImage(IMG["wall" + S.ch], w0[0], w0[1], w1[0] - w0[0], w1[1] - w0[1]); } // crisp far wall
    if (S.ch === 3) {
      g.fillStyle = "rgba(10,5,34,.34)"; g.fillRect(-60, -60, W + 120, H + 120); // lights off: the torch is the only light
      drawBeam();
    }
    if (S.ch === 1) drawParrot(); else if (S.ch === 2) drawCat(); else if (S.ch === 3) drawUncle(); else drawDog();
    var worldT = g.getTransform();
    g.restore();
    drawBars();
    if (S.runK > 0.05) drawSpeedLines(S.runK);
    drawTurkey(gt, wb, wr);
    if (S.ch === 3 && S.mode === "react") drawCaughtGlow();
    S.pops = S.pops.filter(function (p) { p.t += dt; return p.t < p.life; });
    S.pops.forEach(function (p) {
      var q = p.t / p.life, sc = q < 0.15 ? q / 0.15 : 1;
      g.save(); g.globalAlpha = q > 0.7 ? (1 - q) / 0.3 : 1; word(p.text, p.x, p.y - q * 40, p.size * (0.6 + 0.4 * sc), p.fill, p.rot); g.restore();
    });
    if (S.mode === "exiting") { g.fillStyle = "rgba(102,68,224," + Math.max(0, Math.min(1, (S.exitT - 0.5) / 0.6)) + ")"; g.fillRect(0, 0, W, H); }
    vignette();
  }
  // gravy footprints walking OUT of the empty plate: the escaped turkey's steps appear one by one, left-right-left,
  // getting bigger as they come toward us, then the trail fades and it starts again
  // prints lie on the tablecloth, which we see at a shallow angle: each print is drawn on the table plane
  // (squashed vertically by FLAT) and the walk, left/right stagger and toe splay are worked out on that plane
  var TRAIL = { pts: [[973, 571], [998, 646], [1135, 660]], x: 1022, y: 590, n: 3, rimFlat: 0.34, firstJump: 1.9, heading: 1.05, step0: 82, grow: 1.1, s0: 0.52, sGrow: 1.08, flat: 0.45,
    every: 0.42, hold: 1.6, fade: 0.8, rest: 1.2, spread: 20, splay: 0.2 };
  function trailPrints(t) {
    var im = IMG.print; if (!im) return;
    var T_ = TRAIL, cyc = T_.n * T_.every + T_.hold + T_.fade + T_.rest, ph = t % cyc;
    var fadeK = ph < T_.n * T_.every + T_.hold ? 1 : Math.max(0, 1 - (ph - T_.n * T_.every - T_.hold) / T_.fade);
    var a = T_.heading, ca = Math.cos(a), sa = Math.sin(a), wx = 0, wy = 0, step = T_.step0, sc = T_.s0;
    for (var i = 0; i < T_.n; i++) {
      var appear = ph - i * T_.every; if (appear < 0) break;
      var side = i % 2 ? 1 : -1;
      var fx = wx - sa * T_.spread * side * sc * 2.2, fy = wy + ca * T_.spread * side * sc * 2.2; // on the table plane
      var pop = Math.min(1, appear / 0.15);
      g.save(); g.globalAlpha = fadeK * pop;
      var fl = i === 0 ? T_.rimFlat : T_.flat;                   // the first print sits on the platter rim, seen even flatter
      if (T_.pts) { fx = 0; fy = 0; g.translate(T_.pts[i][0], T_.pts[i][1]); } // hand-placed prints: one on the platter rim, the rest on the cloth
      else g.translate(T_.x + fx, T_.y + fy * T_.flat);
      g.scale(1, fl);                                           // table plane -> screen
      g.rotate(a + Math.PI / 2 + side * T_.splay);              // toes along the walk, each foot turned slightly out
      var w = im.width * sc * (0.9 + 0.1 * pop), h = im.height * sc * (0.9 + 0.1 * pop);
      g.drawImage(im, -w / 2, -h / 2, w, h); g.restore();
      var jump = i === 0 ? T_.firstJump : 1;                     // hop off the rim and clear the platter's side and shadow
      wx += ca * step * jump; wy += sa * step * jump; step *= T_.grow; sc *= T_.sGrow;
    }
  }
  function vignette() {
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.ellipse(W / 2, 330, 690, 575, 0, 0, Math.PI * 2);
    g.fillStyle = "#000"; g.fill("evenodd"); g.restore();
  }
  function drawParrot() {
    var st = S.react > 0 ? (S.wakesLeft <= 0 || S.timeout ? "squawk" : "doze") : "sleep", im = st === "doze" ? IMG.peek || IMG.doze : IMG[st]; if (!im) return; // half-awake: one eye open
    var z = zoom(), hook = bgPt(SCENE.parrot.x, SCENE.parrot.hook), p = bgPt(SCENE.parrot.x, SCENE.parrot.y);
    var w = SCENE.parrot.w * z, h = w * im.height / im.width;
    var swing = Math.sin(S.time * 1.3) * 0.025 + (st === "alert" ? Math.sin(S.time * 18) * 0.03 : 0) + (st === "squawk" ? Math.sin(S.time * 30) * 0.07 : 0);
    var breathe = st === "sleep" ? Math.sin(S.time * 2.4) * 0.015 : 0;
    var stirring = st === "sleep" && S.wake > T.stirAt; // nearly awake: it shivers // nearly awake (eyes still shut): slow down!
    if (stirring) swing += Math.sin(S.time * 26) * 0.02 * (S.wake - T.stirAt) / (1 - T.stirAt) * 2;
    g.save(); g.translate(hook[0], hook[1]); g.rotate(swing); g.translate(-hook[0], -hook[1]);
    var rx = w * 0.4, lw = Math.max(3, 3.2 * z);
    [-rx, rx].forEach(function (dx) {
      var top = hook[1] - Math.sign(dx) * SCENE.parrot.slant * z / 2; // the frame's underside slopes slightly
      g.beginPath(); g.moveTo(hook[0] + dx * 0.55, top); g.lineTo(p[0] + dx, p[1] - h * 0.06);
      g.lineCap = "round"; g.strokeStyle = "#0d0a10"; g.lineWidth = lw * 2.4; g.stroke(); g.strokeStyle = "#a8692f"; g.lineWidth = lw; g.stroke();
      g.beginPath(); g.arc(hook[0] + dx * 0.55, top, lw * 1.3, 0, 7); g.lineWidth = lw * 0.9; g.strokeStyle = "#0d0a10"; g.stroke(); // little screw-eye in the frame
    });
    g.drawImage(im, p[0] - w / 2, p[1] - h * (1 + breathe), w, h * (1 + breathe));
    // status, kept to symbols: Z z z when it is safe, a wake meter under the perch
    var size = Math.max(26, 20 * z), hx = p[0] + w * 0.42, hy = p[1] - h * 0.8;
    if (st === "sleep") for (var i = 0; i < 3; i++) { var ph = (S.time * 0.55 + i / 3) % 1; g.save(); g.globalAlpha = Math.sin(ph * Math.PI); word("Z", hx + ph * 24, hy - ph * 44, size * (0.55 + ph * 0.5), "#ffffff", -0.2); g.restore(); }
    if (st === "doze" && S.react > 0) word("!", hx, hy - 6, size * 1.3, "#ebb316", 0.1);
    if (st === "squawk") word("SQUAWK!", p[0], p[1] - h - 12 * z, size * 1.8, "#ebb316", -0.08);
    g.restore();
  }
  // Chapter 2 visuals: the robot vacuums, and the hallway light that comes on when the family stirs
  function drawVacTracks() { // each robot cleans one strip across the rug: the fresh, lighter stripe shows exactly how far away its row is
    var near = S.cam.z + 0.15;
    S.vac.forEach(function (v) {
      var z0 = Math.max(near, v.z - 0.32), z1 = v.z + 0.32; if (z1 <= near) return;
      var a = floorPt(-2.7, z0), b = floorPt(2.7, z0), c = floorPt(2.7, z1), d = floorPt(-2.7, z1); if (!a || !b || !c || !d) return;
      g.save(); g.globalCompositeOperation = "screen"; g.filter = "blur(" + Math.max(2, (a.y - d.y) * 0.12) + "px)";
      g.fillStyle = "rgba(170,160,255,.32)"; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fill(); g.restore();
    });
  }
  function drawVac(v) {
    var im = v.stun > 0 && IMG.vacRed ? IMG.vacRed : IMG.vacuum; if (!im) return;
    var f = floorPt(v.x, v.z); if (!f) return;
    var w = VAC_W * f.s, h = w * im.height / im.width, t = S.time - v.hitAt;
    var jit = v.stun > 0 ? Math.sin(S.time * 60) * w * 0.02 : 0, rot = v.stun > 0 ? Math.sin(S.time * 40) * 0.06 : Math.sin(S.time * 9 + v.z) * 0.012;
    var hop = v.stun > 0 ? Math.abs(Math.sin(t * 22)) * h * 0.08 : Math.abs(Math.sin(S.time * 14 + v.z)) * h * 0.01; // a busy little rumble as it drives
    var fb = floorPt(v.x, v.z + 0.4), ff = floorPt(v.x, Math.max(S.cam.z + 0.15, v.z - 0.4)), sy = fb && ff ? (ff.y - fb.y) / 2 : w * 0.09; // its shadow lies flat on the floor, so you can read how far away it is
    g.save(); g.fillStyle = "rgba(13,10,16,.42)"; g.filter = "blur(" + Math.max(1, w * 0.02) + "px)"; g.beginPath(); g.ellipse(f.x, fb && ff ? (ff.y + fb.y) / 2 : f.y, w * 0.55, Math.max(3, sy), 0, 0, 7); g.fill(); g.restore();
    g.save(); g.translate(f.x + jit, f.y - hop); g.rotate(rot); g.drawImage(im, -w / 2, -h * 0.97, w, h); g.restore();
    if (v.stun > 0) { // roaring: a red alarm glow on its sensor
      var ly = f.y - hop - h * 0.82, lr = w * 0.16; // a small pulsing red glow on the top light only
      g.save(); g.globalCompositeOperation = "lighter"; var rg = g.createRadialGradient(f.x + jit, ly, 0, f.x + jit, ly, lr);
      rg.addColorStop(0, "rgba(255,50,70," + (0.45 + 0.3 * Math.sin(S.time * 30)) + ")"); rg.addColorStop(1, "rgba(255,50,70,0)");
      g.fillStyle = rg; g.fillRect(f.x + jit - lr, ly - lr, lr * 2, lr * 2); g.restore();
    }
  }
  function drawCat() {
    var st = S.react > 0 ? (S.wakesLeft <= 0 || S.timeout ? "hiss" : "doze") : "sleep";
    var im = st === "sleep" ? IMG.catSleep : st === "doze" ? IMG.catPeek : IMG.catDoze; if (!im) return; // half-awake: still curled, one eye open
    var z = zoom(), c = SCENE.cat, p = bgPt(c.x, c.y);
    var w = (st === "hiss" ? c.w * 0.98 : c.w) * z, h = w * im.height / im.width;
    var breathe = st === "sleep" ? Math.sin(S.time * 2.2) * 0.02 : 0, rot = 0;
    if (st === "sleep" && S.wake > T.stirAt) rot = Math.sin(S.time * 26) * 0.03 * (S.wake - T.stirAt) / (1 - T.stirAt) * 2; // nearly awake: it twitches
    if (st === "hiss") rot = Math.sin(S.time * 34) * 0.05;
    var sf = SCENE.seatFront, s0 = bgPt(sf.x0, sf.y0), s1 = bgPt(sf.x1, sf.y1);
    g.save(); g.fillStyle = "rgba(13,10,16,.35)"; g.beginPath(); g.ellipse(p[0], s0[1] + 2 * z, w * 0.5, 7 * z, 0, 0, 7); g.fill(); g.restore(); // contact shadow on the cushion
    g.save(); g.translate(p[0], p[1]); g.rotate(rot); g.drawImage(im, -w / 2, -h * (1 + breathe), w, h * (1 + breathe)); g.restore();
    var size = Math.max(26, 20 * z), hx = p[0] + w * 0.35, hy = p[1] - h * 0.9;
    if (st === "sleep") for (var i = 0; i < 3; i++) { var ph = (S.time * 0.55 + i / 3) % 1; g.save(); g.globalAlpha = Math.sin(ph * Math.PI); word("Z", hx + ph * 24, hy - ph * 44, size * (0.55 + ph * 0.5), "#ffffff", -0.2); g.restore(); }
    if (st === "doze") word("!", hx + 6, hy - 4, size * 1.3, "#ebb316", 0.1);
    if (st === "hiss") { // beside the head (not above it), so it stays on screen however tall the cat gets
      var fs = size * 1.8; g.font = fs + "px 'Turkey Bubble', 'Lilita One', sans-serif"; var tw = g.measureText("HISSS!").width;
      var tx = Math.min(W - tw / 2 - 16, p[0] + w * 0.42 + tw / 2), ty = Math.max(fs * 0.7 + 12, p[1] - h * 0.78);
      word("HISSS!", tx, ty, fs, "#ebb316", 0.08);
    }
  }
  function drawClutter(c, warn) { // warn: drawn over the turkey as a red-rimmed ghost, so you can see what you're about to step on
    var spec = CLUTTER[c.kind], im = IMG["c_" + c.kind]; if (!spec || !im) return;
    var i = SCENE.clutter.indexOf(c), t = S.hitAt && S.hitAt[i] != null ? Math.max(0, S.time - S.hitAt[i]) : -1;
    var cx = c.lane * SCENE.laneX, cz = c.z;
    if (t >= 0) { // kicked: it skids forward and off to the side so you can see it, then rattles
      var e = ease(Math.min(1, t / 0.35)), dir = S.hitDir && S.hitDir[i] || 1;
      var side = Math.abs(c.lane) >= 2 ? 0.45 : 1.25; cx += dir * SCENE.laneX * side * e; cz += (Math.abs(c.lane) >= 2 ? 1.0 : 0.8) * e;
    }
    var f = floorPt(cx, cz); if (!f) return;
    var w = spec.w * f.s * 2.1, h = w * im.height / im.width;
    var lit = S.ch === 3 ? litK(cx, cz) : 0; if (lit > 0) g.filter = "brightness(" + (1 + 0.75 * lit).toFixed(2) + ")"; else if (S.ch === 3) g.filter = "brightness(.8)"; // the torch picks things out of the dark
    g.save(); g.fillStyle = "rgba(13,10,16,.28)"; g.beginPath(); g.ellipse(f.x, f.y, w * 0.48, Math.max(3, w * 0.08), 0, 0, 7); g.fill(); g.restore();
    if (warn) {
      g.save(); g.globalAlpha = warn; g.filter = "drop-shadow(0 0 3px #f2287f) drop-shadow(0 0 6px #f2287f)";
      var pul = 1 + 0.04 * Math.sin(S.time * 14); g.translate(f.x, f.y); g.scale(pul, pul); g.drawImage(im, -w / 2, -h * 0.86, w, h); g.restore(); g.filter = "none"; return;
    }
    if (t >= 0 && t < 1.4) {
      var k = 1 - t / 1.4, rot = Math.sin(t * 34) * 0.3 * k, hop = Math.abs(Math.sin(t * 17)) * h * 0.25 * k, dx = Math.sin(t * 50) * w * 0.05 * k;
      g.save(); g.translate(f.x + dx, f.y - hop); g.rotate(rot); g.drawImage(im, -w / 2, -h * 0.86, w, h); g.restore();
    } else g.drawImage(im, f.x - w / 2, f.y - h * 0.86, w, h);
    g.filter = "none";
  }
  // Chapter 3: the torch beam. It is a cone on the floor from the torch, swept by the uncle's swaying arm.
  // the torch makes a soft pool of light on the floor that wanders as his arm sways
  function pool() { var b = S.beam; return { x: b.px, z: b.pz }; }
  function litK(x, z) { var B = SCENE.beam; if (!B || S.beam.px == null) return 0; var p = pool(), d = Math.hypot((x - p.x) / B.r, (z - p.z) / B.zr); return Math.max(0, Math.min(1, (1.45 - d) / 0.6)); }
  function inBeam(x, z) { var B = SCENE.beam, p = pool(), ux = S.beam.ux || 0, uz = S.beam.uz == null ? 1 : S.beam.uz, dx = x - p.x, dz = z - p.z;
    var along = dx * ux + dz * uz, across = -dx * uz + dz * ux; return Math.hypot(along / B.zr, across / B.r) < 1; }
  function torchScreen() { var up = S.mode === "react" && (S.wakesLeft <= 0 || S.timeout), c = up ? SCENE.torchUp : SCENE.torch; return bgPt(c.x, c.y); }
  var torchCone = null;
  function coneImg() {
    if (!torchCone) { torchCone = document.createElement("canvas"); torchCone.width = 520; torchCone.height = 960;
      var tc = torchCone.getContext("2d"), tg = tc.createLinearGradient(0, 0, 0, 920);
      tg.addColorStop(0, "rgba(255,250,236,1)"); tg.addColorStop(0.2, "rgba(255,250,236,.85)"); tg.addColorStop(0.75, "rgba(240,240,255,.55)"); tg.addColorStop(1, "rgba(240,240,255,0)");
      tc.fillStyle = tg; tc.filter = "blur(14px)"; tc.beginPath(); tc.moveTo(260 - 34, 30); tc.lineTo(260 + 34, 30); tc.lineTo(260 + 220, 930); tc.lineTo(260 - 220, 930); tc.closePath(); tc.fill(); }
    return torchCone;
  }
  function drawBeamAt(t0, x, y, wid) { // a cone from the lens to a point on screen
    var dd = Math.hypot(x - t0[0], y - t0[1]), ang = Math.atan2(x - t0[0], y - t0[1]), fl = 0.93 + 0.07 * Math.sin(S.time * 17);
    g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.5 * fl;
    g.translate(t0[0], t0[1]); g.rotate(-ang); g.scale(wid / 440 * 1.9, dd * 1.9 / 900); g.drawImage(coneImg(), -260, -30); g.restore(); // runs on past the turkey, so its end is off screen
    g.save(); g.globalCompositeOperation = "screen"; var z = zoom(), lg = g.createRadialGradient(t0[0], t0[1], 0, t0[0], t0[1], 16 * z);
    lg.addColorStop(0, "rgba(255,252,236,1)"); lg.addColorStop(1, "rgba(255,252,236,0)"); g.fillStyle = lg; g.fillRect(t0[0] - 20 * z, t0[1] - 20 * z, 40 * z, 40 * z); g.restore();
  }
  function drawCaughtGlow() { // the turkey, lit up in the torch
    var x = W / 2 + (S.tx - S.cam.x) * 250, gr = g.createRadialGradient(x, H - 200, 20, x, H - 160, 330);
    gr.addColorStop(0, "rgba(255,250,236,.5)"); gr.addColorStop(0.6, "rgba(255,250,236,.2)"); gr.addColorStop(1, "rgba(255,250,236,0)");
    g.save(); g.globalCompositeOperation = "screen"; g.fillStyle = gr; g.fillRect(x - 360, H - 520, 720, 520); g.restore();
  }
  // the light is built on the floor plane itself (a stretched oval pointing away from the torch), so perspective keeps it natural
  function screenToFloor(sx, sy) { // inverse of floorPt: the floor point under a spot on screen
    var dz = SCENE.E / Math.max(1, sy - SCENE.vp.y - tilt()); return { x: (sx - SCENE.vp.x - pan() * 0.15) * dz / SCENE.F + S.cam.x, z: S.cam.z + dz };
  }
  function drawBeam() {
    var B = SCENE.beam, p = pool(); if (p.x == null) return;
    if (S.mode === "react") { drawBeamAt(torchScreen(), W / 2 + (S.tx - S.cam.x) * 250, H - 250, 300); return; } // caught: the beam swings straight onto the turkey
    var t0 = torchScreen(), src = screenToFloor(t0[0], t0[1] + 6); // the floor right under the torch
    var near = S.cam.z + 0.32, dx = p.x - src.x, dz = p.z - src.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
    var a = B.zr, bb = B.r; S.beam.ux = ux; S.beam.uz = uz; // a low torch grazes the floor: the spot is longer along the beam. The same oval is the danger zone.
    var pts = [], i, n = 48;
    for (i = 0; i < n; i++) { var t = i / n * Math.PI * 2, ca = Math.cos(t), sa = Math.sin(t);
      var wx = p.x + ux * a * ca - uz * bb * sa, wz = Math.max(near, p.z + uz * a * ca + ux * bb * sa), f = floorPt(wx, wz); if (f) pts.push([f.x, f.y]); }
    if (pts.length < 6) return;
    var c = floorPt(p.x, Math.max(near, p.z)); if (!c) return;
    var R = 0; pts.forEach(function (q) { R = Math.max(R, Math.hypot(q[0] - c.x, q[1] - c.y)); });
    var fl = 0.93 + 0.07 * Math.sin(S.time * 17) * Math.sin(S.time * 5.3), dim = Math.max(0.6, 1 - L * 0.035);
    // the beam's edges touch the spot exactly: tangent points of the spot seen from the lens
    var nx = -(c.y - t0[1]), ny = c.x - t0[0], lft = pts[0], rgt = pts[0], dl = Infinity, dr = -Infinity;
    pts.forEach(function (q) { var d = (q[0] - t0[0]) * nx + (q[1] - t0[1]) * ny; if (d < dl) { dl = d; lft = q; } if (d > dr) { dr = d; rgt = q; } });
    var li = pts.indexOf(lft), ri = pts.indexOf(rgt);
    function arc(from, to) { var out = [], k = from; while (true) { out.push(pts[k]); if (k === to) break; k = (k + 1) % pts.length; } return out; }
    var arcA = arc(li, ri), arcB = arc(ri, li), far = function (ar) { return ar.reduce(function (m, q) { return m + Math.hypot(q[0] - t0[0], q[1] - t0[1]); }, 0) / ar.length; };
    var back = far(arcA) > far(arcB) ? arcA : arcB; // the far side of the spot closes the beam shape
    if (back === arcB) back = back.slice().reverse();
    var dd = Math.hypot(c.x - t0[0], c.y - t0[1]);
    g.save(); g.globalCompositeOperation = "screen";
    // one shape: lens -> both tangent points -> round the far side of the spot. Air part faint, floor part bright.
    function beamPath() { g.beginPath(); g.moveTo(t0[0], t0[1]); back.forEach(function (q) { g.lineTo(q[0], q[1]); }); g.closePath(); }
    g.filter = "blur(10px)"; g.globalCompositeOperation = "lighter";
    var bg = g.createLinearGradient(t0[0], t0[1], c.x, c.y);
    bg.addColorStop(0, "rgba(255,250,236," + (0.8 * fl) + ")"); bg.addColorStop(0.15, "rgba(255,250,236," + (0.5 * fl) + ")");
    bg.addColorStop(Math.max(0.2, 1 - R / dd), "rgba(255,250,236," + (0.38 * fl * dim) + ")"); bg.addColorStop(1, "rgba(255,250,236," + (0.4 * fl * dim) + ")");
    g.fillStyle = bg; beamPath(); g.fill(); g.globalCompositeOperation = "screen";
    // the spot on the rug, brightest at the end nearest the torch
    g.filter = "blur(12px)"; // a soft edge all round: the spot is filled (not clipped) so the blur feathers it
    var hx = c.x + (t0[0] - c.x) / (dd || 1) * R * 0.3, hy = c.y + (t0[1] - c.y) / (dd || 1) * R * 0.3;
    var pg = g.createRadialGradient(hx, hy, 0, c.x, c.y, R * 1.05);
    pg.addColorStop(0, "rgba(255,250,236," + (0.75 * fl) + ")"); pg.addColorStop(0.6, "rgba(255,250,236," + (0.6 * fl) + ")"); pg.addColorStop(1, "rgba(240,242,255," + (0.35 * fl) + ")"); g.globalCompositeOperation = "lighter";
    g.fillStyle = pg; g.beginPath(); pts.forEach(function (q, k) { if (k) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.fill();
    g.restore();
    g.save(); g.globalCompositeOperation = "screen"; var z = zoom(), lg = g.createRadialGradient(t0[0], t0[1], 0, t0[0], t0[1], 14 * z); // the lens glow
    lg.addColorStop(0, "rgba(255,252,236," + fl + ")"); lg.addColorStop(1, "rgba(255,252,236,0)"); g.fillStyle = lg; g.fillRect(t0[0] - 20 * z, t0[1] - 20 * z, 40 * z, 40 * z); g.restore();
  }
  function updateBeam(dt) {
    var B = SCENE.beam, b = S.beam, me = { x: S.tx, z: S.cam.z + hitDz() }; // the turkey's feet, same spot the floor clutter uses
    if (b.px == null) { b.px = -B.xAmp; b.pz = B.zc + B.zAmp; }
    if (S.mode === "react") { b.px += (me.x - b.px) * Math.min(1, dt * 8); b.pz += (me.z - b.pz) * Math.min(1, dt * 8); return false; } // it swings onto you
    // his arm sways with his breathing: lazy most of the time, now and then a quicker twitch
    var w = B.speed * (0.7 + 0.5 * (0.5 + 0.5 * Math.sin(S.time * 0.41 + 1.3)) + 0.6 * Math.max(0, Math.sin(S.time * 0.23) - 0.75) * 4);
    b.ph += dt * w; b.phz = (b.phz || 0) + dt * B.zSpeed;
    var lo = Math.min(B.far - 0.5, S.cam.z + hitDz() + 0.25), u = 0.5 + 0.5 * Math.sin(b.phz * 2 * Math.PI * 0.5 + 1.2); // it roams the floor between your feet and the sofa: always in front of you, never behind
    var tx = B.xAmp * Math.sin(b.ph), tz = lo + (B.far - lo) * u;
    b.px += (tx - b.px) * Math.min(1, dt * 5); b.pz += (tz - b.pz) * Math.min(1, dt * 5);
    b.grace = Math.max(0, b.grace - dt);
    b.snore -= dt; if (b.snore <= 0) { b.snore = 3.4; if (S.mode === "play") sfx("snore", 0.22); }
    if (b.grace > 0 || S.mode !== "play") { b.lit = 0; return false; }
    if (inBeam(me.x, me.z)) b.lit += dt; else b.lit = Math.max(0, b.lit - dt * 2);
    if (b.lit >= 0.3) { b.lit = 0; S.shake = 0.6; S.wake = 1; pop("!", 640, 360, 130, "#ebb316"); parrotWakes(); return true; }
    return false;
  }
  function drawUncle() {
    var st = S.react > 0 ? (S.wakesLeft <= 0 || S.timeout ? "wake" : "peek") : "sleep";
    var im = st === "sleep" ? IMG.uncleSleep : st === "peek" ? IMG.unclePeek || IMG.uncleSleep : IMG.uncleWake || IMG.uncleSleep; if (!im) return;
    var z = zoom() * (SCENE.bgk || 1) * (W + 60) / W, c = st === "wake" ? SCENE.uncle.wake : SCENE.uncle.sleep, p = bgPt(c.x, c.y), w = c.w * z, h = w * im.height / im.width;
    var breathe = st === "sleep" ? Math.sin(S.time * 2.4) * 0.015 : 0, rot = 0;
    if (st === "sleep" && S.wake > T.stirAt) rot = Math.sin(S.time * 26) * 0.012 * S.wake;
    if (st === "wake") rot = Math.sin(S.time * 30) * 0.015;
    g.save(); g.translate(p[0], p[1]); g.rotate(rot); g.drawImage(im, -w / 2, -h * (1 + breathe), w, h * (1 + breathe)); g.restore();
    var size = Math.max(26, 20 * z), hx = p[0] - w * 0.28, hy = p[1] - h * 1.0;
    if (st === "sleep") for (var i = 0; i < 3; i++) { var ph = (S.time * 0.5 + i / 3) % 1; g.save(); g.globalAlpha = Math.sin(ph * Math.PI); word("Z", hx + ph * 26, hy - ph * 44, size * (0.55 + ph * 0.5), "#ffffff", -0.2); g.restore(); }
    if (st === "peek") word("?", hx + 8, hy - 4, size * 1.3, "#ebb316", 0.1);
    if (st === "wake") { var fs = size * 1.8; word("HEY!", Math.min(W - fs * 1.5, hx + fs), Math.max(fs * 0.7 + 12, hy - fs * 0.3), fs, "#ebb316", -0.08); }
  }
  // Chapter 4: the mastiff and his sniff
  function drawDog() {
    var d = S.dog, st = S.react > 0 ? (S.wakesLeft <= 0 || S.timeout ? "wake" : "peek") : d.st === "sniff" ? "sniff" : "sleep";
    var im = { sleep: IMG.dogSleep, peek: d.smelled && IMG.dogSniffPeek ? IMG.dogSniffPeek : IMG.dogPeek, sniff: IMG.dogSniff, wake: IMG.dogWake }[st] || IMG.dogSleep; // smelled you mid-sniff: head still up, one eye cracks open if (!im) return;
    var c = SCENE.dog, z = zoom() * (SCENE.bgk || 1) * (W + 60) / W, p = bgPt(c.x, c.y), w = c.w * z * (st === "wake" ? 1.3 : 1), h = w * im.height / im.width;
    var breathe = st === "sleep" ? Math.sin(S.time * 2) * 0.02 : 0, rot = 0;
    if (st === "sleep" && S.wake > T.stirAt) rot = Math.sin(S.time * 26) * 0.02 * S.wake;
    if (st === "sniff") rot = Math.sin(S.time * 22) * 0.012;
    if (st === "wake") rot = Math.sin(S.time * 30) * 0.03;
    var bw = c.w * z; g.save(); g.fillStyle = "rgba(13,10,16,.45)"; g.filter = "blur(" + Math.max(1, 2 * z) + "px)"; g.beginPath(); g.ellipse(p[0], p[1] - 3 * z, bw * 0.5, bw * 0.07, 0, 0, 7); g.fill(); g.restore(); // contact shadow on the floor
    g.save(); g.translate(p[0], p[1]); g.rotate(rot); g.drawImage(im, -w / 2, -h * (1 + breathe), w, h * (1 + breathe)); g.restore();
    var size = Math.max(26, 20 * z), hx = p[0] + w * 0.32, hy = p[1] - h * 0.95;
    if (st === "sleep") for (var i = 0; i < 3; i++) { var ph = (S.time * 0.5 + i / 3) % 1; g.save(); g.globalAlpha = Math.sin(ph * Math.PI); word("Z", hx + ph * 26, hy - ph * 44, size * (0.55 + ph * 0.5), "#ffffff", -0.2); g.restore(); }
    if (st === "sniff") { var k = (S.time * 3) % 1; g.save(); g.globalAlpha = 0.5 + 0.5 * Math.sin(k * Math.PI); word("SNIFF", Math.min(W - size * 2.2, hx + size * 1.2), Math.max(size, hy - 6), size * 0.95, "#ebb316", -0.1); g.restore(); }
    if (st === "peek") word("?", hx, hy - 4, size * 1.3, "#ebb316", 0.1);
    if (st === "wake") { var fs = size * 1.8; word("WOOF!", Math.min(W - fs * 1.8, hx + fs), Math.max(fs * 0.7 + 12, hy - fs * 0.3), fs, "#ebb316", -0.08); }
  }
  function updateDog(dt) {
    var d = S.dog, C = SCENE.sniff;
    if (S.mode !== "play") return false;
    d.t -= dt;
    if (d.st === "sleep" && d.t <= 0) { d.st = "sniff"; d.t = C.len; d.since = 0; sfx("sniff", 0.9); }
    else if (d.st === "sniff") {
      d.since += dt;
      if (d.since > C.grace && (S.hold || S.pace > 0.15)) { d.smelled = true; d.st = "sleep"; d.t = 2.5; S.shake = 0.5; S.wake = 1; pop("!", 640, 360, 130, "#ebb316"); parrotWakes(); return true; } // he smelled you
      if (d.t <= 0) { d.st = "sleep"; d.t = C.rest[0] + Math.random() * (C.rest[1] - C.rest[0]); }
    }
    return false;
  }
  function drawBars() {
    if (!IMG.bars || (S.phase !== "cage" && S.open < 0)) return;
    var o = Math.max(0, S.open), dmg = S.pecks / T.pecksNeeded;
    var shake = S.peckAnim > 0 ? Math.sin(S.peckAnim * 90) * 4 * S.peckAnim / 0.15 : 0, e = ease(Math.min(1, o));
    g.save(); g.translate(-e * 1150, 0);
    g.drawImage(IMG.bars, 28 + shake * 0.3, -12, W + 40, H + 24);
    if (IMG.latch && S.phase === "cage") {
      var lw = 260, lh = lw * IMG.latch.height / IMG.latch.width, wob = dmg * Math.sin(S.time * 30) * 0.03;
      g.save(); g.translate(686 + shake * 1.5, 372); g.rotate(wob + dmg * 0.18);
      g.drawImage(IMG.latch, -lw / 2, -lh / 2, lw, lh); g.restore();
    }
    g.restore();
    if (IMG.latch && S.phase !== "cage" && o < 1) {
      var lw2 = 260, lh2 = lw2 * IMG.latch.height / IMG.latch.width;
      g.save(); g.translate(686 + o * 120, 372 + o * o * 700); g.rotate(o * 5);
      g.drawImage(IMG.latch, -lw2 / 2, -lh2 / 2, lw2, lh2); g.restore();
    }
  }
  // over-the-shoulder: the turkey from behind, bottom centre. It waddles side to side with each step,
  // bounces more the faster it goes, leans in to peck, and steps across when you change lane.
  var LINES = []; for (var li = 0; li < 34; li++) LINES.push({ a: Math.random() * Math.PI * 2, r: Math.random(), len: 0.5 + Math.random() * 0.8, w: 2 + Math.random() * 3 });
  function drawSpeedLines(k) { // white streaks rushing out from the far end of the room while sprinting
    var vx = SCENE.vp.x, vy = SCENE.vp.y, R = Math.hypot(W, H) * 0.62;
    g.save(); g.lineCap = "round";
    LINES.forEach(function (l, i) {
      var t = ((S.time * (1.6 + l.len) + l.r) % 1), r0 = R * (0.45 + t * 0.55), r1 = r0 + R * 0.12 * l.len * (0.5 + k);
      g.globalAlpha = k * 0.85 * Math.sin(t * Math.PI); g.strokeStyle = i % 5 ? "#ffffff" : "#c9b8ff"; g.lineWidth = l.w * 1.5;
      g.beginPath(); g.moveTo(vx + Math.cos(l.a) * r0, vy + Math.sin(l.a) * r0 * 0.7); g.lineTo(vx + Math.cos(l.a) * r1, vy + Math.sin(l.a) * r1 * 0.7); g.stroke();
    });
    g.restore();
  }
  function drawTurkey(gt, bob, roll) {
    var im = IMG.back; if (!im) return;
    var h = 370, w = h * im.width / im.height, k = gt.k;   // head, neck and shoulders only; the rest is below the screen
    var lead = (S.tx - S.cam.x) * 250;                                   // where the turkey is, relative to the camera
    var waddle = gt.walking ? Math.sin(k * Math.PI) * gt.side : 0;
    var x = W / 2 + lead + waddle * 10, y = H + 52 + bob * 0.9 + (S.phase === "cage" ? 30 : 0); // deep enough that the cut-off shoulders never show // in the cage it sits lower so the latch shows
    var rot = waddle * (0.05 + 0.04 * S.pace) + roll * 2 + (S.vx || 0) * 0.035; // leans into a dodge
    var pk = S.peckAnim > 0 ? S.peckAnim / 0.15 : 0;                    // peck: dip forward, away from us
    var sq = gt.walking ? 1 - 0.035 * Math.sin(k * Math.PI * 2) : 1 + 0.01 * Math.sin(S.time * 2);
    var fade = 1;
    if (S.mode === "exiting") { var r = S.exitT; y += r * 60; rot = Math.sin(r * 18) * 0.06; fade = Math.max(0, 1 - r * 1.8); } // sinks out of view as we pass through
    if (fade <= 0) return;
    if (S.ch === 3 && S.mode !== "exiting") { var lt = litK(S.tx, S.cam.z + hitDz()); g.filter = lt > 0 ? "brightness(" + (1 + 0.6 * lt).toFixed(2) + ")" : "brightness(.85)"; }
    g.save(); g.globalAlpha = fade; g.translate(x, y - pk * 26); g.rotate(rot); g.scale(1 / sq * (1 - pk * 0.05), sq * (1 - pk * 0.06));
    if (S.mode === "react" && IMG.shock) { // the sleeper stirred: feathers puff up, head jolts, a sweat drop flies
      var k2 = h / 543, jt = Math.max(0, S.react - 1.2) * 2.5, j = 1 + 0.06 * Math.sin(jt * 18) * jt; // a quick startled jolt
      g.translate(Math.sin(S.time * 60) * 2 * jt, 0); g.scale(j, j);
      if (S.wakesLeft <= 0 && !S.timeout && IMG.wings) g.drawImage(IMG.wings, -w / 2 - 263 * k2, -h - 55 * k2, 1047 * k2, 589 * k2); // last life: wings flung open
      else g.drawImage(IMG.shock, -w / 2 - 34 * k2, -h - 45 * k2, 588 * k2, 588 * k2);
    } else g.drawImage(im, -w / 2, -h, w, h);
    g.restore(); g.filter = "none";
  }
  function drawFoot(gt) { // one smooth arc per stride; the foot's cut-off ankle always stays below the screen edge
    if (!gt.walking || !IMG.footL) return;
    var k = gt.k, left = gt.side < 0, im = left ? IMG.footL : IMG.footR;
    var arc = Math.sin(Math.PI * k), w = 250, h = w * im.height / im.width;
    var x = (left ? 320 : W - 320) + (left ? 1 : -1) * k * 36;
    var bottom = H + h * 0.06 + (1 - arc) * h * 0.55;       // lowest point of the sprite; never above H
    var rot = (left ? 1 : -1) * (0.05 - 0.1 * k);
    g.save(); g.translate(x, bottom); g.rotate(rot); g.drawImage(im, -w / 2, -h, w, h); g.restore();
  }
  function drawBeak(bob) {
    if (!IMG.beak) return;
    var pk = S.peckAnim > 0 ? S.peckAnim / 0.15 : 0, w = 300, h = w * 160 / 280;
    g.drawImage(IMG.beak, W / 2 - w / 2, H + 44 - h - pk * 40 + bob, w, h);
  }

  // ------------------------------------------------------------ UI helpers
  function el(tag, cls, kids) {
    var e = document.createElement(tag); if (cls) e.className = cls;
    (kids || []).forEach(function (k) { if (k == null) return; e.appendChild(typeof k === "string" ? document.createTextNode(k) : k); });
    return e;
  }
  function img(src, cls) { var i = el("img", cls); i.src = src; i.alt = ""; return i; }
  var primary = null; // the button Enter presses
  function screen(node, cls, enterFn) { var sc = $("screen"); sc.innerHTML = ""; sc.className = node ? "on " + (cls || "") : ""; if (node) sc.appendChild(node); primary = enterFn || null; }
  function btn(label, variant, fn, tilt) { return TE.Button({ label: label, variant: variant, tilt: tilt, onClick: function () { ac(); sfx("uiClick", 0.7); fn(); } }); }
  function clockIcon(size) { var sp = el("span", "clock-ic"); sp.innerHTML = '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 6.8V12l3.4 2.2"/></svg>'; return sp; }
  // one tile style everywhere: a soft recessed well in the panel, art on top, white outlined label (same size on every screen)
  // panel art: pre-outlined at 2x (same black + white outline everywhere); shown at half its pixel size
  function pn(name, cls) {
    var i = img("img/pn-" + name + ".webp", "pn-img " + (cls || "")), c = PN[name];
    if (c && c.naturalWidth) i.style.width = (c.naturalWidth / 2 * 1.25) + "px";
    else i.onload = function () { i.style.width = (i.naturalWidth / 2 * 1.25) + "px"; };
    return i;
  }
  function tile(art, label, size) { return el("div", "tile " + (size || ""), [el("div", "tile-art", [art]), label ? el("div", "tile-lbl", [label]) : null]); }
  function livesPill(n, cls) { return el("div", cls || "clock te-sticker lives", [img("img/hud3-feather.webp", "feather-ic"), el("b", null, [Math.max(0, n) + "/" + T.wakes])]); }
  function star3d(on, size, delay) { // drawn like the title lettering: rounded star, yellow face + sheen, pink 3D sides, one ink outline around it all
    var P = "M50 14 L60.5 37 L85.5 39.5 L66.5 56.5 L72 81 L50 68.5 L28 81 L33.5 56.5 L14.5 39.5 L39.5 37 Z", d = 10;
    var side = on ? "#ff2a8a" : "#211560", face = on ? "url(#sg)" : "#3a2a8e", ink = "", fill = "";
    for (var i = d; i >= 0; i--) { var t = ' transform="translate(' + (i * 0.4).toFixed(2) + ' ' + (i * 0.85).toFixed(2) + ')"';
      ink += '<path d="' + P + '"' + t + ' fill="#0d0a10" stroke="#0d0a10" stroke-width="27" stroke-linejoin="round"/>';
      fill += '<path d="' + P + '"' + t + ' fill="' + side + '" stroke="' + side + '" stroke-width="15" stroke-linejoin="round"/>'; }
    var svg = '<svg viewBox="-8 -6 118 118" width="' + size + '" height="' + size + '"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbcb45"/><stop offset="1" stop-color="#f1b02a"/></linearGradient></defs>' +
      ink + fill + '<path d="' + P + '" fill="' + face + '" stroke="' + face + '" stroke-width="15" stroke-linejoin="round"/>' +
      (on ? '<path d="M17 37.5 L37 35 L47 13" fill="none" stroke="#fffbe6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".85" transform="translate(4 4)"/>' : "") + '</svg>';
    var sp = el("span", "star3d" + (on ? " on" : "")); sp.innerHTML = svg; sp.style.animationDelay = delay + "s"; return sp;
  }
  function arrowKey(rot) { // a blank keycap from the kit with the line arrow drawn inside, matching the SPACE key
    var k = TE.Keycap({ label: "X", width: 54 }), lab = k.querySelector(".te-key-label"); lab.textContent = "";
    var a = arrowIc(rot); a.classList.add("in-key"); lab.appendChild(a); return k;
  }
  function arrowIc(rot) { // a chunky rounded arrow in the hand-inked style
    var sp = el("span", "arrow-ic"); sp.style.transform = "rotate(" + rot + "deg)";
    sp.innerHTML = '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="#0d0a10" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16 26 V7 M8.5 14 L16 6.5 L23.5 14"/></svg>';
    return sp;
  }
  function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ":" + ("0" + (t % 60)).slice(-2); }
  function card(kids, cls) { return el("div", "float-card pop-in " + (cls || ""), kids); }
  // every panel looks like How to Play: the title sits on the top edge, half over the panel
  function panel(title, kids, cls, btns) { // buttons sit on the bottom edge, half over the panel; title can be a node (e.g. stars)
    var p = typeof title === "string" ? TE.Panel({ title: title, titleSize: TYPE.h1, children: [el("div", "panel-in " + (cls || ""), kids)] })
      : el("div", "col panel-custom", [el("div", "panel-head", [title]), TE.Panel({ children: [el("div", "panel-in " + (cls || ""), kids)] })]);
    return el("div", "col pop-in panel-wrap", [p,
      btns && btns.length ? el("div", "row panel-btns", btns) : null]);
  }

  // ------------------------------------------------------------ HUD: feathers + clock, noise meter, one-word prompt
  var hud = { lives: -1, noise: -1, prompt: "", clock: "" };
  function setHUD(force) {
    var on = S.mode === "play" || S.mode === "react";
    $("hud").classList.toggle("hidden", !on); document.body.classList.toggle("playing", on);
    if (force || hud.lives !== S.wakesLeft) { var lost = !force && hud.lives > S.wakesLeft; hud.lives = S.wakesLeft; $("hud-lives").innerHTML = ""; var lp = livesPill(S.wakesLeft); if (lost) lp.classList.add("hit"); $("hud-lives").appendChild(lp); } // a life lost: the pill bumps once and its count flashes pink
    var nb = Math.round(S.noise * 21);
    if (force || hud.noise !== nb) { hud.noise = nb; $("hud-noise").innerHTML = ""; $("hud-noise").appendChild(TE.NoiseMeter({ level: S.noise, width: 240, height: 72 })); }
    var hn = $("hud-noise"), dg = S.red > 0 && S.mode === "play"; hn.classList.toggle("danger", dg); // in the red: it shakes harder as the sleeper gets closer to waking
    if (dg) { var rk = Math.min(1, S.red / T.redFor); hn.style.setProperty("--d", (3 + 9 * rk).toFixed(1) + "px"); hn.style.setProperty("--big", (1.35 + 0.35 * rk).toFixed(2)); hn.style.setProperty("--tw", (2 + 4 * rk).toFixed(1) + "deg"); } // too loud: the meter swells and shakes harder the closer the sleeper is to waking
    var c = fmt(S.left);
    if (force || hud.clock !== c) {
      hud.clock = c; var cl = $("hud-clock");
      if (!cl.firstChild) cl.appendChild(el("div", "clock te-sticker", [img("img/hud3-clock.svg", "clock-ic-img"), el("b")]));
      cl.querySelector("b").textContent = c; cl.firstChild.classList.toggle("hurry", S.left <= 10); // last 10 s: the clock pill swells and rings, a tick each second
      if (S.left <= 10 && S.mode === "play" && !force) { sfx("tick", S.left <= 5 ? 1.4 : 1); var ck = cl.firstChild; ck.classList.remove("ring"); void ck.offsetWidth; ck.classList.add("ring"); }
    }
    var pr = S.mode !== "play" ? "" : S.phase === "cage" ? "peck" + S.pecks : "sneak";
    if (force || hud.prompt !== pr) {
      hud.prompt = pr; var p = $("hud-prompt"); p.innerHTML = "";
      if (S.phase === "cage" && S.mode === "play" && !TOUCH) p.appendChild(el("span", "te-prompt te-sticker", [arrowKey(0), el("b", null, ["PECK"]), el("span", "count", [S.pecks + "/" + T.pecksNeeded])]));
      var wb = TOUCH && document.querySelector("#touch .tpad.walk b"); // phones: the big button says what it does, with the peck count inside
      if (wb) { var cage = S.phase === "cage"; $("touch").classList.toggle("cage", cage); wb.textContent = cage ? "PECK" : "WALK"; var cn = wb.parentNode.querySelector("i"); if (!cn) { cn = document.createElement("i"); wb.parentNode.appendChild(cn); } cn.textContent = cage ? S.pecks + "/" + T.pecksNeeded : ""; }
      if (S.phase === "walk" && S.mode === "play" && !TOUCH) p.appendChild(el("span", "te-prompt te-sticker", [arrowKey(0), el("b", null, ["WALK"]), el("i", "dot"), arrowKey(-90), arrowKey(90), el("b", null, ["DODGE"])]));
    }
  }

  // ------------------------------------------------------------ screens (every step is a button click; Enter = the main button)
  // Lettering draws each letter as its own span, so apply the font's kerning pairs as margins
  var _Lettering = TE.Lettering;
  TE.Lettering = function (p) {
    var node = _Lettering(p), K = window.TE_KERN || {}, L = window.TE_LETTERS || {};
    node.querySelectorAll(".te-word").forEach(function (w) {
      var chs = w.querySelectorAll(".te-ch");
      // Tina's styled letter art (outline, sheen, pink extrusion) wherever a letter exists; the font covers the rest
      if (p.svgLetters && p.extrude !== false && Array.prototype.every.call(chs, function (ch) { return L[ch.getAttribute("data-c")]; })) {
        node.classList.add("svgl"); w.classList.add("svgl-word");
        Array.prototype.forEach.call(chs, function (ch, i) {
          var c = ch.getAttribute("data-c"), m = L[c], im = new Image();
          im.src = "img/letters/" + c + ".svg"; im.alt = ""; im.draggable = false;
          im.style.cssText = "left:" + (-m.x) + "em;top:" + (0.8 - m.base) + "em;width:" + m.w + "em;height:" + m.h + "em";
          ch.textContent = ""; ch.appendChild(im); ch.style.width = m.iw + "em";
          if (i) ch.style.marginLeft = "0.01em"; // ink boxes almost touch; the pink tucks under the next letter
        });
        return;
      }
    }); // kerning, the sheen line and the logo's curve come from the design system's Lettering
    return node;
  };
  // bend a word of lettering into a gentle arch, like the mockup (centre letters lifted, ends tilted outward)
  function arch(node, lift, tilt) {
    var chs = node.querySelectorAll(".te-ch"), n = chs.length;
    Array.prototype.forEach.call(chs, function (ch, i) {
      var u = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0;
      ch.style.setProperty("--dy", (-lift * (1 - u * u)).toFixed(3) + "em");
      ch.style.setProperty("--rot", (u * tilt).toFixed(2) + "deg");
    });
    return node;
  }
  var COPY = "© 2026 xiaoyinggoodjob";
  function copyLine() { return el("div", "copy-line", [COPY]); }
  function showTitle() {
    stopBeach();
    S = fresh(); S.mode = "title";
    screen(el("div", "title-layout side", [el("div", "title-stack pop-in", [
      el("div", "col title-top glossy", [
        arch(TE.Lettering({ text: "TURKEY", size: 150, bounce: 0.08 }), 0.10, 5),
        arch(TE.Lettering({ text: "ESCAPE", size: 150, bounce: 0.08, seed: 7 }), 0.07, 4)
      ]),
      el("div", "row btns title-btns", [btn("PLAY", "mustard", function () { showChapter(1); }, -3), btn("HOW TO PLAY", "teal", showHow, 2)])
    ]), copyLine()]), "", function () { showChapter(1); });
    // letters drop in one by one, then keep a gentle jelly wave
    Array.prototype.forEach.call(document.querySelectorAll(".title-top .te-ch"), function (ch, i) { ch.style.setProperty("--i", i); });
  }
  function clockArt(w) { // sticker-style clock to match the key / wave artwork
    var d = el("span", "te-art"); d.style.width = w + "px";
    d.innerHTML = '<svg viewBox="0 0 120 100"><g stroke="#0d0a10" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="60" cy="52" r="40" fill="#fff" stroke-width="12"/><circle cx="60" cy="52" r="40" fill="#fff" stroke-width="5"/>' +
      '<path d="M60 28v24l15 10" fill="none" stroke-width="6"/><circle cx="60" cy="52" r="4" fill="#0d0a10"/>' +
      '<path d="M22 18l-8-8M98 18l8-8M14 52H6M106 52h8" stroke-width="4" fill="none"/></g></svg>';
    return d;
  }
  function touchIc(kind) { // the on-screen buttons, drawn small for the How to Play tiles
    var d = el("div", "tic " + kind), A = function (r) { return '<svg viewBox="0 0 32 32" style="transform:rotate(' + r + 'deg)"><path d="M16 26 V7 M8.5 14 L16 6.5 L23.5 14" fill="none" stroke="#0d0a10" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
    d.innerHTML = kind === "walk" ? '<span class="tpad walk">' + A(0) + '<b>WALK</b></span>' : '<span class="tpad left">' + A(-90) + '</span><span class="tpad right">' + A(90) + '</span>';
    return d;
  }
  function showHow() {
    var cw = 250;
    var cards = el("div", "row tiles", [
      tile(TOUCH ? touchIc("walk") : pn("up"), TOUCH ? "TAP OR HOLD" : "WALK"),
      tile(TOUCH ? touchIc("lr") : pn("lr"), "DODGE"),
      tile(pn("wave"), "STAY QUIET"),
      tile(pn("clock"), "BE QUICK")
    ]);
    S.mode = "how";
    screen(panel("HOW TO PLAY", [cards], "how-in", [btn("BACK", "mustard", showTitle, -2)]), "dim", showTitle);
  }
  function showChapter(n) {
    stopBeach();
    goFull();
    n = n || 1; S = fresh(n); S.mode = "intro";
    var items = n === 1 ? [tile(pn("clock"), "ESCAPE IN " + CHAPTERS[n].time + "S"), tile(pn("forks"), "DODGE THE MESS"), tile(pn("parrot-sleep"), "DON'T WAKE IT")]
      : n === 2 ? [tile(pn("clock"), "ESCAPE IN " + CHAPTERS[n].time + "S"), tile(pn("vacuum"), "DODGE THE ROBOTS"), tile(pn("cat-sleep"), "DON'T WAKE IT")]
      : n === 3 ? [tile(pn("clock"), "ESCAPE IN " + CHAPTERS[n].time + "S"), tile(pn("torch"), "DODGE THE LIGHT"), tile(pn("uncle-sleep"), "DON'T WAKE HIM")]
      : [tile(pn("clock"), "ESCAPE IN " + CHAPTERS[n].time + "S"), tile(pn("dog-sniff"), "FREEZE ON SNIFF"), tile(pn("dog-sleep"), "DON'T WAKE HIM")];
    screen(panel("CHAPTER " + n, [el("div", "row tiles", items)], "chapter-in", [btn("START", "teal", start, -2)]), "dim", start);
  }
  function again() { showChapter(S.ch); }
  function showPause() {
    screen(panel("PAUSED", [
      el("div", "row tiles", [
        tile(pn("feather"), S.wakesLeft + "/" + T.wakes),
        tile(pn("clock"), fmt(S.left))
      ])
    ], "pause-in", [btn("RESUME", "teal", resume, -2), btn("RESTART", "mustard", again, 2)]), "dim", resume);
  }
  function showCaught(reason) { stopSnore(); // same panel as every other screen
    S.mode = "over"; stopMusic(); wantMusic = false; sfx("fail");
    var time = reason === "time";
    screen(panel(time ? "SUNRISE!" : "CAUGHT!", [
      el("div", "row tiles", [time ? tile(pn("clock", "hero-clock"), "THE FAMILY IS WAKING UP", "hero")
        : S.ch === 4 ? tile(pn("dog-wake"), "THE DOG WOKE UP", "hero") : S.ch === 3 ? tile(pn("uncle-wake"), "THE UNCLE WOKE UP", "hero") : S.ch === 2 ? tile(pn("cat-hiss"), "THE CAT WOKE UP", "hero") : tile(pn("parrot-squawk", "caught-parrot"), "THE PARROT WOKE UP", "hero")])
    ], "caught-in", [btn("TRY AGAIN", "mustard", again, -2), btn("QUIT", "teal", showTitle, 2)]), "dim", again);
  }
  function showEnding() { // the very end: fade to full white, then the turkey on holiday toasting the camera
    S.mode = "ending"; stopSnore(); setHUD(false);
    if (!muted) startMusic(); if (music) { var mv = setInterval(function () { music.volume = Math.max(0.1, music.volume - 0.01); if (music.volume <= 0.1) clearInterval(mv); }, 60); } // the music keeps going, softly, under the waves
    var wrap = el("div", "ending " + (SCENE4.endLayout || "")), flash = el("div", "ending-white"), title = el("div", "ending-title");
    var pic = el("div", "ending-img"); // the beach: Tina's Luma loop (waves, a light breeze), seamless, with its own soft ocean sound
    var vid = document.createElement("video"); vid.className = "end-video"; vid.src = "img/ending.mp4"; vid.poster = "img/ending-poster.webp";
    vid.loop = true; vid.playsInline = true; vid.autoplay = true; vid.muted = true; vid.setAttribute("playsinline", ""); vid.setAttribute("muted", ""); startBeach(); // the picture loops silently; the waves are a gapless Web Audio loop
    pic.appendChild(vid); var pr = vid.play(); if (pr && pr.catch) pr.catch(function () { }); // already playing under the white, so the waves are moving when it clears
    try { title.appendChild(TE.Lettering({ text: "HAPPY", size: 104, bounce: 0.08 })); title.appendChild(TE.Lettering({ text: "THANKSGIVING!", size: 104, bounce: 0.08, seed: 5 })); }
    catch (e) { title.innerHTML = "HAPPY<br>THANKSGIVING!"; }
    var go = el("div", "ending-btns", [btn("PLAY AGAIN", "mustard", function () { showChapter(1); }, -2), btn("MENU", "teal", showTitle, 2)]);
    wrap.appendChild(pic); wrap.appendChild(title); wrap.appendChild(go); wrap.appendChild(copyLine()); wrap.appendChild(flash);
    screen(wrap, "ending-on", function () { showChapter(1); });
    requestAnimationFrame(function () { wrap.classList.add("white"); });              // 1: the screen fills with white
    setTimeout(function () { sfx("win"); wrap.classList.add("show"); }, 1300);        // 2: white slowly clears to the beach
    setTimeout(function () { wrap.classList.add("title"); }, 2700);                   // 3: the title and buttons pop in
  }
  function showClear() { stopSnore(); // floating panel, as in the Chapter Clear reference
    if (S.ch >= LAST) { showEnding(); return; }
    S.mode = "clear"; stopMusic(); wantMusic = false; sfx("win");
    var stars = el("div", "stars3d");
    for (var i = 0; i < 3; i++) stars.appendChild(star3d(i < S.wakesLeft, i === 1 ? 124 : 104, 0.3 + i * 0.2));
    screen(panel(stars, [
      el("div", "row tiles", [tile(pn("turkey-win", "win"), S.ch >= LAST ? "YOU ESCAPED!" : "CHAPTER CLEARED!", "hero")])
    ], "clear-in", S.ch >= LAST ? [btn("PLAY AGAIN", "mustard", again1, -2), btn("MENU", "teal", showTitle, 2)] : [btn("NEXT", "teal", next, -2)]), "dim", S.ch >= LAST ? again1 : next);
    function next() { showChapter(S.ch + 1); }
    function again1() { showChapter(1); }
  }
  function showSoon() {
    screen(panel("CHAPTER 3", [
      el("div", "row tiles", [tile(pn("turkey-smug"), "COMING SOON", "hero")])
    ], "soon-in", [btn("PLAY AGAIN", "mustard", function () { showChapter(2); }, -2), btn("MENU", "teal", showTitle, 2)]), "dim", function () { showChapter(2); });
  }

  // ------------------------------------------------------------ rules
  function mix(a, k) { return a[0] + (a[1] - a[0]) * k; }
  // ONE RULE drives every walking visual: the tier is the meter zone your pace puts you in
  // 0 = TIPTOE (quiet, teal)   1 = WALK (loud, yellow)   2 = RUN (too loud, red)
  // speed follows the tier too: the quiet tiers are slow on purpose, only RUN is fast
  function tierSpeed() { var l = S.pl || 0; return l < T.tooLoud ? 0.1 + 0.38 * Math.min(1, l / 0.8) : 0.38 + 1.2 * Math.min(1, (l - T.tooLoud) / 0.1); } // a brisk walk tops out before the red, so you can walk fast without being too loud
  function tier() { var l = S.pl || 0; return l >= T.tooLoud ? 2 : l >= 0.4 ? 1 : 0; }
  function makeNoise(n) { S.burst = Math.min(1, Math.max(S.burst, S.noise) + n); S.still = 0; }
  function start() { if (S.ch === LAST) setTimeout(beachBuf, 3000); goFull(); S.mode = "play"; screen(null); ac(); startMusic(); setHUD(true); if (S.ch === 3) { S.beam.grace = 1.2; S.beam.ph = -Math.PI / 2 + (Math.random() - 0.5) * 0.8; S.beam.phz = Math.random(); } } // the beam starts off to the side
  function pause() { stopSnore(); if (S.mode !== "play") return; S.mode = "paused"; showPause(); }
  function resume() { if (S.mode !== "paused") return; S.mode = "play"; screen(null); }

  function peck() {
    if (S.phase !== "cage" || S.peckCd > 0) return;
    S.peckCd = T.peckCooldown; S.peckAnim = 0.15; makeNoise(T.peckNoise); sfx("peck"); S.pecks++;
    pop(["TOK!", "PECK!", "TAK!"][S.pecks % 3], 640 + (Math.random() - 0.5) * 160, 290, 58, "#ffffff");
    if (S.pecks >= T.pecksNeeded) { S.phase = "walk"; S.open = 0; sfx("unlatch", 0.25); setTimeout(function () { sfx("latchDrop", 0.25); }, 520); makeNoise(0.1); pop("CLICK!", 640, 290, 100, "#ebb316"); }
  }
  function stepDown() { // a claw lands: louder the faster you go
    S.steps++;
    var k = S.pace * S.pace;
    S.still = 0; if (S.hold) S.burst = Math.max(S.burst, Math.min(1, S.pl + 0.04)); // a nudge only while you're pressing on          // each claw-fall nudges the meter up a little
    var tr = tier(), side = (S.stepN = (S.stepN || 0) + 1) % 2 ? -1 : 1;
    sfx("step", [0.15, 0.5, 1][tr], [0.85, 1.0, 1.3][tr]);                         // tiptoe soft / walk clear / run loud and quick
    if (tr === 1) pop("tap", 640 + side * 170, 630, 42, "#ebb316", 0.45);            // walking: a small yellow "tap"
    if (tr === 2) pop("STOMP!", 640 + side * 200, 610, 84, "#ebb316", 0.5);          // running: a big STOMP (red meter only)
    var hn = $("hud-noise"); hn.style.setProperty("--kick", [1.03, 1.1, 1.22][tier()]); hn.classList.remove("kick"); void hn.offsetWidth; hn.classList.add("kick"); // the meter jumps with each step
  }
  function parrotWakes() { // twice it opens its eyes (a feather each); the third time it screams. Chapter 2: the family stirs upstairs
    S.wakesLeft--; S.shake = 0.5;
    if (S.ch === 4) {
      S.mode = "react"; S.react = S.wakesLeft > 0 ? 1.6 : 1.8; S.freeze = 1.6; S.dog.st = "sleep"; S.dog.t = 2.5;
      if (S.wakesLeft > 0) { sfx("growl", 0.9); pop("−1", 105, 192, 72, "#f2287f"); } else sfx("woof");
      return;
    }
    if (S.ch === 3) {
      stopSnore(); S.beam.snore = 3; S.mode = "react"; S.react = S.wakesLeft > 0 ? 1.6 : 1.8; S.freeze = 1.6;
      if (S.wakesLeft > 0) { sfx("uncleWake", 0.9); pop("−1", 105, 192, 72, "#f2287f"); } else sfx("uncleShout");
      return;
    }
    if (S.ch === 2) {
      S.mode = "react"; S.react = S.wakesLeft > 0 ? 1.6 : 1.8; S.freeze = 1.6;
      if (S.wakesLeft > 0) { sfx("catWake", 0.8); pop("−1", 105, 192, 72, "#f2287f"); } else sfx("catHiss");
      return;
    }
    if (S.wakesLeft > 0) { S.mode = "react"; S.react = 1.6; S.freeze = 1.6; sfx("parrotWake", 0.75); pop("−1", 105, 192, 72, "#f2287f"); }
    else { S.mode = "react"; S.react = 1.8; sfx("scream"); setTimeout(function () { sfx("scream"); }, 450); } // two screeches
  }
  function afterReact() {
    if (S.wakesLeft <= 0) { showCaught("noise"); return; }
    S.wake = 0; S.red = 0; S.noise = 0; S.pl = 0; S.burst = 0; S.pace = 0; S.mode = "play"; // it dozes off again
    if (S.ch === 4) S.dog.smelled = false;
    if (S.ch === 3) { S.beam.grace = 1.4; S.beam.ph += Math.PI; S.beam.phz += 1; } // he drifts off again and his arm swings away

  }
  var VAC_W = 1.25; // a robot is 1.25 floor units wide on screen, and that is exactly how wide its bump zone is
  function updateVacs(dt) { // they keep driving whether you move or not; bump one and it roars
    var bumped = false;
    S.vac.forEach(function (v) {
      v.cd = Math.max(0, v.cd - dt);
      if (v.stun > 0) { v.stun -= dt; return; }
      v.x += v.v * dt; if (v.x > 2.2) { v.x = 2.2; v.v = -Math.abs(v.v); } if (v.x < -2.2) { v.x = -2.2; v.v = Math.abs(v.v); }
      if (bumped || v.cd > 0 || (v.z - S.cam.z) > hitDz() - 0.04 || (v.z - S.cam.z) < hitDz() - 0.45 || Math.abs(S.tx - v.x) > VAC_W / 2 + 0.12) return; // it bumps you only once its base has slid below the bottom edge, right under the turkey, and only where it visibly overlaps it
      v.cd = 3; v.stun = 1.5; v.hitAt = S.time; v.v = S.tx > v.x ? -Math.abs(v.v) : Math.abs(v.v);
      sfx("vroom"); pop("VRRRM!", 640, 420, 120, "#ebb316"); S.shake = 0.8; S.noise = 1; S.still = 0; S.wake = 1; bumped = true;
    });
    if (bumped) parrotWakes();
    hum();
    return bumped;
  }
  var humNode = null;
  function hum() { // a low motor hum that swells as the nearest vacuum gets close
    var a = ac(); if (!a || muted) return;
    if (!humNode) {
      var len = a.sampleRate * 2, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      var src = a.createBufferSource(); src.buffer = buf; src.loop = true;
      var lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
      var o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = 118; var og = a.createGain(); og.gain.value = 0.25;
      var gn = a.createGain(); gn.gain.value = 0; src.connect(lp); o.connect(og); og.connect(lp); lp.connect(gn); gn.connect(a.destination); src.start(); o.start();
      humNode = gn;
    }
    var near = 0;
    if (S.ch === 2 && (S.mode === "play" || S.mode === "react")) S.vac.forEach(function (v) { var dd = Math.hypot((v.x - S.tx) * 0.8, v.z - S.cam.z); near = Math.max(near, v.stun > 0 ? 1 : Math.max(0, 1 - dd / 2.6)); });
    humNode.gain.setTargetAtTime(0.11 * near, a.currentTime, 0.08);
  }
  function timeUp() { stopSnore(); S.mode = "react"; S.react = 1.4; sfx("rooster"); S.timeout = true; }

  function update(dt) {
    S.time += dt;
    S.shake = Math.max(0, S.shake - dt * 2); S.peckAnim = Math.max(0, S.peckAnim - dt); S.freeze = Math.max(0, S.freeze - dt);
    if (S.open >= 0) { S.open += dt * 1.1; if (S.open > 1) S.open = -1; }
    if (S.mode === "react") {
      if (S.ch === 3) updateBeam(dt);
      S.react -= dt; if (S.react < 1.0) S.noise = Math.max(0, S.noise - dt * 0.9); // the din settles while the sleeper reacts
      if (S.react <= 0) { S.react = 0; if (S.timeout) showCaught("time"); else afterReact(); }
      return;
    }
    if (S.mode === "exiting") { S.exitT += dt; S.cam.z = S.from.z + (SCENE.D - 0.6 - S.from.z) * (1 - Math.pow(1 - Math.min(1, S.exitT / 1.15), 2)); /* glide right up to the doorway, never past it */ if (S.exitT > 1.15) showClear(); return; }
    if (S.mode !== "play") { S.moving = false; return; }
    S.left -= dt; if (S.left <= 0) { S.left = 0; timeUp(); return; }
    S.peckCd = Math.max(0, S.peckCd - dt);
    // THE METER RULE: its level is your pace (tiptoe = quiet ... full speed = red), plus short bursts from pecks and steps
    var targ = S.phase === "walk" && (S.moving || S.pace > 0) ? Math.pow(S.pace, 1.6) : 0; // a wider quiet/walk band: only a real run reaches red
    S.pl += (targ - S.pl) * Math.min(1, dt * 8);
    S.burst = Math.max(0, S.burst - dt * (S.phase === "cage" ? 0.55 : S.hold ? 0.6 : 2.5)); // pecking noise lingers like footsteps; let go of ↑ and walking noise drops fast
    S.noise = Math.min(1, Math.max(S.pl, S.burst));
    if (S.phase === "walk") { // the turkey hops across to its lane; the camera follows only part of the way, a beat behind
      var steer = (S.steerL ? -1 : 0) + (S.steerR ? 1 : 0) || (S.time < (S.nudgeUntil || 0) ? S.nudgeDir : 0); // hold ←/→ to slide; a tap is a small nudge
      S.vx = (S.vx || 0) + (steer * T.steerSpeed - (S.vx || 0)) * Math.min(1, dt * (steer ? 7 : 9)); // eases in when you press, glides to a stop when you let go
      var mx = SCENE.lanes * SCENE.laneX + 0.2; S.tx += S.vx * dt; if (Math.abs(S.tx) > mx) { S.tx = Math.sign(S.tx) * mx; S.vx = 0; }
      S.lane = Math.round(S.tx / SCENE.laneX);
      S.cam.x += (S.tx - S.cam.x) * Math.min(1, dt * 5); // the camera stays right behind the turkey
    }
    // walking: pace builds while held, drops when you let go; a step finishes before you stop
    if (S.phase === "walk") {
      if ((S.hold || S.time - (S.tapAt || -9) < 0.32) && S.freeze <= 0) S.pace = Math.min(S.hold ? 1 : T.tapCap, Math.max(T.paceMin, S.pace + T.paceUp * dt)); // tapping tops out at a brisk walk; only holding ↑ breaks into a loud run
      else S.pace = Math.max(0, S.pace - T.paceDown * dt);
      if (S.pace > 0 || S.moving) {
        var pk = Math.max(S.pace, T.paceMin);
        if (!S.moving) { S.moving = true; S.ph = 0; S.side = -S.side; }
        var before = S.ph; S.ph += dt / mix(T.stride, pk);
        if (before < 0.5 && S.ph >= 0.5) stepDown();
        if (S.ph >= 1) { S.ph = 0; if (S.pace <= 0) S.moving = false; else S.side = -S.side; } // next stride: the other foot
        // the body moves after the foot plants
        if (S.ph > 0.25 || S.pace > 0.5) S.cam.z += tierSpeed() * dt;
        var hitWake = false;
        SCENE.clutter.forEach(function (c, i) { // stepped on something? it always wakes the parrot
          if (S.hit[i] || Math.abs(S.cam.z - (c.z - hitDz())) > 0.14 || Math.abs(S.tx - c.lane * SCENE.laneX) > CLUTTER[c.kind].w * 0.5 + 0.12) return; // you touch it if it's under the turkey; forgiving: only a real step onto it counts
          S.hit[i] = 1; S.hitAt[i] = S.time; S.hitDir[i] = c.lane * SCENE.laneX > S.tx + 0.01 ? 1 : c.lane * SCENE.laneX < S.tx - 0.01 ? -1 : (c.lane >= 0 ? 1 : -1); var sp = CLUTTER[c.kind]; S.shake = 0.6; sfx(sp.sfx); pop(sp.word, 640, 420, 96, "#ebb316"); S.wake = 1; S.noise = 1; S.still = 0; hitWake = true; // a crash is the loudest thing in the room
        });
        if (hitWake) { parrotWakes(); return; }
        if (S.cam.z >= (SCENE.length || T.length)) { S.mode = "exiting"; S.exitT = 0; S.from = { x: 0, z: S.cam.z }; return; }
      }
    }
    if (S.vac.length && updateVacs(dt)) return;
    if (S.ch === 3 && updateBeam(dt)) return;
    if (S.ch === 4 && updateDog(dt)) return;
    // red for redFor seconds in a row wakes it; dropping out of the red lets it settle again
    if (S.noise >= T.tooLoud) S.red += dt; else S.red = Math.max(0, S.red - dt * 0.8); // it cools down slowly, so back-to-back runs add up
    S.wake = S.red / T.redFor;                                  // drives the shiver/twitch warning
    if (S.red >= T.redFor) { S.wake = 1; parrotWakes(); }
  }

  // ------------------------------------------------------------ input
  var KEYS = { ArrowUp: 1, KeyW: 1 };
  window.addEventListener("keydown", function (e) {
    if (KEYS[e.code] || e.code === "Space" || /^Arrow/.test(e.code)) e.preventDefault();
    if (e.repeat) return; ac();
    if (e.code === "KeyM") { toggleMute(); return; }
    if (e.code === "KeyF") { toggleFull(); return; }
    if (e.code === "KeyP" || e.code === "Escape") { if (S.mode === "play") pause(); else if (S.mode === "paused") resume(); return; }
    if (e.code === "Enter" && primary && S.mode !== "play") { primary(); return; }
    if (S.mode === "title" && /^Digit[1-4]$/.test(e.code)) { showChapter(+e.code.slice(5)); return; } // on the title screen, 1–4 jump straight to a chapter
    if (S.mode === "title" && e.code === "Digit0") { showEnding(); return; } // 0 previews the ending
    if (S.mode === "title" && e.code === "KeyT") { try { if (TOUCH_TEST) sessionStorage.removeItem("te-touch"); else sessionStorage.setItem("te-touch", "1"); } catch (x) { } location.reload(); return; } // T switches the phone preview on or off
    if (KEYS[e.code]) { walkDown(); return; }
    var dl = (e.code === "ArrowLeft" || e.code === "KeyA") ? -1 : (e.code === "ArrowRight" || e.code === "KeyD") ? 1 : 0;
    if (dl) steerDown(dl);
  });
  window.addEventListener("keyup", function (e) { if (!S) return; if (KEYS[e.code]) walkUp();
    if (e.code === "ArrowLeft" || e.code === "KeyA") steerUp(-1); if (e.code === "ArrowRight" || e.code === "KeyD") steerUp(1); });
  // the same actions for keys and the touch buttons
  function walkDown() { // ↑ / WALK: in the cage it pecks; out of it, a tap tiptoes and holding runs
    if (!S || S.mode !== "play") return;
    if (S.phase === "cage") { peck(); return; }
    S.hold = true; if (S.phase === "walk" && S.freeze <= 0) S.pace = Math.min(Math.max(S.pace, T.tapCap), Math.max(T.paceMin, S.pace) + T.tapBoost); S.tapAt = S.time; // each tap pushes the pace up too
  }
  function walkUp() { if (S) S.hold = false; }
  function steerDown(dl) { if (!S || S.mode !== "play" || S.phase !== "walk") return; if (dl < 0) S.steerL = true; else S.steerR = true; S.nudgeDir = dl; S.nudgeUntil = S.time + T.nudge; makeNoise(T.laneNoise); sfx("step", 0.3); }
  function steerUp(dl) { if (!S) return; if (dl < 0) S.steerL = false; else S.steerR = false; }
  // touch / mouse: tap to peck in the cage, press and hold to walk
  view.addEventListener("pointerdown", function (e) { ac(); if (TOUCH || e.pointerType === "touch") return; if (S.mode !== "play") return; if (S.phase === "cage") peck(); else S.hold = true; }); // mouse: click to peck, hold to walk
  window.addEventListener("pointerup", function (e) { if (S && !TOUCH && e.pointerType !== "touch") S.hold = false; });
  window.addEventListener("pointercancel", function (e) { if (S && !TOUCH && e.pointerType !== "touch") S.hold = false; });

  // ------------------------------------------------------------ phones and tablets: two-thumb buttons, landscape only
  function padBtn(cls, inner, down, up) {
    var b = el("div", "tpad " + cls); b.innerHTML = inner; var ids = {};
    function on(e) { e.preventDefault(); ac(); ids[e.pointerId] = 1; try { b.setPointerCapture(e.pointerId); } catch (x) { } b.classList.add("on"); down(); }
    function off(e) { if (!ids[e.pointerId]) return; delete ids[e.pointerId]; if (!Object.keys(ids).length) { b.classList.remove("on"); up(); } }
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
    b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    return b;
  }
  var ARW = function (rot) { return '<svg viewBox="0 0 32 32" style="transform:rotate(' + rot + 'deg)"><path d="M16 26 V7 M8.5 14 L16 6.5 L23.5 14" fill="none" stroke="#0d0a10" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
  (function () { // pause button, top right beside sound, during play (phones and computers alike)
    var pz = el("button", "tsmall pause-btn"); pz.setAttribute("aria-label", "Pause");
    pz.innerHTML = '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="#0d0a10"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="#0d0a10"/></svg>';
    pz.addEventListener("click", function () { ac(); if (S.mode === "play") pause(); });
    $("hud").appendChild(pz);
  })();
  if (TOUCH) {
    document.body.classList.add("touch");
    var tc = el("div", null); tc.id = "touch";
    tc.appendChild(padBtn("left", ARW(-90), function () { steerDown(-1); }, function () { steerUp(-1); }));
    tc.appendChild(padBtn("right", ARW(90), function () { steerDown(1); }, function () { steerUp(1); }));
    tc.appendChild(padBtn("walk", ARW(0) + "<b>WALK</b>", walkDown, walkUp));
    $("hud").appendChild(tc);
    var rot = el("div", null); rot.id = "rotate"; // upright phone: like the title screen — the room behind, big pink-block words, and a phone that turns itself sideways
    var dev = el("div", "rot-device", [el("i", "rot-cam"), el("i", "rot-bar")]);
    var words; try { words = el("div", "col rot-words", [TE.Lettering({ text: "TURN YOUR", size: 96, bounce: 0.08 }), TE.Lettering({ text: "PHONE", size: 96, bounce: 0.08, seed: 3 })]); } catch (e) { words = el("b", null, ["TURN YOUR PHONE"]); }
    rot.appendChild(el("div", "rot-box", [words, el("div", "rot-stage", [dev])])); setTimeout(fit, 0);
    document.body.appendChild(rot);
  }
  function portrait() { return window.innerHeight > window.innerWidth; }
  function goFull() { // tap PLAY / START on a phone: fill the screen and stay landscape where the browser allows it
    if (!TOUCH) return; var d = document.documentElement;
    try { if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen({ navigationUI: "hide" }).then(function () { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(function () { }); }).catch(function () { }); } catch (e) { }
  }
  window.addEventListener("blur", pause);
  $("mute").addEventListener("click", function () { ac(); toggleMute(); });

  var RES = 1; // the canvas is drawn at the real screen resolution (window size x retina), not stretched up from 1280x720
  function fit() { var vw = window.innerWidth, vh = window.innerHeight, s = Math.min(vw / W, vh / H); $("stage").style.transform = "scale(" + s + ")";
    var k = Math.max(1, Math.min(TOUCH ? 2 : 2.5, s * (window.devicePixelRatio || 1))); k = Math.round(k * 4) / 4;
    if (k !== RES) { RES = k; view.width = Math.round(W * k); view.height = Math.round(H * k); view.style.width = W + "px"; view.style.height = H + "px"; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; }
    var rb = document.querySelector("#rotate .rot-box"); if (rb && rb.offsetWidth) rb.style.transform = "scale(" + Math.min((vw - 40) / rb.offsetWidth, (vh - 160) / rb.offsetHeight) + ")";
    if (TOUCH && portrait() && S && S.mode === "play") pause(); } // turning the phone upright pauses the game
  window.addEventListener("resize", fit); window.addEventListener("orientationchange", function () { setTimeout(fit, 250); }); fit();

  // the bars around the 16:9 game: a tiny, blurred copy of the current picture, so the room seems to carry on
  var fillCv = $("fill"), fillG = fillCv && fillCv.getContext("2d"), fillAt = 0;
  function paintFill(t) { if (!fillG || t - fillAt < 120) return; fillAt = t; try { var sc = $("screen"), img2 = view; fillG.drawImage(img2, 0, 0, 64, 36); } catch (e) { } }
  // full screen: the corner button or F
  function toggleFull() { var d = document.documentElement; try { if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen({ navigationUI: "hide" }); } catch (e) { } }
  document.addEventListener("fullscreenchange", function () { setTimeout(fit, 50); });
  var last = 0;
  function frame(t) { paintFill(t); g.setTransform(RES, 0, 0, RES, 0, 0); var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; if (S) S.dtLast = dt; update(dt); if (humNode) hum(); setHUD(false); render(dt); requestAnimationFrame(frame); }
  S = fresh();
  window.__te = { go: function (n) { showChapter(n); }, get S() { return S; }, T: T, get SCENE() { return SCENE; }, floorPt: function (x, z) { return floorPt(x, z); }, hd: function () { return hitDz(); }, pop: function (a, b, c, d, e) { pop(a, b, c, d, e); }, caught: function () { showCaught(); }, clear: function () { showClear(); }, pause: function () { showPause(); } };
  loadAudio();
  Promise.all([loadImages(), document.fonts ? Promise.all(["40px 'Turkey Bubble'", "40px 'Fredoka'", "600 40px 'Fredoka'", "40px 'Lilita One'"].map(function (f) { return document.fonts.load(f, "AZ09:/!?−").catch(function () { }); })) : null]).then(function () {
    var jump = parseInt(new URLSearchParams(location.search).get("ch") || (location.hash.match(/ch(\d)/) || [])[1], 10); // ?ch=3 or #ch3 opens a chapter directly (for testing)
    if (location.hash === "#end") showEnding(); else if (CHAPTERS[jump]) showChapter(jump); else showTitle(); setHUD(true); requestAnimationFrame(frame); // #end opens the ending (testing)
  });
})();
