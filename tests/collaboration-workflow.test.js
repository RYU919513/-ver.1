"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = file => fs.readFileSync(file,"utf8");

test("checkpoint records one valid executor and a recoverable base", () => {
  const point=JSON.parse(read(".codex/checkpoint.json"));
  assert.equal(point.schemaVersion,2);
  assert.equal(point.application,"DUELIX CFL");
  assert.ok(["CODEX","COPILOT","HUMAN","NONE"].includes(point.activeExecutor));
  assert.match(point.baseCommit,/^[0-9a-f]{40}$/);
  assert.ok(Object.hasOwn(point,"relatedIssue"));
  assert.ok(Object.hasOwn(point,"relatedPR"));
});

test("PR and Issue boundaries require executor, base, tests, and safety impacts", () => {
  const issue=read(".github/ISSUE_TEMPLATE/agent-task.yml");
  const pr=read(".github/pull_request_template.md");
  for (const term of ["Assigned executor","Base commit","Expected tests","Safety constraints"]) assert.match(issue,new RegExp(term));
  for (const term of ["Executor","Base commit","Tests executed","Firebase impact","CARD DB impact","Handoff impact"]) assert.match(pr,new RegExp(term));
});

test("CI is read-only and never deploys or mutates branches", () => {
  const ci=read(".github/workflows/quality.yml");
  assert.match(ci,/contents: read/);
  assert.match(ci,/npm run codex:check/);
  assert.doesNotMatch(ci,/\bgit push\b|firebase deploy|\bdeploy\b|contents: write/);
});

test("Copilot instructions preserve production, storage, and agent boundaries", () => {
  const instructions=read(".github/copilot-instructions.md");
  for (const term of ["DUELIX CFL","production writes","IndexedDB","localStorage","force-push","One task has one executor","checkpoint","handoff"]) assert.match(instructions,new RegExp(term,"i"));
});
