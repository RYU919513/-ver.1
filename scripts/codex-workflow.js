#!/usr/bin/env node
"use strict";

const cp = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = cp.execFileSync("git", ["rev-parse", "--show-toplevel"], {encoding:"utf8"}).trim();
const run = (command, args=[], options={}) => cp.execFileSync(command, args, {cwd:root, encoding:"utf8", stdio:options.capture ? "pipe" : "inherit"});
const output = (command, args=[]) => cp.execFileSync(command, args, {cwd:root, encoding:"utf8"}).trim();
const checkpointPath = path.join(root, ".codex/checkpoint.json");
const expectedFiles = ["README.md", "DEVELOPMENT_ROADMAP.md", "index.html", "firebase-auth.js", "card-import.js", ".codex/workflow.json"];

function identity() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
  const missing = expectedFiles.filter(file => !fs.existsSync(path.join(root,file)));
  if (pkg.name !== "duel-masters-deck-manager" || missing.length) {
    throw new Error(`WRONG APPLICATION / NOT READY: package=${pkg.name}; missing=${missing.join(",") || "none"}`);
  }
  return pkg;
}

function checkpoint() {
  const value = JSON.parse(fs.readFileSync(checkpointPath,"utf8"));
  if (value.schemaVersion !== 2 || value.application !== "DUELIX CFL") throw new Error("Invalid checkpoint schema or application");
  if (!["CODEX","COPILOT","HUMAN","NONE"].includes(value.activeExecutor)) throw new Error("Invalid activeExecutor");
  if (value.activeExecutor !== "NONE" && !value.baseCommit) throw new Error("Active work requires baseCommit");
  for (const field of ["taskOwner","taskId","targetBranch","copilotStatus","githubSyncStatus"]) if (typeof value[field] !== "string") throw new Error(`Invalid checkpoint field: ${field}`);
  for (const field of ["relatedIssue","relatedPR","lastReviewedCommit"]) if (value[field] !== null && typeof value[field] !== "string") throw new Error(`Invalid checkpoint field: ${field}`);
  const currentBranch=output("git",["branch","--show-current"]);
  if (currentBranch && value.targetBranch !== currentBranch) throw new Error("Checkpoint targetBranch does not match current branch");
  run("git",["cat-file","-e",`${value.baseCommit}^{commit}`]);
  try { run("git",["merge-base","--is-ancestor",value.baseCommit,"HEAD"],{capture:true}); } catch { throw new Error("Checkpoint base is not an ancestor of HEAD"); }
  return value;
}

function scanSecrets() {
  const files = output("git",["ls-files","--cached","--others","--exclude-standard"]).split("\n").filter(Boolean);
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{40,}\b/
  ];
  const hits=[];
  for (const file of files) {
    const full=path.join(root,file); if (!fs.existsSync(full) || fs.statSync(full).size>5_000_000) continue;
    const data=fs.readFileSync(full,"utf8"); if (patterns.some(re=>re.test(data))) hits.push(file);
  }
  if (hits.length) throw new Error(`Potential secret found: ${hits.join(", ")}`);
}

function check() {
  identity(); checkpoint(); scanSecrets();
  run("node",["--check","scripts/codex-workflow.js"]);
  console.log("CODEX CHECK: PASS (identity, checkpoint schema/base, secret patterns, workflow syntax)");
}

