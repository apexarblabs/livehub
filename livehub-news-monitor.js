#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  LIVEHUB — Global News Monitor
//  All channels. One place. Every language.
//
//  Run:   node livehub-news-monitor.js
//  Open:  http://localhost:3000  (or process.env.PORT)
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const http = require('http');
const { exec } = require('child_process');
const PORT = process.env.PORT || 3000;

// ─── Channel Database ─────────────────────────────────────────────────────────
// All embeds use:  youtube.com/embed/live_stream?channel=UCxxxxxx
// YouTube resolves this server-side to whatever is currently live.
// cid = the permanent UCxxxxxx channel ID (never changes).
// ─────────────────────────────────────────────────────────────────────────────
const DB = {

  English: {
    flag:'🌐', label:'English', color:'#00d2ff',
    channels:[
      { name:'Al Jazeera',    cid:'UCNye-wNBqNL5ZzHSJj3l8Bg', region:'Middle East',  tags:['World','Politics'],   yt:'https://www.youtube.com/@aljazeeraenglish/live' },
      { name:'DW News',       cid:'UCknLrEdhRCp1aegoMqRaCZg', region:'Germany',       tags:['Europe','World'],     yt:'https://www.youtube.com/@dwnews/live' },
      { name:'France 24',     cid:'UCQfwfsi5VrQ8yKZ-UWmAoBw', region:'France',        tags:['Europe','World'],     yt:'https://www.youtube.com/@France24_en/live' },
      { name:'TRT World',     cid:'UC7fWeaHhqgM4Ry-RMpM2YYw', region:'Turkey',        tags:['Middle East','World'],yt:'https://www.youtube.com/@trtworld/live' },
      { name:'Sky News',      cid:'UCoMdktPbSuTOBbM4sLnNoNg', region:'UK',            tags:['UK','Breaking'],      yt:'https://www.youtube.com/@SkyNews/live' },
      { name:'GB News',       cid:'UCH-whxFoJEHoJXSGSQCKd5Q', region:'UK',            tags:['UK','Politics'],      yt:'https://www.youtube.com/@GBNEWSonline/live' },
      { name:'ABC News',      cid:'UCBi2mrWuNuyYy4gbM6fU18Q', region:'USA',           tags:['USA','Breaking'],     yt:'https://www.youtube.com/@ABCNews/live' },
      { name:'NBC News NOW',  cid:'UCeY0bbntWzzVIaj2z3QigXg', region:'USA',           tags:['USA','Politics'],     yt:'https://www.youtube.com/@NBCNews/live' },
      { name:'Bloomberg TV',  cid:'UCIALMKvObZNtJ6AmdCLP7Lg', region:'USA',           tags:['Finance','Markets'],  yt:'https://www.youtube.com/@Bloomberg/live' },
      { name:'WION',          cid:'UC_gUM8rL-Lrg6O3adPW9K1g', region:'India',         tags:['South Asia','World'], yt:'https://www.youtube.com/@WION/live' },
      { name:'India Today',   cid:'UCYPvAwZP8pZhSMW8qs7cVCw', region:'India',         tags:['India','Politics'],   yt:'https://www.youtube.com/@indiatoday/live' },
      { name:'Times Now',     cid:'UCpqXJOEqGS-TCnazcHCo0rA', region:'India',         tags:['India','Breaking'],   yt:'https://www.youtube.com/@TimesNow/live' },
      { name:'NDTV 24x7',     cid:'UCZFMm1mMw0F81Z37aaEzTUA', region:'India',         tags:['India','Analysis'],   yt:'https://www.youtube.com/@NDTV/live' },
      { name:'Africanews',    cid:'UCG-SCEcNi2fEcSjCuKUIOpA', region:'Africa',        tags:['Africa','World'],     yt:'https://www.youtube.com/@africanews/live' },
      { name:'CNA',           cid:'UCJoRs_59sRgPHWTp5RdNDSw', region:'Singapore',     tags:['Asia','Business'],    yt:'https://www.youtube.com/@CNA/live' },
      { name:'TaiwanPlus',    cid:'UCgSUDRsUqGfJSLzpE3JLd3A', region:'Taiwan',        tags:['Asia','World'],       yt:'https://www.youtube.com/@TaiwanPlus/live' },
    ]
  },

  Telugu: {
    flag:'🇮🇳', label:'తెలుగు', color:'#ff8c00',
    channels:[
      { name:'TV9 Telugu',    cid:'UCHkYrJ_xNKif0oCBMaGWZVQ', region:'AP/Telangana', tags:['News','Politics'],    yt:'https://www.youtube.com/@TV9TeluguLive/live' },
      { name:'ETV Telugu',    cid:'UCSs9H1cyB3OHdy8wkit8ZKg', region:'AP/Telangana', tags:['News','Regional'],    yt:'https://www.youtube.com/@etvteluguindia/live' },
      { name:'NTV Telugu',    cid:'UCumtYpCY26F6Jr3satUgMvA', region:'AP/Telangana', tags:['News','Analysis'],    yt:'https://www.youtube.com/@ntvtelugu/live' },
      { name:'ABN Telugu',    cid:'UC_2irx_BQR7RsBKmUV9fePQ', region:'AP/Telangana', tags:['News','Breaking'],    yt:'https://www.youtube.com/@abnlive/live' },
      { name:'V6 News',       cid:'UCDCMjD1XIAsCZsYHNMGVcog', region:'Telangana',    tags:['News','Telangana'],   yt:'https://www.youtube.com/@V6NewsHD/live' },
      { name:'Sakshi TV',     cid:'UCF1BtmDWJQnFtDgVbw9UwMA', region:'AP/Telangana', tags:['News','AP'],          yt:'https://www.youtube.com/@sakshitv/live' },
      { name:'TV5 News',      cid:'UCBiDASFNAhSjNGGdBYbEXSw', region:'AP/Telangana', tags:['News','Regional'],    yt:'https://www.youtube.com/@tv5newsnetwork/live' },
      { name:'Mahaa News',    cid:'UCajCHHFW3gFvgXhfBTSGKJA', region:'AP/Telangana', tags:['News','Telangana'],   yt:'https://www.youtube.com/@MahaaNewsTV/live' },
      { name:'10TV News',     cid:'UCT6UzHT_kODHMqtPNJ0wK_Q', region:'AP/Telangana', tags:['News','AP'],          yt:'https://www.youtube.com/@10tvnewstelugu/live' },
      { name:'HMTV',          cid:'UCGMCYqVQGWoKkCvw4uiHvSg', region:'Telangana',    tags:['News','Hyderabad'],   yt:'https://www.youtube.com/@hmtvnews/live' },
    ]
  },

  Hindi: {
    flag:'🇮🇳', label:'हिन्दी', color:'#ff4444',
    channels:[
      { name:'Aaj Tak',         cid:'UCt4t-jeY85JegMlZ-E5UWtA', region:'India',  tags:['News','Breaking'],  yt:'https://www.youtube.com/@aajtak/live' },
      { name:'ABP News',        cid:'UCRWFSbif-RFENbBrSiez1DA', region:'India',  tags:['News','Politics'],  yt:'https://www.youtube.com/@ABPNews/live' },
      { name:'Zee News',        cid:'UCIvaYmXn910QMdemBG3v1pQ', region:'India',  tags:['News','National'],  yt:'https://www.youtube.com/@ZeeNews/live' },
      { name:'NDTV India',      cid:'UC9CYT9gSNQlFIXHELFbSrig', region:'India',  tags:['News','Analysis'],  yt:'https://www.youtube.com/@ndtvindia/live' },
      { name:'India TV',        cid:'UCttspZesZIDEwwpVIgoZtWQ', region:'India',  tags:['News','Breaking'],  yt:'https://www.youtube.com/@IndiaTV/live' },
      { name:'Republic Bharat', cid:'UC7wXt18f2iA3EDXeqAVuKng', region:'India',  tags:['News','Opinion'],   yt:'https://www.youtube.com/@bharat/live' },
      { name:'TV9 Bharatvarsh', cid:'UCOutOIcn_oho8pyVN3Ng-Pg', region:'India',  tags:['News','National'],  yt:'https://www.youtube.com/@tv9bharatvarsh/live' },
      { name:'News18 India',    cid:'UCKrgZQFs3rB_jACaBb7RNrA', region:'India',  tags:['News','Breaking'],  yt:'https://www.youtube.com/@News18India/live' },
    ]
  },

  Tamil: {
    flag:'🇮🇳', label:'தமிழ்', color:'#aa44ff',
    channels:[
      { name:'Sun News',          cid:'UCsKPrMtHOPCyGKyWJBFEo0Q', region:'Tamil Nadu', tags:['News','Sun'],       yt:'https://www.youtube.com/@SunNewsTV/live' },
      { name:'Thanthi TV',        cid:'UCtbVBZwTMFwCXE7KPnLDzYw', region:'Tamil Nadu', tags:['News','Breaking'],  yt:'https://www.youtube.com/@ThanthiTV/live' },
      { name:'Puthiya Thalaimurai',cid:'UCmq-3ZnCvLhjGkb4jGQHfmA', region:'Tamil Nadu', tags:['News','Analysis'], yt:'https://www.youtube.com/@puthiyathalaimurai/live' },
      { name:'News18 Tamil Nadu', cid:'UC5mOCZm6KtlKaTDQEI-V0Vw', region:'Tamil Nadu', tags:['News','National'],  yt:'https://www.youtube.com/@News18TamilNadu/live' },
      { name:'Polimer News',      cid:'UCfr9y5NpFRSXGBIRhEgQIlg', region:'Tamil Nadu', tags:['News','Regional'],  yt:'https://www.youtube.com/@PolimerNews/live' },
      { name:'Raj News Tamil',    cid:'UCwT4_pPBnvGNFRqPBzEBVvg', region:'Tamil Nadu', tags:['News','Breaking'],  yt:'https://www.youtube.com/@RajNewsTamil/live' },
      { name:'Captain TV',        cid:'UCJBxiVJQJIXxqVlJJVvzgmw', region:'Tamil Nadu', tags:['News','Tamil'],     yt:'https://www.youtube.com/@CaptainTVNews/live' },
      { name:'Jaya TV News',      cid:'UCzT5ym79-g8AQMMcbO7y2Nw', region:'Tamil Nadu', tags:['News','Regional'],  yt:'https://www.youtube.com/@JayaTVOfficial/live' },
    ]
  },

  Malayalam: {
    flag:'🇮🇳', label:'മലയാളം', color:'#00cc66',
    channels:[
      { name:'Asianet News',     cid:'UCuSnUZQBNSwHD22HPUM7frg', region:'Kerala', tags:['News','Breaking'],  yt:'https://www.youtube.com/@AsianetNews/live' },
      { name:'Manorama News',    cid:'UCrqH3dKLQYeTwMFQZSoZETA', region:'Kerala', tags:['News','Analysis'],  yt:'https://www.youtube.com/@ManoramaNews/live' },
      { name:'Mathrubhumi News', cid:'UCBnAFfk87HJXHbWgPcPhh_Q', region:'Kerala', tags:['News','National'],  yt:'https://www.youtube.com/@mathrubhuminews/live' },
      { name:'Reporter TV',      cid:'UCbmtxXqFRDxQXbZFNfh0wAA', region:'Kerala', tags:['News','Breaking'],  yt:'https://www.youtube.com/@ReporterTV/live' },
      { name:'Media One',        cid:'UC8_Y8N3GMRPD3MVDR85Gxhg', region:'Kerala', tags:['News','Kerala'],    yt:'https://www.youtube.com/@MediaoneTVLive/live' },
      { name:'Janam TV',         cid:'UC9x-MRTxNkRcmIPT2bCCNMg', region:'Kerala', tags:['News','Regional'],  yt:'https://www.youtube.com/@JanamTV/live' },
    ]
  },

  Kannada: {
    flag:'🇮🇳', label:'ಕನ್ನಡ', color:'#ffcc00',
    channels:[
      { name:'TV9 Kannada',    cid:'UCMiQBFBzGfFR5YotTwJrdMQ', region:'Karnataka', tags:['News','TV9'],       yt:'https://www.youtube.com/@TV9Kannada/live' },
      { name:'Public TV',      cid:'UCBBnPBPXeJGmW8Ob2DasCiA', region:'Karnataka', tags:['News','Breaking'],  yt:'https://www.youtube.com/@PublicTVKannada/live' },
      { name:'News18 Kannada', cid:'UCS9BDFJLDxRlBQd2N_EPVFA', region:'Karnataka', tags:['News','National'],  yt:'https://www.youtube.com/@News18Kannada/live' },
      { name:'Suvarna News',   cid:'UCo2nHBN2bP98Mb3LTqZ7xkw', region:'Karnataka', tags:['News','Kannada'],   yt:'https://www.youtube.com/@SuvarnaNews/live' },
      { name:'Zee Kannada',    cid:'UCE7tkMGwnBnFHYCMrMPOxkA', region:'Karnataka', tags:['News','Zee'],       yt:'https://www.youtube.com/@ZeeKannadaNews/live' },
    ]
  },

  Marathi: {
    flag:'🇮🇳', label:'मराठी', color:'#ff6600',
    channels:[
      { name:'ABP Majha',    cid:'UCqDGjVBm6bP6-2z-YPAFHbQ', region:'Maharashtra', tags:['News','Breaking'],  yt:'https://www.youtube.com/@ABPMajha/live' },
      { name:'TV9 Marathi',  cid:'UCkzHDfNRNuL18oqJlKAMTTQ', region:'Maharashtra', tags:['News','TV9'],       yt:'https://www.youtube.com/@TV9Marathi/live' },
      { name:'Zee 24 Taas',  cid:'UCkYNGd7RrG0d1o8leFTiSiA', region:'Maharashtra', tags:['News','Zee'],       yt:'https://www.youtube.com/@Zee24Taas/live' },
      { name:'News18 Lokmat',cid:'UCrJDQj7VOFM_8hStNv6LFXQ', region:'Maharashtra', tags:['News','Lokmat'],    yt:'https://www.youtube.com/@News18Lokmat/live' },
    ]
  },

  Arabic: {
    flag:'🌍', label:'العربية', color:'#00aa55',
    channels:[
      { name:'Al Jazeera Arabic', cid:'UChqUTb7kYRX8-EiaN3XFrSQ', region:'Qatar',   tags:['World','Arabic'],   yt:'https://www.youtube.com/@AlJazeeraArabic/live' },
      { name:'Al Arabiya',        cid:'UCn2OJN1wGBmCPz1fHMEFj5g', region:'UAE',     tags:['Gulf','Arabic'],    yt:'https://www.youtube.com/@AlArabiya/live' },
      { name:'Sky News Arabia',   cid:'UCOvBp3_4k8S36DHMvsK1eRw', region:'UAE',     tags:['Arabic','World'],   yt:'https://www.youtube.com/@skynewsarabia/live' },
      { name:'France 24 Arabic',  cid:'UCMXUBgrLJnXYm5tLqkFcqMQ', region:'France',  tags:['Arabic','World'],   yt:'https://www.youtube.com/@France24Arabic/live' },
    ]
  },

  French: {
    flag:'🇫🇷', label:'Français', color:'#3366ff',
    channels:[
      { name:'France 24',    cid:'UCCCzlCKHGvHIxFcMlNfRYEg', region:'France',  tags:['World','Europe'],   yt:'https://www.youtube.com/@france24/live' },
      { name:'BFM TV',       cid:'UCmpPCBK5PbLvezJIGgASFUA', region:'France',  tags:['France','Breaking'],yt:'https://www.youtube.com/@BFMTV/live' },
      { name:'LCI',          cid:'UCmEd3TgMmCpKDUr4GJTK4_A', region:'France',  tags:['France','News'],    yt:'https://www.youtube.com/@LCI/live' },
      { name:'Africanews FR',cid:'UCQGqX5tN_2CJBT1nFBRGCjA', region:'Africa',  tags:['Africa','French'],  yt:'https://www.youtube.com/@africanews_fr/live' },
    ]
  },

};

