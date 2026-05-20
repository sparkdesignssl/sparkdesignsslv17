'use strict';

// ── HELPERS ──
function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

// ── NAV SCROLL ──
const navbar = qs('#navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── LOADER ──
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
const FINAL = 'SPARK';

function scramble(cb) {
  const el = qs('#loaderText');
  let iter = 0;
  const iv = setInterval(() => {
    el.textContent = FINAL.split('').map((c, i) =>
      i < iter ? FINAL[i] : CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join('');
    if (iter >= FINAL.length + 1) { clearInterval(iv); el.textContent = FINAL; cb && cb(); }
    iter += 0.45;
  }, 55);
}

function fillBar() {
  const bar = qs('#loaderBarFill');
  let p = 0;
  const iv = setInterval(() => {
    p += Math.random() * 5 + 1.5;
    bar.style.width = Math.min(p, 100) + '%';
    if (p >= 100) {
      clearInterval(iv);
      setTimeout(() => {
        qs('#loader').classList.add('hidden');
        document.body.style.overflow = '';
        boot();
      }, 320);
    }
  }, 55);
}

scramble(fillBar);
document.body.style.overflow = 'hidden';

// ── BOOT ──
function boot() {
  initLava();
  initThree();
  initLightning();
  animHero();
  initScrollAnim();
  initLetterGlow();
  initWorkFilter();
  initLightbox();
  initContactForm();
  initCursor();
  initMagnetic();
  initTiltCards();
}

// ── CURSOR ──
function initCursor() {
  const hasFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!hasFine) return;

  const trailCanvas = qs('#trailCanvas');
  const tCtx = trailCanvas.getContext('2d');
  const cOuter = qs('#cursorOuter');
  const cInner = qs('#cursorInner');

  let mx = -200, my = -200, ox = -200, oy = -200;

  function resizeTrail() {
    trailCanvas.width = window.innerWidth;
    trailCanvas.height = window.innerHeight;
  }
  resizeTrail();
  window.addEventListener('resize', resizeTrail, { passive: true });

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  const trail = [];
  const TRAIL_LEN = 28;
  for (let i = 0; i < TRAIL_LEN; i++) trail.push({ x: mx, y: my });

  let cursorRaf;
  function drawTrail() {
    cursorRaf = requestAnimationFrame(drawTrail);
    ox += (mx - ox) * 0.14;
    oy += (my - oy) * 0.14;
    cOuter.style.left = ox + 'px';
    cOuter.style.top  = oy + 'px';
    cInner.style.left = mx + 'px';
    cInner.style.top  = my + 'px';

    trail.unshift({ x: mx, y: my });
    trail.pop();

    tCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    for (let i = 1; i < trail.length; i++) {
      const t = 1 - i / trail.length;
      tCtx.beginPath();
      tCtx.moveTo(trail[i - 1].x, trail[i - 1].y);
      tCtx.lineTo(trail[i].x, trail[i].y);
      tCtx.strokeStyle = `rgba(199,0,0,${t * 0.5})`;
      tCtx.lineWidth = t * 3.5;
      tCtx.lineCap = 'round';
      tCtx.stroke();
    }
  }
  drawTrail();

  qsa('a,button,.magnetic').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cur-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cur-hover'));
  });
}

