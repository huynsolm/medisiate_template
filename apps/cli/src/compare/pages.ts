import type { Diagnostic, FileStatus } from '@cms-medisay/core';

/*
 * 원본·변환 결과 비교 페이지(정적 HTML). `npm run compare`가 output/compare/에 쓴다.
 * - index.html: 파일 목록(상태·섹션 결과별 개수·필터·확인 표시)
 * - files/<원본 경로>.html: 섹션마다 원본(왼쪽)과 변환 결과(오른쪽)를 PC 1100 / 모바일 360 폭으로 나란히
 * 원본·출력 HTML은 sandbox iframe(스크립트 실행 안 함)에 넣고, 부모 페이지가 높이를 재서 맞춘다.
 * 원본 화면은 원본 cms.css + Bootstrap 4.6.2(원본 사이트 버전 미확인, 정황상 4), 출력은 호스트 CSS로 그린다.
 */

/** 섹션 하나의 변환 결과 분류 */
export type SectionOutcome = 'converted' | 'notes' | 'retyped' | 'blocks' | 'fallback';
export const OUTCOME_LABEL: Record<SectionOutcome, string> = {
  converted: '정상 변환',
  notes: '설명 분리',
  retyped: '구조 재분류',
  blocks: '블록 순서(배치 단순화)',
  fallback: '원본 보존',
};

export interface CompareSection {
  index: number;
  declared: string;
  type: string;
  outcome: SectionOutcome;
  diagnostics: Diagnostic[];
  original: string;
  output: string;
}

export interface CompareFile {
  file: string;
  status: FileStatus;
  sections: CompareSection[];
  /** 섹션에 속하지 않는 진단(파일 전체) */
  diagnostics: Diagnostic[];
}

export interface IndexRow {
  file: string;
  status: FileStatus;
  sections: number;
  counts: Record<SectionOutcome, number>;
  warns: number;
}

const BOOTSTRAP = 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css';

export const escapeHtml = (value: string) => value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

/** 비교용 원본에서 실행될 수 있는 것을 뺀다(iframe sandbox와 함께 이중으로 막음) */
export function inert(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script\s*>/giu, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/giu, '');
}

/** iframe에 넣을 문서. root는 비교 페이지에서 저장소 최상위까지의 상대 경로 */
export function originalDoc(sectionHtml: string, root: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${BOOTSTRAP}"><link rel="stylesheet" href="${root}reference/cms-original/css/cms.css"><style>body{margin:0;background:#fff}</style></head><body><div class="cms-container">${inert(sectionHtml)}</div></body></html>`;
}

export function outputDoc(sectionHtml: string, root: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${root}reference/host-style.css"><style>body{margin:0;background:#fff}</style></head><body>${sectionHtml}</body></html>`;
}

const STATUS_LABEL: Record<FileStatus, string> = { success: 'success', partial: 'partial', failed: 'failed' };

const BASE_CSS = `
:root{--fg:#1f2328;--muted:#656d76;--line:#d0d7de;--bg:#fff;--soft:#f6f8fa;--ok:#1a7f37;--warn:#9a6700;--bad:#cf222e;--accent:#0969da}
*{box-sizing:border-box}body{margin:0;font:14px/1.5 system-ui,-apple-system,"Segoe UI","Noto Sans KR",sans-serif;color:var(--fg);background:var(--bg)}
a{color:var(--accent)}header{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
h1{font-size:16px;margin:0}.muted{color:var(--muted)}.badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;border:1px solid var(--line);white-space:nowrap}
.success{color:var(--ok);border-color:var(--ok)}.partial{color:var(--warn);border-color:var(--warn)}.failed{color:var(--bad);border-color:var(--bad)}
.o-converted{color:var(--ok)}.o-notes{color:var(--ok)}.o-retyped{color:var(--accent)}.o-blocks{color:var(--warn)}.o-fallback{color:var(--bad)}
button,select,input{font:inherit}button{border:1px solid var(--line);background:var(--soft);border-radius:6px;padding:3px 10px;cursor:pointer}button[aria-pressed=true]{background:var(--accent);color:#fff;border-color:var(--accent)}
main{padding:12px 16px}
`;

