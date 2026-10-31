/* Amanda & Niv's Food Blog — a static, no-build food review blog.
 *
 * Data model
 *   - Published entries live in data/entries.json in the GitHub repo and are served by GitHub Pages.
 *   - With a GitHub token connected (Sync button), saving/deleting commits straight to that file,
 *     and uploaded photos are committed to images/.
 *   - Without a token, entries are saved to this browser's localStorage ("only on this device")
 *     and can be published later once a token is connected.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------- config
  const DEFAULT_REPO = { owner: 'nivaiges', repo: 'AmandaNivFood', branch: 'main' };
  const DATA_PATH = 'data/entries.json';
  const IMAGE_DIR = 'images';
  const LS = { gh: 'anfb.github', local: 'anfb.localEntries', view: 'anfb.view', sort: 'anfb.sort' };
  const PEOPLE = [
    { key: 'amanda', name: 'Amanda' },
    { key: 'niv', name: 'Niv' },
  ];
  const CATEGORIES = {
    'Restaurant': '🍽️',
    'Home-cooked': '🍳',
    'Café & Bakery': '🥐',
    'Street food': '🌮',
    'Takeout': '🥡',
    'Dessert': '🍰',
    'Drinks': '🍸',
  };
  // Stock food photos (Unsplash License) shown until an entry has its own photo.
  // Matched by keyword against the entry's title, then cuisine, then tags; then by category.
  const PH_DIR = 'images/placeholders/';
  const PLACEHOLDERS = [
    { f: 'pasta-penne', k: ['pasta', 'penne', 'rigatoni', 'spaghetti', 'linguine', 'gnocchi', 'carbonara', 'bolognese', 'lasagna', 'ravioli', 'italian'] },
    { f: 'pasta-salad', k: ['pasta salad', 'farfalle', 'pesto'] },
    { f: 'noodles-shrimp', k: ['noodle', 'noodles', 'pad thai', 'lo mein', 'stir fry', 'stir-fry', 'chow mein', 'thai', 'chinese', 'shrimp', 'prawn'] },
    { f: 'pizza-1', k: ['pizza', 'pizzeria', 'flatbread', 'calzone'] },
    { f: 'pizza-2', k: ['pizza', 'margherita', 'pepperoni'] },
    { f: 'burger-1', k: ['burger', 'cheeseburger', 'smash'] },
    { f: 'burger-2', k: ['burger', 'american', 'diner'] },
    { f: 'burger-3', k: ['burger', 'sandwich', 'fried egg'] },
    { f: 'tacos', k: ['taco', 'tacos', 'al pastor', 'barbacoa', 'carnitas', 'birria', 'burrito', 'quesadilla', 'enchilada', 'mexican', 'tex-mex', 'nachos'] },
    { f: 'ramen', k: ['ramen', 'pho', 'udon', 'soup', 'broth', 'korean'] },
    { f: 'sushi', k: ['sushi', 'sashimi', 'maki', 'nigiri', 'omakase', 'japanese', 'poke'] },
    { f: 'salad', k: ['salad', 'greens', 'caesar'] },
    { f: 'bowl-1', k: ['bowl', 'healthy', 'protein', 'grain'] },
    { f: 'bowl-2', k: ['vegan', 'vegetarian', 'buddha', 'falafel', 'hummus', 'chickpea'] },
    { f: 'steak-frites', k: ['steak', 'frites', 'fries', 'beef', 'steakhouse', 'french', 'bistro', 'tasting menu', 'anniversary'] },
    { f: 'bbq-ribs', k: ['bbq', 'barbecue', 'ribs', 'brisket', 'smoked', 'pulled pork', 'southern'] },
    { f: 'grill-skewers', k: ['kebab', 'kabob', 'skewer', 'shawarma', 'grill', 'grilled', 'chicken', 'middle eastern', 'mediterranean', 'turkish', 'greek', 'persian', 'israeli'] },
    { f: 'eggs-avocado', k: ['shakshuka', 'eggs', 'egg', 'avocado', 'toast', 'brunch', 'breakfast', 'benedict', 'omelette'] },
    { f: 'pancakes', k: ['pancake', 'pancakes', 'waffle', 'waffles', 'french toast', 'crepe'] },
    { f: 'coffee', k: ['coffee', 'latte', 'espresso', 'cappuccino', 'café', 'cafe', 'matcha', 'tea'] },
    { f: 'bread', k: ['bread', 'sourdough', 'bakery', 'baguette', 'croissant', 'pastry', 'challah', 'bagel'] },
    { f: 'donuts', k: ['donut', 'donuts', 'doughnut', 'sprinkles'] },
    { f: 'cake', k: ['cake', 'cheesecake', 'birthday', 'tart', 'pie'] },
    { f: 'parfait', k: ['dessert', 'parfait', 'pudding', 'panna cotta', 'mousse', 'ice cream', 'gelato', 'yogurt', 'sweet', 'soufflé', 'souffle'] },
    { f: 'cocktail', k: ['cocktail', 'cocktails', 'drink', 'drinks', 'bar', 'whiskey', 'old fashioned', 'negroni', 'wine', 'beer', 'margarita'] },
    { f: 'samosas', k: ['samosa', 'indian', 'curry', 'butter chicken', 'biryani', 'naan', 'tikka', 'masala', 'dumpling', 'dumplings', 'empanada', 'pakistani', 'nepali'] },
    { f: 'feast', k: ['feast', 'dinner', 'restaurant'] },
  ];
  const PH_BY_CATEGORY = {
    'Restaurant': ['feast', 'steak-frites', 'pasta-penne', 'sushi'],
    'Home-cooked': ['pasta-penne', 'eggs-avocado', 'bowl-2', 'noodles-shrimp'],
    'Café & Bakery': ['coffee', 'bread', 'pancakes'],
    'Street food': ['tacos', 'grill-skewers', 'samosas'],
    'Takeout': ['pizza-1', 'burger-1', 'noodles-shrimp'],
    'Dessert': ['cake', 'donuts', 'parfait'],
    'Drinks': ['cocktail', 'coffee'],
  };
  const kwRegex = new Map();
  function hasKeyword(text, kw) {
    if (!kwRegex.has(kw)) kwRegex.set(kw, new RegExp(`(^|[^\\p{L}])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu'));
    return kwRegex.get(kw).test(text);
  }
  function placeholderFor(e) {
    const fields = [e.title, e.cuisine, [...(e.tags || []), ...(e.mustOrder || [])].join(' ')];
    let pool = [];
    for (const text of fields) {
      if (!text) continue;
      // score each photo by its longest matching keyword, so "butter chicken" beats "chicken"
      const scored = PLACEHOLDERS.map((p) => [p.f, Math.max(0, ...p.k.filter((kw) => hasKeyword(text, kw)).map((kw) => kw.length))]);
      const best = Math.max(...scored.map(([, n]) => n));
      if (best > 0) { pool = scored.filter(([, n]) => n === best).map(([f]) => f); break; }
    }
    if (!pool.length) pool = PH_BY_CATEGORY[e.category] || PLACEHOLDERS.map((p) => p.f);
    return PH_DIR + pool[hash(e.id || e.title) % pool.length] + '.jpg';
  }

  const PALETTES = [
    ['#f6d7b8', '#eab38f'], ['#f3e1a9', '#e3b85a'], ['#dfe8cf', '#a9c18f'],
    ['#f5c9c0', '#e08f7e'], ['#d6e4ee', '#9cbad1'], ['#ead7ee', '#c3a0cb'],
  ];

  // Storage and history can throw (private browsing, sandboxed frames) — never let that break the page.
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
    remove(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };
  function setHash(h, replace = false) {
    try { history[replace ? 'replaceState' : 'pushState'](null, '', h || location.pathname + location.search); } catch { /* ignore */ }
  }

  // ---------------------------------------------------------------- state
  const state = {
    published: [],
    local: loadJSON(LS.local, []),
    q: '',
    category: 'all',
    cuisine: 'all',
    sort: store.get(LS.sort) || 'top',
    view: store.get(LS.view) || 'grid',
    loaded: false,
  };
  const photoCache = new Map(); // repo path -> data URL, so freshly uploaded photos show before Pages redeploys

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---------------------------------------------------------------- utils
  function loadJSON(key, fallback) {
    try { const v = JSON.parse(store.get(key)); return v ?? fallback; } catch { return fallback; }
  }
  function saveLocal() {
    if (store.set(LS.local, JSON.stringify(state.local))) return true;
    toast('Couldn\'t save in this browser (storage full or blocked) — connect GitHub to publish instead.', true);
    return false;
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const splitList = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
  const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function hash(str) { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

  function ratingOf(e, key) { const v = e.ratings?.[key]; return typeof v === 'number' && v > 0 ? v : null; }
  function overall(e) {
    const vals = PEOPLE.map((p) => ratingOf(e, p.key)).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  function spread(e) {
    const a = ratingOf(e, 'amanda'), n = ratingOf(e, 'niv');
    return a != null && n != null ? Math.abs(a - n) : 0;
  }
  const fmtScore = (v) => (v == null ? '–' : (Math.round(v * 10) / 10).toFixed(1));
  const priceStr = (p) => (p ? '$'.repeat(p) : '');

  function starsHTML(v, size = 16) {
    const pct = v == null ? 0 : Math.max(0, Math.min(100, (v / 5) * 100));
    return `<span class="stars" style="--size:${size}px" role="img" aria-label="${v == null ? 'Not rated' : fmtScore(v) + ' out of 5 stars'}"><span style="width:${pct}%"></span></span>`;
  }

  function safePhoto(src) {
    if (!src) return '';
    const s = String(src).trim();
    if (photoCache.has(s)) return photoCache.get(s);
    if (/^data:image\//i.test(s) || /^https?:\/\//i.test(s)) return s;
    if (/^[\w\-./]+$/.test(s) && !s.includes('..')) return s; // relative path inside the repo
    return '';
  }
  function mediaHTML(e, emojiSize, labelPlaceholder = false) {
    const own = safePhoto(e.photo);
    const src = own || placeholderFor(e);
    const [c1, c2] = PALETTES[hash(e.cuisine || e.category || e.title) % PALETTES.length];
    const ph = `<div class="placeholder" style="--ph1:${c1};--ph2:${c2};${emojiSize ? `font-size:${emojiSize}px` : ''}">${CATEGORIES[e.category] || '🍽️'}</div>`;
    if (!src) return ph;
    const tag = !own && labelPlaceholder ? '<span class="ph-label" title="Stock photo until you add your own">Placeholder photo</span>' : '';
    return `<img src="${esc(src)}" alt="${own ? esc(e.title) : ''}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'placeholder',textContent:'${CATEGORIES[e.category] || '🍽️'}'}))" />${tag}`;
  }

  let toastTimer;
  function toast(msg, isError = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = 'toast'), isError ? 6000 : 3200);
  }

  // ---------------------------------------------------------------- GitHub sync
  function ghSettings() {
    const s = loadJSON(LS.gh, {});
    const guess = guessRepoFromLocation();
    return {
      token: s.token || '',
      owner: s.owner || guess.owner || DEFAULT_REPO.owner,
      repo: s.repo || guess.repo || DEFAULT_REPO.repo,
      branch: s.branch || DEFAULT_REPO.branch,
    };
  }
  function guessRepoFromLocation() {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
    if (!m) return {};
    const seg = location.pathname.split('/').filter(Boolean)[0];
    return { owner: m[1], repo: seg || `${m[1]}.github.io` };
  }
  const connected = () => !!ghSettings().token;

  async function gh(path, opts = {}) {
    const s = ghSettings();
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}/${path}`, {
      cache: 'no-store',
      ...opts,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${s.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).message || ''; } catch { /* ignore */ }
      const err = new Error(`GitHub ${res.status}${detail ? ': ' + detail : ''}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  const b64FromText = (text) => bytesToB64(new TextEncoder().encode(text));
  function bytesToB64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  const textFromB64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

  async function ghGetFile(path) {
    const s = ghSettings();
    try {
      const f = await gh(`contents/${path}?ref=${encodeURIComponent(s.branch)}&t=${Date.now()}`);
      return { sha: f.sha, text: textFromB64(f.content || '') };
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }
  async function ghPutFile(path, base64, message, sha) {
    const s = ghSettings();
    return gh(`contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({ message, content: base64, branch: s.branch, ...(sha ? { sha } : {}) }),
    });
  }
  function parseDoc(text) {
    const doc = JSON.parse(text || '{}');
    return Array.isArray(doc) ? doc : doc.entries || [];
  }

  /** Read-modify-write data/entries.json with retry on conflicts. */
  async function commitEntries(mutate, message) {
    for (let attempt = 0; ; attempt++) {
      const file = await ghGetFile(DATA_PATH);
      const entries = mutate(file ? parseDoc(file.text) : []);
      const body = JSON.stringify({ entries }, null, 2) + '\n';
      try {
        await ghPutFile(DATA_PATH, b64FromText(body), message, file?.sha);
        state.published = entries;
        return;
      } catch (e) {
        if ((e.status === 409 || e.status === 422) && attempt < 2) continue;
        throw e;
      }
    }
  }

  /** If the entry's photo is a data URL, upload it to images/ and point the entry at the file. */
  async function uploadPhotoIfNeeded(entry) {
    const m = /^data:image\/(jpeg|png|webp|gif);base64,(.+)$/i.exec(entry.photo || '');
    if (!m) return entry;
    const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
    const slug = (entry.title || 'photo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'photo';
    const path = `${IMAGE_DIR}/${entry.id}-${slug}-${Date.now().toString(36)}.${ext}`;
    await ghPutFile(path, m[2], `Add photo for "${entry.title}"`);
    photoCache.set(path, entry.photo);
    return { ...entry, photo: path };
  }

  async function testConnection() {
    const s = ghSettings();
    const repo = await gh('');
    if (!repo.permissions?.push) throw new Error('This token can read the repo but cannot write to it. Give it Contents: Read and write.');
    await gh(`branches/${encodeURIComponent(s.branch)}`);
    return repo;
  }

  // ---------------------------------------------------------------- loading
  async function loadPublished() {
    let entries = null;
    if (connected()) {
      try { const f = await ghGetFile(DATA_PATH); entries = f ? parseDoc(f.text) : []; }
      catch (e) { console.warn('GitHub load failed, falling back to site copy', e); }
    }
    if (!entries) {
      try {
        const res = await fetch(`${DATA_PATH}?t=${Date.now()}`, { cache: 'no-store' });
        entries = res.ok ? parseDoc(await res.text()) : [];
      } catch { entries = []; }
    }
    state.published = entries;
    state.loaded = true;
  }

  function allEntries() {
    return [
      ...state.published.map((e) => ({ ...e, _local: false })),
      ...state.local.map((e) => ({ ...e, _local: true })),
    ];
  }
  const findEntry = (id) => allEntries().find((e) => e.id === id);

  // ---------------------------------------------------------------- filtering / sorting
  // Compare two possibly-null numbers; nulls always sort last. dir = 1 ascending, -1 descending.
  function nullsLast(x, y, dir) {
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return dir * (x - y);
  }
  const cmpDate = (a, b) => String(a.date || '').localeCompare(String(b.date || ''));
  const ratedCount = (e) => PEOPLE.filter((p) => ratingOf(e, p.key) != null).length;
  const byTop = (a, b) => nullsLast(overall(a), overall(b), -1) || ratedCount(b) - ratedCount(a) || cmpDate(b, a);
  const SORTS = {
    top: byTop,
    amanda: (a, b) => nullsLast(ratingOf(a, 'amanda'), ratingOf(b, 'amanda'), -1) || byTop(a, b),
    niv: (a, b) => nullsLast(ratingOf(a, 'niv'), ratingOf(b, 'niv'), -1) || byTop(a, b),
    debate: (a, b) => spread(b) - spread(a) || byTop(a, b),
    newest: (a, b) => cmpDate(b, a) || byTop(a, b),
    oldest: (a, b) => cmpDate(a, b) || byTop(a, b),
    'price-asc': (a, b) => nullsLast(a.price || null, b.price || null, 1) || byTop(a, b),
    'price-desc': (a, b) => nullsLast(a.price || null, b.price || null, -1) || byTop(a, b),
    az: (a, b) => String(a.title).localeCompare(String(b.title)),
  };

  function overallRanks(entries) {
    const ranked = entries.filter((e) => overall(e) != null).sort(SORTS.top);
    const map = new Map();
    ranked.forEach((e, i) => map.set(e.id, i + 1));
    return map;
  }

  function visibleEntries() {
    const q = state.q.trim().toLowerCase();
    return allEntries()
      .filter((e) => state.category === 'all' || e.category === state.category)
      .filter((e) => state.cuisine === 'all' || (e.cuisine || '').toLowerCase() === state.cuisine)
      .filter((e) => {
        if (!q) return true;
        const hay = [e.title, e.place, e.location, e.cuisine, e.category, e.verdict, e.review, ...(e.tags || []), ...(e.mustOrder || [])].join(' ').toLowerCase();
        return q.split(/\s+/).every((w) => hay.includes(w.replace(/^#/, '')));
      })
      .sort(SORTS[state.sort] || SORTS.top);
  }

  // ---------------------------------------------------------------- rendering
  function render() {
    const all = allEntries();
    renderStats(all);
    renderBanner(all);
    renderFilters(all);
    renderEntries(all);
    renderSyncDot();
  }

  function renderStats(all) {
    const rated = all.filter((e) => overall(e) != null);
    const avg = rated.length ? rated.reduce((s, e) => s + overall(e), 0) / rated.length : null;
    const counts = {};
    all.forEach((e) => e.cuisine && (counts[e.cuisine] = (counts[e.cuisine] || 0) + 1));
    const topCuisine = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const best = rated.sort(SORTS.top)[0];
    const stats = [
      [all.length, all.length === 1 ? 'plate reviewed' : 'plates reviewed'],
      [avg == null ? '–' : fmtScore(avg) + '★', 'average score'],
      [topCuisine || '–', 'most-eaten cuisine'],
      [best ? fmtScore(overall(best)) + '★' : '–', best ? `best: ${best.title}` : 'top score'],
    ];
    $('#stats').innerHTML = stats.map(([b, s]) => `<div class="stat"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('');
  }

  function renderBanner(all) {
    const parts = [];
    const samples = all.filter((e) => e.sample).length;
    const locals = state.local.length;
    if (samples) {
      parts.push(`<div class="banner"><span>👋 <b>Welcome!</b> The ${samples} entries marked “Sample” are just examples. Add your own, then delete them.</span></div>`);
    }
    if (locals) {
      parts.push(connected()
        ? `<div class="banner info"><span>📱 ${locals} ${locals === 1 ? 'entry is' : 'entries are'} saved only on this device.</span><button class="btn btn-primary btn-sm" data-action="publish-local">Publish to the blog</button></div>`
        : `<div class="banner info"><span>📱 ${locals} ${locals === 1 ? 'entry is' : 'entries are'} saved only in this browser. Connect GitHub to publish them for everyone.</span><button class="btn btn-ghost btn-sm" data-action="settings">Connect GitHub</button></div>`);
    }
    $('#banner').innerHTML = parts.join('');
  }

  function renderFilters(all) {
    const cats = [...new Set(all.map((e) => e.category).filter(Boolean))].sort();
    const cuisines = [...new Map(all.filter((e) => e.cuisine).map((e) => [e.cuisine.toLowerCase(), e.cuisine])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
    if (state.category !== 'all' && !cats.includes(state.category)) state.category = 'all';
    if (state.cuisine !== 'all' && !cuisines.some(([k]) => k === state.cuisine)) state.cuisine = 'all';
    $('#f-category').innerHTML = `<option value="all">All</option>` + cats.map((c) => `<option value="${esc(c)}">${CATEGORIES[c] || ''} ${esc(c)}</option>`).join('');
    $('#f-cuisine').innerHTML = `<option value="all">All</option>` + cuisines.map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join('');
    $('#f-category').value = state.category;
    $('#f-cuisine').value = state.cuisine;
    $('#sort').value = state.sort;
    $$('.view-toggle button').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));
    $('#cuisine-list').innerHTML = cuisines.map(([, v]) => `<option value="${esc(v)}">`).join('');
  }

  function renderEntries(all) {
    const list = visibleEntries();
    const ranks = overallRanks(all);
    const el = $('#entries');
    el.className = state.view === 'list' ? 'grid list' : 'grid';
    const filtered = list.length !== all.length;
    $('#result-count').textContent = !state.loaded ? 'Loading…'
      : filtered ? `Showing ${list.length} of ${all.length} entries` : `${all.length} ${all.length === 1 ? 'entry' : 'entries'}`;

    if (!state.loaded) { el.innerHTML = ''; return; }
    if (!list.length) {
      el.innerHTML = all.length
        ? `<div class="empty"><div class="big">🔍</div><h3>Nothing matches that</h3><p>Try a different search or clear the filters.</p><button class="btn btn-ghost" data-action="clear-filters">Clear filters</button></div>`
        : `<div class="empty"><div class="big">🍽️</div><h3>The table is set</h3><p>No entries yet — add your first review!</p><button class="btn btn-primary" data-action="new">+ New entry</button></div>`;
      return;
    }
    el.innerHTML = state.view === 'list'
      ? list.map((e, i) => rowHTML(e, i + 1, i)).join('')
      : list.map((e, i) => cardHTML(e, ranks.get(e.id), i)).join('');
  }

  function rankClass(r) { return r && r <= 3 ? ` r${r}` : ''; }

  function cardHTML(e, rank, i) {
    const o = overall(e);
    const chips = [
      e.sample && '<span class="chip sample">Sample</span>',
      e._local && '<span class="chip local">This device</span>',
      spread(e) >= 1.5 && '<span class="chip debate">🔥 Hot debate</span>',
    ].filter(Boolean).join('');
    const meta = [e.category && `${CATEGORIES[e.category] || ''} ${e.category}`, e.cuisine, priceStr(e.price)].filter(Boolean);
    return `
      <article class="card" tabindex="0" data-open="${esc(e.id)}" style="animation-delay:${Math.min(i, 12) * 30}ms">
        <div class="card-media">
          ${mediaHTML(e, 0, true)}
          ${rank ? `<span class="rank-badge${rankClass(rank)}">#${rank}</span>` : ''}
          ${chips ? `<div class="chip-row">${chips}</div>` : ''}
        </div>
        <div class="card-body">
          <div class="score-badge${o == null ? ' na' : ''}"><div><b>${fmtScore(o)}</b><small>/ 5</small></div></div>
          <div class="meta">${meta.map((m, j) => `<span${j ? ' class="dot"' : ''}>${esc(m)}</span>`).join('')}</div>
          <h3>${esc(e.title)}</h3>
          ${e.place || e.location ? `<p class="place">${e.place ? `<b>${esc(e.place)}</b>` : ''}${e.place && e.location ? ' · ' : ''}${esc(e.location || '')}</p>` : ''}
          ${e.verdict ? `<p class="verdict">“${esc(e.verdict)}”</p>` : ''}
          ${e.date ? `<p class="date">${esc(fmtDate(e.date))}</p>` : ''}
          <div class="duo">
            ${PEOPLE.map((p) => {
              const v = ratingOf(e, p.key);
              return `<div class="duo-item ${p.key}"><span class="who">${p.name}</span><span>${starsHTML(v, 14)} ${v == null ? '<span class="na-text">not rated</span>' : `<span class="num">${fmtScore(v)}</span>`}</span></div>`;
            }).join('')}
          </div>
        </div>
      </article>`;
  }

  function rowHTML(e, pos, i) {
    const o = overall(e);
    return `
      <article class="row" tabindex="0" data-open="${esc(e.id)}" style="animation-delay:${Math.min(i, 15) * 25}ms">
        <div class="row-rank${rankClass(pos)}">${pos}</div>
        <div class="row-thumb">${mediaHTML(e, 34)}</div>
        <div class="row-main">
          <div class="meta">${[e.category, e.cuisine, priceStr(e.price)].filter(Boolean).map((m, j) => `<span${j ? ' class="dot"' : ''}>${esc(m)}</span>`).join('')}</div>
          <h3>${esc(e.title)} ${e._local ? '<span class="chip local">This device</span>' : ''}${e.sample ? ' <span class="chip sample">Sample</span>' : ''}</h3>
          <p class="place">${esc([e.place, e.location].filter(Boolean).join(' · '))}</p>
        </div>
        <div class="row-scores">
          ${PEOPLE.map((p) => `<div class="row-person ${p.key}"><b>${fmtScore(ratingOf(e, p.key))}</b>${p.name}</div>`).join('')}
          <div class="row-overall"><b>${fmtScore(o)}</b><small>overall</small></div>
        </div>
      </article>`;
  }

  function renderSyncDot() {
    const dot = $('#sync-dot');
    dot.className = 'sync-dot ' + (connected() ? 'on' : 'off');
    dot.parentElement.title = connected() ? 'Connected to GitHub — saves publish to the blog' : 'Not connected — saves stay in this browser';
  }

  // ---------------------------------------------------------------- detail view
  function openDetail(id, push = true) {
    const e = findEntry(id);
    if (!e) return;
    const o = overall(e);
    const rank = overallRanks(allEntries()).get(e.id);
    const paragraphs = String(e.review || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const meta = [e.category && `${CATEGORIES[e.category] || ''} ${e.category}`, e.cuisine, priceStr(e.price), fmtDate(e.date)].filter(Boolean);
    $('#detail-body').innerHTML = `
      <div class="detail-hero">
        ${mediaHTML(e, 110, true)}
        <button class="icon-btn" data-close aria-label="Close">✕</button>
        ${rank ? `<span class="rank-badge${rankClass(rank)}">#${rank} overall</span>` : ''}
      </div>
      <div class="detail-content">
        <div class="meta">${meta.map((m, j) => `<span${j ? ' class="dot"' : ''}>${esc(m)}</span>`).join('')}</div>
        <h2>${esc(e.title)}</h2>
        ${e.place || e.location ? `<p class="place">${e.place ? `<b>${esc(e.place)}</b>` : ''}${e.place && e.location ? ' · ' : ''}${esc(e.location || '')}</p>` : ''}
        <div class="tags" style="margin-top:10px">
          ${e.sample ? '<span class="chip sample">Sample entry</span>' : ''}
          ${e._local ? '<span class="chip local">Saved on this device only</span>' : ''}
          ${e.wouldReturn ? '<span class="chip return">✓ We\'d go back</span>' : ''}
          ${spread(e) >= 1.5 ? '<span class="chip debate">🔥 Hot debate</span>' : ''}
        </div>
        <div class="scorecard">
          ${PEOPLE.map((p) => {
            const v = ratingOf(e, p.key);
            return `<div class="score-box ${p.key}"><div class="who">${p.name} says</div><div class="big">${fmtScore(v)}</div>${starsHTML(v, 18)}</div>`;
          }).join('')}
          <div class="score-box overall"><div class="who">Overall</div><div class="big">${fmtScore(o)}</div>${starsHTML(o, 18)}</div>
        </div>
        ${e.verdict ? `<p class="verdict">“${esc(e.verdict)}”</p>` : ''}
        ${paragraphs.length ? `<div class="review-text">${paragraphs.map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>` : ''}
        ${e.mustOrder?.length ? `<div class="must"><h4>Must order</h4><ul>${e.mustOrder.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
        ${e.tags?.length ? `<div class="tags">${e.tags.map((t) => `<button class="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
        <div class="detail-actions">
          <button class="btn btn-primary" data-action="edit" data-id="${esc(e.id)}">Edit</button>
          <button class="btn btn-ghost" data-action="share" data-id="${esc(e.id)}">Copy link</button>
          <span class="spacer"></span>
          <button class="btn btn-danger" data-action="delete" data-id="${esc(e.id)}">Delete</button>
        </div>
      </div>`;
    const dlg = $('#detail');
    if (!dlg.open) dlg.showModal();
    $('.detail-content', dlg).scrollTop = 0;
    if (push && location.hash !== `#entry-${id}`) setHash(`#entry-${encodeURIComponent(id)}`);
  }

  function closeDetail() {
    const dlg = $('#detail');
    if (dlg.open) dlg.close();
  }

  // ---------------------------------------------------------------- editor
  const form = $('#entry-form');
  const editorState = { id: null, photo: '', isLocal: false };

  function buildStarInputs() {
    $$('.star-input').forEach((wrap) => {
      wrap.innerHTML = `
        <div class="si-stars" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="5" aria-label="${wrap.dataset.person} rating">
          ${[1, 2, 3, 4, 5].map(() => '<span class="si-star">★</span>').join('')}
        </div>
        <span class="si-val">–</span>
        <button type="button" class="si-clear">clear</button>`;
      const stars = $('.si-stars', wrap);
      let value = 0;
      const paint = (v) => {
        $$('.si-star', wrap).forEach((s, i) => s.style.setProperty('--fill', `${Math.max(0, Math.min(1, v - i)) * 100}%`));
        $('.si-val', wrap).textContent = v ? v.toFixed(1) : '–';
      };
      const set = (v) => {
        value = Math.max(0, Math.min(5, Math.round(v * 2) / 2));
        stars.setAttribute('aria-valuenow', value);
        stars.setAttribute('aria-valuetext', value ? `${value} stars` : 'not rated');
        paint(value);
      };
      const fromPointer = (ev) => {
        const r = stars.getBoundingClientRect();
        const x = Math.max(0, Math.min(r.width, ev.clientX - r.left));
        return Math.max(0.5, Math.ceil((x / r.width) * 10) / 2);
      };
      let dragging = false;
      stars.addEventListener('pointerdown', (ev) => { dragging = true; stars.setPointerCapture(ev.pointerId); set(fromPointer(ev)); });
      stars.addEventListener('pointermove', (ev) => { if (dragging) set(fromPointer(ev)); else if (ev.pointerType === 'mouse') paint(fromPointer(ev)); });
      stars.addEventListener('pointerup', () => { dragging = false; });
      stars.addEventListener('pointerleave', () => { if (!dragging) paint(value); });
      stars.addEventListener('keydown', (ev) => {
        const step = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 }[ev.key];
        if (step) { ev.preventDefault(); set(value + step); }
        else if (ev.key === 'Home') set(0);
        else if (ev.key === 'End') set(5);
      });
      $('.si-clear', wrap).addEventListener('click', () => set(0));
      wrap._get = () => value || null;
      wrap._set = (v) => set(v || 0);
    });
  }

  function setPhotoPreview(src) {
    editorState.photo = src || '';
    const shown = safePhoto(src);
    $('#photo-preview').innerHTML = shown ? `<img src="${esc(shown)}" alt="Preview" />` : '<span>No photo yet —<br>we\'ll show a<br>placeholder</span>';
    $('#photo-clear').hidden = !src;
  }

  function openEditor(id = null) {
    const e = id ? findEntry(id) : null;
    editorState.id = e?.id || null;
    editorState.isLocal = !!e?._local;
    form.reset();
    $('#editor-title').textContent = e ? 'Edit entry' : 'New entry';
    $('select[name=category]', form).innerHTML = Object.entries(CATEGORIES).map(([c, em]) => `<option value="${esc(c)}">${em} ${esc(c)}</option>`).join('');
    const v = e || { category: 'Restaurant', date: todayISO(), price: 2, wouldReturn: true };
    form.title.value = v.title || '';
    form.place.value = v.place || '';
    form.location.value = v.location || '';
    form.category.value = CATEGORIES[v.category] ? v.category : 'Restaurant';
    form.cuisine.value = v.cuisine || '';
    form.date.value = v.date || '';
    const priceRadio = $(`input[name=price][value="${v.price || 0}"]`, form);
    if (priceRadio) priceRadio.checked = true;
    form.verdict.value = v.verdict || '';
    form.review.value = v.review || '';
    form.mustOrder.value = (v.mustOrder || []).join(', ');
    form.tags.value = (v.tags || []).join(', ');
    form.wouldReturn.checked = !!v.wouldReturn;
    $$('.star-input', form).forEach((w) => w._set(v.ratings?.[w.dataset.person]));
    const isUrl = /^https?:\/\//i.test(v.photo || '');
    form.photoUrl.value = isUrl ? v.photo : '';
    setPhotoPreview(v.photo || '');
    form.title.classList.remove('invalid');
    $('#save-note').textContent = connected()
      ? (e && e._local ? 'Saving will publish this entry to the blog.' : 'Saving commits to GitHub — the live site updates in a minute or two.')
      : 'Not connected to GitHub — this entry will be saved in this browser only.';
    closeDetail();
    $('#editor').showModal();
    setTimeout(() => form.title.focus(), 50);
  }

  function readForm() {
    const ratings = {};
    $$('.star-input', form).forEach((w) => { const r = w._get(); if (r) ratings[w.dataset.person] = r; });
    const existing = editorState.id ? findEntry(editorState.id) : null;
    const now = new Date().toISOString();
    const entry = {
      id: editorState.id || uid(),
      title: form.title.value.trim(),
      place: form.place.value.trim(),
      location: form.location.value.trim(),
      category: form.category.value,
      cuisine: form.cuisine.value.trim(),
      date: form.date.value,
      price: Number(form.price.value) || 0,
      ratings,
      verdict: form.verdict.value.trim(),
      review: form.review.value.trim(),
      mustOrder: splitList(form.mustOrder.value),
      tags: splitList(form.tags.value).map((t) => t.replace(/^#/, '')),
      wouldReturn: form.wouldReturn.checked,
      photo: editorState.photo || '',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    return entry; // editing a sample entry turns it into a real one (no `sample` flag)
  }

  async function saveEntry(ev) {
    ev.preventDefault();
    const entry = readForm();
    if (!entry.title) {
      form.title.classList.add('invalid');
      form.title.focus();
      toast('Give the dish a name first.', true);
      return;
    }
    const btn = $('#save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      if (connected()) {
        const toSave = await uploadPhotoIfNeeded(entry);
        await commitEntries((list) => upsert(list, toSave), `${editorState.id && !editorState.isLocal ? 'Update' : 'Add'} review: ${toSave.title}`);
        if (editorState.isLocal) { state.local = state.local.filter((e) => e.id !== entry.id); saveLocal(); }
        toast('Published! The live site updates in a minute or two. 🎉');
      } else {
        if (editorState.id && !editorState.isLocal) {
          toast('Published entries can only be changed when connected to GitHub.', true);
          openSettings();
          return;
        }
        const prev = state.local;
        state.local = upsert(state.local, entry);
        if (!saveLocal()) { state.local = prev; return; }
        toast('Saved on this device.');
      }
      $('#editor').close();
      render();
      openDetail(entry.id);
    } catch (e) {
      console.error(e);
      toast(`Couldn't save: ${e.message}`, true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save entry';
    }
  }

  function upsert(list, entry) {
    const i = list.findIndex((e) => e.id === entry.id);
    const copy = list.slice();
    const clean = Object.fromEntries(Object.entries(entry).filter(([k]) => !k.startsWith('_')));
    if (i >= 0) copy[i] = clean; else copy.push(clean);
    return copy;
  }

  async function deleteEntry(id) {
    const e = findEntry(id);
    if (!e) return;
    if (!(await confirmDialog(`Delete “${e.title}”?`, 'This can\'t be undone.', 'Delete'))) return;
    try {
      if (e._local) {
        state.local = state.local.filter((x) => x.id !== id);
        saveLocal();
      } else {
        if (!connected()) { toast('Connect GitHub to delete published entries.', true); openSettings(); return; }
        await commitEntries((list) => list.filter((x) => x.id !== id), `Delete review: ${e.title}`);
      }
      closeDetail();
      setHash('', true);
      render();
      toast('Entry deleted.');
    } catch (err) {
      toast(`Couldn't delete: ${err.message}`, true);
    }
  }

  async function publishLocal() {
    if (!connected() || !state.local.length) return;
    const btn = $('[data-action=publish-local]');
    if (btn) { btn.disabled = true; btn.textContent = 'Publishing…'; }
    try {
      const uploaded = [];
      for (const e of state.local) uploaded.push(await uploadPhotoIfNeeded(e));
      await commitEntries((list) => uploaded.reduce((acc, e) => upsert(acc, e), list), `Publish ${uploaded.length} review${uploaded.length === 1 ? '' : 's'}`);
      state.local = [];
      saveLocal();
      render();
      toast(`Published ${uploaded.length} ${uploaded.length === 1 ? 'entry' : 'entries'}! 🎉`);
    } catch (err) {
      toast(`Couldn't publish: ${err.message}`, true);
      render();
    }
  }

  // photos: resize client-side so the repo and localStorage stay small
  function resizeImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')); };
      img.src = url;
    });
  }

  /** In-page replacement for window.confirm (which sandboxed frames block). */
  function confirmDialog(title, body, okLabel = 'OK') {
    const dlg = $('#confirm');
    $('#confirm-title').textContent = title;
    $('#confirm-body').textContent = body;
    $('#confirm-ok').textContent = okLabel;
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise((resolve) => dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true }));
  }

  // ---------------------------------------------------------------- settings
  function openSettings() {
    const s = ghSettings();
    const f = $('#settings-form');
    f.token.value = s.token;
    f.owner.value = s.owner;
    f.repo.value = s.repo;
    f.branch.value = s.branch;
    renderSyncStatus();
    closeDetail();
    $('#settings').showModal();
  }
  function renderSyncStatus(msg) {
    const el = $('#sync-status');
    const s = ghSettings();
    el.className = 'sync-status ' + (connected() ? 'on' : 'off');
    el.textContent = msg || (connected()
      ? `✓ Connected to ${s.owner}/${s.repo} (${s.branch}). Saves publish to the blog.`
      : 'Not connected. New entries are saved in this browser only.');
  }

  async function connect() {
    const f = $('#settings-form');
    const next = {
      token: f.token.value.trim(),
      owner: f.owner.value.trim() || DEFAULT_REPO.owner,
      repo: f.repo.value.trim() || DEFAULT_REPO.repo,
      branch: f.branch.value.trim() || DEFAULT_REPO.branch,
    };
    if (!next.token) { toast('Paste a GitHub token first.', true); return; }
    const prev = store.get(LS.gh);
    if (!store.set(LS.gh, JSON.stringify(next))) { toast('This browser blocks local storage, so the token can\'t be saved here.', true); return; }
    const btn = $('#connect-btn');
    btn.disabled = true;
    btn.textContent = 'Testing…';
    try {
      await testConnection();
      renderSyncStatus();
      await loadPublished();
      render();
      toast('Connected to GitHub! ✓');
    } catch (e) {
      if (prev) store.set(LS.gh, prev); else store.remove(LS.gh);
      renderSyncStatus(`✗ ${e.status === 401 ? 'That token was rejected — check it was copied correctly.' : e.status === 404 ? 'Repo or branch not found (or the token has no access to it).' : e.message}`);
      $('#sync-status').className = 'sync-status off';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save & test connection';
      renderSyncDot();
    }
  }

  function disconnect() {
    store.remove(LS.gh);
    $('#settings-form').token.value = '';
    renderSyncStatus();
    render();
    toast('Disconnected. The token was removed from this browser.');
  }

  function exportJSON() {
    const data = JSON.stringify({ entries: allEntries().map((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('_')))) }, null, 2);
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([data], { type: 'application/json' })),
      download: `amanda-niv-food-blog-${todayISO()}.json`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importJSON(file) {
    try {
      const incoming = parseDoc(await file.text()).filter((e) => e && e.title);
      const known = new Set(allEntries().map((e) => e.id));
      const fresh = incoming.filter((e) => !known.has(e.id)).map((e) => ({ ...e, id: e.id || uid() }));
      if (!fresh.length) { toast('Nothing new to import — every entry is already here.'); return; }
      state.local = [...state.local, ...fresh];
      if (saveLocal()) { render(); toast(`Imported ${fresh.length} ${fresh.length === 1 ? 'entry' : 'entries'} to this device.`); }
    } catch {
      toast('That file is not a valid blog backup.', true);
    }
  }

  // ---------------------------------------------------------------- events
  function bind() {
    document.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-action],[data-open],[data-close],[data-view],[data-tag]');
      if (!t) return;
      if (t.dataset.open) return openDetail(t.dataset.open);
      if (t.hasAttribute('data-close')) { t.closest('dialog')?.close(); return; }
      if (t.dataset.view) { state.view = t.dataset.view; store.set(LS.view, state.view); return render(); }
      if (t.dataset.tag) {
        closeDetail();
        state.q = t.dataset.tag; $('#q').value = state.q; render();
        $('#reviews').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      const id = t.dataset.id;
      switch (t.dataset.action) {
        case 'new': ev.preventDefault(); return openEditor();
        case 'edit': return openEditor(id);
        case 'delete': return deleteEntry(id);
        case 'settings': return openSettings();
        case 'publish-local': return publishLocal();
        case 'clear-filters':
          state.q = ''; state.category = 'all'; state.cuisine = 'all'; $('#q').value = ''; return render();
        case 'share': {
          const url = `${location.origin}${location.pathname}#entry-${encodeURIComponent(id)}`;
          Promise.resolve(navigator.clipboard?.writeText(url)).then(() => toast('Link copied!'), () => toast(url));
          return;
        }
        case 'home':
          if (t.getAttribute('href') === '#') ev.preventDefault();
          closeDetail();
          if (t.getAttribute('href') === '#') window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    document.addEventListener('keydown', (ev) => {
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.dataset?.open) { ev.preventDefault(); openDetail(ev.target.dataset.open); }
    });

    // click on backdrop closes dialogs
    $$('dialog').forEach((d) => d.addEventListener('click', (ev) => { if (ev.target === d) d.close(); }));
    $('#detail').addEventListener('close', () => {
      if (location.hash.startsWith('#entry')) setHash('', true);
    });

    let qTimer;
    $('#q').addEventListener('input', (ev) => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = ev.target.value; renderEntries(allEntries()); }, 120); });
    $('#f-category').addEventListener('change', (ev) => { state.category = ev.target.value; renderEntries(allEntries()); });
    $('#f-cuisine').addEventListener('change', (ev) => { state.cuisine = ev.target.value; renderEntries(allEntries()); });
    $('#sort').addEventListener('change', (ev) => { state.sort = ev.target.value; store.set(LS.sort, state.sort); renderEntries(allEntries()); });

    form.addEventListener('submit', saveEntry);
    form.title.addEventListener('input', () => form.title.classList.remove('invalid'));
    $('#photo-file').addEventListener('change', async (ev) => {
      const file = ev.target.files[0];
      ev.target.value = '';
      if (!file) return;
      try {
        // bigger when it'll go to GitHub, smaller when it has to fit in localStorage
        const dataUrl = connected() ? await resizeImage(file, 1600, 0.82) : await resizeImage(file, 1000, 0.72);
        form.photoUrl.value = '';
        setPhotoPreview(dataUrl);
      } catch (e) { toast(e.message, true); }
    });
    form.photoUrl.addEventListener('change', () => {
      const v = form.photoUrl.value.trim();
      if (!v) return;
      if (!/^https?:\/\//i.test(v)) { toast('Image links need to start with http:// or https://', true); return; }
      setPhotoPreview(v);
    });
    $('#photo-clear').addEventListener('click', () => { form.photoUrl.value = ''; setPhotoPreview(''); });

    $('#connect-btn').addEventListener('click', connect);
    $('#disconnect-btn').addEventListener('click', disconnect);
    $('#export-btn').addEventListener('click', exportJSON);
    $('#import-file').addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) importJSON(f); });

    window.addEventListener('popstate', routeFromHash);
    window.addEventListener('hashchange', routeFromHash);
  }

  function routeFromHash() {
    const m = location.hash.match(/^#entry[-=](.+)$/); // '=' kept for old links
    if (m) openDetail(decodeURIComponent(m[1]), false);
    else closeDetail();
  }

  // ---------------------------------------------------------------- boot
  async function init() {
    buildStarInputs();
    bind();
    render();
    await loadPublished();
    render();
    routeFromHash();
  }
  init();
})();
