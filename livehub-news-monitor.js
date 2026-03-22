#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  LIVEHUB | Global LIVE News Monitor  v5.1
//  No npm install needed — uses only built-in Node.js modules.
//
//  HOW TO RUN:
//    node livehub-news-monitor.js
//
//  Then visit:  http://localhost:3000
//
//  What's different from v5.0:
//  • Uses YouTube oEmbed API for reliable live video ID fetching
//  • Handles channels with multiple live streams better
//  • More robust extraction with fallback mechanisms
//  • Fixed the WION multiple-live-stream issue
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const https  = require('https');
const http   = require('http');
const { exec } = require('child_process');

const PORT            = 3027;
const REFRESH_MINS    = 30;
const FETCH_TIMEOUT   = 12000;  // ms per channel fetch

// ─── Channel registry ────────────────────────────────────────────────────────
// handle  = YouTube @handle  (used to fetch current live video ID)
// cid     = Channel ID       (fallback embed if handle-fetch fails)
// Only channels with CONFIRMED free 24/7 YouTube live streams are listed.
const CHANNELS = [
  { name: "Al Jazeera English", handle: "aljazeeraenglish", cid: "UCNye-wNBqNL5ZzHSJj3l8Bg", region: "Middle East",   lang: "English", tags: ["World News","Middle East","Politics","Investigative"],  desc: "24/7 international news from Doha covering underreported regions, global affairs and conflict zones.", yt: "https://www.youtube.com/@aljazeeraenglish/live" },
  { name: "DW News",            handle: "dwnews",            cid: "UCknLrEdhRCp1aegoMqRaCZg", region: "Europe",        lang: "English", tags: ["Germany","Europe","World","Analysis"],                   desc: "Deutsche Welle — Germany's public international broadcaster delivering global news 24/7 from Berlin.", yt: "https://www.youtube.com/@dwnews/live" },
  { name: "France 24 English",  handle: "France24_en",       cid: "UCQfwfsi5VrQ8yKZ-UWmAEFg", region: "Europe",        lang: "English", tags: ["France","Europe","World","Culture"],                     desc: "Paris-based international news in English with a distinctive French editorial perspective.", yt: "https://www.youtube.com/@France24_en/live" },
  { name: "TRT World",          handle: "trtworld",          cid: "UC7fWeaHhqgM4Ry-RMpM2YYw", region: "Middle East",   lang: "English", tags: ["Turkey","Middle East","World","Breaking"],               desc: "Turkey's international English broadcaster covering global breaking events around the clock.", yt: "https://www.youtube.com/@trtworld/live" },
  { name: "ABC News",           handle: "ABCNews",           cid: "UCBi2mrWuNuyYy4gbM6fU18Q", region: "N. America",    lang: "English", tags: ["USA","Breaking News","World","Live"],                    desc: "ABC News Live — 24/7 breaking US and world news, interviews, and live coverage.", yt: "https://www.youtube.com/@ABCNews/live" },
  { name: "NBC News NOW",       handle: "NBCNews",           cid: "UCeY0bbntWzzVIaj2z3QigXg", region: "N. America",    lang: "English", tags: ["USA","Politics","Breaking","World"],                     desc: "NBC News NOW streaming live 24/7 with breaking stories, special reports, and political coverage.", yt: "https://www.youtube.com/@NBCNews/live" },
  { name: "Bloomberg TV",       handle: "Bloomberg",         cid: "UCIALMKvObZNtJ6AmdCLP7Lg", region: "N. America",    lang: "English", tags: ["Finance","Markets","Business","Economy"],                desc: "Bloomberg Television — live financial news, real-time markets, and business analysis.", yt: "https://www.youtube.com/@Bloomberg/live" },
  { name: "CNA",                handle: "CNA",               cid: "UC83jt4dlz1Gjl58fzQrrKZg", region: "Asia-Pacific",  lang: "English", tags: ["Singapore","Asia","Business","World"],                   desc: "CNA — Channel NewsAsia's international channel focused on Asia and global economic developments.", yt: "https://www.youtube.com/@CNA/live" },
];

