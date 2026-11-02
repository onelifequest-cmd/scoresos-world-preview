(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const loader = $('#loader');
  const fill = $('#loader-fill');
  const pctEl = $('#loader-pct');
  const stage = $('#hero-stage');
  const video = $('#hero-video');
  const ambient = $('#hero-ambient');
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
  const replayBtn = $('#hero-replay');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => matchMedia('(max-width: 859px)').matches;
  let isMobile = mobile();

  // v5m: sharp intro (max source 1280x720) + copy deferred until robot clears + wall re-registered
  const INTRO_DESK = './media/hero/hero-intro-v5m.mp4';
  const INTRO_MOBILE = './media/hero/hero-intro-mobile-v5m.mp4';
  const AMBIENT_DESK = './media/hero/ambient-calm-v5m.mp4';
  const AMBIENT_MOBILE = './media/hero/ambient-calm-mobile-v5m.mp4';
  const POSTER_DESK = './media/hero/poster-v5m.jpg';
  const POSTER_MOBILE = './media/hero/poster-mobile-v5m.jpg';
  const SETTLE_DESK = './media/hero/settle-calm-v5m.jpg';
  const SETTLE_MOBILE = './media/hero/settle-calm-mobile-v5m.jpg';

  const REVEAL_AT = 5.4;
  const SWIPE_AT = 5.55;
  const BEAM_AT = 5.85;
  const REACT_AT = 6.45;
  const SETTLE_AT = 7.35;
  const MOBILE_RAIL_AT = 1.1;
  const MOBILE_SETTLE_AT = 7.35;
  /* Robot clears right copy zone ~2.0s; fade copy in ~0.4–0.5s later */
  const COPY_REVEAL_AT = 2.5;

  let revealed = false;
  let swiped = false;
  let beamed = false;
  let reacted = false;
  let settled = false;
  let copyReady = false;
  let ambientOn = false;
  let scoreStarted = false;
  let scoreDone = false;
  let railStarted = false;
  let pulseTimer = 0;

  let loaded = 0;
  const bump = (n) => {
    loaded = Math.min(100, Math.max(loaded, n));
    if (fill) fill.style.width = loaded + '%';
    if (pctEl) pctEl.textContent = Math.round(loaded) + '%';
    if (loaded >= 100) finishLoader();
  };

  let finished = false;
  let playArmed = false;
  function finishLoader() {
    if (finished) return;
    finished = true;
    bump(100);
    setTimeout(() => loader?.classList.add('done'), 120);
    // Start intro from fly-in frame 0 AFTER loader hides — never burn fly-in under preload
    startIntroFromFlyIn();
  }

  function startIntroFromFlyIn() {
    if (playArmed || reduce) return;
    playArmed = true;
    if (!video) return;
    const kick = () => {
      try { video.pause(); } catch (_) {}
      try { video.currentTime = 0; } catch (_) {}
      tryPlay().then(() => {
        if (mobile()) runMobileBeats();
      });
    };
    // slight delay so poster (t0 fly-in) paints under the dismiss, then play from 0
    setTimeout(kick, 140);
  }

  function revealCopy() {
    if (copyReady) return;
    copyReady = true;
    stage?.classList.add('copy-ready');
  }
  if (reduce) revealCopy();


  // Fallback only — prefer canplay bumping to 100
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

  function setIntroSources() {
    if (!video) return;
    try {
      while (video.firstChild) video.removeChild(video.firstChild);
      video.removeAttribute('src');
      if (mobile()) {
        video.poster = POSTER_MOBILE;
        video.src = INTRO_MOBILE;
      } else {
        video.poster = POSTER_DESK;
        video.src = INTRO_DESK;
      }
      video.load();
    } catch (_) {}
  }

  function setAmbientSource() {
    if (!ambient) return;
    try {
      ambient.src = mobile() ? AMBIENT_MOBILE : AMBIENT_DESK;
      ambient.loop = true;
      ambient.load();
    } catch (_) {}
  }

  function applyDeviceStills() {
    if (mobile()) {
      if (settle) settle.src = SETTLE_MOBILE;
      if (posterMobile) {
        posterMobile.src = POSTER_MOBILE;
        posterMobile.hidden = false;
      }
      if (poster) poster.src = POSTER_MOBILE;
    } else {
      if (settle) settle.src = SETTLE_DESK;
      if (poster) poster.src = POSTER_DESK;
    }
  }

  // Initial media
  isMobile = mobile();
  applyDeviceStills();
  setIntroSources();
  setAmbientSource();

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
    if (scoreDone) lockScore742();
    else if (!reduce && !scoreStarted) {
      scoreStarted = true;
      startScore();
    } else lockScore742();
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
    if (scoreStarted && !mobile()) return;
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

  function pulse742() {
    if (reduce || !ambientOn) return;
    const targets = [scoreNum, railScoreNum].filter(Boolean);
    targets.forEach((el) => {
      el.classList.remove('score-pulse');
      void el.offsetWidth;
      el.classList.add('score-pulse');
    });
    wall?.classList.remove('glow-breath');
    void wall?.offsetWidth;
    wall?.classList.add('glow-breath');
  }

  function startAmbient() {
    if (reduce || ambientOn) {
      if (replayBtn) replayBtn.hidden = false;
      return;
    }
    ambientOn = true;
    stage?.classList.add('ambient');
    wall?.classList.add('ambient');
    if (replayBtn) replayBtn.hidden = false;

    tiles.forEach((t) => t.classList.add('alive'));
    railCards.forEach((c) => c.classList.add('alive'));

    if (ambient) {
      setAmbientSource();
      ambient.muted = true;
      ambient.defaultMuted = true;
      ambient.playsInline = true;
      ambient.loop = true;
      ambient.play().then(() => {
        stage?.classList.add('ambient-video');
      }).catch(() => {
        // settle still remains; CSS tile float still runs
      });
    }

    pulse742();
    pulseTimer = setInterval(pulse742, 5200);
  }

  function stopAmbient() {
    ambientOn = false;
    if (pulseTimer) { clearInterval(pulseTimer); pulseTimer = 0; }
    if (ambient) {
      try { ambient.pause(); } catch (_) {}
    }
  }

  function settlePose() {
    if (settled) return;
    settled = true;
    revealCopy();
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
      startAmbient();
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
    setTimeout(revealRail, 700);
    setTimeout(() => { if (!settled) settlePose(); }, 8200);
  }

  function showMobileFallback() {
    if (!mobile()) return;
    stage?.classList.add('mobile-fallback');
    if (posterMobile) posterMobile.hidden = false;
  }

  function markVideoPlaying() {
    stage?.classList.add('video-playing');
    if (poster) {
      // Keep in DOM for replay paint, but hide under playing video
      poster.style.opacity = '0';
    }
  }

  function tryPlay() {
    if (!video) return Promise.resolve();
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    return video.play().then(() => {
      stage?.classList.remove('mobile-fallback');
      markVideoPlaying();
      if (mobile() && posterMobile) posterMobile.style.opacity = '0';
      video.hidden = false;
      video.style.visibility = '';
      video.style.opacity = '';
    }).catch(() => {
      if (mobile()) {
        showMobileFallback();
      } else {
        // Desktop: poster (fly-in frame) stays visible; retry play
        if (poster) poster.style.opacity = '1';
        setTimeout(() => tryPlay(), 600);
      }
    });
  }

  function armPlayRetry() {
    if (reduce) return;
    const resume = () => {
      if (!finished) return;
      if (!settled && video && video.paused) tryPlay();
    };
    window.addEventListener('pointerdown', resume, { passive: true });
    window.addEventListener('pointermove', resume, { passive: true });
    window.addEventListener('keydown', resume, { passive: true });
    window.addEventListener('touchstart', resume, { passive: true });
    window.addEventListener('touchend', resume, { passive: true });
    window.addEventListener('scroll', resume, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        if (!settled) tryPlay();
        else if (ambient && ambient.paused) ambient.play().catch(() => {});
      }
    });
  }

  function resetBeatFlags() {
    revealed = false;
    swiped = false;
    beamed = false;
    reacted = false;
    settled = false;
    copyReady = false;
    stage?.classList.remove('copy-ready');
    scoreStarted = false;
    scoreDone = false;
    railStarted = false;
    tiles.forEach((t) => {
      t.classList.remove('on', 'alive', 'hot', 'score-filled');
    });
    railCards.forEach((c) => c.classList.remove('on', 'checked', 'alive'));
    wall?.classList.remove('revealed', 'mid-reveal', 'settled', 'react', 'beam-hit', 'ambient', 'glow-breath');
    beam?.classList.remove('on', 'shimmer');
    tabletPulse?.classList.remove('on');
    if (scoreNum) {
      scoreNum.textContent = '612';
      scoreNum.classList.remove('climbing', 'settled-score', 'score-pulse');
    }
    if (railScoreNum) {
      railScoreNum.textContent = '612';
      railScoreNum.classList.remove('climbing', 'settled-score', 'score-pulse');
    }
  }

  function replayIntro() {
    if (reduce) return;
    stopAmbient();
    stage?.classList.remove('settled', 'settled-solid', 'ambient', 'ambient-video', 'mobile-fallback', 'video-playing');
    if (ambient) {
      try { ambient.pause(); } catch (_) {}
    }
    if (replayBtn) replayBtn.hidden = true;
    resetBeatFlags();
    isMobile = mobile();
    applyDeviceStills();
    setIntroSources();
    setAmbientSource();
    if (poster) poster.style.opacity = '1';
    if (video) {
      video.hidden = false;
      video.style.visibility = '';
      video.style.opacity = '';
      video.loop = false;
      try { video.currentTime = 0; } catch (_) {}
    }
    tryPlay().then(() => {
      if (mobile()) runMobileBeats();
    });
  }

  replayBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    replayIntro();
  });

  if (video) {
    video.loop = false;

    const onReady = () => bump(100);
    if (video.readyState >= 2) onReady();
    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('playing', markVideoPlaying);
    video.addEventListener('error', () => {
      if (mobile()) {
        showMobileFallback();
        bump(100);
        if (!reduce) runMobileBeats();
        else { revealRail(); lockScore742(); }
      } else {
        if (poster) poster.style.opacity = '1';
        bump(100);
        setTimeout(runDesktopBeats, 500);
        setTimeout(settlePose, 2800);
      }
    }, { once: true });

    function syncBeatsFromTime() {
      const t = video.currentTime || 0;
      if (!copyReady && t >= COPY_REVEAL_AT) revealCopy();
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
      if (isMobile) showMobileFallback();
      // Preload only — play starts in finishLoader from currentTime 0 (fly-in)
      try { video.pause(); video.currentTime = 0; } catch (_) {}
      armPlayRetry();
    } else {
      video.hidden = true;
      bump(100);
      if (isMobile) {
        showMobileFallback();
        revealRail();
        lockScore742();
      } else {
        if (poster) poster.style.opacity = '1';
        runDesktopBeats();
        settlePose();
      }
      if (replayBtn) replayBtn.hidden = true;
    }
  } else {
    bump(100);
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
