from openai import OpenAI
import os
import json

# 初始化OpenAI客户端
client = OpenAI(api_key='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')  # 替换为你的API密钥

def generate_video_summary(title, duration):
    """生成视频摘要"""
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "你是一个视频内容总结专家。"
                },
                {
                    "role": "user",
                    "content": f"请为这个视频生成一个简短的摘要。视频标题是：{title}，时长：{duration}秒"
                }
            ],
            max_tokens=150
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"生成摘要时出错: {str(e)}")
        return f"视频标题：{title}" 