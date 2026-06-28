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
    $("eat-entry-info").innerHTML='<a href="eat.html" class="eat-entry-card">🍽 吃啥 — 今天吃什么</a>';
  }

  var currentMat=null;
  function openMaterial(mat){
    currentMat=mat;
    $("mode-title").textContent=mat.title;
    $("mode-cheer").textContent="加油呀！祝你稳稳过";
    $("seq-setup").classList.add("hidden");
    $("shuffle-setup").classList.add("hidden");

    var btns=$("mode-buttons-box");
    btns.querySelector('[data-mode="seq"]').onclick=function(){showSeq(mat)};
    btns.querySelector('[data-mode="shuffle"]').onclick=function(){showShuffle(mat)};
    show("mode");
  }

  function showSeq(mat){
    $("seq-setup").classList.remove("hidden");
    $("shuffle-setup").classList.add("hidden");
    var total=mat.questions.length;
    $("seq-from").max=total;$("seq-to").max=total;
    $("seq-from").value=1;$("seq-to").value=Math.min(50,total);
    $("seq-from-val").textContent=1;$("seq-to-val").textContent=Math.min(50,total);
    $("seq-total").textContent=total;
    $("start-seq").onclick=function(){
      var from=parseInt($("seq-from").value,10)-1;
      var to=parseInt($("seq-to").value,10);
      if(from>=to){alert("起始题号需小于结束题号");return}
      // 单选在前多选在后，按序取
      var list=mat.questions.slice(from,to);
      startTest(mat,list);
    };
  }

  function showShuffle(mat){
    $("seq-setup").classList.add("hidden");
    $("shuffle-setup").classList.remove("hidden");
    var sc=mat.singleQ.length,mc=mat.multiQ.length;
    var total=sc+mc;
    var def=Math.min(20,total);
    $("shuffle-count").max=total;
    $("shuffle-count").value=def;
    $("shuffle-val").textContent=def;
    $("shuffle-total").textContent=total;
    if(sc&&mc){
      $("shuffle-ratio").textContent="（单选:"+sc+" 多选:"+mc+"，按比例分配）";
    }else{
      $("shuffle-ratio").textContent="";
    }
    $("start-shuffle").onclick=function(){
      var count=parseInt($("shuffle-count").value,10);
      // 按比例分配
      var scount,mcount;
      if(sc&&mc){
        var ratio=sc/total;
        scount=Math.round(count*ratio);
        mcount=count-scount;
      }else if(sc){
        scount=count;mcount=0;
      }else{
        mcount=count;scount=0;
      }
      var sPick=shuffle(mat.singleQ.slice()).slice(0,Math.min(scount,sc));
      var mPick=shuffle(mat.multiQ.slice()).slice(0,Math.min(mcount,mc));
      // 单选在前多选在后
      var list=sPick.concat(mPick);
      startTest(mat,list);
    };
  }

  var session=null;

  function startTest(mat,list){
    session={mode:"test",mid:mat.id,list:list,idx:0,userAns:{},correctCount:0};
    show("quiz");renderQuestion();
  }

  function renderQuestion(){
    var q=session.list[session.idx];
    $("quiz-choice").classList.remove("hidden");
    var isTest=session.mode==="test";
    $("feedback").textContent="";$("feedback").className="feedback";
    $("explanation").classList.add("hidden");$("explanation").textContent="";
    $("submit-btn").classList.add("hidden");
    $("quiz-progress").textContent=(session.idx+1)+" / "+session.list.length;
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
    if(session.mid){
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
    if(session&&session.idx<session.list.length-1){session.idx++;renderQuestion()}
    else if(session&&session.mode==="test")finishTest();
  });
  $("prev-btn").addEventListener("click",function(){
    if(session&&session.idx>0){session.idx--;renderQuestion()}
  });
  $("seq-from").addEventListener("input",function(){$("seq-from-val").textContent=this.value});
  $("seq-to").addEventListener("input",function(){$("seq-to-val").textContent=this.value});
  $("shuffle-count").addEventListener("input",function(){$("shuffle-val").textContent=this.value});

  // 返回
  window.goHome=function(){renderHome();show("home")};

  if(!BANK.length){$("material-list").innerHTML="<p>未找到题库数据</p>"}
  else renderHome();
})();
