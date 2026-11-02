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
  const dust = $('#hero-dust');
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

  const INTRO_WEBM = './media/hero/hero-intro-v5k.webm';
  const INTRO_MP4 = './media/hero/hero-intro-v5k.mp4';
  const INTRO_MOBILE = './media/hero/hero-loop-mobile.mp4';
  const AMBIENT_DESK = './media/hero/ambient-calm-v5k.mp4';
  const AMBIENT_MOBILE = './media/hero/ambient-calm-mobile-v5k.mp4';

  // Plate settle / reach beat (intro encode ~8.5s; settle ~7.35)
  const REVEAL_AT = 5.4;
  const SWIPE_AT = 5.55;
  const BEAM_AT = 5.85;
  const REACT_AT = 6.45;
  const SETTLE_AT = 7.35;
  const MOBILE_RAIL_AT = 1.1;
  const MOBILE_SETTLE_AT = 7.35;

  let revealed = false;
  let swiped = false;
  let beamed = false;
  let reacted = false;
  let settled = false;
  let ambientOn = false;
  let scoreStarted = false;
  let scoreDone = false;
  let railStarted = false;
  let dustRaf = 0;
  let pulseTimer = 0;

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

  function setIntroSources() {
    if (!video) return;
    try {
      while (video.firstChild) video.removeChild(video.firstChild);
      video.removeAttribute('src');
      if (mobile()) {
        video.poster = './media/hero/poster-mobile-v5j.jpg';
        video.src = INTRO_MOBILE;
      } else {
        video.poster = './media/hero/poster.jpg';
        const w = document.createElement('source');
        w.src = INTRO_WEBM; w.type = 'video/webm';
        const m = document.createElement('source');
        m.src = INTRO_MP4; m.type = 'video/mp4';
        video.appendChild(w);
        video.appendChild(m);
      }
      video.load();
    } catch (_) {}
  }

  function setAmbientSource() {
    if (!ambient) return;
    try {
      ambient.src = mobile() ? AMBIENT_MOBILE : AMBIENT_DESK;
      ambient.load();
    } catch (_) {}
  }

  // Initial mobile / desktop media
  if (video) {
    if (isMobile) {
      setIntroSources();
      if (settle) settle.src = './media/hero/settle-calm-mobile.jpg';
      if (posterMobile) {
        posterMobile.src = './media/hero/poster-mobile-v5j.jpg';
        posterMobile.hidden = false;
      }
    }
  }
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

  function startDust() {
    if (!dust || reduce || dustRaf) return;
    const ctx = dust.getContext('2d');
    if (!ctx) return;
    const particles = [];
    const N = mobile() ? 18 : 36;
    const resize = () => {
      const r = dust.parentElement?.getBoundingClientRect();
      if (!r) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      dust.width = Math.floor(r.width * dpr);
      dust.height = Math.floor(r.height * dpr);
      dust.style.width = r.width + 'px';
      dust.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    for (let i = 0; i < N; i++) {
      particles.push({
        x: 0.45 + Math.random() * 0.5,
        y: 0.05 + Math.random() * 0.7,
        r: 0.4 + Math.random() * 1.4,
        a: 0.12 + Math.random() * 0.28,
        vx: (Math.random() - 0.35) * 0.00025,
        vy: -0.00012 - Math.random() * 0.00022,
        tw: Math.random() * Math.PI * 2,
      });
    }
    const tick = () => {
      if (!ambientOn) { dustRaf = 0; return; }
      const w = dust.clientWidth || 1;
      const h = dust.clientHeight || 1;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.tw += 0.02;
        if (p.y < -0.02) { p.y = 0.75; p.x = 0.5 + Math.random() * 0.45; }
        if (p.x < 0.4 || p.x > 1.05) p.x = 0.5 + Math.random() * 0.45;
        const alpha = p.a * (0.65 + 0.35 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 220, 160, ${alpha.toFixed(3)})`;
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      dustRaf = requestAnimationFrame(tick);
    };
    dustRaf = requestAnimationFrame(tick);
  }

  function stopDust() {
    ambientOn = false;
    if (dustRaf) cancelAnimationFrame(dustRaf);
    dustRaf = 0;
    if (dust) {
      const ctx = dust.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, dust.width, dust.height);
    }
    if (pulseTimer) { clearInterval(pulseTimer); pulseTimer = 0; }
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

    // Soft continuous life on holograms
    tiles.forEach((t) => t.classList.add('alive'));
    railCards.forEach((c) => c.classList.add('alive'));

    // Loop calm ambient plate under settle (Ken Burns CSS also on settle)
    if (ambient) {
      setAmbientSource();
      ambient.muted = true;
      ambient.defaultMuted = true;
      ambient.playsInline = true;
      ambient.loop = true;
      ambient.play().then(() => {
        stage?.classList.add('ambient-video');
      }).catch(() => {
        // CSS Ken Burns on settle is enough
      });
    }

    startDust();
    pulse742();
    pulseTimer = setInterval(pulse742, 5200);
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
        // Keep in DOM for Replay; hide visually
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
      if (mobile() && posterMobile) posterMobile.style.opacity = '0';
      if (poster) poster.hidden = true;
      video.hidden = false;
      video.style.visibility = '';
      video.style.opacity = '';
    }).catch(() => {
      if (mobile()) {
        showMobileFallback();
      } else {
        // Desktop: keep trying; show poster underneath but don't abort intro forever
        if (poster) poster.hidden = false;
        setTimeout(() => tryPlay(), 600);
      }
    });
  }

  function armPlayRetry() {
    if (reduce) return;
    const resume = () => {
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
    stopDust();
    stage?.classList.remove('settled', 'settled-solid', 'ambient', 'ambient-video', 'mobile-fallback');
    if (ambient) {
      try { ambient.pause(); } catch (_) {}
      stage?.classList.remove('ambient-video');
    }
    if (replayBtn) replayBtn.hidden = true;
    resetBeatFlags();
    isMobile = mobile();
    setIntroSources();
    setAmbientSource();
    if (video) {
      video.hidden = false;
      video.style.visibility = '';
      video.style.opacity = '';
      video.loop = false;
      video.currentTime = 0;
    }
    if (settle) {
      // force settle hidden until next settle
      settle.style.opacity = '';
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
        if (poster) poster.hidden = false;
        bump(95);
        // Fall back to beats so wall still animates even if video fails
        setTimeout(runDesktopBeats, 500);
        setTimeout(settlePose, 2800);
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
      if (replayBtn) replayBtn.hidden = true;
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