function start() {
  const pkg=identity(); const point=checkpoint();
  const status=output("git",["status","--short"]);
  const remotes=output("git",["remote","-v"]);
  let upstream="NOT CONFIGURED"; try { upstream=output("git",["rev-parse","--abbrev-ref","--symbolic-full-name","@{upstream}"]); } catch {}
  const handoffDir=path.join(root,"handoffs");
  const handoffs=fs.existsSync(handoffDir) ? fs.readdirSync(handoffDir).filter(x=>x.endsWith(".zip")).map(name=>({name,mtime:fs.statSync(path.join(handoffDir,name)).mtimeMs})).sort((a,b)=>b.mtime-a.mtime) : [];
  const distance=Number(output("git",["rev-list","--count",`${point.baseCommit}..HEAD`]));
  let previousHandoff="NOT FOUND"; if(handoffs[0]) { try { const verified=extractVerified(path.join(handoffDir,handoffs[0].name)); previousHandoff={name:handoffs[0].name,valid:true,sourceCommit:verified.manifest.sourceCommit}; fs.rmSync(verified.dir,{recursive:true,force:true}); } catch(error) { previousHandoff={name:handoffs[0].name,valid:false,error:error.message}; } }
  console.log(JSON.stringify({application:"DUELIX CFL",package:pkg.name,repositoryRoot:root,branch:output("git",["branch","--show-current"]),head:output("git",["rev-parse","HEAD"]),workingTree:status||"CLEAN",stash:output("git",["stash","list"])||"NONE",worktrees:output("git",["worktree","list"]),remotes:remotes||"NOT CONFIGURED",upstream,node:process.version,npmScripts:Object.keys(pkg.scripts),checkpoint:{...point,freshness:distance===0?"CURRENT":`${distance}_COMMITS_BEHIND_HEAD`},previousHandoff,impacts:{firebase:"NONE",firestore:"NONE",server:"UNCHANGED",pwa:"UNCHANGED",data:"UNCHANGED",cardDb:"UNCHANGED"},doNotTouch:["DM Safe Admin","DM Card Collector"]},null,2));
}

function end() {
  check(); run("npm",["run","check"]); run("npm",["test"]); run("git",["diff","--check"]); run("git",["fsck","--full","--no-dangling"]);
  const report={schemaVersion:1,application:"DUELIX CFL",commit:output("git",["rev-parse","HEAD"]),checkedAt:new Date().toISOString(),result:"PASS"};
  fs.writeFileSync(path.join(root,".codex/end-report.json"),JSON.stringify(report,null,2)+"\n");
  console.log("END CHECK: PASS");
}

