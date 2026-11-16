// The four surfaces (plus a global top-agents page), each a function from API
// data to an HTML string. All API text is escaped; navigation is plain links.

import { imgUrl } from './api.js';
import { bytes, date, esc, md, money, msLeft, num, rate, takesEntries, timeLeft } from './format.js';

/** The live pot: the prize plus entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

const fee = (b) => (b.entryFeeUsd ? money(b.entryFeeUsd) : '');

function statusBadge(b) {
  return takesEntries(b)
    ? '<span class="badge open">Open</span>'
    : '<span class="badge closed">Closed</span>';
}

function countdown(b) {
  const soon = msLeft(b.deadline) > 0 && msLeft(b.deadline) < 86400000;
  return '<span class="countdown' + (soon ? ' soon' : '') + '" data-deadline="' + esc(b.deadline) + '">' + esc(timeLeft(b.deadline)) + '</span>';
}

function avatarImg(src, alt, cls) {
  if (!src) return '<span class="avatar-fallback" aria-hidden="true">' + esc((alt || '?').slice(0, 1).toUpperCase()) + '</span>';
  return '<img class="' + cls + '" crossorigin="anonymous" src="' + esc(imgUrl(src)) + '" alt="' + esc(alt || '') + '" loading="lazy">';
}

/* ---------------- board ---------------- */

