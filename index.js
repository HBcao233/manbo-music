document.addEventListener('DOMContentLoaded', () => {
  const $ = document.querySelector.bind(document);
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
    }
    
    setMusic(music) {
      this.music = music;
      this.audio.src = `musics/${music.url}`;
      this.player.classList.add('active');
      this.title.textContent = music.title;
      this.artist.textContent = music.artist;
      this.cover.src = `musics/${music.cover}`;
      $('.player .currentTime').innerText = formatTime(0);
      $('.player .duration').innerText = formatTime(music.duration);
    }
    
    play() {
      if (!this.music) return;
      if (!this.paused) return;
      this.audio.play();
      this.player.classList.add('playing');
    }
    
    pause() {
      if (!this.music) return;
      if (this.paused) return;
      this.audio.pause();
      this.player.classList.remove('playing');
    }
    
    toggle() {
      if (!this.music) return;
      if (this.paused) this.play();
      else this.pause();
    }
    
    progressUpdate() {
      $('.player .currentTime').innerText = formatTime(this.currentTime);
      let percent = this.currentTime / this.duration * 100;
      this.progress.style.width = percent + '%';
    }
  }
  
  const categories = {
    'vanilla': {
      name: '纯净哈基米',
      color: 'linear-gradient(135deg, #ff6b9d, #764ba2)',
    },
  }
  let musicData = [];
  fetch('musics.json5').then((r) => r.text()).then((text) => {
    musicData = JSON5.parse(text);
    console.log(musicData)
    renderMusicGrid(musicData);
  });

  let currentCategory = 'all';
  let currentMusic = null;
  let isPlaying = false;
  let player = new Player();
  setupEventListeners();

  // 渲染音乐网格
  function renderMusicGrid(data) {
    const grid = document.getElementById('musicGrid');
    grid.innerHTML = '';
    
    for (const music of data) {
      const card = createMusicCard(music);
      grid.appendChild(card);
    }
  }

  // 创建音乐卡片
  function createMusicCard(music) {
    const card = document.createElement('div');
    card.className = 'music-card';
    card.innerHTML = `
      <div class="music-cover" style="background-image: url(musics/${music.cover})"></div>
      <div class="music-info">
        <div style="display: flex; justify-content: space-between; align-items: baseline">
          <div class="music-title">${music.title}</div>
          <div class="music-category" style="background: ${categories[music.category].color}">${categories[music.category].name}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: baseline">
          <div class="music-artist">${music.artist}</div>
          <a class="music-bvid" target="_blank" href="https://www.bilibili.com/${music.bvid}" onclick="event.stopPropagation()">${music.bvid}</a>
        </div>
        <div class="music-meta">
              <span class="play-count">▶ ${formatPlayCount(music.playCount)}</span>
              <span class="duration">${formatTime(music.duration)}</span>
          </div>
      </div>
    `;
    
    card.addEventListener('click', (e) => {
      player.setMusic(music);
      player.play();
    });
    return card;
  }

  // 格式化播放次数
  function formatPlayCount(count) {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + '万';
    }
    return count.toString();
  }

  // 设置事件监听器
  function setupEventListeners() {
    // 分类标签
    document.querySelectorAll('.category-tags .tag').forEach(tag => {
      tag.addEventListener('click', function() {
          document.querySelectorAll('.category-tags .tag').forEach(t => t.classList.remove('active'));
          this.classList.add('active');
          
          const category = this.dataset.category;
          filterByCategory(category);
      });
    });
  }

  // 按分类筛选
  function filterByCategory(category) {
    currentCategory = category;
    let filtered = musicData;
    
    if (category !== 'all') {
      filtered = musicData.filter(music => music.category === category);
    }
    
    renderMusicGrid(filtered);
  }

  // 搜索音乐
  function searchMusic(query) {
    if (!query) {
      renderMusicGrid(
        currentCategory === 'all' 
        ? musicData : 
        musicData.filter(music => music.category === currentCategory)
      );
      return;
    }
    
    const filtered = musicData.filter(music => 
      music.title.toLowerCase().includes(query) ||
      music.artist.toLowerCase().includes(query)
    );
    
    renderMusicGrid(filtered);
  }

  // 添加键盘快捷键
  document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && player.music) {
      e.preventDefault();
      document.getElementById('playPauseBtn').click();
    }
  });
});