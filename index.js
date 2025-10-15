document.addEventListener('DOMContentLoaded', () => {
  const $ = document.querySelector.bind(document);
  const $$ = document.querySelectorAll.bind(document);
  const getValue = (k) => {
    return window.localStorage.getItem(k);
  }
  const setValue = (k, v) => {
    window.localStorage.setItem(k, v);
  }
  const getInt = (k) => {
    return parseInt(window.localStorage.getItem(k));
  }
  const getJSON = (k) => {
    return JSON.parse(window.localStorage.getItem(k));
  }
  const setJSON = (k, v) => {
    window.localStorage.setItem(k, JSON.stringify(v));
  }
  const formatTime = (t) => {
    let s = Math.floor(t % 60);
    if (s < 10) s = '0' + s;
    let m = Math.floor(t / 60 % 60);
    if (m < 10) m = '0' + m;
    let h = Math.floor(t / 3600 % 24);
    if (h < 10) h = '0' + h;
    let d = Math.floor(t / 86400);
    if (d < 10) d = '0' + d;
    
    if (d > 0) return `${d}d${h}:${m}:${s}`
    if (h > 0) return `${h}:${m}:${s}`;
    return `${m}:${s}`;
  }
  // 格式化播放次数
  const formatPlayCount = (count) => {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + '万';
    }
    return count.toString();
  }
  class Player {
    constructor() {
      this.player = $('.player');
      this.audio = $('.player audio');
      this.title = $('.song-title');
      this.artist = $('.song-artist');
      this.cover = $('.player-cover');
      this.playPauseBtn = $('.play-pause');
      this.progressBar = $('.progress-bar');
      this.progress = $('.progress');

      this.music = null;
      this.musicList = [];
      this.index = 0;
      this.init();
    }
    
    get paused() {
      return this.audio.paused;
    }
    
    get currentTime() {
      return this.audio.currentTime;
    }
    
    set currentTime(t) {
      this.audio.currentTime = t;
    }
    
    get duration() {
      return this.audio.duration;
    }
    
    init() {
      this.playPauseBtn.addEventListener('click', this.toggle.bind(this));
      this.progressBar.addEventListener('click', (e) => {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.currentTime = percent * this.duration;
      });
      this.audio.addEventListener('timeupdate', this.progressUpdate.bind(this));
      
      // 播放列表
      $('.player-list-btn').addEventListener('click', this.toggleList.bind(this));
      let timer;
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.player')) {
          this.hideList();
        } else {
          this.player.classList.add('hover');
          clearTimeout(timer);
          timer = setTimeout(() => {
            this.player.classList.remove('hover');
          }, 3000);
        }
      });
      
      // 上一曲 / 下一曲
      $('.player-previous').addEventListener('click', this.previousMusic.bind(this));
      $('.player-next').addEventListener('click', this.nextMusic.bind(this));
      
      // 播放结束
      this.audio.addEventListener('ended', this.onEnd.bind(this));
    }
    
    show() {
      this.player.classList.add('active');
    }
    
    renderList() {
      $('.player-list .items').innerHTML = '';
      for (const i of this.musicList) {
        let music = getMusic(i);
        let t = document.createElement('div');
        t.className = 'player-list-item';
        if (this.musicList[this.index] == i) {
          t.classList.add('playing');
        }
        t.innerHTML = `<div>${music.title}</div>`;
        t.onclick = () => {
          this.toMusic(i)
        }
        $('.player-list .items').appendChild(t);
      }
    }
    
    get listShowed() {
      return $('.player-list').classList.contains('active');
    }
    
    showList() { 
      this.renderList();
      $('.player-list').classList.add('active');
    }
    
    hideList() {
      $('.player-list').classList.remove('active');
    }
    
    toggleList() {
      if (this.listShowed) this.hideList();
      else this.showList();
    }
    
    setMusic() {
      this.music = getMusic(this.musicList[this.index]);
      this.audio.src = `musics/${this.music.url}`;
      this.show();
      this.title.textContent = this.music.title;
      this.artist.textContent = this.music.artist;
      this.cover.src = `cover/${this.music.cover}`;
      $('.player .currentTime').innerText = formatTime(0);
      $('.player .duration').innerText = formatTime(this.music.duration);
    }
    
    addMusic(music_id) {
      if (music_id.id) music_id = music_id.id;
      if (this.musicList.indexOf(music_id) === -1) {
        this.musicList.push(music_id);
        setJSON('musicList', this.musicList);
      }
    }
    
    removeMusic(music_id) {
      let t;
      if ((t = this.musicList.indexOf(music_id)) !== -1)
        this.musicList.splice(t, 1);
    }
    
    toMusic(music_id, autoplay=true) {
      let t;
      if ((t = this.musicList.indexOf(music_id)) !== -1) {
        this.index = t;
        setValue('currentMusic', this.index);
        if (this.listShowed) this.renderList();
        this.setMusic();
        if (autoplay) this.play();
      }
    }
    
    nextMusic() {
      if (this.index < this.musicList.length - 1) {
        this.index++;
      } else {
        this.index = 0;
      }
      setValue('currentMusic', this.index);
      if (this.listShowed) this.renderList();
      this.setMusic();
      this.play();
    }

    previousMusic() {
      if (this.index > 0) {
        this.index--;
      } else {
        this.index = this.musicList.length - 1;
      }
      setValue('currentMusic', this.index);
      if (this.listShowed) this.renderList();
      this.setMusic();
      this.play();
    }
    
    play() {
      if (this.musicList.length === 0) return;
      if (!this.paused) return;
      if (!this.music) {
        this.setMusic();
      }
      this.audio.play();
      this.player.classList.add('playing');
    }
    
    pause() {
      if (!this.musicList.length) return;
      if (this.paused) return;
      this.audio.pause();
      this.player.classList.remove('playing');
    }
    
    toggle() {
      if (!this.musicList.length) return;
      if (this.paused) this.play();
      else this.pause();
    }
    
    progressUpdate() {
      $('.player .currentTime').innerText = formatTime(this.currentTime);
      let percent = this.currentTime / this.duration * 100;
      this.progress.style.width = percent + '%';
    }
    
    onEnd() {
      this.nextMusic();
    }
  }
  
  const tags = {
    'vanilla': {
      name: '纯净哈基米',
      bgcolor: 'linear-gradient(135deg, #764ba2, #ff6b9d)',
      color: '#fff',
    },
    'cover': {
      name: '真人翻唱',
      bgcolor: 'linear-gradient(135deg, #ff6b9d, #764ba2)',
      color: '#fff',
    },
    'DingDongJi': {
      name: '叮咚鸡',
      bgcolor: 'brown',
      color: '#fff',
    },
  }
 
  let musicData = [];
  const getMusic = (music_id) => {
    let left = 0;
    let right = musicData.length - 1;
    while (left <= right) {
      let mid = left + Math.floor((right - left) / 2);
      if (musicData[mid].id === music_id) {
        return musicData[mid];
      } else if (musicData[mid].id < music_id) {
        left = mid + 1; // 目标在右半部分
      } else {
        right = mid - 1; // 目标在左半部分
      }
    }
    return -1; // 目标未找到
  }
  let currentTag = 'all';
  let currentSearch = '';
  let player = new Player();
  setupEventListeners();
  fetch('musics.json5').then((r) => r.text()).then((text) => {
    musicData = JSON5.parse(text);

    let t;
    if (t = (new URLSearchParams(window.location.search)).get('search')) {
      $('.search-input').value = t;
      searchMusic(t);
    } else renderMusicGrid(musicData);
    if (getValue('musicList')) {
      player.musicList = getJSON('musicList');
      player.index = getInt('currentMusic') || 0;
      player.show();
      player.setMusic();
    }
  });

  // 渲染音乐网格
  function renderMusicGrid(data) {
    const grid = document.getElementById('musicGrid');
    if (data.length === 0) {
      grid.innerHTML = '<div style="color: #f6f6f6; text-align: center">无结果...</div>';
    } else {
      grid.innerHTML = '';
      for (const music of data) {
        const card = createMusicCard(music);
        grid.appendChild(card);
      }
    }
  }

  // 创建音乐卡片
  function createMusicCard(music) {
    const card = document.createElement('div');
    card.className = 'music-card';
    let tag = music.tags.map(x => `<div class="music-tag" style="background: ${tags[x].bgcolor}">${tags[x].name}</div>`).join('');
    card.innerHTML = `
      <div class="music-cover" style="background-image: url(cover/${music.cover})"></div>
      <div class="music-info">
        <div style="display: flex; justify-content: space-between; align-items: baseline">
          <div class="music-title">${music.title}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: baseline">
          <div class="music-artist">${music.artist}</div>
          <a class="music-bvid" target="_blank" href="https://www.bilibili.com/${music.bvid}" onclick="event.stopPropagation()">${music.bvid}</a>
        </div>
        <div class="music-meta">
          <span class="play-count">▶ ${formatPlayCount(music.playCount)}</span>
          <span class="duration">${formatTime(music.duration)}</span>
        </div>
        <div class="music-tags">${tag}</div>
      </div>
    `;
    
    card.addEventListener('click', (e) => {
      player.addMusic(music);
      player.toMusic(music.id);
    });
    return card;
  }

  // 设置事件监听器
  function setupEventListeners() {
    // 分类标签
    for (const [k, v] of [['all', { name: '全部', bgcolor: 'linear-gradient(135deg, #ff6b9d, #764ba2)', color: '#fff'}], ...Object.entries(tags)]) {
      let tag = document.createElement('div');
      tag.classList.add('tag');
      if (k === 'all') tag.classList.add('active');
      tag.setAttribute('data-tag', k);
      tag.innerText = v.name;
      tag.style.background = v.bgcolor;
      tag.style.color = v.color;
      tag.addEventListener('click', function () {
        $$('.tags .tag').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        filterByTag(this.dataset.tag);
      });
      $('.tags').appendChild(tag);
    }
    
    // 搜索 
    $('.search-box').addEventListener('submit', function (e) {
      e.preventDefault();
      searchMusic((new FormData(this)).get('query'));
    });
    $('.search-input').addEventListener('change', function (e) {
      searchMusic(this.value);
    });
    
    // resize
    window.addEventListener('resize', function() {
      if (window.innerHeight < 400) {
        $('.player').style.display = 'none';
      } else {
        $('.player').style.display = '';
      }
    });
  }

  // 按分类筛选
  function filterByTag(tag) {
    currentTag = tag;
    let filtered = musicData;
    if (tag !== 'all') {
      filtered = filtered.filter(music => music.tags.includes(tag));
    }
    if (currentSearch) {
      filtered = filtered.filter(music => 
        (music.title.toLowerCase().includes(currentSearch.toLowerCase()) ||
        music.artist.toLowerCase().includes(currentSearch.toLowerCase()))
      );
    }
    
    renderMusicGrid(filtered);
  }

  // 搜索音乐
  function searchMusic(query) {
    let params = new URLSearchParams(window.location.search);
    params.set('search', query);
    let url = new URL(window.location.href);
    url.search = params;
    window.history.replaceState(null, '', url);
    currentSearch = query;
    if (!query) {
      let filtered = musicData;
      if (currentTag !== 'all') {
        filtered = filtered.filter(music => music.tags.includes(currentTag))
      }
      renderMusicGrid(filtered);
      return;
    }
    query = query.toLowerCase();
    let filtered = musicData.filter(music => 
      (music.title.toLowerCase().includes(query) ||
      music.artist.toLowerCase().includes(query))
    );
    if (currentTag !== 'all') {
      filtered = filtered.filter(music => music.tags.includes(currentTag))
    }
    
    renderMusicGrid(filtered);
  }

  // 添加键盘快捷键
  document.addEventListener('keydown', function(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      $('.play-pause').click();
    }
  });
});