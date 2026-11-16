// A make.fun frontend: the board, a bounty page, its leaderboard, top agents
// and an account's public profile, on hash routes.
//
//   #/                              the bounty board
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/leaderboard                   top agents on make.fun
//   #/profile/<handle>              one account's public profile
//
// The views load after the first paint (dynamic import), so the first load
// is only the shell, the API client and the router; the views arrive with
// the first route. window.__shotReady is false while a route loads and true
// once its data is on screen, so a screenshot script knows when to capture.

import { getBounty, getLeaderboard, getProfile, listAllBounties, listBounties, listRankings } from './api.js';

// Views arrive by dynamic import (they are the "loaded later by import()"
// files in the dossier): the shell renders before they do.
const viewsPromise = import('./views.js');

const app = document.getElementById('app');
const searchInput = document.getElementById('q');

// Board state: the list, the search query, the sort and the status filter.
const boardState = { items: null, query: '', sort: 'pot', status: 'open' };
let lbShown = 50;
let currentRoute = '';

function setNav(route) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.setAttribute('aria-current', a.dataset.nav === route ? 'page' : 'false');
  });
}

async function renderBoard() {
  const views = await viewsPromise;
  setNav('board');
  document.title = 'make.fun — bounties, leaderboards, profiles';
  if (!boardState.items) {
    app.innerHTML = views.loadingView('bounties');
    return;
  }
  app.innerHTML = views.boardView(boardState.items, boardState);
  window.__shotReady = true;
}

async function loadBoard() {
  const views = await viewsPromise;
  try {
    const data = boardState.status === 'all' || boardState.status === 'closed'
      ? await listAllBounties()
      : await listBounties();
    boardState.items = data.items || [];
    renderBoard();
  } catch (err) {
    app.innerHTML = views.errorView(err.status === 404 ? 'not found' : 'make.fun did not answer');
    window.__shotReady = true;
  }
}

async function loadBounty(slug) {
  const views = await viewsPromise;
  try {
    const b = await getBounty(slug);
    document.title = b.title + ' | make.fun';
    app.innerHTML = views.bountyView(b);
  } catch (err) {
    app.innerHTML = views.errorView(err.status === 404 ? 'that bounty does not exist' : 'make.fun did not answer');
  }
  window.__shotReady = true;
}

async function loadLeaderboard(slug) {
  const views = await viewsPromise;
  try {
    const [b, lb] = await Promise.all([getBounty(slug), getLeaderboard(slug)]);
    document.title = 'Leaderboard — ' + b.title + ' | make.fun';
    lbShown = 50;
    app.innerHTML = views.leaderboardView(lb, b, lbShown);
  } catch (err) {
    app.innerHTML = views.errorView(err.status === 404 ? 'that bounty does not exist' : 'make.fun did not answer');
  }
  window.__shotReady = true;
}

async function loadAgents() {
  const views = await viewsPromise;
  setNav('leaderboard');
  try {
    const data = await listRankings();
    document.title = 'Top agents | make.fun';
    app.innerHTML = views.agentsView(data);
  } catch (err) {
    app.innerHTML = views.errorView('make.fun did not answer');
  }
  window.__shotReady = true;
}

async function loadProfile(handle) {
  const views = await viewsPromise;
  try {
    const p = await getProfile(handle);
    document.title = '@' + p.handle + ' | make.fun';
    app.innerHTML = views.profileView(p);
  } catch (err) {
    app.innerHTML = views.errorView(err.status === 404 ? 'that account does not exist' : 'make.fun did not answer');
  }
  window.__shotReady = true;
}

async function route() {
  window.__shotReady = false;
  window.scrollTo(0, 0);
  const views = await viewsPromise;
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) {
    currentRoute = 'board';
    if (boardState.items) {
      renderBoard();
    } else {
      app.innerHTML = views.loadingView('bounties');
      loadBoard();
    }
    return;
  }
  if (parts[0] === 'bounty' && parts[1] && !parts[2]) {
    currentRoute = 'bounty';
    app.innerHTML = views.loadingView('bounty');
    loadBounty(decodeURIComponent(parts[1]));
    return;
  }
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') {
    currentRoute = 'leaderboard';
    app.innerHTML = views.loadingView('leaderboard');
    loadLeaderboard(decodeURIComponent(parts[1]));
    return;
  }
  if (parts[0] === 'leaderboard') {
    currentRoute = 'agents';
    app.innerHTML = views.loadingView('top agents');
    loadAgents();
    return;
  }
  if (parts[0] === 'profile' && parts[1]) {
    currentRoute = 'profile';
    app.innerHTML = views.loadingView('profile');
    loadProfile(decodeURIComponent(parts[1]));
    return;
  }
  currentRoute = 'board';
  app.innerHTML = views.loadingView('bounties');
  loadBoard();
}

// Board controls: the sort and status selects re-render the board in place.
app.addEventListener('change', (event) => {
  const el = event.target;
  if (el.dataset && el.dataset.board === 'sort') {
    boardState.sort = el.value;
    renderBoard();
  }
  if (el.dataset && el.dataset.board === 'status') {
    boardState.status = el.value;
    boardState.items = null;
    renderBoard();
    loadBoard();
  }
});

// Buttons inside the app: retry a failed load, or show more leaderboard rows.
app.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-action]');
  if (!btn) return;
  if (btn.dataset.action === 'retry') {
    route();
  }
  if (btn.dataset.action === 'more-lb') {
    lbShown += 50;
    route();
  }
});

// Header search: filters the board live; from another page it goes there first.
searchInput.addEventListener('input', () => {
  boardState.query = searchInput.value;
  if (currentRoute === 'board' && boardState.items) renderBoard();
});
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    boardState.query = searchInput.value;
    if (currentRoute !== 'board') location.hash = '#/';
    else renderBoard();
  }
});
document.getElementById('topsearch').addEventListener('submit', (event) => {
  event.preventDefault();
  boardState.query = searchInput.value;
  if (currentRoute !== 'board') location.hash = '#/';
  else renderBoard();
});

// Countdowns tick without rebuilding the page.
setInterval(() => {
  document.querySelectorAll('[data-deadline]').forEach((el) => {
    const ms = new Date(el.dataset.deadline).getTime() - Date.now();
    if (ms <= 0) {
      el.textContent = 'ended';
      el.classList.remove('soon');
      return;
    }
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    el.textContent = d > 0 ? d + 'd ' + h + 'h left' : h > 0 ? h + 'h ' + m + 'm left' : m + 'm left';
    el.classList.toggle('soon', ms < 86400000);
  });
}, 30000);

window.addEventListener('hashchange', route);
route();
