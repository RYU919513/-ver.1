"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const Import = require("../card-import.js");

const valid = id => ({ id, name:`架空カード${id}`, civilization:["火"], type:"クリーチャー", race:["テスト"], cost:1, power:1000, text:"テスト専用", number:`T-${id}`, source:"test", checkedAt:"2026-01-01", verificationStatus:"needs_verification", ai:{} });

test("JSONとCSVを解析する", () => {
  assert.equal(Import.parse(JSON.stringify([valid("j")]), "json")[0].id, "j");
  const [card] = Import.parse('id,name,civilization,type,race,cost,power,text,number\nc,CSVカード,"火|自然",クリーチャー,テスト,2,2000,"改行,対応",T-C', "csv");
  assert.deepEqual(card.civilization,["火","自然"]); assert.equal(card.text,"改行,対応"); assert.equal(card.cost,2);
});

test("新規・一致・更新・重複・競合・不正・要確認を分類する", () => {
  const old=valid("old"), same=structuredClone(old), update={...old,power:2000}, conflict={...valid("other"),name:old.name,number:old.number};
  const input=[valid("new"),valid("dup"),valid("dup"),conflict,{name:"broken"},{...valid("review"),source:""}];
  const statuses=Import.stage(input,[old]).map(x=>x.status);
  assert.deepEqual(statuses,["new","duplicate","duplicate","conflict","invalid","review"]);
  assert.equal(Import.stage([same],[old])[0].status,"match");
  assert.equal(Import.stage([update],[old])[0].status,"update");
  assert.deepEqual(Import.stage([update],[old])[0].changes.find(x=>x.field==="power"),{field:"power",oldValue:1000,newValue:2000});
});

test("ERROR・競合は承認反映対象にならず、安全なexportだけを返す", () => {
  const good={...Import.stage([{...valid("ok"),verificationStatus:"verified"}],[])[0],approved:true};
  const bad={...Import.stage([{name:"bad"}],[])[0],approved:true};
  const unknown={...Import.stage([{...valid("terms"),usageAllowed:false}],[])[0],approved:true};
  assert.deepEqual(Import.exportable({entries:[good,bad,unknown]}).map(x=>x.id),["ok"]);
});

for (const count of [100,1000]) test(`${count}件をステージングし重複検出できる`, () => {
  const cards=Array.from({length:count},(_,i)=>valid(String(i))); cards[count-1]={...cards[count-2]};
  const start=performance.now(), staged=Import.stage(cards,[]), elapsed=performance.now()-start;
  assert.equal(staged.length,count); assert.equal(staged.filter(x=>x.status==="duplicate").length,2); assert.ok(elapsed<5000);
});
