const $ = (selector) => document.querySelector(selector);
const audio = $('#audioPlayer');
const video = $('#videoPlayer');
const elements = {
  views: document.querySelectorAll('.view'), status: $('#statusTitle'), count: $('#libraryCount'),
  list: $('#trackList'), empty: $('#emptyLibrary'), libraryTitle: $('#libraryTitle'), libraryNumber: $('#libraryNumber'),
  title: $('#nowTitle'), artist: $('#nowArtist'), kind: $('#mediaKind'), art: $('#albumArt'), elapsed: $('#elapsed'),
  duration: $('#duration'), progress: $('#progressFill'), knob: $('#progressKnob'), position: $('#trackPosition'),
  toast: $('#toast'), input: $('#fileInput'), statusImport: $('#importStatus'), shuffle: $('#shuffleToggle b'), repeat: $('#repeatToggle b')
};

let tracks = [];
let activeIndex = -1;
let view = 'homeView';
let libraryKind = 'audio';
let selectedIndex = 0;
let shuffle = false;
let repeat = false;
let toastTimer;
const player = () => (activeIndex >= 0 && tracks[activeIndex]?.kind === 'video' ? video : audio);
const fmt = (seconds) => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00';
const friendlyType = (track) => track.kind === 'video' ? 'Video' : 'Audio';

