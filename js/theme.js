/*
 * Site-wide palettes. One is picked at random on every page load (Teal Dusk is
 * listed twice, so it shows up a bit more often) and every color on the page is
 * derived from it: background field, glass panels, text, accents, buttons, links,
 * card fallbacks and code blocks. Loaded in <head> so there is no flash of color.
 *
 * To add a palette: 5 colors, darkest → lightest. The darkest is the page/glass
 * tone, the 3rd is the accent, the lightest is the warm button / highlight color.
 */
(function () {
    'use strict';

    var PALETTES = [
        { name: 'Teal Dusk',     ramp: ['#0b2b33', '#0f5f63', '#0f8f7e', '#7fd6c6', '#f2b880'] },
        { name: 'Teal Dusk',     ramp: ['#0b2b33', '#0f5f63', '#0f8f7e', '#7fd6c6', '#f2b880'] },
        { name: 'Ember',         ramp: ['#1d1220', '#5a1f2b', '#d9502b', '#f28a3b', '#f6c35b'] },
        { name: 'Haptic Violet', ramp: ['#130f2b', '#2f2470', '#6a4fd8', '#3aa6c9', '#58d6c9'] },
        { name: 'Moss',          ramp: ['#10231a', '#1f4d33', '#3f8f4f', '#9cc96b', '#e9e1a6'] },
        { name: 'Deep Sea',      ramp: ['#0d1b2a', '#1b3a5c', '#2f6690', '#3a7ca5', '#d9dcd6'] },
        { name: 'Sunset Arcade', ramp: ['#2b0f2e', '#6b2d5c', '#b0476f', '#f0a07c', '#ffd8a8'] },
        { name: 'Neon Jungle',   ramp: ['#0a1f1c', '#0e4d45', '#21a179', '#9be564', '#e8fcc2'] },
        { name: 'Dusk Plum',     ramp: ['#1a1423', '#372549', '#774c60', '#b75d69', '#eacdc2'] },
        { name: 'Slate',         ramp: ['#101418', '#26313b', '#3e5c76', '#748cab', '#f0ebd8'] },
        { name: 'Amber',         ramp: ['#1f1300', '#5c3a00', '#c47a00', '#f2a541', '#fff1c1'] }
    ];

    function rgb(hex) {
        var h = hex.replace('#', '');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    function mix(a, b, t) {          // t = share of b
        var x = rgb(a), y = rgb(b);
        return '#' + x.map(function (c, i) {
            var v = Math.round(c + (y[i] - c) * t);
            return (v < 16 ? '0' : '') + v.toString(16);
        }).join('');
    }
    function rgba(hex, alpha) {
        return 'rgba(' + rgb(hex).join(',') + ',' + alpha + ')';
    }
    function luminance(hex) {
        var c = rgb(hex).map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }
    function contrast(a, b) {
        var l1 = luminance(a), l2 = luminance(b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }
    // Pick whichever of two text colors reads better on a background.
    function textOn(bg, darkText, lightText) {
        return contrast(bg, darkText) >= contrast(bg, lightText) ? darkText : lightText;
    }
    // Darken a color toward `toward` until it reaches the contrast target on `bg`.
    function ensureContrast(color, bg, toward, target) {
        var c = color;
        for (var i = 1; i <= 10 && contrast(c, bg) < target; i++) {
            c = mix(color, toward, i / 10);
        }
        return c;
    }

    function tokens(p) {
        var r = p.ramp, dark = r[0], mid = r[1], accent = r[2], light = r[3], warm = r[4];
        var surface = mix('#ffffff', light, 0.04);
        var ink = mix(dark, '#000000', 0.25);
        var glassInk = mix('#ffffff', light, 0.1);
        // Accent used as a fill behind text (active tab, badges), nudged until the text reads well.
        var onAccent = textOn(accent, ink, '#ffffff');
        var accentFill = onAccent === '#ffffff'
            ? ensureContrast(accent, '#ffffff', dark, 4.6)
            : ensureContrast(accent, ink, '#ffffff', 4.6);
        return {
            '--c-dark': dark,
            '--c-mid': mid,
            '--c-accent': accent,
            '--c-light': light,
            '--c-warm': warm,
            '--on-accent': onAccent,
            '--accent-fill': accentFill,
            '--on-warm': textOn(warm, ink, '#ffffff'),
            '--accent-strong': ensureContrast(accent, surface, dark, 4.5),
            '--glass': rgba(dark, 0.8),
            '--glass-strong': rgba(dark, 0.92),
            '--glass-line': rgba(light, 0.28),
            '--glass-ink': glassInk,
            '--glass-muted': ensureContrast(mix(light, '#ffffff', 0.62), dark, '#ffffff', 7),
            '--eyebrow': ensureContrast(mix(light, '#ffffff', 0.25), dark, '#ffffff', 5.5),
            '--warm-on-glass': ensureContrast(warm, dark, '#ffffff', 6),
            '--surface': surface,
            '--surface-2': mix('#ffffff', accent, 0.09),
            '--line': mix('#ffffff', accent, 0.22),
            '--ink': ink,
            '--muted': ensureContrast(mix(ink, '#ffffff', 0.38), surface, ink, 5),
            '--link': ensureContrast(mix(accent, dark, 0.3), surface, dark, 5),
            '--code-bg': mix(dark, '#000000', 0.45),
            '--hero-a': rgba(dark, 0.94),
            '--hero-b': rgba(mid, 0.86),
            '--hero-c': rgba(accent, 0.82),
            '--hero-band-1': rgba(accent, 0.42),
            '--hero-band-2': rgba(light, 0.16),
            '--shadow': rgba(mix(dark, '#000000', 0.5), 0.45)
        };
    }

    function apply(p) {
        var t = tokens(p), root = document.documentElement;
        for (var k in t) {
            root.style.setProperty(k, t[k]);
        }
        root.setAttribute('data-palette', p.name);
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', p.ramp[0]);
        }
        window.PORTFOLIO_THEME = { name: p.name, ramp: p.ramp.slice() };
        document.dispatchEvent(new CustomEvent('palettechange', { detail: window.PORTFOLIO_THEME }));
    }

    // ?palette=ember (or deep-sea, sunset-arcade, …) previews one palette; otherwise random.
    var slug = function (name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-'); };
    var wanted = (location.search.match(/[?&]palette=([\w-]+)/) || [])[1];
    var current = -1;
    if (wanted) {
        for (var w = 0; w < PALETTES.length; w++) {
            if (slug(PALETTES[w].name) === wanted.toLowerCase()) { current = w; break; }
        }
    }
    if (current < 0) { current = Math.floor(Math.random() * PALETTES.length); }
    apply(PALETTES[current]);

    // Re-roll to a different-looking palette (used by the dice button).
    window.rerollPalette = function () {
        var others = [];
        for (var i = 0; i < PALETTES.length; i++) {
            if (PALETTES[i].name !== PALETTES[current].name) { others.push(i); }
        }
        current = others[Math.floor(Math.random() * others.length)];
        apply(PALETTES[current]);
        return PALETTES[current].name;
    };
    window.PORTFOLIO_PALETTES = PALETTES;
    window.PORTFOLIO_TOKENS = tokens;
})();
