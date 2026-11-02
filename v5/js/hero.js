(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const loader = $('#loader');
  const fill = $('#loader-fill');
  const pctEl = $('#loader-pct');
  const stage = $('#hero-stage');
  const video = $('#hero-video');
  const poster = $('#hero-poster');
  const settle = $('#hero-settle');
  const wall = $('#wall');
  const tiles = $$('.tile');
  const scoreNum = $('#score-num');
  const beam = $('#control-beam');
  const tabletPulse = $('#tablet-pulse');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => matchMedia('(max-width: 859px)').matches;

  // Plate settle / reach beat (forward half of ping-pong ~10s raw)
  const REVEAL_AT = 5.4;
  const SWIPE_AT = 5.55;
  const BEAM_AT = 5.85;
  const REACT_AT = 6.45;
  const SETTLE_AT = 7.35; // crossfade off mid-leap → upright calm still
  let revealed = false;
  let swiped = false;
  let beamed = false;
  let reacted = false;
  let settled = false;
  let scoreStarted = false;

  let loaded = 0;
  const bump = (n) => {
    loaded = Math.min(100, Math.max(loaded, n));
    if (fill) fill.style.width = loaded + '%';
    if (pctEl) pctEl.textContent = Math.round(loaded) + '%';
    if (loaded >= 100) finishLoader();
  };

  let finished = false;
  function finishLoader() {
    if (finished) return;
    finished = true;
    bump(100);
    setTimeout(() => loader?.classList.add('done'), 180);
  }

  setTimeout(() => bump(100), 4500);

  const imgs = $$('.tile img, #hero-poster, .hero-poster-fallback, #hero-poster-mobile, #hero-settle');
  let imgDone = 0;
  const totalImgs = Math.max(1, imgs.length);
  imgs.forEach((img) => {
    const done = () => { imgDone += 1; bump(20 + (imgDone / totalImgs) * 50); };
    if (img.complete) done();
    else {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }
  });

  function revealPanels() {
    if (revealed) return;
    revealed = true;
    wall?.classList.add('revealed');
    wall?.classList.add('mid-reveal');
    tiles.forEach((t) => t.classList.add('on'));
  }

  function fireSwipe() {
    if (swiped || mobile()) return;
    swiped = true;
    tabletPulse?.classList.remove('on');
    void tabletPulse?.offsetWidth;
    tabletPulse?.classList.add('on');
  }

  function fireBeam() {
    if (beamed || mobile()) return;
    beamed = true;
    beam?.classList.remove('on', 'shimmer');
    void beam?.offsetWidth;
    beam?.classList.add('on');
    // After one-shot pulse, leave a faint shimmer (or nothing)
    setTimeout(() => {
      if (!beam) return;
      beam.classList.remove('on');
      beam.classList.add('shimmer');
    }, 2400);
  }

  function reactScreens() {
    if (reacted) return;
    reacted = true;
    wall?.classList.add('react');
    wall?.classList.add('beam-hit');
    if (!reduce && !scoreStarted) {
      scoreStarted = true;
      startScore();
    } else if (scoreNum) {
      scoreNum.textContent = '742';
    }
  }

  function settlePose() {
    if (settled || mobile()) return;
    settled = true;
    wall?.classList.remove('mid-reveal');
    wall?.classList.add('settled');
    // Plate has no upright frame (robot mid-leap throughout). Pause video and
    // slow-crossfade to v4 standing still (settle-calm.jpg). 0 Runway.
    if (video) {
      try { video.pause(); } catch (_) {}
    }
    stage?.classList.add('settled');
  }

  function runDesktopBeats() {
    if (mobile()) return;
    revealPanels();
    setTimeout(fireSwipe, 120);
    setTimeout(fireBeam, 280);
    setTimeout(reactScreens, 780);
    setTimeout(settlePose, 1600);
  }

  if (video) {
    // No infinite loop — we settle to calm still after the leap beat
    video.loop = false;

    const onReady = () => bump(95);
    if (video.readyState >= 2) onReady();
    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('error', () => {
      video.hidden = true;
      if (poster) poster.hidden = false;
      bump(95);
      if (!mobile()) {
        setTimeout(runDesktopBeats, 500);
        setTimeout(settlePose, 900);
      }
    }, { once: true });

    function syncBeatsFromTime() {
      if (mobile()) return;
      const t = video.currentTime || 0;
      if (!revealed && t >= REVEAL_AT) revealPanels();
      if (!swiped && t >= SWIPE_AT) fireSwipe();
      if (!beamed && t >= BEAM_AT) fireBeam();
      if (!reacted && t >= REACT_AT) reactScreens();
      if (!settled && t >= SETTLE_AT) settlePose();
    }
    video.addEventListener('timeupdate', syncBeatsFromTime);
    video.addEventListener('seeked', syncBeatsFromTime);
    video.addEventListener('playing', syncBeatsFromTime);
    video.addEventListener('ended', () => {
      if (!settled) settlePose();
    });

    const tryPlay = () => video.play().catch(() => {
      video.hidden = true;
      if (poster) poster.hidden = false;
      if (!mobile()) {
        setTimeout(runDesktopBeats, 500);
        setTimeout(settlePose, 900);
      }
    });
    if (!reduce) tryPlay();
    else {
      video.hidden = true;
      if (poster) poster.hidden = false;
      bump(95);
      if (!mobile()) {
        runDesktopBeats();
        settlePose();
      }
    }
  } else {
    bump(95);
    if (!mobile()) {
      setTimeout(runDesktopBeats, 400);
      setTimeout(settlePose, 800);
    }
  }

  let mx = 0.5, my = 0.5, scroll = 0;
  const apply = () => {
    if (!stage) return;
    stage.style.setProperty('--mx', mx.toFixed(4));
    stage.style.setProperty('--my', my.toFixed(4));
    stage.style.setProperty('--scroll', scroll.toFixed(4));
  };

  if (!reduce) {
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX / Math.max(1, window.innerWidth);
      my = e.clientY / Math.max(1, window.innerHeight);
      apply();
      if (!mobile() && wall) {
        tiles.forEach((t) => {
          const r = t.getBoundingClientRect();
          if (!r.width) return;
          const tx = (e.clientX - r.left) / r.width;
          const ty = (e.clientY - r.top) / r.height;
          t.style.setProperty('--tx', Math.min(1, Math.max(0, tx)).toFixed(3));
          t.style.setProperty('--ty', Math.min(1, Math.max(0, ty)).toFixed(3));
          const hot = tx > -0.12 && tx < 1.12 && ty > -0.12 && ty < 1.12 &&
            Math.hypot(tx - 0.5, ty - 0.5) < 0.9;
          t.classList.toggle('hot', hot);
        });
      }
    }, { passive: true });

    window.addEventListener('scroll', () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scroll = Math.min(1, window.scrollY / max);
      apply();
    }, { passive: true });
  }

  function startScore() {
    if (!scoreNum) return;
    const from = 612, to = 742;
    const dur = 2200;
    const t0 = performance.now();
    scoreNum.classList.add('climbing');
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      scoreNum.textContent = String(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(step);
      else {
        scoreNum.textContent = '742';
        scoreNum.classList.remove('climbing');
      }
    };
    requestAnimationFrame(step);
  }
})();