function showToast(message) {
  clearTimeout(toastTimer); elements.toast.textContent = message; elements.toast.classList.add('visible');
  toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 2100);
}
function setView(next) {
  view = next;
  elements.views.forEach((el) => el.classList.toggle('active', el.id === next));
  elements.status.textContent = next === 'homeView' ? 'iPod' : next === 'nowView' ? 'Now Playing' : next === 'libraryView' ? elements.libraryTitle.textContent : next === 'importView' ? 'Import' : 'Settings';
  if (next === 'libraryView') renderLibrary();
  if (next === 'homeView') selectedIndex = 0;
}
function updateCount() {
  const audioCount = tracks.filter(t => t.kind === 'audio').length, videoCount = tracks.filter(t => t.kind === 'video').length;
  elements.count.textContent = !tracks.length ? 'No songs or videos' : `${audioCount} song${audioCount === 1 ? '' : 's'} · ${videoCount} video${videoCount === 1 ? '' : 's'}`;
}
function renderLibrary() {
  const items = tracks.filter(t => t.kind === libraryKind);
  elements.libraryTitle.textContent = libraryKind === 'audio' ? 'Music' : 'Videos';
  elements.libraryNumber.textContent = items.length;
  elements.list.innerHTML = '';
  elements.empty.style.display = items.length ? 'none' : 'grid';
  items.forEach((track) => {
    const index = tracks.indexOf(track), row = document.createElement('button');
    row.className = `track-row ${index === activeIndex ? 'selected' : ''}`;
    row.innerHTML = `<span class="track-type">${track.kind === 'video' ? '▸' : '♫'}</span><span class="track-copy"><strong>${escapeHtml(track.title)}</strong><span>${friendlyType(track)} · ${track.duration ? fmt(track.duration) : 'Ready to play'}</span></span>`;
    row.addEventListener('click', () => playTrack(index)); elements.list.append(row);
  });
}
function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
function artFor(track) {
  const palettes = [['#1f5a73','#d89f53'],['#712a62','#edb372'],['#334e97','#d45c62'],['#27715e','#d5bc5e'],['#7d4825','#e8c667']];
  const seed = [...track.title].reduce((n,c) => n+c.charCodeAt(0), 0) % palettes.length;
  return `linear-gradient(135deg, ${palettes[seed][0]}, ${palettes[seed][1]})`;
}
function updateNow() {
  const track = tracks[activeIndex];
  if (!track) return;
  elements.title.textContent = track.title; elements.artist.textContent = `${friendlyType(track)} file`;
  elements.kind.textContent = track.kind.toUpperCase(); elements.art.style.background = artFor(track);
}
function playTrack(index) {
  if (!tracks[index]) return;
  const wasPlaying = !player().paused;
  audio.pause(); video.pause();
  activeIndex = index; const track = tracks[index]; const media = player();
  if (media.src !== track.url) { media.src = track.url; media.load(); }
  updateNow(); updateProgress(); renderLibrary(); setView('nowView');
  media.play().catch(() => showToast('Press play to start this file'));
  if (track.kind === 'video') showToast('Video audio is playing — press select for video');
  else if (!wasPlaying) showToast('Now playing');
}
function togglePlayback() {
  if (activeIndex < 0) { if (tracks.length) playTrack(0); else setView('importView'); return; }
  const media = player(); media.paused ? media.play().catch(() => showToast('This file cannot be played in this browser')) : media.pause();
}
function nextTrack(step = 1) {
  if (!tracks.length) return;
  let next = shuffle ? Math.floor(Math.random() * tracks.length) : (activeIndex + step + tracks.length) % tracks.length;
  if (activeIndex < 0) next = 0; playTrack(next);
}
function updateProgress() {
  const media = player(); const duration = media.duration || tracks[activeIndex]?.duration || 0; const current = media.currentTime || 0;
  const percent = duration ? Math.min(100, current / duration * 100) : 0;
  elements.elapsed.textContent = fmt(current); elements.duration.textContent = fmt(duration);
  elements.progress.style.width = `${percent}%`; elements.knob.style.left = `${percent}%`;
  elements.position.textContent = activeIndex >= 0 ? `${activeIndex + 1}/${tracks.length}` : '';
}
function selectCurrent() {
  if (view === 'homeView') { const action = document.querySelectorAll('#mainMenu .menu-item')[selectedIndex]?.dataset.action; if (action) homeAction(action); }
  else if (view === 'nowView' && tracks[activeIndex]?.kind === 'video') openVideo();
}
function homeAction(action) {
  if (action === 'music' || action === 'videos') { libraryKind = action === 'music' ? 'audio' : 'video'; setView('libraryView'); }
  else if (action === 'now') setView(activeIndex >= 0 ? 'nowView' : 'importView');
  else if (action === 'import') setView('importView');
  else if (action === 'settings') setView('settingsView');
}
function openVideo() {
  if (tracks[activeIndex]?.kind !== 'video') return;
  const source = video.src; if (!source) return;
  const popup = window.open('', 'nanoVideo', 'width=880,height=540,resizable=yes');
  if (!popup) { showToast('Allow popups to view video'); return; }
  popup.document.write(`<!doctype html><title>${escapeHtml(tracks[activeIndex].title)}</title><style>body{margin:0;background:#101010;display:grid;place-items:center;height:100vh}video{max-width:100%;max-height:100%;outline:none}</style><video controls autoplay src="${source}"></video>`); popup.document.close();
}
async function importFiles(files) {
  const accepted = [...files].filter(file => file.type.startsWith('audio/') || file.type.startsWith('video/') || /\.(mp3|m4a|wav|aac|ogg|flac|mp4|m4v|mov|webm|avi|mkv)$/i.test(file.name));
  if (!accepted.length) { elements.statusImport.textContent = 'Choose an audio or video file to begin.'; return; }
  elements.statusImport.textContent = `Importing ${accepted.length} file${accepted.length === 1 ? '' : 's'}…`;
  for (const file of accepted) {
    const kind = file.type.startsWith('video/') || /\.(mp4|m4v|mov|webm|avi|mkv)$/i.test(file.name) ? 'video' : 'audio';
    const url = URL.createObjectURL(file); const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
    const probe = document.createElement(kind); probe.preload = 'metadata'; probe.src = url;
    const duration = await new Promise(resolve => { probe.onloadedmetadata = () => resolve(probe.duration); probe.onerror = () => resolve(0); setTimeout(() => resolve(0), 3000); });
    tracks.push({ title, file, url, kind, duration });
  }
  updateCount(); elements.statusImport.textContent = `${accepted.length} file${accepted.length === 1 ? '' : 's'} added to your library.`;
  showToast(`${accepted.length} media file${accepted.length === 1 ? '' : 's'} imported`);
}

