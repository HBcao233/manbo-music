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