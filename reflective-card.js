/* ============================================================
 * Ring Star — ReflectiveCard 反射金属卡片
 * ------------------------------------------------------------
 * 由 React 组件移植为原生模块（无外部依赖）。
 * 用人物头像作为「反射环境」，离屏渲染出拉丝金属卡面，
 * 再逐张绘制到卡片的 2D canvas 上；配合 CSS 做悬停倾斜。
 *
 * 用法：
 *   <a class="rc-card" data-rc-src="images/xx.jpg">…</a>
 *   ReflectiveCard.enhance(root);
 * ============================================================ */
(function () {
  "use strict";

  var VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

  var CAPTURE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVideo;
uniform sampler2D uCam;
uniform vec4 uVideoMap;
uniform vec4 uCamMap;
uniform vec2 uWeights;
uniform vec2 uLod;
float level(sampler2D source) {
  vec3 mean = pow(textureLod(source, vec2(0.5), 14.0).rgb, vec3(2.2));
  return pow(dot(mean, vec3(0.2126, 0.7152, 0.0722)), 1.0 / 2.2);
}
void main() {
  vec3 color = vec3(0.0);
  float mean = 0.0;
  if (uWeights.x > 0.0) {
    color += textureLod(uVideo, vUv * uVideoMap.xy + uVideoMap.zw, uLod.x).rgb * uWeights.x;
    mean += level(uVideo) * uWeights.x;
  }
  if (uWeights.y > 0.0) {
    color += textureLod(uCam, vUv * uCamMap.xy + uCamMap.zw, uLod.y).rgb * uWeights.y;
    mean += level(uCam) * uWeights.y;
  }
  fragColor = vec4(color, mean);
}`;

  var BLUR = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform vec2 uStep;
uniform float uSigma;
void main() {
  vec4 sum = texture(uTexture, vUv);
  if (uSigma < 0.35) {
    fragColor = sum;
    return;
  }
  float falloff = -0.5 / (uSigma * uSigma);
  int radius = int(min(ceil(uSigma * 2.8), 40.0));
  float total = 1.0;
  for (int i = 1; i <= 40; i++) {
    if (i > radius) break;
    float offset = float(i);
    float weight = exp(offset * offset * falloff);
    sum += (texture(uTexture, vUv + uStep * offset) + texture(uTexture, vUv - uStep * offset)) * weight;
    total += 2.0 * weight;
  }
  fragColor = sum / total;
}`;

  var PLATE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uEnv;
uniform vec2 uEnvSize;
uniform vec2 uSize;
uniform float uRadius;
uniform float uScale;
uniform mat3 uRotate;
uniform float uCapture;
uniform float uBlur;
uniform float uRough;
uniform float uMetal;
uniform vec3 uTint;
uniform float uGray;
uniform float uWarp;
uniform float uWarpScale;
uniform float uShine;
uniform float uBevel;
uniform float uGlare;
uniform vec2 uPointer;
uniform float uTheme;

const float VIEW = 900.0;
const float OVERSCAN = 1.20;
const float CONTENT = 46.0;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

vec3 gradientNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = hash2(i);
  vec2 gb = hash2(i + vec2(1.0, 0.0));
  vec2 gc = hash2(i + vec2(0.0, 1.0));
  vec2 gd = hash2(i + vec2(1.0, 1.0));
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float k = va - vb - vc + vd;
  float value = va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k;
  vec2 slope = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * k + vec2(vb, vc) - va);
  return vec3(value, slope);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float erf(float x) {
  float x2 = x * x;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)));
}

float band(float x, float halfWidth, float sigma) {
  float s = 1.4142136 * max(sigma, 0.0001);
  return 0.5 * (erf((x + halfWidth) / s) - erf((x - halfWidth) / s));
}

float strip(vec2 q, vec2 center, vec2 dir, float halfWidth, vec2 sigma) {
  vec2 normal = vec2(-dir.y, dir.x);
  return band(dot(q - center, normal), halfWidth, length(sigma * normal));
}

const vec2 SWEEP = vec2(0.5, 0.86);
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float softbox(vec2 q, vec2 sigma) {
  float key = strip(q, vec2(-0.1, -0.16), normalize(SWEEP), 0.022, sigma + 0.018);
  float top = band(q.y + 0.6, 0.12, sigma.y + 0.05);
  float side = band(q.x - 0.46, 0.05, sigma.x + 0.05);
  return key + top * 0.8 + side * 0.35;
}

