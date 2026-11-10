/* ============================================================
 * Ring Star — FlexCarousel 液态卡片轮播
 * ------------------------------------------------------------
 * 由原 React + ogl 组件移植为原生 WebGL2 实现（无外部依赖）。
 * 用法：FlexCarousel.mount(container, { items, ...options });
 *       FlexCarousel.unmount();
 * items: [{ src, alt, title, subtitle }]
 * ============================================================ */
(function () {
  "use strict";

  var PRESETS = {
    liquid: {
      lensWidth: 0.74, lensHeight: 1.18, tilt: 62, roundness: 1, bend: 0.34,
      reach: 0.38, curl: "twist", dispersion: 0.45, liquid: 0, followCursor: false
    },
    ribbon: {
      lensWidth: 0.8, lensHeight: 0.8, tilt: 0, roundness: 1, bend: 0.34,
      reach: 0.34, curl: "twist", dispersion: 0.4, liquid: 0, followCursor: false
    },
    vortex: {
      lensWidth: 0.7, lensHeight: 0.95, tilt: 30, roundness: 1, bend: 0.46,
      reach: 0.3, curl: "twist", dispersion: 0.5, liquid: 0, followCursor: false
    },
    arch: {
      lensWidth: 0.8, lensHeight: 0.8, tilt: 0, roundness: 1, bend: 0.3,
      reach: 0.36, curl: "rise", dispersion: 0.4, liquid: 0, followCursor: false
    }
  };

  var DEFAULTS = {
    preset: "liquid",
    intro: "rise",
    cardHeight: 0.5,
    gap: 12,
    radius: 0,
    fit: "natural",
    squeeze: 0.2,
    focusOnClick: true,
    autoplay: false,
    interval: 4,
    captions: true,
    captureWheel: true
  };

  var FIT_ASPECT = { portrait: 0.75, square: 1, landscape: 4 / 3 };
  var TAPS = 12;
  var PIXEL_BUDGET = 4.5e6;
  var INTRO_DURATION = { rise: 2.1, bloom: 1.6, spin: 2.2, deal: 1.5, fade: 0.35 };

  function wrap(value, size) {
    return (((value + size / 2) % size) + size) % size - size / 2;
  }
  function clamp01(value) {
    return Math.min(Math.max(value, 0), 1);
  }
  function easeOut(value) {
    return 1 - Math.pow(1 - clamp01(value), 3);
  }
  function easeOutQuint(value) {
    return 1 - Math.pow(1 - clamp01(value), 5);
  }
  function easeInOut(value) {
    var t = clamp01(value);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* ---------------- 着色器 ---------------- */

  var cardVS = "#version 300 es\n" +
    "in vec3 position;\n" +
    "in vec2 uv;\n" +
    "uniform vec4 uRect;\n" +
    "uniform vec2 uResolution;\n" +
    "out vec2 vUv;\n" +
    "out vec2 vLocal;\n" +
    "void main() {\n" +
    "  vUv = uv;\n" +
    "  vLocal = vec2(position.x, -position.y) * uRect.zw;\n" +
    "  vec2 px = uRect.xy + vLocal;\n" +
    "  gl_Position = vec4(px.x / uResolution.x * 2.0 - 1.0, 1.0 - px.y / uResolution.y * 2.0, 0.0, 1.0);\n" +
    "}\n";

  var cardFS = "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform sampler2D tMap;\n" +
    "uniform vec2 uSize;\n" +
    "uniform vec2 uImage;\n" +
    "uniform float uRadius;\n" +
    "uniform float uAlpha;\n" +
    "uniform float uReady;\n" +
    "uniform float uShift;\n" +
    "uniform float uDpr;\n" +
    "uniform vec3 uPlaceholder;\n" +
    "in vec2 vUv;\n" +
    "in vec2 vLocal;\n" +
    "out vec4 fragColor;\n" +
    "float roundedBox(vec2 p, vec2 b, float r) {\n" +
    "  vec2 q = abs(p) - b + r;\n" +
    "  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;\n" +
    "}\n" +
    "void main() {\n" +
    "  float sd = roundedBox(vLocal, uSize * 0.5, min(uRadius, min(uSize.x, uSize.y) * 0.5));\n" +
    "  float mask = clamp(0.5 - sd * uDpr, 0.0, 1.0);\n" +
    "  vec2 local = vLocal / uSize + 0.5;\n" +
    "  float cardAspect = uSize.x / uSize.y;\n" +
    "  float imageAspect = uImage.x / max(uImage.y, 1.0);\n" +
    "  vec2 scale = imageAspect > cardAspect ? vec2(cardAspect / imageAspect, 1.0) : vec2(1.0, imageAspect / cardAspect);\n" +
    "  scale /= 1.08;\n" +
    "  vec2 uv = local;\n" +
    "  uv = (uv - 0.5) * scale + 0.5;\n" +
    "  uv.x += uShift * (1.0 - scale.x) * 0.5;\n" +
    "  vec3 image = texture(tMap, uv).rgb;\n" +
    "  vec3 color = mix(uPlaceholder, image, uReady);\n" +
    "  float alpha = mask * uAlpha;\n" +
    "  fragColor = vec4(color * alpha, alpha);\n" +
    "}\n";

  var lensVS = "#version 300 es\n" +
    "in vec2 position;\n" +
    "void main() {\n" +
    "  gl_Position = vec4(position, 0.0, 1.0);\n" +
    "}\n";

  var lensFS = "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform sampler2D tScene;\n" +
    "uniform vec2 uResolution;\n" +
    "uniform float uDpr;\n" +
    "uniform vec2 uCenter;\n" +
    "uniform vec2 uHalf;\n" +
    "uniform float uAngle;\n" +
    "uniform float uExponent;\n" +
    "uniform float uInner;\n" +
    "uniform float uOuter;\n" +
    "uniform float uFlow;\n" +
    "uniform float uCurl;\n" +
    "uniform float uDispersion;\n" +
    "uniform float uStrength;\n" +
    "uniform float uSceneAlpha;\n" +
    "out vec4 fragColor;\n" +
    "void main() {\n" +
    "  vec2 frag = gl_FragCoord.xy / uDpr;\n" +
    "  vec2 uv = frag / uResolution;\n" +
    "  vec2 rel = frag - vec2(uCenter.x, uResolution.y - uCenter.y);\n" +
    "  float ca = cos(uAngle);\n" +
    "  float sa = sin(uAngle);\n" +
    "  vec2 local = vec2(ca * rel.x + sa * rel.y, -sa * rel.x + ca * rel.y);\n" +
    "  vec2 k = max(abs(local) / uHalf, vec2(1e-5));\n" +
    "  float nd = pow(pow(k.x, uExponent) + pow(k.y, uExponent), 1.0 / uExponent);\n" +
    "  vec2 grad = pow(k, vec2(uExponent - 1.0)) * sign(local) / uHalf * pow(nd, 1.0 - uExponent);\n" +
    "  float glen = max(length(grad), 1e-6);\n" +
    "  float edge = (nd - 1.0) / glen;\n" +
    "  vec2 outward = grad / glen;\n" +
    "  vec2 normal = vec2(ca * outward.x - sa * outward.y, sa * outward.x + ca * outward.y);\n" +
    "  vec2 along = vec2(-normal.y, normal.x);\n" +
    "  float t = clamp((edge + uInner) / (uInner + uOuter), 0.0, 1.0);\n" +
    "  float ramp = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);\n" +
    "  float slope = 16.0 * t * t * (1.0 - t) * (1.0 - t);\n" +
    "  float reachX = rel.x / (uResolution.x * 0.5);\n" +
    "  float side = smoothstep(0.02, 0.3, abs(reachX)) * (uCurl == 0.0 ? sign(reachX) : uCurl);\n" +
    "  float lift = ramp * side * uFlow * uStrength;\n" +
    "  vec2 swirl = along * along.y * side * slope * uFlow * uStrength * 0.35;\n" +
    "  vec2 drift = vec2(0.0, -lift) - swirl;\n" +
    "  vec2 shifted = uv + drift / uResolution;\n" +
    "  vec2 texels = uResolution * uDpr;\n" +
    "  vec2 gx = dFdx(shifted);\n" +
    "  vec2 gy = dFdy(shifted);\n" +
    "  gx *= min(1.0, 3.0 / max(length(gx * texels), 1e-4));\n" +
    "  gy *= min(1.0, 3.0 / max(length(gy * texels), 1e-4));\n" +
    "  vec4 color = textureGrad(tScene, shifted, gx, gy);\n" +
    "  vec2 spread = vec2(0.0, side * slope * uFlow * uStrength) / uResolution * uDispersion;\n" +
    "  float spreadPx = length(spread * texels);\n" +
    "  if (color.a > 0.002 && spreadPx > 0.25) {\n" +
    "    vec3 base = color.rgb / color.a;\n" +
    "    vec3 sumColor = vec3(0.0);\n" +
    "    vec3 sumWeight = vec3(0.0);\n" +
    "    for (int i = 0; i < " + TAPS + "; i++) {\n" +
    "      float s = (float(i) + 0.5) / float(" + TAPS + ");\n" +
    "      vec4 c = textureGrad(tScene, shifted + spread * (s - 0.5), gx, gy);\n" +
    "      vec3 w = max(1.0 - abs(vec3(s) - vec3(0.15, 0.5, 0.85)) * 2.6, 0.0) * c.a;\n" +
    "      sumColor += c.rgb * (w / max(c.a, 0.002));\n" +
    "      sumWeight += w;\n" +
    "    }\n" +
    "    vec3 split = mix(base, sumColor / max(sumWeight, vec3(1e-4)), clamp(sumWeight * 2.0, 0.0, 1.0));\n" +
    "    color.rgb = mix(color.rgb, clamp(split, 0.0, 1.0) * color.a, smoothstep(0.25, 1.5, spreadPx));\n" +
    "  }\n" +
    "  fragColor = color * uSceneAlpha;\n" +
    "}\n";

  /* ---------------- WebGL 辅助 ---------------- */

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error("shader compile failed: " + log);
    }
    return sh;
  }

  function makeProgram(gl, vsSrc, fsSrc, attributes) {
    var program = gl.createProgram();
    var vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
    var fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    for (var i = 0; i < attributes.length; i++) {
      gl.bindAttribLocation(program, i, attributes[i]);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("program link failed: " + gl.getProgramInfoLog(program));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    var uniforms = {};
    for (var j = 0; j < count; j++) {
      var info = gl.getActiveUniform(program, j);
      if (!info) continue;
      var name = info.name.replace(/\[0\]$/, "");
      uniforms[name] = { loc: gl.getUniformLocation(program, info.name), type: info.type };
    }
    return { program: program, uniforms: uniforms };
  }

  function applyUniforms(gl, prog, values) {
    var unit = 0;
    for (var name in values) {
      var u = prog.uniforms[name];
      if (!u) continue;
      var v = values[name];
      switch (u.type) {
        case gl.FLOAT: gl.uniform1f(u.loc, v); break;
        case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
        case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
        case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
        case gl.SAMPLER_2D:
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, v);
          gl.uniform1i(u.loc, unit);
          unit += 1;
          break;
        default: break;
      }
    }
  }

  function createTarget(gl, w, h) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture: texture, framebuffer: framebuffer, width: w, height: h };
  }

  function resizeTarget(gl, target, w, h) {
    if (target.width === w && target.height === h) return;
    target.width = w;
    target.height = h;
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  /* ---------------- 实例管理 ---------------- */

  var current = null;

  function mount(container, options) {
    unmount();
    if (!container) return null;
    var canvas = document.createElement("canvas");
    var gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false
    });
    if (!gl) return null;
    try {
      current = start(container, canvas, gl, options || {});
    } catch (err) {
      if (window.console) console.warn("[FlexCarousel]", err);
      current = null;
      return null;
    }
    return current;
  }

  function unmount() {
    if (!current) return;
    try {
      current.destroy();
    } catch (e) {
      /* 忽略销毁异常 */
    }
    current = null;
  }

  function start(container, canvas, gl, opts) {
    var settings = {};
    var k;
    for (k in DEFAULTS) settings[k] = DEFAULTS[k];
    var preset = PRESETS[opts.preset || DEFAULTS.preset] || PRESETS.liquid;
    for (k in preset) settings[k] = preset[k];
    for (k in opts) {
      if (opts[k] !== undefined && opts[k] !== null) settings[k] = opts[k];
    }

    var items = opts.items && opts.items.length ? opts.items.slice() : [];
    var onChange = typeof opts.onChange === "function" ? opts.onChange : null;
    var onSelect = typeof opts.onSelect === "function" ? opts.onSelect : null;

    gl.clearColor(0, 0, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    canvas.className = "flex-carousel__canvas";
    canvas.setAttribute("aria-hidden", "true");
    container.insertBefore(canvas, container.firstChild);
    container.classList.add("flex-carousel");
    container.style.setProperty("--flex-carousel-half", (Math.min(Math.max(settings.cardHeight, 0.05), 1) * 50) + "%");

    /* 全屏三角（lens 使用） */
    var triVAO = gl.createVertexArray();
    gl.bindVertexArray(triVAO);
    var triBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    /* 卡片平面（position + uv） */
    var cardVAO = gl.createVertexArray();
    gl.bindVertexArray(cardVAO);
    var cardPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cardPos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    var cardUv = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cardUv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    var cardIndex = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cardIndex);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 3, 2, 1]), gl.STATIC_DRAW);

    var cardProg = makeProgram(gl, cardVS, cardFS, ["position", "uv"]);
    var lensProg = makeProgram(gl, lensVS, lensFS, ["position"]);

    var cardUniforms = {
      tMap: null,
      uRect: [0, 0, 1, 1],
      uResolution: [1, 1],
      uSize: [1, 1],
      uImage: [1, 1],
      uRadius: 16,
      uAlpha: 1,
      uReady: 0,
      uShift: 0,
      uDpr: 1,
      uPlaceholder: [0.5, 0.5, 0.5]
    };

    var sceneTarget = createTarget(gl, 2, 2);

    var lensUniforms = {
      tScene: sceneTarget.texture,
      uResolution: [1, 1],
      uDpr: 1,
      uCenter: [0, 0],
      uHalf: [1, 1],
      uAngle: 0,
      uExponent: 2,
      uInner: 60,
      uOuter: 80,
      uFlow: 0,
      uCurl: 0,
      uDispersion: 0,
      uStrength: 0,
      uSceneAlpha: 0
    };

    var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var anisotropyExt = gl.getExtension("EXT_texture_filter_anisotropic");
    var anisotropy = anisotropyExt ? 8 : 0;

    var slots = [];
    var width = 1;
    var height = 1;
    var dpr = 1;
    var pos = 0;
    var vel = 0;
    var goal = 0;
    var mode = "spring";
    var wheelAt = 0;
    var raf = 0;
    var last = performance.now();
    var visible = true;
    var alive = true;
    var dirty = true;
    var activeIndex = -1;
    var interactedAt = -Infinity;
    var autoplayAt = performance.now();
    var hasFocus = false;
    var deform = 0;
    var deformVel = 0;
    var layout = null;
    var resnap = false;
    var hover = "";
    var lift = 1;
    var energy = 0;
    var lastPos = 0;
    var lens = { x: 0, y: 0, vx: 0, vy: 0, ready: false };
    var pointer = {
      x: 0, y: 0, over: false, down: false, id: -1,
      startX: 0, startY: 0, startPos: 0, dragging: false, touch: false, samples: []
    };
    var introState = { kind: "none", t: 0, running: false, done: false, readyAt: performance.now() };
    var focus = { index: -1, pending: -1, t: 0, v: 0, target: 0 };
    var instances = [];

    /* ---------- 字幕 DOM ---------- */
    var captionEl = null;
    var titleEl = null;
    var countEl = null;
    var digitsEl = null;
    var totalEl = null;
    var liveEl = null;

    function buildCaption() {
      if (!settings.captions) return;
      captionEl = document.createElement("div");
      captionEl.className = "flex-carousel__caption";
      captionEl.setAttribute("aria-hidden", "true");
      captionEl.innerHTML =
        '<span class="flex-carousel__title"></span>' +
        '<span class="flex-carousel__count">' +
        '<span class="flex-carousel__digits"></span>' +
        '<span class="flex-carousel__slash">/</span>' +
        '<span class="flex-carousel__total"></span>' +
        "</span>";
      container.appendChild(captionEl);
      titleEl = captionEl.querySelector(".flex-carousel__title");
      countEl = captionEl.querySelector(".flex-carousel__count");
      digitsEl = captionEl.querySelector(".flex-carousel__digits");
      totalEl = captionEl.querySelector(".flex-carousel__total");
      totalEl.textContent = String(items.length).padStart(2, "0");
      var reelHTML = "";
      for (var n = 0; n < 2; n++) {
        var inner = "";
        for (var d = 0; d < 10; d++) inner += "<span>" + d + "</span>";
        reelHTML +=
          '<span class="flex-carousel__digit"><span class="flex-carousel__reel">' +
          inner + "</span></span>";
      }
      digitsEl.innerHTML = reelHTML;

      liveEl = document.createElement("div");
      liveEl.className = "flex-carousel__live";
      liveEl.setAttribute("aria-live", "polite");
      liveEl.setAttribute("aria-atomic", "true");
      container.appendChild(liveEl);
    }

    function updateCaption(index) {
      var item = items[index];
      if (!item) return;
      var label = item.title || item.alt || "Image " + (index + 1);
      if (titleEl) {
        titleEl.textContent = "";
        titleEl.appendChild(document.createTextNode(label));
        if (item.subtitle) {
          var sub = document.createElement("span");
          sub.className = "flex-carousel__subtitle";
          sub.textContent = item.subtitle;
          titleEl.appendChild(sub);
        }
        titleEl.style.animation = "none";
        void titleEl.offsetWidth;
        titleEl.style.animation = "";
      }
      if (digitsEl) {
        var text = String(index + 1).padStart(2, "0");
        var reels = digitsEl.querySelectorAll(".flex-carousel__reel");
        for (var i = 0; i < reels.length; i++) {
          reels[i].style.transform = "translateY(" + -Number(text.charAt(i) || "0") * 10 + "%)";
        }
      }
      if (liveEl) {
        liveEl.textContent = label + ", " + (index + 1) + " of " + items.length;
      }
    }

    function setRevealed(value) {
      if (!captionEl) return;
      captionEl.classList.toggle("is-visible", !!value);
    }

    function setFocusOpen(value) {
      if (!countEl) return;
      if (value) countEl.setAttribute("data-hidden", "");
      else countEl.removeAttribute("data-hidden");
    }

    /* ---------- 图片 ---------- */
    function loadSlot(item, index) {
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([120, 120, 120, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (anisotropy) gl.texParameterf(gl.TEXTURE_2D, anisotropyExt.TEXTURE_MAX_ANISOTROPY_EXT, anisotropy);

      var slot = {
        item: item,
        index: index,
        texture: texture,
        aspect: 0.8,
        loaded: false,
        failed: false,
        ready: 0,
        color: [0.5, 0.5, 0.5],
        image: [1, 1],
        dispose: function () {}
      };

      var image = new Image();
      image.decoding = "async";
      image.onload = function () {
        if (!alive) return;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        slot.image = [image.naturalWidth || 1, image.naturalHeight || 1];
        slot.aspect = slot.image[0] / slot.image[1];
        try {
          var probe = document.createElement("canvas");
          probe.width = 8;
          probe.height = 8;
          var ctx = probe.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(image, 0, 0, 8, 8);
            var data = ctx.getImageData(0, 0, 8, 8).data;
            var avg = [0, 0, 0];
            for (var i = 0; i < data.length; i += 4) {
              avg[0] += data[i];
              avg[1] += data[i + 1];
              avg[2] += data[i + 2];
            }
            slot.color = [avg[0] / 64 / 255, avg[1] / 64 / 255, avg[2] / 64 / 255];
          }
        } catch (e) {
          slot.color = [0.5, 0.5, 0.5];
        }
        slot.loaded = true;
        dirty = true;
        startLoop();
      };
      image.onerror = function () {
        if (!alive) return;
        slot.failed = true;
        dirty = true;
        startLoop();
      };
      image.src = item.src;
      slot.dispose = function () {
        image.onload = null;
        image.onerror = null;
        gl.deleteTexture(texture);
      };
      return slot;
    }

    function setItems(next) {
      slots.forEach(function (slot) { slot.dispose(); });
      slots = next.map(loadSlot);
      activeIndex = -1;
      layout = null;
      resnap = true;
      focus.target = 0;
      focus.t = 0;
      focus.v = 0;
      focus.pending = -1;
      setFocusOpen(false);
      introState.readyAt = performance.now();
      dirty = true;
      startLoop();
    }

    /* ---------- 布局数学 ---------- */
    function metrics(s) {
      var cardH = Math.max(24, s.cardHeight * height);
      var fixed = FIT_ASPECT[s.fit];
      var widths = slots.map(function (slot) { return (fixed || slot.aspect) * cardH; });
      var centers = [];
      var cursor = 0;
      for (var i = 0; i < widths.length; i++) {
        centers.push(cursor + widths[i] / 2);
        cursor += widths[i] + s.gap;
      }
      return { cardH: cardH, widths: widths, centers: centers, gap: s.gap, loop: Math.max(cursor, 1) };
    }

    function nearest(m, at) {
      var best = 0;
      var bestDist = Infinity;
      for (var i = 0; i < m.centers.length; i++) {
        var dist = Math.abs(wrap(m.centers[i] - at, m.loop));
        if (dist < bestDist) { bestDist = dist; best = i; }
      }
      return best;
    }

    function snapPoint(m, at) {
      var i = nearest(m, at);
      return at + wrap(m.centers[i] - at, m.loop);
    }

    function remap(from, to, at) {
      var i = nearest(from, at);
      var offset = wrap(at - from.centers[i], from.loop);
      var cycles = Math.round((at - offset - from.centers[i]) / from.loop);
      return cycles * to.loop + to.centers[i] + offset * (to.widths[i] / from.widths[i]);
    }

    function step(m, delta) {
      var at = snapPoint(m, goal);
      var index = nearest(m, at);
      var n = m.centers.length;
      for (var k2 = 0; k2 < Math.abs(delta); k2++) {
        var next = (index + (delta > 0 ? 1 : n - 1)) % n;
        var distance = delta > 0
          ? m.widths[index] / 2 + m.gap + m.widths[next] / 2
          : -(m.widths[next] / 2 + m.gap + m.widths[index] / 2);
        at += distance;
        index = next;
      }
      goal = at;
      mode = "spring";
      dirty = true;
      startLoop();
    }

    function goTo(m, index) {
      var i = ((index % m.centers.length) + m.centers.length) % m.centers.length;
      goal = goal + wrap(m.centers[i] - goal, m.loop);
      mode = "spring";
      dirty = true;
      startLoop();
    }

    function openFocus(index) {
      focus.index = index;
      focus.pending = -1;
      focus.target = 1;
      setFocusOpen(true);
      dirty = true;
      startLoop();
    }

    function closeFocus() {
      focus.pending = -1;
      if (focus.target === 0) return false;
      focus.target = 0;
      setFocusOpen(false);
      dirty = true;
      startLoop();
      return true;
    }

    function skipIntro() {
      if (introState.running) introState.t = 1;
    }

    function introEffects() {
      var t = introState.running ? introState.t : introState.done ? 1 : 0;
      var e = { sceneAlpha: 1, strength: 1, card: null };
      if (!introState.done && !introState.running) {
        e.sceneAlpha = 0;
        e.strength = 0;
        return e;
      }
      if (t >= 1) return e;
      var kind = introState.kind;
      if (kind === "rise") {
        e.strength = easeInOut((t - 0.3) / 0.65);
        e.card = function (rel) {
          var delay = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.34;
          var local = clamp01((t - delay) / 0.6);
          return {
            alpha: clamp01(local * 4),
            x: 0,
            y: (1 - easeOutQuint(local)) * height * 0.62,
            scale: 0.5 + 0.5 * easeInOut((local - 0.18) / 0.82)
          };
        };
      } else if (kind === "bloom") {
        e.strength = easeInOut((t - 0.2) / 0.8);
        e.card = function (rel) {
          var delay = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.25;
          var local = easeOut((t - delay) / 0.55);
          return { alpha: local, x: 0, y: 0, scale: 0.92 + 0.08 * local };
        };
      } else if (kind === "spin") {
        e.sceneAlpha = easeOut(t / 0.25);
        e.strength = easeOut((t - 0.55) / 0.45);
      } else if (kind === "deal") {
        e.strength = easeOut((t - 0.45) / 0.5);
        e.card = function (rel) {
          var spread = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.3;
          var local = easeOut((t - 0.12 - spread) / 0.5);
          return { alpha: easeOut((t - spread) / 0.12), x: -rel * (1 - local), y: 0, scale: 1 };
        };
      } else {
        e.sceneAlpha = easeOut(t);
        e.strength = easeOut(t);
      }
      return e;
    }

    function beginIntro(s, m) {
      var kind = reducedMotion && s.intro !== "none" ? "fade" : s.intro;
      introState.kind = INTRO_DURATION[kind] ? kind : "none";
      introState.running = introState.kind !== "none";
      introState.done = !introState.running;
      introState.t = 0;
      if (introState.done) setRevealed(true);
      if (introState.kind === "spin") {
        var distance = m.loop * 1.6 + width;
        pos = goal + distance;
        vel = -distance * 3;
        mode = "spring";
      }
    }

    /* ---------- 渲染 ---------- */
    function drawPass(prog, state, target, vao, count, blended, indexed) {
      var w = target ? target.width : canvas.width;
      var h = target ? target.height : canvas.height;
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(prog.program);
      applyUniforms(gl, prog, state);
      if (blended) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      } else {
        gl.disable(gl.BLEND);
      }
      gl.bindVertexArray(vao);
      if (indexed) gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
      else gl.drawArrays(gl.TRIANGLES, 0, count);
    }

    function applyResize() {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(PIXEL_BUDGET / (width * height)));
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      resizeTarget(gl, sceneTarget, Math.max(2, Math.round(width * dpr)), Math.max(2, Math.round(height * dpr)));
      lensUniforms.tScene = sceneTarget.texture;
      dirty = true;
    }

    var resizePending = false;

    function frame(now) {
      raf = 0;
      if (resizePending) {
        resizePending = false;
        applyResize();
      }
      if (!alive) return;
      var s = settings;
      var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      if (!slots.length) {
        if (visible) raf = requestAnimationFrame(frame);
        return;
      }

      var m = metrics(s);
      var n = slots.length;
      var animating = false;

      if (resnap) {
        goal = snapPoint(m, goal);
        pos = goal;
        vel = 0;
        resnap = false;
      } else if (layout && layout.loop !== m.loop) {
        pos = remap(layout, m, pos);
        goal = remap(layout, m, goal);
        pointer.startPos = pos + (pointer.x - pointer.startX);
        animating = true;
      }
      layout = m;

      if (!introState.running && !introState.done) {
        var allSettled = slots.every(function (slot) { return slot.loaded || slot.failed; });
        if (allSettled || now - introState.readyAt > 3500) {
          goal = snapPoint(m, goal);
          pos = goal;
          beginIntro(s, m);
        }
      }
      if (introState.running) {
        introState.t = Math.min(1, introState.t + dt / (INTRO_DURATION[introState.kind] || 1));
        if (introState.t >= 1) {
          introState.running = false;
          introState.done = true;
          setRevealed(true);
        }
        animating = true;
      }

      if (mode === "wheel" && now - wheelAt > 150) {
        goal = snapPoint(m, goal);
        mode = "spring";
      }
      if (!pointer.dragging) {
        var spinning = introState.running && introState.kind === "spin";
        var stiffness = spinning ? 9 : mode === "wheel" ? 80 : 55;
        var damping = 2 * Math.sqrt(stiffness);
        var steps = Math.ceil(dt / (1 / 240));
        var h = dt / steps;
        for (var i2 = 0; i2 < steps; i2++) {
          var acc = stiffness * (goal - pos) - damping * vel;
          vel += acc * h;
          pos += vel * h;
        }
        if (Math.abs(goal - pos) < 0.05 && Math.abs(vel) < 0.5) {
          pos = goal;
          vel = 0;
        } else {
          animating = true;
        }
      } else {
        animating = true;
      }

      if (Math.abs(pos) > m.loop * 8) {
        var shift = Math.round(pos / m.loop) * m.loop;
        pos -= shift;
        goal -= shift;
        pointer.startPos -= shift;
      }

      var currentIndex = nearest(m, pos);
      if (currentIndex !== activeIndex) {
        activeIndex = currentIndex;
        updateCaption(currentIndex);
        if (onChange) onChange(currentIndex, items[currentIndex]);
      }

      if (focus.pending >= 0 && mode === "spring" && Math.abs(goal - pos) < 1.5 && Math.abs(vel) < 30) {
        if (currentIndex === focus.pending) openFocus(currentIndex);
        else focus.pending = -1;
      }

      if (
        s.autoplay && !reducedMotion && introState.done &&
        focus.target === 0 && focus.t < 0.01 &&
        !pointer.over && !pointer.down && !hasFocus &&
        mode === "spring" && Math.abs(goal - pos) < 1 &&
        now - interactedAt > 3000 && now - autoplayAt > s.interval * 1000
      ) {
        autoplayAt = now;
        step(m, 1);
      }
      if (s.autoplay && !reducedMotion) animating = true;

      var travel = Math.abs(pos - lastPos) / dt;
      lastPos = pos;
      var energyTarget = reducedMotion ? 0 : Math.min(travel / 2600, 1);
      energy += (energyTarget - energy) * (1 - Math.exp(-dt / (energyTarget > energy ? 0.07 : 0.35)));
      if (energy > 0.001) animating = true;
      var liquidAmount = reducedMotion ? 0 : s.liquid;
      var push = Math.max(-1, Math.min(1, vel / 2200));
      var deformStiffness = 120;
      var deformDamping = 2 * Math.sqrt(deformStiffness) * 0.32;
      deformVel += (deformStiffness * (push - deform) - deformDamping * deformVel) * dt;
      deform += deformVel * dt;
      if (Math.abs(deform) > 0.0005 || Math.abs(deformVel) > 0.005) animating = true;

      var focusStiffness = 64;
      focus.v += (focusStiffness * (focus.target - focus.t) - 2 * Math.sqrt(focusStiffness) * focus.v) * dt;
      focus.t += focus.v * dt;
      if (Math.abs(focus.target - focus.t) < 0.0005 && Math.abs(focus.v) < 0.001) {
        focus.t = focus.target;
        focus.v = 0;
      } else {
        animating = true;
      }
      var focusAmount = clamp01(focus.t);
      var focusEase = easeInOut(focusAmount);
      var focusW = focus.index >= 0 && focus.index < n ? m.widths[focus.index] : m.cardH;
      var focusScale = Math.max(1, Math.min(1.3, (height * 0.84) / m.cardH, (width * 0.92) / focusW));
      var nextLift = 1 + (focusScale - 1) * focusEase;
      if (Math.abs(nextLift - lift) > 0.0005) {
        lift = nextLift;
        container.style.setProperty("--flex-carousel-lift", lift.toFixed(4));
      }

      var effects = introEffects();

      var homeX = width / 2;
      var homeY = height / 2;
      var follow = s.followCursor && pointer.over && !pointer.dragging && !pointer.touch && focus.target === 0;
      var aimX = follow ? pointer.x : homeX;
      var aimY = follow ? pointer.y : homeY;
      if (!lens.ready) {
        lens.x = homeX;
        lens.y = homeY;
        lens.ready = true;
      }
      var lensK = 110;
      var lensC = 2 * Math.sqrt(lensK) * 0.8;
      lens.vx += (lensK * (aimX - lens.x) - lensC * lens.vx) * dt;
      lens.vy += (lensK * (aimY - lens.y) - lensC * lens.vy) * dt;
      lens.x += lens.vx * dt;
      lens.y += lens.vy * dt;
      if (Math.abs(aimX - lens.x) + Math.abs(aimY - lens.y) > 0.2 || Math.abs(lens.vx) + Math.abs(lens.vy) > 0.5) {
        animating = true;
      }

      var cardH = m.cardH;
      var halfW = (s.lensWidth * width) / 2;
      var halfH = (s.lensHeight * width) / 2;
      var squash = Math.abs(deform) * liquidAmount;
      halfW *= 1 + squash * 0.16;
      halfH *= 1 - squash * 0.08;
      var lensX = lens.x - deform * 14 * liquidAmount;

      for (var i3 = 0; i3 < n; i3++) {
        var slotA = slots[i3];
        if (slotA.loaded && slotA.ready < 1) {
          slotA.ready = Math.min(1, slotA.ready + dt / 0.45);
          animating = true;
        }
      }

      var waiting = !introState.done;
      if (dirty || animating || pointer.dragging) {
        dirty = false;
        instances = [];
        cardUniforms.uResolution = [width, height];
        cardUniforms.uDpr = dpr;
        cardUniforms.uRadius = s.radius;
        var shrink = 1 - clamp01(s.squeeze) * energy;
        var draws = [];
        for (var i4 = 0; i4 < n; i4++) {
          var w = m.widths[i4];
          var baseRel = wrap(m.centers[i4] - pos, m.loop);
          for (var kk = -3; kk <= 3; kk++) {
            var rel = baseRel + kk * m.loop;
            if (Math.abs(rel) - w / 2 > width + 40) continue;
            var fx = effects.card ? effects.card(rel) : null;
            var x = homeX + rel + (fx ? fx.x : 0);
            var scale = shrink * (fx ? fx.scale : 1);
            var alpha = fx ? fx.alpha : 1;
            if (focusAmount > 0) {
              if (i4 === focus.index && Math.abs(rel) < w) {
                scale *= 1 + (focusScale - 1) * focusEase;
              } else {
                var order = Math.min(Math.abs(rel) / width, 1) * 0.25;
                var part = easeInOut(focusAmount * 1.25 - order);
                x += Math.sign(rel) * part * width * 0.7;
                alpha *= 1 - part;
              }
            }
            var cw = w * scale;
            if (alpha <= 0.001 || x + cw / 2 < -40 || x - cw / 2 > width + 40) continue;
            draws.push({
              i: i4, rel: rel, x: x, y: homeY + (fx ? fx.y : 0),
              cw: cw, ch: cardH * scale, alpha: alpha
            });
          }
        }
        draws.sort(function (a, b) { return Math.abs(b.rel) - Math.abs(a.rel); });

        var first = true;
        for (var d2 = 0; d2 < draws.length; d2++) {
          var draw = draws[d2];
          var slot = slots[draw.i];
          cardUniforms.tMap = slot.texture;
          cardUniforms.uRect = [draw.x, draw.y, draw.cw + 2, draw.ch + 2];
          cardUniforms.uSize = [draw.cw, draw.ch];
          cardUniforms.uImage = slot.image;
          cardUniforms.uAlpha = draw.alpha;
          cardUniforms.uReady = slot.ready;
          cardUniforms.uShift = reducedMotion ? 0 : Math.max(-1, Math.min(1, draw.rel / (width * 0.75)));
          cardUniforms.uPlaceholder = slot.color;
          if (first) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, sceneTarget.framebuffer);
            gl.viewport(0, 0, sceneTarget.width, sceneTarget.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            first = false;
          }
          drawPass(cardProg, cardUniforms, sceneTarget, cardVAO, 6, true, true);
          instances.push({
            index: draw.i,
            x0: draw.x - draw.cw / 2,
            x1: draw.x + draw.cw / 2,
            y0: draw.y - draw.ch / 2,
            y1: draw.y + draw.ch / 2
          });
        }
        if (first) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, sceneTarget.framebuffer);
          gl.viewport(0, 0, sceneTarget.width, sceneTarget.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, sceneTarget.texture);
        gl.generateMipmap(gl.TEXTURE_2D);

        lensUniforms.uResolution = [width, height];
        lensUniforms.uDpr = dpr;
        lensUniforms.uCenter = [lensX, lens.y];
        lensUniforms.uHalf = [Math.max(halfW, 1), Math.max(halfH, 1)];
        lensUniforms.uAngle = (s.tilt * Math.PI) / 180;
        lensUniforms.uExponent = 2 + Math.pow(1 - clamp01(s.roundness), 1.5) * 10;
        var spanW = Math.max(halfW, 1);
        var spanH = Math.max(halfH, 1);
        var inner = Math.max(4, s.reach * (spanW + spanH) * 0.5);
        lensUniforms.uInner = inner;
        lensUniforms.uOuter = inner * 1.6;
        lensUniforms.uFlow = s.bend * (spanW + spanH) * 0.45;
        lensUniforms.uCurl = s.curl === "rise" ? 1 : s.curl === "fall" ? -1 : 0;
        lensUniforms.uDispersion = s.dispersion * 0.12 * (1 + Math.abs(deform) * liquidAmount * 1.2);
        lensUniforms.uStrength = effects.strength * (1 - focusEase);
        lensUniforms.uSceneAlpha = effects.sceneAlpha;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        drawPass(lensProg, lensUniforms, null, triVAO, 3, false);
      }

      var nextHover = "";
      if (pointer.over && !pointer.dragging && introState.done && s.focusOnClick) {
        var hit = null;
        for (var q = 0; q < instances.length; q++) {
          var inst = instances[q];
          if (pointer.x >= inst.x0 && pointer.x <= inst.x1 && pointer.y >= inst.y0 && pointer.y <= inst.y1) {
            hit = inst;
            break;
          }
        }
        if (focus.target > 0) nextHover = "close";
        else if (hit) nextHover = "open";
      }
      if (nextHover !== hover) {
        hover = nextHover;
        if (hover) container.setAttribute("data-hover", hover);
        else container.removeAttribute("data-hover");
      }

      if (visible && (animating || waiting || dirty || pointer.down)) {
        raf = requestAnimationFrame(frame);
      }
    }

    function startLoop() {
      if (raf || !visible || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    /* ---------- 交互 ---------- */
    function localPoint(e) {
      var rect = container.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    }

    function onPointerDown(e) {
      if (e.button !== undefined && e.button > 0) return;
      skipIntro();
      var point = localPoint(e);
      pointer.down = true;
      pointer.id = e.pointerId;
      pointer.touch = e.pointerType === "touch";
      pointer.startX = point[0];
      pointer.startY = point[1];
      pointer.x = point[0];
      pointer.y = point[1];
      pointer.startPos = pos;
      pointer.dragging = false;
      pointer.samples = [{ x: point[0], t: performance.now() }];
      interactedAt = performance.now();
      if (Math.abs(vel) > 40) {
        goal = pos;
        vel = 0;
      }
      dirty = true;
      startLoop();
    }

    function onPointerMove(e) {
      var point = localPoint(e);
      pointer.x = point[0];
      pointer.y = point[1];
      pointer.over = true;
      if (pointer.down && e.pointerId === pointer.id) {
        var dx = point[0] - pointer.startX;
        var dy = point[1] - pointer.startY;
        var slop = pointer.touch ? 10 : 5;
        if (!pointer.dragging) {
          if (pointer.touch && Math.abs(dy) > slop && Math.abs(dy) > Math.abs(dx)) {
            pointer.down = false;
            return;
          }
          if (Math.abs(dx) > slop) {
            pointer.dragging = true;
            pointer.startX = point[0];
            pointer.startPos = pos;
            closeFocus();
            try {
              container.setPointerCapture(e.pointerId);
            } catch (err) {
              pointer.dragging = true;
            }
            container.setAttribute("data-dragging", "");
          }
        }
        if (pointer.dragging) {
          pos = pointer.startPos - (point[0] - pointer.startX);
          goal = pos;
          vel = 0;
          var now = performance.now();
          pointer.samples.push({ x: point[0], t: now });
          while (pointer.samples.length > 2 && now - pointer.samples[0].t > 100) pointer.samples.shift();
        }
      }
      dirty = true;
      startLoop();
    }

    function onPointerUp(e) {
      if (!pointer.down || e.pointerId !== pointer.id) return;
      pointer.down = false;
      container.removeAttribute("data-dragging");
      var s = settings;
      var m = metrics(s);
      interactedAt = performance.now();
      if (pointer.dragging) {
        pointer.dragging = false;
        var now = performance.now();
        var firstSample = pointer.samples[0];
        var lastSample = pointer.samples[pointer.samples.length - 1];
        var velocity = 0;
        if (firstSample && lastSample && lastSample.t > firstSample.t && now - lastSample.t < 70) {
          velocity = -((lastSample.x - firstSample.x) / (lastSample.t - firstSample.t)) * 1000;
        }
        vel = velocity;
        var landing = snapPoint(m, pos + velocity * 0.32);
        goal = landing;
        if (Math.abs(velocity) > 400 && Math.abs(landing - pos) < 1) step(m, velocity > 0 ? 1 : -1);
        mode = "spring";
        startLoop();
        return;
      }
      if (closeFocus()) return;
      var point = localPoint(e);
      var hit = null;
      for (var i = 0; i < instances.length; i++) {
        var inst = instances[i];
        if (point[0] >= inst.x0 && point[0] <= inst.x1 && point[1] >= inst.y0 && point[1] <= inst.y1) {
          hit = inst;
          break;
        }
      }
      if (!hit) return;
      if (hit.index === activeIndex) {
        if (onSelect) onSelect(hit.index, items[hit.index]);
        if (s.focusOnClick) openFocus(hit.index);
      } else {
        var rel = (hit.x0 + hit.x1) / 2 - width / 2;
        goal = snapPoint(m, pos + rel);
        mode = "spring";
        if (s.focusOnClick) focus.pending = hit.index;
        startLoop();
      }
    }

    function onPointerLeave() {
      pointer.over = false;
      dirty = true;
      startLoop();
    }

    function onPointerCancel() {
      pointer.down = false;
      pointer.dragging = false;
      container.removeAttribute("data-dragging");
      goal = snapPoint(metrics(settings), pos);
      mode = "spring";
      startLoop();
    }

    function onWheel(e) {
      if (e.ctrlKey) return;
      var dx = e.deltaX;
      var dy = e.deltaY;
      if (e.shiftKey && Math.abs(dx) < Math.abs(dy)) {
        dx = dy;
        dy = 0;
      }
      var unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1;
      var horizontal = Math.abs(dx) > Math.abs(dy);
      if (!horizontal && !settings.captureWheel) return;
      e.preventDefault();
      skipIntro();
      interactedAt = performance.now();
      if (closeFocus()) return;
      var delta = Math.max(-120, Math.min(120, (horizontal ? dx : dy) * unit));
      goal += delta * 1.25;
      mode = "wheel";
      wheelAt = performance.now();
      startLoop();
    }

    function onKeyDown(e) {
      var m = metrics(settings);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        skipIntro();
        closeFocus();
        interactedAt = performance.now();
        step(m, 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        skipIntro();
        closeFocus();
        interactedAt = performance.now();
        step(m, -1);
      } else if (e.key === "Home") {
        e.preventDefault();
        closeFocus();
        goTo(m, 0);
      } else if (e.key === "End") {
        e.preventDefault();
        closeFocus();
        goTo(m, slots.length - 1);
      } else if (e.key === "Escape") {
        if (closeFocus()) e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (closeFocus() || activeIndex < 0) return;
        if (onSelect) onSelect(activeIndex, items[activeIndex]);
        if (settings.focusOnClick) openFocus(activeIndex);
      }
    }

    function onFocus() { hasFocus = true; }
    function onBlur() { hasFocus = false; }
    function onVisibility() { if (!document.hidden) startLoop(); }
    function onResize() {
      resizePending = true;
      startLoop();
    }

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("pointercancel", onPointerCancel);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("keydown", onKeyDown);
    container.addEventListener("focus", onFocus);
    container.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    var observer = null;
    if (window.ResizeObserver) {
      observer = new ResizeObserver(onResize);
      observer.observe(container);
    }
    window.addEventListener("resize", onResize);

    buildCaption();
    applyResize();
    setItems(items);
    startLoop();

    return {
      wake: function () {
        dirty = true;
        startLoop();
      },
      destroy: function () {
        alive = false;
        visible = false;
        cancelAnimationFrame(raf);
        if (observer) observer.disconnect();
        window.removeEventListener("resize", onResize);
        container.removeEventListener("pointerdown", onPointerDown);
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerup", onPointerUp);
        container.removeEventListener("pointerleave", onPointerLeave);
        container.removeEventListener("pointercancel", onPointerCancel);
        container.removeEventListener("wheel", onWheel);
        container.removeEventListener("keydown", onKeyDown);
        container.removeEventListener("focus", onFocus);
        container.removeEventListener("blur", onBlur);
        document.removeEventListener("visibilitychange", onVisibility);
        container.classList.remove("flex-carousel");
        container.removeAttribute("data-hover");
        container.removeAttribute("data-dragging");
        slots.forEach(function (slot) { slot.dispose(); });
        slots = [];
        if (captionEl && captionEl.parentNode) captionEl.parentNode.removeChild(captionEl);
        if (liveEl && liveEl.parentNode) liveEl.parentNode.removeChild(liveEl);
        gl.deleteFramebuffer(sceneTarget.framebuffer);
        gl.deleteTexture(sceneTarget.texture);
        gl.deleteBuffer(triBuf);
        gl.deleteVertexArray(triVAO);
        gl.deleteBuffer(cardPos);
        gl.deleteBuffer(cardUv);
        gl.deleteBuffer(cardIndex);
        gl.deleteVertexArray(cardVAO);
        gl.deleteProgram(cardProg.program);
        gl.deleteProgram(lensProg.program);
        var ext = gl.getExtension("WEBGL_lose_context");
        if (ext) ext.loseContext();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  window.FlexCarousel = { mount: mount, unmount: unmount };
})();
