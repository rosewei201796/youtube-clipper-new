from flask import Flask, request, send_file, jsonify
from markupsafe import escape
from flask_cors import CORS
from yt_dlp import YoutubeDL
from moviepy.editor import VideoFileClip
import os
import tempfile
import logging
import shutil

app = Flask(__name__)
CORS(app)

# 添加日志配置
logging.basicConfig(level=logging.DEBUG)

# 确保下载目录存在
DOWNLOAD_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "YouTube_Downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

@app.route('/download', methods=['POST'])
def download_video():
    temp_dir = None
    try:
        logging.info("收到下载请求")
        data = request.json
        logging.info(f"请求数据: {data}")
        
        video_url = data['video_url']
        start_time = float(data.get('start_time', 0))
        end_time = float(data.get('end_time', 0))
        file_name = data['file_name']
        
        # 清理文件名（移除不合法字符）
        file_name = "".join(x for x in file_name if x.isalnum() or x in (' ', '-', '_')).strip()
        
        logging.info(f"开始下载视频: {video_url}")
        logging.info(f"剪辑时间: {start_time} - {end_time}")
        
        # 创建临时目录
        temp_dir = tempfile.mkdtemp()
        temp_video_path = os.path.join(temp_dir, f"{file_name}-temp.mp4")
        
        # 最终输出文件路径（在Downloads文件夹中）
        final_output_path = os.path.join(DOWNLOAD_DIR, f"{file_name}.mp4")
        
        # 下载视频
        ydl_opts = {
            'format': 'best[ext=mp4]',
            'outtmpl': temp_video_path,
            'quiet': False,
        }
        
        logging.info("开始使用yt-dlp下载")
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
        logging.info("视频下载完成")

        # 剪切视频（只在有效的开始和结束时间时进行）
        if start_time > 0 or end_time > 0:
            logging.info("开始剪切视频")
            try:
                video = VideoFileClip(temp_video_path)
                
                # 如果没有指定结束时间，使用视频总长度
                if end_time <= 0:
                    end_time = video.duration
                
                # 确保时间范围有效
                start_time = max(0, min(start_time, video.duration))
                end_time = max(start_time, min(end_time, video.duration))
                
                final_clip = video.subclip(start_time, end_time)
                final_clip.write_videofile(final_output_path, 
                                        codec='libx264', 
                                        audio_codec='aac',
                                        temp_audiofile=os.path.join(temp_dir, 'temp-audio.m4a'),
                                        remove_temp=True)
                video.close()
                final_clip.close()
            except Exception as e:
                logging.error(f"剪切视频时出错: {str(e)}")
                # 如果剪切失败，使用原始视频
                shutil.copy2(temp_video_path, final_output_path)
        else:
            # 如果没有剪切时间，直接复制完整视频
            shutil.copy2(temp_video_path, final_output_path)
            logging.info("使用完整视频")

        logging.info(f"视频已保存到: {final_output_path}")
        
        return jsonify({
            "status": "success",
            "message": f"视频已下载到: {final_output_path}",
            "file_path": final_output_path
        })

    except Exception as e:
        logging.error(f"处理过程中出错: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
        
    finally:
        # 清理临时文件
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                logging.error(f"清理临时文件失败: {str(e)}")

# 添加新的路由用于获取视频列表
@app.route('/videos', methods=['GET'])
def get_videos():
    try:
        videos = []
        for filename in os.listdir(DOWNLOAD_DIR):
            if filename.endswith('.mp4'):
                file_path = os.path.join(DOWNLOAD_DIR, filename)
                videos.append({
                    'title': filename.replace('.mp4', ''),
                    'path': file_path
                })
        return jsonify(videos)
    except Exception as e:
        logging.error(f"获取视频列表时出错: {str(e)}")
        return jsonify({'error': str(e)}), 500

# 添加新的路由用于播放视频
@app.route('/play/<path:video_path>')
def play_video(video_path):
    try:
        return send_file(video_path, mimetype='video/mp4')
    except Exception as e:
        logging.error(f"播放视频时出错: {str(e)}")
        return str(e), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)