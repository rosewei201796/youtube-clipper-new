document.addEventListener('DOMContentLoaded', loadClips);

async function loadClips() {
  const container = document.getElementById('clips-container');
  const clips = await chrome.storage.local.get('clips');
  
  if (!clips.clips || clips.clips.length === 0) {
    container.innerHTML = '<p>还没有保存的片段</p>';
    return;
  }

  container.innerHTML = clips.clips.map((clip, index) => `
    <div class="clip-item">
      <div class="clip-title" contenteditable="true" onblur="updateClipTitle(${index}, this.textContent)">
        ${clip.title}
      </div>
      <div class="clip-summary" contenteditable="true" onblur="updateClipSummary(${index}, this.textContent)">
        ${clip.summary}
      </div>
      <div class="clip-controls">
        <button class="play-btn" onclick="playClip(${index})">播放</button>
        <button class="download-btn" onclick="downloadClip(${index})">下载</button>
        <button class="edit-btn" onclick="deleteClip(${index})">删除</button>
      </div>
    </div>
  `).join('');
}

async function updateClipTitle(index, newTitle) {
  const clips = (await chrome.storage.local.get('clips')).clips;
  clips[index].title = newTitle;
  await chrome.storage.local.set({ clips });
}

async function updateClipSummary(index, newSummary) {
  const clips = (await chrome.storage.local.get('clips')).clips;
  clips[index].summary = newSummary;
  await chrome.storage.local.set({ clips });
}

function playClip(index) {
  chrome.runtime.sendMessage({
    action: 'playClip',
    index
  });
}

function downloadClip(index) {
  chrome.runtime.sendMessage({
    action: 'downloadClip',
    index
  });
}

async function deleteClip(index) {
  if (!confirm('确定要删除这个片段吗？')) return;
  
  const clips = (await chrome.storage.local.get('clips')).clips;
  clips.splice(index, 1);
  await chrome.storage.local.set({ clips });
  loadClips();
} 