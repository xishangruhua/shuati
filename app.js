/* 刷题 2.0 — 近代史 */
(function(){
  "use strict";
  var BANK=(window.QUESTION_BANK&&window.QUESTION_BANK.materials)||[];
  var LS_KEY="shuati_history_v1";
  var MASTER_TARGET=3;

  BANK.forEach(function(mat){
    // 分离单选和多选
    mat.singleQ=[];
    mat.multiQ=[];
    mat.questions.forEach(function(q,i){
      q._uid=mat.id+"#"+i;
      q._matId=mat.id;
      if(q.answer.length===1)mat.singleQ.push(q);
      else mat.multiQ.push(q);
    });
  });

  // 存储
  function loadStore(){try{return JSON.parse(localStorage.getItem(LS_KEY))||{}}catch(e){return{}}}
  function saveStore(s){localStorage.setItem(LS_KEY,JSON.stringify(s))}
  var store=loadStore();
  store.materials=store.materials||{};
  store.wrong=store.wrong||{};
  store.resume=store.resume||{};
  store.seqPos=store.seqPos||{};

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
      var sc=mat.singleQ.length,mc=mat.multiQ.length;
      var tn=sc&&mc?"单选 + 多选":mc?"多选题":"单选题";
      var meta=tn+" · 共 "+(sc+mc)+" 题"+
        (sc&&mc?"（单选"+sc+" 多选"+mc+"）":"")+
        '<div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%"></div></div>'+
        '<div class="progress-text">进度 '+pct+'%</div>';
      card.innerHTML='<div class="mc-name">'+mat.title+'</div><div class="mc-meta">'+meta+'</div>';
      card.addEventListener("click",function(){openMaterial(mat)});
      list.appendChild(card);
    });
    // 错题集
    var wc=Object.keys(store.wrong).length;
    $("wrongbook-entry").innerHTML='<div class="wrongbook-card">错题集（'+wc+' 题）</div>';
    $("wrongbook-entry").querySelector(".wrongbook-card").addEventListener("click",function(){
      if(!wc){alert("还没有错题～");return}
      startWrongbook();
    });
    $("eat-entry").innerHTML='<a href="eat.html" class="eat-entry-card">吃啥 — 今天吃什么</a>';
  }

  var currentMat=null, currentPool=null, currentType=null;
  function openMaterial(mat){
    currentMat=mat;
    $("mode-title").textContent=mat.title;
    $("mode-cheer").textContent="加油呀！祝你稳稳过";
    // 题型按钮
    var sc=mat.singleQ.length, mc=mat.multiQ.length;
    var btns=$("mode-buttons-box");
    btns.querySelector('[data-type="single"] .type-num').textContent=sc+" 题";
    btns.querySelector('[data-type="multi"] .type-num').textContent=mc+" 题";
    // 重置
    btns.querySelectorAll('.type-btn').forEach(function(b){b.classList.remove("active")});
    if(!sc)btns.querySelector('[data-type="single"]').style.opacity='.35';
    else btns.querySelector('[data-type="single"]').style.opacity='1';
    if(!mc)btns.querySelector('[data-type="multi"]').style.opacity='.35';
    else btns.querySelector('[data-type="multi"]').style.opacity='1';
    $("type-setup").classList.add("hidden");
    show("mode");
  }

  // 题型按钮点击
  $("mode-buttons-box").addEventListener("click", function(e){
    var btn=e.target.closest(".type-btn"); if(!btn)return;
    var type=btn.dataset.type;
    if(!currentMat)return;
    var pool=type==="single"?currentMat.singleQ:currentMat.multiQ;
    if(!pool.length){alert(type==="single"?"该资料没有单选题":"该资料没有多选题");return}
    // 高亮
    this.querySelectorAll('.type-btn').forEach(function(b){b.classList.remove("active")});
    btn.classList.add("active");
    currentPool=pool; currentType=type;
    showTypeSetup(pool);
  });

  function showTypeSetup(pool){
    $("type-setup").classList.remove("hidden");
    var total=pool.length;
    // 记忆位置
    var posKey=currentMat.id+"_"+currentType;
    var savedFrom=(store.seqPos[posKey]||0)+1;
    var fromVal=savedFrom>total?1:savedFrom;
    var toVal=Math.min(fromVal+19,total);
    $("seq-from").max=total;$("seq-to").max=total;
    $("seq-from").value=fromVal;$("seq-to").value=toVal;
    $("seq-from-val").textContent=fromVal;$("seq-to-val").textContent=toVal;
    $("seq-total").textContent=total;
    // 打乱面板
    var def=Math.min(20,total);
    $("shuffle-count").max=total;
    $("shuffle-count").value=def;
    $("shuffle-val").textContent=def;
    $("shuffle-total").textContent=total;
    $("shuffle-ratio").textContent="";
    // 重置子模式为顺序
    $("seq-panel").classList.remove("hidden");
    $("shuffle-panel").classList.add("hidden");
    document.querySelectorAll(".sub-mode-btn").forEach(function(b){b.classList.toggle("active",b.dataset.sub==="seq")});
  }

  // 子模式切换（顺序/打乱）
  document.querySelector(".sub-mode-row").addEventListener("click", function(e){
    var btn=e.target.closest(".sub-mode-btn"); if(!btn)return;
    this.querySelectorAll('.sub-mode-btn').forEach(function(b){b.classList.remove("active")});
    btn.classList.add("active");
    var sub=btn.dataset.sub;
    $("seq-panel").classList.toggle("hidden", sub!=="seq");
    $("shuffle-panel").classList.toggle("hidden", sub!=="shuffle");
  });

  // 开始做题
  $("start-type").addEventListener("click", function(){
    if(!currentPool||!currentMat)return;
    var sub=document.querySelector(".sub-mode-btn.active").dataset.sub;
    var list;
    if(sub==="seq"){
      var from=parseInt($("seq-from").value,10)-1;
      var to=parseInt($("seq-to").value,10);
      if(from>=to){alert("起始题号需小于结束题号");return}
      list=currentPool.slice(from,to);
    }else{
      var count=parseInt($("shuffle-count").value,10);
      list=shuffle(currentPool.slice()).slice(0,Math.min(count,currentPool.length));
    }
    startTest(currentMat,list);
  });

  // slider 事件
  $("seq-from").addEventListener("input",function(){
    var v=parseInt(this.value,10);
    $("seq-from-val").textContent=v;
    var to=Math.min(v+19,parseInt($("seq-to").max,10));
    $("seq-to").value=to;$("seq-to-val").textContent=to;
  });
  $("seq-to").addEventListener("input",function(){$("seq-to-val").textContent=this.value});
  $("shuffle-count").addEventListener("input",function(){$("shuffle-val").textContent=this.value});

  var session=null;

  function startTest(mat,list){
    session={mode:"test",mid:mat.id,list:list,idx:0,userAns:{},correctCount:0};
    show("quiz");renderQuestion();
  }

  function startWrongbook(){
    var qs=[];
    BANK.forEach(function(mat){
      mat.questions.forEach(function(q){
        if(store.wrong[q._uid]){q._matTitle=mat.title;qs.push(q)}
      });
    });
    if(!qs.length){alert("还没有错题～");return}
    // 单选在前多选在后
    var sq=qs.filter(function(q){return q.answer.length===1});
    var mq=qs.filter(function(q){return q.answer.length>1});
    var list=shuffle(sq).concat(shuffle(mq));
    session={mode:"test",mid:null,list:list,idx:0,userAns:{},correctCount:0,isWrongbook:true};
    show("quiz");renderQuestion();
  }

  function renderQuestion(){
    var q=session.list[session.idx];
    $("quiz-choice").classList.remove("hidden");
    var isTest=session.mode==="test";
    $("feedback").textContent="";$("feedback").className="feedback";
    $("explanation").classList.add("hidden");$("explanation").textContent="";
    $("submit-btn").classList.add("hidden");
    $("quiz-progress").textContent=(session.isWrongbook?"错题集 ":"")+(session.idx+1)+" / "+session.list.length;
    $("quiz-score").textContent=isTest?("已答对 "+session.correctCount):"";
    // 题型标识
    $("locate-hint").textContent=q.answer.length>1?"【多选题】":"【单选题】";
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
      if(isTest){
        el.addEventListener("click",function(){onChoose(q,e.key,el,isMulti)});
      }
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
    if(session.isWrongbook){
      var storeKey=q._matId||session.mid;
      if(storeKey){
        var st=matState(storeKey);
        var cur=st.mastery[q._uid]||0;
        st.mastery[q._uid]=ok?cur+1:0;
      }
      if(ok)delete store.wrong[q._uid];
      saveStore(store);
    }else if(session.mid){
      var st=matState(session.mid);
      var cur=st.mastery[q._uid]||0;
      st.mastery[q._uid]=ok?cur+1:0;
      if(ok)delete store.wrong[q._uid];else store.wrong[q._uid]=true;
      saveStore(store);
    }
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
      if(q.explanation&&q.explanation.trim()){
        $("explanation").textContent=q.explanation;$("explanation").classList.remove("hidden");
      }}
  }

  function finishTest(){
    var total=session.list.length;if(!total)return;
    var score=Math.round(session.correctCount/total*100);
    $("result-score").textContent=score+" 分";
    $("result-detail").textContent="共 "+total+" 题，答对 "+session.correctCount+" 题"
      +(session.isWrongbook?"　|　剩余错题 "+(Object.keys(store.wrong).length)+" 题":"");
    if(session.mid){
      var st=matState(session.mid);
      var thisScore=session.correctCount/total;
      st.scoreAvg=(st.scoreAvg==null)?thisScore:(st.scoreAvg*0.6+thisScore*0.4);
      st.tests=(st.tests||0)+1;
      var p=computeMatProgress(currentMat||BANK[0]);
      $("result-detail").textContent+="　|　近期 "+Math.round(st.scoreAvg*100)+"%　|　进度 "+p+"%";
      // 记忆顺序位置：记录做完的最后一题在 currentPool 中的下标
      if(currentPool&&currentType){
        var lastQ=session.list[session.list.length-1];
        var poolIdx=currentPool.indexOf(lastQ);
        if(poolIdx>=0) store.seqPos[currentMat.id+"_"+currentType]=poolIdx;
      }
      saveStore(store);
    }
    // 重做按钮：<100 题且非错题集显示
    $("redo-btn").classList.toggle("hidden", total>=100||session.isWrongbook);
    // 返回按钮：普通测试回模式页，错题集回首页
    $("result-back").onclick=function(e){e.preventDefault();session.isWrongbook?show("home"):show("mode")};
    show("result");
  }

  // 重做
  $("redo-btn").addEventListener("click", function(){
    if(!session||!session.list.length)return;
    session.idx=0;session.userAns={};session.correctCount=0;
    show("quiz");renderQuestion();
  });

  $("next-btn").addEventListener("click",function(){
    if(session&&session.idx<session.list.length-1){session.idx++;renderQuestion()}
    else if(session&&session.mode==="test")finishTest();
  });
  $("prev-btn").addEventListener("click",function(){
    if(session&&session.idx>0){session.idx--;renderQuestion()}
  });

  // 全局返回函数
  window.goHome=function(){renderHome();show("home")};

  if(!BANK.length){$("material-list").innerHTML="<p>未找到题库数据</p>"}
  else renderHome();
})();
