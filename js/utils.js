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
const setParam = (k, v) => {
  let params = new URLSearchParams(window.location.search);
  params.set(k, v);
  let url = new URL(window.location.href);
  url.search = params;
  window.history.replaceState(null, '', url);
}
const isString = s => Object.prototype.toString.call(s) === "[object String]";
const isArrayLike = s => s != null && typeof s[Symbol.iterator] === 'function';
function formatDateTime(d) {
  if (d < 9999999999) d *= 1000;
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  return formatter.format(d).replaceAll('/', '-');
}
function formatDateTimeLess(d) {
  d = parseInt(d);
  if (d < 9999999999) d *= 1000;
  if (d === NaN) d = undefined;
  const t = formatDateTime(d);
  const now = new Date();
  const date = new Date(d);
  if (date.getFullYear() == now.getFullYear()) return t.slice(t.indexOf('-') + 1, t.lastIndexOf(':'));
  return t.slice(0, t.lastIndexOf(':'));
}
function formatDate(d) {
  d = parseInt(d);
  if (d < 9999999999) d *= 1000;
  if (d === NaN) d = undefined;
  const t = formatDateTime(d);
  return t.slice(0, t.lastIndexOf(' '));
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
function easeOutQuad(t) {
  return 1.74 * t ** 2 - 0.74 * t** 3;
}
function scrollTo(element, to, duration) {
  const start = element.scrollTop;
  const change = to - start;
  let startTime = null;

  function animateScroll(currentTime) {
    if (element.scrolling) return;
    if (startTime === null) {
      startTime = currentTime;
    }
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const easedProgress = easeOutQuad(progress); // 使用缓动函数
    element.scrollTop = start + change * easedProgress;

    if (timeElapsed < duration) {
      requestAnimationFrame(animateScroll);
    }
  }
  requestAnimationFrame(animateScroll);
}
function* range(start, end, step = 1) {
  if (step === 0) {
    throw new RangeError('The step of the range cannot be 0')
  }
  if (end === undefined) {
    end = start
    start = 0
  }
  if (typeof start !== 'number' || typeof end !== 'number' || typeof step !== 'number') {
    throw new RangeError('Only numbers are accepted as arguments')
  }
  if (step > 0) {
    while (start < end) {
      yield start
      start += step
    }
  } else {
    while (start > end) {
      yield start
      start += step
    }
  }
}
/**
 * 创建 Element
 * @param {String} tagName 
 * @param {Object} options 
 * @param {function} func 
 * @returns {SVGElement | HTMLElement}
 */
function tag(tagName, options, func) {
  options = options || {};
  var svgTags = ['svg', 'g', 'path', 'filter', 'animate', 'marker', 'line', 'polyline', 'rect', 'circle', 'ellipse', 'polygon'];
  let newElement;
  if (svgTags.indexOf(tagName) >= 0) {
    newElement = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  } else {
    newElement = document.createElement(tagName);
  }
  if (options.id) newElement.id = options.id;
  if (options.class) {
    if (!Array.isArray(options.class)) options.class = options.class.split(' ');
    for (const e of options.class) {
      if (e) newElement.classList.add(e);
    }
  }
  if (options.innerHTML) newElement.innerHTML = options.innerHTML;
  else if (options.innerText) newElement.innerText = options.innerText;
  if (options.children) {
    if (!isArrayLike(options.children)) options.children = [options.children];
    for (const e of options.children) {
      if (isString(e) || isNumber(e)) e = document.createTextNode(e);
      if (e !== undefined && e !== null) newElement.appendChild(e);
    }
  }
  if (options.style) newElement.style.cssText = options.style
  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) {
      newElement.setAttribute(k, v)
    }
  }
  if (options.onclick) newElement.onclick = options.onclick;
  func && func(newElement)
  return newElement;
}
/**
 * 打乱数组
 */
function shuffle(arr) {
  let i = arr.length;
  let index, temp;
  while (i > 0) {
    index = Math.floor(Math.random() * i);
    i--;
    temp = arr[i];
    arr[i] = arr[index];
    arr[index] = temp;
  }
  return arr;
}


/**
 * 调整提示框位置以避免超出视口
 */
function adjustTooltipPosition(tooltip) {
  const tooltipBox = tooltip.querySelector('.tooltip-box');
  
  // 获取元素位置信息
  const tooltipRect = tooltip.getBoundingClientRect();
  const tooltipBoxRect = tooltipBox.getBoundingClientRect();
  
  // 检查是否超出左边界
  if (tooltipRect.left < window.innerWidth / 3) {
    tooltipBox.classList.add('adjust-left');
  } else {
    tooltipBox.classList.remove('adjust-left');
  }
  if (tooltipRect.right > window.innerWidth / 3 * 2) {
    tooltipBox.classList.add('adjust-right');
  } else {
    tooltipBox.classList.remove('adjust-right');
  }
  
  if (tooltipRect.top < window.innerHeight / 2) {
    tooltipBox.classList.add('show-below');
  } else {
    tooltipBox.classList.remove('show-below');
  }
}