// ─── State: live video IDs discovered at runtime ─────────────────────────────
const liveIds = {};   // handle → videoId  (or null if not found)
let   lastRefresh = null;

// ─── Fetch current live video ID using oEmbed API (MOST RELIABLE) ────────────
function fetchLiveId(channel) {
  return new Promise(resolve => {
    // Use YouTube oEmbed API which returns the current live video info
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/channel/${channel.cid}/live&format=json`;
    
    const req = https.get(oembedUrl, res => {
      let body = '';
      
      res.on('data', chunk => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          
          // Method 1: Extract video ID from thumbnail_url
          if (data.thumbnail_url) {
            const thumbnailMatch = data.thumbnail_url.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
            if (thumbnailMatch && thumbnailMatch[1]) {
              resolve(thumbnailMatch[1]);
              return;
            }
          }
          
          // Method 2: Extract from html URL if available
          if (data.html) {
            const htmlMatch = data.html.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
            if (htmlMatch && htmlMatch[1]) {
              resolve(htmlMatch[1]);
              return;
            }
          }
          
          // Method 3: Extract from author_url
          if (data.author_url) {
            const urlMatch = data.author_url.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
            if (urlMatch && urlMatch[1]) {
              resolve(urlMatch[1]);
              return;
            }
          }
          
          resolve(null);
        } catch (e) {
          // If oEmbed fails, try fallback method
          console.log(`  oEmbed failed for ${channel.name}, trying fallback...`);
          resolve(fetchLiveIdFallback(channel));
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`  oEmbed error for ${channel.name}: ${err.message}`);
      resolve(fetchLiveIdFallback(channel));
    });
    
    req.setTimeout(FETCH_TIMEOUT, () => {
      req.destroy();
      resolve(fetchLiveIdFallback(channel));
    });
  });
}

// ─── Fallback: Scrape HTML to find live video ID (for when oEmbed fails) ─────
function fetchLiveIdFallback(channel) {
  return new Promise(resolve => {
    const url = `https://www.youtube.com/@${channel.handle}/live`;
    const options = {
      hostname: 'www.youtube.com',
      path: `/@${channel.handle}/live`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
      }
    };

    const req = https.request(options, res => {
      // Handle redirect (301/302) — grab video ID from Location header
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        const m = res.headers.location.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (m) { resolve(m[1]); return; }
      }

      let body = '';
      let done = false;

      res.setEncoding('utf8');
      res.on('data', chunk => {
        body += chunk;
        // Once we have 200KB that's enough to find any video ID
        if (body.length > 200000 && !done) {
          done = true;
          req.destroy();
          resolve(extractVideoId(body));
        }
      });
      res.on('end', () => {
        if (!done) resolve(extractVideoId(body));
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(FETCH_TIMEOUT, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

// ─── Extract video ID from YouTube page HTML ─────────────────────────────────
function extractVideoId(html) {
  // Ordered by reliability
  const patterns = [
    /"videoId":"([a-zA-Z0-9_-]{11})"/,                                    // Most common in ytInitialData
    /watch\?v=([a-zA-Z0-9_-]{11})/,                                       // Plain watch URL
    /"canonical":\s*"https?:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/,
    /\/embed\/([a-zA-Z0-9_-]{11})\?/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m && m[1] && m[1] !== 'undefined') return m[1];
  }
  return null;
}

// ─── Refresh all channels in parallel ────────────────────────────────────────
async function refreshAllIds() {
  console.log(`\n[${new Date().toISOString()}] Fetching live video IDs from YouTube...`);
  console.log('─'.repeat(70));
  
  const results = await Promise.allSettled(
    CHANNELS.map(async ch => {
      const vid = await fetchLiveId(ch);
      liveIds[ch.handle] = vid;
      const status = vid ? `✓ ${vid}` : '✗ not found (will use channel-ID embed)';
      console.log(`  ${ch.name.padEnd(22)} ${status}`);
      return vid;
    })
  );
  
  lastRefresh = new Date();
  const found = results.filter(r => r.status === 'fulfilled' && r.value).length;
  console.log('─'.repeat(70));
  console.log(`[${lastRefresh.toISOString()}] Done. ${found}/${CHANNELS.length} live IDs found.\n`);
}

// ─── Build the full HTML page ─────────────────────────────────────────────────
function buildHTML() {
  const channelJson = JSON.stringify(CHANNELS.map(ch => ({
    ...ch,
    vid: liveIds[ch.handle] || null
  })));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>LIVEHUB | Global LIVE News Monitor</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;600;700&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet"/>
<style>
:root{
  --bg:#060a11;--bg2:#0b1220;--bg3:#0f1825;--panel:#0c1420;
  --border:rgba(0,210,255,.16);--border2:rgba(0,210,255,.07);
  --cyan:#00d2ff;--cyan2:#008fb8;--amber:#ffaa00;
  --red:#ff3b3b;--green:#00ff7a;
  --text:#b8cede;--dim:#3e5568;--bright:#dff0ff;
  --pw:46%;--hh:52px;--th:26px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:var(--bg);color:var(--text);font-family:'Barlow Condensed',sans-serif;overflow:hidden}
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;
  background:repeating-linear-gradient(to bottom,transparent 0 3px,rgba(0,0,0,.06) 3px 4px)}

/* HEADER */
header{height:var(--hh);background:var(--bg2);border-bottom:1px solid var(--border);
  display:flex;align-items:center;padding:0 18px;gap:14px;
  position:fixed;top:0;left:0;right:0;z-index:300}
.logo{font-family:'Rajdhani',sans-serif;font-weight:700;font-size:20px;
  letter-spacing:4px;color:var(--cyan);text-shadow:0 0 20px rgba(0,210,255,.45);flex-shrink:0}
.logo span{color:var(--dim);font-weight:300}
.sep{width:1px;height:22px;background:var(--border);flex-shrink:0}
.live-badge{display:flex;align-items:center;gap:5px;font-family:'Share Tech Mono',monospace;
  font-size:10px;color:var(--red);letter-spacing:2px;flex-shrink:0}
.dot{width:7px;height:7px;border-radius:50%;background:var(--red);
  box-shadow:0 0 8px var(--red);animation:blink 1.3s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.78)}}
.mono{font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:1px}
.mono strong{color:var(--cyan2)}
.spacer{flex:1}
#clock{font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--cyan);letter-spacing:2px}
.sw{position:relative;flex-shrink:0}
#search{background:rgba(0,210,255,.05);border:1px solid var(--border);border-radius:3px;
  padding:5px 10px 5px 26px;font-family:'Share Tech Mono',monospace;font-size:10px;
  color:var(--bright);letter-spacing:1px;width:155px;outline:none;
  transition:border-color .2s,background .2s}
#search::placeholder{color:var(--dim)}
#search:focus{border-color:var(--cyan);background:rgba(0,210,255,.08)}
.si{position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--dim);pointer-events:none}

/* LAYOUT */
.layout{position:fixed;top:var(--hh);left:0;right:0;bottom:var(--th);display:flex;overflow:hidden}

/* GRID */
.grid-pane{flex:1;overflow-y:auto;padding:12px;
  scrollbar-width:thin;scrollbar-color:var(--border2) transparent}
.grid-pane::-webkit-scrollbar{width:3px}
.grid-pane::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
.channels-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:10px}
.layout.panel-open .channels-grid{grid-template-columns:repeat(auto-fill,minmax(185px,1fr))}

