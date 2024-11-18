let startTime = 0;
let endTime = 0;
let isMarkingStart = true;

// 向页面注入标记按钮
function injectMarkButton() {
  const controls = document.querySelector('.ytp-right-controls');
  if (!controls || document.querySelector('.mark-time-button')) return;

  const markButton = document.createElement('button');
  markButton.className = 'ytp-button mark-time-button';
  markButton.innerHTML = '标记时间点';
  markButton.onclick = handleMarkTime;
  controls.prepend(markButton);
}

// 处理时间标记
function handleMarkTime() {
  const video = document.querySelector('video');
  if (!video) return;

  if (isMarkingStart) {
    startTime = video.currentTime;
    alert(`已标记起始时间: ${formatTime(startTime)}`);
  } else {
    endTime = video.currentTime;
    alert(`已标记结束时间: ${formatTime(endTime)}`);
    promptSaveClip();
  }
  isMarkingStart = !isMarkingStart;
}

// 格式化时间
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 获取当前视频字幕
async function getCurrentCaption() {
  const captionElements = document.querySelectorAll('.ytp-caption-segment');
  if (captionElements.length > 0) {
    return Array.from(captionElements).map(el => el.textContent).join(' ');
  }
  return '';
}

// 提示保存片段
async function promptSaveClip() {
  const videoTitle = document.title.replace(' - YouTube', '');
  const currentCaption = await getCurrentCaption();
  
  chrome.runtime.sendMessage({
    action: 'saveClip',
    data: {
      videoUrl: window.location.href,
      startTime,
      endTime,
      title: currentCaption || videoTitle,
      summary: currentCaption,
      transcript: currentCaption
    }
  });
}

// 监听URL变化
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    injectMarkButton();
  }
}).observe(document, {subtree: true, childList: true});

// 修改消息监听部分
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getVideoTitle") {
    // 获取标题
    const title = getVideoTitle();
    console.log('获取到的标题:', title);
    sendResponse({ title: title });
  } else if (request.action === "getCurrentPageInfo") {
    // 获取当前页面信息
    const url = getVideoUrl();
    const title = getVideoTitle();
    console.log('发送页面信息:', { url, title });
    sendResponse({ url, title });
  }
  return true;  // 保持消息通道开启
});

// 页面加载完成后注入按钮
document.addEventListener('yt-navigate-finish', injectMarkButton);
if (document.querySelector('.ytp-right-controls')) {
  injectMarkButton();
}

// 修改获取视频标题函数
function getVideoTitle() {
  // Shorts标题选择器（更新和增加更多选择器）
  const shortsTitleSelectors = [
    // 新的 Shorts 选择器
    'ytd-reel-video-renderer[is-active] h2.ytd-reel-player-header-renderer',
    'ytd-reel-video-renderer[is-active] .ytd-shorts-player-header-title',
    'ytd-reel-video-renderer[is-active] .title.style-scope.ytd-reel-player-header-renderer',
    // 备用选择器
    '.ytd-shorts-compact-video-renderer .video-title-text',
    '.ytd-shorts-compact-video-renderer .title',
    // 通用选择器
    '[role="heading"][aria-level="2"]'
  ];
  
  // 普通视频标题选择器
  const regularTitleSelectors = [
    'h1.ytd-video-primary-info-renderer',
    'h1.title.style-scope.ytd-video-primary-info-renderer',
    '[id="title"] h1'
  ];
  
  // 首先尝试 Shorts 选择器
  if (window.location.href.includes('/shorts/')) {
    for (const selector of shortsTitleSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        console.log('找到 Shorts 标题:', element.textContent.trim());
        return element.textContent.trim();
      }
    }
  }
  
  // 然后尝试普通视频选择器
  for (const selector of regularTitleSelectors) {
    const element = document.querySelector(selector);
    if (element?.textContent?.trim()) {
      console.log('找到普通视频标题:', element.textContent.trim());
      return element.textContent.trim();
    }
  }
  
  // 如果都失败，使用页面标题
  const pageTitle = document.title.replace(' - YouTube', '').trim();
  console.log('使用页面标题:', pageTitle);
  return pageTitle;
}

// 修改获取视频URL的函数
function getVideoUrl() {
  const url = window.location.href;
  // 如果是Shorts，转换为普通视频URL
  if (url.includes('/shorts/')) {
    const videoId = url.split('/shorts/')[1].split('?')[0];
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  return url;
}