/**
 * 显示提示框
 */
function showTooltip(tooltip) {
  const tooltipBox = tooltip.querySelector('.tooltip-box');
  if (tooltipBox) {
    // 调整位置
    adjustTooltipPosition(tooltip, tooltipBox);
    tooltip.classList.add('show');
    tooltip.style.zIndex = 1;
  }
}

// 隐藏提示框
function hideTooltip() {
  const tooltip = $('.tooltip.show');
  if (tooltip) {
    tooltip.classList.remove('show');
    const t = tooltip.parentElement.querySelectorAll('.tooltip');
    if (t) t.forEach(i => i.style.zIndex = '');
  }
}

/**
 * 鼠标进入
 */
document.addEventListener('mouseenter', (e) => {
  if (e.target.closest && (tooltip = e.target.closest('.tooltip'))) {
    showTooltip(tooltip);
  }
}, true);
/**
 * 鼠标离开
 */
document.addEventListener('mouseleave', (e) => {
  if (e.target.closest('.tooltip')) {
    hideTooltip();
  }
}, true);

/**
 * 滚动时调整已显示的提示框位置
 */
document.addEventListener('scroll', function() {
  const tooltip = $('.tooltip.show');
  if (tooltip) adjustTooltipPosition(tooltip);
}, true);

/** 
 * 点击事件
 */
document.addEventListener('click', (e) => {
  let tooltip;
  if (tooltip = e.target.closest('.tooltip')) {
    showTooltip(tooltip);
    return;
  }
  hideTooltip();
});

document.addEventListener('DOMContentLoaded', () => {
  if ($$('.vertical-slider')) $$('.vertical-slider').forEach(x => {
    const track = tag('div', { class: 'slider-track' });
    const fill = tag('div', { class: 'slider-fill' });
    const thumb = tag('div', { class: 'slider-thumb' });
    track.appendChild(fill);
    track.appendChild(thumb);
    x.appendChild(track);
    
    const min = parseInt(x.getAttribute('min')) || 0;
    const max = parseInt(x.getAttribute('max')) || 100;
    let currentValue = min;
    let isDragging = false;
    let isClick = false;
    let clientY = 0;
    
    Object.defineProperty(x, 'value', {
      get: function(value) {
        return currentValue;
      },
      set: function(value) {
        value = Math.max(min, Math.min(max, value));
        currentValue = value;
        
        const percentage = value / 100;
        const trackHeight = track.offsetHeight;
        const thumbHeight = thumb.offsetHeight;
        const maxThumbPosition = trackHeight - thumbHeight;
        
        thumb.style.bottom = (percentage * maxThumbPosition) + 'px';
        fill.style.height = (percentage * 100) + '%';
      },
    });
    
    function handleMouseMove(e) { 
      isClick = false;
      if (!isDragging) return;
      e.preventDefault();
      
      const rect = track.getBoundingClientRect();
      const y = e.clientY || e.touches[0].clientY;
      const relativeY = rect.bottom - y;
      const percentage = relativeY / rect.height;
      const value = parseInt(percentage * (max - min)) + min;
      
      x.value = value;
      x.dispatchEvent(new Event('input'));
    }
    
    function handleMouseUp() {
      isDragging = false;
      x.dispatchEvent(new Event('change'));
    }
    
    function isIndirectChild(childElement, parentElement) {
      // 检查 childElement 的祖先链中是否存在 parentElement
      // 循环向上查找，直到找到 parentElement 或到达文档根节点
      let current = childElement.parentNode;
      while (current) {
        if (current === parentElement) {
          return true;
        }
        current = current.parentNode;
      }
      return false;
    }
    function handleClick(e) {
      if (!isIndirectChild(e.target, x)) return;
      e.preventDefault();
      if (isClick) {
        const rect = track.getBoundingClientRect();
        const relativeY = rect.bottom - clientY;
        const percentage = relativeY / rect.height;
        const value = parseInt(percentage * (max - min)) + min;
        x.value = value;
        x.dispatchEvent(new Event('input'));
      };
      isClick = false;
    }
    
    x.addEventListener('mousedown', (e) => {
      isDragging = true;
      isClick = true;
      clientY = e.clientY;
      e.preventDefault();
    });
    x.addEventListener('touchstart', (e) => {
      isDragging = true;
      isClick = true;
      clientY = e.touches[0].clientY;
    });
  
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
    x.addEventListener('mouseup', handleClick);
    x.addEventListener('touchend', handleClick);
    
    if (x.getAttribute('value')) {
      x.value = x.getAttribute('value');
    } else {
      x.value = x.getAttribute('max');
    }
  });
});