// ── MAGNETIC BUTTONS ──
function initMagnetic() {
  qsa('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) * 0.28;
      const dy = (e.clientY - r.top - r.height / 2) * 0.28;
      el.style.transform = `translate(${dx}px,${dy}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}

// ── TILT CARDS ──
function initTiltCards() {
  const hasFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!hasFine) return;
  qsa('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top)  / r.height - 0.5) * -10;
      const ry = ((e.clientX - r.left) / r.width  - 0.5) * 10;
      card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

// ── LAVA CANVAS (WebGL marble fluid shader) ──
function initLava() {
  const canvas = qs('#lavaCanvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  const SCALE = 0.5;
  function resize() {
    canvas.width  = canvas.offsetWidth  * SCALE;
    canvas.height = canvas.offsetHeight * SCALE;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  let resizeLavaTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeLavaTimer); resizeLavaTimer = setTimeout(resize, 150); }, { passive: true });

  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs = `
    precision mediump float;
    uniform float t; uniform vec2 r;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float sn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<7;i++){v+=a*sn(p);p=p*2.06+vec2(1.7,9.2);a*=.52;}return v;}
    vec2 swirl(vec2 p,float a,float power){
      float d=length(p);
      float s=sin(a+power/(d+.22));
      float c=cos(a+power/(d+.22));
      return mat2(c,-s,s,c)*p;
    }
    void main(){
      vec2 p=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);
      p.x*=.82;
      float tm=t*.022;
      vec2 a=swirl(p+vec2(.18*sin(tm*.8),.10*cos(tm*.7)),tm*.28,1.05);
      vec2 b=swirl(p*1.22+vec2(.45,-.18),-tm*.22,.78);
      vec2 q=vec2(fbm(a*1.35+vec2(tm,-tm*.4)),fbm(b*1.12+vec2(-tm*.65,tm*.5)));
      vec2 flow=p+.74*sin(vec2(q.y,q.x)*6.283+vec2(tm*1.8,-tm*1.35));
      flow=swirl(flow+q*.32,tm*.18,.9);
      float river=flow.x*3.2+flow.y*2.35+fbm(flow*2.6+q*2.2)*3.4;
      float bands=sin(river*5.7);
      float fine=sin(river*15.5+fbm(flow*8.0-tm)*4.2);
      float contour=1.0-smoothstep(.035,.18,abs(bands));
      float hairline=1.0-smoothstep(.02,.075,abs(fine));
      float redMass=smoothstep(-.56,.72,bands+fbm(flow*3.1+tm)*.82);
      float blackPool=smoothstep(.18,.88,fbm(flow*1.55-q*1.4)-.08+abs(bands)*.22);
      vec3 deep=vec3(.018,0.,0.);
      vec3 darkRed=vec3(.18,.0,.0);
      vec3 hotRed=vec3(.95,.0,.0);
      vec3 c=mix(deep,darkRed,redMass);
      c=mix(c,hotRed,pow(redMass,4.0)*.55);
      c=mix(c,vec3(0.),blackPool*.82);
      c=mix(c,vec3(.02,0.,0.),contour*.92);
      c+=vec3(.85,.0,.0)*hairline*.18*(1.0-blackPool);
      float shine=smoothstep(.965,1.0,sin((flow.x-flow.y)*10.0+fbm(flow*6.0)*5.0));
      c+=vec3(1.0,.08,.04)*shine*.13;
      float vignette=smoothstep(1.02,.18,length(p));
      c*=mix(.48,1.06,vignette);
      gl_FragColor=vec4(c,1.);
    }`;

  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uT = gl.getUniformLocation(prog, 't'), uR = gl.getUniformLocation(prog, 'r');
  const start = performance.now();
  let lavaRunning = true;
  document.addEventListener('visibilitychange', () => { lavaRunning = !document.hidden; if (!document.hidden) drawLava(); });

  function drawLava() {
    if (!lavaRunning) return;
    gl.uniform1f(uT, (performance.now() - start) / 1000);
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(drawLava);
  }
  drawLava();
}

// ── THREE.JS PYRAMID FLYTHROUGH ──
function initThree() {
  const canvas = qs('#threeCanvas');
  if (!canvas || typeof THREE === 'undefined') { document.body.classList.add('no-three'); return; }
  document.body.classList.remove('no-three');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0, 0);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }, 150);
  }, { passive: true });

  // Lighting
  scene.add(new THREE.AmbientLight(0x0a0000, 1.0));
  const keyLight  = new THREE.PointLight(0xff2200, 20, 55); keyLight.position.set(-6, 8, 8);   scene.add(keyLight);
  const rimLight  = new THREE.PointLight(0xffffff,  7, 40); rimLight.position.set(8, -5, 5);    scene.add(rimLight);
  const fillLight = new THREE.PointLight(0xcc0000,  8, 45); fillLight.position.set(5, 6, -4);   scene.add(fillLight);
  const topLight  = new THREE.DirectionalLight(0xff3300, 4); topLight.position.set(-1, 3, 2);   scene.add(topLight);

  // Shared materials
  const mats = [
    new THREE.MeshPhysicalMaterial({ color: 0x1a0000, roughness: 0.55, metalness: 0.6,  clearcoat: 1.0, clearcoatRoughness: 0.35, emissive: 0x440000, emissiveIntensity: 0.2 }),
    new THREE.MeshPhysicalMaterial({ color: 0x0d0d0d, roughness: 0.62, metalness: 0.55, clearcoat: 0.9, clearcoatRoughness: 0.28, emissive: 0x220000, emissiveIntensity: 0.12 }),
    new THREE.MeshPhysicalMaterial({ color: 0x2a0000, roughness: 0.50, metalness: 0.65, clearcoat: 1.0, clearcoatRoughness: 0.22, emissive: 0x880000, emissiveIntensity: 0.35 }),
  ];

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function makePyramidGeo(size) {
    const h = size * 1.7, b = size;
    const ax = rnd(-b * 0.1, b * 0.1), ay = h * rnd(0.92, 1.08), az = rnd(-b * 0.1, b * 0.1);
    const bl = [-b * rnd(0.88, 1.12), 0,  b * rnd(0.88, 1.12)];
    const br = [ b * rnd(0.88, 1.12), 0,  b * rnd(0.88, 1.12)];
    const tr = [ b * rnd(0.88, 1.12), 0, -b * rnd(0.88, 1.12)];
    const tl = [-b * rnd(0.88, 1.12), 0, -b * rnd(0.88, 1.12)];
    const v = new Float32Array([
      bl[0],bl[1],bl[2], br[0],br[1],br[2], ax,ay,az,
      br[0],br[1],br[2], tr[0],tr[1],tr[2], ax,ay,az,
      tr[0],tr[1],tr[2], tl[0],tl[1],tl[2], ax,ay,az,
      tl[0],tl[1],tl[2], bl[0],bl[1],bl[2], ax,ay,az,
      bl[0],bl[1],bl[2], tr[0],tr[1],tr[2], br[0],br[1],br[2],
      bl[0],bl[1],bl[2], tl[0],tl[1],tl[2], tr[0],tr[1],tr[2],
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
    geo.computeVertexNormals();
    return geo;
  }

  function spawnPyramid(initScatter) {
    const size = rnd(0.3, 1.3);
    const mesh = new THREE.Mesh(makePyramidGeo(size), mats[Math.floor(Math.random() * mats.length)]);
    mesh.rotation.set(rnd(0, Math.PI * 2), rnd(0, Math.PI * 2), rnd(0, Math.PI * 2));
    mesh.position.set(rnd(-18, 18), rnd(-10, 10), initScatter ? rnd(-100, -4) : rnd(-110, -75));
    mesh.userData = {
      vz: rnd(0.005, 0.011),
      vx: rnd(-0.0012, 0.0012), vy: rnd(-0.0008, 0.0008),
      rx: rnd(0.0003, 0.0012) * (Math.random() < 0.5 ? 1 : -1),
      ry: rnd(0.0005, 0.0018) * (Math.random() < 0.5 ? 1 : -1),
      rz: rnd(0.0002, 0.0008) * (Math.random() < 0.5 ? 1 : -1),
      size,
    };
    scene.add(mesh);
    return mesh;
  }

  const COUNT = window.innerWidth <= 760 ? 8 : 14;
  const pyramids = [];
  for (let i = 0; i < COUNT; i++) pyramids.push(spawnPyramid(true));

  let tabVisible = true;
  document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; if (tabVisible) threeAnimate(); });

  const clock = new THREE.Clock();
  function threeAnimate() {
    if (!tabVisible) return;
    const t = clock.getElapsedTime();
    pyramids.forEach((mesh, i) => {
      const d = mesh.userData;
      mesh.position.z += d.vz;
      mesh.position.x += d.vx;
      mesh.position.y += d.vy;
      mesh.rotation.x += d.rx;
      mesh.rotation.y += d.ry;
      mesh.rotation.z += d.rz;
      if (mesh.position.z > d.size * 2 + 2) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        pyramids[i] = spawnPyramid(false);
      }
    });
    keyLight.position.x  = -6 + Math.sin(t * 0.28) * 1.2;
    keyLight.position.y  =  8 + Math.cos(t * 0.20) * 0.8;
    rimLight.position.x  =  8 + Math.sin(t * 0.16 + 1) * 1;
    keyLight.intensity   = 18 + Math.sin(t * 0.42) * 2;
    fillLight.intensity  =  7 + Math.sin(t * 0.36 + 1.5) * 1.2;
    renderer.render(scene, camera);
    requestAnimationFrame(threeAnimate);
  }
  threeAnimate();
}

// ── LIGHTNING ──
function initLightning() {
  const canvas = qs('#lightningCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  ctx.shadowColor = 'rgba(199,0,0,0.85)';
  ctx.shadowBlur = 14;

  function drawBolt(x, y, len, angle, depth) {
    if (depth < 1 || len < 10) return;
    const ex = x + Math.cos(angle) * len;
    const ey = y + Math.sin(angle) * len;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = `rgba(199,0,0,${0.1 + depth * 0.07})`;
    ctx.lineWidth = depth * 0.6;
    ctx.stroke();
    const branches = depth > 2 ? 3 : 2;
    for (let i = 0; i < branches; i++) {
      drawBolt(ex, ey, len * rnd2(0.5, 0.72), angle + rnd2(-0.9, 0.9), depth - 1);
    }
  }
  function rnd2(a, b) { return a + Math.random() * (b - a); }

  function randomBolt() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height * 0.72;
    drawBolt(x, y, rnd2(150, 380), -Math.PI / 2 + rnd2(-0.6, 0.6), 4);
    setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), rnd2(60, 140));
  }

  function scheduleBolt() {
    setTimeout(() => { randomBolt(); scheduleBolt(); }, rnd2(2200, 6500));
  }
  scheduleBolt();
}

// ── HERO ANIMATION ──
function animHero() {
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const tl = gsap.timeline({ delay: 0.2 });
  tl.to('#hero .title-line', { y: '0%', opacity: 1, duration: 1.1, stagger: 0.18, ease: 'power4.out' })
    .to('#hero .hero-btns',  { opacity: 1, y: 0,    duration: 0.8, ease: 'power3.out' }, '-=0.5');

  // Neon glow activates after reveal
  setTimeout(() => {
    qsa('#hero .title-line').forEach(el => el.classList.add('neon-active'));
  }, 1800);

  // Parallax on scroll
  gsap.to('#hero .hero-content', {
    y: 60, opacity: 0.4, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  });
}

// ── SCROLL REVEAL ──
function initScrollAnim() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.08 });
  qsa('.reveal').forEach(el => obs.observe(el));
}

// ── LETTER GLOW ──
function initLetterGlow() {
  qsa('.section-title-glow').forEach(el => {
    const text = el.dataset.text || el.textContent.trim();
    const total = text.length;
    const dur = total * 0.28 + 2.8;
    el.innerHTML = text.split('').map((ch, i) => {
      const d = (i / (total - 1 || 1)) * (dur * 0.5);
      return `<span class="glow-letter" style="--delay:${d.toFixed(2)}s;--sweep-duration:${dur.toFixed(2)}s">${ch === ' ' ? '&nbsp;' : ch}</span>`;
    }).join('');
  });
}

// ── WORK FILTER ──
function initWorkFilter() {
  const btns  = qsa('.filter-btn');
  const cards = qsa('.album-card');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      cards.forEach(c => {
        const match = f === 'all' || c.dataset.category === f;
        c.classList.toggle('card-hidden', !match);
      });
    });
  });
}

// ── LIGHTBOX ──
function initLightbox() {
  const lb      = qs('#lightbox');
  const lbClose = qs('#lightboxClose');
  const stage   = qs('#albumStage');
  const slots   = qsa('.wheel-slot', lb);
  const albumTitle = qs('#albumTitle');
  const albumCount = qs('#albumCount');

  let images = [], idx = 0;

  const SLOT_STYLES = [
    { z: -360, scale: 0.55, opacity: 0.18, blur: 8,  ry: -42 },
    { z: -160, scale: 0.76, opacity: 0.45, blur: 3,  ry: -22 },
    { z:    0, scale: 1.00, opacity: 1.00, blur: 0,  ry:   0 },
    { z: -160, scale: 0.76, opacity: 0.45, blur: 3,  ry:  22 },
    { z: -360, scale: 0.55, opacity: 0.18, blur: 8,  ry:  42 },
  ];

  function applySlot(el, i, animated = true) {
    const s = SLOT_STYLES[i];
    const trans = `translate(-50%,-50%) translateZ(${s.z}px) scale(${s.scale}) rotateY(${s.ry}deg)`;
    if (animated) {
      el.style.transition = 'transform 0.52s cubic-bezier(.16,1,.3,1), opacity 0.52s, filter 0.52s';
    } else {
      el.style.transition = 'none';
    }
    el.style.transform  = trans;
    el.style.opacity    = s.opacity;
    el.style.filter     = s.blur ? `blur(${s.blur}px)` : '';
    el.style.zIndex     = i === 2 ? 10 : 5 - Math.abs(i - 2);
    el.style.pointerEvents = i === 2 ? 'auto' : 'none';
  }

  function renderWheel(animated = false) {
    const offsets = [-2, -1, 0, 1, 2];
    slots.forEach((slot, si) => {
      const imgIdx = (idx + offsets[si] + images.length * 10) % images.length;
      const img = slot.querySelector('img');
      img.src = images[imgIdx];
      applySlot(slot, si, animated);
    });
    albumCount.textContent = `${idx + 1} / ${images.length}`;
  }

  function spin(dir) {
    idx = (idx + dir + images.length) % images.length;
    renderWheel(true);
  }

  function openAlbum(card) {
    images = card.dataset.images.split('|');
    idx    = 0;
    albumTitle.textContent = card.dataset.title || '';
    renderWheel(false);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeLightbox() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  qsa('.album-card').forEach(card => card.addEventListener('click', () => openAlbum(card)));
  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  spin(-1);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') spin(1);
  });

  // Wheel scroll
  let wheelTimer;
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => spin(e.deltaY > 0 ? 1 : -1), 60);
  }, { passive: false });

  // Touch / swipe
  let ty0 = 0, dragging = false;
  stage.addEventListener('touchstart', e => { ty0 = e.touches[0].clientY; dragging = true; }, { passive: true });
  stage.addEventListener('touchmove',  e => { if (dragging) e.preventDefault(); }, { passive: false });
  stage.addEventListener('touchend',   e => {
    if (!dragging) return;
    dragging = false;
    const dy = ty0 - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 30) spin(dy > 0 ? 1 : -1);
  });
}

// ── CONTACT FORM ──
function initContactForm() {
  const form    = qs('#contactForm');
  const success = qs('#formSuccess');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.textContent = 'SENDING...';
    btn.disabled = true;
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form) });
      if (res.ok) {
        form.style.display = 'none';
        success.style.display = 'block';
      } else {
        btn.textContent = 'TRY AGAIN';
        btn.disabled = false;
      }
    } catch {
      btn.textContent = 'TRY AGAIN';
      btn.disabled = false;
    }
  });
}
