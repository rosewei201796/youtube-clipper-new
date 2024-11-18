// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveClip') {
    // 处理保存片段的请求
    handleSaveClip(message.data);
  }
});

// 处理保存片段的函数
async function handleSaveClip(data) {
  try {
    const response = await fetch('http://localhost:5000/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: data.videoUrl,
        start_time: data.startTime,
        end_time: data.endTime,
        file_name: data.title
      })
    });

    if (!response.ok) {
      throw new Error('下载请求失败');
    }

    const result = await response.json();
    // 通知用户下载成功
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'downloadComplete',
      success: true,
      filePath: result.file_path
    });
  } catch (error) {
    console.error('Error:', error);
    // 通知用户下载失败
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'downloadComplete',
      success: false,
      error: error.message
    });
  }
}

// 处理安装和更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('扩展已安装');
  } else if (details.reason === 'update') {
    console.log('扩展已更新');
  }
}); 