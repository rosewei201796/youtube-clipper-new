const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const ffmpeg = require('fluent-ffmpeg');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/download', async (req, res) => {
  const { videoUrl, startTime, endTime, fileName } = req.body;
  
  try {
    // 下载视频
    const output = await youtubedl(videoUrl, {
      format: 'mp4',
      output: `${fileName}-full.mp4`
    });

    // 剪切视频
    await new Promise((resolve, reject) => {
      ffmpeg(`${fileName}-full.mp4`)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .output(`${fileName}.mp4`)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // 发送处理后的视频
    res.download(`${fileName}.mp4`);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(3000, () => {
  console.log('服务器运行在端口3000');
}); 