// ─── Embed URL ────────────────────────────────────────────────────────────────
function eUrl(cid, muted) {
  return `https://www.youtube.com/embed/live_stream?channel=${cid}&autoplay=1&${muted?'mute=1&controls=0':'mute=0&controls=1'}&rel=0&modestbranding=1&iv_load_policy=3`;
}

// ─── HTML ─────────────────────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>LIVEHUB — Global News Monitor</title>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;600;700&family=Rajdhani:wght@700&display=swap" rel="stylesheet"/>
<style>
:root{
  --bg:#06090f;--bg2:#0a1020;--bg3:#0d1525;--panel:#0b1322;
  --border:rgba(0,210,255,.13);--border2:rgba(0,210,255,.06);
  --cyan:#00d2ff;--amber:#ffaa00;--red:#ff3b3b;--dim:#374e60;--bright:#dff0ff;
  --hh:56px;--th:26px;--pw:44%;
  --lang-color:#00d2ff;
}
*,::before,::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:var(--bg);color:#aec4d4;
  font-family:'Barlow Condensed',sans-serif;overflow:hidden}
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;
  background:repeating-linear-gradient(to bottom,transparent 0 3px,rgba(0,0,0,.04) 3px 4px)}

/* ── HEADER ── */
header{height:var(--hh);background:var(--bg2);border-bottom:1px solid var(--border);
  display:flex;align-items:center;padding:0 20px;gap:16px;
  position:fixed;top:0;left:0;right:0;z-index:400}
