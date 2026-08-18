(() => {
  'use strict';

  const PALETTE = [
    '#8052ff', // electric iris
    '#ffb829', // saffron spark
    '#15846e', // deep verdant
    '#c05cff', // magenta-violet
    '#4f8bff', // blue
    '#ff5ca8', // magenta
  ];

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------------------------
   *  Draw a tiny outlined triangle
   * ------------------------------------------------- */
  function triangle(ctx, x, y, size, rot, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.87, size * 0.5);
    ctx.lineTo(-size * 0.87, size * 0.5);
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  /* -------------------------------------------------
   *  HERO — brain-shaped constellation
   *  Points are sampled from a rendered brain glyph.
   * ------------------------------------------------- */
  function initBrain() {
    const canvas = document.getElementById('brain');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let points = [];
    let W = 0, H = 0;
    // Mouse parallax target + eased value
    let mx = 0, my = 0, ex = 0, ey = 0;

    function sampleBrain(w, h) {
      // Render the brain glyph to an offscreen canvas and read pixels.
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d');
      octx.clearRect(0, 0, w, h);
      octx.fillStyle = '#fff';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.font = `${Math.floor(h * 0.82)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      octx.fillText('\uD83E\uDDE0', w / 2, h / 2); // 🧠

      let data;
      try {
        data = octx.getImageData(0, 0, w, h).data;
      } catch (e) {
        return null;
      }

      const pts = [];
      const step = Math.max(2, Math.floor(w / 150));
      let opaque = 0;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const a = data[(y * w + x) * 4 + 3];
          if (a > 60) {
            opaque++;
            if (Math.random() < 0.55) {
              pts.push({ bx: x, by: y });
            }
          }
        }
      }
      // If emoji failed to render (no glyph), fall back to procedural cloud.
      if (opaque < 40) return null;
      return pts;
    }

    function proceduralBrain(w, h) {
      // Two overlapping lobes as a graceful fallback.
      const pts = [];
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) * 0.32;
      for (let i = 0; i < 1000; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const a = Math.random() * Math.PI * 2;
        const r = R * Math.sqrt(Math.random());
        const x = cx + side * R * 0.42 + Math.cos(a) * r * 0.8;
        const y = cy + Math.sin(a) * r;
        pts.push({ bx: x, by: y });
      }
      return pts;
    }

    function build() {
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      let sampled = sampleBrain(W, H) || proceduralBrain(W, H);
      points = sampled.map((p) => {
        // Scatter target: fling each particle outward in a random direction.
        const ang = Math.random() * Math.PI * 2;
        const dist = (0.6 + Math.random() * 1.1) * Math.max(W, H);
        return {
          bx: p.bx,
          by: p.by,
          // Direction of dispersion (biased leftward, like the original)
          sx: Math.cos(ang) * dist - W * (0.5 + Math.random() * 0.6),
          sy: Math.sin(ang) * dist,
          spin: (Math.random() - 0.5) * 6,
          size: 0.9 + Math.random() * 1.4,
          rot: Math.random() * Math.PI * 2,
          color: PALETTE[(Math.random() * PALETTE.length) | 0],
          phase: Math.random() * Math.PI * 2,
          amp: 0.6 + Math.random() * 1.8,
          speed: 0.4 + Math.random() * 0.8,
          base: 0.35 + Math.random() * 0.55,
          // Per-particle delay so they break apart unevenly
          delay: Math.random() * 0.35,
        };
      });
    }

    // Scroll progress: 0 = assembled brain, 1 = fully dispersed + shifted left.
    let scroll = 0, escroll = 0;
    function readScroll() {
      const vh = window.innerHeight || 1;
      // Disperse across roughly the first viewport of scrolling.
      scroll = Math.min(1, Math.max(0, window.scrollY / (vh * 0.85)));
    }

    // easeInOutCubic
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

    let t = 0;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      t += 0.016;
      // Ease the parallax offset toward the mouse target
      ex += (mx - ex) * 0.06;
      ey += (my - ey) * 0.06;
      // Smoothly follow the scroll-driven dispersion
      escroll += (scroll - escroll) * 0.12;

      // Whole cloud drifts left as it dissolves
      const shiftX = -escroll * W * 0.9;

      for (const p of points) {
        const ox = Math.cos(t * p.speed + p.phase) * p.amp;
        const oy = Math.sin(t * p.speed * 1.1 + p.phase) * p.amp;
        const twinkle = p.base + Math.sin(t * 2 + p.phase) * 0.3;
        const depth = 0.4 + p.size * 0.4;

        // Per-particle dispersion amount (delayed, eased)
        const local = Math.min(1, Math.max(0, (escroll - p.delay) / (1 - p.delay)));
        const d = ease(local);

        const x = p.bx + ox + ex * depth + shiftX + p.sx * d;
        const y = p.by + oy + ey * depth + p.sy * d;
        const alpha = Math.max(0.08, twinkle) * (1 - d * 0.9);

        triangle(ctx, x, y, p.size, p.rot + t * 0.15 + p.spin * d, p.color, alpha);
      }
      if (!prefersReduced) requestAnimationFrame(frame);
    }

    readScroll();
    build();
    frame();

    if (!prefersReduced) {
      window.addEventListener('scroll', readScroll, { passive: true });
      window.addEventListener('mousemove', (e) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 40;
        my = (e.clientY / window.innerHeight - 0.5) * 40;
      }, { passive: true });
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        build();
        if (prefersReduced) frame();
      }, 200);
    });
  }

  /* -------------------------------------------------
   *  AMBIENT — scattered drifting triangles
   * ------------------------------------------------- */
  function initAmbient() {
    const canvas = document.getElementById('ambient');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    let particles = [];

    function build() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round((W * H) / 26000);
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size: 1 + Math.random() * 2,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.004,
          vx: (Math.random() - 0.5) * 0.12,
          vy: -0.05 - Math.random() * 0.12,
          color: PALETTE[(Math.random() * PALETTE.length) | 0],
          alpha: 0.06 + Math.random() * 0.18,
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        triangle(ctx, p.x, p.y, p.size, p.rot, p.color, p.alpha);
      }
      if (!prefersReduced) requestAnimationFrame(frame);
    }

    build();
    frame();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        build();
        if (prefersReduced) frame();
      }, 200);
    });
  }

  /* -------------------------------------------------
   *  Nav background on scroll
   * ------------------------------------------------- */
  function initNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* -------------------------------------------------
   *  Scroll reveal — fade + rise as elements enter view
   * ------------------------------------------------- */
  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (prefersReduced || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // Stagger siblings that share a parent for a cascading effect
        const siblings = Array.from(el.parentElement.querySelectorAll(':scope > .reveal'));
        const i = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = (i * 90) + 'ms';
        el.classList.add('is-visible');
        obs.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    items.forEach((el) => io.observe(el));
  }

  /* -------------------------------------------------
   *  Preloader — count 0 -> 100, then reveal the page
   * ------------------------------------------------- */
  function initPreloader() {
    const el = document.getElementById('preloader');
    const countEl = document.getElementById('preloaderCount');
    const labelEl = document.getElementById('preloaderLabel');

    const finish = () => {
      document.body.classList.remove('is-loading');
      if (el) el.classList.add('is-done');
    };

    if (!el || !countEl) {
      finish();
      return;
    }

    if (prefersReduced) {
      countEl.textContent = '100';
      if (labelEl) labelEl.textContent = 'Completed';
      setTimeout(finish, 200);
      return;
    }

    let n = 0;
    const tick = () => {
      // Ease-out increments so it slows as it approaches 100
      n += Math.max(1, Math.round((100 - n) * 0.08));
      if (n >= 100) {
        n = 100;
        countEl.textContent = '100';
        if (labelEl) labelEl.textContent = 'Completed';
        setTimeout(finish, 450);
        return;
      }
      countEl.textContent = String(n);
      setTimeout(tick, 60 + Math.random() * 60);
    };
    setTimeout(tick, 250);
  }

  window.addEventListener('DOMContentLoaded', () => {
    initAmbient();
    initBrain();
    initNav();
    initReveal();
    initPreloader();
  });
})();
