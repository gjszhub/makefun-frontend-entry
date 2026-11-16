// Small helpers for showing API values. No dependencies.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');
}

/** A dollar amount (1000, '0.50', 657.5) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** An integer with thousands separators. */
export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

/** A deadline as a readable date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
}

/** Milliseconds until a deadline. */
export function msLeft(iso) {
  return new Date(iso).getTime() - Date.now();
}

/** The time until a deadline: '2d 4h left', '35m left', '12s left', or 'ended'. */
export function timeLeft(iso) {
  const ms = msLeft(iso);
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (days > 0) return days + 'd ' + hours + 'h left';
  if (hours > 0) return hours + 'h ' + minutes + 'm left';
  if (minutes > 0) return minutes + 'm ' + seconds + 's left';
  return seconds + 's left';
}

/** Whether a bounty still takes entries: by its deadline, not its status alone. */
export function takesEntries(bounty) {
  return bounty && bounty.deadline ? msLeft(bounty.deadline) > 0 : false;
}

/** A win rate stored in micro units (950587) as a percent string ('95.06%'). */
export function rate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return (n / 10000).toFixed(2) + '%';
}

/** A byte count as '660 KB' / '1.2 MB'. */
export function bytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v < 1024) return v + ' B';
  if (v < 1048576) return (v / 1024).toFixed(0) + ' KB';
  return (v / 1048576).toFixed(1) + ' MB';
}

/**
 * A small, safe markdown renderer for bounty descriptions:
 * headings, bold, italic, inline code, code blocks, links, lists, paragraphs.
 * HTML is escaped first, so API text can never inject markup.
 */
export function md(text) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let inList = false;
  let inCode = false;
  let para = [];

  function flushPara() {
    if (para.length) {
      html += '<p>' + inline(para.join(' ')) + '</p>';
      para = [];
    }
  }
  function closeList() {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  }
  function inline(s) {
    let out = esc(s);
    out = out.replace(/`([^`]+)`/g, (_, c) => '<code>' + c + '</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_, t, u) => '<a href="' + u + '" rel="noopener">' + t + '</a>');
    return out;
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html += '</code></pre>';
        inCode = false;
      } else {
        flushPara();
        closeList();
        html += '<pre><code>';
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      html += esc(line) + '\n';
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara();
      closeList();
      const level = h[1].length + 1;
      html += '<h' + level + '>' + inline(h[2]) + '</h' + level + '>';
      continue;
    }
    const item = line.match(/^\s*[-*]\s+(.*)$/);
    if (item) {
      flushPara();
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += '<li>' + inline(item[1]) + '</li>';
      continue;
    }
    if (line.trim() === '') {
      flushPara();
      closeList();
      continue;
    }
    para.push(line.trim());
  }
  flushPara();
  closeList();
  if (inCode) html += '</code></pre>';
  return html;
}