.logo{font-family:'Rajdhani',sans-serif;font-size:22px;letter-spacing:4px;
  color:var(--lang-color);text-shadow:0 0 24px rgba(0,210,255,.4);
  flex-shrink:0;transition:color .4s,text-shadow .4s}
.logo span{color:var(--dim);font-size:13px;letter-spacing:2px;font-weight:400}
.sep{width:1px;height:22px;background:var(--border);flex-shrink:0}
.badge{display:flex;align-items:center;gap:5px;font-family:'Share Tech Mono',monospace;
  font-size:10px;color:var(--red);letter-spacing:2px;flex-shrink:0}
.rdot{width:7px;height:7px;border-radius:50%;background:var(--red);
  box-shadow:0 0 8px var(--red);animation:blink 1.3s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.75)}}
.mono{font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:1px}
.mono b{color:var(--lang-color);transition:color .4s}
#lang-back{display:none;align-items:center;gap:6px;cursor:pointer;
  font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--dim);
  letter-spacing:1px;border:1px solid var(--border);border-radius:3px;
  padding:4px 10px;transition:all .2s;flex-shrink:0}
#lang-back:hover{border-color:var(--lang-color);color:var(--lang-color)}
#lang-back.show{display:flex}
.sw{position:relative;flex-shrink:0}
#search{background:rgba(0,210,255,.05);border:1px solid var(--border);border-radius:3px;
  padding:5px 10px 5px 26px;font-family:'Share Tech Mono',monospace;font-size:10px;
  color:var(--bright);letter-spacing:1px;width:150px;outline:none;
  transition:border-color .2s;display:none}
