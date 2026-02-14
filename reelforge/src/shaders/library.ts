export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const builtInShaders: Record<string, ShaderDefinition> = {
  monochrome: {
    uniforms: {
      uIntensity: { value: 0.8 },
    },
    fragmentShader: `
      uniform float uIntensity;
      varying vec2 vUv;
      
      void main() {
        vec4 color = texture2D(uTexture, vUv);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        vec3 mono = vec3(gray);
        gl_FragColor = vec4(mix(color.rgb, mono, uIntensity), color.a);
      }
    `,
  },
  
  sepia: {
    uniforms: {
      uIntensity: { value: 0.6 },
    },
    fragmentShader: `
      uniform float uIntensity;
      varying vec2 vUv;
      
      void main() {
        vec4 color = texture2D(uTexture, vUv);
        vec3 sepia = vec3(
          dot(color.rgb, vec3(0.393, 0.769, 0.189)),
          dot(color.rgb, vec3(0.349, 0.686, 0.168)),
          dot(color.rgb, vec3(0.272, 0.534, 0.131))
        );
        gl_FragColor = vec4(mix(color.rgb, sepia, uIntensity), color.a);
      }
    `,
  },
  
  blur: {
    uniforms: {
      uRadius: { value: 5.0 },
      uResolution: { value: { x: 1920, y: 1080 } },
    },
    fragmentShader: `
      uniform float uRadius;
      uniform vec2 uResolution;
      varying vec2 vUv;
      
      void main() {
        vec4 color = vec4(0.0);
        float total = 0.0;
        float radius = uRadius;
        
        for (float x = -4.0; x <= 4.0; x += 1.0) {
          for (float y = -4.0; y <= 4.0; y += 1.0) {
            vec2 offset = vec2(x, y) * radius / uResolution;
            color += texture2D(uTexture, vUv + offset);
            total += 1.0;
          }
        }
        
        gl_FragColor = color / total;
      }
    `,
  },
  
  chromatic: {
    uniforms: {
      uOffset: { value: 0.02 },
    },
    fragmentShader: `
      uniform float uOffset;
      varying vec2 vUv;
      
      void main() {
        vec2 dir = vUv - vec2(0.5);
        float d = length(dir);
        vec2 offset = dir * d * uOffset;
        
        float r = texture2D(uTexture, vUv + offset).r;
        float g = texture2D(uTexture, vUv).g;
        float b = texture2D(uTexture, vUv - offset).b;
        
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `,
  },
  
  glitch: {
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0.5 },
    },
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;
      
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      void main() {
        vec2 uv = vUv;
        float noise = random(vec2(floor(uTime * 10.0), floor(uv.y * 20.0)));
        
        if (noise > (1.0 - uIntensity * 0.1)) {
          uv.x += (random(vec2(uTime, uv.y)) - 0.5) * uIntensity * 0.2;
        }
        
        if (random(vec2(floor(uTime * 20.0), floor(uv.y * 50.0))) > 0.98) {
          uv.y = 1.0 - uv.y;
        }
        
        gl_FragColor = texture2D(uTexture, uv);
      }
    `,
  },
  
  vignette: {
    uniforms: {
      uIntensity: { value: 0.5 },
    },
    fragmentShader: `
      uniform float uIntensity;
      varying vec2 vUv;
      
      void main() {
        vec4 color = texture2D(uTexture, vUv);
        vec2 uv = vUv * (1.0 - vUv.yx);
        float vig = uv.x * uv.y * 15.0;
        vig = pow(vig, uIntensity * 0.5);
        color.rgb *= vig;
        gl_FragColor = color;
      }
    `,
  },
  
  contrast: {
    uniforms: {
      uAmount: { value: 1.2 },
    },
    fragmentShader: `
      uniform float uAmount;
      varying vec2 vUv;
      
      void main() {
        vec4 color = texture2D(uTexture, vUv);
        color.rgb = (color.rgb - 0.5) * uAmount + 0.5;
        gl_FragColor = color;
      }
    `,
  },
  
  saturation: {
    uniforms: {
      uAmount: { value: 1.5 },
    },
    fragmentShader: `
      uniform float uAmount;
      varying vec2 vUv;
      
      void main() {
        vec4 color = texture2D(uTexture, vUv);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = mix(vec3(gray), color.rgb, uAmount);
        gl_FragColor = color;
      }
    `,
  },
  
  brightness: {
    uniforms: {
      uAmount: { value: 0.1 },
    },
    fragmentShader: `
      uniform float uAmount;
      varying vec2 vUv;
      
      void main() {
        vec4 color = texture2D(uTexture, vUv);
        color.rgb += uAmount;
        gl_FragColor = color;
      }
    `,
  },
};

export interface ShaderDefinition {
  uniforms: Record<string, { value: unknown }>;
  fragmentShader: string;
}

export function getShader(name: string): ShaderDefinition | null {
  return builtInShaders[name.toLowerCase()] || null;
}

export function listShaders(): string[] {
  return Object.keys(builtInShaders);
}