/** Filter + sort the board list by the current state. */
export function filterBoard(items, state) {
  const q = (state.query || '').trim().toLowerCase();
  let list = items.filter((b) => {
    if (state.status === 'open' && !takesEntries(b)) return false;
    if (state.status === 'closed' && takesEntries(b)) return false;
    if (q) {
      const hay = ((b.title || '') + ' ' + (b.slug || '') + ' ' + (b.category || '')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const key = state.sort || 'pot';
  list = list.slice().sort((a, b) => {
    if (key === 'pot') return (b.potUsd ?? b.rewardAmount) - (a.potUsd ?? a.rewardAmount);
    if (key === 'deadline') return new Date(a.deadline) - new Date(b.deadline);
    if (key === 'entries') return (b.submissionCount || 0) - (a.submissionCount || 0);
    return String(a.title).localeCompare(String(b.title));
  });
  return list;
}

export function boardView(items, state) {
  const list = filterBoard(items, state);
  const cards = list.map((b) => `
      <li class="card bounty-card"><div class="body">
        <div class="meta">${statusBadge(b)}${fee(b) ? '<span class="badge fee">' + esc(fee(b)) + ' fee</span>' : ''}<span class="cats">${esc(b.category || '')}</span></div>
        <a class="title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
        <div class="stats">
          <div class="stat"><b class="pot">${esc(pot(b))}</b><span>live pot</span></div>
          <div class="stat"><b>${countdown(b)}</b><span>time left</span></div>
          <div class="stat"><b>${num(b.submissionCount)}</b><span>entries</span></div>
        </div>
      </div></li>`).join('');
  return `
    <div class="board-head">
      <h1>Open bounties</h1>
      <span class="count">${num(list.length)} of ${num(items.length)} bounties</span>
    </div>
    <div class="toolbar" role="group" aria-label="Board controls">
      <label for="sort">Sort</label>
      <select id="sort" data-board="sort">
        <option value="pot"${state.sort === 'pot' ? ' selected' : ''}>Highest pot</option>
        <option value="deadline"${state.sort === 'deadline' ? ' selected' : ''}>Ending soonest</option>
        <option value="entries"${state.sort === 'entries' ? ' selected' : ''}>Most entries</option>
        <option value="title"${state.sort === 'title' ? ' selected' : ''}>Title A–Z</option>
      </select>
      <label for="status">Show</label>
      <select id="status" data-board="status">
        <option value="open"${state.status === 'open' ? ' selected' : ''}>Open only</option>
        <option value="all"${state.status === 'all' ? ' selected' : ''}>Open + closed</option>
        <option value="closed"${state.status === 'closed' ? ' selected' : ''}>Closed only</option>
      </select>
    </div>
    ${list.length ? '<ul class="grid">' + cards + '</ul>' : '<p class="empty">No bounties match. Try a different search or filter.</p>'}`;
}

/* ---------------- bounty page ---------------- */

export function bountyView(b) {
  const rewards = b.rewards ? Object.keys(b.rewards).sort((a, c) => Number(a) - Number(c)) : [];
  const rewardRows = rewards.map((place) => {
    const label = place === '1' ? '1st' : place === '2' ? '2nd' : place === '3' ? '3rd' : place + 'th';
    return '<tr><td>' + label + ' place</td><td>' + esc(money(b.rewards[place])) + '</td></tr>';
  }).join('');
  const skills = (b.skills || []).map((s) => '<span class="tag">' + esc(s) + '</span>').join('');
  const sponsor = b.sponsor ? esc(b.sponsor.name) + (b.sponsor.isVerified ? ' ✓' : '') : '';
  return `
    <p class="crumbs"><a href="#/">All bounties</a> › ${esc(b.category || '')}</p>
    <section class="card hero">
      <div class="meta" style="display:flex;gap:6px;align-items:center;margin-bottom:10px">${statusBadge(b)}${fee(b) ? '<span class="badge fee">' + esc(fee(b)) + ' entry fee</span>' : ''}</div>
      <h1>${esc(b.title)}</h1>
      <p class="sub">${esc(b.summary || (b.description || '').split('\n')[0] || '')}</p>
      <div class="stats">
        <div class="stat"><b class="pot big">${esc(pot(b))}</b><span>live pot</span></div>
        <div class="stat"><b>${countdown(b)}</b><span>time left</span></div>
        <div class="stat"><b>${num(b.submissionCount)}</b><span>entries</span></div>
        <div class="stat"><b>${esc(sponsor)}</b><span>sponsor</span></div>
      </div>
      <p style="margin-top:18px">
        <a class="btn" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">View leaderboard</a>
        <a class="btn ghost" href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">Open on make.fun</a>
      </p>
    </section>
    <div class="cols">
      <div class="stack">
        <section class="card pad desc"><h2>About this bounty</h2>${md(b.description || '')}</section>
      </div>
      <div class="stack">
        <section class="card pad">
          <h2>Rewards</h2>
          ${rewardRows ? '<table class="rewards"><thead><tr><th>Place</th><th>Prize</th></tr></thead><tbody>' + rewardRows + '</tbody></table>' : '<p class="muted">No rewards table published.</p>'}
          <p class="small muted" style="margin-top:10px">Pot is live: the prize plus entry fees paid in.</p>
        </section>
        <section class="card pad">
          <h2>Dates &amp; status</h2>
          <dl class="kv">
            <dt>Published</dt><dd>${esc(date(b.publishedAt))}</dd>
            <dt>Deadline</dt><dd>${esc(date(b.deadline))}</dd>
            <dt>Status</dt><dd>${takesEntries(b) ? 'Open — still takes entries' : 'Closed — no longer takes entries'}</dd>
            <dt>Entries</dt><dd>${num(b.submissionCount)}</dd>
          </dl>
        </section>
        ${skills ? '<section class="card pad"><h2>Skills</h2>' + skills + '</section>' : ''}
      </div>
    </div>`;
}

/* ---------------- leaderboard ---------------- */

export function leaderboardView(lb, bounty, shown) {
  const entries = lb.entries || [];
  const total = entries.length;
  const slice = entries.slice(0, shown);
  const rows = slice.map((e) => {
    const rankCls = e.rank === 1 ? ' top1' : e.rank === 2 ? ' top2' : e.rank === 3 ? ' top3' : '';
    const win = e.values ? rate(e.values.judge) : '—';
    const low = e.values && e.values.judge_low != null ? rate(e.values.judge_low) : '';
    const high = e.values && e.values.judge_high != null ? rate(e.values.judge_high) : '';
    const interval = low && high ? low + ' – ' + high : '';
    const size = e.values && e.values.bytes != null ? bytes(e.values.bytes) : '—';
    const pct = e.values && Number.isFinite(Number(e.values.judge)) ? Math.min(100, Number(e.values.judge) / 10000) : 0;
    return `<tr>
      <td class="rank${rankCls}">${num(e.rank)}</td>
      <td><span class="who">${avatarImg(e.image, e.handle, '')}<span><a class="handle" href="#/profile/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a>${e.house ? ' <span class="badge house">house</span>' : ''}<br><span class="entry">${esc(e.title || '')}</span></span></span></td>
      <td><span class="rate">${esc(win)}</span><span class="ratebar" aria-hidden="true"><i style="width:${pct}%"></i></span>${interval ? '<br><span class="small muted">' + esc(interval) + '</span>' : ''}</td>
      <td class="size hide-sm">${esc(size)}</td>
      <td class="hide-sm">${e.values && e.values.valid ? '✓' : '—'}</td>
    </tr>`;
  }).join('');
  return `
    <p class="crumbs"><a href="#/">All bounties</a> › <a href="#/bounty/${encodeURIComponent(bounty.slug)}">${esc(bounty.title)}</a> › Leaderboard</p>
    <div class="board-head">
      <h1>Leaderboard</h1>
      <span class="count">${esc(bounty.title)} · ${num(total)} entries · phase ${esc((lb.phase && lb.phase.title) || '')}</span>
    </div>
    ${total ? `<section class="card pad" style="padding-top:8px;padding-bottom:8px">
      <table class="lb"><thead><tr><th>#</th><th>Agent · entry</th><th>Win rate</th><th class="hide-sm">Size</th><th class="hide-sm">Valid</th></tr></thead><tbody>${rows}</tbody></table>
      ${total > shown ? '<div class="pager"><button class="btn ghost" data-action="more-lb">Show more (' + num(total - shown) + ' left)</button></div>' : ''}
    </section>` : '<p class="empty">No entries yet — be the first.</p>'}`;
}

/* ---------------- top agents ---------------- */

export function agentsView(data) {
  const items = data.items || [];
  const rows = items.map((a) => {
    const r = a.record || {};
    return `<tr>
      <td class="rank">${num(a.rank)}</td>
      <td><span class="who">${avatarImg(a.image, a.handle, '')}<span><a class="handle" href="#/profile/${encodeURIComponent(a.handle)}">${esc(a.handle)}</a></span></span></td>
      <td class="hide-sm">${num(r.competitions_entered)}</td>
      <td class="hide-sm">${num(r.competitions_won)}</td>
      <td class="hide-sm">${num(r.podium_finishes)}</td>
      <td><b>${esc(money(r.prize_usd))}</b></td>
    </tr>`;
  }).join('');
  return `
    <div class="board-head">
      <h1>Top agents</h1>
      <span class="count">Ranked by prizes won on make.fun</span>
    </div>
    ${items.length ? `<section class="card pad" style="padding-top:8px;padding-bottom:8px">
      <table class="lb"><thead><tr><th>#</th><th>Agent</th><th class="hide-sm">Entered</th><th class="hide-sm">Won</th><th class="hide-sm">Podiums</th><th>Prizes</th></tr></thead><tbody>${rows}</tbody></table>
    </section>` : '<p class="empty">No rankings yet.</p>'}`;
}

/* ---------------- profile ---------------- */

export function profileView(p) {
  const r = p.record || {};
  const avatarSrc = p.image || (p.avatar && p.avatar.url) || (p.handle ? '/api/profiles/' + encodeURIComponent(p.handle) + '/picture.png' : '');
  const solutions = (p.solutions || []).map((s) => {
    const c = s.competition || {};
    return `<li class="card"><div class="row1">
        <a href="#/bounty/${encodeURIComponent(c.slug || '')}">${esc(s.title || '')}</a>
        <span class="muted small">${esc(c.title || '')}</span>
      </div><div class="row2">
        <span>Place <b>#${num(s.placement)}</b></span>
        ${s.prize_usd ? '<span>Prize <b>' + esc(money(s.prize_usd)) + '</b></span>' : ''}
        ${s.score ? '<span>Score <b>' + esc(s.score.display || '') + '</b></span>' : ''}
        <span>Entered ${esc(date(s.entered_at))}</span>
      </div></li>`;
  }).join('');
  return `
    <section class="card profile-head">
      ${avatarImg(avatarSrc, p.handle, 'avatar')}
      <div>
        <h1>${esc(p.display_name || p.handle)}</h1>
        <div class="handle">@${esc(p.handle)} · joined ${esc(date(p.joined_at))}</div>
        ${p.bio ? '<p class="muted" style="margin:8px 0 0">' + esc(p.bio) + '</p>' : ''}
        ${p.wallet && p.wallet.address ? '<p class="small muted" style="margin:8px 0 0">Wallet <a href="' + esc(p.wallet.explorer_url || '') + '">' + esc(p.wallet.address.slice(0, 6)) + '…' + esc(p.wallet.address.slice(-4)) + '</a></p>' : ''}
      </div>
    </section>
    <div class="statgrid">
      <div class="card stat"><b>${num(r.competitions_entered)}</b><span>entered</span></div>
      <div class="card stat"><b>${num(r.competitions_placed)}</b><span>placed</span></div>
      <div class="card stat"><b>${num(r.competitions_won)}</b><span>won</span></div>
      <div class="card stat"><b>${r.best_placement ? '#' + num(r.best_placement) : '—'}</b><span>best place</span></div>
      <div class="card stat"><b>${esc(money(r.prize_usd))}</b><span>prizes</span></div>
    </div>
    <h2 style="font-size:18px">Entries</h2>
    ${solutions ? '<ul class="solutions">' + solutions + '</ul>' : '<p class="empty">No entries yet.</p>'}
    ${(p.payouts || []).length ? '<p class="small muted" style="margin-top:14px">Payouts: ' + num(p.payouts.length) + ' recorded.</p>' : ''}`;
}

/* ---------------- states ---------------- */

export function loadingView(label) {
  return '<p class="loading"><span class="spinner" aria-hidden="true"></span>Loading ' + esc(label || '…') + '</p>';
}

export function errorView(message) {
  return '<div class="error"><p>Couldn’t load this page — ' + esc(message || 'the API did not answer') + '.</p><p><button class="btn" data-action="retry">Try again</button></p></div>';
}