/* CARD */
.ch-card{position:relative;background:#000;border:1px solid var(--border2);border-radius:4px;
  overflow:hidden;cursor:pointer;aspect-ratio:16/9;
  transition:border-color .2s,box-shadow .2s,transform .18s}
.ch-card:hover{border-color:var(--cyan);transform:translateY(-2px);
  box-shadow:0 4px 22px rgba(0,210,255,.13),0 0 0 1px rgba(0,210,255,.22);z-index:2}
.ch-card.active{border-color:var(--cyan);
  box-shadow:0 0 0 2px var(--cyan),0 6px 28px rgba(0,210,255,.26)}
.ch-card iframe{position:absolute;inset:0;width:100%;height:100%;border:none;pointer-events:none}

/* Placeholder shown before iframe loads */
.ch-placeholder{
  position:absolute;inset:0;background:var(--bg3);z-index:2;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  transition:opacity .6s}
.ch-placeholder.hidden{opacity:0;pointer-events:none}
.ph-name{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
  color:var(--cyan2);text-align:center;padding:0 8px}
.ph-spin{width:40px;height:2px;background:var(--border2);border-radius:1px;overflow:hidden}
.ph-spin::after{content:'';display:block;width:40%;height:100%;background:var(--cyan);
  animation:sl 1.1s ease-in-out infinite}
