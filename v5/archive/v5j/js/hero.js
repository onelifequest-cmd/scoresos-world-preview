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
  const posterMobile = $('#hero-poster-mobile');
  const wall = $('#wall');
  const tiles = $$('.tile');
  const scoreNum = $('#score-num');
  const railScoreNum = $('#rail-score-num');
  const beam = $('#control-beam');
  const tabletPulse = $('#tablet-pulse');
  const railCards = $$('.holo-card');
  const railFunding = $('.rail-funding');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => matchMedia('(max-width: 859px)').matches;
  const isMobile = mobile();

  // Plate settle / reach beat (forward half of ping-pong ~10s raw)
  const REVEAL_AT = 5.4;
  const SWIPE_AT = 5.55;
  const BEAM_AT = 5.85;
  const REACT_AT = 6.45;
  const SETTLE_AT = 7.35; // crossfade off mid-leap → upright calm still
  const MOBILE_RAIL_AT = 1.1;
  const MOBILE_SETTLE_AT = 7.35;
  let revealed = false;
  let swiped = false;
  let beamed = false;
  let reacted = false;
  let settled = false;
  let scoreStarted = false;
  let scoreDone = false;
  let railStarted = false;

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

  // Mobile: swap to portrait plate + settle so autoplay stays small & framed
  if (isMobile && video) {
    try {
      while (video.firstChild) video.removeChild(video.firstChild);
      video.removeAttribute('src');
      video.poster = './media/hero/poster-mobile-v5j.jpg';
      video.src = './media/hero/hero-loop-mobile.mp4';
      video.load();
    } catch (_) {}
    if (settle) settle.src = './media/hero/settle-calm-mobile.jpg';
    if (posterMobile) {
      posterMobile.src = './media/hero/poster-mobile-v5j.jpg';
      posterMobile.hidden = false;
    }
  }

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
    if (scoreDone) {
      lockScore742();
    } else if (!reduce && !scoreStarted) {
      scoreStarted = true;
      startScore();
    } else {
      lockScore742();
    }
  }

  function lockScore742() {
    scoreDone = true;
    scoreStarted = true;
    if (scoreNum) {
      scoreNum.textContent = '742';
      scoreNum.classList.remove('climbing');
      scoreNum.classList.add('settled-score');
      scoreNum.closest('.score-tile')?.classList.add('score-filled');
    }
    if (railScoreNum) {
      railScoreNum.textContent = '742';
      railScoreNum.classList.remove('climbing');
      railScoreNum.classList.add('settled-score');
    }
  }

  function revealRail() {
    if (railStarted) return;
    railStarted = true;
    railCards.forEach((c, i) => {
      const delay = (Number(c.style.getPropertyValue('--d')) || i) * 140;
      setTimeout(() => {
        c.classList.add('on');
        if (c.classList.contains('rail-funding')) {
          setTimeout(() => c.classList.add('checked'), 220);
        }
        if (c.classList.contains('rail-score') && !reduce) {
          setTimeout(() => startRailScore(), 180);
        } else if (c.classList.contains('rail-score')) {
          lockScore742();
        }
      }, delay);
    });
  }

  function startRailScore() {
    if (!railScoreNum || scoreDone) {
      lockScore742();
      return;
    }
    if (scoreStarted && !mobile()) return; // desktop wall owns the climb
    scoreStarted = true;
    const from = 612, to = 742;
    const dur = 2200;
    const t0 = performance.now();
    railScoreNum.classList.add('climbing');
    if (scoreNum) scoreNum.classList.add('climbing');
    const step = (now) => {
      if (scoreDone) return;
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = String(Math.round(from + (to - from) * eased));
      railScoreNum.textContent = val;
      if (scoreNum && mobile()) scoreNum.textContent = val;
      if (p < 1) requestAnimationFrame(step);
      else lockScore742();
    };
    requestAnimationFrame(step);
  }

  function settlePose() {
    if (settled) return;
    settled = true;
    wall?.classList.remove('mid-reveal');
    wall?.classList.add('settled');
    if (video) {
      try { video.pause(); video.loop = false; } catch (_) {}
    }
    stage?.classList.add('settled');
    stage?.classList.remove('mobile-fallback');
    const finishFade = () => {
      stage?.classList.add('settled-solid');
      if (video) {
        try { video.pause(); } catch (_) {}
        video.style.visibility = 'hidden';
        video.style.opacity = '0';
      }
      if (scoreDone || scoreStarted) lockScore742();
      else setTimeout(lockScore742, 2400);
    };
    if (settle) {
      const onEnd = (e) => {
        if (e.propertyName && e.propertyName !== 'opacity') return;
        settle.removeEventListener('transitionend', onEnd);
        finishFade();
      };
      settle.addEventListener('transitionend', onEnd);
    }
    setTimeout(finishFade, 1800);
  }

  function runDesktopBeats() {
    if (mobile()) return;
    revealPanels();
    setTimeout(fireSwipe, 120);
    setTimeout(fireBeam, 280);
    setTimeout(reactScreens, 780);
    setTimeout(settlePose, 1600);
  }

  function runMobileBeats() {
    if (!mobile()) return;
    // Cards glow in while the plate plays; settle when leap beat hits
    setTimeout(revealRail, 700);
    // Safety settle if timeupdate misses (short mobile encode ends ~9.2s)
    setTimeout(() => { if (!settled) settlePose(); }, 8200);
  }

  function showMobileFallback() {
    if (!mobile()) return;
    stage?.classList.add('mobile-fallback');
    if (posterMobile) posterMobile.hidden = false;
  }

  function tryPlay() {
    if (!video) return Promise.resolve();
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    return video.play().then(() => {
      stage?.classList.remove('mobile-fallback');
      if (mobile() && posterMobile) {
        // keep poster under video for first-frame gaps, hide once playing
        posterMobile.style.opacity = '0';
      }
    }).catch(() => {
      if (mobile()) {
        showMobileFallback();
      } else {
        video.hidden = true;
        if (poster) poster.hidden = false;
        setTimeout(runDesktopBeats, 500);
        setTimeout(settlePose, 900);
      }
    });
  }

  // iOS Safari: retry play on first user gesture
  function armPlayRetry() {
    if (!mobile() || reduce) return;
    const resume = () => { tryPlay(); };
    window.addEventListener('touchstart', resume, { passive: true });
    window.addEventListener('touchend', resume, { passive: true });
    window.addEventListener('scroll', resume, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) tryPlay();
    });
  }

  if (video) {
    video.loop = false;

    const onReady = () => bump(95);
    if (video.readyState >= 2) onReady();
    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('error', () => {
      if (mobile()) {
        showMobileFallback();
        bump(95);
        if (!reduce) runMobileBeats();
        else { revealRail(); lockScore742(); }
      } else {
        video.hidden = true;
        if (poster) poster.hidden = false;
        bump(95);
        setTimeout(runDesktopBeats, 500);
        setTimeout(settlePose, 900);
      }
    }, { once: true });

    function syncBeatsFromTime() {
      const t = video.currentTime || 0;
      if (mobile()) {
        if (!railStarted && t >= MOBILE_RAIL_AT) revealRail();
        if (!settled && t >= MOBILE_SETTLE_AT) settlePose();
        return;
      }
      if (!revealed && t >= REVEAL_AT) revealPanels();
      if (!swiped && t >= SWIPE_AT) fireSwipe();
      if (!beamed && t >= BEAM_AT) fireBeam();
      if (!reacted && t >= REACT_AT) reactScreens();
      if (!settled && t >= SETTLE_AT) settlePose();
    }
    video.addEventListener('timeupdate', syncBeatsFromTime);
    video.addEventListener('seeked', syncBeatsFromTime);
    video.addEventListener('playing', () => {
      stage?.classList.remove('mobile-fallback');
      syncBeatsFromTime();
    });
    video.addEventListener('ended', () => {
      if (!settled) settlePose();
    });

    if (!reduce) {
      // Show poster under video until first frame on mobile
      if (isMobile) showMobileFallback();
      tryPlay();
      armPlayRetry();
      if (isMobile) runMobileBeats();
    } else {
      video.hidden = true;
      bump(95);
      if (isMobile) {
        showMobileFallback();
        revealRail();
        lockScore742();
      } else {
        if (poster) poster.hidden = false;
        runDesktopBeats();
        settlePose();
      }
    }
  } else {
    bump(95);
    if (isMobile) {
      showMobileFallback();
      if (!reduce) runMobileBeats();
      else { revealRail(); lockScore742(); }
    } else {
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
    if (!scoreNum || scoreDone) {
      lockScore742();
      return;
    }
    const from = 612, to = 742;
    const dur = 2200;
    const t0 = performance.now();
    scoreNum.classList.add('climbing');
    const step = (now) => {
      if (scoreDone) return;
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      scoreNum.textContent = String(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(step);
      else lockScore742();
    };
    requestAnimationFrame(step);
  }
})();