document.querySelectorAll('#mainMenu .menu-item').forEach((button, i) => button.addEventListener('click', () => { selectedIndex = i; homeAction(button.dataset.action); }));
$('#menuButton').addEventListener('click', () => setView(view === 'homeView' ? 'homeView' : 'homeView'));
$('#selectButton').addEventListener('click', selectCurrent);
$('#playButton').addEventListener('click', togglePlayback);
$('#previousButton').addEventListener('click', () => { const media = player(); if (media.currentTime > 3) { media.currentTime = 0; } else nextTrack(-1); });
$('#nextButton').addEventListener('click', () => nextTrack(1));
elements.input.addEventListener('change', e => importFiles(e.target.files));
const dropzone = $('#dropzone'); ['dragenter','dragover'].forEach(type => dropzone.addEventListener(type, e => { e.preventDefault(); dropzone.classList.add('dragging'); })); ['dragleave','drop'].forEach(type => dropzone.addEventListener(type, e => { e.preventDefault(); dropzone.classList.remove('dragging'); })); dropzone.addEventListener('drop', e => importFiles(e.dataTransfer.files));
$('#shuffleToggle').addEventListener('click', () => { shuffle = !shuffle; elements.shuffle.textContent = shuffle ? 'On' : 'Off'; });
$('#repeatToggle').addEventListener('click', () => { repeat = !repeat; elements.repeat.textContent = repeat ? 'One' : 'Off'; });
$('#clearLibrary').addEventListener('click', () => { if (!tracks.length) return; audio.pause(); video.pause(); tracks.forEach(t => URL.revokeObjectURL(t.url)); tracks = []; activeIndex = -1; updateCount(); showToast('Library reset'); });
$('#progressWrap').addEventListener('click', e => { const media = player(), rect = e.currentTarget.querySelector('.progress-line').getBoundingClientRect(); if (media.duration) media.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * media.duration; });
[audio, video].forEach(media => { media.addEventListener('timeupdate', updateProgress); media.addEventListener('loadedmetadata', () => { if (tracks[activeIndex]) { tracks[activeIndex].duration = media.duration; updateProgress(); renderLibrary(); }}); media.addEventListener('play', () => $('#playIcon').textContent = '❚❚'); media.addEventListener('pause', () => $('#playIcon').textContent = '▶'); media.addEventListener('ended', () => { if (repeat) { media.currentTime = 0; media.play(); } else nextTrack(1); }); media.addEventListener('error', () => { if (media.src) showToast('This format is not supported by your browser'); }); });
document.addEventListener('keydown', e => { if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return; if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (view === 'homeView') { selectedIndex = (selectedIndex + (e.key === 'ArrowDown' ? 1 : -1) + 5) % 5; document.querySelectorAll('#mainMenu .menu-item').forEach((el,i)=>el.classList.toggle('selected',i===selectedIndex)); } } else if (e.key === 'Enter') selectCurrent(); else if (e.key === ' '){ e.preventDefault(); togglePlayback(); } else if (e.key === 'ArrowRight') nextTrack(1); else if (e.key === 'ArrowLeft') $('#previousButton').click(); else if (e.key === 'Escape') setView('homeView'); });
let wheelAngle; $('#wheel').addEventListener('pointerdown', e => { if (e.target.closest('button')) return; const r = e.currentTarget.getBoundingClientRect(); wheelAngle = Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2); e.currentTarget.setPointerCapture(e.pointerId); }); $('#wheel').addEventListener('pointermove', e => { if (wheelAngle == null || view !== 'homeView') return; const r = e.currentTarget.getBoundingClientRect(), angle = Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2), diff = angle-wheelAngle; if (Math.abs(diff)>.22) { selectedIndex = (selectedIndex + (diff>0?1:-1) + 5)%5; document.querySelectorAll('#mainMenu .menu-item').forEach((el,i)=>el.classList.toggle('selected',i===selectedIndex)); wheelAngle = angle; }}); ['pointerup','pointercancel'].forEach(type => $('#wheel').addEventListener(type,()=>wheelAngle=null));
updateCount();
