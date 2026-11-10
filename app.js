/* ============================================================
 * Ring Star — 应用逻辑（路由 / 渲染 / 搜索 / 四象匹配 / 头像生成）
 * ============================================================ */
(function () {
  "use strict";

  if (!window.DATA || !window.ZODIAC) {
    document.getElementById("app").innerHTML =
      '<div class="page"><div class="empty">数据加载失败，请确认 data.js 存在。</div></div>';
    return;
  }

  /* ---------- 工具函数 ---------- */
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function pastel(seed, offset) {
    const base = [205, 212, 218, 224, 228, 196, 188, 200, 210, 222];
    const hue = (base[seed % base.length] + offset) % 360;
    return "hsl(" + hue + ", 52%, 80%)";
  }

  /* 生成占位头像（SVG data URI）：渐变 + 名字首字 + 星座符号 */
  function avatarDataURI(name, zodiac, size) {
    size = size || 200;
    const seed = hashStr(name || "?");
    const c1 = pastel(seed, 0);
    const c2 = pastel(seed, 44);
    const symbol = (ZODIAC.symbol[zodiac] || "").trim();
    const short = esc((name || "?").slice(0, 2));
    const fs = short.length > 1 ? 62 : 84;
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='" + size + "' height='" + size + "' viewBox='0 0 200 200'>" +
      "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
      "<stop offset='0' stop-color='" + c1 + "'/>" +
      "<stop offset='1' stop-color='" + c2 + "'/>" +
      "</linearGradient></defs>" +
      "<rect width='200' height='200' rx='100' fill='url(#g)'/>" +
      "<circle cx='200' cy='0' r='92' fill='rgba(255,255,255,0.16)'/>" +
      "<text x='100' y='122' font-size='" + fs + "' text-anchor='middle' fill='rgba(255,255,255,0.97)' font-family='sans-serif' font-weight='700'>" + short + "</text>" +
      "<text x='100' y='170' font-size='30' text-anchor='middle' fill='rgba(255,255,255,0.92)'>" + symbol + "</text>" +
      "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* 小说封面占位图 */
  function coverDataURI(title) {
    const seed = hashStr(title || "?");
    const c1 = pastel(seed, 0);
    const c2 = pastel(seed, 60);
    const t = esc((title || "?").slice(0, 6));
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='420' viewBox='0 0 300 420'>" +
      "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
      "<stop offset='0' stop-color='" + c1 + "'/>" +
      "<stop offset='1' stop-color='" + c2 + "'/>" +
      "</linearGradient></defs>" +
      "<rect width='300' height='420' fill='url(#g)'/>" +
      "<rect x='18' y='18' width='264' height='384' rx='10' fill='rgba(255,255,255,0.22)' stroke='rgba(255,255,255,0.55)' stroke-width='2'/>" +
      "<text x='150' y='206' font-size='34' text-anchor='middle' fill='rgba(255,255,255,0.98)' font-family='sans-serif' font-weight='800'>" + t + "</text>" +
      "<text x='150' y='252' font-size='16' text-anchor='middle' fill='rgba(255,255,255,0.85)' font-family='sans-serif'>Ring Star</text>" +
      "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function personImage(obj) {
    const name = obj.name || obj.id;
    const zodiac = obj.zodiac || "白羊座";
    return obj.image || avatarDataURI(name, zodiac, 200);
  }
  function coverImage(novel) {
    return novel.cover || coverDataURI(novel.title);
  }

  /* 百合小说：抖音话题搜索链接（# + 书名） */
  function novelDouyinUrl(title) {
    return "https://www.douyin.com/search/%23" + encodeURIComponent(title || "");
  }

  function zodiacLine(z) {
    return z + " " + (ZODIAC.symbol[z] || "");
  }

  /* 图片加载失败回退：热链封面/头像失效时自动切回生成图 */
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && t.getAttribute("data-fallback") && !t.getAttribute("data-done")) {
      t.setAttribute("data-done", "1");
      t.src = t.getAttribute("data-fallback");
    }
  }, true);

  /* ---------- 人物统一注册表（供搜索 / 匹配 / 3D 共用） ---------- */
  const PEOPLE = [];
  const peopleById = {};

  /* 同一个人可能同时出现在「单人」和「CP」里，按 id 去重只保留一份 */
  function registerPerson(p) {
    const prev = peopleById[p.id];
    if (prev) {
      if (p.cpName && !prev.cpName) prev.cpName = p.cpName;
      return;
    }
    peopleById[p.id] = p;
    PEOPLE.push(p);
  }

  function addCeleb(c, category, cpName) {
    registerPerson({
      id: c.id, name: c.name, image: c.image, zodiac: c.zodiac, mbti: c.mbti,
      kind: "celebrity", category: category, cpName: cpName || null, data: c
    });
  }

  DATA.celebrities.neiDi.forEach((c) => addCeleb(c, "内娱"));
  DATA.celebrities.hanYu.forEach((c) => addCeleb(c, "韩娱"));
  DATA.celebrities.taiYu.singles.forEach((c) => addCeleb(c, "泰娱"));
  DATA.celebrities.taiYu.cps.forEach((cp) => {
    cp.members.forEach((m) => addCeleb(m, "泰娱", cp.cpName));
  });

  [["yanQing", "言情"], ["baiHe", "百合"]].forEach(([genre, genreName]) => {
    DATA.novels[genre].forEach((n) => {
      (n.characters || []).forEach((ch) => {
        registerPerson({
          id: ch.id, name: ch.name, image: ch.image || "", zodiac: ch.zodiac, mbti: ch.mbti,
          kind: "character", category: "小说角色", novel: n.title, novelId: n.id,
          genre: genreName, data: ch
        });
      });
    });
  });

  /* ---------- 四象匹配 ---------- */
  const ELEMENT_AFFINITY = {
    "火火": 92, "土土": 92, "风风": 92, "水水": 92,
    "火风": 82, "风火": 82, "土水": 82, "水土": 82,
    "火土": 70, "土火": 70, "风水": 70, "水风": 70,
    "火水": 55, "水火": 55, "土风": 55, "风土": 55
  };

  function similarity(person, myZodiac) {
    const e1 = ZODIAC.element[person.zodiac];
    const e2 = ZODIAC.element[myZodiac];
    const base = ELEMENT_AFFINITY[e1 + e2] || 70;
    const jitter = (hashStr(person.id + myZodiac) % 7) - 3; // -3 ~ +3
    const pct = Math.max(1, Math.min(99, base + jitter));
    return { pct: pct, base: base, e1: e1, e2: e2 };
  }

  /* 两个人物之间的匹配度（同样是四象相性 + 确定性微调） */
  function pairSimilarity(a, b) {
    const e1 = ZODIAC.element[a.zodiac];
    const e2 = ZODIAC.element[b.zodiac];
    const base = ELEMENT_AFFINITY[e1 + e2] || 70;
    const jitter = (hashStr(a.id + "|" + b.id) % 7) - 3; // -3 ~ +3
    const pct = Math.max(1, Math.min(99, base + jitter));
    return { pct: pct, base: base, e1: e1, e2: e2 };
  }

  function tierText(base, e1, e2) {
    if (e1 === e2)
      return {
        label: "天生一对",
        desc: "你们同属" + ZODIAC.elementNames[e1] + "，三观与节奏天然契合，相处轻松又默契。"
      };
    if (base >= 80)
      return {
        label: "高度契合",
        desc: ZODIAC.elementNames[e1] + "与" + ZODIAC.elementNames[e2] + "相合，彼此互补、互相成就。"
      };
    if (base >= 65)
      return {
        label: "还算合拍",
        desc: ZODIAC.elementNames[e1] + "与" + ZODIAC.elementNames[e2] + "中规中矩，多些理解与磨合就能走得长久。"
      };
    return {
      label: "需要磨合",
      desc: ZODIAC.elementNames[e1] + "与" + ZODIAC.elementNames[e2] + "相克，性格差异较大，但理解彼此就能化矛盾为默契。"
    };
  }

  /* ---------- 渲染：通用卡片 ---------- */
  /* 反射金属卡片：头像保留在最上层，金属板作为卡面背景 */
  function personCard(p, sub) {
    const img = personImage(p);
    return (
      '<a class="grid-card glass rc-card" href="#/person/' + p.id + '" data-rc-src="' + img + '">' +
      '<canvas class="rc-card__plate" aria-hidden="true"></canvas>' +
      '<span class="rc-card__glare" aria-hidden="true"></span>' +
      '<span class="rc-card__content">' +
      '<img class="avatar" src="' + img + '" alt="' + esc(p.name) + '">' +
      '<span class="card-name">' + esc(p.name) + "</span>" +
      '<span class="card-sub">' + sub + "</span>" +
      "</span></a>"
    );
  }

  function celebCard(c) {
    return personCard(c, zodiacLine(c.zodiac) + (c.mbti ? " · " + esc(c.mbti) : ""));
  }

  function charCard(ch) {
    return personCard(ch, zodiacLine(ch.zodiac) + " · " + esc(ch.mbti));
  }

  function personBackHref(p) {
    if (p.kind === "celebrity") {
      if (p.category === "内娱") return "#/celebrities/neiDi";
      if (p.category === "韩娱") return "#/celebrities/hanYu";
      if (p.category === "泰娱") return p.cpName ? "#/celebrities/taiYu/cps" : "#/celebrities/taiYu/singles";
    }
    if (p.kind === "character") {
      return p.genre === "百合" ? "#/novels/baiHe" : "#/novels/yanQing";
    }
    return "#/home";
  }

  /* ---------- 各页面渲染 ---------- */
  function renderHome(app) {
    const sections = [
      { title: "内娱", subtitle: "中国内地娱乐圈", href: "#/celebrities/neiDi", src: "images/home1.png" },
      { title: "韩娱", subtitle: "韩国娱乐圈", href: "#/celebrities/hanYu", src: "images/home2.png" },
      { title: "泰娱", subtitle: "泰国娱乐圈", href: "#/celebrities/taiYu", src: "images/home3.png" },
      { title: "言情", subtitle: "言情小说", href: "#/novels/yanQing", src: "images/home4.png" },
      { title: "百合", subtitle: "百合小说", href: "#/novels/baiHe", src: "images/home5.png" }
    ];

    app.innerHTML =
      '<div class="home-page">' +
      '<div class="home-carousel" id="homeCarousel" tabindex="0" role="region" aria-label="内容分类"></div>' +
      "</div>";

    const host = document.getElementById("homeCarousel");
    if (!host || !window.FlexCarousel) return;
    window.FlexCarousel.mount(host, {
      items: sections.map(function (s) {
        return { src: s.src, alt: s.title, title: s.title, subtitle: s.subtitle };
      }),
      preset: "liquid",
      intro: "rise",
      cardHeight: 0.5,
      gap: 21,
      squeeze: 0.2,
      focusOnClick: true,
      captions: true,
      fit: "landscape",
      radius: 0,
      lensWidth: 0.89,
      lensHeight: 1.18,
      tilt: 0,
      roundness: 1,
      bend: 0,
      reach: 0.38,
      curl: "twist",
      dispersion: 0,
      liquid: 0,
      followCursor: false,
      autoplay: false,
      interval: 4,
      captureWheel: true,
      onSelect: function (index) {
        const section = sections[index];
        if (section) location.hash = section.href;
      }
    });
  }

  function renderCelebrityList(app, seg) {
    const key = seg[1];

    /* 泰娱：先选 单人 / CP */
    if (key === "taiYu") {
      if (seg[2] === "singles") return renderTaiList(app, "singles");
      if (seg[2] === "cps") return renderTaiList(app, "cps");
      app.innerHTML =
        '<div class="page">' +
        '<div class="page-head"><a class="btn-back" href="#/home">← 返回首页</a>' +
        '<div><div class="page-title">🇹🇭 泰娱</div><div class="page-sub">请选择分类</div></div></div>' +
        '<div class="choice-row">' +
        '<a class="choice-card glass" href="#/celebrities/taiYu/singles"><span class="emoji">👤</span><span class="label">单人</span></a>' +
        '<a class="choice-card glass" href="#/celebrities/taiYu/cps"><span class="emoji">💞</span><span class="label">CP</span></a>' +
        "</div></div>";
      return;
    }

    const meta = {
      neiDi: { title: "内娱", emoji: "🎬" },
      hanYu: { title: "韩娱", emoji: "🎵" }
    }[key];
    if (!meta) return renderHome(app);

    const list = DATA.celebrities[key] || [];
    app.innerHTML =
      '<div class="page">' +
      '<div class="page-head"><a class="btn-back" href="#/home">← 返回首页</a>' +
      "<div><div class='page-title'>" + meta.emoji + " " + meta.title + "</div>" +
      '<div class="page-sub">共 ' + list.length + " 位</div></div></div>" +
      '<div class="grid">' + list.map(celebCard).join("") + "</div>" +
      "</div>";
  }

  function renderTaiList(app, type) {
    if (type === "singles") {
      const list = DATA.celebrities.taiYu.singles;
      app.innerHTML =
        '<div class="page">' +
        '<div class="page-head"><a class="btn-back" href="#/celebrities/taiYu">← 返回</a>' +
        "<div><div class='page-title'>👤 泰娱 · 单人</div>" +
        '<div class="page-sub">共 ' + list.length + " 位</div></div></div>" +
        '<div class="grid">' + list.map(celebCard).join("") + "</div>" +
        "</div>";
      return;
    }
    /* CP */
    const cps = DATA.celebrities.taiYu.cps;
    const cards = cps
      .map((cp) => {
        const members = cp.members
          .map(
            (m) =>
              '<a class="cp-member" href="#/person/' + m.id + '">' +
              '<img class="avatar" src="' + personImage(m) + '" alt="' + esc(m.name) + '">' +
              '<span style="font-size:13px;font-weight:700;">' + esc(m.name) + "</span></a>"
          )
          .join('<span class="cp-plus">+</span>');
        const cpBtn = cp.douyin
          ? '<a class="btn-douyin btn-douyin-sm" href="' + esc(cp.douyin) + '" target="_blank" rel="noopener noreferrer">' +
            '<span class="douyin-icon">🎵</span>' + esc(cp.cpName) + "</a>"
          : "";
        return (
          '<div class="cp-card glass">' +
          '<div class="cp-top"><div class="cp-name">💞 ' + esc(cp.cpName) + "</div>" + cpBtn + "</div>" +
          '<div class="cp-members">' + members + "</div>" +
          "</div>"
        );
      })
      .join("");
    app.innerHTML =
      '<div class="page">' +
      '<div class="page-head"><a class="btn-back" href="#/celebrities/taiYu">← 返回</a>' +
      "<div><div class='page-title'>💞 泰娱 · CP</div>" +
      '<div class="page-sub">共 ' + cps.length + " 对 · 点击成员头像查看详情</div></div></div>" +
      cards +
      "</div>";
  }

  function renderPerson(app, id) {
    const p = peopleById[id];
    if (!p) return renderHome(app);
    if (p.kind === "celebrity") renderCelebrityDetail(app, p);
    else renderCharacterDetail(app, p);
  }

  function renderCelebrityDetail(app, p) {
    const c = p.data;
    const elem = ZODIAC.element[c.zodiac];
    const aliasLine = c.alias ? '<div class="detail-alias">' + esc(c.alias) + "</div>" : "";
    const cpTag = p.cpName ? '<span class="tag">CP：' + esc(p.cpName) + "</span>" : "";
    const mbtiTag = c.mbti ? '<span class="tag">MBTI ' + esc(c.mbti) + "</span>" : '<span class="tag">MBTI 未公开</span>';
    const douyinUrl = c.douyin || (window.DOUYIN && window.DOUYIN[p.id]) || "";
    const douyinBtn = douyinUrl
      ? '<div class="douyin-row"><a class="btn-douyin" href="' + esc(douyinUrl) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="douyin-icon">🎵</span>' + esc(c.name) + "</a></div>"
      : "";

    app.innerHTML =
      '<div class="page">' +
      '<div class="page-head"><a class="btn-back" href="' + personBackHref(p) + '">← 返回</a></div>' +
      '<div class="detail glass">' +
      '<div class="detail-side"><img class="avatar avatar-lg" src="' + personImage(p) + '" alt="' + esc(c.name) + '"></div>' +
      '<div class="detail-main">' +
      '<div class="detail-name">' + esc(c.name) + "</div>" + aliasLine +
      '<div class="detail-tags">' +
      '<span class="tag">' + esc(p.category) + "</span>" + cpTag +
      '<span class="tag elem">' + zodiacLine(c.zodiac) + " · " + ZODIAC.elementNames[elem] + "</span>" + mbtiTag +
      "</div>" +
      '<div><div class="section-title">生日</div><p class="paragraph">' + (c.birthday ? esc(c.birthday) : "暂无") + "</p></div>" +
      '<div><div class="section-title">简介</div><p class="paragraph">' + (c.intro ? esc(c.intro) : "暂无") + "</p></div>" +
      '<div><div class="section-title">代表作</div><p class="paragraph">' + (c.works ? esc(c.works) : "暂无") + "</p></div>" +
      douyinBtn +
      "</div></div></div>";
  }

  function renderCharacterDetail(app, p) {
    const ch = p.data;
    const elem = ZODIAC.element[ch.zodiac];
    app.innerHTML =
      '<div class="page">' +
      '<div class="page-head"><a class="btn-back" href="' + personBackHref(p) + '">← 返回</a></div>' +
      '<div class="detail glass">' +
      '<div class="detail-side"><img class="avatar avatar-lg" src="' + personImage(p) + '" alt="' + esc(ch.name) + '"></div>' +
      '<div class="detail-main">' +
      '<div class="detail-name">' + esc(ch.name) + "</div>" +
      '<div class="detail-tags">' +
      '<span class="tag">小说角色</span>' +
      '<span class="tag">《' + esc(p.novel) + "》 · " + esc(p.genre) + "</span>" +
      '<span class="tag elem">' + zodiacLine(ch.zodiac) + " · " + ZODIAC.elementNames[elem] + "</span>" +
      '<span class="tag">MBTI ' + esc(ch.mbti) + "</span>" +
      "</div>" +
      '<div><div class="section-title">性格特点</div><p class="paragraph">' + (ch.personality ? esc(ch.personality) : "暂无资料") + "</p></div>" +
      '<div><div class="section-title">星座</div><p class="paragraph">' + esc(ch.zodiac) + "（" + ZODIAC.elementNames[elem] + "）——" + esc(ZODIAC.elementDesc[elem]) + "</p></div>" +
      '<div><div class="section-title">MBTI</div><p class="paragraph">' + esc(ch.mbti) + "</p></div>" +
      '<div style="margin-top:8px;"><a class="btn-primary" style="text-decoration:none;display:inline-block;" href="#/novel/' + esc(p.novelId) + '">查看小说《' + esc(p.novel) + "》</a></div>" +
      "</div></div></div>";
  }

  function renderNovelList(app, seg) {
    const key = seg[1];
    const meta = {
      yanQing: { title: "言情", emoji: "📖" },
      baiHe: { title: "百合", emoji: "🌈" }
    }[key];
    if (!meta) return renderHome(app);

    const list = DATA.novels[key] || [];
    const cards = list
      .map(
        (n) =>
          '<a class="grid-card glass" href="#/novel/' + n.id + '">' +
          '<img class="novel-cover" src="' + coverImage(n) + '" data-fallback="' + coverDataURI(n.title) + '" alt="' + esc(n.title) + '">' +
          '<span class="card-name">' + esc(n.title) + "</span>" +
          (n.author ? '<span class="card-sub">' + esc(n.author) + "</span>" : "") +
          "</a>"
      )
      .join("");
    app.innerHTML =
      '<div class="page">' +
      '<div class="page-head"><a class="btn-back" href="#/home">← 返回首页</a>' +
      "<div><div class='page-title'>" + meta.emoji + " " + meta.title + "</div>" +
      '<div class="page-sub">共 ' + list.length + " 本</div></div></div>" +
      '<div class="grid">' + cards + "</div>" +
      "</div>";
  }

  function findNovel(id) {
    for (const g of ["yanQing", "baiHe"]) {
      const n = DATA.novels[g].find((x) => x.id === id);
      if (n) return { n: n, genre: g };
    }
    return null;
  }

  function renderNovelDetail(app, id) {
    const r = findNovel(id);
    if (!r) return renderHome(app);
    const n = r.n;
    const genreName = r.genre === "baiHe" ? "百合" : "言情";
    const chars = (n.characters || []).map(charCard).join("");
    const novelDouyinBtn =
      r.genre === "baiHe"
        ? '<div class="douyin-row"><a class="btn-douyin" href="' + esc(novelDouyinUrl(n.title)) + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="douyin-icon">🎵</span>' + esc(n.title) + "</a></div>"
        : "";

    app.innerHTML =
      '<div class="page">' +
      '<div class="page-head"><a class="btn-back" href="#/novels/' + r.genre + '">← 返回</a>' +
      "<div><div class='page-title'>" + esc(n.title) + "</div>" +
      '<div class="page-sub">' + (n.author ? esc(n.author) + " · " : "") + genreName + "</div></div></div>" +
      '<div class="detail glass">' +
      '<div class="detail-side"><img class="novel-cover" src="' + coverImage(n) + '" data-fallback="' + coverDataURI(n.title) + '" alt="' + esc(n.title) + '"></div>' +
      '<div class="detail-main">' +
      '<div class="detail-tags"><span class="tag">主角：' + esc((n.protagonists || []).join("、")) + "</span></div>" +
      '<div><div class="section-title">小说梗概</div><p class="paragraph">' + (n.synopsis ? esc(n.synopsis) : "暂无资料") + "</p></div>" +
      novelDouyinBtn +
      "</div></div>" +
      '<div style="margin-top:26px;"><div class="section-title">角色</div><div class="grid">' + chars + "</div></div>" +
      "</div>";
  }

  function renderMatch(app) {
    app.innerHTML =
      '<div class="page">' +
      '<div class="page-head"><div><div class="page-title">💞 星座匹配</div>' +
      '<div class="page-sub">搜索人物，输入你的星座，看看你们有多合拍</div></div></div>' +
      '<div class="match-wrap">' +
      '<div class="search-box">' +
      '<input id="matchSearch" type="text" placeholder="🔍 搜索明星或小说角色名字…" autocomplete="off">' +
      '<div class="suggest-list" id="suggestList"></div>' +
      "</div>" +
      '<div id="selectedArea"></div>' +
      '<div id="zodiacArea" style="display:none;">' +
      '<label class="select-label">你的星座</label>' +
      '<select id="myZodiac"></select>' +
      '<div style="margin-top:16px;"><button class="btn-primary" id="matchBtn">查看相似度</button></div>' +
      "</div>" +
      '<div id="matchResult"></div>' +
      '<div class="pair-box glass">' +
      '<div class="pair-title">💞 任选两个角色，看看你们的匹配度</div>' +
      '<div class="pair-pickers">' +
      '<div class="pair-picker">' +
      '<div class="search-box">' +
      '<input id="pairSearchA" type="text" placeholder="🔍 搜索名字…" autocomplete="off">' +
      '<div class="suggest-list" id="pairSuggestA"></div>' +
      "</div>" +
      '<div id="pairSelectedA"></div>' +
      "</div>" +
      '<div class="pair-vs">×</div>' +
      '<div class="pair-picker">' +
      '<div class="search-box">' +
      '<input id="pairSearchB" type="text" placeholder="🔍 搜索名字…" autocomplete="off">' +
      '<div class="suggest-list" id="pairSuggestB"></div>' +
      "</div>" +
      '<div id="pairSelectedB"></div>' +
      "</div>" +
      "</div>" +
      '<div style="margin-top:16px;text-align:center;"><button class="btn-primary" id="pairMatchBtn">查看两人匹配度</button></div>' +
      '<div id="pairResult"></div>' +
      "</div>" +
      "</div></div>";

    const select = document.getElementById("myZodiac");
    select.innerHTML = ZODIAC.list
      .map(
        (z) =>
          '<option value="' + z + '">' + z + " " + ZODIAC.symbol[z] + "（" + ZODIAC.elementNames[ZODIAC.element[z]] + "）</option>"
      )
      .join("");

    const input = document.getElementById("matchSearch");
    const suggest = document.getElementById("suggestList");
    let currentId = null;

    input.addEventListener("input", function () {
      const q = input.value.trim();
      if (!q) {
        suggest.classList.remove("show");
        return;
      }
      const results = PEOPLE.filter((p) => p.name.indexOf(q) !== -1).slice(0, 20);
      if (results.length === 0) {
        suggest.innerHTML = '<div class="suggest-empty">未找到，试试其他名字</div>';
      } else {
        suggest.innerHTML = results
          .map(
            (p) =>
              '<div class="suggest-item" data-id="' + p.id + '">' +
              '<img class="avatar" src="' + personImage(p) + '">' +
              '<div><div style="font-weight:700;">' + esc(p.name) + "</div>" +
              '<div style="font-size:12px;color:var(--text-soft);">' +
              (p.kind === "celebrity" ? esc(p.category) : "小说《" + esc(p.novel) + "》") +
              " · " + zodiacLine(p.zodiac) + "</div></div></div>"
          )
          .join("");
      }
      suggest.classList.add("show");
    });

    suggest.addEventListener("click", function (e) {
      const item = e.target.closest(".suggest-item");
      if (!item) return;
      selectPerson(item.dataset.id);
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".search-box")) suggest.classList.remove("show");
    });

    function selectPerson(id) {
      const p = peopleById[id];
      currentId = id;
      input.value = p.name;
      suggest.classList.remove("show");
      document.getElementById("selectedArea").innerHTML =
        '<div class="selected-card glass">' +
        '<img class="avatar" src="' + personImage(p) + '">' +
        "<div><div style='font-weight:800;font-size:16px;'>" + esc(p.name) + "</div>" +
        "<div style='font-size:13px;color:var(--text-soft);'>" + zodiacLine(p.zodiac) + (p.mbti ? " · MBTI " + esc(p.mbti) : "") + "</div></div></div>";
      document.getElementById("zodiacArea").style.display = "block";
      document.getElementById("matchResult").innerHTML = "";
    }

    document.getElementById("matchBtn").addEventListener("click", function () {
      if (!currentId) return;
      const p = peopleById[currentId];
      const myZ = document.getElementById("myZodiac").value;
      const r = similarity(p, myZ);
      const tier = tierText(r.base, r.e1, r.e2);
      document.getElementById("matchResult").innerHTML =
        '<div class="result glass">' +
        '<div class="pct">' + r.pct + "%</div>" +
        '<div class="pct-label">' + esc(p.name) + " × 你（" + myZ + "）</div>" +
        '<div class="pct-desc"><strong>' + tier.label + "</strong> · " + tier.desc + "</div></div>";
    });

    /* ---------- 双人匹配：任选两个角色 ---------- */
    function setupPairPicker(side) {
      const pairInput = document.getElementById("pairSearch" + side);
      const pairSuggest = document.getElementById("pairSuggest" + side);
      const selectedBox = document.getElementById("pairSelected" + side);
      let picked = null;

      function showSuggest(q) {
        const results = PEOPLE.filter((p) => p.name.indexOf(q) !== -1).slice(0, 20);
        if (results.length === 0) {
          pairSuggest.innerHTML = '<div class="suggest-empty">未找到，试试其他名字</div>';
        } else {
          pairSuggest.innerHTML = results
            .map(
              (p) =>
                '<div class="suggest-item" data-id="' + p.id + '">' +
                '<img class="avatar" src="' + personImage(p) + '">' +
                '<div><div style="font-weight:700;">' + esc(p.name) + "</div>" +
                '<div style="font-size:12px;color:var(--text-soft);">' +
                (p.kind === "celebrity" ? esc(p.category) : "小说《" + esc(p.novel) + "》") +
                " · " + zodiacLine(p.zodiac) + "</div></div></div>"
            )
            .join("");
        }
        pairSuggest.classList.add("show");
      }

      pairInput.addEventListener("input", function () {
        const q = pairInput.value.trim();
        if (!q) {
          pairSuggest.classList.remove("show");
          return;
        }
        showSuggest(q);
      });

      pairSuggest.addEventListener("click", function (e) {
        const item = e.target.closest(".suggest-item");
        if (!item) return;
        const p = peopleById[item.dataset.id];
        picked = p;
        pairInput.value = p.name;
        pairSuggest.classList.remove("show");
        selectedBox.innerHTML =
          '<div class="pair-selected">' +
          '<img class="avatar" src="' + personImage(p) + '">' +
          '<div><div style="font-weight:800;font-size:14px;">' + esc(p.name) + "</div>" +
          '<div style="font-size:12px;color:var(--text-soft);">' + zodiacLine(p.zodiac) +
          (p.mbti ? " · MBTI " + esc(p.mbti) : "") + "</div></div></div>";
        document.getElementById("pairResult").innerHTML = "";
      });

      document.addEventListener("click", function (e) {
        if (!e.target.closest(".pair-picker")) pairSuggest.classList.remove("show");
      });

      return function () { return picked; };
    }

    const getPairA = setupPairPicker("A");
    const getPairB = setupPairPicker("B");

    document.getElementById("pairMatchBtn").addEventListener("click", function () {
      const a = getPairA();
      const b = getPairB();
      const resultEl = document.getElementById("pairResult");
      if (!a || !b) {
        resultEl.innerHTML = '<div class="suggest-empty">请先选择两个角色</div>';
        return;
      }
      const r = pairSimilarity(a, b);
      const tier = tierText(r.base, r.e1, r.e2);
      resultEl.innerHTML =
        '<div class="result glass">' +
        '<div class="pct">' + r.pct + "%</div>" +
        '<div class="pct-label">' + esc(a.name) + "（" + esc(a.zodiac) + "） × " +
        esc(b.name) + "（" + esc(b.zodiac) + "）</div>" +
        '<div class="pct-desc"><strong>' + tier.label + "</strong> · " +
        tier.desc.replace("你们", "两人") + "</div></div>";
    });
  }

  function renderView(app) {
    app.innerHTML =
      '<div class="view-page">' +
      '<a class="btn-back view-back" href="#/home">← 返回首页</a>' +
      '<div class="view-legend glass">' +
      '<div class="lg"><span class="dot" style="background:#e8a09a;"></span>火象</div>' +
      '<div class="lg"><span class="dot" style="background:#d4b06a;"></span>土象</div>' +
      '<div class="lg"><span class="dot" style="background:#8fb8e0;"></span>风象</div>' +
      '<div class="lg"><span class="dot" style="background:#82b8c8;"></span>水象</div>' +
      "</div>" +
      '<div id="view3d"><div class="view-loading" id="viewLoading">正在加载 3D 视图…</div></div>' +
      '<div class="view-hint">🖱️ 拖拽旋转 · 滚轮缩放 · 点击头像查看详情</div>' +
      "</div>";
    if (window.RingStarView) window.RingStarView.mount(document.getElementById("view3d"));
  }

  /* ---------- 导航高亮 ---------- */
  function setActiveNav(route) {
    document.querySelectorAll(".nav-links a").forEach((a) => {
      a.classList.toggle("active", a.dataset.route === route);
    });
  }

  /* ---------- 路由 ---------- */
  function parseRoute() {
    const raw = (location.hash || "#/home").replace(/^#\/?/, "");
    return raw.split("/").filter(Boolean);
  }

  function render() {
    if (window.RingStarView) window.RingStarView.cleanup();
    if (window.FlexCarousel) window.FlexCarousel.unmount();
    const seg = parseRoute();
    const route = seg[0] || "home";
    setActiveNav(route === "view" || route === "match" ? route : "home");

    const app = document.getElementById("app");
    switch (route) {
      case "home":
        renderHome(app);
        break;
      case "celebrities":
        renderCelebrityList(app, seg);
        break;
      case "novels":
        renderNovelList(app, seg);
        break;
      case "person":
        renderPerson(app, seg[1]);
        break;
      case "novel":
        renderNovelDetail(app, seg[1]);
        break;
      case "view":
        renderView(app);
        break;
      case "match":
        renderMatch(app);
        break;
      default:
        renderHome(app);
    }
    if (window.ReflectiveCard) window.ReflectiveCard.enhance(app);
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", render);

  /* 对外暴露（three-view.js 会用到） */
  window.RingStar = {
    PEOPLE: PEOPLE,
    peopleById: peopleById,
    ZODIAC: ZODIAC,
    avatarDataURI: avatarDataURI,
    personImage: personImage,
    openPerson: function (id) {
      location.hash = "#/person/" + id;
    }
  };

  render();
})();
