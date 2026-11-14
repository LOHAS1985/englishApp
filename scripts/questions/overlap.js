// usage: node overlap.js <file.json> ... 台本と選択肢の語の重なりを確認する(リポジトリ外に置く)
const fs=require("fs");
const SW=new Set("the a an and or but of to in on at for with from by as is are was were be been being it its this that these those i you he she we they me him her us them my your his our their do does did have has had will would can could should may might not no so if then than there here what when where who why how which about into over after before up down out off just very too also more most some any all each one two three four five six get got go going".split(" "));
const stem=w=>w.replace(/(ing|ed|es|s)$/,"");
const words=t=>(t.toLowerCase().match(/[a-z]+/g)||[]).filter(w=>w.length>=3&&!SW.has(w)).map(stem);
let total=0,leak=0,maxRight=0,rows=[];
for(const f of process.argv.slice(2)){
  const a=JSON.parse(fs.readFileSync(f,"utf8"));
  for(const s of a){
    if(!s.script)continue;
    const sc=new Set(words(s.script));
    s.questions.forEach((q,qi)=>{
      const idx="ABCD".indexOf(q.answer);
      const ov=q.choices.map(c=>{const w=words(c);return w.length?w.filter(x=>sc.has(x)).length/w.length:0});
      total++;
      if(ov[idx]===1){leak++;rows.push(`${s.id} q${qi+1} 正解の語が全部台本に出る`);}
      if(ov[idx]>=Math.max(...ov.filter((_,i)=>i!==idx)) && ov[idx]>0)maxRight++;
    });
  }
}
console.log(`設問 ${total} / 正解の語が全部台本に出る ${leak} (${(100*leak/total).toFixed(0)}%) / 正解の一致が最多か同点 ${(100*maxRight/total).toFixed(0)}%`);
rows.slice(0,40).forEach(r=>console.log("  "+r));