function sha(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function handoffCreate() {
  if (output("git",["status","--porcelain"])) throw new Error("Handoff requires a clean working tree");
  end();
  const commit=output("git",["rev-parse","HEAD"]), short=commit.slice(0,12);
  const outDir=path.join(root,"handoffs"), stage=fs.mkdtempSync(path.join(os.tmpdir(),"duelix-handoff-"));
  fs.mkdirSync(outDir,{recursive:true});
  run("git",["bundle","create",path.join(stage,"source.bundle"),"HEAD"]);
  const manifest={schemaVersion:1,application:"DUELIX CFL",sourceCommit:commit,sourceBranch:output("git",["branch","--show-current"]),createdAt:new Date().toISOString(),contents:["source.bundle","manifest.json","TEST_REPORT.md","RESTORE.md","SHA256SUMS.txt","AUDIT.md"]};
  fs.writeFileSync(path.join(stage,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
  fs.writeFileSync(path.join(stage,"TEST_REPORT.md"),`# Test report\n\nSource commit: ${commit}\n\n- npm run codex:check: PASS\n- npm run check: PASS\n- npm test: PASS\n- git diff --check: PASS\n- git fsck --full --no-dangling: PASS\n`);
  fs.writeFileSync(path.join(stage,"RESTORE.md"),"# Restore\n\nVerify SHA256SUMS.txt, run `git bundle verify source.bundle`, then clone the bundle. The repository script `npm run codex:handoff:restore -- <archive>` performs an isolated temporary restore and checks it.\n");
  fs.writeFileSync(path.join(stage,"AUDIT.md"),"# Audit\n\nThis handoff contains committed Git history only. It does not contain credentials, production writes, IndexedDB, localStorage, or Firestore data.\n");
  const sumFiles=["source.bundle","manifest.json","TEST_REPORT.md","RESTORE.md","AUDIT.md"];
  fs.writeFileSync(path.join(stage,"SHA256SUMS.txt"),sumFiles.map(f=>`${sha(path.join(stage,f))}  ${f}`).join("\n")+"\n");
  const archive=path.join(outDir,`DUELIX_CFL_HANDOFF_${short}.zip`); fs.rmSync(archive,{force:true});
  cp.execFileSync("zip",["-q","-X",archive,...manifest.contents],{cwd:stage}); fs.rmSync(stage,{recursive:true,force:true});
  console.log(archive); return archive;
}

function archiveArg() {
  const explicit=process.argv[3]; if (explicit) return path.resolve(root,explicit);
  const dir=path.join(root,"handoffs"), found=fs.existsSync(dir)?fs.readdirSync(dir).filter(x=>x.endsWith(".zip")).map(name=>({name,mtime:fs.statSync(path.join(dir,name)).mtimeMs})).sort((a,b)=>b.mtime-a.mtime):[];
  if (!found.length) throw new Error("No handoff archive found"); return path.join(dir,found[0].name);
}
function extractVerified(archive) {
  if (!fs.existsSync(archive) || fs.statSync(archive).size===0) throw new Error("Missing or empty archive");
  const list=output("unzip",["-Z1",archive]).split("\n").filter(Boolean), allowed=["source.bundle","manifest.json","TEST_REPORT.md","RESTORE.md","SHA256SUMS.txt","AUDIT.md"];
  if (list.some(x=>x.includes("..")||path.isAbsolute(x)||!allowed.includes(x)) || new Set(list).size!==allowed.length) throw new Error("Unsafe or unexpected ZIP member");
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"duelix-verify-")); cp.execFileSync("unzip",["-q",archive,"-d",dir]);
  const expectedSums=["source.bundle","manifest.json","TEST_REPORT.md","RESTORE.md","AUDIT.md"];
  const sums=fs.readFileSync(path.join(dir,"SHA256SUMS.txt"),"utf8").trim().split("\n"), seen=new Set();
  for(const line of sums){const match=line.match(/^([0-9a-f]{64})  ([A-Za-z0-9_.-]+)$/); if(!match) throw new Error("Malformed checksum entry"); const [,want,file]=match; if(!expectedSums.includes(file)||seen.has(file)) throw new Error("Unexpected or duplicate checksum entry"); seen.add(file); if(sha(path.join(dir,file))!==want) throw new Error(`Checksum mismatch: ${file}`);}
  if(seen.size!==expectedSums.length || expectedSums.some(file=>!seen.has(file))) throw new Error("Incomplete checksum set");
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,"manifest.json"),"utf8")); if(manifest.application!=="DUELIX CFL") throw new Error("Manifest application mismatch");
  cp.execFileSync("git",["bundle","verify",path.join(dir,"source.bundle")],{cwd:root,stdio:"pipe"});
  const bundled=output("git",["bundle","list-heads",path.join(dir,"source.bundle")]).split(/\s/)[0]; if(bundled!==manifest.sourceCommit) throw new Error("Bundle/manifest commit mismatch");
  return {dir,manifest};
}
function handoffVerify(){const archive=archiveArg(),v=extractVerified(archive); fs.rmSync(v.dir,{recursive:true,force:true}); console.log(`HANDOFF VERIFY: PASS ${v.manifest.sourceCommit}`);}
function handoffRestore(){const archive=archiveArg(),v=extractVerified(archive),dest=fs.mkdtempSync(path.join(os.tmpdir(),"duelix-restore-")); try {cp.execFileSync("git",["clone","-q",path.join(v.dir,"source.bundle"),dest]); cp.execFileSync("npm",["run","codex:check"],{cwd:dest,stdio:"inherit"}); cp.execFileSync("npm",["run","check"],{cwd:dest,stdio:"inherit"}); cp.execFileSync("npm",["test"],{cwd:dest,stdio:"inherit"}); cp.execFileSync("git",["fsck","--full","--no-dangling"],{cwd:dest,stdio:"inherit"}); const restored=cp.execFileSync("git",["rev-parse","HEAD"],{cwd:dest,encoding:"utf8"}).trim(); if(restored!==v.manifest.sourceCommit) throw new Error("Restored commit mismatch"); console.log(`TEMPORARY RESTORE: PASS ${restored}`);} finally {fs.rmSync(v.dir,{recursive:true,force:true});fs.rmSync(dest,{recursive:true,force:true});}}

const commands={start,check,end,checkpoint:()=>{checkpoint();console.log("CHECKPOINT: PASS");},"handoff-create":handoffCreate,"handoff-verify":handoffVerify,"handoff-restore":handoffRestore};
try { const command=commands[process.argv[2]]; if(!command) throw new Error("Unknown command"); command(); } catch(error){console.error(error.message);process.exitCode=1;}
