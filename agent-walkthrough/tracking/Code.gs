/**
 * Realtor.com+ walkthrough: user-test tracking.
 *
 * A Google Apps Script bound to a Google Sheet. The prototype posts batches of events to this
 * web app; they land on the `Events` tab. `refreshSummary()` rebuilds the `Sessions`, `Tours`
 * and `Steps` tabs from them. Setup is in tracking/README.md.
 *
 * Write-only: there is no read route. The Sheet itself is protected by Google sharing.
 */

var EVENTS = 'Events';
// One column per field the app sends. Anything else goes into `extra` as JSON.
var COLUMNS = ['t', 'sid', 'pid', 'seq', 'name', 'layout', 'vw', 'vh', 'tour', 'step', 'steps',
  'stepId', 'title', 'how', 'reason', 'dwellMs', 'blocked', 'hint', 'showMe', 'action', 'source',
  'choice', 'totalMs', 'stepsViewed', 'back', 'showMeClicks', 'stuck', 'longDwell', 'afterMs', 'extra'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('WRITE_TOKEN');
    if (!token || body.token !== token) return text_('forbidden');
    var events = body.events || [];
    if (!events.length) return text_('ok');
    var rows = events.map(function (ev) {
      var extra = {};
      Object.keys(ev).forEach(function (k) { if (COLUMNS.indexOf(k) < 0) extra[k] = ev[k]; });
      return COLUMNS.map(function (c) {
        if (c === 'extra') return Object.keys(extra).length ? JSON.stringify(extra) : '';
        return ev[c] === undefined || ev[c] === null ? '' : ev[c];
      });
    });
    var sheet = eventsSheet_();
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, COLUMNS.length).setValues(rows);
    return text_('ok');
  } catch (err) {
    return text_('error');
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return text_('walkthrough tracking endpoint'); }

function text_(s) { return ContentService.createTextOutput(s); }

function eventsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(EVENTS);
  if (!sheet) {
    sheet = ss.insertSheet(EVENTS);
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Run once from the editor: creates the tabs and the menu. Then set WRITE_TOKEN in Project Settings. */
function setup() {
  eventsSheet_();
  refreshSummary();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Walkthrough')
    .addItem('Refresh summary', 'refreshSummary')
    .addToUi();
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function readEvents_() {
  var sheet = eventsSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, COLUMNS.length).getValues();
  return values.map(function (r) {
    var o = {};
    COLUMNS.forEach(function (c, i) { o[c] = r[i]; });
    return o;
  });
}

function median_(xs) {
  if (!xs.length) return '';
  var s = xs.slice().sort(function (a, b) { return a - b; });
  var m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function pct_(n, d) { return d ? Math.round((n / d) * 1000) / 10 : ''; }

function writeTab_(name, header, rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.clear();
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (rows.length) sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, header.length);
}

function refreshSummary() {
  var ev = readEvents_();

  // Sessions: one row per participant session.
  var sessions = {};
  ev.forEach(function (e) {
    var s = sessions[e.sid] || (sessions[e.sid] = {
      sid: e.sid, pid: e.pid, layout: e.layout, first: e.t, last: e.t,
      started: {}, completed: {}, abandoned: 0, back: 0, showMe: 0, blocked: 0, stuck: 0,
    });
    if (e.t > s.last) s.last = e.t;
    if (e.t < s.first) s.first = e.t;
    if (e.pid) s.pid = e.pid;
    if (e.name === 'tour_start') s.started[e.tour] = true;
    if (e.name === 'tour_complete') s.completed[e.tour] = true;
    if (e.name === 'tour_abandon') s.abandoned++;
    if (e.name === 'step_exit') { if (e.reason === 'back') s.back++; if (e.showMe === true || e.showMe === 'TRUE') s.showMe++; s.blocked += Number(e.blocked) || 0; }
    if (e.name === 'stuck') s.stuck++;
  });
  var sessionRows = Object.keys(sessions).map(function (k) {
    var s = sessions[k];
    return [s.sid, s.pid, s.layout, s.first, s.last, Object.keys(s.started).length, Object.keys(s.completed).length,
      s.abandoned, s.back, s.showMe, s.blocked, s.stuck];
  });
  writeTab_('Sessions', ['sid', 'pid', 'layout', 'first seen', 'last seen', 'tours started', 'tours completed',
    'abandons', 'back', 'show me', 'blocked clicks', 'stuck'], sessionRows);

  // Tours: starts, completions and completion rate, per tour and layout.
  var tours = {};
  ev.forEach(function (e) {
    if (!e.tour) return;
    ['all', e.layout].forEach(function (lay) {
      var k = e.tour + '|' + lay;
      var t = tours[k] || (tours[k] = { tour: e.tour, layout: lay, started: {}, completed: {}, abandons: 0, totals: [] });
      if (e.name === 'tour_start') t.started[e.sid] = true;
      if (e.name === 'tour_complete') { t.completed[e.sid] = true; if (e.totalMs) t.totals.push(Number(e.totalMs)); }
      if (e.name === 'tour_abandon') t.abandons++;
    });
  });
  var tourRows = Object.keys(tours).sort().map(function (k) {
    var t = tours[k];
    var st = Object.keys(t.started).length, co = Object.keys(t.completed).length;
    return [t.tour, t.layout, st, co, pct_(co, st), t.abandons, median_(t.totals)];
  });
  writeTab_('Tours', ['tour', 'layout', 'sessions started', 'sessions completed', 'completion %', 'abandons', 'median time (ms)'], tourRows);

  // Steps: where people slow down, go back, click the dim, ask to be shown, or give up.
  var steps = {};
  ev.forEach(function (e) {
    if (!e.stepId) return;
    var k = e.layout + '|' + e.stepId;
    var s = steps[k] || (steps[k] = { layout: e.layout, stepId: e.stepId, tour: e.tour, step: e.step, title: e.title,
      views: 0, dwell: [], back: 0, showMe: 0, blocked: 0, stuck: 0, long: 0, abandon: 0 });
    if (e.title) s.title = e.title;
    if (e.name === 'step_view') s.views++;
    if (e.name === 'step_exit') {
      if (e.dwellMs !== '') s.dwell.push(Number(e.dwellMs));
      if (e.reason === 'back') s.back++;
      if (e.reason === 'end') s.abandon++;
      if (e.showMe === true || e.showMe === 'TRUE') s.showMe++;
      s.blocked += Number(e.blocked) || 0;
    }
    if (e.name === 'stuck') s.stuck++;
    if (e.name === 'long_dwell') s.long++;
  });
  var stepRows = Object.keys(steps).map(function (k) {
    var s = steps[k];
    var v = s.views || 1;
    // Friction score: per view, weighting giving up and getting stuck highest.
    var friction = Math.round(((s.abandon * 3 + s.stuck * 3 + s.long * 1.5 + s.back * 1 + s.showMe * 1 + s.blocked * 0.5) / v) * 100) / 100;
    return [s.layout, s.tour, s.step, s.title, s.views, median_(s.dwell), pct_(s.back, v), pct_(s.showMe, v),
      s.blocked, s.stuck, s.long, s.abandon, friction];
  }).sort(function (a, b) { return b[12] - a[12]; });
  writeTab_('Steps', ['layout', 'tour', 'step', 'title', 'views', 'median dwell (ms)', 'back %', 'show me %',
    'blocked clicks', 'stuck', 'long dwell', 'abandons here', 'friction score'], stepRows);
}
