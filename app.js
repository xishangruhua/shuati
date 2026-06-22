/* 刷题 1.0 — 7文件版 */
(function () {
  "use strict";
  var BANK = (window.QUESTION_BANK && window.QUESTION_BANK.materials) || [];
  var LS_KEY = "shuati_progress_v4";
  var MASTER_TARGET = 3;

  // uid
  BANK.forEach(function (mat) {
    if (mat.sections) {
      mat.sections.forEach(function (sec, si) {
        sec.questions.forEach(function (q, i) {
          q._uid = mat.id + "#" + si + "#" + i;
          q._matId = mat.id; q._secType = sec.type; q._secLabel = sec.label;
        });
      });
    } else {
      mat.questions.forEach(function (q, i) {
        q._uid = mat.id + "#" + i; q._matId = mat.id;
      });
    }
  });

  // ---------- 存储 ----------
  function loadStore() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; } }
  function saveStore(s) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }
  var store = loadStore();
  store.materials = store.materials || {};
  store.wrong = store.wrong || {};
  store.resume = store.resume || {};
  function matState(k) {
    if (!store.materials[k]) store.materials[k] = { mastery: {}, scoreAvg: null, tests: 0, progress: 0 };
    var st = store.materials[k];
    if (!st.mastery) st.mastery = {};
    if (st.scoreAvg === undefined) st.scoreAvg = null;
    if (st.tests === undefined) st.tests = 0;
    return st;
  }

  // ---------- 工具 ----------
  function $(id) { return document.getElementById(id); }
  function show(screen) {
    ["home","mode","quiz","result"].forEach(function(s){ $(s).classList.toggle("hidden", s!==screen); });
    window.scrollTo(0,0);
  }
  function shuffle(a) { var r=a.slice(); for(var i=r.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=r[i];r[i]=r[j];r[j]=t;} return r; }
  function answerSet(q) {
    if (q.options) return q.answer.slice().sort();
    if (q.term) return [q.term];
    return [q.answer ? "T" : "F"];
  }
  function arrEq(a,b) { if(a.length!==b.length) return false; for(var i=0;i<a.length;i++) if(a[i]!==b[i]) return false; return true; }
  function optionEntries(q) {
    if (q.options) return Object.keys(q.options).map(function(k){return {key:k,text:q.options[k]};});
    if (q.choices) return q.choices.map(function(c){return {key:c,text:c};});
    return [{key:"T",text:"正确（√）"},{key:"F",text:"错误（×）"}];
  }

  // ---------- 进度：按 matId 全局算 ----------
  function computeMatProgress(mat) {
    var allQ = [];
    if (mat.sections) mat.sections.forEach(function(s){ allQ = allQ.concat(s.questions); });
    else allQ = mat.questions;
    if (!allQ.length) return 0;
    var st = matState(mat.id);
    var sum=0, attempted=0;
    allQ.forEach(function(q){
      var m = st.mastery[q._uid] || 0;
      if (m>0) attempted++;
      sum += Math.min(m, MASTER_TARGET);
    });
    var mr = sum/(allQ.length*MASTER_TARGET);
    var cov = attempted/allQ.length;
    var sa = st.scoreAvg==null ? 0 : st.scoreAvg;
    return Math.round((mr*0.5 + sa*cov*0.5)*100);
  }

  // ---------- 首页 ----------
  function renderHome() {
    var list = $("material-list"); list.innerHTML = "";
    BANK.forEach(function(mat){
      var isNew = !!mat.sections;
      var pct = computeMatProgress(mat);
      var card = document.createElement("div"); card.className = "material-card";
      var meta = "";
      if (isNew) {
        meta = mat.sections.map(function(s){ return s.label+"("+s.questions.length+"题)"; }).join(" · ");
        meta += '<div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%"></div></div>'+
                '<div class="progress-text">进度 '+pct+'%</div>';
      } else {
        var tn = mat.type==="single"?"单选题":mat.type==="multi"?"多选题":"判断题";
        meta = tn + " · 共 " + mat.questions.length + " 题" +
          '<div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%"></div></div>'+
          '<div class="progress-text">进度 '+pct+'%</div>';
      }
      card.innerHTML = '<div class="mc-name">'+mat.title+'</div><div class="mc-meta">'+meta+'</div>';
      // 复习记忆：显示上次位置
      var rp = store.resume[mat.id];
      if (rp !== undefined) {
        var allCount = 0;
        if (mat.sections) mat.sections.forEach(function(s){ allCount += s.questions.length; });
        else allCount = mat.questions.length;
        if (rp >= 0 && rp < allCount) {
          var resumeTag = document.createElement("div");
          resumeTag.className = "resume-tag";
          resumeTag.textContent = "📌 上次看到第 " + (rp+1) + " / " + allCount + " 题";
          card.appendChild(resumeTag);
        }
      }
      card.addEventListener("click", function(){ openMaterial(mat); });
      list.appendChild(card);
    });
    var wc = Object.keys(store.wrong).length;
    $("wrongbook-entry").innerHTML = '<div class="wrongbook-card">📌 错题集（'+wc+' 题）</div>';
    $("wrongbook-entry").querySelector(".wrongbook-card").addEventListener("click",function(){
      if(!wc){alert("还没有错题～");return;} startWrongbook();
    });
    // 好热 — 空调入口
    $("hot-entry").innerHTML = '<div class="hot-card">好热</div>';
    $("hot-entry").querySelector(".hot-card").addEventListener("click",function(){
      window.location.href = "ac-app/index.html";
    });
    // 好累 — 休息鼓励入口
    $("lei-entry").innerHTML = '<div class="lei-card">好累</div>';
    $("lei-entry").querySelector(".lei-card").addEventListener("click",function(){
      window.location.href = "haolei/index.html";
    });
    // 小游戏
    $("game-entry").innerHTML = '<div class="game-card">小游戏</div>';
    $("game-entry").querySelector(".game-card").addEventListener("click",function(){
      window.location.href = "game/index.html";
    });
  }

  // ---------- 打开资料 → 模式页 ----------
  var currentMat = null;

  function openMaterial(mat) {
    currentMat = mat;
    $("mode-title").textContent = mat.title;
    $("mode-cheer").textContent = "加油呀！祝你稳稳过";

    // 隐藏/显示 section slider 区
    $("test-setup").classList.add("hidden");

    // 构建多题型滑块区（仅新格式）
    var multiBox = $("multi-sliders");
    if (!multiBox) {
      multiBox = document.createElement("div"); multiBox.id = "multi-sliders"; multiBox.className = "multi-sliders";
      var ref = $("test-setup");
      ref.parentNode.insertBefore(multiBox, ref);
    }
    multiBox.innerHTML = "";
    multiBox.style.display = "none";

    var isMixed = !!mat.sections;
    var btns = $("mode-buttons-box");
    btns.style.display = "flex";

    if (isMixed) {
      btns.querySelector('[data-mode="test"]').classList.remove("hidden");
      btns.querySelector('[data-mode="review"]').textContent = "复习";

      // 直接展示多滑块（不额外加绿色按钮）
      multiBox.style.display = "block";
      multiBox.innerHTML = "";
      mat.sections.forEach(function(sec, i){
        var row = document.createElement("div"); row.className = "multi-row";
        var total = sec.questions.length;
        var def = Math.min(10, total);
        row.innerHTML =
          '<label class="multi-label">'+sec.label+'：<span class="multi-val" data-si="'+i+'">'+def+'</span> 题 / 共 '+total+' 题</label>'+
          '<input type="range" class="multi-slider" data-si="'+i+'" min="0" max="'+total+'" value="'+def+'" step="1">';
        row.querySelector(".multi-slider").addEventListener("input", function(){
          row.querySelector(".multi-val").textContent = this.value;
        });
        multiBox.appendChild(row);
      });

      // 点上面「测试」直接开始
      btns.querySelector('[data-mode="test"]').onclick = function(){
        var allQ = [];
        mat.sections.forEach(function(sec){
          var si = mat.sections.indexOf(sec);
          var cnt = parseInt(multiBox.querySelector('[data-si="'+si+'"]').parentNode.querySelector(".multi-val").textContent,10);
          if (cnt > 0) allQ = allQ.concat(shuffle(sec.questions).slice(0, cnt));
        });
        if (!allQ.length) { alert("请至少选择一个题型"); return; }
        startUnifiedTest(mat, allQ);
      };
      // 复习直接开始（取全部题型全部题）
      btns.querySelector('[data-mode="review"]').onclick = function(){
        var allQ = [];
        mat.sections.forEach(function(s){ allQ = allQ.concat(s.questions.slice()); });
        startUnifiedReview(mat, allQ);
      };
    } else {
      // 老格式：单题型
      multiBox.style.display = "none";
      btns.querySelector('[data-mode="test"]').classList.remove("hidden");
      btns.querySelector('[data-mode="review"]').textContent = "复习";
      btns.querySelector('[data-mode="review"]').onclick = function(){ startOldReview(mat); };
      btns.querySelector('[data-mode="test"]').onclick = function(){
        $("test-setup").classList.remove("hidden");
      };
      var slider = $("count-slider");
      slider.max = mat.questions.length; slider.step = 1;
      var def = Math.min(20, mat.questions.length);
      slider.value = def; $("count-value").textContent = def;
      $("total-hint").textContent = mat.questions.length;
      $("start-test").onclick = function(){
        startOldTest(mat, parseInt($("count-slider").value,10));
      };
    }
    show("mode");
  }

  // ---------- 会话 ----------
  var session = null;

  function buildTermChoices(qs) {
    var terms = qs.filter(function(q){return q.term;}).map(function(q){return q.term;});
    qs.forEach(function(q){
      if (!q.term) return;
      var others = terms.filter(function(t){return t!==q.term;});
      q.choices = shuffle([q.term].concat(shuffle(others).slice(0,3)));
    });
  }

  function startUnifiedReview(mat, qs) {
    buildTermChoices(qs);
    var rp = store.resume[mat.id];
    var startIdx = (rp !== undefined && rp >= 0 && rp < qs.length) ? rp : 0;
    session = { mode:"review", mid:mat.id, isWrongbook:false, list:qs, idx:startIdx };
    show("quiz"); renderQuestion();
  }
  function startUnifiedTest(mat, qs) {
    buildTermChoices(qs);
    session = { mode:"test", mid:mat.id, isWrongbook:false, list:qs, idx:0, userAns:{}, correctCount:0, essayRemembered:{} };
    show("quiz"); renderQuestion();
  }
  function startOldReview(mat) {
    var qs = mat.questions.slice();
    if (mat.type==="term") buildTermChoices(qs);
    var rp = store.resume[mat.id];
    var startIdx = (rp !== undefined && rp >= 0 && rp < qs.length) ? rp : 0;
    session = { mode:"review", mid:mat.id, isWrongbook:false, list:qs, idx:startIdx };
    show("quiz"); renderQuestion();
  }
  function startOldTest(mat, count) {
    var qs = mat.questions.slice();
    if (mat.type==="term") buildTermChoices(qs);
    var picked = shuffle(qs).slice(0, Math.min(count, qs.length));
    session = { mode:"test", mid:mat.id, isWrongbook:false, list:picked, idx:0, userAns:{}, correctCount:0 };
    show("quiz"); renderQuestion();
  }
  function startWrongbook() {
    var wu = Object.keys(store.wrong); var qs = [];
    BANK.forEach(function(mat){
      var all = mat.sections ? [] : mat.questions;
      if (mat.sections) mat.sections.forEach(function(s){ all=all.concat(s.questions); });
      all.forEach(function(q){ if(store.wrong[q._uid]){q._matTitle=mat.title;qs.push(q);} });
    });
    buildTermChoices(qs);
    session = { mode:"test", mid:null, isWrongbook:true, list:shuffle(qs), idx:0, userAns:{}, correctCount:0, essayRemembered:{} };
    show("quiz"); renderQuestion();
  }

  // ---------- 判断题型 ----------
  function questionType(q) {
    if (q.term) return "term";
    if (q.options) return "choice";
    // essay: 有 stem + answer 是长文本 + 无 options
    if (q.stem && !q.options && typeof q.answer === "string" && q.answer.length > 5) return "essay";
    if (q.stem && !q.options && typeof q.answer === "string") return "essay";
    return "judge";
  }

  // ---------- 渲染 ----------
  function renderQuestion() {
    var q = session.list[session.idx];
    var qt = questionType(q);

    // 复习模式：记忆当前位置
    if (session.mode === "review" && !session.isWrongbook && session.mid) {
      store.resume[session.mid] = session.idx;
      saveStore(store);
    }

    if (qt === "essay") {
      $("quiz-choice").classList.add("hidden"); $("quiz-essay").classList.remove("hidden");
      renderEssay(q);
    } else {
      $("quiz-choice").classList.remove("hidden"); $("quiz-essay").classList.add("hidden");
      renderChoice(q);
    }
    updateNav();
  }

  function renderEssay(q) {
    $("essay-stem").textContent = q.stem || "";
    $("show-answer-btn").classList.remove("hidden");
    $("show-answer-btn").textContent = "显示答案";
    $("essay-answer").classList.add("hidden");
    $("essay-answer").textContent = q.answer || "（暂无答案）";
    $("remember-btn").classList.add("hidden");

    var isTest = session.mode === "test";
    var remembered = session.essayRemembered && session.essayRemembered[q._uid];

    $("quiz-progress").textContent = (session.isWrongbook?"错题集 ":"") + (session.idx+1)+" / "+session.list.length;
    $("quiz-score").textContent = isTest ? ("已答对 "+session.correctCount) : "浏览模式";

    // 如果是测试且已记住
    if (isTest && remembered) {
      $("show-answer-btn").classList.add("hidden");
      $("essay-answer").classList.remove("hidden");
      $("remember-btn").classList.add("hidden");
    }
    // 复习模式直接展示答案
    if (session.mode === "review") {
      $("show-answer-btn").classList.add("hidden");
      $("essay-answer").classList.remove("hidden");
    }
  }

  function renderChoice(q) {
    var isTest = session.mode === "test";
    $("locate-hint").textContent = ""; $("feedback").textContent="";$("feedback").className="feedback";
    $("explanation").classList.add("hidden"); $("explanation").textContent="";
    $("submit-btn").classList.add("hidden");

    $("quiz-progress").textContent = (session.isWrongbook?"错题集 ":"")+(session.idx+1)+" / "+session.list.length;
    $("quiz-score").textContent = isTest ? ("已答对 "+session.correctCount) : "复习模式";

    var isTerm = !!q.term;
    $("question-stem").textContent = isTerm ? q.definition : q.stem;

    var box = $("options"); box.innerHTML = "";
    var entries = q._renderEntries || (isTest ? shuffle(optionEntries(q)) : optionEntries(q));
    q._renderEntries = entries;
    var isMulti = q.options && q.answer.length > 1;
    var correctSet = answerSet(q);

    entries.forEach(function(e){
      var el = document.createElement("button");
      el.className = "option" + (isTerm ? " term-option" : "");
      el.innerHTML = '<span class="opt-key">'+(!isTerm?e.key+".":"")+'</span>'+e.text;
      el.dataset.key = e.key;
      if (!isTest) {
        if(correctSet.indexOf(e.key)>=0) el.classList.add("correct-highlight");
        el.classList.add("disabled");
      } else {
        el.addEventListener("click",function(){ onChoose(q, e.key, el, isMulti); });
      }
      box.appendChild(el);
    });

    if (isTest && isMulti && !session.userAns[q._uid]) {
      $("submit-btn").classList.remove("hidden"); session._multiSel=[];
    }
    if (isTest && session.userAns[q._uid]) revealResult(q, session.userAns[q._uid]);
  }

  function updateNav() {
    $("prev-btn").disabled = session.idx === 0;
    $("next-btn").textContent = session.idx === session.list.length-1 ? "完成" : "下一道 →";
    // 同步滑动条
    var sl = $("question-slider");
    sl.max = session.list.length;
    sl.value = session.idx + 1;
    $("slider-num-start").textContent = session.idx + 1;
    $("slider-num-end").textContent = session.list.length;
  }

  // ---------- 作答 ----------
  function onChoose(q,key,el,isMulti){
    if(session.userAns[q._uid])return;
    if(isMulti){ el.classList.toggle("selected"); var i=session._multiSel.indexOf(key);
      if(i>=0)session._multiSel.splice(i,1);else session._multiSel.push(key); return; }
    judge(q,[key]);
  }

  $("submit-btn").addEventListener("click",function(){
    var q = session.list[session.idx];
    if(!session._multiSel||!session._multiSel.length){alert("请至少选择一项");return;}
    judge(q, session._multiSel.slice());
  });

  // 问答：显示/关闭答案
  $("show-answer-btn").addEventListener("click",function(){
    var a = $("essay-answer");
    if (a.classList.contains("hidden")) {
      a.classList.remove("hidden");
      $("show-answer-btn").textContent = "关闭答案";
      if (session.mode === "test") $("remember-btn").classList.remove("hidden");
    } else {
      a.classList.add("hidden");
      $("show-answer-btn").textContent = "显示答案";
      $("remember-btn").classList.add("hidden");
    }
  });

  // 问答：我已记住
  $("remember-btn").addEventListener("click",function(){
    var q = session.list[session.idx];
    session.essayRemembered = session.essayRemembered || {};
    session.essayRemembered[q._uid] = true;
    session.correctCount++;
    // 记入 mastery
    if (!session.isWrongbook && session.mid) {
      var st = matState(session.mid);
      var cur = st.mastery[q._uid] || 0;
      st.mastery[q._uid] = cur + 1;
    }
    if (!session.isWrongbook) delete store.wrong[q._uid];
    else store.wrong[q._uid] = true;
    saveStore(store);
    $("remember-btn").classList.add("hidden");
    // 自动下一道
    setTimeout(function(){
      if (session.idx < session.list.length-1) { session.idx++; renderQuestion(); }
      else finishTest();
    }, 400);
  });

  function judge(q, chosen) {
    var correct = answerSet(q);
    var ok = arrEq(chosen.slice().sort(), correct);
    session.userAns[q._uid] = { chosen:chosen, ok:ok };
    if (ok) session.correctCount++;

    var storeKey = session.isWrongbook ? q._matId : session.mid;
    if (storeKey) {
      var st = matState(storeKey);
      var cur = st.mastery[q._uid]||0;
      st.mastery[q._uid] = ok ? cur+1 : 0;
    }
    if (ok) delete store.wrong[q._uid]; else store.wrong[q._uid]=true;
    saveStore(store);
    revealResult(q, session.userAns[q._uid]);

    if (ok) {
      $("submit-btn").classList.add("hidden");
      setTimeout(function(){
        if(session.idx<session.list.length-1){session.idx++;renderQuestion();}
        else finishTest();
      },550);
    }
  }

  function revealResult(q, ans) {
    var correct = answerSet(q);
    $("submit-btn").classList.add("hidden");
    Array.prototype.forEach.call($("options").children, function(el){
      var k = el.dataset.key;
      el.classList.add("disabled"); el.classList.remove("selected");
      var isC=correct.indexOf(k)>=0, isCh=ans.chosen.indexOf(k)>=0;
      if(isCh&&isC)el.classList.add("chosen-right");
      else if(isCh&&!isC)el.classList.add("chosen-wrong");
      else if(isC)el.classList.add("show-correct");
    });
    var fb=$("feedback");
    if(ans.ok){fb.textContent="✓ 回答正确";fb.className="feedback right";}
    else {
      fb.textContent="✗ 回答错误，正确答案："+correct.join("");
      fb.className="feedback wrong";
      $("locate-hint").textContent=(q.chapter?q.chapter+" ":"")+"第 "+q.num+" 题";
      var ex=$("explanation");
      if(q.term){ex.textContent="正确名词："+q.term+" = "+(q.definition||"");}
      else {ex.textContent=q.explanation&&q.explanation.trim()?q.explanation:"（暂无解析）";}
      ex.classList.remove("hidden");
    }
  }

  function finishTest(){
    var total=session.list.length;
    if(!total)return;
    // 问答不计入分数（不算选择判断题的答对率，但"我已记住"算正确）
    // 这里简单处理：所有答对（含记住）/总题数
    var score = Math.round(session.correctCount/total*100);
    $("result-score").textContent=score+" 分";
    $("result-detail").textContent="共 "+total+" 题，答对（含记住）"+session.correctCount+" 题";

    if(!session.isWrongbook&&session.mid){
      var st=matState(session.mid);
      var thisScore=session.correctCount/total;
      st.scoreAvg=(st.scoreAvg==null)?thisScore:(st.scoreAvg*0.6+thisScore*0.4);
      st.tests=(st.tests||0)+1;
      var p = computeMatProgress(currentMat||BANK[0]);
      $("result-detail").textContent+="　|　近期 "+Math.round(st.scoreAvg*100)+"%　|　进度 "+p+"%";
      saveStore(store);
    }
    show("result");
  }

  // ---------- 导航 ----------
  $("next-btn").addEventListener("click",function(){
    if(session.idx<session.list.length-1){session.idx++;renderQuestion();}
    else if(session.mode==="test") finishTest();
    else show("home");
  });
  $("prev-btn").addEventListener("click",function(){
    if(session.idx>0){session.idx--;renderQuestion();}
  });

  $("quiz").addEventListener("click",function(e){
    if(session&&session.mode==="review"&&
       !e.target.closest(".quiz-nav")&&!e.target.closest(".back")&&
       !e.target.closest("#show-answer-btn")&&!e.target.closest("#remember-btn")){
      if(session.idx<session.list.length-1){session.idx++;renderQuestion();}
    }
  });
  document.addEventListener("keydown",function(e){
    if(!session||$("quiz").classList.contains("hidden"))return;
    if(e.key==="ArrowDown"||(session.mode==="review"&&e.key==="ArrowRight")){
      e.preventDefault(); if(session.idx<session.list.length-1){session.idx++;renderQuestion();}
    } else if(e.key==="ArrowUp"||e.key==="ArrowLeft"){
      e.preventDefault(); if(session.idx>0){session.idx--;renderQuestion();}
    }
  });

  // 老格式 slider
  $("count-slider").addEventListener("input",function(){ $("count-value").textContent=this.value; });

  // 题号滑动条 — 跳转定位
  $("question-slider").addEventListener("change",function(){
    var idx = parseInt(this.value, 10) - 1;
    if (session && idx >= 0 && idx < session.list.length) {
      session.idx = idx;
      renderQuestion();
    }
  });

  // 返回
  Array.prototype.forEach.call(document.querySelectorAll("[data-go]"),function(btn){
    btn.addEventListener("click",function(){
      if(btn.dataset.go==="home"){renderHome();show("home");} else show(btn.dataset.go);
    });
  });

  if(!BANK.length){$("material-list").innerHTML="<p>未找到题库数据</p>";}
  else renderHome();
})();
