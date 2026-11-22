/* BTX Community · site.js
   One file for every page. No libraries. Everything starts from data attributes on
   DOMContentLoaded; every page works without it. API answers are validated before use
   and only ever written with textContent.
   Exposes window.BTX = { status, glossary, toast }. */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;

  function motionOff() {
    return root.getAttribute("data-motion") === "off";
  }
  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }
  function $all(selector, scope) {
    return toArray((scope || doc).querySelectorAll(selector));
  }
  function el(tag, className, text) {
    var node = doc.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }
  function storeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function storeSet(key, value) {
    try {
      if (value === null) { window.localStorage.removeItem(key); } else { window.localStorage.setItem(key, value); }
    } catch (e) { /* private mode or blocked storage: the page still works */ }
  }

  /* ------------------------------------------------------------------------
     Glossary (DESIGN 6.11). The single source; /learn/#words shows the same text.
     ------------------------------------------------------------------------ */
  // /learn/#words repeats these definitions as static HTML (dt id=word-<key>, sorted by term).
  // Change both together. Each term popover links to its own entry there.
  var glossary = {
    "btx": { term: "BTX", def: "A post-quantum fork of Bitcoin with a fixed maximum supply of 21 million coins and its own proof of work, MatMul. Its code is open source, and anyone can propose a change." },
    "fork": { term: "Fork (of Bitcoin)", def: "A coin built from another coin's code. BTX runs its own chain from its own first block, using code from Bitcoin Knots v29.2, a variant of Bitcoin Core. The proof of work, the signatures and some network rules differ." },
    "block": { term: "Block", def: "A batch of transactions added to the chain. A new BTX block comes about every 90 seconds." },
    "block-height": { term: "Block height", def: "The number of a block, counted from the first one. The current height says how long the chain is right now." },
    "confirmation": { term: "Confirmation", def: "Each block added on top of the block that holds your transaction counts as one confirmation. Wait for at least 10 before you treat a BTX payment as final." },
    "reorganisation": { term: "Reorganisation", def: "The network switches to a different version of its newest blocks, and those blocks are replaced. Short reorganisations happen on BTX several times a day, which is why you wait for confirmations." },
    "wallet": { term: "Wallet", def: "Software that holds your keys and lets you receive and send BTX. The node software has one built in; others are in the link list." },
    "seed-phrase": { term: "Seed phrase", def: "The secret that restores your wallet and can spend all its coins. Some wallets show it as a list of words. In the BTX browser wallet it is inside the .btxwallet backup file, in plain text. Never share it, and never type or upload it into a website or an AI tool." },
    "private-key": { term: "Private key", def: "The secret that signs your transactions. Whoever has it can spend the coins, so nobody legitimate will ever ask for it." },
    "address": { term: "Address", def: "What you give someone so they can send you BTX. A BTX address starts with btx1z; check it in full before you use it." },
    "btx1z": { term: "btx1z", def: "The start of every BTX payment address (P2MR, with post-quantum signatures). If a market's deposit addresses do not start with btx1z, it is not for this chain." },
    "node": { term: "Node", def: "A computer running the BTX node software. It keeps a copy of the chain, relays blocks and transactions, and keeps the network reachable." },
    "full-node": { term: "Full node", def: "A node that keeps the whole chain and relays blocks and transactions. With a GPU that passes btxd's self-test it checks the MatMul work itself; without one it runs as a trusted mirror." },
    "trusted-mirror": { term: "Trusted mirror", def: "A node without a qualified GPU. It still checks transactions itself, but for the MatMul work it follows signed checks from signers. It needs at least two signers it trusts, or it stops syncing." },
    "signer": { term: "Signer", def: "A machine with a qualified GPU that replays the MatMul work of new blocks and signs the result. Trusted mirrors follow these signatures; the developers also call it a GPU attestor." },
    "snapshot": { term: "Snapshot", def: "A file with the chain's state at one block, so a new node does not have to sync from the start. Use a signed one: a sync from genesis currently stops at block 126,978." },
    "genesis": { term: "Genesis", def: "The first block of the chain. Syncing from genesis means downloading and checking every block from the start." },
    "release": { term: "Release", def: "A published version of the node software, such as v0.34.16. Download releases only from github.com/btxchain/btx/releases and read the release notes first." },
    "mining": { term: "Mining", def: "Doing the proof-of-work that adds new blocks. Whoever finds a block gets the block reward, now 20 BTX." },
    "miner": { term: "Miner", def: "A person who mines, or the program that does the work on a GPU, such as easyBTX or matador." },
    "pool": { term: "Mining pool", def: "A service where many miners combine their work and share the rewards, for steadier payouts. When one pool finds most blocks, the network depends on it." },
    "solo-mining": { term: "Solo mining", def: "Mining alone against your own node. You keep every block you find, but payouts come irregularly." },
    "gpu": { term: "GPU", def: "A graphics processor: an NVIDIA card, or the one built into an Apple Silicon Mac. BTX mining needs one, and a node needs a qualified one to check blocks itself. There is no CPU mining." },
    "cuda": { term: "CUDA", def: "NVIDIA's software for running calculations on its graphics cards. BTX uses it to mine and to check MatMul work on NVIDIA GPUs; Apple GPUs use Metal." },
    "matmul": { term: "MatMul", def: "Short for matrix multiplication. Instead of hashing, BTX miners multiply large matrices, the work AI accelerators are built for." },
    "proof-of-work": { term: "Proof of work", def: "A miner must do costly computing work to add a block, which makes rewriting the chain expensive. BTX uses MatMul as its proof of work." },
    "post-quantum": { term: "Post-quantum", def: "Meant to withstand attacks from future quantum computers. BTX locks coins with post-quantum signatures instead of Bitcoin's." },
    "ml-dsa": { term: "ML-DSA", def: "The signature scheme BTX uses for everyday spending: ML-DSA-44, standardised by NIST as FIPS 204. SLH-DSA (FIPS 205) is the hash-based fallback." },
    "halving": { term: "Halving", def: "The block reward halves every 525,000 blocks, roughly every 18 months. It is 20 BTX per block now." },
    "block-reward": { term: "Block reward", def: "New coins paid to whoever mines a block. It is 20 BTX now and halves every 525,000 blocks." },
    "exchange": { term: "Exchange", def: "A website or company where you trade BTX against other coins or money. Check that withdrawals really work before you rely on one." },
    "otc": { term: "OTC", def: "Over the counter: a trade arranged directly with a seller instead of on an exchange's order book. Check that the seller really delivers and withdrawals work before you pay." },
    "model-price": { term: "Model price", def: "A price a website labels as a “model” or “reference” price. It is an estimate, not an offer that anyone has to honour, and not a market you can sell into." },
    "btxd": { term: "btxd", def: "The BTX node program. It runs the node, and its built-in wallet, in the background." },
    "btx-cli": { term: "btx-cli", def: "The command-line tool that sends commands to a running btxd, for example btx-cli stop." },
    "psbt": { term: "PSBT", def: "Partially signed Bitcoin transaction: a standard format for passing an unfinished transaction between wallets or signers. The BTX node supports PSBTs the way Bitcoin does." },
    "swapnet": { term: "SwapNet", def: "A system built into btxd that swaps BTX with BTC or ETH directly between two parties. In v0.34.16 it starts only with -swapnet=1; the install checklist notes it starts by default from 0.34.17." },
    "htlc": { term: "HTLC", def: "Hash time-locked contract: a payment that can be claimed with a secret before a deadline, or refunded after it. Cross-chain swaps are built from them." },
    "testnet": { term: "Testnet", def: "A separate network for testing, where coins have no value and the chain can be reset. Anything that moves other people's coins should start there." },
    "mainnet": { term: "Mainnet", def: "The real BTX network, where coins have value. Testnet and regtest are for testing." },
    "bridge": { term: "Bridge", def: "A service that represents BTX on another chain, for example as wrapped BTX on Ethereum. The ones in the link list are designs or testnet only; bridges can lose funds." },
    "pull-request": { term: "Pull request", def: "A proposed change to files on GitHub. Anyone can send one; the project's maintainers review it before it is merged." },
    "checksum": { term: "Checksum (SHA-256)", def: "A fingerprint of a file. Compare it with the one on the release page to make sure your download is the file that was published." },
    "archive-node": { term: "Archive node", def: "A node that keeps every block (prune=0) and serves the whole chain to its peers." },
    "regtest": { term: "Regtest", def: "A private test chain that runs only on your own computer. Its coins have no value, so you can try things without risk. Anything that moves other people's coins starts on regtest or testnet." },
    "rpc": { term: "RPC", def: "Remote procedure call: a command that a program or btx-cli sends to a running btxd. SwapNet has no graphical trading panel: its 33 swap RPC methods, used from the RPC console, are the interface." },
    "ci": { term: "CI", def: "Continuous integration: builds and tests that run automatically, for example every night or for every proposed change, so mistakes show up early." },
    "commit": { term: "Commit", def: "One saved change in a code repository, named by a short code such as a5d1637f. A figure measured at a commit describes the code exactly as it was at that change." },
    "test-coverage": { term: "Test coverage", def: "The share of the code that the automatic tests actually run. Lines count the code lines reached; branches count the paths through each decision. Code that no test reaches can hide mistakes." },
    "fuzz-target": { term: "Fuzz target", def: "A small test program that feeds random or malformed input into one part of the code, often for hours, to find crashes. BTX has more than 270 of them." },
    "fuzz-box": { term: "Fuzz box", def: "A machine that runs BTX's fuzz targets day and night and keeps every input that reaches new code. Keep nothing else on it: no node, wallet, miner or keys." },
    "guix": { term: "Guix", def: "A tool that builds software in a fixed, repeatable environment. Independent builders who rebuild the same tagged release with it can compare hashes, so nobody has to trust a single build machine." },
    "lane": { term: "Lane", def: "One piece of work in the BTX developer hub, such as a code area or a bug class, with one owner and one second-pass reviewer. The lanes are listed on Ongoing work." },
    "second-pass": { term: "Second pass", def: "The second person on a lane, who reviews the owner's work before it goes upstream. It is never the owner. For a run lane, the second pass is an independent run on different hardware." },
    "done-bar": { term: "Done bar", def: "The measurable target that says when a lane's work is finished." }
  };

  /* ------------------------------------------------------------------------
     6.15 Toast
     ------------------------------------------------------------------------ */
  var toastEl = null;
  var toastTimer = 0;
  function makeToast() {
    if (toastEl) { return; }
    toastEl = el("div", "toast");
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    doc.body.appendChild(toastEl);
  }
  // A live region inserted already holding its text is often not announced, so init()
  // creates it empty at start-up; this call is only a fallback.
  function toast(message) {
    makeToast();
    toastEl.textContent = String(message);
    // Force a frame so the transition runs when the toast is reused.
    void toastEl.offsetWidth;
    toastEl.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove("is-on"); }, 4000);
  }

  /* ------------------------------------------------------------------------
     Live status (DESIGN 6.5), ported from the original community.js parseStatus().
     ------------------------------------------------------------------------ */
  var API = "https://network.btx-monitoring.com/api/v1/status.json";
  var STATUS_PAGE = "https://network.btx-monitoring.com/";
  var INTERVAL_MS = 60000;
  var MAX_HEIGHT = 100000000;
  var MAX_NODES = 1000000;
  var MAX_SECONDS = 365 * 86400;
  var MAX_SUPPLY = 21000000;
  var MAX_BYTES = 1e15;
  var MAX_ACTIVATIONS = 10;
  var BLOCK_SECONDS = 90;
  var ACTIVATION_NAME = /^[A-Za-z0-9_.-]{1,64}$/;
  var OVERALL = ["normal", "degraded", "incident"];
  var LEVELS = ["green", "yellow", "red", "unknown"];
  var RELEASE = /^v?[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/;
  var LOCALE = "en-GB";
  var WORDS = { normal: "Normal", degraded: "Degraded", incident: "Incident" };
  var SHAPES = { normal: "●", degraded: "▲", incident: "■" };
  var VERDICT_WORDS = { green: "OK", yellow: "Watch", red: "Problem", unknown: "Unknown" };
  var VERDICT_SHAPES = { green: "●", yellow: "▲", red: "■", unknown: "○" };

  function count(value, max) {
    return Number.isInteger(value) && value >= 0 && value < max ? value : null;
  }
  function between(value, min, max) {
    return typeof value === "number" && isFinite(value) && value >= min && value <= max ? value : null;
  }
  function plainVersion(text) {
    return text.replace(/^BTX:/, "").replace(/^v/, "");
  }
  function onRelease(census, release) {
    if (!Array.isArray(census) || census.length === 0 || release === null) { return null; }
    var total = 0;
    var current = 0;
    for (var i = 0; i < census.length; i += 1) {
      var row = census[i];
      var nodes = row ? count(row.nodes, MAX_NODES) : null;
      if (nodes === null || typeof row.version !== "string") { return null; }
      total += nodes;
      if (plainVersion(row.version) === plainVersion(release)) { current += nodes; }
    }
    return { count: current, total: total };
  }
  function activations(rows) {
    if (!Array.isArray(rows) || rows.length > MAX_ACTIVATIONS) { return null; }
    var result = [];
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      if (!row || typeof row.name !== "string" || !ACTIVATION_NAME.test(row.name)) { return null; }
      var height = count(row.height, MAX_HEIGHT);
      var remaining = count(row.remaining_blocks, MAX_HEIGHT);
      if (height === null || remaining === null || remaining === 0) { return null; }
      result.push({ name: row.name, height: height, remaining: remaining });
    }
    return result;
  }
  function metric(docu, id) {
    for (var i = 0; i < docu.metrics.length; i += 1) {
      var entry = docu.metrics[i];
      if (entry && entry.id === id) { return entry.value; }
    }
    return null;
  }
  function parseStatus(text) {
    var d;
    try { d = JSON.parse(text); } catch (e) { return null; }
    if (!d || d.schema_version !== 1 || !Array.isArray(d.metrics)) { return null; }
    if (OVERALL.indexOf(d.overall) === -1 || typeof d.stale !== "boolean") { return null; }
    var release = metric(d, "sw.latest_release");
    var verdicts = {};
    if (Array.isArray(d.verdicts)) {
      d.verdicts.forEach(function (v) {
        if (v && typeof v.id === "string" && LEVELS.indexOf(v.level) !== -1) { verdicts[v.id] = v.level; }
      });
    }
    var time = typeof d.data_as_of === "string" ? d.data_as_of : d.generated_at;
    var interval = metric(d, "chain.block_interval_avg_24h");
    var validRelease = typeof release === "string" && RELEASE.test(release) ? release : null;
    return {
      overall: d.overall,
      stale: d.stale,
      height: count(metric(d, "chain.height"), MAX_HEIGHT),
      tipAge: count(metric(d, "chain.tip_age"), MAX_SECONDS),
      release: validRelease,
      onRelease: onRelease(metric(d, "net.versions"), validRelease),
      interval: typeof interval === "number" && isFinite(interval) && interval >= 0 && interval < MAX_SECONDS ? interval : null,
      signers: count(metric(d, "attest.active_signers_100"), MAX_NODES),
      supply: between(metric(d, "econ.supply_mined"), 0, MAX_SUPPLY),
      supplyShare: between(metric(d, "econ.supply_pct_max"), 0, 100),
      reward: between(metric(d, "econ.block_reward"), 0, 1000),
      halving: count(metric(d, "econ.halving_countdown"), MAX_HEIGHT),
      tx: count(metric(d, "econ.tx_24h"), MAX_HEIGHT),
      size: between(metric(d, "chain.size_on_disk"), 0, MAX_BYTES),
      activations: activations(metric(d, "sw.upcoming_activation")),
      verdicts: verdicts,
      time: typeof time === "string" && !isNaN(Date.parse(time)) ? new Date(time) : null
    };
  }

  function num(value, digits) {
    return value.toLocaleString(LOCALE, { maximumFractionDigits: digits || 0 });
  }
  // "45 s", "1 min 30 s", "2 h 5 min", "3 d 4 h", as on the status page.
  function duration(seconds) {
    var total = Math.max(0, Math.round(seconds));
    if (total < 120) { return total + " s"; }
    if (total < 7200) {
      var secs = total % 60;
      return Math.floor(total / 60) + " min" + (secs ? " " + secs + " s" : "");
    }
    if (total < 172800) {
      var minutes = Math.floor((total % 3600) / 60);
      return Math.floor(total / 3600) + " h" + (minutes ? " " + minutes + " min" : "");
    }
    var hours = Math.floor((total % 86400) / 3600);
    return Math.floor(total / 86400) + " d" + (hours ? " " + hours + " h" : "");
  }
  // Time since the last block: "12 s ago", "1 min 12 s ago", "4 min ago" (over 3 min), "2 h 5 min ago".
  function ago(seconds) {
    var total = Math.max(0, Math.floor(seconds));
    if (total < 60) { return total + " s ago"; }
    if (total < 180) {
      var secs = total % 60;
      return Math.floor(total / 60) + " min" + (secs ? " " + secs + " s" : "") + " ago";
    }
    if (total < 7200) { return Math.floor(total / 60) + " min ago"; }
    return duration(total) + " ago";
  }
  function formatTime(date) {
    function two(n) { return (n < 10 ? "0" : "") + n; }
    return date.getUTCFullYear() + "-" + two(date.getUTCMonth() + 1) + "-" + two(date.getUTCDate()) +
      " " + two(date.getUTCHours()) + ":" + two(date.getUTCMinutes()) + " UTC";
  }

  // Seconds since the last block, as of now: tip_age (as of data_as_of) plus the time since data_as_of.
  function tipAgeNow(s) {
    if (!s || s.tipAge === null || !s.time) { return null; }
    return Math.max(0, s.tipAge + (Date.now() - s.time.getTime()) / 1000);
  }
  function unit(node, value, suffix) {
    return node && node.hasAttribute("data-template") ? value : value + suffix;
  }
  // Text for each [data-live] value; null shows a dash.
  var FORMAT = {
    "height": function (s) { return s.height === null ? null : num(s.height); },
    // Tip age as of now, not as of data_as_of: it keeps growing while the data is stale.
    "tip-age": function (s) {
      var age = tipAgeNow(s);
      return age === null ? null : ago(age);
    },
    "interval": function (s) { return s.interval === null ? null : duration(s.interval); },
    "release": function (s) { return s.release; },
    "on-release": function (s, node) {
      if (s.onRelease === null) { return null; }
      var tpl = node.getAttribute("data-template") || "{count} of {total}";
      return tpl.replace("{count}", num(s.onRelease.count)).replace("{total}", num(s.onRelease.total));
    },
    "signers": function (s) { return s.signers === null ? null : num(s.signers); },
    // With a data-template the template carries the unit ("{pct} % of 21 million"), so return the bare number.
    "supply": function (s, node) { return s.supply === null ? null : unit(node, num(Math.round(s.supply)), " BTX"); },
    "supply-share": function (s, node) { return s.supplyShare === null ? null : unit(node, num(s.supplyShare, 1), "%"); },
    "reward": function (s, node) { return s.reward === null ? null : unit(node, num(s.reward, 8), " BTX"); },
    "halving": function (s) { return s.halving === null ? null : num(s.halving); },
    "halving-time": function (s) { return s.halving === null ? null : duration(s.halving * BLOCK_SECONDS); },
    "tx": function (s) { return s.tx === null ? null : num(s.tx); },
    "size": function (s, node) { return s.size === null ? null : unit(node, num(s.size / 1e9, 1), " GB"); }
  };
  var TEXT_ONLY = ["overall", "time", "stale", "fork", "fork-rows"];

  function shapeWord(node, shape, word, prefix) {
    node.textContent = "";
    var sh = el("span", "shape", shape);
    sh.setAttribute("aria-hidden", "true");
    node.appendChild(sh);
    node.appendChild(doc.createTextNode((prefix || "") + word));
  }

  /* Block height: a very fast count-up from 0 on first load (about 600 ms), from the old
     value to the new one on a new block (about 400 ms) with a short highlight on the row.
     Tabular numerals and a fixed min-width keep the width steady while it counts. */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function setHeight(node, height) {
    var sr = node.querySelector(":scope > .sr-only");
    var vis = node.querySelector(":scope > .board__num");
    if (!sr || !vis) {
      node.textContent = "";
      sr = el("span", "sr-only");
      vis = el("span", "board__num");
      vis.setAttribute("aria-hidden", "true");
      node.appendChild(sr);
      node.appendChild(vis);
    }
    var prev = typeof node._h === "number" ? node._h : null;
    node._h = height;
    if (height === null) {
      node._anim = (node._anim || 0) + 1;
      sr.textContent = "not available";
      vis.textContent = "—";
      vis.style.minWidth = "";
      return;
    }
    var final = num(height);
    sr.textContent = final;
    if (prev === height) { return; }
    var from = prev === null ? 0 : prev;
    var row = node.closest(".board__row");
    if (prev !== null && height > prev && row && !motionOff()) {
      row.classList.remove("is-new");
      void row.offsetWidth;
      row.classList.add("is-new");
    }
    var still = motionOff() || doc.hidden || typeof window.requestAnimationFrame !== "function" || (prev !== null && height < prev);
    vis.style.minWidth = "";
    vis.textContent = final;
    if (still) { return; }
    vis.style.minWidth = vis.getBoundingClientRect().width + "px";
    var ms = prev === null ? 600 : 400;
    var token = node._anim = (node._anim || 0) + 1;
    var start = 0;
    function frame(now) {
      if (node._anim !== token) { return; }
      if (!start) { start = now; }
      var t = Math.min(1, (now - start) / ms);
      vis.textContent = num(Math.round(from + (height - from) * easeOut(t)));
      if (t < 1) { window.requestAnimationFrame(frame); } else { vis.textContent = final; }
    }
    vis.textContent = num(from);
    window.requestAnimationFrame(frame);
    // If frames are throttled (background tab), the final value still lands.
    window.setTimeout(function () { if (node._anim === token) { node._anim += 1; vis.textContent = final; } }, ms + 400);
  }

  /* "Last block" and the 90 s burn bar, updated every second from the data's own clock.
     With no data (no answer yet, a failed load, or a missing tip age or data time) the bar stays
     in place, empty, and both texts show a dash: the board never changes height. */
  var REFILL_MS = 300;
  function tickBoard(board, s, fromTicker) {
    if (board._paused) { return; }
    var age = tipAgeNow(s);
    var tip = board.querySelector('[data-live="tip-age"]');
    if (tip) { tip.textContent = age === null ? "—" : ago(age); }
    var burn = board.querySelector("[data-burn]");
    if (!burn) { return; }
    burn.hidden = false;
    var note = burn.querySelector("[data-burn-left]");
    var fill = burn.querySelector(".burn__fill");
    var rail = burn.querySelector(".burn__rail");
    if (age === null) {
      if (note) { note.textContent = "—"; }
      burn.classList.remove("is-refill");
      board._burnF = undefined;
      if (fill) { fill.style.transform = "scaleX(0)"; }
      if (rail) { rail.style.transform = "translateX(-100%)"; }
      return;
    }
    var left = BLOCK_SECONDS - age;
    if (note) { note.textContent = left > 0 ? "about " + Math.ceil(left) + " s to go" : "Taking longer than average"; }
    var now = Date.now();
    // Let a quick refill finish: a tick inside its 300 ms must not turn it back into a 1 s move.
    if (now < (board._refillUntil || 0)) { return; }
    // Under reduced motion the bar moves in 10 s steps without a transition.
    if (fromTicker && motionOff() && board._burnAt && now - board._burnAt < 9500) { return; }
    board._burnAt = now;
    var f = Math.max(0, Math.min(1, left / BLOCK_SECONDS));
    // The first data and every new block refill the bar quickly.
    var refill = typeof board._burnF !== "number" || f > board._burnF + 0.02;
    if (refill) { board._refillUntil = now + REFILL_MS; }
    burn.classList.toggle("is-refill", refill);
    board._burnF = f;
    if (fill) { fill.style.transform = "scaleX(" + f.toFixed(4) + ")"; }
    if (rail) { rail.style.transform = "translateX(" + ((f - 1) * 100).toFixed(2) + "%)"; }
  }
  var ticker = 0;
  // The 1 s ticker runs only while a board is on screen and the tab is visible.
  var boardsSeen = null;
  function watchBoards() {
    if (boardsSeen || typeof IntersectionObserver !== "function") { return; }
    boardsSeen = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          boardsSeen.add(e.target);
          if (lastGood && !doc.hidden) { tickBoard(e.target, lastGood, false); }
        } else { boardsSeen.delete(e.target); }
      });
      runTicker();
    });
    $all("[data-board]").forEach(function (b) { io.observe(b); });
  }
  function runTicker() {
    watchBoards();
    var onScreen = boardsSeen ? boardsSeen.size > 0 : !!doc.querySelector("[data-board]");
    var want = !doc.hidden && lastGood && onScreen;
    if (want && !ticker) {
      ticker = window.setInterval(function () {
        if (doc.hidden || !lastGood) { return; }
        $all("[data-board]").forEach(function (b) { if (!boardsSeen || boardsSeen.has(b)) { tickBoard(b, lastGood, true); } });
      }, 1000);
    } else if (!want && ticker) {
      window.clearInterval(ticker);
      ticker = 0;
    }
  }

  function applyBoard(board, s, failed, speaks) {
    if (speaks) { announce(board, s, failed); }
    // A paused board keeps the values it shows; resuming paints the newest data.
    if (board._paused) { return; }
    var overall = board.querySelector('[data-live="overall"]');
    if (overall && s && !s.stale) {
      OVERALL.forEach(function (n) { overall.classList.toggle("is-" + n, n === s.overall); });
      overall.classList.remove("is-unknown");
      shapeWord(overall, SHAPES[s.overall], WORDS[s.overall]);
    } else if (overall && (failed || (s && s.stale))) {
      // Never a shape without a word, and never an old status as current: no answer yet, a failed load
      // and stale data all read "No data", as the header pill does. The values stay, under the stale message.
      OVERALL.forEach(function (n) { overall.classList.remove("is-" + n); });
      overall.classList.add("is-unknown");
      shapeWord(overall, "○", "No data");
    }
    var time = board.querySelector('[data-live="time"]');
    if (time && s) {
      var t = s.time ? formatTime(s.time) : "—";
      var tpl = time.getAttribute("data-template");
      time.textContent = tpl && s.time ? tpl.replace("{time}", t) : t;
    }
    var stale = board.querySelector('[data-live="stale"]');
    if (stale) { stale.hidden = !(failed || (s && s.stale)); }
    if (!s) { return; }

    $all("[data-live]", board).forEach(function (node) {
      var key = node.getAttribute("data-live");
      if (TEXT_ONLY.indexOf(key) !== -1 || !FORMAT[key]) { return; }
      if (key === "height") { setHeight(node, s.height); return; }
      var text = FORMAT[key](s, node);
      var tpl = node.getAttribute("data-template");
      if (text !== null && tpl && key !== "on-release") { text = tpl.replace(/\{[a-z]+\}/, text); }
      node.textContent = text === null ? "—" : text;
    });
    tickBoard(board, s, false);

    $all("[data-verdict]", board).forEach(function (item) {
      var level = s.verdicts[item.getAttribute("data-verdict")] || "unknown";
      var target = item.querySelector("[data-verdict-label]") || item;
      LEVELS.forEach(function (n) { target.classList.toggle("lvl-" + n, n === level); });
      target.classList.add("lvl");
      shapeWord(target, VERDICT_SHAPES[level], VERDICT_WORDS[level]);
    });

    var fork = board.querySelector('[data-live="fork"]');
    var rows = board.querySelector('[data-live="fork-rows"]');
    if (fork && rows && s.activations !== null) {
      rows.textContent = "";
      var ftpl = fork.getAttribute("data-template") || "{name}: block {height}, {remaining} blocks to go (about {time})";
      s.activations.forEach(function (a) {
        rows.appendChild(el("li", "", ftpl.replace("{name}", a.name).replace("{height}", num(a.height))
          .replace("{remaining}", num(a.remaining)).replace("{time}", duration(a.remaining * BLOCK_SECONDS))));
      });
      fork.hidden = s.activations.length === 0;
    }
  }

  // One polite line for the page (first board only). It speaks only when the overall status
  // changes or live data fails (a failed load or stale data) or recovers, at most once a minute.
  // The first answer is not announced, and block heights and the per-second age never are.
  function announce(board, s, failed) {
    var live = board._live;
    if (!live) {
      live = el("p", "sr-only");
      live.setAttribute("aria-live", "polite");
      board.appendChild(live);
      board._live = live;
    }
    var bad = failed || !s || s.stale;
    var key = bad ? "failed" : s.overall;
    var now = Date.now();
    // The first answer is remembered but not spoken, and does not start the one-minute limit: polls are
    // 60 s apart from the start of each fetch, so a change at the next poll must not miss the limit by
    // a few milliseconds of network time. The 5 s margin keeps it to about once a minute.
    if (board._said === undefined) {
      board._said = key;
      board._saidAt = 0;
    } else if (board._said !== key && now - board._saidAt >= INTERVAL_MS - 5000) {
      board._said = key;
      board._saidAt = now;
      live.textContent = bad ? "Live network data could not be loaded or is out of date." : "Network status: " + WORDS[s.overall] + ".";
    }
  }

  function applyPill(pill, s) {
    var word = s ? WORDS[s.overall] : "No data";
    var level = s ? s.overall : "unknown";
    ["normal", "degraded", "incident", "unknown"].forEach(function (n) { pill.classList.toggle("pill--" + n, n === level); });
    pill.textContent = "";
    pill.appendChild(el("span", "sr-only", "Network status: "));
    var sh = el("span", "pill__shape", s ? SHAPES[s.overall] : "○");
    sh.setAttribute("aria-hidden", "true");
    pill.appendChild(sh);
    pill.appendChild(el("span", "pill__word", word));
  }

  var statusPromise = null;
  var lastFetch = 0;
  function fetchStatus() {
    lastFetch = Date.now();
    if (typeof fetch !== "function") { return Promise.resolve(null); }
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? window.setTimeout(function () { ctrl.abort(); }, 15000) : 0;
    return fetch(API, { cache: "no-store", credentials: "omit", signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (text) { window.clearTimeout(timer); return parseStatus(text); })
      .catch(function () { window.clearTimeout(timer); return null; });
  }
  function status() {
    if (!statusPromise) { statusPromise = fetchStatus(); }
    return statusPromise;
  }
  var lastGood = null;
  var lastFailed = false;
  function paint(s) {
    if (s) { lastGood = s; }
    lastFailed = !s;
    // The pill reads "○ No data" whenever the board says the data could not be loaded or is out of date:
    // inner pages have no board, so the pill must never show an old status as current.
    $all("[data-status-pill]").forEach(function (p) { applyPill(p, s && !s.stale ? s : null); });
    $all("[data-board]").forEach(function (b, i) { applyBoard(b, s || lastGood, !s, i === 0); });
    runTicker();
  }
  // Only the newest request may paint, so a late failure or an older answer never
  // replaces a newer one.
  var seq = 0;
  function refresh() {
    var mine = ++seq;
    statusPromise = fetchStatus();
    statusPromise.then(function (s) { if (mine === seq) { paint(s); } });
  }
  function initStatus() {
    if (!doc.querySelector("[data-status-pill], [data-board]")) { return; }
    var first = ++seq;
    status().then(function (s) { if (first === seq) { paint(s); } });
    // Check every 5 s and let the guard keep one request a minute, so a refresh on returning to the tab
    // never pushes the next poll out to nearly two minutes.
    window.setInterval(function () {
      if (!doc.hidden && Date.now() - lastFetch >= INTERVAL_MS - 1000) { refresh(); }
    }, 5000);
    doc.addEventListener("visibilitychange", function () {
      runTicker();
      if (doc.hidden) { return; }
      if (lastGood) { $all("[data-board]").forEach(function (b) { tickBoard(b, lastGood, false); }); }
      if (Date.now() - lastFetch >= INTERVAL_MS) { refresh(); }
    });
  }

  /* Pause live updates (a toggle per board, aria-pressed). While paused the board keeps the values
     it shows: the burn bar, the per-second "Last block" text and the polled values all stand still.
     Polling continues in the background (the header pill and the status announcement stay current),
     and resuming paints the newest data at once. */
  function initPause() {
    $all("[data-board-pause]").forEach(function (btn) {
      var board = btn.closest("[data-board]");
      if (!board) { return; }
      btn.addEventListener("click", function () {
        var paused = btn.getAttribute("aria-pressed") !== "true";
        btn.setAttribute("aria-pressed", paused ? "true" : "false");
        board.classList.toggle("is-paused", paused);
        var note = board.querySelector("[data-burn-left]");
        if (paused) {
          board._paused = true;
          if (note) { note.textContent = "Updates paused"; }
          return;
        }
        board._paused = false;
        board._burnF = undefined; // the bar catches up with one quick refill
        // With no answer yet, or a failed first load, this writes "○ No data" and shows the stale message;
        // with no answer yet and no failure it changes nothing.
        applyBoard(board, lastGood, lastFailed, false);
        if (!lastGood && note) { note.textContent = "—"; }
      });
    });
  }

  /* ------------------------------------------------------------------------
     6.1 Mobile menu and language menu
     ------------------------------------------------------------------------ */
  function initMenu() {
    $all("[data-menu-toggle]").forEach(function (btn) {
      var panel = doc.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) { return; }
      function set(open, focusBack) {
        panel.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        if (!open && focusBack) { btn.focus(); }
      }
      btn.addEventListener("click", function () { set(btn.getAttribute("aria-expanded") !== "true"); });
      doc.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") { set(false, true); }
      });
      panel.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest("a")) { set(false); }
      });
      // The panel lies over the page: close it when focus leaves it, so it never hides the focused element.
      panel.addEventListener("focusout", function (e) {
        var to = e.relatedTarget;
        if (btn.getAttribute("aria-expanded") === "true" && to && !panel.contains(to) && to !== btn) { set(false); }
      });
      doc.addEventListener("click", function (e) {
        if (btn.getAttribute("aria-expanded") === "true" && !panel.contains(e.target) && !btn.contains(e.target)) { set(false); }
      });
      if (window.matchMedia) {
        var wide = window.matchMedia("(min-width: 960px)");
        var onWide = function () { if (wide.matches) { set(false); } };
        if (wide.addEventListener) { wide.addEventListener("change", onWide); }
      }
    });
    // Language menus: Esc and a click elsewhere close them.
    var langs = $all("details.lang");
    langs.forEach(function (d) {
      d.addEventListener("focusout", function (e) {
        if (d.open && e.relatedTarget && !d.contains(e.relatedTarget)) { d.open = false; }
      });
    });
    doc.addEventListener("click", function (e) {
      langs.forEach(function (d) { if (d.open && !d.contains(e.target)) { d.open = false; } });
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") { return; }
      langs.forEach(function (d) {
        if (d.open) { d.open = false; var s = d.querySelector("summary"); if (s) { s.focus(); } }
      });
    });
  }

  /* ------------------------------------------------------------------------
     6.3 Route progress, 6.16 section rules, 6.4 route map
     ------------------------------------------------------------------------ */
  function initRoutes() {
    var routes = $all(".route");
    if (!routes.length) { return; }
    function measure() {
      routes.forEach(function (r) {
        var stops = r.querySelectorAll(":scope > .stop");
        var last = stops[stops.length - 1];
        if (last && r.offsetParent !== null) {
          r._len = Math.max(0, last.offsetTop);
          r.style.setProperty("--line-len", r._len + "px");
        }
      });
    }
    var queued = false;
    function progress() {
      queued = false;
      if (motionOff()) { return; }
      var vh = window.innerHeight || 800;
      routes.forEach(function (r) {
        if (r.offsetParent === null) { return; }
        var rect = r.getBoundingClientRect();
        // Normalised by the line length, so the fill reaches stop k when its top crosses 65%,
        // the same moment the observer below fills that stop's dot.
        var p = (vh * 0.65 - rect.top) / Math.max(1, r._len || rect.height);
        p = Math.min(1, Math.max(0, p));
        r.style.setProperty("--progress", p.toFixed(3));
      });
    }
    function queue() {
      if (!queued) { queued = true; window.requestAnimationFrame(progress); }
    }
    measure();
    progress();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", function () { measure(); queue(); }, { passive: true });
    $all("details").forEach(function (d) {
      d.addEventListener("toggle", function () { measure(); queue(); });
    });
    if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(function () { measure(); queue(); }); }

    var stops = $all(".route > .stop");
    if (motionOff() || typeof IntersectionObserver !== "function") {
      stops.forEach(function (s) { s.classList.add("is-reached"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting || en.boundingClientRect.bottom < 0) {
          en.target.classList.add("is-reached");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -35% 0px" });
    stops.forEach(function (s) { io.observe(s); });
  }

  // 6.16 Section rules draw in once (700 ms scaleX) when they first come into view. There is no
  // other reveal: content is visible from the first paint.
  function initSecRules() {
    var rules = $all(".sec-rule");
    if (!rules.length) { return; }
    if (motionOff() || typeof IntersectionObserver !== "function") {
      rules.forEach(function (r) { r.classList.add("is-drawn"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting || en.boundingClientRect.bottom < 0) {
          en.target.classList.add("is-drawn");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    rules.forEach(function (r) { io.observe(r); });
  }

  // Lines draw in (1200 ms, 150 ms stagger), then one dot per line makes a single pass and the
  // map stops: everything ends within about 4.5 s (WCAG 2.2.2). Dots start clear of the
  // interchange and the person, and stop short of the terminus.
  function initRouteMap() {
    $all(".routemap").forEach(function (map) {
      var svg = map.querySelector("svg");
      if (!svg) { return; }
      if (motionOff() || typeof IntersectionObserver !== "function" || typeof window.requestAnimationFrame !== "function") {
        map.classList.add("is-drawn");
        return;
      }
      var START = 20;     // SVG units from the interchange centre (hub r 9 + stroke + dot r 5)
      var END = 22;       // SVG units before the terminus centre (terminus r 14 + dot r 5)
      var DRAWN = 1700;   // ms until the last line has drawn
      var TRAVEL = 2000;  // ms for one pass
      var STAGGER = 150;
      var SETTLED = 2400; // ms until the last stop has popped in (latest --d 1920 ms + 250 ms)
      var dots = [];
      function makeDots() {
        dots = $all(".rm-line", svg).map(function (line, i) {
          var kind = (line.getAttribute("class").match(/rm-line--([smnb])/) || [])[1] || "s";
          var len = 0;
          try { len = line.getTotalLength(); } catch (e) { len = 0; }
          if (len < START + END + 10) { return null; }
          var dot = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.setAttribute("r", "5");
          dot.setAttribute("class", "rm-dot rm-dot--" + kind);
          var p = line.getPointAtLength(START);
          dot.setAttribute("transform", "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")");
          svg.appendChild(dot);
          return { line: line, dot: dot, len: len, delay: i * STAGGER };
        }).filter(Boolean);
      }
      function done() {
        dots.forEach(function (d) { if (d.dot.parentNode) { d.dot.parentNode.removeChild(d.dot); } });
        dots = [];
      }
      function pass() {
        if (doc.hidden || motionOff()) { return; }
        makeDots();
        var t0 = 0;
        var total = TRAVEL + STAGGER * Math.max(0, dots.length - 1);
        function frame(now) {
          if (!t0) { t0 = now; }
          var el2 = now - t0;
          dots.forEach(function (d) {
            var t = Math.min(1, Math.max(0, (el2 - d.delay) / TRAVEL));
            var p = d.line.getPointAtLength(START + t * (d.len - START - END));
            d.dot.setAttribute("transform", "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")");
            var edge = Math.min(t, 1 - t) * TRAVEL;
            d.dot.style.opacity = t <= 0 || t >= 1 ? "0" : String(Math.min(1, edge / 250));
          });
          if (el2 < total && !doc.hidden) { window.requestAnimationFrame(frame); } else { done(); }
        }
        window.requestAnimationFrame(frame);
        // Throttled frames (background tab) must not leave a dot behind.
        window.setTimeout(done, total + 600);
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !map.classList.contains("is-drawn")) {
            map.classList.add("is-drawn");
            io.disconnect();
            window.setTimeout(pass, DRAWN);
            // Snap to the final state once the draw is over, so throttled or paused transitions
            // (background tab, headless capture) never leave a half-drawn map.
            window.setTimeout(function () { map.classList.add("is-done"); }, SETTLED);
          }
        });
      });
      io.observe(map);
    });
  }

  /* ------------------------------------------------------------------------
     6.6 Checklist persistence
     ------------------------------------------------------------------------ */
  function initChecklists() {
    $all(".checklist[data-checklist-id]").forEach(function (list) {
      // One broken list (for example odd data in storage) must not stop the others.
      safe(function () { setupChecklist(list); }, "checklist " + list.getAttribute("data-checklist-id"));
    });
  }
  function setupChecklist(list) {
    var id = list.getAttribute("data-checklist-id");
    var key = "btx-checks:" + window.location.pathname + ":" + id;
    var boxes = $all('input[type="checkbox"]', list);
    var counters = $all('[data-checklist-count="' + id + '"]');
    // A folded sign shows the progress in its closed summary too ("3 of 7 checked"), else "7 checks".
    var summaries = $all('[data-checklist-summary="' + id + '"]');
    var clears = $all('[data-checklist-clear="' + id + '"]');
    var saved = [];
    try { saved = JSON.parse(storeGet(key) || "[]") || []; } catch (e) { saved = []; }
    if (!Array.isArray(saved)) { saved = []; }
    boxes.forEach(function (b, i) {
      if (!b.id) { b.id = id + "-" + (i + 1); }
      if (saved.indexOf(b.id) !== -1) { b.checked = true; }
    });
    function update(save) {
      var ticked = boxes.filter(function (b) { return b.checked; });
      counters.forEach(function (c) { c.textContent = ticked.length + " of " + boxes.length + " checked"; });
      summaries.forEach(function (c) { c.textContent = ticked.length ? ticked.length + " of " + boxes.length + " checked" : boxes.length + " checks"; });
      clears.forEach(function (c) { c.disabled = ticked.length === 0; });
      if (save) { storeSet(key, ticked.length ? JSON.stringify(ticked.map(function (b) { return b.id; })) : null); }
    }
    boxes.forEach(function (b) { b.addEventListener("change", function () { update(true); }); });
    clears.forEach(function (c) {
      c.addEventListener("click", function () {
        boxes.forEach(function (b) { b.checked = false; });
        update(true);
        if (boxes[0]) { boxes[0].focus(); }
      });
    });
    $all('[data-checklist-bar="' + id + '"]').forEach(function (bar) { bar.hidden = false; });
    update(false);
  }

  /* ------------------------------------------------------------------------
     6.11 Term popovers
     ------------------------------------------------------------------------ */
  var openTerm = null;
  function placePop(btn, pop) {
    var r = btn.getBoundingClientRect();
    var vw = doc.documentElement.clientWidth || window.innerWidth;
    var vh = window.innerHeight;
    var w = pop.offsetWidth;
    var h = pop.offsetHeight;
    var left = Math.min(Math.max(8, r.left), Math.max(8, vw - w - 8));
    var top = r.bottom + 8;
    if (top + h > vh - 8 && r.top - h - 8 > 8) { top = r.top - h - 8; }
    pop.style.left = Math.round(left) + "px";
    pop.style.top = Math.round(top) + "px";
  }
  function closeTerm(focusBack) {
    if (!openTerm) { return; }
    var t = openTerm;
    openTerm = null;
    t.pop.hidden = true;
    t.btn.setAttribute("aria-expanded", "false");
    if (focusBack) { t.btn.focus(); }
  }
  // Terms ship as <span class="term" data-term="…"> so that without JS they are plain words, not 34 dead
  // tab stops. Each one with a glossary entry becomes a real button here.
  function termButton(node) {
    if (node.tagName === "BUTTON") { return node; }
    var btn = el("button", node.className);
    btn.type = "button";
    btn.setAttribute("data-term", node.getAttribute("data-term"));
    while (node.firstChild) { btn.appendChild(node.firstChild); }
    node.parentNode.replaceChild(btn, node);
    return btn;
  }
  // A button is an atomic inline, so a line may break between it and a full stop after it. Wrap the
  // term, its popover and that punctuation (or "'s") in one no-wrap span.
  var TERM_TAIL = /^[.,;:!?)’”']+(s\b)?/;
  function keepTail(btn, pop) {
    var nx = pop.nextSibling;
    var m = nx && nx.nodeType === 3 && nx.data.match(TERM_TAIL);
    if (!m) { return; }
    var keep = el("span", "term-keep");
    btn.parentNode.insertBefore(keep, btn);
    keep.appendChild(btn);
    keep.appendChild(pop);
    keep.appendChild(doc.createTextNode(m[0]));
    nx.data = nx.data.slice(m[0].length);
  }
  function initTerms() {
    var n = 0;
    $all(".term[data-term]").forEach(function (node) {
      var entry = glossary[node.getAttribute("data-term")];
      // No entry yet: the word stays plain text and must not look like a control.
      if (!entry) { node.classList.add("term--plain"); return; }
      var btn = termButton(node);
      n += 1;
      var pop = el("span", "term-pop");
      pop.id = "term-pop-" + n;
      pop.hidden = true;
      pop.setAttribute("role", "group");
      pop.setAttribute("aria-label", entry.term);
      pop.appendChild(el("span", "term-pop__name", entry.term));
      pop.appendChild(el("span", "", entry.def + " "));
      var more = el("a", "term-pop__more", "In the glossary ");
      var arr = el("span", "", "→");
      arr.setAttribute("aria-hidden", "true");
      more.appendChild(arr);
      more.href = "/new/design04/learn/#word-" + node.getAttribute("data-term");
      pop.appendChild(more);
      btn.insertAdjacentElement("afterend", pop);
      keepTail(btn, pop);
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", pop.id);
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (openTerm && openTerm.btn === btn) { closeTerm(false); return; }
        closeTerm(false);
        pop.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        openTerm = { btn: btn, pop: pop };
        placePop(btn, pop);
      });
      // Close when focus moves on, so the popover never covers the next focused element.
      function leave(e) {
        var to = e.relatedTarget;
        if (openTerm && openTerm.btn === btn && to && to !== btn && !pop.contains(to)) { closeTerm(false); }
      }
      btn.addEventListener("focusout", leave);
      pop.addEventListener("focusout", leave);
    });
    if (!n) { return; }
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && openTerm) { closeTerm(true); }
    });
    doc.addEventListener("click", function (e) {
      if (openTerm && !openTerm.pop.contains(e.target) && e.target !== openTerm.btn) { closeTerm(false); }
    });
    var queued = false;
    function reposition() {
      queued = false;
      if (openTerm) { placePop(openTerm.btn, openTerm.pop); }
    }
    function queue() { if (openTerm && !queued) { queued = true; window.requestAnimationFrame(reposition); } }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue, { passive: true });
  }

  /* ------------------------------------------------------------------------
     6.12 Copy for your AI · 6.13 code copy buttons
     ------------------------------------------------------------------------ */
  var BLOCK = /^(P|LI|H[1-6]|DT|DD|SUMMARY|DIV|SECTION|ARTICLE|HEADER|FOOTER|TR|PRE|BLOCKQUOTE|UL|OL|DL|TABLE|FIGCAPTION|ASIDE|DETAILS|NAV)$/;
  function startsWithBlock(li) {
    for (var c = li.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { if (/\S/.test(c.nodeValue)) { return false; } continue; }
      if (c.nodeType !== 1) { continue; }
      if (c.getAttribute("aria-hidden") === "true" || c.hasAttribute("data-copy-skip")) { continue; }
      return BLOCK.test(c.tagName);
    }
    return false;
  }
  // The copy never includes its own copy UI or the page's wayfinding (DESIGN 6.12): elements marked
  // data-copy-skip, the copy buttons and their promise line, the breadcrumb, the line badges, the
  // "On this page" chips, the developer sub-navigation, no-JavaScript hints and checklist counters.
  // The station markup also carries data-copy-skip; this list is the safety net for a page that
  // forgets it.
  var COPY_SKIP = "[data-copy-skip], [data-copy-ai-only], [data-nojs-only], .checklist__bar, .crumbs, .station__badges, .station .chips, .subnav";
  function pageText(node) {
    var out = [];
    function walk(n) {
      // Source line breaks inside running text are only spaces; a <pre> keeps its own.
      if (n.nodeType === 3) { out.push(n.parentElement && n.parentElement.closest("pre") ? n.nodeValue : n.nodeValue.replace(/\s+/g, " ")); return; }
      if (n.nodeType !== 1) { return; }
      var tag = n.tagName;
      // A skipped element still separates the words around it.
      if (/^(SCRIPT|STYLE|SVG|BUTTON|INPUT|TEMPLATE|NOSCRIPT)$/i.test(tag) && !n.classList.contains("term")) { out.push(" "); return; }
      if (n.getAttribute("aria-hidden") === "true" || n.matches(COPY_SKIP)) { out.push(" "); return; }
      // A popover sits right after its term: skip it without a space ("btxd's", not "btxd 's").
      if (n.classList.contains("term-pop")) { return; }
      // Visually hidden text is skipped, except live values and inside headings ("Next: 2027").
      if (n.classList.contains("sr-only") && !n.parentElement.hasAttribute("data-live") && !/^H[1-6]$/.test(n.parentElement.tagName)) { out.push(" "); return; }
      if (n.hidden && !n.closest("details")) { out.push(" "); return; }
      var block = BLOCK.test(tag);
      if (block) { out.push("\n"); }
      if (/^H[1-6]$/.test(tag)) { out.push("#".repeat(Number(tag.charAt(1))) + " "); }
      // A list marker only goes before inline text. An item that opens with a block (a route card's
      // <details>, a roadmap stop's heading) gets none, so the copy has no empty "-" lines.
      if (tag === "LI" && !startsWithBlock(n)) { out.push("- "); }
      toArray(n.childNodes).forEach(walk);
      if (tag === "A") {
        var href = n.getAttribute("href") || "";
        if (href && href.charAt(0) !== "#") { out.push(" (" + n.href + ")"); }
      }
      if (tag === "TD" || tag === "TH") { out.push(" | "); }
      // Tags sit side by side with no space in the markup ("Community", "Open source").
      if (n.classList.contains("tag")) { out.push(" "); }
      if (block) { out.push("\n"); }
    }
    walk(node);
    return out.join("").replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  function copyText(text, onDone) {
    function fallback() {
      var prev = doc.activeElement;
      // Fixed at the top left so focusing it does not scroll the page (not .sr-only: its
      // position: absolute !important would win over the inline position).
      var ta = el("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;";
      doc.body.appendChild(ta);
      try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); }
      ta.select();
      var ok = false;
      try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
      doc.body.removeChild(ta);
      if (prev && prev.focus) { try { prev.focus({ preventScroll: true }); } catch (e) { prev.focus(); } }
      onDone(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
      navigator.clipboard.writeText(text).then(function () { onDone(true); }, fallback);
    } else {
      fallback();
    }
  }
  // The instruction that heads every "Copy for your AI" text (DESIGN 6.12). The home page shows it
  // in its "What gets copied" panel ([data-ai-preview]), filled from here so the two never differ.
  function aiHead(url) {
    return "I'm reading this page from the BTX community site: " + url + "\n" +
      "Explain it to me in plain language. Tell me what I should check before I act on it, and say clearly when you are not sure.\n" +
      "Never ask me for my seed phrase or private keys.";
  }
  function pageUrl() { return (doc.querySelector('link[rel="canonical"]') || {}).href || window.location.href; }
  // About 20,000 characters (about 5,000 tokens): the whole home page and every inner page except the
  // longest reference page, which raises its own cap with data-copy-max on its button (ceiling 60,000).
  var COPY_MAX = 20000;
  var COPY_CEILING = 60000;
  var copyStatus = null;
  function initCopy() {
    $all("[data-ai-preview]").forEach(function (n) { n.textContent = aiHead(pageUrl()); });
    // A button's changed name is not reliably spoken, so code copies also report in a status line.
    if (doc.querySelector(".code [data-copy]")) {
      copyStatus = el("p", "sr-only");
      copyStatus.setAttribute("role", "status");
      doc.body.appendChild(copyStatus);
    }
    $all("[data-copy-ai]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var main = doc.getElementById("main") || doc.body;
        var body = pageText(main);
        // A button may raise the cap (data-copy-max), never lower it, up to the ceiling.
        var max = Math.min(Math.max(Number(btn.getAttribute("data-copy-max")) || COPY_MAX, COPY_MAX), COPY_CEILING);
        if (body.length > max) {
          var cut = body.lastIndexOf("\n", max);
          body = body.slice(0, cut > max - 2000 ? cut : max) + "\n[...]";
        }
        // An example-question chip adds its question right after the instruction.
        var q = btn.getAttribute("data-ai-question");
        var text = aiHead(pageUrl()) + (q ? "\n\nMy question: " + q : "") + "\n\n" + body;
        copyText(text, function (ok) {
          toast(ok ? "Copied. Paste it into Claude or ChatGPT. Never paste your seed phrase or private keys into any AI tool."
            : "Your browser blocked copying. Select the page text and copy it yourself.");
        });
      });
    });
    $all(".code [data-copy]").forEach(function (btn) {
      var label = btn.querySelector("span") || btn;
      btn.addEventListener("click", function () {
        var block = btn.closest(".code");
        var given = btn.getAttribute("data-copy");
        var pre = block ? block.querySelector("pre") : null;
        var text = given || (pre ? pre.textContent : "");
        copyText(text.replace(/\n$/, ""), function (ok) {
          if (!ok) { toast("Your browser blocked copying. Select the text and copy it yourself."); return; }
          function swap(word) { label.textContent = word; }
          swap("Copied");
          if (copyStatus) { copyStatus.textContent = "Copied to clipboard"; }
          window.clearTimeout(btn._t);
          btn._t = window.setTimeout(function () {
            swap("Copy");
            if (copyStatus) { copyStatus.textContent = ""; }
          }, 2000);
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     Disclosures: a link to a folded block (/#before-buying, /#miners) opens it.
     ------------------------------------------------------------------------ */
  function openFor(id) {
    if (!id) { return false; }
    var target = null;
    try { target = doc.getElementById(decodeURIComponent(id)); } catch (e) { target = null; }
    if (!target) { return false; }
    var opened = false;
    // A link to a section opens its own folded sign (/#check opens #before-buying). Only .sign--fold, so
    // a link to #start does not open every route card.
    var own = target.tagName === "DETAILS" ? null : target.querySelector("details.sign--fold");
    if (own && !own.open) { own.open = true; opened = true; }
    var node = target;
    while (node && node !== doc.body) {
      if (node.tagName === "DETAILS" && !node.open) { node.open = true; opened = true; }
      node = node.parentElement;
    }
    return opened;
  }
  function initDisclosures() {
    var hash = window.location.hash.slice(1);
    if (hash) {
      if (openFor(hash)) {
        var t = doc.getElementById(hash);
        if (t) { t.scrollIntoView(); }
      }
    } else if (window.matchMedia && window.matchMedia("(min-width: 960px)").matches) {
      $all("details[data-open-wide]").forEach(function (d) { d.open = true; });
    }
    window.addEventListener("hashchange", function () { openFor(window.location.hash.slice(1)); });
    // While the home roadmap is pinned (DESIGN 6.18), "More detail" opens as a floating panel: Esc closes
    // it and returns focus to its summary, and a click elsewhere closes it. In the sideways scroller it
    // opens in place and stays open, so only panels that actually float count.
    var floating = window.matchMedia ? window.matchMedia("(min-width: 900px)") : null;
    function isFloating(d) {
      var body = d.querySelector(".more__body");
      return !!body && window.getComputedStyle(body).position === "absolute";
    }
    function openMore() { return floating && floating.matches ? $all("details.rmap__more[open]").filter(isFloating) : []; }
    doc.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") { return; }
      openMore().forEach(function (d) {
        // Focus goes back to the summary only when it was inside the panel (checked before closing).
        var inside = d.contains(doc.activeElement);
        d.open = false;
        var s = d.querySelector("summary");
        if (s && inside) { s.focus(); }
      });
    });
    doc.addEventListener("click", function (e) {
      openMore().forEach(function (d) { if (!d.contains(e.target)) { d.open = false; } });
    });
    doc.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a") : null;
      if (!a) { return; }
      // SVG links (the /infra/ map) have no pathname, host or hash: resolve their href first.
      var raw = a.getAttribute("href") || a.getAttribute("xlink:href") || (a.href && a.href.baseVal) || "";
      if (raw.indexOf("#") === -1) { return; }
      var u;
      try { u = new URL(raw, window.location.href); } catch (err) { return; }
      if (u.pathname !== window.location.pathname || u.host !== window.location.host || u.hash.length < 2) { return; }
      openFor(u.hash.slice(1));
    });
  }

  /* ------------------------------------------------------------------------
     Links shared before the site had several pages, e.g. /#development or /de/#links.
     Ported verbatim from the original community.js.
     ------------------------------------------------------------------------ */
  var MOVED = [
    [/^development$/, "network/"],
    [/^(about|next|fact-[a-z0-9-]+)$/, "learn/"],
    [/^(links|cat-[a-z0-9-]+)$/, "links/"],
    [/^(documents|doc-[a-z0-9-]+)$/, "projects/"],
    [/^before-installing$/, "infra/"],
  ];

  // Sections of the developers page that moved to its sub-page "Ongoing work" (/dev/work/).
  var DEV_MOVED = new RegExp(
    "^((coverage|classes|lanes|flow|gates|ci|rhythm|owner-rules)(-title)?|coverage-weekly|never|sweeps-title|runs-title|areas(-title)?|" +
    "baselines-title|registry|routes-title|escalation-title|week-title|gates-(ci|release)-title|" +
    "(figure|run|area|baseline|class|group|lane|route|gate|day|phase)-[A-Za-z0-9_-]+)$"
  );

  // Where a section of the old single page lives now; null if the hash is not one of them.
  function movedTarget(pathname, hash) {
    var id = hash.replace(/^#/, "");
    var dev = /^\/([a-z]{2}\/)?dev\/$/.exec(pathname);
    if (dev && id && DEV_MOVED.test(id)) {
      return "/" + (dev[1] || "") + "dev/work/#" + id;
    }
    var home = /^\/([a-z]{2}\/)?$/.exec(pathname);
    if (!home || !id) {
      return null;
    }
    for (var i = 0; i < MOVED.length; i += 1) {
      if (MOVED[i][0].test(id)) {
        return "/" + (home[1] || "") + MOVED[i][1] + "#" + id;
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------------
     QA mode (?qa=1): a plain report appended to the page for tools/qa.sh
     ------------------------------------------------------------------------ */
  function shortSel(n) {
    var s = n.tagName.toLowerCase();
    if (n.id) { s += "#" + n.id; }
    var cls = (typeof n.className === "string" ? n.className : (n.getAttribute("class") || "")).trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (cls.length) { s += "." + cls.join("."); }
    return s;
  }
  function clipped(n) {
    var p = n.parentElement;
    while (p && p !== doc.body) {
      var cs = window.getComputedStyle(p);
      if (cs.overflowX !== "visible" || cs.clipPath !== "none" && cs.clipPath !== "") { return true; }
      p = p.parentElement;
    }
    return false;
  }
  function accName(n) {
    var label = n.getAttribute("aria-label");
    if (label && label.trim()) { return label.trim(); }
    var by = n.getAttribute("aria-labelledby");
    if (by) {
      var t = by.split(/\s+/).map(function (i) { var x = doc.getElementById(i); return x ? x.textContent : ""; }).join(" ").trim();
      if (t) { return t; }
    }
    var text = (n.textContent || "").trim();
    if (text) { return text; }
    var img = n.querySelector("img[alt]");
    if (img && img.getAttribute("alt").trim()) { return img.getAttribute("alt"); }
    return (n.getAttribute("title") || "").trim();
  }
  function runQA() {
    var lines = [];
    var fails = 0;
    var vw = window.innerWidth;
    var path = window.location.pathname;
    lines.push("page: " + path);
    lines.push("viewport width: " + vw + " (client " + doc.documentElement.clientWidth + ")");

    var offenders = [];
    $all("body *").forEach(function (n) {
      if (n.id === "qa-report" || n.closest("#qa-report")) { return; }
      var r = n.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) { return; }
      if (r.right > vw + 1 && !clipped(n)) {
        var cs = window.getComputedStyle(n);
        if (cs.position === "fixed" && (cs.opacity === "0" || cs.visibility === "hidden")) { return; }
        offenders.push(shortSel(n) + " right=" + Math.round(r.right));
      }
    });
    var overflow = doc.documentElement.scrollWidth > vw + 1 || offenders.length > 0;
    lines.push("horizontal overflow: " + (overflow ? "yes" : "no") + " (scrollWidth " + doc.documentElement.scrollWidth + ")");
    if (overflow) { fails += 1; offenders.slice(0, 10).forEach(function (o) { lines.push("  - " + o); }); }

    var errors = window.__qaErrors || [];
    lines.push("JS errors: " + errors.length);
    if (errors.length) { fails += 1; errors.slice(0, 20).forEach(function (e) { lines.push("  - " + e); }); }

    var seen = {};
    var dups = [];
    $all("[id]").forEach(function (n) {
      if (seen[n.id]) { if (dups.indexOf(n.id) === -1) { dups.push(n.id); } } else { seen[n.id] = true; }
    });
    lines.push("duplicate ids: " + (dups.length ? dups.join(", ") : "none"));
    if (dups.length) { fails += 1; }

    var missing = [];
    $all("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      var id = null;
      if (href.charAt(0) === "#") { id = href.slice(1); } else if (href.indexOf(path + "#") === 0) { id = href.slice(path.length + 1); } else if (path.slice(-1) === "/" && href.indexOf(path.slice(0, -1) + "#") === 0) { id = href.slice(path.length); }
      if (id && !doc.getElementById(decodeURIComponent(id))) { missing.push(href); }
    });
    lines.push("same-page links with missing target: " + (missing.length ? missing.join(", ") : "none"));
    if (missing.length) { fails += 1; }

    var h1 = $all("h1").length;
    lines.push("h1 count: " + h1);
    if (h1 !== 1) { fails += 1; }

    var skips = [];
    var prev = 0;
    $all("h1, h2, h3, h4, h5, h6").forEach(function (h) {
      var lvl = Number(h.tagName.charAt(1));
      if (prev && lvl > prev + 1) { skips.push("h" + prev + " -> h" + lvl + " (" + (h.textContent || "").trim().slice(0, 40) + ")"); }
      prev = lvl;
    });
    lines.push("heading level skips: " + (skips.length ? "" : "none"));
    if (skips.length) { fails += 1; skips.forEach(function (s) { lines.push("  - " + s); }); }

    var noAlt = $all("img:not([alt])").map(function (i) { return i.getAttribute("src"); });
    lines.push("img without alt: " + (noAlt.length ? noAlt.join(", ") : "none"));
    if (noAlt.length) { fails += 1; }

    var unnamed = $all("a[href], button, summary").filter(function (n) { return !accName(n); }).map(shortSel);
    lines.push("links/buttons without a name: " + (unnamed.length ? unnamed.slice(0, 10).join(", ") : "none"));
    if (unnamed.length) { fails += 1; }

    var hex = $all("[style]").filter(function (n) {
      return /#[0-9a-f]{3,8}\b/i.test(n.getAttribute("style")) && !n.closest(".board");
    }).map(shortSel);
    lines.push("inline hex colours outside the board: " + (hex.length ? hex.join(", ") : "none"));
    if (hex.length) { fails += 1; }

    lines.push(fails ? "QA FAILED (" + fails + " checks)" : "QA OK");
    var pre = el("pre", "", lines.join("\n"));
    pre.id = "qa-report";
    doc.body.appendChild(pre);
  }

  /* ------------------------------------------------------------------------
     Start
     ------------------------------------------------------------------------ */
  window.BTX = { status: status, glossary: glossary, toast: toast };

  function safe(fn, name) {
    try { fn(); } catch (e) {
      // In production a broken feature leaves a trace in the console, so a user report can be diagnosed.
      if (window.__qaErrors) { window.__qaErrors.push("init " + name + ": " + (e && e.message)); }
      else if (window.console && console.error) { console.error("BTX init " + name, e); }
    }
  }
  /* Background animation pause (WCAG 2.2.2): the footer button drives window.BTXBackground
     from matrix-bg.js. Hidden when the module is missing or JavaScript is off. */
  function initBgToggle() {
    var api = window.BTXBackground;
    if (!api) {
      /* site.js runs before matrix-bg.js (both deferred): try again once the page has loaded. */
      if (!initBgToggle.waited) { initBgToggle.waited = true; window.addEventListener("load", function () { safe(initBgToggle, "background toggle"); }); }
      return;
    }
    if (initBgToggle.done) { return; }
    initBgToggle.done = true;
    $all("[data-bg-toggle]").forEach(function (b) {
      function sync() {
        var paused = api.isPaused();
        b.setAttribute("aria-pressed", paused ? "true" : "false");
        b.textContent = paused ? "Play background animation" : "Pause background animation";
      }
      b.hidden = false;
      sync();
      b.addEventListener("click", function () { if (api.isPaused()) { api.play(); } else { api.pause(); } sync(); });
      if (api.onchange) { api.onchange(sync); }
    });
  }
  function init() {
    var moved = movedTarget(window.location.pathname, window.location.hash);
    if (moved && !doc.getElementById(window.location.hash.slice(1))) {
      window.location.replace(moved);
      return;
    }
    // A slow connection may have run the head script's 4 s fallback: restore the JS layout.
    root.classList.add("js");
    safe(makeToast, "toast");
    safe(initMenu, "menu");
    safe(initDisclosures, "disclosures");
    safe(initTerms, "terms");
    safe(initRoutes, "routes");
    safe(initSecRules, "section rules");
    safe(initRouteMap, "routemap");
    safe(initChecklists, "checklists");
    safe(initCopy, "copy");
    safe(initPause, "pause");
    safe(initBgToggle, "background toggle");
    safe(initStatus, "status");
    if (/[?&]qa=1\b/.test(window.location.search)) { window.setTimeout(runQA, 2500); }
  }
  if (doc.readyState === "loading") { doc.addEventListener("DOMContentLoaded", init); } else { init(); }
}());
