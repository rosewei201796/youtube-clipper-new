from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from yt_dlp import YoutubeDL
from moviepy.editor import VideoFileClip
import os
import tempfile
import logging
import shutil
from openai_service import generate_video_summary

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

DOWNLOAD_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "YouTube_Downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def clean_filename(filename):
    """清理文件名，移除不合法字符"""
    # 保留中文、字母、数字、空格、横线和下划线
    cleaned = "".join(x for x in filename if x.isalnum() or x in (' ', '-', '_', '，', '。') or '\u4e00' <= x <= '\u9fff')
    return cleaned.strip()

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
        original_filename = data['file_name']
        
        temp_dir = tempfile.mkdtemp()
        temp_video_path = os.path.join(temp_dir, "temp_video.mp4")
        
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

        # 剪切视频
        if start_time > 0 or end_time > 0:
            logging.info("开始剪切视频")
            try:
                video = VideoFileClip(temp_video_path)
                if end_time <= 0:
                    end_time = video.duration
                
                start_time = max(0, min(start_time, video.duration))
                end_time = max(start_time, min(end_time, video.duration))
                
                final_clip = video.subclip(start_time, end_time)
                temp_edited_path = os.path.join(temp_dir, "temp_edited.mp4")
                final_clip.write_videofile(temp_edited_path, 
                                        codec='libx264', 
                                        audio_codec='aac',
                                        temp_audiofile=os.path.join(temp_dir, 'temp-audio.m4a'),
                                        remove_temp=True)
                video.close()
                final_clip.close()
                # 使用编辑后的视频
                temp_video_path = temp_edited_path
            except Exception as e:
                logging.error(f"剪切视频时出错: {str(e)}")

        # 获取视频时长
        with VideoFileClip(temp_video_path) as video:
            video_duration = video.duration

        # 生成摘要并用作文件名
        summary = generate_video_summary(original_filename, video_duration)
        logging.info(f"生成的摘要: {summary}")
        
        # 从摘要中提取一个简短的标题（取第一句话或前30个字符）
        summary_title = summary.split('。')[0] if '。' in summary else summary[:30]
        clean_title = clean_filename(summary_title)
        
        # 组合最终的文件名：原始名称 + 摘要标题
        final_filename = f"{clean_filename(original_filename)}_{clean_title}"
        final_output_path = os.path.join(DOWNLOAD_DIR, f"{final_filename}.mp4")
        
        # 如果文件已存在，添加数字后缀
        counter = 1
        while os.path.exists(final_output_path):
            final_output_path = os.path.join(DOWNLOAD_DIR, f"{final_filename}_{counter}.mp4")
            counter += 1

        # 移动视频文件到最终位置
        shutil.copy2(temp_video_path, final_output_path)
        
        # 保存完整摘要到文本文件
        summary_file_path = final_output_path.replace('.mp4', '_摘要.txt')
        with open(summary_file_path, 'w', encoding='utf-8') as f:
            f.write(summary)

        return jsonify({
            "status": "success",
            "message": f"视频已下载到: {final_output_path}",
            "file_path": final_output_path,
            "summary": summary,
            "summary_path": summary_file_path
        })

    except Exception as e:
        logging.error(f"处理过程中出错: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
        
    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                logging.error(f"清理临时文件失败: {str(e)}")

# 修改获取视频列表的路由，包含摘要信息
@app.route('/videos', methods=['GET'])
def get_videos():
    try:
        videos = []
        for filename in os.listdir(DOWNLOAD_DIR):
            if filename.endswith('.mp4'):
                base_name = filename.replace('.mp4', '')
                file_path = os.path.join(DOWNLOAD_DIR, filename)
                summary_path = os.path.join(DOWNLOAD_DIR, f"{base_name}_摘要.txt")
                
                summary = ""
                if os.path.exists(summary_path):
                    with open(summary_path, 'r', encoding='utf-8') as f:
                        summary = f.read()
                
                videos.append({
                    'title': base_name,
                    'path': file_path,
                    'summary': summary
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