export function indexPage(rows: IndexRow[], generatedAt: string): string {
  const data = JSON.stringify(rows).replace(/</gu, '\\u003c');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>원본·변환 비교</title><style>${BASE_CSS}
table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}th{background:var(--soft);position:sticky;top:53px}
th.n,td.n{text-align:right;font-variant-numeric:tabular-nums}tr.done td{opacity:.5}.filters{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
</style></head><body>
<header><h1>원본·변환 비교</h1><span class="muted">${escapeHtml(generatedAt)} 생성 · 파일 ${rows.length}개</span>
<div class="filters" role="group" aria-label="필터">
<label>상태 <select id="status"><option value="">전체</option><option value="partial">partial</option><option value="failed">failed</option><option value="success">success</option></select></label>
<label>섹션 <select id="kind"><option value="">전체</option><option value="blocks">블록 순서 있음</option><option value="fallback">원본 보존 있음</option><option value="retyped">재분류 있음</option></select></label>
<label><input type="checkbox" id="hideDone"> 확인한 파일 숨기기</label>
<label>찾기 <input id="q" size="16" placeholder="파일 이름"></label>
<span id="count" class="muted"></span></div></header>
<main><p class="muted">확인 표시는 이 브라우저에만 저장됩니다. 확인이 필요한 순서(원본 보존·블록 순서가 많은 파일 먼저)로 정렬했고, 섹션이 전부 원본 보존인 파일(대부분 비콘텐츠)은 맨 뒤에 둡니다.</p>
<table><thead><tr><th>확인</th><th>파일</th><th>상태</th><th class="n">섹션</th><th class="n">정상</th><th class="n">재분류</th><th class="n">블록 순서</th><th class="n">원본 보존</th><th class="n">경고</th></tr></thead><tbody id="rows"></tbody></table></main>
<script>
const rows=${data};
const key=f=>'cms-compare:done:'+f;
const done=f=>{try{return localStorage.getItem(key(f))==='1'}catch{return false}};
const setDone=(f,v)=>{try{v?localStorage.setItem(key(f),'1'):localStorage.removeItem(key(f))}catch{}};
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// 확인이 필요한 순서: 원본 보존·블록 순서가 많은 파일 먼저. 전부 원본 보존인 파일(대부분 header·slider 같은 비콘텐츠)은 맨 뒤
const rank=r=>r.counts.fallback===r.sections?-1:r.counts.fallback*100+r.counts.blocks*10+r.warns;
rows.sort((a,b)=>rank(b)-rank(a)||a.file.localeCompare(b.file));
const $=id=>document.getElementById(id);
function draw(){const st=$('status').value,k=$('kind').value,q=$('q').value.trim(),hide=$('hideDone').checked;
const list=rows.filter(r=>(!st||r.status===st)&&(!k||r.counts[k]>0)&&(!q||r.file.includes(q))&&!(hide&&done(r.file)));
$('count').textContent=list.length+'개 표시';
$('rows').innerHTML=list.map(r=>'<tr class="'+(done(r.file)?'done':'')+'"><td><input type="checkbox" aria-label="확인함: '+esc(r.file)+'" data-f="'+esc(r.file)+'"'+(done(r.file)?' checked':'')+'></td><td><a href="files/'+encodeURI(r.file)+'">'+esc(r.file)+'</a></td><td><span class="badge '+r.status+'">'+r.status+'</span></td><td class="n">'+r.sections+'</td><td class="n">'+(r.counts.converted+r.counts.notes)+'</td><td class="n">'+r.counts.retyped+'</td><td class="n">'+r.counts.blocks+'</td><td class="n">'+r.counts.fallback+'</td><td class="n">'+r.warns+'</td></tr>').join('');}
$('rows').addEventListener('change',e=>{const f=e.target.dataset.f;if(f){setDone(f,e.target.checked);draw();}});
for(const id of ['status','kind','hideDone','q'])$(id).addEventListener('input',draw);
draw();
</script></body></html>`;
}

/** 파일 하나의 비교 페이지. root는 이 페이지에서 저장소 최상위까지, home은 index.html까지의 상대 경로 */
export function filePage(file: CompareFile, root: string, home: string): string {
  // 확인할 거리만 보인다: 경고·오류와 구조 재분류 안내(모드 분리·SSI 제거 같은 정보 진단은 뺌)
  const diag = (all: Diagnostic[]) => { const list = all.filter((d) => d.level !== 'info' || d.code === 'STRUCTURE_RETYPED'); return list.length
    ? `<ul class="diags">${list.map((d) => `<li class="lv-${d.level}"><b>${d.level}</b> ${escapeHtml(d.code)}: ${escapeHtml(d.message)}</li>`).join('')}</ul>` : ''; };
  const sections = file.sections.map((s) => `
<section class="pair" id="s${s.index}">
<h2>#${s.index} <span class="muted">${escapeHtml(s.declared || '타입 없음')}</span> → ${escapeHtml(s.type)} <span class="badge o-${s.outcome}">${OUTCOME_LABEL[s.outcome]}</span></h2>
${diag(s.diagnostics)}
<div class="cols"><figure><figcaption>원본</figcaption><div class="frame"><iframe sandbox="allow-same-origin" title="원본 #${s.index}" srcdoc="${escapeHtml(originalDoc(s.original, root))}"></iframe></div></figure>
<figure><figcaption>변환 결과</figcaption><div class="frame"><iframe sandbox="allow-same-origin" title="변환 결과 #${s.index}" srcdoc="${escapeHtml(outputDoc(s.output, root))}"></iframe></div></figure></div>
</section>`).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(file.file)} 비교</title><style>${BASE_CSS}
.pair{border-top:1px solid var(--line);padding:12px 0}.pair h2{font-size:15px;margin:0 0 6px}.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
figure{margin:0;min-width:0}figcaption{font-size:12px;color:var(--muted);margin-bottom:4px}.frame{border:1px solid var(--line);overflow:hidden;background:#fff}.frame.empty{min-height:28px}.frame.empty::after{content:'이 폭에서 화면에 보이는 내용 없음';display:block;padding:4px 8px;font-size:12px;color:var(--muted)}
iframe{border:0;display:block;transform-origin:0 0}.diags{margin:0 0 8px;padding-left:18px;font-size:12px}.lv-warn b{color:var(--warn)}.lv-error b{color:var(--bad)}.lv-info b{color:var(--muted)}
@media (max-width:700px){.cols{grid-template-columns:1fr}}
</style></head><body>
<header><a href="${home}index.html">← 목록</a><h1>${escapeHtml(file.file)}</h1><span class="badge ${file.status}">${STATUS_LABEL[file.status]}</span>
<span role="group" aria-label="화면 폭"><button type="button" data-w="1100" aria-pressed="true">PC 1100</button> <button type="button" data-w="360" aria-pressed="false">모바일 360</button></span>
<label><input type="checkbox" id="done"> 확인함</label></header>
<main>${diag(file.diagnostics)}
<p class="muted">원본은 원본 cms.css와 Bootstrap 4.6.2로, 변환 결과는 호스트 CSS로 그립니다. 원본 사이트 전용 CSS·스크립트는 없으므로 원본 화면은 근사치입니다. 상대 경로 이미지는 보이지 않을 수 있습니다.</p>
${sections}</main>
<script>
const file=${JSON.stringify(file.file).replace(/</gu, '\\u003c')};
const key='cms-compare:done:'+file;
const box=document.getElementById('done');
try{box.checked=localStorage.getItem(key)==='1'}catch{}
box.addEventListener('change',()=>{try{box.checked?localStorage.setItem(key,'1'):localStorage.removeItem(key)}catch{}});
let width=1100;
// 폭을 먼저 바꾼 뒤(iframe 안 배치가 그 폭으로 다시 계산됨) 높이를 잰다
function fit(){for(const f of document.querySelectorAll('iframe')){const holder=f.parentElement;const scale=Math.min(1,holder.clientWidth/width);
f.style.width=width+'px';f.style.height='0px';
let h=0;try{const d=f.contentDocument;h=Math.max(d.documentElement.scrollHeight,d.body?d.body.scrollHeight:0)}catch{h=600}
f.style.height=h+'px';f.style.transform='scale('+scale+')';holder.style.height=Math.ceil(h*scale)+'px';holder.classList.toggle('empty',h===0);}}
for(const b of document.querySelectorAll('[data-w]'))b.addEventListener('click',()=>{width=+b.dataset.w;for(const o of document.querySelectorAll('[data-w]'))o.setAttribute('aria-pressed',String(o===b));fit();setTimeout(fit,300);});
for(const f of document.querySelectorAll('iframe'))f.addEventListener('load',()=>{fit();try{for(const img of f.contentDocument.images)img.addEventListener('load',fit)}catch{}});
addEventListener('resize',fit);fit();setTimeout(fit,500);setTimeout(fit,2000);
</script></body></html>`;
}
