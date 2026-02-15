import { test, expect } from '@playwright/test';
import { builtInShaders, getShader, listShaders } from '../src/shaders/library';

describe('Shader Library', () => {
  test('should have all built-in shaders', () => {
    const shaders = listShaders();
    expect(shaders).toContain('monochrome');
    expect(shaders).toContain('sepia');
    expect(shaders).toContain('blur');
    expect(shaders).toContain('chromatic');
    expect(shaders).toContain('glitch');
    expect(shaders).toContain('vignette');
    expect(shaders).toContain('contrast');
    expect(shaders).toContain('saturation');
    expect(shaders).toContain('brightness');
  });

  test('should get shader by name', () => {
    const shader = getShader('monochrome');
    expect(shader).not.toBeNull();
    expect(shader?.uniforms).toHaveProperty('uIntensity');
    expect(shader?.fragmentShader).toContain('gl_FragColor');
  });

  test('should return null for unknown shader', () => {
    const shader = getShader('nonexistent');
    expect(shader).toBeNull();
  });

  test('should have valid GLSL in all shaders', () => {
    const shaders = listShaders();
    for (const name of shaders) {
      const shader = getShader(name);
      expect(shader?.fragmentShader).toContain('void main()');
      expect(shader?.fragmentShader).toContain('gl_FragColor');
    }
  });

  test('should handle case-insensitive shader names', () => {
    expect(getShader('MONOCHROME')).not.toBeNull();
    expect(getShader('Monochrome')).not.toBeNull();
    expect(getShader('monochrome')).not.toBeNull();
  });
});
