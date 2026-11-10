/* ============================================================
 * Ring Star — MicroSlats 液态条带背景
 * ------------------------------------------------------------
 * 由原 React + ogl 组件移植为原生 WebGL2 实现（无外部依赖）。
 * 用法：MicroSlats.mount(container, options); MicroSlats.unmount();
 * 不支持 WebGL2 时静默回退到页面原有渐变背景。
 * ============================================================ */
(function () {
  "use strict";

  var PRESETS = {
    swell: {
      scale: 1.5, speed: 0.6, direction: 250, chop: 0.55, stretch: 0,
      glint: 0.7, contrast: 1.25, perspective: 0.55, fog: 0.55
    },
    tide: {
      scale: 1.3, speed: 0.5, direction: 262, chop: 0.2, stretch: 0.12,
      glint: 0.45, contrast: 1.1, perspective: 0.5, fog: 0.4
    },
    storm: {
      scale: 0.55, speed: 1.6, direction: 236, chop: 1, stretch: 0.3,
      glint: 1.3, contrast: 1.8, perspective: 0.8, fog: 0.35
    },
    signal: {
      scale: 0.85, speed: 1.2, direction: 180, chop: 0.6, stretch: 0.85,
      glint: 0.25, contrast: 1.2, perspective: 0, fog: 0
    }
  };

  var DEFAULTS = {
    preset: "swell",
    color: "#A855F7",
    glintColor: "#ffffff",
    backgroundColor: "#120f17",
    slatWidth: 10,
    slatHeight: 25,
    gap: 3,
    roundness: 0.75,
    interactive: true,
    cursorStrength: 1,
    cursorSize: 40,
    swirl: 0,
    trail: 1.4,
    lean: 0,
    intro: true,
    introDuration: 1.5,
    paused: false
  };

  var FLUID_SIZE = 96;
  var PRESSURE_STEPS = 16;
  var SPLAT_FORCE = 6900;
  var SPLASH_JETS = 3;
  var PIXEL_BUDGET = 4.5e6;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function parseColor(value, fallback) {
    try {
      var ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return fallback;
      ctx.fillStyle = "#000000";
      ctx.fillStyle = value;
      var resolved = ctx.fillStyle;
      if (resolved.charAt(0) === "#") {
        var n = parseInt(resolved.slice(1), 16);
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
      }
      var parts = resolved.match(/[\d.]+/g);
      if (!parts || parts.length < 3) return fallback;
      return [
        Number(parts[0]) / 255,
        Number(parts[1]) / 255,
        Number(parts[2]) / 255,
        parts[3] ? Number(parts[3]) : 1
      ];
    } catch (e) {
      return fallback;
    }
  }

  /* ---------------- 着色器 ---------------- */

  var passVS = "#version 300 es\n" +
    "in vec2 position;\n" +
    "void main() {\n" +
    "  gl_Position = vec4(position, 0.0, 1.0);\n" +
    "}\n";

  var fluidVS = "#version 300 es\n" +
    "in vec2 position;\n" +
    "uniform vec2 uTexel;\n" +
    "out vec2 vUv;\n" +
    "out vec2 vL;\n" +
    "out vec2 vR;\n" +
    "out vec2 vT;\n" +
    "out vec2 vB;\n" +
    "void main() {\n" +
    "  vUv = position * 0.5 + 0.5;\n" +
    "  vL = vUv - vec2(uTexel.x, 0.0);\n" +
    "  vR = vUv + vec2(uTexel.x, 0.0);\n" +
    "  vT = vUv + vec2(0.0, uTexel.y);\n" +
    "  vB = vUv - vec2(0.0, uTexel.y);\n" +
    "  gl_Position = vec4(position, 0.0, 1.0);\n" +
    "}\n";

  var fluidHead = "#version 300 es\n" +
    "precision highp float;\n" +
    "in vec2 vUv;\n" +
    "in vec2 vL;\n" +
    "in vec2 vR;\n" +
    "in vec2 vT;\n" +
    "in vec2 vB;\n" +
    "out vec4 fragColor;\n";

  var splatFS = fluidHead +
    "uniform sampler2D uTarget;\n" +
    "uniform float uAspect;\n" +
    "uniform vec2 uPoint;\n" +
    "uniform vec3 uValue;\n" +
    "uniform float uRadius;\n" +
    "void main() {\n" +
    "  vec2 offset = vUv - uPoint;\n" +
    "  offset.x *= uAspect;\n" +
    "  float falloff = exp(-dot(offset, offset) / uRadius);\n" +
    "  fragColor = vec4(texture(uTarget, vUv).xyz + uValue * falloff, 1.0);\n" +
    "}\n";

  var curlFS = fluidHead +
    "uniform sampler2D uVelocity;\n" +
    "void main() {\n" +
    "  float left = texture(uVelocity, vL).y;\n" +
    "  float right = texture(uVelocity, vR).y;\n" +
    "  float top = texture(uVelocity, vT).x;\n" +
    "  float bottom = texture(uVelocity, vB).x;\n" +
    "  fragColor = vec4(0.5 * (right - left - top + bottom), 0.0, 0.0, 1.0);\n" +
    "}\n";

  var vorticityFS = fluidHead +
    "uniform sampler2D uVelocity;\n" +
    "uniform sampler2D uCurl;\n" +
    "uniform float uSwirl;\n" +
    "uniform float uDt;\n" +
    "void main() {\n" +
    "  float left = texture(uCurl, vL).x;\n" +
    "  float right = texture(uCurl, vR).x;\n" +
    "  float top = texture(uCurl, vT).x;\n" +
    "  float bottom = texture(uCurl, vB).x;\n" +
    "  float middle = texture(uCurl, vUv).x;\n" +
    "  vec2 force = 0.5 * vec2(abs(top) - abs(bottom), abs(right) - abs(left));\n" +
    "  force = force / (length(force) + 0.0001) * uSwirl * middle;\n" +
    "  force.y = -force.y;\n" +
    "  vec2 velocity = texture(uVelocity, vUv).xy + force * uDt;\n" +
    "  fragColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);\n" +
    "}\n";

  var divergenceFS = fluidHead +
    "uniform sampler2D uVelocity;\n" +
    "void main() {\n" +
    "  vec2 middle = texture(uVelocity, vUv).xy;\n" +
    "  float left = vL.x < 0.0 ? -middle.x : texture(uVelocity, vL).x;\n" +
    "  float right = vR.x > 1.0 ? -middle.x : texture(uVelocity, vR).x;\n" +
    "  float top = vT.y > 1.0 ? -middle.y : texture(uVelocity, vT).y;\n" +
    "  float bottom = vB.y < 0.0 ? -middle.y : texture(uVelocity, vB).y;\n" +
    "  fragColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);\n" +
    "}\n";

  var pressureFS = fluidHead +
    "uniform sampler2D uPressure;\n" +
    "uniform sampler2D uDivergence;\n" +
    "void main() {\n" +
    "  float left = texture(uPressure, vL).x;\n" +
    "  float right = texture(uPressure, vR).x;\n" +
    "  float top = texture(uPressure, vT).x;\n" +
    "  float bottom = texture(uPressure, vB).x;\n" +
    "  float divergence = texture(uDivergence, vUv).x;\n" +
    "  fragColor = vec4((left + right + top + bottom - divergence) * 0.25, 0.0, 0.0, 1.0);\n" +
    "}\n";

  var projectFS = fluidHead +
    "uniform sampler2D uPressure;\n" +
    "uniform sampler2D uVelocity;\n" +
    "void main() {\n" +
    "  float left = texture(uPressure, vL).x;\n" +
    "  float right = texture(uPressure, vR).x;\n" +
    "  float top = texture(uPressure, vT).x;\n" +
    "  float bottom = texture(uPressure, vB).x;\n" +
    "  vec2 velocity = texture(uVelocity, vUv).xy - vec2(right - left, top - bottom);\n" +
    "  fragColor = vec4(velocity, 0.0, 1.0);\n" +
    "}\n";

  var advectFS = fluidHead +
    "uniform sampler2D uVelocity;\n" +
    "uniform sampler2D uSource;\n" +
    "uniform vec2 uTexel;\n" +
    "uniform float uDt;\n" +
    "uniform float uFade;\n" +
    "void main() {\n" +
    "  vec2 from = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;\n" +
    "  fragColor = texture(uSource, from) / (1.0 + uFade * uDt);\n" +
    "}\n";

  var scaleFS = fluidHead +
    "uniform sampler2D uSource;\n" +
    "uniform float uValue;\n" +
    "void main() {\n" +
    "  fragColor = texture(uSource, vUv) * uValue;\n" +
    "}\n";

  var fieldFS = "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform vec2 uSize;\n" +
    "uniform vec4 uGrid;\n" +
    "uniform vec2 uOrigin;\n" +
    "uniform vec2 uSlat;\n" +
    "uniform float uTime;\n" +
    "uniform float uScale;\n" +
    "uniform float uDirection;\n" +
    "uniform float uChop;\n" +
    "uniform float uStretch;\n" +
    "uniform float uGlint;\n" +
    "uniform float uContrast;\n" +
    "uniform float uPerspective;\n" +
    "uniform float uFog;\n" +
    "uniform float uIntro;\n" +
    "uniform sampler2D tVelocity;\n" +
    "uniform sampler2D tInk;\n" +
    "uniform vec2 uFluidTexel;\n" +
    "uniform float uFluid;\n" +
    "uniform float uInk;\n" +
    "uniform float uLean;\n" +
    "out vec4 fragColor;\n" +
    "const float TURN[4] = float[4](0.0, -0.95, 0.78, 1.62);\n" +
    "const float LENGTH[4] = float[4](2.6, 1.7, 1.12, 0.76);\n" +
    "const float HEIGHT[4] = float[4](1.0, 0.75, 0.5, 0.3);\n" +
    "const float SHIFT[4] = float[4](0.0, 2.3, 4.1, 1.1);\n" +
    "void main() {\n" +
    "  vec2 cell = floor(gl_FragCoord.xy);\n" +
    "  float row = uGrid.y - 1.0 - cell.y;\n" +
    "  vec2 center = uOrigin + vec2(cell.x, row) * uGrid.zw + uSlat * 0.5;\n" +
    "  float v = clamp(center.y / uSize.y, 0.0, 1.0);\n" +
    "  vec2 flow = vec2(0.0);\n" +
    "  float ink = 0.0;\n" +
    "  if (uFluid > 0.5) {\n" +
    "    vec2 fluidUv = clamp(vec2(center.x / uSize.x, 1.0 - center.y / uSize.y), 0.0, 1.0);\n" +
    "    flow = texture(tVelocity, fluidUv).xy * uFluidTexel * uSize;\n" +
    "    ink = texture(tInk, fluidUv).x;\n" +
    "  }\n" +
    "  float horizon = mix(8.0, 0.5, uPerspective);\n" +
    "  float depth = (1.0 + horizon) / (v + horizon);\n" +
    "  vec2 world = vec2((center.x - uSize.x * 0.5) / uSize.y * depth, (depth - 1.0) * horizon * 2.2);\n" +
    "  world -= flow * 0.00018 * depth;\n" +
    "  world /= max(uScale, 0.05);\n" +
    "  float meander = 0.55 * sin(dot(world, vec2(0.23, 0.41)) * 0.9 + uTime * 0.13)\n" +
    "    + 0.3 * sin(dot(world, vec2(-0.37, 0.19)) * 1.4 - uTime * 0.09);\n" +
    "  float steep = uChop * 0.45;\n" +
    "  float height = 0.0;\n" +
    "  float total = 0.0;\n" +
    "  for (int i = 0; i < 4; i++) {\n" +
    "    float angle = uDirection + TURN[i];\n" +
    "    vec2 heading = vec2(cos(angle), sin(angle));\n" +
    "    float k = 6.2831853 / LENGTH[i];\n" +
    "    float omega = sqrt(9.81 * k) * 0.35;\n" +
    "    float theta = k * dot(world, heading) - omega * uTime + SHIFT[i] + meander * (0.6 + 0.3 * float(i));\n" +
    "    height += HEIGHT[i] * (cos(theta) + steep * cos(2.0 * theta));\n" +
    "    total += HEIGHT[i] * (1.0 + steep);\n" +
    "  }\n" +
    "  float level = clamp(0.5 + 0.5 * height / (total * 0.85), 0.0, 1.0);\n" +
    "  float crest = smoothstep(0.6, 1.0, level);\n" +
    "  float glint = crest * crest * uGlint;\n" +
    "  float haze = mix(1.0, 1.0 - uFog, pow(1.0 - v, 1.4));\n" +
    "  float light = (pow(level, uContrast) + glint * 0.8) * haze;\n" +
    "  float glow = 1.0 - exp(-max(ink, 0.0) * uInk * 1.6);\n" +
    "  light = 1.0 - (1.0 - clamp(light, 0.0, 1.0)) * (1.0 - glow);\n" +
    "  float front = uIntro * 1.35;\n" +
    "  float reveal = 1.0 - smoothstep(front - 0.35, front, v);\n" +
    "  float sweep = exp(-pow((v - front + 0.22) / 0.07, 2.0)) * (1.0 - uIntro);\n" +
    "  light = (light + sweep * 0.8) * reveal;\n" +
    "  light = max(light, 0.045 * reveal);\n" +
    "  float span = mix(1.0 - uStretch, 1.0, level) + glow * 0.3;\n" +
    "  span = clamp(span, 0.08, 1.0) * mix(0.1, 1.0, reveal);\n" +
    "  float tint = clamp(max(glint * 1.4, glow * 0.9) + sweep, 0.0, 1.0);\n" +
    "  float lean = clamp(flow.x / 1400.0, -1.0, 1.0) * uLean * reveal;\n" +
    "  fragColor = vec4(clamp(light, 0.0, 1.0), span, tint, 0.5 + 0.5 * lean);\n" +
    "}\n";

  var slatFS = "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform sampler2D tField;\n" +
    "uniform vec2 uSize;\n" +
    "uniform float uDpr;\n" +
    "uniform vec4 uGrid;\n" +
    "uniform vec2 uOrigin;\n" +
    "uniform vec2 uSlat;\n" +
    "uniform float uRound;\n" +
    "uniform float uTilt;\n" +
    "uniform vec3 uColor;\n" +
    "uniform vec3 uGlintColor;\n" +
    "uniform vec4 uBackground;\n" +
    "out vec4 fragColor;\n" +
    "float pill(vec2 p, vec2 b, float r) {\n" +
    "  vec2 q = abs(p) - b + r;\n" +
    "  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;\n" +
    "}\n" +
    "void main() {\n" +
    "  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;\n" +
    "  vec2 local = p - uOrigin;\n" +
    "  vec2 cell = floor(local / uGrid.zw);\n" +
    "  vec4 background = vec4(uBackground.rgb * uBackground.a, uBackground.a);\n" +
    "  vec4 slat = vec4(0.0);\n" +
    "  int reach = uTilt > 0.0 ? 1 : 0;\n" +
    "  for (int dx = -1; dx <= 1; dx++) {\n" +
    "    if (abs(dx) > reach) continue;\n" +
    "    vec2 neighbour = cell + vec2(float(dx), 0.0);\n" +
    "    if (neighbour.x < 0.0 || neighbour.y < 0.0 || neighbour.x >= uGrid.x || neighbour.y >= uGrid.y) continue;\n" +
    "    vec4 field = texelFetch(tField, ivec2(int(neighbour.x), int(uGrid.y - 1.0 - neighbour.y)), 0);\n" +
    "    vec2 offset = local - neighbour * uGrid.zw - uSlat * 0.5;\n" +
    "    float angle = (field.a - 0.5) * 2.0 * uTilt;\n" +
    "    float c = cos(angle);\n" +
    "    float s = sin(angle);\n" +
    "    vec2 turned = vec2(c * offset.x + s * offset.y, c * offset.y - s * offset.x);\n" +
    "    vec2 halfSize = vec2(uSlat.x * 0.5, uSlat.y * 0.5 * field.g);\n" +
    "    float radius = uRound * min(halfSize.x, halfSize.y);\n" +
    "    float alpha = clamp(0.5 - pill(turned, halfSize, radius) * uDpr, 0.0, 1.0) * field.r;\n" +
    "    if (alpha > slat.a) slat = vec4(mix(uColor, uGlintColor, field.b) * alpha, alpha);\n" +
    "  }\n" +
    "  fragColor = slat + background * (1.0 - slat.a);\n" +
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

  function makeProgram(gl, vsSrc, fsSrc) {
    var program = gl.createProgram();
    var vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
    var fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, "position");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("program link failed: " + gl.getProgramInfoLog(program));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    var uniforms = {};
    for (var i = 0; i < count; i++) {
      var info = gl.getActiveUniform(program, i);
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
        case gl.FLOAT:
          gl.uniform1f(u.loc, v);
          break;
        case gl.FLOAT_VEC2:
          gl.uniform2fv(u.loc, v);
          break;
        case gl.FLOAT_VEC3:
          gl.uniform3fv(u.loc, v);
          break;
        case gl.FLOAT_VEC4:
          gl.uniform4fv(u.loc, v);
          break;
        case gl.SAMPLER_2D:
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, v);
          gl.uniform1i(u.loc, unit);
          unit += 1;
          break;
        default:
          break;
      }
    }
  }

  function createTarget(gl, w, h, opts) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, opts.internalFormat, w, h, 0, opts.format, opts.type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opts.filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opts.filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    var complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture: tex, framebuffer: fb, width: w, height: h, complete: complete };
  }

  function disposeTarget(gl, target) {
    if (!target) return;
    gl.deleteFramebuffer(target.framebuffer);
    gl.deleteTexture(target.texture);
  }

  /* ---------------- 实例 ---------------- */

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
      if (window.console) console.warn("[MicroSlats]", err);
      current = null;
      return null;
    }
    return current;
  }

  function unmount() {
    if (!current) return;
    try {
      current();
    } catch (e) {
      /* 忽略销毁异常 */
    }
    current = null;
  }

  function start(container, canvas, gl, options) {
    var s = {};
    var key;
    for (key in DEFAULTS) s[key] = DEFAULTS[key];
    var preset = PRESETS[options.preset || DEFAULTS.preset] || PRESETS.swell;
    for (key in preset) s[key] = preset[key];
    for (key in options) {
      if (options[key] !== undefined && options[key] !== null) s[key] = options[key];
    }

    var colors = {
      color: parseColor(s.color, [0.66, 0.33, 0.97, 1]),
      glintColor: parseColor(s.glintColor, [1, 1, 1, 1]),
      backgroundColor: parseColor(s.backgroundColor, [0, 0, 0, 1])
    };

    canvas.className = "slats-bg";
    canvas.setAttribute("aria-hidden", "true");
    container.insertBefore(canvas, container.firstChild);

    gl.clearColor(0, 0, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var blank = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, blank);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var floatTargets = !!(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"));

    var fieldTarget = createTarget(gl, 1, 1, {
      internalFormat: gl.RGBA,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      filter: gl.NEAREST
    });

    var fieldUniforms = {
      uSize: [1, 1],
      uGrid: [1, 1, 1, 1],
      uOrigin: [0, 0],
      uSlat: [1, 1],
      uTime: 0,
      uScale: 1,
      uDirection: 0,
      uChop: 0.5,
      uStretch: 0.3,
      uGlint: 1,
      uContrast: 1,
      uPerspective: 0.7,
      uFog: 0.5,
      uIntro: 0,
      tVelocity: blank,
      tInk: blank,
      uFluidTexel: [1, 1],
      uFluid: 0,
      uInk: 1,
      uLean: 0.5
    };

    var slatUniforms = {
      tField: fieldTarget.texture,
      uSize: [1, 1],
      uDpr: 1,
      uGrid: [1, 1, 1, 1],
      uOrigin: [0, 0],
      uSlat: [1, 1],
      uRound: 1,
      uTilt: 0,
      uColor: [1, 1, 1],
      uGlintColor: [1, 1, 1],
      uBackground: [0, 0, 0, 1]
    };

    var fieldPass = { prog: makeProgram(gl, passVS, fieldFS), state: fieldUniforms };
    var slatPass = { prog: makeProgram(gl, passVS, slatFS), state: slatUniforms };

    var fluidTexel = [1, 1];

    function fluidPass(fragment, state) {
      var full = { uTexel: fluidTexel };
      for (var n in state) full[n] = state[n];
      return { prog: makeProgram(gl, fluidVS, fragment), state: full };
    }

    var splatPass = fluidPass(splatFS, {
      uTarget: blank, uAspect: 1, uPoint: [0, 0], uValue: [0, 0, 0], uRadius: 0.01
    });
    var curlPass = fluidPass(curlFS, { uVelocity: blank });
    var vorticityPass = fluidPass(vorticityFS, { uVelocity: blank, uCurl: blank, uSwirl: 20, uDt: 0.016 });
    var divergencePass = fluidPass(divergenceFS, { uVelocity: blank });
    var pressurePass = fluidPass(pressureFS, { uPressure: blank, uDivergence: blank });
    var projectPass = fluidPass(projectFS, { uPressure: blank, uVelocity: blank });
    var advectPass = fluidPass(advectFS, { uVelocity: blank, uSource: blank, uDt: 0.016, uFade: 1 });
    var scalePass = fluidPass(scaleFS, { uSource: blank, uValue: 0 });

    var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var width = 1;
    var height = 1;
    var dpr = 1;
    var raf = 0;
    var last = performance.now();
    var time = 0;
    var introClock = 0;
    var visible = true;
    var alive = true;
    var fluid = null;
    var fluidUntil = 0;
    var fluidDirty = false;
    var splashTurn = 0;
    var splats = [];
    var pointer = { x: 0, y: 0, tracked: false };

    function draw(pass, target) {
      var w = target ? target.width : canvas.width;
      var h = target ? target.height : canvas.height;
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(pass.prog.program);
      applyUniforms(gl, pass.prog, pass.state);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function run(pass, target) {
      draw(pass, target);
    }

    function floatTarget(w, h) {
      return createTarget(gl, w, h, {
        internalFormat: gl.RGBA16F,
        format: gl.RGBA,
        type: gl.HALF_FLOAT,
        filter: gl.LINEAR
      });
    }

    function swapPair(w, h) {
      return {
        read: floatTarget(w, h),
        write: floatTarget(w, h),
        swap: function () {
          var next = this.read;
          this.read = this.write;
          this.write = next;
        }
      };
    }

    function disposeFluid() {
      if (!fluid) return;
      [fluid.velocity, fluid.ink, fluid.pressure].forEach(function (pair) {
        disposeTarget(gl, pair.read);
        disposeTarget(gl, pair.write);
      });
      disposeTarget(gl, fluid.divergence);
      disposeTarget(gl, fluid.curl);
      fluid = null;
    }

    function buildFluid() {
      if (!floatTargets) return;
      var aspect = width / height;
      var w = Math.max(8, Math.round(aspect >= 1 ? FLUID_SIZE * aspect : FLUID_SIZE));
      var h = Math.max(8, Math.round(aspect >= 1 ? FLUID_SIZE : FLUID_SIZE / aspect));
      if (fluid && fluid.width === w && fluid.height === h) return;
      disposeFluid();
      fluid = {
        width: w,
        height: h,
        velocity: swapPair(w, h),
        ink: swapPair(w, h),
        pressure: swapPair(w, h),
        divergence: floatTarget(w, h),
        curl: floatTarget(w, h)
      };
      fluidTexel[0] = 1 / w;
      fluidTexel[1] = 1 / h;
    }

    function applyResize() {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(PIXEL_BUDGET / (width * height)));
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      buildFluid();
    }

    function layout() {
      var slatW = clamp(s.slatWidth, 1, 64);
      var slatH = clamp(s.slatHeight, 2, 240);
      var gapSize = clamp(s.gap, 0, 64);
      var pitchX = slatW + gapSize;
      var pitchY = slatH + gapSize;
      var cols = Math.min(2048, Math.ceil((width + gapSize) / pitchX) + 1);
      var rows = Math.min(2048, Math.ceil((height + gapSize) / pitchY) + 1);
      var originX = (width - (cols * pitchX - gapSize)) / 2;
      var originY = (height - (rows * pitchY - gapSize)) / 2;
      if (fieldTarget.width !== cols || fieldTarget.height !== rows) {
        disposeTarget(gl, fieldTarget);
        fieldTarget = createTarget(gl, cols, rows, {
          internalFormat: gl.RGBA,
          format: gl.RGBA,
          type: gl.UNSIGNED_BYTE,
          filter: gl.NEAREST
        });
        slatUniforms.tField = fieldTarget.texture;
      }
      var tilt = Math.min(
        0.42,
        Math.asin(clamp((pitchX * 1.5 - slatW * 0.5) / (slatH * 0.5), 0, 1))
      );
      return { slatW: slatW, slatH: slatH, tilt: tilt, grid: [cols, rows, pitchX, pitchY], origin: [originX, originY] };
    }

    function splat(pair, point, value, radius) {
      var u = splatPass.state;
      u.uTarget = pair.read.texture;
      u.uAspect = width / height;
      u.uPoint = point;
      u.uValue = value;
      u.uRadius = radius;
      run(splatPass, pair.write);
      pair.swap();
    }

    function stepFluid(f, dt) {
      if (s.swirl > 0) {
        curlPass.state.uVelocity = f.velocity.read.texture;
        run(curlPass, f.curl);

        vorticityPass.state.uVelocity = f.velocity.read.texture;
        vorticityPass.state.uCurl = f.curl.texture;
        vorticityPass.state.uSwirl = clamp(s.swirl, 0, 2) * 40;
        vorticityPass.state.uDt = dt;
        run(vorticityPass, f.velocity.write);
        f.velocity.swap();
      }

      divergencePass.state.uVelocity = f.velocity.read.texture;
      run(divergencePass, f.divergence);

      scalePass.state.uSource = f.pressure.read.texture;
      scalePass.state.uValue = 0.8;
      run(scalePass, f.pressure.write);
      f.pressure.swap();

      pressurePass.state.uDivergence = f.divergence.texture;
      for (var i = 0; i < PRESSURE_STEPS; i++) {
        pressurePass.state.uPressure = f.pressure.read.texture;
        run(pressurePass, f.pressure.write);
        f.pressure.swap();
      }

      projectPass.state.uPressure = f.pressure.read.texture;
      projectPass.state.uVelocity = f.velocity.read.texture;
      run(projectPass, f.velocity.write);
      f.velocity.swap();

      var fade = 1 / clamp(s.trail, 0.1, 10);
      var advect = advectPass.state;
      advect.uDt = dt;
      advect.uVelocity = f.velocity.read.texture;
      advect.uSource = f.velocity.read.texture;
      advect.uFade = fade * 1.4;
      run(advectPass, f.velocity.write);
      f.velocity.swap();

      advect.uVelocity = f.velocity.read.texture;
      advect.uSource = f.ink.read.texture;
      advect.uFade = fade;
      run(advectPass, f.ink.write);
      f.ink.swap();
    }

    function clearFluid(f) {
      scalePass.state.uValue = 0;
      [f.velocity, f.ink, f.pressure].forEach(function (pair) {
        scalePass.state.uSource = pair.read.texture;
        run(scalePass, pair.write);
        pair.swap();
      });
    }

    function frame(now) {
      raf = 0;
      if (!alive) return;
      var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      if (!s.paused && !reducedMotion) time += dt * s.speed;
      introClock = s.intro && !reducedMotion ? introClock + dt / Math.max(0.2, s.introDuration) : 1;
      var introLinear = Math.min(introClock, 1);
      var introEase = introLinear < 0.5
        ? 4 * introLinear * introLinear * introLinear
        : 1 - Math.pow(-2 * introLinear + 2, 3) / 2;

      if (fluid && splats.length) {
        var radius = Math.pow(clamp(s.cursorSize, 4, 600) / height, 2) * 0.35;
        var aspect = width / height;
        for (var i = 0; i < splats.length; i++) {
          var item = splats[i];
          var u = item[0];
          var v = item[1];
          var du = item[2];
          var dv = item[3];
          var turn = item[4];
          if (turn === null) {
            splat(fluid.velocity, [u, v], [du * SPLAT_FORCE, dv * SPLAT_FORCE, 0], radius);
            splat(fluid.ink, [u, v], [0.13, 0, 0], radius);
            continue;
          }
          var jet = radius * 0.55;
          var reach = Math.sqrt(jet * 0.5) * 1.9;
          var push = SPLAT_FORCE * 0.08;
          for (var j = 0; j < SPLASH_JETS; j++) {
            var angle = turn + (j / SPLASH_JETS) * Math.PI * 2;
            var dx = Math.cos(angle);
            var dy = Math.sin(angle);
            var point = [u + (dx * reach) / aspect, v + dy * reach];
            var spin = [
              (dx - dy) * Math.SQRT1_2 * push,
              (dy + dx) * Math.SQRT1_2 * push,
              0
            ];
            splat(fluid.velocity, point, spin, jet);
            splat(fluid.ink, point, [0.75, 0, 0], jet);
          }
          splat(fluid.ink, [u, v], [0.45, 0, 0], radius);
        }
        splats.length = 0;
        fluidDirty = true;
      }

      var fluidActive = fluid !== null && now < fluidUntil;
      if (fluid) {
        if (fluidActive) stepFluid(fluid, Math.min(Math.max(dt, 1 / 240), 1 / 30));
        else if (fluidDirty) {
          clearFluid(fluid);
          fluidDirty = false;
        }
      }

      var grid = layout();

      fieldUniforms.uSize = [width, height];
      fieldUniforms.uGrid = grid.grid;
      fieldUniforms.uOrigin = grid.origin;
      fieldUniforms.uSlat = [grid.slatW, grid.slatH];
      fieldUniforms.uTime = time;
      fieldUniforms.uScale = s.scale;
      fieldUniforms.uDirection = (s.direction * Math.PI) / 180;
      fieldUniforms.uChop = clamp(s.chop, 0, 1.5);
      fieldUniforms.uStretch = clamp(s.stretch, 0, 0.95);
      fieldUniforms.uGlint = Math.max(0, s.glint);
      fieldUniforms.uContrast = clamp(s.contrast, 0.2, 4);
      fieldUniforms.uPerspective = clamp(s.perspective, 0, 1);
      fieldUniforms.uFog = clamp(s.fog, 0, 1);
      fieldUniforms.uIntro = introEase;
      fieldUniforms.uFluid = fluidActive ? 1 : 0;
      fieldUniforms.tVelocity = fluid ? fluid.velocity.read.texture : blank;
      fieldUniforms.tInk = fluid ? fluid.ink.read.texture : blank;
      fieldUniforms.uFluidTexel = fluidTexel;
      fieldUniforms.uInk = clamp(s.cursorStrength, 0, 3);
      fieldUniforms.uLean = clamp(s.lean, 0, 1);
      run(fieldPass, fieldTarget);

      slatUniforms.uSize = [width, height];
      slatUniforms.uDpr = dpr;
      slatUniforms.uGrid = grid.grid;
      slatUniforms.uOrigin = grid.origin;
      slatUniforms.uSlat = [grid.slatW, grid.slatH];
      slatUniforms.uRound = clamp(s.roundness, 0, 1);
      slatUniforms.uTilt = fluidActive && s.lean > 0 ? grid.tilt : 0;
      slatUniforms.uColor = colors.color.slice(0, 3);
      slatUniforms.uGlintColor = colors.glintColor.slice(0, 3);
      slatUniforms.uBackground = colors.backgroundColor;
      run(slatPass, null);

      if (alive && visible) raf = requestAnimationFrame(frame);
    }

    function startLoop() {
      if (raf || !visible || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function locate(e) {
      var rect = container.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var w = Math.max(1, rect.width);
      var h = Math.max(1, rect.height);
      return { x: x, y: y, u: x / w, v: 1 - y / h, h: h, inside: x >= 0 && y >= 0 && x <= w && y <= h };
    }

    function queue(u, v, du, dv, turn) {
      if (splats.length > 32) splats.shift();
      splats.push([u, v, du, dv, turn]);
      fluidUntil = performance.now() + Math.max(1.5, s.trail * 5) * 1000;
      startLoop();
    }

    function onPointerMove(e) {
      var spot = locate(e);
      if (!fluid || !s.interactive || reducedMotion || !spot.inside) {
        pointer.tracked = false;
        return;
      }
      if (pointer.tracked && (spot.x !== pointer.x || spot.y !== pointer.y)) {
        queue(spot.u, spot.v, (spot.x - pointer.x) / spot.h, (pointer.y - spot.y) / spot.h, null);
      }
      pointer.x = spot.x;
      pointer.y = spot.y;
      pointer.tracked = true;
    }

    function onPointerDown(e) {
      var spot = locate(e);
      if (!fluid || !s.interactive || reducedMotion || !spot.inside) return;
      splashTurn += 2.39996;
      queue(spot.u, spot.v, 0, 0, splashTurn);
    }

    function onPointerLeave() {
      pointer.tracked = false;
    }

    function onPointerOut(e) {
      if (!e.relatedTarget) onPointerLeave();
    }

    function onVisibility() {
      if (!document.hidden) startLoop();
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });
    window.addEventListener("blur", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);

    var observer = null;
    if (window.ResizeObserver) {
      observer = new ResizeObserver(function () {
        applyResize();
        startLoop();
      });
      observer.observe(container);
    }
    function onWindowResize() {
      applyResize();
      startLoop();
    }
    window.addEventListener("resize", onWindowResize);

    applyResize();
    startLoop();

    return function destroy() {
      alive = false;
      visible = false;
      cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("blur", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      disposeFluid();
      disposeTarget(gl, fieldTarget);
      gl.deleteTexture(blank);
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
      var ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }

  window.MicroSlats = { mount: mount, unmount: unmount };
})();
