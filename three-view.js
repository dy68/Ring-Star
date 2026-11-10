/* ============================================================
 * Ring Star — 3D 星座网状视图（Three.js r128 + OrbitControls）
 * ------------------------------------------------------------
 * 通过 CDN 按需加载（经典 script，兼容 file:// 直接打开）。
 * 节点按「四象」聚类：同象星座互相靠近，并用细线相连。
 * ============================================================ */
(function () {
  "use strict";

  var LIBS = [
    "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js",
    "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js",
    "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/renderers/CSS2DRenderer.js"
  ];

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("load fail: " + src)); };
      document.head.appendChild(s);
    });
  }

  var loadingPromise = null;
  function ensureLibs() {
    if (window.THREE && window.THREE.OrbitControls && window.THREE.CSS2DRenderer) {
      return Promise.resolve();
    }
    if (loadingPromise) return loadingPromise;
    loadingPromise = (function () {
      var steps = [];
      if (!window.THREE) steps.push(LIBS[0]);
      if (!window.THREE || !window.THREE.OrbitControls) steps.push(LIBS[1]);
      if (!window.THREE || !window.THREE.CSS2DRenderer) steps.push(LIBS[2]);
      return steps.reduce(function (p, src) {
        return p.then(function () { return loadScript(src); });
      }, Promise.resolve());
    })().catch(function (err) {
      loadingPromise = null; // 允许重试
      throw err;
    });
    return loadingPromise;
  }

  /* 可取消的动画循环句柄 */
  var active = null;

  function cleanup() {
    if (window.MicroSlats) window.MicroSlats.unmount();
    if (active) {
      try { active(); } catch (e) {}
      active = null;
    }
  }

  function mount(container) {
    var loading = container.querySelector("#viewLoading");
    cleanup();
    if (window.MicroSlats) {
      window.MicroSlats.mount(container, {
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
        scale: 1.5,
        speed: 0.6,
        direction: 250,
        chop: 0.55,
        stretch: 0,
        glint: 0.7,
        contrast: 1.25,
        perspective: 0.55,
        fog: 0.55,
        introDuration: 1.5,
        paused: false
      });
    }
    ensureLibs()
      .then(function () {
        if (!container.isConnected) return;
        if (loading) loading.remove();
        active = build(container);
      })
      .catch(function () {
        if (loading) loading.textContent = "3D 视图加载失败，请检查网络连接后刷新页面。";
      });
  }

  /* ---------- 确定性随机 ---------- */
  function seedFromStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function build(container) {
    var RS = window.RingStar;
    var PEOPLE = RS.PEOPLE;
    var ZODIAC = RS.ZODIAC;
    var personImage = RS.personImage;

    var W = container.clientWidth || window.innerWidth;
    var H = container.clientHeight || window.innerHeight;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200);
    camera.position.set(0, -0.6, 24);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    /* 拖动时像素比压到 1.5，减少与背景液态层叠时的填充压力，画面依旧清晰 */
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(W, H);
    container.appendChild(renderer.domElement);

    var labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(W, H);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0";
    labelRenderer.domElement.style.left = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    container.appendChild(labelRenderer.domElement);

    /* dirty 标记：只有镜头真的变化时才重绘，静止时省掉 47 个 DOM 标签的逐帧写入 */
    var dirty = true;

    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.2;
    controls.rotateSpeed = 0.92;
    controls.zoomSpeed = 1;
    controls.minDistance = 8;
    controls.maxDistance = 45;
    controls.target.set(0, -0.6, 0);
    controls.addEventListener("change", function () { dirty = true; });

    /* 滚轮缩放自己接管：按指数累积目标距离，再逐帧缓动过去，避免 OrbitControls 的离散跳变 */
    var ZOOM_MIN = 8;
    var ZOOM_MAX = 45;
    var zoomTarget = camera.position.distanceTo(controls.target);
    var zooming = false;
    container.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        zoomTarget = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomTarget * Math.exp(dy * 0.0018)));
        zooming = true;
        dirty = true;
      },
      { passive: false, capture: true }
    );
    /* 双指缩放交给 OrbitControls，顺手同步目标距离，避免两边打架 */
    container.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length > 1) {
          zooming = false;
          zoomTarget = camera.position.distanceTo(controls.target);
        }
      },
      { passive: true, capture: true }
    );

    /* 顺序即落位：火(下) 风(右) 土(上) 水(左)，把人数最多的风象放在左右两侧，避免压到顶部导航 */
    var elements = ["火", "风", "土", "水"];
    var byElement = { "火": [], "土": [], "风": [], "水": [] };
    PEOPLE.forEach(function (p) {
      var e = ZODIAC.element[p.zodiac] || "风";
      byElement[e].push(p);
    });

    /* 四象中心按横向椭圆排布，充分利用宽屏空间，避免四团挤在一起 */
    var ringRX = 10.6;
    var ringRY = 4.4;
    var centers = {};
    elements.forEach(function (e, i) {
      var a = (i / elements.length) * Math.PI * 2 - Math.PI / 2;
      centers[e] = new THREE.Vector3(Math.cos(a) * ringRX, Math.sin(a) * ringRY, 0);
    });

    var elemColors = ZODIAC.elementColor;

    /* 四象中心标签 */
    elements.forEach(function (e) {
      var div = document.createElement("div");
      div.className = "elem-center";
      div.style.background = elemColors[e];
      div.textContent = ZODIAC.elementNames[e];
      var obj = new THREE.CSS2DObject(div);
      obj.position.copy(centers[e]);
      scene.add(obj);
    });

    /* 人物节点 */
    var nodePositions = {};
    PEOPLE.forEach(function (p) {
      var e = ZODIAC.element[p.zodiac] || "风";
      var list = byElement[e];
      var idx = list.indexOf(p);
      var n = list.length;
      var rng = mulberry32(seedFromStr(p.id));

      var radius = 2.5 + 2.4 * Math.sqrt((idx + 0.5) / n);
      var ang = idx * 2.399963 + rng() * 0.5;
      var pos = centers[e].clone().add(new THREE.Vector3(Math.cos(ang) * radius, Math.sin(ang) * radius, 0));
      nodePositions[p.id] = pos;

      var div = document.createElement("div");
      div.className = "node3d";
      div.innerHTML =
        '<div class="node3d-avatar" style="border-color:' + elemColors[e] + ';">' +
        '<img src="' + personImage(p) + '" alt="">' +
        "</div>" +
        '<div class="node3d-name">' + p.name + "</div>";
      /* 头像上按下也能直接拖拽旋转视角；位移小于 6px 才算点击打开详情 */
      div.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        var sx = e.clientX;
        var sy = e.clientY;
        var moved = false;
        function onMove(ev) {
          if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 6) moved = true;
        }
        function onUp() {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
          if (!moved) RS.openPerson(p.id);
        }
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
        /* 把按下事件转交给画布，让 OrbitControls 立即接管这次拖动 */
        renderer.domElement.dispatchEvent(
          new PointerEvent("pointerdown", {
            pointerId: e.pointerId,
            pointerType: e.pointerType,
            clientX: e.clientX,
            clientY: e.clientY,
            button: 0,
            buttons: 1,
            bubbles: true,
            cancelable: true
          })
        );
      });

      var obj = new THREE.CSS2DObject(div);
      obj.position.copy(pos);
      scene.add(obj);
    });

    /* 同象之间的连线 */
    var lineGroup = new THREE.Group();
    elements.forEach(function (e) {
      var list = byElement[e];
      var color = new THREE.Color(elemColors[e]);
      for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
          var a = nodePositions[list[i].id];
          var b = nodePositions[list[j].id];
          if (a.distanceTo(b) < 4.4) {
            var geom = new THREE.BufferGeometry().setFromPoints([a, b]);
            var mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.35 });
            lineGroup.add(new THREE.Line(geom, mat));
          }
        }
      }
    });
    scene.add(lineGroup);

    /* 背景星空 */
    var starCount = 500;
    var positions = new Float32Array(starCount * 3);
    for (var k = 0; k < starCount; k++) {
      positions[k * 3] = (Math.random() - 0.5) * 60;
      positions[k * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[k * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    var starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    var starsMat = new THREE.PointsMaterial({ color: 0x9db8d8, size: 0.08, transparent: true, opacity: 0.6 });
    var stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    /* 动画循环：交互时全速渲染，静止时降到低频，避免空转拖慢手势 */
    var stopped = false;
    var rafId = 0;
    var idleTick = 0;
    function animate() {
      if (stopped) return;
      rafId = requestAnimationFrame(animate);
      if (zooming) {
        var dist = camera.position.distanceTo(controls.target);
        var diff = zoomTarget - dist;
        if (Math.abs(diff) < 0.004) {
          zooming = false;
        } else {
          var dir = camera.position.clone().sub(controls.target).normalize();
          camera.position.copy(controls.target).addScaledVector(dir, dist + diff * 0.24);
          dirty = true;
        }
      }
      controls.update();
      if (dirty) {
        dirty = false;
        idleTick = 0;
        stars.rotation.y += 0.0004;
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
      } else if (++idleTick % 8 === 0) {
        stars.rotation.y += 0.0004 * 8;
        renderer.render(scene, camera);
      }
    }
    animate();

    function onResize() {
      var w = container.clientWidth || window.innerWidth;
      var h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
      dirty = true;
    }
    window.addEventListener("resize", onResize);

    /* 返回取消函数 */
    return function () {
      stopped = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      if (labelRenderer.domElement.parentNode) labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement);
    };
  }

  window.RingStarView = { mount: mount, cleanup: cleanup };

  /* 若页面初始加载时即停留在视图页，补一次挂载 */
  var initialRoute = (location.hash || "").replace(/^#\/?/, "").split("/")[0];
  if (initialRoute === "view") {
    var c = document.getElementById("view3d");
    if (c) mount(c);
  }
})();