#search.show{display:block}
#search::placeholder{color:var(--dim)}
#search:focus{border-color:var(--lang-color)}
.si{position:absolute;left:8px;top:50%;transform:translateY(-50%);
  font-size:11px;color:var(--dim);pointer-events:none}
.spacer{flex:1}
#clock{font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--cyan);letter-spacing:2px}

/* ── MAIN ── */
.main{position:fixed;top:var(--hh);left:0;right:0;bottom:var(--th);overflow:hidden;display:flex}

/* ── LANGUAGE PICKER ── */
#lang-screen{
  position:absolute;inset:0;z-index:10;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:32px;padding:40px 20px;overflow-y:auto;
  background:var(--bg);
  transition:opacity .4s,transform .4s}
#lang-screen.hidden{opacity:0;pointer-events:none;transform:scale(.97)}

.lang-hero{text-align:center}
.lang-hero h1{font-family:'Rajdhani',sans-serif;font-size:clamp(28px,5vw,52px);
  letter-spacing:6px;color:var(--cyan);
  text-shadow:0 0 40px rgba(0,210,255,.35),0 0 80px rgba(0,210,255,.15)}
.lang-hero p{font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--dim);
  letter-spacing:2px;margin-top:8px}

.lang-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
  gap:14px;width:100%;max-width:900px}

.lang-card{
  position:relative;cursor:pointer;
  background:var(--bg2);border:1px solid var(--border2);border-radius:8px;
  padding:22px 16px 18px;
  display:flex;flex-direction:column;align-items:center;gap:10px;
  transition:transform .2s,border-color .2s,box-shadow .2s,background .2s;
  overflow:hidden}
