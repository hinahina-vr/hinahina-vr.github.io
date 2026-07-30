# 2026 Diary Ten-Run Evidence Report

- Generated: 2026-07-29T19:08:31.650Z
- Commit: `dc5a3cb6e52863accb483786d56fbd252a4c6863`
- Branch: `codex/publish-study-main`
- Node: `v22.17.0`
- Chrome: `150.0.7871.184`
- Full build runs: 10/10 passed
- Production Chrome runs: 10/10 passed
- Overall: **PASS**

## Full Build Runs

| Run | Result | Exit | Duration | Output SHA-256 | Assertions |
|---:|:---:|---:|---:|---|---:|
| 1 | PASS | 0 | 47.7s | `2a2dcd445672c5352c99e00cdb786ffd56e17ee164edf6c55a029fc6dd9241dc` | 14/14 |
| 2 | PASS | 0 | 46.5s | `2a2dcd445672c5352c99e00cdb786ffd56e17ee164edf6c55a029fc6dd9241dc` | 14/14 |
| 3 | PASS | 0 | 47.6s | `bedbb0dd0bb67b672b39949bc6c3c07936d292d3d9f13d7440af707fe130630c` | 14/14 |
| 4 | PASS | 0 | 47.2s | `bedbb0dd0bb67b672b39949bc6c3c07936d292d3d9f13d7440af707fe130630c` | 14/14 |
| 5 | PASS | 0 | 46.2s | `2a2dcd445672c5352c99e00cdb786ffd56e17ee164edf6c55a029fc6dd9241dc` | 14/14 |
| 6 | PASS | 0 | 47.4s | `2a2dcd445672c5352c99e00cdb786ffd56e17ee164edf6c55a029fc6dd9241dc` | 14/14 |
| 7 | PASS | 0 | 47.2s | `54f9ec3769751bb84367ffb95d748537194c93d3837d2c3bd4412eec6f222ac2` | 14/14 |
| 8 | PASS | 0 | 46.1s | `2a2dcd445672c5352c99e00cdb786ffd56e17ee164edf6c55a029fc6dd9241dc` | 14/14 |
| 9 | PASS | 0 | 46.2s | `a6fab96087c7ed0595d99c8053d8e263bca7c3bbdeac8e653fe4270040a27725` | 14/14 |
| 10 | PASS | 0 | 47.2s | `2a2dcd445672c5352c99e00cdb786ffd56e17ee164edf6c55a029fc6dd9241dc` | 14/14 |

Every build run checked:

- 71 source-activity dates = 71 diary dates for 2026-04-01 through 2026-07-28
- 119 main diaries, 224 independent voices, 18 curated dreams
- 18 validated dream graphs and 71 WebP background bindings
- 119 ImageGen diary covers
- 119 entries across seven months: Jan 11, Feb 6, Mar 31, Apr 26, May 23, Jun 12, Jul 10
- Phrase-limit and generated-HTML checks

## Production Chrome Runs

| Run | Result | Duration | Jan | Apr | Voices | Choices | Background | HTTP/Page errors |
|---:|:---:|---:|---:|---:|---:|---:|---|---:|
| 1 | PASS | 12.1s | 11 | 26 | 2 | 3 | 1536x1024 WebP | 0 |
| 2 | PASS | 10.5s | 11 | 26 | 2 | 3 | 1536x1024 WebP | 0 |
| 3 | PASS | 10.5s | 11 | 26 | 2 | 3 | 1536x1024 WebP | 0 |
| 4 | PASS | 11.0s | 11 | 26 | 2 | 3 | 1536x1024 WebP | 0 |
| 5 | PASS | 10.4s | 11 | 26 | 2 | 3 | 1536x1024 WebP | 0 |
| 6 | PASS | 10.7s | 11 | 26 | 2 | 3 | 1536x1024 WebP | 0 |
| 7 | PASS | 10.6s | 11 | 26 | 2 | 3 | 1536x1024 WebP | 0 |
| 8 | PASS | 10.5s | 11 | 26 | 2 | 3 | 1536x1024 WebP | 0 |
| 9 | PASS | 10.6s | 11 | 26 | 2 | 3 | 1536x1024 WebP | 0 |
| 10 | PASS | 10.8s | 11 | 26 | 2 | 3 | 1536x1024 WebP | 0 |

Each production run used a fresh Chrome context and verified:

- January and April production inventory
- April 24 self-contained main body
- Two semantically distinct voices: Kotomi and Dejiko
- Three dream choices and the selected sort-by-purpose branch
- 1536x1024 WebP dream background
- Zero HTTP 4xx/5xx responses and zero page errors

## Raw Evidence

- `build-01.log` through `build-10.log`: complete build output
- `production-01.json` through `production-10.json`: per-run browser evidence
- `report.json`: complete machine-readable report

