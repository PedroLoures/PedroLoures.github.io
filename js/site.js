/* ==========================================================================
   pedroloures.com · site behaviour
   1. Background: an animated low-poly field in the current palette. It drifts,
      leans away from the cursor, lights up around it and ripples on events.
   2. Projects: a card's image grows to fill the screen while the triangle field
      breaks open around it and a panel rises with the write-up; closing shrinks
      it back into the card; ←/→ (or swipe) switch projects in place. Each
      project also has its own page (/projects/<slug>/) for sharing and search.
   3. Small things: gallery lightbox, copy-email, palette dice, toasts.
   Respects prefers-reduced-motion everywhere.
   ========================================================================== */
(function () {
    'use strict';

    var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var FINE_POINTER = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

    /* ======================================================================
       1. Background field
       ====================================================================== */
    var Field = (function () {
        var canvas = $('#bg');
        if (!canvas || !canvas.getContext) {
            return { ripple: function () {}, sweep: function () {}, frame: function () {}, unframe: function () {}, el: null };
        }
        var ctx = canvas.getContext('2d');
        var W = 0, H = 0, dpr = 1, cell = 90, cols = 0, rows = 0;
        var pts = [], tris = [], noise = [];
        var ramp = toRgb((window.PORTFOLIO_THEME || {}).ramp || ['#0b2b33', '#0f5f63', '#0f8f7e', '#7fd6c6', '#f2b880']);
        var fromRamp = null, rampT0 = 0;
        var mouse = { x: 0.5, y: 0.35, tx: 0.5, ty: 0.35, px: -9999, py: -9999 };
        var effects = [];           // ripples and sweeps
        // While a project is open the field is moved in front of the project image and a
        // window is cleared in it (like the original site): triangles near the window's
        // edge shrink into shards, the ones inside disappear.
        var hole = null;            // { from, to, t0, dur } ellipses: { x, y, rx, ry }
        var home = canvas.parentNode, homeNext = canvas.nextSibling;
        var running = false, last = 0, lastInput = 0;
        // Full frame rate only while something is happening (mouse moving, an effect, a
        // window opening); the slow idle drift runs at 30 fps to save battery.
        var IDLE_GAP = 1000 / 30, ACTIVE_GAP = FINE_POINTER ? 0 : 1000 / 30;

        function toRgb(list) {
            return list.map(function (h) {
                return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
            });
        }
        function seeded(n) {               // stable per-triangle noise
            var x = Math.sin(n * 127.1) * 43758.5453;
            return (x - Math.floor(x) - 0.5) * 0.07;
        }

        function build() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = window.innerWidth;
            H = window.innerHeight;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            cell = Math.max(64, Math.min(120, W / (W < 700 ? 6 : 15)));
            cols = Math.ceil(W / cell) + 3;
            rows = Math.ceil(H / cell) + 4;
            pts = [];
            var s = 1;
            var rnd = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
            for (var y = 0; y < rows; y++) {
                for (var x = 0; x < cols; x++) {
                    var edge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
                    pts.push({
                        bx: (x - 1) * cell + (edge ? 0 : (rnd() - 0.5) * cell * 0.75),
                        by: (y - 1) * cell + (edge ? 0 : (rnd() - 0.5) * cell * 0.75),
                        ph: rnd() * 6.283,
                        amp: edge ? 0 : cell * 0.12
                    });
                }
            }
            tris = [];
            for (var r = 0; r < rows - 1; r++) {
                for (var c = 0; c < cols - 1; c++) {
                    var i = r * cols + c, j = i + 1, k = i + cols, l = k + 1;
                    if ((r + c) % 2) { tris.push([i, j, k], [j, l, k]); } else { tris.push([i, j, l], [i, l, k]); }
                }
            }
            noise = tris.map(function (t, q) { return seeded(q); });
            if (hole) { hole.to = windowShape(); hole.from = hole.to; }   // resized or rotated while open
            draw(performance.now());
        }

        function rampColor(v, t) {
            v = Math.max(0, Math.min(0.9999, v));
            var n = ramp.length - 1, i = Math.floor(v * n), f = v * n - i;
            var a = ramp[i], b = ramp[i + 1];
            var out = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
            if (fromRamp) {                // cross-fade after a palette change
                var k = Math.min(1, (t - rampT0) / 700);
                var oa = fromRamp[i], ob = fromRamp[i + 1];
                var old = [oa[0] + (ob[0] - oa[0]) * f, oa[1] + (ob[1] - oa[1]) * f, oa[2] + (ob[2] - oa[2]) * f];
                out = [old[0] + (out[0] - old[0]) * k, old[1] + (out[1] - old[1]) * k, old[2] + (out[2] - old[2]) * k];
            }
            return 'rgb(' + (out[0] | 0) + ',' + (out[1] | 0) + ',' + (out[2] | 0) + ')';
        }

        function draw(t) {
            var still = REDUCED;
            mouse.x += (mouse.tx - mouse.x) * 0.06;
            mouse.y += (mouse.ty - mouse.y) * 0.06;
            var shiftX = still ? 0 : (mouse.x - 0.5) * -18;
            var shiftY = (still ? 0 : (mouse.y - 0.5) * -12) - Math.min(window.scrollY * 0.03, cell * 1.4);
            var time = still ? 0 : t;

            // Expire effects
            effects = effects.filter(function (e) { return t - e.t0 < e.life; });
            if (fromRamp && t - rampT0 > 700) { fromRamp = null; }

            ctx.clearRect(0, 0, W, H);
            var win = holeAt(t);

            var P = new Array(pts.length);
            for (var n = 0; n < pts.length; n++) {
                var p = pts[n];
                P[n] = [
                    p.bx + Math.sin(time * 0.00035 + p.ph) * p.amp + shiftX,
                    p.by + Math.cos(time * 0.0003 + p.ph) * p.amp + shiftY
                ];
            }

            for (var q = 0; q < tris.length; q++) {
                var tr = tris[q], A = P[tr[0]], B = P[tr[1]], C = P[tr[2]];
                var cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3;
                var v = 0.08 + 0.74 * (cx / W * 0.55 + (1 - cy / H) * 0.45) + noise[q];

                if (FINE_POINTER && !still) {              // glow around the cursor
                    var dx = cx - mouse.px, dy = cy - mouse.py, d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 230) { v += 0.2 * (1 - d / 230); }
                }
                for (var e = 0; e < effects.length; e++) {
                    var fx = effects[e], age = (t - fx.t0) / fx.life, fade = 1 - age, dist;
                    if (fx.type === 'ripple') {
                        dist = Math.abs(Math.sqrt((cx - fx.x) * (cx - fx.x) + (cy - fx.y) * (cy - fx.y)) - age * fx.reach);
                        if (dist < 120) { v += 0.26 * fade * (1 - dist / 120); }
                    } else {                                // sweep across the screen
                        var front = fx.dir > 0 ? -150 + age * (W + 300) : W + 150 - age * (W + 300);
                        dist = Math.abs(cx - front);
                        if (dist < 170) { v += 0.3 * (1 - dist / 170); }
                    }
                }
                var k = 1;                                  // shard scale
                if (win) {
                    var ex = (cx - win.x) / win.rx, ey = (cy - win.y) / win.ry;
                    var ed = Math.sqrt(ex * ex + ey * ey);
                    if (ed < 1) { continue; }
                    if (ed < 1.3) { k = (ed - 1) / 0.3; v += 0.12 * (1 - k); }
                }
                ctx.fillStyle = rampColor(v, t);
                ctx.beginPath();
                if (k < 1) {
                    ctx.moveTo(cx + (A[0] - cx) * k, cy + (A[1] - cy) * k);
                    ctx.lineTo(cx + (B[0] - cx) * k, cy + (B[1] - cy) * k);
                    ctx.lineTo(cx + (C[0] - cx) * k, cy + (C[1] - cy) * k);
                } else {
                    ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]);
                }
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = ctx.fillStyle;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // The window the open project shows through: wide over the top of the screen,
        // leaving a frame of triangles around the edges and corners.
        function windowShape() {
            var portrait = H > W;
            return {
                x: W / 2,
                y: H * (portrait ? 0.28 : 0.33),
                rx: W * (portrait ? 0.6 : 0.39),
                ry: H * (portrait ? 0.34 : 0.5)
            };
        }
        function holeAt(t) {
            if (!hole) { return null; }
            var a = hole.dur > 0 ? Math.max(0, Math.min(1, (t - hole.t0) / hole.dur)) : 1;
            var e = a < 0.5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2;   // ease in-out
            var f = hole.from, g = hole.to;
            return { x: f.x + (g.x - f.x) * e, y: f.y + (g.y - f.y) * e, rx: f.rx + (g.rx - f.rx) * e, ry: f.ry + (g.ry - f.ry) * e, done: a >= 1 };
        }

        function loop(t) {
            running = false;
            if (document.hidden) { return; }
            var opening = !!hole && (t - hole.t0) < hole.dur;
            var lively = opening || effects.length > 0 || !!fromRamp || t - lastInput < 1500;
            if (t - last >= (lively ? ACTIVE_GAP : IDLE_GAP)) { draw(t); last = t; }
            if (!REDUCED || lively) { start(); }
        }
        function start() {
            if (!running) { running = true; requestAnimationFrame(loop); }
        }

        var resizeTimer, lastW = 0;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                if (window.innerWidth !== lastW || Math.abs(window.innerHeight - H) > 120) {
                    lastW = window.innerWidth;
                    build();
                    start();
                }
            }, 180);
        });
        window.addEventListener('mousemove', function (e) {
            mouse.tx = e.clientX / W;
            mouse.ty = e.clientY / H;
            mouse.px = e.clientX;
            mouse.py = e.clientY;
            lastInput = performance.now();
            start();
        }, { passive: true });
        document.addEventListener('mouseleave', function () { mouse.px = mouse.py = -9999; });
        window.addEventListener('scroll', function () { lastInput = performance.now(); start(); }, { passive: true });
        document.addEventListener('visibilitychange', function () { if (!document.hidden) { start(); } });
        document.addEventListener('palettechange', function (e) {
            fromRamp = REDUCED ? null : ramp;
            rampT0 = performance.now();
            ramp = toRgb(e.detail.ramp);
            if (REDUCED) { draw(performance.now()); } else { start(); }
        });

        lastW = window.innerWidth;
        build();
        start();

        return {
            ripple: function (x, y) {
                if (REDUCED) { return; }
                effects.push({ type: 'ripple', x: x, y: y, t0: performance.now(), life: 900, reach: Math.max(W, H) * 1.1 });
                start();
            },
            sweep: function (dir) {
                if (REDUCED) { return; }
                effects.push({ type: 'sweep', dir: dir, t0: performance.now(), life: 650 });
                start();
            },
            el: canvas,
            // Move the field in front of the project image (inside `parent`, before `before`)
            // and open a window in it, growing from `fromRect` (the clicked card) if given.
            frame: function (parent, before, fromRect) {
                var target = windowShape();
                var start0 = fromRect
                    ? { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2, rx: fromRect.width * 0.55, ry: fromRect.height * 0.6 }
                    : { x: target.x, y: target.y, rx: target.rx * 0.2, ry: target.ry * 0.2 };
                parent.insertBefore(canvas, before || null);
                canvas.classList.add('bg--framing');
                hole = { from: start0, to: target, t0: performance.now(), dur: REDUCED ? 0 : 680 };
                if (!REDUCED && canvas.animate) {
                    canvas.animate([{ opacity: fromRect ? 0.2 : 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
                }
                draw(performance.now());
                start();
            },
            // Put the field back behind the page.
            unframe: function () {
                hole = null;
                canvas.classList.remove('bg--framing');
                home.insertBefore(canvas, homeNext && homeNext.parentNode === home ? homeNext : home.firstChild);
                draw(performance.now());
                start();
            }
        };
    })();

    // Paragraphs that hold only images become a gallery grid, and each image becomes a
    // keyboard-reachable button that opens the lightbox.
    function tagGalleries(root) {
        $$('p', root).forEach(function (p) {
            var nodes = Array.prototype.filter.call(p.childNodes, function (n) {
                return !(n.nodeType === 3 && !n.textContent.trim());
            });
            var onlyImages = nodes.length && nodes.every(function (n) {
                return n.nodeName === 'IMG' || (n.nodeName === 'A' && n.querySelector('img') && !n.getAttribute('href'));
            });
            if (!onlyImages) { return; }
            p.classList.add('gallery');
            $$('img', p).forEach(function (img) {
                img.tabIndex = 0;
                img.setAttribute('role', 'button');
                img.setAttribute('aria-label', 'View image full size' + (img.alt ? ': ' + img.alt : ''));
            });
        });
    }

    /* ======================================================================
       2. Project viewer
       Layout (like the original site): the project image fills the whole
       screen and a white panel scrolls up over it.
       Open: the card image grows from the card to full screen, then the
       panel rises. Close: the reverse, back into the card. ←/→ cross-fade
       the background and slide the panel.
       ====================================================================== */
    var viewer = $('#viewer');
    var cards = $$('.pcard');
    var order = cards.map(function (c) { return c.getAttribute('data-slug'); });

    if (viewer && cards.length) {
        var scroller = $('[data-scroll]', viewer);
        var panel = $('.viewer__panel', viewer);
        var stage = $('.viewer__bg', viewer);
        var bgImg = $('[data-hero]', viewer);
        var shade = $('.viewer__shade', viewer);
        var content = $('[data-content]', viewer);
        var nav = $('.viewer__nav', viewer);
        var current = null, pushedOpen = false, busyAnim = null, lastFocus = null;

        var EASE = 'cubic-bezier(.2,.8,.2,1)';
        var EASE_INOUT = 'cubic-bezier(.7,0,.2,1)';
        var hasWAAPI = !!panel.animate;

        var cardFor = function (slug) { return cards[order.indexOf(slug)] || null; };
        var templateFor = function (slug) { return document.getElementById('project-' + slug); };
        var hashSlug = function () {
            var h;
            try { h = decodeURIComponent(location.hash.slice(1)); } catch (err) { return null; }
            return h && templateFor(h) ? h : null;
        };
        var inView = function (el) {
            var r = el.getBoundingClientRect();
            return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
        };
        var screenRect = function () { return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }; };

        var behind = $$('body > .topbar, body > .page');
        function lockPage(on) {
            // Keyboard and screen-reader users stay inside the open project.
            behind.forEach(function (el) {
                if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
                else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
            });
            if (on) {
                var gap = window.innerWidth - document.documentElement.clientWidth;
                document.body.style.paddingRight = gap > 0 ? gap + 'px' : '';
                document.body.classList.add('is-locked');
            } else {
                document.body.classList.remove('is-locked');
                document.body.style.paddingRight = '';
            }
        }

        function fill(slug, keepBg) {
            var tpl = templateFor(slug);
            content.innerHTML = '';
            content.appendChild(tpl.content.cloneNode(true));
            if (!keepBg) { bgImg.src = tpl.getAttribute('data-image'); }
            var title = $('.proj__title', content);
            if (title) { title.id = 'viewer-title'; }
            tagGalleries(content);
            scroller.scrollTop = 0;
            parallax();
            updateNav(slug);
        }

        function updateNav(slug) {
            var i = order.indexOf(slug), n = order.length;
            var titleOf = function (k) { return templateFor(order[(k + n) % n]).getAttribute('data-title'); };
            $('[data-count]', nav).textContent = (i + 1) + ' / ' + n;
            $('[data-prev-title]', nav).textContent = titleOf(i - 1);
            $('[data-next-title]', nav).textContent = titleOf(i + 1);
            nav.style.display = n > 1 ? '' : 'none';
        }

        // The background image drifts up slowly and darkens as the panel scrolls over it.
        function parallax() {
            var y = scroller.scrollTop, h = window.innerHeight;
            if (!REDUCED) { bgImg.style.transform = 'translate3d(0,' + (-y * 0.12).toFixed(1) + 'px,0) scale(1.04)'; }
            shade.style.opacity = Math.min(1, 0.35 + y / (h * 0.9)).toFixed(3);
        }
        scroller.addEventListener('scroll', parallax, { passive: true });

        function makeFlyer(src, rect, radius) {
            var f = document.createElement('div');
            f.className = 'flyer';
            f.innerHTML = '<img alt="">';
            f.firstChild.src = src;
            f.style.left = rect.left + 'px';
            f.style.top = rect.top + 'px';
            f.style.width = rect.width + 'px';
            f.style.height = rect.height + 'px';
            f.style.borderRadius = radius;
            // Above the project image, below the triangle frame (when it's in the viewer) and the panel.
            viewer.insertBefore(f, Field.el && Field.el.parentNode === viewer ? Field.el : shade);
            return f;
        }
        var rectFrame = function (r, radius) {
            return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: radius };
        };
        function finishRunning() {
            if (busyAnim) { var f = busyAnim; busyAnim = null; f(); }
        }
        function focusPanel() {
            var btn = $('.viewer__close', viewer);
            if (btn && btn.focus) { btn.focus({ preventScroll: true }); }
        }

        /* ---- open ---- */
        function open(slug, fromCard) {
            finishRunning();
            current = slug;
            lastFocus = fromCard || document.activeElement;
            fill(slug);
            viewer.hidden = false;
            lockPage(true);
            focusPanel();

            var thumb = fromCard && $('.pcard__thumb', fromCard);
            var thumbRect = thumb && inView(thumb) ? thumb.getBoundingClientRect() : null;
            // The triangle field moves in front of the project image and clears a window
            // around it, growing out from the card (like the original site).
            Field.frame(viewer, shade, thumbRect);
            if (thumbRect) { Field.ripple(thumbRect.left + thumbRect.width / 2, thumbRect.top + thumbRect.height / 2); }

            if (REDUCED || !hasWAAPI) { return; }

            var anims = [];
            var panelIn = panel.animate([{ opacity: 0, transform: 'translateY(90px)' }, { opacity: 1, transform: 'none' }],
                { duration: 560, delay: thumb && inView(thumb) ? 300 : 80, easing: EASE, fill: 'backwards' });
            var navIn = nav.animate([{ opacity: 0, transform: 'translate(-50%, 30px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }],
                { duration: 400, delay: 420, easing: EASE, fill: 'backwards' });
            anims.push(panelIn, navIn);

            if (thumb && inView(thumb)) {
                // The card's image grows from the card to fill the screen.
                var flyer = makeFlyer($('img', thumb).currentSrc || $('img', thumb).src, thumb.getBoundingClientRect(), '14px');
                stage.style.opacity = '0';
                fromCard.classList.add('is-source');
                var grow = flyer.animate([rectFrame(thumb.getBoundingClientRect(), '14px'), rectFrame(screenRect(), '0px')],
                    { duration: 620, easing: EASE_INOUT, fill: 'forwards' });
                anims.push(grow);
                var done = function () {
                    stage.style.opacity = '';
                    fromCard.classList.remove('is-source');
                    if (flyer.parentNode) { flyer.parentNode.removeChild(flyer); }
                };
                busyAnim = function () { anims.forEach(function (a) { a.finish(); }); done(); };
                grow.finished.then(function () { if (busyAnim) { busyAnim = null; done(); } }).catch(function () {});
            } else {
                anims.push(stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: 'ease-out' }));
                busyAnim = function () { anims.forEach(function (a) { a.finish(); }); };
                panelIn.finished.then(function () { busyAnim = null; }).catch(function () {});
            }
        }

        /* ---- close ---- */
        function close() {
            if (!current) { return; }
            finishRunning();
            var slug = current;
            current = null;
            var card = cardFor(slug);
            var thumb = card && $('.pcard__thumb', card);

            var end = function () {
                viewer.hidden = true;
                content.innerHTML = '';          // stops any playing video
                stage.style.opacity = '';
                lockPage(false);
                if (Field.el && Field.el.parentNode === viewer) { Field.unframe(); }
                if (card) { card.classList.remove('is-source'); }
                var target = card || lastFocus;
                if (target && target.focus) { target.focus({ preventScroll: true }); }
            };
            if (REDUCED || !hasWAAPI) { end(); return; }

            // The field goes back behind the page right away; the image then shrinks over the page.
            Field.unframe();
            var anims = [
                panel.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(70px)' }], { duration: 240, easing: 'ease-in', fill: 'forwards' }),
                nav.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' })
            ];

            if (thumb) {
                // Bring the card on screen if needed, then shrink the background back into it.
                if (!inView(thumb)) {
                    var html = document.documentElement, prev = html.style.scrollBehavior;
                    html.style.scrollBehavior = 'auto';
                    lockPage(false);
                    card.scrollIntoView({ block: 'center' });
                    lockPage(true);
                    html.style.scrollBehavior = prev;
                }
                var to = thumb.getBoundingClientRect();
                var flyer = makeFlyer(bgImg.currentSrc || bgImg.src, screenRect(), '0px');
                card.classList.add('is-source');
                anims.push(stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }));
                anims.push(shade.animate([{ opacity: getComputedStyle(shade).opacity }, { opacity: 0 }], { duration: 200, fill: 'forwards' }));
                var shrink = flyer.animate([rectFrame(screenRect(), '0px'), rectFrame(to, '14px')], { duration: 460, delay: 120, easing: EASE_INOUT, fill: 'forwards' });
                anims.push(shrink);
                var finish = function () {
                    anims.forEach(function (a) { a.cancel(); });
                    if (flyer.parentNode) { flyer.parentNode.removeChild(flyer); }
                    end();
                    Field.ripple(to.left + to.width / 2, to.top + to.height / 2);
                };
                busyAnim = finish;
                shrink.finished.then(function () { if (busyAnim === finish) { busyAnim = null; finish(); } }).catch(function () {});
            } else {
                var fade = stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' });
                anims.push(fade);
                var finish2 = function () { anims.forEach(function (a) { a.cancel(); }); end(); };
                busyAnim = finish2;
                fade.finished.then(function () { if (busyAnim === finish2) { busyAnim = null; finish2(); } }).catch(function () {});
            }
        }

        /* ---- switch in place (←/→) ---- */
        function go(step) {
            if (!current) { return; }
            finishRunning();
            var n = order.length;
            var next = order[(order.indexOf(current) + step + n) % n];
            current = next;
            history.replaceState(null, '', '#' + next);
            Field.sweep(step);
            if (REDUCED || !hasWAAPI) { fill(next); return; }

            // Cross-fade the full-screen background to the next project's image.
            var src = templateFor(next).getAttribute('data-image');
            var layer = document.createElement('img');
            layer.className = 'viewer__bg-next';
            layer.alt = '';
            layer.src = src;
            stage.appendChild(layer);
            var bgFade = layer.animate([{ opacity: 0, transform: 'scale(1.08)' }, { opacity: 1, transform: 'scale(1.04)' }], { duration: 420, easing: EASE, fill: 'forwards' });
            var outA = panel.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (-50 * step) + 'px)' }], { duration: 140, easing: 'ease-in', fill: 'forwards' });

            var swapped = false, inA = null;
            var swapPanel = function () {
                if (swapped) { return; }
                swapped = true;
                fill(next, true);
                outA.cancel();
                inA = panel.animate([{ opacity: 0, transform: 'translateX(' + (60 * step) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EASE });
            };
            var settle = function () {
                swapPanel();
                bgImg.src = src;
                if (layer.parentNode) { layer.parentNode.removeChild(layer); }
                bgFade.cancel();
            };
            busyAnim = function () { settle(); if (inA) { inA.finish(); } };
            outA.finished.then(swapPanel).catch(function () {});
            bgFade.finished.then(function () {
                if (layer.parentNode) { settle(); busyAnim = null; }
            }).catch(function () {});
        }

        /* ---- routing ---- */
        function requestClose() {
            if (!current) { return; }
            if (pushedOpen) {
                pushedOpen = false;
                history.back();               // hashchange handler runs close()
            } else {
                history.replaceState(null, '', location.pathname + location.search);
                close();
            }
        }

        cards.forEach(function (card) {
            card.addEventListener('click', function (e) {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) { return; }
                e.preventDefault();
                var slug = card.getAttribute('data-slug');
                history.pushState(null, '', '#' + slug);
                pushedOpen = true;
                open(slug, card);
            });
        });

        window.addEventListener('hashchange', function () {
            var slug = hashSlug();
            if (slug && slug !== current) {
                if (current) { current = slug; fill(slug); Field.sweep(1); }
                else { pushedOpen = true; open(slug, cardFor(slug)); }
            } else if (!slug && current) {
                pushedOpen = false;
                close();
            }
        });

        $$('[data-close]', viewer).forEach(function (el) { el.addEventListener('click', requestClose); });
        // Clicking the bare background above the panel also closes.
        scroller.addEventListener('click', function (e) { if (e.target === scroller) { requestClose(); } });
        $('[data-prev]', nav).addEventListener('click', function () { go(-1); });
        $('[data-next]', nav).addEventListener('click', function () { go(1); });

        document.addEventListener('keydown', function (e) {
            if (!current || e.altKey || e.ctrlKey || e.metaKey) { return; }
            if (!$('#lightbox').hidden) { return; }
            if (e.key === 'Escape') { e.preventDefault(); requestClose(); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
            else if (e.key === 'Tab' && !viewer.contains(document.activeElement)) { e.preventDefault(); focusPanel(); }
        });

        // Swipe left/right (phones) to move between projects; ignored inside code blocks.
        var touchX = null, touchY = null;
        scroller.addEventListener('touchstart', function (e) {
            if (e.target.closest && e.target.closest('pre, .proj__video')) { touchX = null; return; }
            touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
        }, { passive: true });
        scroller.addEventListener('touchend', function (e) {
            if (touchX === null) { return; }
            var dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
            touchX = null;
            if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) { go(dx < 0 ? 1 : -1); }
        });

        // Opened from a shared link (#project): show it right away.
        var initial = hashSlug();
        if (initial) { pushedOpen = false; open(initial, null); }
    }

    /* ======================================================================
       3. Small things
       ====================================================================== */
    var toast = $('#toast'), toastTimer;
    function say(msg) {
        if (!toast) { return; }
        toast.textContent = msg;
        toast.classList.add('is-on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 1800);
    }

    $$('[data-copy-email]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var email = btn.getAttribute('data-copy-email');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(email).then(function () { say('Email copied: ' + email); },
                    function () { window.location.href = 'mailto:' + email; });
            } else {
                window.location.href = 'mailto:' + email;
            }
        });
    });

    $$('[data-reroll]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (window.rerollPalette) { say('Palette: ' + window.rerollPalette()); }
        });
    });

    // Gallery images open full-size; Esc, a click or the ✕ closes and focus goes back.
    var lightbox = $('#lightbox');
    if (lightbox) {
        var lbImg = $('img', lightbox), lbClose = $('.lightbox__close', lightbox), lbOpener = null;
        var closeLb = function () {
            if (lightbox.hidden) { return; }
            lightbox.hidden = true;
            lbImg.removeAttribute('src');
            if (lbOpener && lbOpener.focus) { lbOpener.focus({ preventScroll: true }); }
        };
        document.addEventListener('click', function (e) {
            var img = e.target.closest && e.target.closest('.gallery img');
            if (!img) { return; }
            e.preventDefault();
            lbOpener = img;
            lbImg.src = img.currentSrc || img.src;
            lbImg.alt = img.alt || '';
            lightbox.hidden = false;
            lbClose.focus({ preventScroll: true });
            if (!REDUCED && lbImg.animate) {
                lbImg.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
            }
        });
        document.addEventListener('keydown', function (e) {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.gallery img')) {
                e.preventDefault();
                e.target.click();
            }
        });
        lightbox.addEventListener('click', closeLb);
        document.addEventListener('keydown', function (e) {
            if (lightbox.hidden) { return; }
            if (e.key === 'Escape') { closeLb(); }
            else if (e.key === 'Tab') { e.preventDefault(); lbClose.focus(); }   // keep focus in the viewer
        });
    }

    // Standalone project pages (/projects/<slug>/): show the triangle frame around the image.
    var soloStage = $('.solo__stage');
    if (soloStage) {
        Field.frame(soloStage, null, null);
        tagGalleries(document);
    }
})();
