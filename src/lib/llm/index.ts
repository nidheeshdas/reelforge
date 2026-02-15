import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are a VidScript expert. Help users create videos using the VidScript DSL.

## VidScript Syntax

### Time Format
- [0 - 10] means 0 to 10 seconds
- [0s - 10s] explicit seconds
- [0:00 - 0:10] mm:ss format

### Basic Instructions
# Input files
input video = "file.mp4"
input audio = "sound.mp3"

# Video operations
[0 - 10] = video.Trim(0, 300)
[0 - 10] = video.Resize(1920, 1080)
[0 - 10] = video.Speed(1.5)

# Audio
[0 - 10] = audio music, volume: 0.7
[0 - 10] = audio music, fade_in: 1s, fade_out: 2s

# Text
[2 - 5] = text "Hello", style: title, position: center

# Filters (GLSL)
[0 - 10] = filter "monochrome", intensity: 0.8
[0 - 10] = filter "sepia", intensity: 0.6

# Output
output to "result.mp4", resolution: 1080x1920

### Built-in Filters
- monochrome, sepia, blur, chromatic, glitch
- vignette, contrast, saturation, brightness

### Custom GLSL
Users can import their own shaders:
import shader "my_effect" from "./shaders/neon.glsl"
[0 - 10] = shader "my_effect", param1: value1

## Your Task

When user describes what they want:
1. Write valid VidScript code
2. Explain what the code does
3. If unclear, ask for clarification

When user has errors:
1. Explain the error in plain language
2. Show corrected code

Remember: Always write valid, executable VidScript code.`;

const ERROR_PROMPT = `Explain this VidScript error in plain language and show corrected code.
The user is a beginner, so keep explanations simple.`;

export class LLMService {
  private client: OpenAI | null = null;
  
  initialize(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  isConfigured(): boolean {
    return this.client !== null;
  }
  
  async generateVidScript(userMessage: string): Promise<string> {
    if (!this.client) {
      throw new Error('LLM not configured. Please add your OpenAI API key.');
    }
    
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });
    
    return response.choices[0].message.content || '';
  }
  
  async explainError(error: string, code: string): Promise<string> {
    if (!this.client) {
      throw new Error('LLM not configured.');
    }
    
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: ERROR_PROMPT },
        { role: 'user', content: `Error: ${error}\n\nCode:\n${code}` },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });
    
    return response.choices[0].message.content || '';
  }
  
  async suggestCompletion(code: string, cursorPosition: number): Promise<string[]> {
    if (!this.client) {
      return [];
    }
    
    const partialCode = code.slice(0, cursorPosition);
    
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Suggest the next part of this VidScript code. Return only 2-3 short suggestions, one per line.' },
        { role: 'user', content: partialCode },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });
    
    return (response.choices[0].message.content || '').split('\n').filter(Boolean);
  }
}

export const llmService = new LLMService();
