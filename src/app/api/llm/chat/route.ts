import { NextRequest, NextResponse } from 'next/server';
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
1. Write valid VidScript code in a code block
2. Explain what the code does
3. If unclear, ask for clarification

When user has errors:
1. Explain the error in plain language
2. Show corrected code

Remember: Always write valid, executable VidScript code.`;

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey } = await request.json();
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is required' },
        { status: 400 }
      );
    }
    
    const openai = new OpenAI({ apiKey });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });
    
    const content = response.choices[0]?.message?.content || '';
    
    return NextResponse.json({ response: content });
  } catch (error) {
    console.error('LLM error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from AI' },
      { status: 500 }
    );
  }
}
