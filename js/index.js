document.addEventListener('DOMContentLoaded', () => {
  class Player {
    #mode = 0;
    modes = ['list_cycle', 'one_cycle', 'random'];
    
    constructor() {
      this.player = $('.player');
      this.audio = $('.player audio');
      if (getInt('volume')) {
        const volume = parseInt(getValue('volume'));
        $('.player-volume-input').value = volume;
        this.audio.volume = volume / 100;
        $('.player-volume-value').innerText = volume;
      } else {
        this.audio.volume = 0.5;
      }
      this.title = $('.song-title');
      this.artist = $('.song-artist');
      this.cover = $('.player-cover');
      this.playPauseBtn = $('.play-pause');
      this.progressBar = $('.progress-bar');
      this.progress = $('.progress');

      this.music = null;
      this.musicList = [];
      this.index = 0;
      if (getValue('musicList')) {
        try {
          this.musicList = getJSON('musicList');
        } catch(e) {}
      }
      if (this.musicList.length > 0) {
        this.index = getInt('currentMusic') || 0;
        this.show();
        this.setMusic();
      }
      this.randomList = [];
      if (getInt('mode')) {
        this.mode = getInt('mode');
      }
      this.init();
    }
    
    get mode() {
      return this.#mode;
    }
    
    set mode(v) {
      v = parseInt(v) || 0;
      if (v > 2) v = 0;
      this.#mode = v;
      setValue('mode', v)
      $('.player-mode').dataset.mode = this.modes[v];
      $('.player-mode-list').dataset.mode = this.modes[v];
      if (this.musicList.length == 0) return;
      if (v !== 2) {
        if (this.randomList.length != 0) {
          this.toMusic(this.randomList[this.index], false)
        }
      } else {
        if (this.randomList.length == 0 && getValue('randomList')) {
          this.randomList = getJSON('randomList');
        }
        if (this.randomList.length == 0) {
          this.shuffleList();
          this.index = 0;
        }
        this.setMusic();
      }
      if (this.layerShowed('list')) this.renderList();
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
    
    get volume() {
      return this.audio.volume;
    }
    
    set volume(v) {
      this.audio.volume = v;
    }
    
    init() {
      this.playPauseBtn.addEventListener('click', this.toggle.bind(this));
      this.progressBar.addEventListener('click', (e) => {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.currentTime = percent * this.duration;
      });
      this.audio.addEventListener('timeupdate', this.progressUpdate.bind(this));
      
      // 上一曲 / 下一曲
      $('.player-previous').addEventListener('click', this.previousMusic.bind(this));
      $('.player-next').addEventListener('click', this.nextMusic.bind(this));
      
      // 播放结束
      this.audio.addEventListener('ended', this.onEnd.bind(this));
      
      // 播放列表
      $('.player-list-btn').addEventListener('click', this.toggleLayer.bind(this, 'list'));
      let timer = null;
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.player')) {
          this.hideLayer('list');
        } else {
          this.player.classList.add('hover');
          clearTimeout(timer);
          timer = setTimeout(() => {
            if ($('.player:has(.player-layer.active)')) return;
            if ($('.player:has(.tooltip.show)')) return;
            this.player.classList.remove('hover');
          }, 3000);
        }
      });
      
      // 歌词
      $('.player-lyric-btn').addEventListener('click', this.toggleLayer.bind(this, 'lyric'));
      
      let lyric_scroll_timer = null;
      const preventAutoScroll = () => {
        $('.player-lyric .items').scrolling = true;
        clearTimeout(lyric_scroll_timer);
        lyric_scroll_timer = setTimeout(() => {
          $('.player-lyric .items').scrolling = false;
        }, 2000);
      }
      $('.player-lyric .items').addEventListener('wheel', () => {
        preventAutoScroll()
      })
      $('.player-lyric .items').addEventListener('touchmove', (e) => {
        preventAutoScroll()
      })
      
      // 音量
      $('.player-volume-input').addEventListener('input', () => {
        const v = $('.player-volume-input').value;
        $('.player-volume-value').innerText = v;
        this.volume = v / 100;
        setValue('volume', v);
        $('.player-volume i').classList.remove('fa-volume', 'fa-volume-off', 'fa-volume-low', 'fa-volume-high')
        if (v == 0) {
          $('.player-volume i').classList.add('fa-volume-off');
        } else if (v > 66) {
          $('.player-volume i').classList.add('fa-volume-high');
        } else if (v > 33) {
          $('.player-volume i').classList.add('fa-volume');
        } else {
          $('.player-volume i').classList.add('fa-volume-low');
        }
      });
      
      $('.player-mode').addEventListener('click', () => { this.mode++ });
      $('.player-mode-list').addEventListener('click', () => { this.mode++ });
      
      // 清空播放列表
      $('.player-list-clear').addEventListener('click', this.clearList.bind(this));
    }
    
    show() {
      this.player.classList.add('active');
    }
    
    renderList() {
      $('.player-list .items').innerHTML = '';
      const list = this.mode != 2 ? this.musicList : this.randomList;
      for (const i of list) {
        let music = getMusic(i);
        let t = document.createElement('div');
        t.className = 'player-list-item';
        if (list[this.index] == i) {
          t.classList.add('playing');
        }
        t.innerHTML = `<div class="player-item-info"><div class="player-list-title">${music.title}</div><div class="player-list-artist">&nbsp;·&nbsp;${music.artist}</div></div>`;
        t.onclick = () => {
          this.toMusic(i);
        }
        let d = tag('div', {
          class: 'player-item-delete',
          innerHTML: '<i class="fas fa-xmark"></i>',
          onclick: (e) => {
            e.stopPropagation();
            this.deleteMusic(music.id);
          },
        });
        t.appendChild(d);
        $('.player-list .items').appendChild(t);
      }
    }
    
    clearList() {
      this.musicList = [];
      this.randomList = [];
      this.index = 0;
      setJSON('musicList', []);
      setJSON('randomList', []);
      setValue('currentMusic', 0);
      this.player.classList.remove('active');
      if (this.layerShowed('list')) this.renderList();
      this.setMusic();
    }
    
    setList(list) {
      this.musicList = [...list];
      if (this.mode == 2) this.shuffleList();
      this.index = 0;
    }
    
    shuffleList() {
      this.randomList = shuffle([...this.musicList]);
      setJSON('randomList', this.randomList);
    }
    
    layerShowed(target='list') {
      return $('.player-' + target).classList.contains('active');
    }
    
    showLayer(target='list') {
      const t = $('.player-layer.active');
      if (t && !t.classList.contains('player-' + target)) {
        t.classList.remove('active');
      }
      if (target == 'list') this.renderList();
      $('.player-' + target).classList.add('active');
      $('.player').classList.add('hover');
    }
    
    hideLayer(target='list') {
      $('.player-' + target).classList.remove('active');
      $('.player').classList.remove('hover');
    }
    
    toggleLayer(target='list') {
      if (this.layerShowed(target)) this.hideLayer(target);
      else this.showLayer(target);
    }
    
    setMusic() {
      const list = this.mode !== 2 ? this.musicList : this.randomList;
      const music_id = list[this.index];
      if (!music_id) {
        this.pause();
        this.music = null;
        this.audio.src = ``;
        this.title.textContent = '哈基米音乐';
        this.artist.textContent = '';
        this.cover.src = `https://images.unsplash.com/photo-1511379938547-c1f69419868d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80`;
        return;
      }
      this.music = getMusic(music_id);
      this.audio.src = `musics/${this.music.url}`;
      this.show();
      this.title.textContent = this.music.title;
      this.artist.textContent = this.music.artist;
      this.cover.src = `cover/${this.music.cover}`;
      $('.player .currentTime').innerText = formatTime(0);
      $('.player .duration').innerText = formatTime(this.music.duration);
      this.renderLyric();
    }
    
    addMusic(music_id) {
      if (music_id.id) music_id = music_id.id;
      if (this.musicList.indexOf(music_id) === -1) {
        this.musicList.push(music_id);
        setJSON('musicList', this.musicList);
      }
      if (this.mode === 2) this.shuffleList();
    }
    
    removeMusic(music_id) {
      let t;
      if ((t = this.musicList.indexOf(music_id)) !== -1) this.musicList.splice(t, 1);
      if (this.mode === 2) this.shuffleList();
    }
    
    toMusic(music_id, autoplay=true) {
      const list = this.mode !== 2 ? this.musicList : this.randomList;
      const index = list.indexOf(music_id);
      if (index === -1) return;
      
      this.index = index;
      setValue('currentMusic', this.index);
      if (this.layerShowed('list')) this.renderList();
      this.setMusic();
      if (autoplay) this.play();
    }
    
    deleteMusic(music_id) {
      const index = this.musicList.indexOf(music_id);
      const index_random = this.randomList.indexOf(music_id);
      
      if (index === -1 && this.index_random === -1) return;
      if (index !== -1) {
        this.musicList.splice(index);
        setJSON('musicList', this.musicList);
      }
      if (index_random !== -1) {
        this.randomList.splice(index_random, 1);
        setJSON('randomList', this.randomList);
      }
      
      const camp_index = this.mode === 2 ? index_random : index;
      if (camp_index == this.index) {
        this.pause();
        if (this.index > 0) {
          this.index--;
          setValue('currentMusic', this.index);
        }
        this.setMusic();
      }
      
      if (this.layerShowed('list')) this.renderList();
    }
    
    nextMusic() {
      if (this.index < this.musicList.length - 1) {
        this.index++;
      } else {
        this.shuffleList();
        this.index = 0;
      }
      setValue('currentMusic', this.index);
      if (this.layerShowed('list')) this.renderList();
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
      if (this.layerShowed('list')) this.renderList();
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
      
      if (this.music && this.music.lyrics) {
        let index = 0;
        while (this.music.lyrics[index] && this.music.lyrics[index].time <= this.currentTime + 0.01) {
          index++;
        }
        index--;
        let t;
        if (t = $('.player-lyric div.playing')) t.classList.remove('playing');
        if (t = $(`.player-lyric div[data-index="${index}"]`)) {
          t.classList.add('playing');
          if (!$('.player-lyric .items').scrolling) {
            $('.player-lyric .items').codeScroll = true;
            scrollTo(
              $('.player-lyric .items'),
              t.offsetTop - 100,
              300,
            );
          }
        }
      }
    }
    
    onEnd() {
      switch (this.mode) {
        case 1:
          this.currentTime = 0;
          this.play();
          break;
        // 'random'
        // 'list_cycle'
        default:
          this.nextMusic();
      }
    }
    
    renderLyric() {
      if (!this.music.lyric) {
        $('.player-lyric .items').innerHTML = '<div style="color: #555555; display: flex; justify-content: center; font-size: 14px">暂无歌词...</div>';
        return;
      }
      $('.player-lyric .items').innerHTML = '';
      fetch(`lyric/${this.music.lyric}`).then(r => r.text()).then(text => {
        const lines = text.split('\n'); // 按行分割
        this.music.lyrics = [];
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/; // 正则表达式匹配时间戳和歌词
        let index = 0;
        lines.forEach(line => {
          const match = line.match(timeRegex);
          if (!match) return;
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const milliseconds = parseInt(match[3], 10);
          const time = minutes * 60 + seconds + milliseconds / 1000;
          const lyricText = match[4];
  
          // 存储解析后的数据
          this.music.lyrics.push({
            time: time,
            text: lyricText
          });
          let t = document.createElement('div');
          t.classList.add('lyric')
          t.dataset.index = index;
          t.dataset.time = formatTime(time);
          t.innerText = lyricText;
          t.onclick = () => {
            this.currentTime = time;
          }
          $('.player-lyric .items').appendChild(t);
          index++;
        });
      });
      
    }
    
  }
  
  const tags = {
    'vanilla': {
      name: '纯净哈基米',
      bgcolor: 'linear-gradient(135deg, #764ba2, #ff6b9d)',
      color: '#fff',
    },
    'manbo': {
      name: '歌姬曼波',
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
    'HaNiuMo': {
      name: '哈牛魔',
      bgcolor: 'brown',
      color: '#fff',
    },
    'ai': {
      name: 'AI歌曲',
      bgcolor: '#c139ff',
      color: '#fff',
    },
    'classical': {
      name: '古典哈基米',
      bgcolor: '#e87c56',
      color: '#fff',
    },
    'affectionate': {
      name: '猫儿这个深情',
      bgcolor: '#f6495c',
      color: '#fff',
    },
    'GuiChu': {
      name: '鬼畜',
      bgcolor: 'brown',
      color: '#fff',
    },
    'DianGun': {
      name: '电棍',
      bgcolor: 'brown',
      color: '#fff',
    },
    'PangBaoBao': {
      name: '胖宝宝',
      bgcolor: 'brown',
      color: '#fff',
    },
    'LiLiYuanShangMi': {
      name: '离离原上咪',
      bgcolor: 'brown',
      color: '#fff',
    },
    'GuanTouYinXiao': {
      name: '罐头音效',
      bgcolor: 'brown',
      color: '#fff',
    },
    'GuGuGaGa': {
      name: '咕咕嘎嘎',
      bgcolor: 'brown',
      color: '#fff',
    },
    'ShiDaiShaoNianTuan': {
      name: '石代少年团',
      bgcolor: 'brown',
      color: '#fff',
    },
  }
 
  const musicData = window['musicData'];
  delete window['musicData'];
  const getMusic = (music_id) => {
    return musicData[music_id - 1];
    /*let left = 0;
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
    return -1; // 目标未找到*/
  }
  let p = 1;
  let currentTag = 'all';
  let currentSearch = '';
  let player = new Player();
  setupEventListeners();
  (() => {
    let t;
    let params = (new URLSearchParams(window.location.search));
    if (t = params.get('p')) {
      p = t;
    }
    if (t = params.get('tag')) {
      currentTag = t;
    }
    if (t = params.get('search')) {
      $('.search-input').value = t;
      currentSearch = t;
    } 
    renderMusicGrid();
  })();

  // 渲染音乐网格
  function renderMusicGrid() {
    let data = musicData;
    if (currentTag !== 'all') {
      data = data.filter(music => music.tags.includes(currentTag));
    }
    if (currentSearch) {
      data = data.filter(music => 
        (music.title.toLowerCase().includes(currentSearch.toLowerCase()) ||
        music.artist.toLowerCase().includes(currentSearch.toLowerCase()))
      );
    }
    
    const grid = document.getElementById('musicGrid');
    grid.innerHTML = '';
    if (data.length === 0) {
      $('.result').innerText = '无结果';
    } else {
      const count = data.length;
      const pages = Math.ceil(count / 10);
      const elements = [
        $('.pages-top'), 
        $('.pages-bottom'), 
      ];
      const toTop = () => {
        document.documentElement.scrollTo(0, $('.result').getBoundingClientRect().top + document.documentElement.scrollTop - $('header').clientHeight);
      }
      for (const e of elements) {
        e.innerHTML = '';
        e.appendChild(tag('button', {
          class: ['page', (p==1?'disabled':'')],
          innerHTML: '<i class="fas fa-left"></i>',
          onclick: p > 1 ? () => {
            p--;
            setParam('p', p);
            renderMusicGrid();
            toTop();
          }: null,
        }));
        let pages_range = range(1, Math.min(pages + 1, 6));
        if (p > pages - 3) {
          pages_range = range(pages - 4, pages + 1);
        } else if (p > 3) {
          pages_range = range(p - 2, p + 3);
        }
        for (const i of pages_range) e.appendChild(tag('button', {
          class: ['page', p==i?'active':''],
          innerText: i,
          onclick: p != i ? () => {
            p = i;
            setParam('p', i);
            toTop();
            renderMusicGrid();
          }: null,
        }));
        e.appendChild(tag('button', {
          class: ['page', (p==pages?'disabled':'')],
          innerHTML: '<i class="fas fa-right"></i>',
          onclick: p < pages ? () => {
            p++;
            setParam('p', p);
            toTop();
            renderMusicGrid();
          }: null,
        }));
      }

      $('.result').innerText = `${data.length} 个结果, `;
      const a = tag('a', {
        innerText: '播放全部',
        onclick: () => {
          player.setList(data.map(x => x.id));
          player.setMusic();
          player.play();
        }
      });
      $('.result').appendChild(a)
      for (const i of range(p * 10 - 10, Math.min(p * 10, data.length))) {
        const music = data[i];
        const card = createMusicCard(music);
        grid.appendChild(card);
      }
    }
  }

  // 创建音乐卡片
  function createMusicCard(music) {
    const card = document.createElement('div');
    card.className = 'music-card';
    let tag = music.tags.map(x => {
      const tagx = tags[x] || {
        name: '未知标签',
        bgcolor: '#3f3f3f',
        color: '#fff',
      };
      return `<div class="music-tag" style="background: ${tagx.bgcolor}">${tagx.name}</div>`;
    }).join('');
    card.innerHTML = `
      <div class="music-cover" style="background-image: url(cover/${music.cover})"></div>
      <div class="music-info">
        <div style="display: flex; justify-content: space-between; align-items: baseline">
          <div class="music-title">${music.title}</div>
          <div class="music-original">${music.original}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: baseline">
          <div class="music-artist">${music.artist}</div>
          <a class="music-bvid" target="_blank" href="https://www.bilibili.com/video/${music.bvid}/" onclick="event.stopPropagation()">${music.bvid}</a>
        </div>
        <div class="music-meta">
          <span class="play-count">▶ ${formatPlayCount(music.playCount)}</span>
          <span class="duration">${formatTime(music.duration)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: baseline">
          <div class="music-tags">${tag}</div>
          <div class="music-public">${formatDate(music.public_time)}</div>
        </div>
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
        
        currentTag = k;
        setParam('tag', k);
        renderMusicGrid();
      });
      $('.tags').appendChild(tag);
    }
    
    // 搜索 
    $('.search-box').addEventListener('submit', (e) => {
      e.preventDefault();
      const query = $('.search-input').value;
      currentSearch = query;
      setParam('search', query);
      renderMusicGrid();
    });
    $('.search-input').addEventListener('change', (e) => {
      const query = $('.search-input').value;
      currentSearch = query;
      setParam('search', query);
      renderMusicGrid();
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

  // 添加键盘快捷键
  document.addEventListener('keydown', function(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      $('.play-pause').click();
    }
  });
});