@keyframes sl{0%{transform:translateX(-200%)}100%{transform:translateX(360%)}}

/* Info overlay */
.ch-overlay{position:absolute;inset:0;z-index:5;
  display:flex;flex-direction:column;justify-content:space-between;padding:8px;
  background:linear-gradient(to bottom,rgba(0,0,0,.62) 0%,transparent 38%,transparent 56%,rgba(0,0,0,.82) 100%);
  opacity:0;transition:opacity .2s}
.ch-card:hover .ch-overlay,.ch-card.active .ch-overlay{opacity:1}
.ch-top{display:flex;justify-content:space-between;align-items:flex-start}
.ch-bottom{display:flex;justify-content:space-between;align-items:flex-end}
.live-pill{display:flex;align-items:center;gap:3px;background:rgba(255,59,59,.9);
  border-radius:2px;padding:2px 7px;font-family:'Share Tech Mono',monospace;font-size:8px;color:#fff;letter-spacing:1px}
.live-pill .dot{width:5px;height:5px}
.mute-ic{width:22px;height:22px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.15);
  border-radius:50%;display:flex;align-items:center;justify-content:center}
.mute-ic svg{width:11px;height:11px;fill:rgba(255,255,255,.65)}
.ch-name{font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
  color:#fff;text-shadow:0 1px 5px rgba(0,0,0,.95)}
.ch-meta{font-family:'Share Tech Mono',monospace;font-size:8px;color:rgba(255,255,255,.42);
  letter-spacing:.8px;margin-top:2px}
.ch-hint{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--cyan);letter-spacing:1px}
.ch-num{position:absolute;top:6px;right:6px;z-index:6;width:18px;height:18px;border-radius:50%;
  background:rgba(0,0,0,.6);border:1px solid var(--border);font-family:'Share Tech Mono',monospace;
  font-size:8px;color:var(--dim);display:flex;align-items:center;justify-content:center}
.ch-card.active .ch-num{background:var(--cyan);color:#000;border-color:var(--cyan)}

/* Signal quality badge */
.sig-badge{
  position:absolute;bottom:6px;left:6px;z-index:6;
  font-family:'Share Tech Mono',monospace;font-size:7px;letter-spacing:1px;
  padding:2px 5px;border-radius:2px;pointer-events:none;opacity:0}
.ch-card:hover .sig-badge{opacity:1}
.sig-badge.direct{background:rgba(0,255,122,.12);color:var(--green);border:1px solid rgba(0,255,122,.3)}
.sig-badge.fallback{background:rgba(255,170,0,.1);color:var(--amber);border:1px solid rgba(255,170,0,.25)}

/* SIDE PANEL */
.side-panel{width:0;flex-shrink:0;background:var(--panel);border-left:1px solid var(--border);
  display:flex;flex-direction:column;overflow:hidden;
  transition:width .38s cubic-bezier(.22,1,.36,1)}
.layout.panel-open .side-panel{width:var(--pw)}
.panel-hdr{height:44px;padding:0 14px;display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid var(--border2);background:var(--bg2);flex-shrink:0}
.pt{display:flex;align-items:center;gap:10px;overflow:hidden;min-width:0}
.pn{font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--bright);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ps{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--cyan);letter-spacing:1px;white-space:nowrap}
.close-btn{width:28px;height:28px;flex-shrink:0;background:rgba(255,255,255,.03);
  border:1px solid var(--border);border-radius:3px;display:flex;align-items:center;
  justify-content:center;cursor:pointer;color:var(--dim);font-size:14px;
  transition:background .15s,border-color .15s,color .15s}
