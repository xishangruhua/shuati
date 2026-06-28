/* 刷题 2.0 — 近代史 */
(function(){
  "use strict";
  var BANK=(window.QUESTION_BANK&&window.QUESTION_BANK.materials)||[];
  var LS_KEY="shuati_history_v1";
  var MASTER_TARGET=3;

  BANK.forEach(function(mat){
    mat.questions.forEach(function(q,i){
      q._uid=mat.id+"#"+i;
      q._matId=mat.id;
    });
  });

  // 存储
  function loadStore(){try{return JSON.parse(localStorage.getItem(LS_KEY))||{}}catch(e){return{}}}
  function saveStore(s){localStorage.setItem(LS_KEY,JSON.stringify(s))}
  var store=loadStore();
  store.materials=store.materials||{};
  store.wrong=store.wrong||{};
  store.resume=store.resume||{};

  function matState(k){
    if(!store.materials[k])store.materials[k]={mastery:{},scoreAvg:null,tests:0};
    var st=store.materials[k];
    if(!st.mastery)st.mastery={};
    if(st.scoreAvg===undefined)st.scoreAvg=null;
    if(st.tests===undefined)st.tests=0;
    return st;
  }

  function $(id){return document.getElementById(id)}
  function show(s){
    ["home","mode","quiz","result"].forEach(function(sn){$(sn).classList.toggle("hidden",sn!==s)});
    window.scrollTo(0,0);
  }
  function shuffle(a){var r=a.slice();for(var i=r.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=r[i];r[i]=r[j];r[j]=t}return r}
  function answerSet(q){return q.answer.slice().sort()}
  function arrEq(a,b){if(a.length!==b.length)return false;for(var i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true}
  function optionEntries(q){return Object.keys(q.options).map(function(k){return{key:k,text:q.options[k]}})}

  function computeMatProgress(mat){
    var allQ=mat.questions;
    if(!allQ.length)return 0;
    var st=matState(mat.id),sum=0,attempted=0;
    allQ.forEach(function(q){
      var m=st.mastery[q._uid]||0;
      if(m>0)attempted++;
      sum+=Math.min(m,MASTER_TARGET);
    });
    var mr=sum/(allQ.length*MASTER_TARGET);
    var cov=attempted/allQ.length;
    var sa=st.scoreAvg==null?0:st.scoreAvg;
    return Math.round((mr*0.5+sa*cov*0.5)*100);
  }

  // 首页
  function renderHome(){
    var list=$("material-list");list.innerHTML="";
    BANK.forEach(function(mat){
      var pct=computeMatProgress(mat);
      var card=document.createElement("div");card.className="material-card";
      var isMulti=mat.questions[0]&&mat.questions[0].answer&&mat.questions[0].answer.length>1;
      var tn=isMulti?"多选题":"单选题";
      var meta=tn+" · 共 "+mat.questions.length+" 题"+
        '<div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%"></div></div>'+
        '<div class="progress-text">进度 '+pct+'%</div>';
      card.innerHTML='<div class="mc-name">'+mat.title+'</div><div class="mc-meta">'+meta+'</div>';
      var rp=store.resume[mat.id];
      if(rp!==undefined&&rp>=0&&rp<mat.questions.length){
        var resumeTag=document.createElement("div");
        resumeTag.className="resume-tag";
        resumeTag.textContent="📌 上次看到第 "+(rp+1)+" / "+mat.questions.length+" 题";
        card.appendChild(resumeTag);
      }
      card.addEventListener("click",function(){openMaterial(mat)});
      list.appendChild(card);
    });
    $("eat-entry-info").innerHTML='<a href="eat.html" class="eat-entry-card">🍽 吃啥 — 今天吃什么</a>';
  }

  var currentMat=null;
  function openMaterial(mat){
    currentMat=mat;
    $("mode-title").textContent=mat.title;
    $("mode-cheer").textContent="加油呀！祝你稳稳过";
    $("test-setup").classList.add("hidden");
    var btns=$("mode-buttons-box");
    btns.querySelector('[data-mode="test"]').classList.remove("hidden");
    btns.querySelector('[data-mode="review"]').onclick=function(){startReview(mat)};
    btns.querySelector('[data-mode="test"]').onclick=function(){
      $("test-setup").classList.remove("hidden");
    };
    var slider=$("count-slider");
    slider.max=mat.questions.length;
    var def=Math.min(20,mat.questions.length);
    slider.value=def;$("count-value").textContent=def;
    $("total-hint").textContent=mat.questions.length;
    $("start-test").onclick=function(){startTest(mat,parseInt($("count-slider").value,10))};
    show("mode");
  }

  var session=null;

  function startReview(mat){
    var qs=mat.questions.slice();
    var rp=store.resume[mat.id];
    var startIdx=(rp!==undefined&&rp>=0&&rp<qs.length)?rp:0;
    session={mode:"review",mid:mat.id,list:qs,idx:startIdx};
    show("quiz");renderQuestion();
  }

  function startTest(mat,count){
    var picked=shuffle(mat.questions.slice()).slice(0,Math.min(count,mat.questions.length));
    session={mode:"test",mid:mat.id,list:picked,idx:0,userAns:{},correctCount:0};
    show("quiz");renderQuestion();
  }

  function renderQuestion(){
    var q=session.list[session.idx];
    if(session.mode==="review"&&session.mid){
      store.resume[session.mid]=session.idx;
      saveStore(store);
    }
    $("quiz-choice").classList.remove("hidden");$("quiz-essay").classList.add("hidden");
    var isTest=session.mode==="test";
    $("locate-hint").textContent="";$("feedback").textContent="";$("feedback").className="feedback";
    $("explanation").classList.add("hidden");
    $("submit-btn").classList.add("hidden");
    $("quiz-progress").textContent=(session.idx+1)+" / "+session.list.length;
    $("quiz-score").textContent=isTest?("已答对 "+session.correctCount):"复习模式";
    $("question-stem").textContent=q.stem;
    var box=$("options");box.innerHTML="";
    var entries=optionEntries(q);
    var isMulti=q.answer.length>1;
    var correctSet=answerSet(q);
    entries.forEach(function(e){
      var el=document.createElement("button");
      el.className="option";
      el.innerHTML='<span class="opt-key">'+e.key+".</span>"+e.text;
      el.dataset.key=e.key;
      if(!isTest){if(correctSet.indexOf(e.key)>=0)el.classList.add("correct-highlight");el.classList.add("disabled")}
      else{el.addEventListener("click",function(){onChoose(q,e.key,el,isMulti)})}
      box.appendChild(el);
    });
    if(isTest&&isMulti&&!session.userAns[q._uid]){$("submit-btn").classList.remove("hidden");session._multiSel=[]}
    if(isTest&&session.userAns[q._uid])revealResult(q,session.userAns[q._uid]);
    $("prev-btn").disabled=session.idx===0;
    $("next-btn").textContent=session.idx===session.list.length-1?"完成":"下一道 →";
  }

  function onChoose(q,key,el,isMulti){
    if(session.userAns[q._uid])return;
    if(isMulti){el.classList.toggle("selected");var i=session._multiSel.indexOf(key);
      if(i>=0)session._multiSel.splice(i,1);else session._multiSel.push(key);return}
    judge(q,[key]);
  }

  $("submit-btn").addEventListener("click",function(){
    var q=session.list[session.idx];
    if(!session._multiSel||!session._multiSel.length){alert("请至少选择一项");return}
    judge(q,session._multiSel.slice());
  });

  function judge(q,chosen){
    var correct=answerSet(q);
    var ok=arrEq(chosen.slice().sort(),correct);
    session.userAns[q._uid]={chosen:chosen,ok:ok};
    if(ok)session.correctCount++;
    var st=matState(session.mid);
    var cur=st.mastery[q._uid]||0;
    st.mastery[q._uid]=ok?cur+1:0;
    if(ok)delete store.wrong[q._uid];else store.wrong[q._uid]=true;
    saveStore(store);
    revealResult(q,session.userAns[q._uid]);
    if(ok){
      $("submit-btn").classList.add("hidden");
      setTimeout(function(){
        if(session.idx<session.list.length-1){session.idx++;renderQuestion()}
        else finishTest();
      },550);
    }
  }

  function revealResult(q,ans){
    var correct=answerSet(q);$("submit-btn").classList.add("hidden");
    Array.prototype.forEach.call($("options").children,function(el){
      var k=el.dataset.key;el.classList.add("disabled");el.classList.remove("selected");
      var isC=correct.indexOf(k)>=0,isCh=ans.chosen.indexOf(k)>=0;
      if(isCh&&isC)el.classList.add("chosen-right");
      else if(isCh&&!isC)el.classList.add("chosen-wrong");
      else if(isC)el.classList.add("show-correct");
    });
    var fb=$("feedback");
    if(ans.ok){fb.textContent="✓ 回答正确";fb.className="feedback right"}
    else{fb.textContent="✗ 回答错误，正确答案："+correct.join("");fb.className="feedback wrong";
      var ex=$("explanation");
      ex.textContent=q.explanation&&q.explanation.trim()?q.explanation:"（暂无解析）";
      ex.classList.remove("hidden")}
  }

  function finishTest(){
    var total=session.list.length;if(!total)return;
    var score=Math.round(session.correctCount/total*100);
    $("result-score").textContent=score+" 分";
    $("result-detail").textContent="共 "+total+" 题，答对 "+session.correctCount+" 题";
    if(session.mid){
      var st=matState(session.mid);
      var thisScore=session.correctCount/total;
      st.scoreAvg=(st.scoreAvg==null)?thisScore:(st.scoreAvg*0.6+thisScore*0.4);
      st.tests=(st.tests||0)+1;
      var p=computeMatProgress(currentMat||BANK[0]);
      $("result-detail").textContent+="　|　近期 "+Math.round(st.scoreAvg*100)+"%　|　进度 "+p+"%";
      saveStore(store);
    }
    show("result");
  }

  $("next-btn").addEventListener("click",function(){
    if(session.idx<session.list.length-1){session.idx++;renderQuestion()}
    else if(session.mode==="test")finishTest();
    else show("home");
  });
  $("prev-btn").addEventListener("click",function(){
    if(session.idx>0){session.idx--;renderQuestion()}
  });
  $("count-slider").addEventListener("input",function(){$("count-value").textContent=this.value});
  Array.prototype.forEach.call(document.querySelectorAll("[data-go]"),function(btn){
    btn.addEventListener("click",function(){if(btn.dataset.go==="home"){renderHome();show("home")}else show(btn.dataset.go)});
  });

  if(!BANK.length){$("material-list").innerHTML="<p>未找到题库数据</p>"}
  else renderHome();
})();