float room(vec2 q, vec2 sigma) {
  float fall = smoothstep(-0.55, 0.5, q.y);
  float flag = strip(q, vec2(0.24, -0.02), normalize(SWEEP), 0.09, sigma + 0.08);
  return mix(0.85, 0.12, fall) * (1.0 - 0.6 * flag);
}

vec4 sampleEnv(vec2 uv) {
  vec2 st = uv * uEnvSize - 0.5;
  vec2 i = floor(st);
  vec2 f = st - i;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1;
  vec2 g1 = w2 + w3;
  vec2 c0 = (i + 0.5 + w1 / g0 - 1.0) / uEnvSize;
  vec2 c1 = (i + 0.5 + w3 / g1 + 1.0) / uEnvSize;
  vec4 a = texture(uEnv, c0) * g0.x + texture(uEnv, vec2(c1.x, c0.y)) * g1.x;
  vec4 b = texture(uEnv, vec2(c0.x, c1.y)) * g0.x + texture(uEnv, c1) * g1.x;
  return a * g0.y + b * g1.y;
}

vec3 toLinear(vec3 c) {
  return pow(max(c, 0.0), vec3(2.2));
}

void main() {
  vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uSize;
  vec2 halfSize = uSize * 0.5;
  float r = min(uRadius, min(halfSize.x, halfSize.y));
  vec2 corner = abs(p) - halfSize + r;
  vec2 side = vec2(p.x >= 0.0 ? 1.0 : -1.0, p.y >= 0.0 ? 1.0 : -1.0);
  float d;
  vec2 outward;
  if (corner.x > 0.0 && corner.y > 0.0) {
    d = length(corner) - r;
    outward = normalize(corner) * side;
  } else if (corner.x > corner.y) {
    d = corner.x - r;
    outward = vec2(side.x, 0.0);
  } else {
    d = corner.y - r;
    outward = vec2(0.0, side.y);
  }
  float coverage = clamp(0.5 - d * uScale, 0.0, 1.0);

  float chamferWidth = min(uBevel, max(r, 1.0));
  float chamfer = chamferWidth > 0.01 ? 1.0 - smoothstep(0.0, chamferWidth, -d) : 0.0;
  vec2 slope = outward * chamfer;

  vec2 wp = p / (220.0 * uWarpScale);
  vec3 w1 = gradientNoise(wp);
  vec3 w2 = gradientNoise(wp * 2.07 + 13.7);
  vec2 ripple = (w1.yz + w2.yz * 0.5) * uWarp;
  slope += ripple * 0.008;

  float grain = valueNoise(vec2(p.x * 0.008, p.y * 0.55)) * 0.45 + valueNoise(vec2(p.x * 0.019 + 3.7, p.y * 0.23)) * 0.35 + valueNoise(vec2(p.x * 0.004 + 9.2, p.y * 0.09)) * 0.2;
  float brush = uRough * uRough;
  slope.y += (grain - 0.5) * brush * 0.004;

  vec3 normal = uRotate * normalize(vec3(slope, 1.0));
  vec3 position = uRotate * vec3(p, 0.0);
  vec3 view = normalize(position - vec3(0.0, 0.0, VIEW));
  vec3 bounce = reflect(view, normal);
  vec2 q = bounce.xy / max(bounce.z, 0.2);

  vec2 footprint = fwidth(q);
  vec2 sigma = sqrt(vec2(uBlur / VIEW) * vec2(uBlur / VIEW) + footprint * footprint * 0.5);
  sigma += vec2(0.004, 0.05) * uRough;

  vec2 shift = clamp((q - p / VIEW) * CONTENT + ripple * 10.0, -uSize, uSize);
  vec2 cp = (p + shift) / (uSize * OVERSCAN);
  vec4 reflected = uCapture > 0.0 ? sampleEnv(vec2(0.5 + cp.x, 0.5 - cp.y)) : vec4(0.0, 0.0, 0.0, 1.0);
  vec3 captured = toLinear(reflected.rgb) * (0.5 / max(pow(reflected.a, 2.2), 0.02));
  captured = mix(vec3(dot(captured, LUMA)), captured, 1.0 - uGray);
  captured = pow(max(captured * 1.2, 0.0), vec3(mix(2.0, 1.5, uTheme)));

  vec3 scene = mix(vec3(room(q, sigma)), captured, uCapture * (1.0 - chamfer) * mix(1.0, 0.6, uTheme));
  scene *= 1.0 + (grain - 0.5) * brush * 0.3;

  vec2 toPointer = (uPointer - p) / (120.0 + uBlur * 4.0);
  vec2 spread = toPointer * vec2(1.0, 1.0 / (1.0 + 2.5 * uRough));
  float reach = dot(spread, spread);
  float glint = max(1.0 + 3.0 * dot(slope, toPointer), 0.0);
  float glare = (exp(-reach * 1.6) + exp(-reach * 0.35) * 0.15) * glint * uGlare * (1.0 + 0.8 * (grain - 0.5) * brush);
  float highlight = (softbox(q, sigma) * uShine + glare) * mix(0.4, 1.0, uMetal);

  vec3 dark = vec3(0.005, 0.005, 0.006) + uTint * (scene * 0.05 * uMetal + highlight * 0.36);
  vec3 light = uTint * (vec3(0.83, 0.83, 0.85) * (1.0 - 0.45 * uMetal * (1.0 - clamp(scene, 0.0, 1.0))) + highlight * 0.35);
  vec3 color = mix(dark, light, uTheme);
  color = min(color, 0.7) + 0.3 * (1.0 - exp(-max(color - 0.7, 0.0) / 0.3));
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));

  color += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  color = clamp(color, 0.0, 1.0);
  fragColor = vec4(color * coverage, coverage);
}`;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("[ReflectiveCard]", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function link(gl, fragmentSource) {
    var vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    var fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = vertex && fragment ? gl.createProgram() : null;
    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return null;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, "aPosition");
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("[ReflectiveCard]", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    var uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var index = 0; index < count; index++) {
      var info = gl.getActiveUniform(program, index);
      if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program: program, uniforms: uniforms };
  }

  function coverMap(width, height, aspect, mirror) {
    var ratio = width / Math.max(1, height);
    var sx = ratio > aspect ? aspect / ratio : 1;
    var sy = ratio > aspect ? 1 : ratio / aspect;
    var u = mirror ? -sx : sx;
    return [u, -sy, 0.5 - u * 0.5, 0.5 + sy * 0.5];
  }

  function lodFor(width, height, envWidth, aspect) {
    var ratio = width / Math.max(1, height);
    var visible = width * (ratio > aspect ? aspect / ratio : 1);
    return Math.max(0, Math.log2(Math.max(1, visible / Math.max(1, envWidth))) - 0.5);
  }

  function createRenderer(canvas) {
    var gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "default"
    });
    if (!gl) return null;
    var captureProgram = link(gl, CAPTURE);
    var blurProgram = link(gl, BLUR);
    var plateProgram = link(gl, PLATE);
    if (!captureProgram || !blurProgram || !plateProgram) return null;

    function createTexture(mipmaps, wrap) {
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      return texture;
    }

    function createTarget() {
      var texture = createTexture(false, gl.MIRRORED_REPEAT);
      var framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { texture: texture, framebuffer: framebuffer, width: 1, height: 1 };
    }

    function allocate(target, width, height) {
      if (target.width === width && target.height === height) return;
      target.width = width;
      target.height = height;
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    var textures = { video: createTexture(true, gl.CLAMP_TO_EDGE), cam: createTexture(true, gl.CLAMP_TO_EDGE) };
    var capture = createTarget();
    var blurX = createTarget();
    var blurY = createTarget();
    var rotation = new Float32Array(9);

    function pass(target, program) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
      gl.viewport(0, 0, target ? target.width : canvas.width, target ? target.height : canvas.height);
      gl.useProgram(program.program);
      return program.uniforms;
    }

    function bind(unit, texture) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }

    function upload(key, element) {
      try {
        gl.bindTexture(gl.TEXTURE_2D, textures[key]);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
        gl.generateMipmap(gl.TEXTURE_2D);
        return true;
      } catch (e) {
        return false;
      }
    }

    function renderEnv(options) {
      var width = options.width;
      var height = options.height;
      var blur = options.blur;
      var roughness = options.roughness;
      var video = options.video;
      var cam = options.cam;
      var envScale = clamp(2.5 / Math.max(blur, 0.01), 0.12, 1.2);
      var envWidth = Math.max(8, Math.ceil(width * 1.2 * envScale));
      var envHeight = Math.max(8, Math.ceil(height * 1.2 * envScale));
      allocate(capture, envWidth, envHeight);
      allocate(blurX, envWidth, envHeight);
      allocate(blurY, envWidth, envHeight);
      var aspect = width / Math.max(1, height);
      var total = 1 - (1 - video.mix) * (1 - cam.mix);
      var camWeight = total > 0 ? cam.mix / total : 0;

      var u = pass(capture, captureProgram);
      bind(0, textures.video);
      bind(1, textures.cam);
      gl.uniform1i(u.uVideo, 0);
      gl.uniform1i(u.uCam, 1);
      gl.uniform4fv(u.uVideoMap, video.ready ? coverMap(video.width, video.height, aspect, false) : [1, 1, 0, 0]);
      gl.uniform4fv(u.uCamMap, cam.ready ? coverMap(cam.width, cam.height, aspect, true) : [1, 1, 0, 0]);
      gl.uniform2f(u.uWeights, video.ready && total > 0 ? 1 - camWeight : 0, cam.ready ? camWeight : 0);
      gl.uniform2f(
        u.uLod,
        video.ready ? lodFor(video.width, video.height, envWidth, aspect) : 0,
        cam.ready ? lodFor(cam.width, cam.height, envWidth, aspect) : 0
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      u = pass(blurX, blurProgram);
      bind(0, capture.texture);
      gl.uniform1i(u.uTexture, 0);
      gl.uniform2f(u.uStep, 1 / envWidth, 0);
      gl.uniform1f(u.uSigma, blur * envScale);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      u = pass(blurY, blurProgram);
      bind(0, blurX.texture);
      gl.uniform1i(u.uTexture, 0);
      gl.uniform2f(u.uStep, 0, 1 / envHeight);
      gl.uniform1f(u.uSigma, (blur * (1 + 1.5 * roughness) + 10 * roughness) * envScale);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function renderPlate(options) {
      var width = options.width;
      var height = options.height;
      var rotateX = options.rotateX;
      var rotateY = options.rotateY;
      var amount = options.capture;
      var glare = options.glare;
      var settings = options.settings;
      var cx = Math.cos(rotateX);
      var sx = Math.sin(rotateX);
      var cy = Math.cos(rotateY);
      var sy = Math.sin(rotateY);
      rotation.set([cy, sx * sy, -cx * sy, 0, cx, sx, sy, -sx * cy, cx * cy]);

      var u = pass(null, plateProgram);
      bind(0, blurY.texture);
      gl.uniform1i(u.uEnv, 0);
      gl.uniform2f(u.uEnvSize, blurY.width, blurY.height);
      gl.uniform2f(u.uSize, width, height);
      gl.uniform1f(u.uRadius, settings.radius);
      gl.uniform1f(u.uScale, canvas.width / Math.max(1, width));
      gl.uniformMatrix3fv(u.uRotate, false, rotation);
      gl.uniform1f(u.uCapture, amount);
      gl.uniform1f(u.uBlur, settings.blurStrength);
      gl.uniform1f(u.uRough, settings.roughness);
      gl.uniform1f(u.uMetal, settings.metalness);
      gl.uniform3fv(u.uTint, settings.tint);
      gl.uniform1f(u.uGray, settings.grayscale);
      gl.uniform1f(u.uWarp, settings.warp);
      gl.uniform1f(u.uWarpScale, settings.warpScale);
      gl.uniform1f(u.uShine, settings.shine);
      gl.uniform1f(u.uBevel, settings.bevel);
      gl.uniform1f(u.uGlare, glare);
      gl.uniform2f(u.uPointer, options.pointerX, options.pointerY);
      gl.uniform1f(u.uTheme, settings.theme);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    return { canvas: canvas, upload: upload, renderEnv: renderEnv, renderPlate: renderPlate };
  }

  var DEFAULTS = {
    metalness: 1,
    roughness: 0.3,
    blurStrength: 6,
    grayscale: 1,
    warp: 0.6,
    warpScale: 1,
    shine: 1,
    bevel: 3,
    glare: 0.5,
    radius: 18,
    theme: 1,
    tint: [1, 1, 1]
  };

  var renderer = null;
  var failed = false;
  var images = {};
  var pending = [];

  function getRenderer() {
    if (renderer || failed) return renderer;
    var canvas = document.createElement("canvas");
    var r = createRenderer(canvas);
    if (!r) {
      failed = true;
      return null;
    }
    renderer = r;
    return renderer;
  }

  /* 把一张头像渲染成金属卡面，并画进卡片的 canvas */
  function paint(card, image) {
    var r = getRenderer();
    if (!r) return;
    var plate = card.querySelector(".rc-card__plate");
    if (!plate) return;
    var width = Math.max(24, card.clientWidth);
    var height = Math.max(24, card.clientHeight);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(width * dpr));
    var h = Math.max(1, Math.round(height * dpr));
    if (r.canvas.width !== w || r.canvas.height !== h) {
      r.canvas.width = w;
      r.canvas.height = h;
    }
    if (!r.upload("video", image)) return;
    var settings = {};
    for (var key in DEFAULTS) settings[key] = DEFAULTS[key];
    settings.radius = DEFAULTS.radius * dpr;
    r.renderEnv({
      width: w,
      height: h,
      blur: settings.blurStrength,
      roughness: settings.roughness,
      video: { mix: 1, ready: true, width: image.naturalWidth || 1, height: image.naturalHeight || 1 },
      cam: { mix: 0, ready: false, width: 0, height: 0 }
    });
    r.renderPlate({
      width: w,
      height: h,
      rotateX: 0,
      rotateY: 0,
      capture: 1,
      glare: settings.glare,
      pointerX: 0,
      pointerY: 0,
      settings: settings
    });

    if (plate.width !== w || plate.height !== h) {
      plate.width = w;
      plate.height = h;
    }
    var ctx = plate.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(r.canvas, 0, 0, w, h);
    card.setAttribute("data-rc-painted", "1");
  }

  function watchTilt(card) {
    if (card.getAttribute("data-rc-tilt")) return;
    card.setAttribute("data-rc-tilt", "1");
    function move(event) {
      var rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      var ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      var nx2 = Math.max(-1, Math.min(1, nx));
      var ny2 = Math.max(-1, Math.min(1, ny));
      card.style.setProperty("--rc-rotate-x", (-ny2 * 10).toFixed(2) + "deg");
      card.style.setProperty("--rc-rotate-y", (nx2 * 12).toFixed(2) + "deg");
      card.style.setProperty("--rc-glare-x", ((nx2 + 1) * 50).toFixed(1) + "%");
      card.style.setProperty("--rc-glare-y", ((ny2 + 1) * 50).toFixed(1) + "%");
    }
    function reset() {
      card.style.setProperty("--rc-rotate-x", "0deg");
      card.style.setProperty("--rc-rotate-y", "0deg");
    }
    card.addEventListener("pointerenter", move);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", reset);
  }

  function enhance(scope) {
    var root = scope || document;
    if (!root.querySelectorAll) return;
    var cards = root.querySelectorAll(".rc-card[data-rc-src]");
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.getAttribute("data-rc-painted") || card.getAttribute("data-rc-loading")) continue;
      watchTilt(card);
      var src = card.getAttribute("data-rc-src");
      if (!src) continue;
      var image = images[src];
      if (image && image.complete && image.naturalWidth) {
        paint(card, image);
        continue;
      }
      card.setAttribute("data-rc-loading", "1");
      if (!image) {
        image = new Image();
        image.crossOrigin = "anonymous";
        image.decoding = "async";
        images[src] = image;
      }
      (function (element, node) {
        pending.push({ image: element, card: node });
        element.addEventListener("load", function () {
          for (var j = pending.length - 1; j >= 0; j--) {
            if (pending[j].image !== element) continue;
            var node2 = pending[j].card;
            pending.splice(j, 1);
            node2.removeAttribute("data-rc-loading");
            paint(node2, element);
          }
        });
        element.addEventListener("error", function () {
          node.removeAttribute("data-rc-loading");
        });
        if (!element.src) element.src = src;
      })(image, card);
    }
  }

  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var cards = document.querySelectorAll(".rc-card[data-rc-painted]");
      for (var i = 0; i < cards.length; i++) {
        var plate = cards[i].querySelector(".rc-card__plate");
        if (!plate) continue;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.round(cards[i].clientWidth * dpr);
        if (Math.abs(plate.width - w) > 6) {
          cards[i].removeAttribute("data-rc-painted");
          var src = cards[i].getAttribute("data-rc-src");
          var image = images[src];
          if (image && image.complete && image.naturalWidth) paint(cards[i], image);
        }
      }
    }, 320);
  }

  window.addEventListener("resize", onResize);

  window.ReflectiveCard = { enhance: enhance };
})();