.lang-card::before{
  content:'';position:absolute;inset:0;border-radius:8px;
  background:radial-gradient(circle at 50% 0%,var(--lc,#00d2ff) 0%,transparent 70%);
  opacity:0;transition:opacity .3s}
.lang-card:hover{transform:translateY(-4px);border-color:var(--lc,#00d2ff);
  box-shadow:0 8px 32px rgba(0,0,0,.4),0 0 0 1px var(--lc,#00d2ff);background:var(--bg3)}
.lang-card:hover::before{opacity:.07}

.lang-flag{font-size:32px;line-height:1}
.lang-name{font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--bright);text-align:center}
.lang-native{font-size:14px;color:var(--dim);letter-spacing:1px;text-align:center}
.lang-count{font-family:'Share Tech Mono',monospace;font-size:9px;
  color:var(--lc,#00d2ff);letter-spacing:2px;margin-top:2px}

/* ── CHANNEL GRID SCREEN ── */
#ch-screen{
  position:absolute;inset:0;z-index:9;
  display:flex;flex-direction:column;
  opacity:0;pointer-events:none;
  transition:opacity .35s,transform .35s;
  transform:translateX(30px)}
#ch-screen.show{opacity:1;pointer-events:auto;transform:translateX(0)}

/* grid + panel layout */
.ch-layout{display:flex;flex:1;overflow:hidden}
.ch-grid-wrap{flex:1;overflow-y:auto;padding:12px;
  scrollbar-width:thin;scrollbar-color:var(--border2) transparent}
.ch-grid-wrap::-webkit-scrollbar{width:3px}
.ch-grid-wrap::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
.ch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
.ch-layout.po .ch-grid{grid-template-columns:repeat(auto-fill,minmax(175px,1fr))}

/* ── CARD ── */
.card{position:relative;background:#000;border:1px solid var(--border2);
  border-radius:5px;overflow:hidden;cursor:pointer;aspect-ratio:16/9;
  transition:border-color .2s,box-shadow .2s,transform .18s}
.card:hover{border-color:var(--lang-color);transform:translateY(-2px);
  box-shadow:0 4px 22px rgba(0,0,0,.5),0 0 0 1px var(--lang-color);z-index:2}
.card.active{border-color:var(--lang-color);
  box-shadow:0 0 0 2px var(--lang-color),0 6px 28px rgba(0,0,0,.5)}
.card iframe{position:absolute;inset:0;width:100%;height:100%;border:none;pointer-events:none}

/* loading skin */
.lsk{position:absolute;inset:0;z-index:3;background:var(--bg3);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  transition:opacity .8s 2s}
.lsk.gone{opacity:0;pointer-events:none}
.lsk-nm{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
  color:var(--dim);text-align:center;padding:0 8px}
.lbar{width:48px;height:2px;background:var(--border2);border-radius:1px;overflow:hidden}
.lbar::after{content:'';display:block;width:40%;height:100%;
  background:var(--lang-color);transition:background .4s;
  animation:lb 1.1s ease-in-out infinite}
@keyframes lb{0%{transform:translateX(-200%)}100%{transform:translateX(360%)}}

/* hover overlay */
.hov{position:absolute;inset:0;z-index:4;
  display:flex;flex-direction:column;justify-content:space-between;padding:8px;
  background:linear-gradient(to bottom,rgba(0,0,0,.65) 0%,transparent 40%,transparent 58%,rgba(0,0,0,.86) 100%);
  opacity:0;transition:opacity .2s}
.card:hover .hov,.card.active .hov{opacity:1}
.ht{display:flex;justify-content:space-between;align-items:flex-start}
.hb{display:flex;justify-content:space-between;align-items:flex-end}
.lpill{display:flex;align-items:center;gap:3px;background:rgba(255,59,59,.9);
  border-radius:2px;padding:2px 6px;font-family:'Share Tech Mono',monospace;
  font-size:8px;color:#fff;letter-spacing:1px}
.lpill .rdot{width:4px;height:4px}
.mic{width:20px;height:20px;background:rgba(0,0,0,.55);
  border:1px solid rgba(255,255,255,.14);border-radius:50%;
  display:flex;align-items:center;justify-content:center}
.mic svg{width:10px;height:10px;fill:rgba(255,255,255,.6)}
.cnm{font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
  color:#fff;text-shadow:0 1px 5px rgba(0,0,0,.95)}
.csu{font-family:'Share Tech Mono',monospace;font-size:8px;color:rgba(255,255,255,.4);margin-top:1px}
.chi{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--lang-color);letter-spacing:1px;transition:color .4s}
.cnum{position:absolute;top:6px;right:6px;z-index:5;width:17px;height:17px;
  border-radius:50%;background:rgba(0,0,0,.6);border:1px solid var(--border);
  font-family:'Share Tech Mono',monospace;font-size:7px;color:var(--dim);
  display:flex;align-items:center;justify-content:center}
.card.active .cnum{background:var(--lang-color);color:#000;border-color:var(--lang-color)}

/* ── SIDE PANEL ── */
.sp{width:0;flex-shrink:0;background:var(--panel);border-left:1px solid var(--border);
  display:flex;flex-direction:column;overflow:hidden;
  transition:width .38s cubic-bezier(.22,1,.36,1)}
.ch-layout.po .sp{width:var(--pw)}
.ph{height:44px;padding:0 14px;display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid var(--border2);background:var(--bg2);flex-shrink:0}
.pt{display:flex;align-items:center;gap:9px;overflow:hidden;min-width:0}
.pn{font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--bright);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ps{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--lang-color);
  letter-spacing:1px;transition:color .4s}
.xb{width:27px;height:27px;flex-shrink:0;background:rgba(255,255,255,.03);
  border:1px solid var(--border);border-radius:3px;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--dim);font-size:13px;
  transition:background .15s,border-color .15s,color .15s}
.xb:hover{background:rgba(255,59,59,.1);border-color:var(--red);color:var(--red)}
.pv{position:relative;width:100%;padding-bottom:56.25%;background:#000;flex-shrink:0;overflow:hidden}
.pv iframe{position:absolute;inset:0;width:100%;height:100%;border:none}
.pb{flex:1;overflow-y:auto;padding:13px 15px;display:flex;flex-direction:column;gap:10px;
  scrollbar-width:thin;scrollbar-color:var(--border2) transparent}
.tags{display:flex;flex-wrap:wrap;gap:5px}
.tag{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--lang-color);
  border:1px solid rgba(0,150,190,.22);padding:2px 6px;border-radius:2px;
  text-transform:uppercase;letter-spacing:1px;transition:color .4s}
.ytl{display:flex;align-items:center;gap:7px;padding:8px 10px;
  background:rgba(255,0,0,.07);border:1px solid rgba(255,0,0,.18);border-radius:3px;
  text-decoration:none;font-family:'Share Tech Mono',monospace;font-size:9px;
  color:#ff6666;letter-spacing:1px;transition:background .15s}
.ytl:hover{background:rgba(255,0,0,.13)}
.ytl svg{width:13px;height:13px;fill:#ff6666;flex-shrink:0}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:7px;border-top:1px solid var(--border2);padding-top:10px}
.stat{background:var(--bg3);border:1px solid var(--border2);border-radius:3px;padding:7px 9px}
.sl{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--dim);
  letter-spacing:1px;margin-bottom:2px;text-transform:uppercase}
.sv{font-size:13px;font-weight:600;color:var(--bright)}
.sv.g{color:#00e676}.sv.a{color:var(--amber)}

/* ── NO RESULTS ── */
#nores{display:none;flex-direction:column;align-items:center;justify-content:center;
  height:200px;gap:8px}
#nores.show{display:flex}
.nrt{font-size:18px;font-weight:600;letter-spacing:2px;color:var(--dim)}
.nrs{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--border)}

/* ── TICKER ── */
.ticker{position:fixed;bottom:0;left:0;right:0;height:var(--th);
  background:rgba(6,9,15,.96);border-top:1px solid var(--border2);
  display:flex;align-items:center;overflow:hidden;z-index:500}
.tl{flex-shrink:0;padding:0 10px;height:100%;display:flex;align-items:center;
  font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;
  background:var(--amber);color:#000;font-weight:700}
.tt{flex:1;overflow:hidden;
  mask-image:linear-gradient(to right,transparent,black 3%,black 97%,transparent)}
.ti{display:flex;gap:50px;white-space:nowrap;animation:tick 70s linear infinite}
@keyframes tick{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.ti span{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);flex-shrink:0}
.ti span b{color:#aec4d4}
.corner{position:fixed;width:28px;height:28px;pointer-events:none;z-index:50}
.corner svg{width:100%;height:100%}
.cTL{top:calc(var(--hh)+7px);left:7px}
.cTR{top:calc(var(--hh)+7px);right:7px;transform:scaleX(-1)}
.cBL{bottom:calc(var(--th)+4px);left:7px;transform:scaleY(-1)}
.cBR{bottom:calc(var(--th)+4px);right:7px;transform:scale(-1)}
@media(max-width:768px){
  :root{--pw:85%}
  .ch-grid{grid-template-columns:repeat(2,1fr)!important}
  #search{width:100px}
  .lang-grid{grid-template-columns:repeat(2,1fr)}
}
</style>
</head>
<body>

<header>
  <div class="logo">LIVEHUB <span>// GLOBAL NEWS</span></div>
  <div class="sep"></div>
  <div class="badge"><div class="rdot"></div>ALL LIVE</div>
  <div id="lang-back">← ALL LANGUAGES</div>
  <div class="sep" id="sep-search" style="display:none"></div>
  <div class="sw">
    <span class="si">&#9906;</span>
    <input id="search" type="text" placeholder="FILTER&#8230;" autocomplete="off"/>
  </div>
  <div class="spacer"></div>
  <div class="mono" id="hdr-info">CHOOSE YOUR LANGUAGE</div>
  <div class="sep"></div>
  <div id="clock">--:--:-- UTC</div>
</header>

<div class="main">

  <!-- ── LANGUAGE PICKER ── -->
  <div id="lang-screen">
    <div class="lang-hero">
      <h1>LIVEHUB</h1>
      <p>ALL-IN-ONE GLOBAL NEWS MONITOR &nbsp;·&nbsp; SELECT YOUR LANGUAGE</p>
    </div>
    <div class="lang-grid" id="lang-grid"></div>
  </div>

  <!-- ── CHANNEL SCREEN ── -->
  <div id="ch-screen">
    <div class="ch-layout" id="ch-layout">
      <div class="ch-grid-wrap">
        <div class="ch-grid" id="ch-grid"></div>
        <div id="nores"><div class="nrt">NO CHANNELS</div><div class="nrs">TRY ANOTHER SEARCH</div></div>
      </div>
      <div class="sp" id="sp">
        <div class="ph">
          <div class="pt">
            <div>
              <div class="pn" id="pn">&#8212;</div>
              <div class="ps" id="ps">&#8212;</div>
            </div>
            <div class="badge" style="margin-left:7px"><div class="rdot"></div>LIVE</div>
          </div>
          <div class="xb" id="xb">&#10005;</div>
        </div>
        <div class="pv" id="pv"></div>
        <div class="pb">
          <div class="tags" id="ptags"></div>
          <a class="ytl" id="ytl" href="#" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>
            OPEN ON YOUTUBE
          </a>
          <div class="stats">
            <div class="stat"><div class="sl">Status</div><div class="sv g">&#9679; ON AIR</div></div>
            <div class="stat"><div class="sl">Audio</div><div class="sv a">UNMUTED</div></div>
            <div class="stat"><div class="sl">Region</div><div class="sv" id="preg">&#8212;</div></div>
            <div class="stat"><div class="sl">Language</div><div class="sv" id="plng">&#8212;</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>

</div>

<div class="ticker">
  <div class="tl">LIVEHUB</div>
  <div class="tt"><div class="ti" id="ticker"></div></div>
</div>
<div class="corner cTL"><svg viewBox="0 0 28 28" fill="none"><path d="M0 14L0 0L14 0" stroke="rgba(0,210,255,.18)" stroke-width="1.2"/></svg></div>
<div class="corner cTR"><svg viewBox="0 0 28 28" fill="none"><path d="M0 14L0 0L14 0" stroke="rgba(0,210,255,.18)" stroke-width="1.2"/></svg></div>
<div class="corner cBL"><svg viewBox="0 0 28 28" fill="none"><path d="M0 14L0 0L14 0" stroke="rgba(0,210,255,.18)" stroke-width="1.2"/></svg></div>
<div class="corner cBR"><svg viewBox="0 0 28 28" fill="none"><path d="M0 14L0 0L14 0" stroke="rgba(0,210,255,.18)" stroke-width="1.2"/></svg></div>

<script>
// ── Channel database injected from server ────────────────────────────────────
const DB = ${JSON.stringify(DB)};

// ── State ────────────────────────────────────────────────────────────────────
let curLang   = null;
let activeIdx = null;

// ── Helpers ──────────────────────────────────────────────────────────────────
function setAccent(color) {
  document.documentElement.style.setProperty('--lang-color', color);
}

function eUrl(cid, muted) {
  return 'https://www.youtube.com/embed/live_stream?channel=' + cid +
    '&autoplay=1&' + (muted ? 'mute=1&controls=0' : 'mute=0&controls=1') +
    '&rel=0&modestbranding=1&iv_load_policy=3';
}

// ── Build language picker ────────────────────────────────────────────────────
const langGrid = document.getElementById('lang-grid');
Object.keys(DB).forEach(key => {
  const lang = DB[key];
  const card = document.createElement('div');
  card.className = 'lang-card';
  card.style.setProperty('--lc', lang.color);
  card.innerHTML =
    '<div class="lang-flag">' + lang.flag + '</div>' +
    '<div class="lang-name">' + key + '</div>' +
    (lang.label !== key ? '<div class="lang-native">' + lang.label + '</div>' : '') +
    '<div class="lang-count">' + lang.channels.length + ' CHANNELS</div>';
  card.addEventListener('click', () => selectLang(key));
  langGrid.appendChild(card);
});

// ── Select language ──────────────────────────────────────────────────────────
function selectLang(key) {
  curLang   = key;
  activeIdx = null;
  const lang = DB[key];

  setAccent(lang.color);
  document.getElementById('lang-screen').classList.add('hidden');
  document.getElementById('ch-screen').classList.add('show');
  document.getElementById('lang-back').classList.add('show');
  document.getElementById('search').classList.add('show');
  document.getElementById('sep-search').style.display = '';
  document.getElementById('hdr-info').innerHTML =
    lang.flag + ' <b>' + key + '</b> &nbsp;·&nbsp; <b>' + lang.channels.length + '</b> CHANNELS';

  buildChannelGrid(lang);
  closeSidePanel();
}

// ── Build channel grid ───────────────────────────────────────────────────────
function buildChannelGrid(lang) {
  const grid = document.getElementById('ch-grid');
  grid.innerHTML = '';
  document.getElementById('ch-layout').classList.remove('po');

  lang.channels.forEach((ch, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'card-' + i;
    card.dataset.s = (ch.name + ' ' + ch.region + ' ' + (ch.tags||[]).join(' ')).toLowerCase();

    // Loading skin
    const sk = document.createElement('div');
    sk.className = 'lsk';
    sk.innerHTML = '<div class="lsk-nm">' + ch.name + '</div><div class="lbar"></div>';

    // Iframe
    const ifr = document.createElement('iframe');
    ifr.src = eUrl(ch.cid, true);
    ifr.allow = 'autoplay; encrypted-media; picture-in-picture';
    ifr.loading = 'lazy';
    ifr.addEventListener('load', () => setTimeout(() => sk.classList.add('gone'), 2000));

    // Hover overlay
    const hov = document.createElement('div');
    hov.className = 'hov';
    hov.innerHTML =
      '<div class="ht"><div class="lpill"><div class="rdot"></div>LIVE</div>' +
      '<div class="mic"><svg viewBox="0 0 24 24">' +
        '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>' +
        '<line x1="1" y1="1" x2="23" y2="23" stroke="rgba(255,255,255,.6)" stroke-width="1.5" fill="none"/>' +
      '</svg></div></div>' +
      '<div class="hb"><div>' +
        '<div class="cnm">' + ch.name + '</div>' +
        '<div class="csu">' + ch.region + '</div>' +
      '</div><div class="chi">&#9654; OPEN</div></div>';

    const num = document.createElement('div');
    num.className = 'cnum';
    num.textContent = i + 1;

    card.appendChild(sk);
    card.appendChild(ifr);
    card.appendChild(hov);
    card.appendChild(num);
    card.addEventListener('click', () => openPanel(i, ch));
    grid.appendChild(card);
  });
}

// ── Open side panel ──────────────────────────────────────────────────────────
function openPanel(i, ch) {
  if (activeIdx === i) return;
  activeIdx = i;

  document.querySelectorAll('.card').forEach((c, j) => c.classList.toggle('active', j === i));
  document.getElementById('ch-layout').classList.add('po');

  document.getElementById('pn').textContent   = ch.name;
  document.getElementById('ps').textContent   = ch.region;
  document.getElementById('preg').textContent = ch.region;
  document.getElementById('plng').textContent = curLang;
  document.getElementById('ytl').href         = ch.yt;
  document.getElementById('ptags').innerHTML  =
    (ch.tags||[]).map(t => '<div class="tag">' + t + '</div>').join('');

  const wrap = document.getElementById('pv');
  wrap.innerHTML = '';
  const f = document.createElement('iframe');
  f.src = eUrl(ch.cid, false);
  f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  f.allowFullscreen = true;
  wrap.appendChild(f);
}

// ── Close panel ──────────────────────────────────────────────────────────────
function closeSidePanel() {
  document.getElementById('ch-layout').classList.remove('po');
  document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
  document.getElementById('pv').innerHTML = '';
  activeIdx = null;
}

document.getElementById('xb').addEventListener('click', closeSidePanel);

// ── Back to language picker ──────────────────────────────────────────────────
document.getElementById('lang-back').addEventListener('click', () => {
  curLang = null;
  closeSidePanel();
  document.getElementById('lang-screen').classList.remove('hidden');
  document.getElementById('ch-screen').classList.remove('show');
  document.getElementById('lang-back').classList.remove('show');
  document.getElementById('search').classList.remove('show');
  document.getElementById('sep-search').style.display = 'none';
  document.getElementById('search').value = '';
  document.getElementById('hdr-info').textContent = 'CHOOSE YOUR LANGUAGE';
  setAccent('#00d2ff');
});

// ── Search filter ────────────────────────────────────────────────────────────
document.getElementById('search').addEventListener('input', function () {
  const q = this.value.toLowerCase().trim();
  let n = 0;
  document.querySelectorAll('.card').forEach(c => {
    const v = !q || c.dataset.s.includes(q);
    c.style.display = v ? '' : 'none';
    if (v) n++;
  });
  document.getElementById('nores').classList.toggle('show', n === 0 && !!q);
});

// ── Clock ────────────────────────────────────────────────────────────────────
function tick() {
  const d = new Date(), p = v => String(v).padStart(2, '0');
  document.getElementById('clock').textContent =
    p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) + ' UTC';
}
setInterval(tick, 1000); tick();

// ── Ticker ───────────────────────────────────────────────────────────────────
const tickerItems = [
  'LIVEHUB · ALL-IN-ONE GLOBAL NEWS MONITOR · SELECT YOUR LANGUAGE TO GET STARTED',
  'ENGLISH · TELUGU · HINDI · TAMIL · MALAYALAM · KANNADA · MARATHI · ARABIC · FRANÇAIS',
  '50+ LIVE NEWS CHANNELS FROM AROUND THE WORLD · ALL IN ONE PLACE',
  'CLICK ANY CARD TO OPEN IN SIDE PANEL WITH FULL AUDIO',
  'SEARCH BY CHANNEL NAME OR REGION WITHIN YOUR SELECTED LANGUAGE',
];
const ti = document.getElementById('ticker');
ti.innerHTML = (tickerItems.map(t => '<span><b>&#9632;</b> ' + t + '</span>').join('')).repeat(2);
<\/script>
</body>
</html>`;

// ─── Server ───────────────────────────────────────────────────────────────────
function openBrowser(url) {
  const c = { win32:`start "" "${url}"`, darwin:`open "${url}"`, linux:`xdg-open "${url}"` };
  if (c[process.platform]) exec(c[process.platform]);
}

const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store' });
  res.end(HTML);
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  LIVEHUB — Global News Monitor                        ║');
  console.log('║  All Channels. One Place. Every Language.             ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  Open : ${url}                       ║`);
  console.log('║  Stop : Ctrl + C                                      ║');
  console.log('║                                                       ║');
  console.log('║  Languages: English · Telugu · Hindi · Tamil          ║');
  console.log('║             Malayalam · Kannada · Marathi              ║');
  console.log('║             Arabic · Français                         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  setTimeout(() => openBrowser(url), 600);
});

server.on('error', e => {
  console.error(e.code === 'EADDRINUSE'
    ? `\n✗  Port ${PORT} busy. Set PORT env var or change default.`
    : `\n✗  ${e.message}`);
  process.exit(1);
});
