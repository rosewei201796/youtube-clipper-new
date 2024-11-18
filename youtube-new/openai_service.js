class OpenAIService {
  constructor() {
    this.API_KEY = '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';
    this.API_BASE_URL = 'https://api.openai.com/v1';
  }

  async sendRequest(endpoint, data) {
    try {
      const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  // 使用 GPT-3.5 生成文本
  async generateText(prompt, maxTokens = 150) {
    const data = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    };

    return this.sendRequest('/chat/completions', data);
  }

  // 生成视频摘要
  async generateVideoSummary(transcript) {
    const prompt = `请为以下视频内容生成一个简短的摘要：\n\n${transcript}`;
    return this.generateText(prompt, 200);
  }

  // 生成视频标签
  async generateVideoTags(transcript) {
    const prompt = `请为以下视频内容生成5个相关的标签：\n\n${transcript}`;
    return this.generateText(prompt, 100);
  }

  // 生成视频标题建议
  async generateTitleSuggestions(transcript) {
    const prompt = `请为以下视频内容生成3个吸引人的标题建议：\n\n${transcript}`;
    return this.generateText(prompt, 150);
  }

  // 分析视频内容
  async analyzeVideoContent(transcript) {
    const prompt = `请分析以下视频内容的主要观点和关键信息：\n\n${transcript}`;
    return this.generateText(prompt, 300);
  }
}

// 使用示例
/*
const openAI = new OpenAIService();

// 生成视频摘要
async function generateSummary() {
  try {
    const transcript = "这是视频的文字记录...";
    const response = await openAI.generateVideoSummary(transcript);
    console.log('视频摘要:', response.choices[0].message.content);
  } catch (error) {
    console.error('生成摘要失败:', error);
  }
}

// 生成标签
async function generateTags() {
  try {
    const transcript = "这是视频的文字记录...";
    const response = await openAI.generateVideoTags(transcript);
    console.log('视频标签:', response.choices[0].message.content);
  } catch (error) {
    console.error('生成标签失败:', error);
  }
}
*/

export default OpenAIService; 