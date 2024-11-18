// 页面加载时自动获取当前标签页信息
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 检查是否是YouTube视频页面（包括Shorts）
    if (tab.url.includes('youtube.com/watch') || tab.url.includes('youtube.com/shorts')) {
      // 注入脚本并获取信息
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          return {
            url: window.location.href,
            title: document.title.replace(' - YouTube', '')
          };
        }
      });

      if (results && results[0].result) {
        const { url, title } = results[0].result;
        document.getElementById('videoUrl').value = url.includes('/shorts/') 
          ? `https://www.youtube.com/watch?v=${url.split('/shorts/')[1].split('?')[0]}`
          : url;
        document.getElementById('fileName').value = title;
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }

  // 标签页切换功能
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // 移除所有活动状态
      tabButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // 添加当前标签的活动状态
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(`${tabId}Tab`).classList.add('active');

      // 如果切换到播放列表标签，加载视频列表
      if (tabId === 'playlist') {
        loadVideoList();
      }
    });
  });

  // 初始加载视频列表
  loadVideoList();
});

document.getElementById('downloadBtn').addEventListener('click', async () => {
  const videoUrl = document.getElementById('videoUrl').value;
  const startTime = parseFloat(document.getElementById('startTime').value) || 0;
  const endTime = parseFloat(document.getElementById('endTime').value) || 0;
  const fileName = document.getElementById('fileName').value;

  if (!videoUrl) {
    alert('请输入YouTube视频网址');
    return;
  }

  try {
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.textContent = '处理中...';
    downloadBtn.disabled = true;

    const response = await fetch('http://localhost:5000/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        start_time: startTime,
        end_time: endTime,
        file_name: fileName
      })
    });

    const result = await response.json();

    if (response.ok) {
      alert(`视频下载成功！\n\n文件保存在：${result.file_path}`);
      // 刷新视频列表
      loadVideoList();
    } else {
      throw new Error(result.message || '下载请求失败');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('发生错误：' + error.message);
  } finally {
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.textContent = '下载视频';
    downloadBtn.disabled = false;
  }
});

// 加载视频列表
async function loadVideoList() {
  try {
    const response = await fetch('http://localhost:5000/videos');
    const videos = await response.json();
    
    const videoList = document.getElementById('videoList');
    videoList.innerHTML = '';

    videos.forEach(video => {
      const videoItem = document.createElement('div');
      videoItem.className = 'video-item';
      videoItem.innerHTML = `
        <div class="video-title">${video.title}</div>
        <div class="video-path">${video.path}</div>
      `;
      videoItem.addEventListener('click', () => playVideo(video.path));
      videoList.appendChild(videoItem);
    });
  } catch (error) {
    console.error('Error loading video list:', error);
  }
}

// 播放视频
function playVideo(videoPath) {
  const videoPlayer = document.getElementById('videoPlayer');
  videoPlayer.style.display = 'block';
  videoPlayer.src = `http://localhost:5000/play/${encodeURIComponent(videoPath)}`;
  videoPlayer.play();
} 