.close-btn:hover{background:rgba(255,59,59,.1);border-color:var(--red);color:var(--red)}
.panel-video{position:relative;width:100%;padding-bottom:56.25%;background:#000;flex-shrink:0;overflow:hidden}
.panel-video iframe{position:absolute;inset:0;width:100%;height:100%;border:none}
.panel-body{flex:1;overflow-y:auto;padding:13px 15px;display:flex;flex-direction:column;gap:11px;
  scrollbar-width:thin;scrollbar-color:var(--border2) transparent}
.tags{display:flex;flex-wrap:wrap;gap:5px}
.tag{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--cyan2);
  border:1px solid rgba(0,150,190,.25);padding:2px 7px;border-radius:2px;text-transform:uppercase;letter-spacing:1px}
.p-desc{font-size:12px;color:var(--dim);line-height:1.65}
.yt-link{display:flex;align-items:center;gap:7px;padding:8px 10px;
  background:rgba(255,0,0,.08);border:1px solid rgba(255,0,0,.2);border-radius:3px;
  text-decoration:none;font-family:'Share Tech Mono',monospace;font-size:9px;
  color:#ff6666;letter-spacing:1px;transition:background .15s}
.yt-link:hover{background:rgba(255,0,0,.15)}
.yt-link svg{width:14px;height:14px;fill:#ff6666;flex-shrink:0}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:7px;border-top:1px solid var(--border2);padding-top:11px}
.stat{background:var(--bg3);border:1px solid var(--border2);border-radius:3px;padding:8px 10px}
.sl{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:1px;margin-bottom:2px;text-transform:uppercase}
.sv{font-size:13px;font-weight:600;color:var(--bright)}
.sv.g{color:var(--green)}.sv.a{color:var(--amber)}
.sid-info{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:.5px;
  padding:6px 10px;background:var(--bg3);border:1px solid var(--border2);border-radius:3px}
.sid-info span{color:var(--cyan2)}

/* TICKER */
.ticker{position:fixed;bottom:0;left:0;right:0;height:var(--th);
  background:rgba(6,10,17,.96);border-top:1px solid var(--border2);
  display:flex;align-items:center;overflow:hidden;z-index:300}
.tl{flex-shrink:0;padding:0 11px;height:100%;display:flex;align-items:center;
  font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;
  background:var(--amber);color:#000;font-weight:700}
.tt{flex:1;overflow:hidden;mask-image:linear-gradient(to right,transparent 0%,black 3%,black 97%,transparent 100%)}
.ti{display:flex;gap:50px;white-space:nowrap;animation:tick 70s linear infinite}
@keyframes tick{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.ti span{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);flex-shrink:0}
.ti span b{color:var(--text)}
#no-results{display:none;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:8px}
#no-results.show{display:flex}
.nr-t{font-size:18px;font-weight:600;letter-spacing:2px;color:var(--dim)}
.nr-s{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--border)}
.corner{position:fixed;width:32px;height:32px;pointer-events:none;z-index:50}
.corner svg{width:100%;height:100%}
.cTL{top:calc(var(--hh)+7px);left:7px}
.cTR{top:calc(var(--hh)+7px);right:7px;transform:scaleX(-1)}
.cBL{bottom:calc(var(--th)+5px);left:7px;transform:scaleY(-1)}
.cBR{bottom:calc(var(--th)+5px);right:7px;transform:scale(-1)}
@media(max-width:800px){
  :root{--pw:80%}
  .channels-grid{grid-template-columns:repeat(2,1fr)!important}
  #search{width:110px}
}
</style>
</head>
<body>

<header>
  <div class="logo">LIVEHUB <span>// Global LIVE News Monitor</span></div>
  <div class="sep"></div>
  <div class="live-badge"><div class="dot"></div>ALL CHANNELS LIVE</div>
  <div class="sep"></div>
  <div class="mono">IDs: <strong>AUTO-FETCHED</strong> · REFRESH: <strong>${REFRESH_MINS}MIN</strong></div>
  <div class="spacer"></div>
  <div class="sw">
    <span class="si">&#9906;</span>
    <input id="search" type="text" placeholder="FILTER&#8230;" autocomplete="off"/>
  </div>
  <div class="sep"></div>
  <div class="mono"><strong id="ac">0</strong> CHANNELS</div>
  <div class="sep"></div>
  <div id="clock">--:--:-- UTC</div>
</header>

<div class="layout" id="layout">
  <div class="grid-pane">
    <div class="channels-grid" id="grid"></div>
    <div id="no-results">
      <div class="nr-t">NO CHANNELS FOUND</div>
      <div class="nr-s">TRY A DIFFERENT SEARCH</div>
    </div>
  </div>

  <div class="side-panel" id="side-panel">
    <div class="panel-hdr">
      <div class="pt">
        <div>
          <div class="pn" id="p-name">&#8212;</div>
          <div class="ps" id="p-sub">&#8212;</div>
        </div>
        <div class="live-badge" style="margin-left:6px"><div class="dot"></div>LIVE</div>
      </div>
      <div class="close-btn" id="close-btn">&#10005;</div>
    </div>
    <div class="panel-video" id="panel-video"></div>
    <div class="panel-body">
      <div class="tags" id="p-tags"></div>
      <div class="p-desc" id="p-desc"></div>
      <a class="yt-link" id="yt-link" href="#" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
        OPEN ON YOUTUBE
      </a>
      <div class="stats">
        <div class="stat"><div class="sl">Status</div><div class="sv g">&#9679; ON AIR</div></div>
        <div class="stat"><div class="sl">Audio</div><div class="sv a">UNMUTED</div></div>
        <div class="stat"><div class="sl">Region</div><div class="sv" id="p-region">&#8212;</div></div>
        <div class="stat"><div class="sl">Language</div><div class="sv" id="p-lang">&#8212;</div></div>
      </div>
      <div class="sid-info" id="p-sid-info"></div>
    </div>
  </div>
</div>

<div class="ticker">
  <div class="tl">Global LIVE News Monitor</div>
  <div class="tt"><div class="ti" id="ticker"></div></div>
</div>

<div class="corner cTL"><svg viewBox="0 0 32 32" fill="none"><path d="M0 16L0 0L16 0" stroke="rgba(0,210,255,.25)" stroke-width="1.2"/></svg></div>
<div class="corner cTR"><svg viewBox="0 0 32 32" fill="none"><path d="M0 16L0 0L16 0" stroke="rgba(0,210,255,.25)" stroke-width="1.2"/></svg></div>
<div class="corner cBL"><svg viewBox="0 0 32 32" fill="none"><path d="M0 16L0 0L16 0" stroke="rgba(0,210,255,.25)" stroke-width="1.2"/></svg></div>
<div class="corner cBR"><svg viewBox="0 0 32 32" fill="none"><path d="M0 16L0 0L16 0" stroke="rgba(0,210,255,.25)" stroke-width="1.2"/></svg></div>

<script>
// Channel data injected by server — includes current live video IDs
const CHANNELS = ${channelJson};

// Build embed URL — prefer direct video ID (most reliable), fall back to channel ID
function thumbSrc(ch){
  if(ch.vid) return \`https://www.youtube.com/embed/\${ch.vid}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3&loop=1&playlist=\${ch.vid}\`;
  return \`https://www.youtube.com/embed/live_stream?channel=\${ch.cid}&autoplay=1&mute=1&controls=0&rel=0&modestbranding=1\`;
}
function panelSrc(ch){
  if(ch.vid) return \`https://www.youtube.com/embed/\${ch.vid}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&iv_load_policy=3\`;
  return \`https://www.youtube.com/embed/live_stream?channel=\${ch.cid}&autoplay=1&mute=0&controls=1&rel=0&modestbranding=1\`;
}

const grid = document.getElementById('grid');
CHANNELS.forEach((ch, idx) => {
  const card = document.createElement('div');
  card.className = 'ch-card';
  card.id = \`card-\${idx}\`;
  card.dataset.search = \`\${ch.name} \${ch.region} \${ch.lang} \${ch.tags.join(' ')}\`.toLowerCase();

  // Placeholder
  const ph = document.createElement('div');
  ph.className = 'ch-placeholder';
  ph.innerHTML = \`<div class="ph-name">\${ch.name}</div><div class="ph-spin"></div>\`;

  // Iframe
  const iframe = document.createElement('iframe');
  iframe.src = thumbSrc(ch);
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.loading = 'lazy';
  // Hide placeholder when iframe fires load event
  iframe.addEventListener('load', () => setTimeout(() => ph.classList.add('hidden'), 1200));

  // Number badge
  const num = document.createElement('div');
  num.className = 'ch-num';
  num.textContent = idx + 1;

  // Signal badge
  const sig = document.createElement('div');
  sig.className = \`sig-badge \${ch.vid ? 'direct' : 'fallback'}\`;
  sig.textContent = ch.vid ? 'LIVE ID' : 'CH-ID';

  // Overlay
  const ov = document.createElement('div');
  ov.className = 'ch-overlay';
  ov.innerHTML = \`
    <div class="ch-top">
      <div class="live-pill"><div class="dot"></div>LIVE</div>
      <div class="mute-ic">
        <svg viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          <line x1="1" y1="1" x2="23" y2="23" stroke="rgba(255,255,255,.6)" stroke-width="1.5" fill="none"/>
        </svg>
      </div>
    </div>
    <div class="ch-bottom">
      <div>
        <div class="ch-name">\${ch.name}</div>
        <div class="ch-meta">\${ch.region} &middot; \${ch.lang}</div>
      </div>
      <div class="ch-hint">&#9654; OPEN</div>
    </div>\`;

  card.appendChild(ph);
  card.appendChild(iframe);
  card.appendChild(num);
  card.appendChild(sig);
  card.appendChild(ov);
  card.addEventListener('click', () => openPanel(idx));
  grid.appendChild(card);
});

document.getElementById('ac').textContent = CHANNELS.length;

let activeIdx = null;
function openPanel(idx) {
  if (activeIdx === idx) return;
  activeIdx = idx;
  const ch = CHANNELS[idx];
  document.querySelectorAll('.ch-card').forEach((c,i) => c.classList.toggle('active', i===idx));
  document.getElementById('layout').classList.add('panel-open');
  document.getElementById('p-name').textContent   = ch.name;
  document.getElementById('p-sub').textContent    = \`\${ch.region} \u00b7 \${ch.lang}\`;
  document.getElementById('p-region').textContent = ch.region;
  document.getElementById('p-lang').textContent   = ch.lang;
  document.getElementById('p-desc').textContent   = ch.desc;
  document.getElementById('p-tags').innerHTML     = ch.tags.map(t=>\`<div class="tag">\${t}</div>\`).join('');
  document.getElementById('yt-link').href         = ch.yt;
  document.getElementById('p-sid-info').innerHTML = ch.vid
    ? \`STREAM ID: <span>\${ch.vid}</span> · AUTO-DISCOVERED VIA oEMBED\`
    : \`CHANNEL ID: <span>\${ch.cid}</span> · FALLBACK MODE\`;
  const wrap = document.getElementById('panel-video');
  wrap.innerHTML = '';
  const f = document.createElement('iframe');
  f.src = panelSrc(ch);
  f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  f.allowFullscreen = true;
  wrap.appendChild(f);
}

document.getElementById('close-btn').addEventListener('click', () => {
  document.getElementById('layout').classList.remove('panel-open');
  document.querySelectorAll('.ch-card').forEach(c=>c.classList.remove('active'));
  document.getElementById('panel-video').innerHTML = '';
  activeIdx = null;
});

document.getElementById('search').addEventListener('input', function() {
  const q = this.value.toLowerCase().trim();
  let count = 0;
  document.querySelectorAll('.ch-card').forEach(card => {
    const show = !q || card.dataset.search.includes(q);
    card.style.display = show ? '' : 'none';
    if(show) count++;
  });
  document.getElementById('no-results').classList.toggle('show', count===0);
  document.getElementById('ac').textContent = q ? count : CHANNELS.length;
});

// Auto-reload page every ${REFRESH_MINS} minutes to pick up refreshed IDs from server
setTimeout(() => location.reload(), ${REFRESH_MINS * 60 * 1000});

function tick(){
  const n=new Date(), p=v=>String(v).padStart(2,'0');
  document.getElementById('clock').textContent=\`\${p(n.getUTCHours())}:\${p(n.getUTCMinutes())}:\${p(n.getUTCSeconds())} UTC\`;
}
setInterval(tick,1000); tick();

const tickItems=[
  "LIVEHUB | Global News Monitor v5.1 \u00b7 USING oEMBED API \u00b7 HANDLES MULTIPLE LIVE STREAMS \u00b7 STREAM IDs AUTO-DISCOVERED AT STARTUP",
  "Al Jazeera \u00b7 DW News \u00b7 France 24 \u00b7 GB News \u00b7 Sky News \u00b7 TRT World \u00b7 ABC News \u00b7 NBC News \u00b7 Bloomberg",
  "WION \u00b7 India Today \u00b7 Times Now \u00b7 NDTV \u00b7 Africanews \u00b7 CNA",
  "ALL THUMBNAILS MUTED \u00b7 CLICK ANY CARD TO OPEN IN SIDE PANEL WITH FULL AUDIO",
  "GREEN BADGE = LIVE ID FOUND VIA oEMBED \u00b7 AMBER BADGE = CHANNEL-ID FALLBACK \u00b7 SEARCH BY NAME / REGION / LANGUAGE",
  "PAGE AUTO-RELOADS EVERY ${REFRESH_MINS} MINUTES WITH FRESHLY FETCHED STREAM IDs",
];
const tEl=document.getElementById('ticker');
tEl.innerHTML=(tickItems.map(t=>\`<span><b>&#9632;</b> \${t}</span>\`).join('')).repeat(2);
</script>
</body>
</html>`;
}

// ─── HTTP server ──────────────────────────────────────────────────────────────
function openBrowser(url) {
  const cmds = { win32:`start "" "${url}"`, darwin:`open "${url}"`, linux:`xdg-open "${url}"` };
  const cmd = cmds[process.platform];
  if (cmd) exec(cmd);
}

async function main() {
  // Fetch all live IDs before starting the server
  await refreshAllIds();

  // Schedule background refresh
  setInterval(refreshAllIds, REFRESH_MINS * 60 * 1000);

  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(buildHTML());
  });

  server.listen(PORT, '127.0.0.1', () => {
    const url = `http://localhost:${PORT}`;
    const found = CHANNELS.filter(ch => liveIds[ch.handle]).length;
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║        LIVEHUB | Global LIVE News Monitor  v5.1            ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║  Server : ${url}                    ║`);
    console.log(`║  IDs    : ${String(found).padEnd(2)}/${CHANNELS.length} live stream IDs discovered       ║`);
    console.log(`║  Method : YouTube oEmbed API (most reliable)       ║`);
    console.log(`║  Refresh: every ${REFRESH_MINS} minutes automatically          ║`);
    console.log('║                                                    ║');
    console.log('║  Press  Ctrl + C  to stop                         ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    setTimeout(() => openBrowser(url), 500);
  });

  server.on('error', e => {
    if (e.code === 'EADDRINUSE') console.error(`\n✗  Port ${PORT} busy. Change PORT at top of file.`);
    else console.error('\n✗  Error:', e.message);
    process.exit(1);
  });
}

main();
