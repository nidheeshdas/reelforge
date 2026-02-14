export type ASTNode =
  | ProgramNode
  | InputNode
  | VariableNode
  | TimeBlockNode
  | OutputNode
  | FilterNode
  | ShaderNode
  | TextNode
  | AudioNode
  | VideoTrimNode
  | VideoResizeNode
  | VideoSpeedNode
  | VideoLoopNode
  | VideoOpacityNode
  | OverlayNode
  | CompositeNode
  | ImportShaderNode
  | FunctionNode
  | MethodCallNode
  | UseVideoNode;

export interface ProgramNode {
  type: 'Program';
  statements: ASTNode[];
}

export interface InputNode {
  type: 'Input';
  name: string;
  path: string;
}

export interface VariableNode {
  type: 'Variable';
  name: string;
  value: ASTNode;
}

export interface TimeBlockNode {
  type: 'TimeBlock';
  start: { value: number; raw: string };
  end: { value: number; raw: string };
  instructions: ASTNode[];
}

export interface OutputNode {
  type: 'Output';
  path: string;
  options: OutputOptions;
}

export interface OutputOptions {
  format?: string;
  resolution?: string;
  codec?: string;
  fps?: number;
  bitrate?: string;
}

export interface FilterNode {
  type: 'Filter';
  name: string;
  params: Record<string, number>;
}

export interface ShaderNode {
  type: 'Shader';
  name: string;
  params: Record<string, number | string>;
}

export interface TextNode {
  type: 'Text';
  content: string;
  params: TextParams;
}

export interface TextParams {
  style?: string;
  position?: string;
  color?: string;
  stroke?: string;
  stroke_width?: number;
  font?: string;
  size?: number;
  animation?: string;
}

export interface AudioNode {
  type: 'Audio';
  name: string;
  params: AudioParams;
}

export interface AudioParams {
  volume?: number;
  fade_in?: number;
  fade_out?: number;
}

export interface VideoTrimNode {
  type: 'VideoTrim';
  target: string;
  params: { start?: number; end?: number };
}

export interface VideoResizeNode {
  type: 'VideoResize';
  target: string;
  width: number;
  height: number;
}

export interface VideoSpeedNode {
  type: 'VideoSpeed';
  target: string;
  factor: number;
}

export interface VideoLoopNode {
  type: 'VideoLoop';
  target: string;
  count: number;
}

export interface VideoOpacityNode {
  type: 'VideoOpacity';
  target: string;
  value: number;
  duration: number;
}

export interface OverlayNode {
  type: 'Overlay';
  target: string;
  overlay: string;
  params: Record<string, number | string>;
}

export interface CompositeNode {
  type: 'Composite';
  target: string;
  other: string;
  params: Record<string, number | string>;
}

export interface ImportShaderNode {
  type: 'ImportShader';
  name: string;
  path: string;
}

export interface FunctionNode {
  type: 'Function';
  name: string;
  params: FunctionParam[];
  body: ASTNode[];
}

export interface FunctionParam {
  name: string;
  type: string;
  default: ASTNode | null;
}

export interface MethodCallNode {
  type: 'MethodCall';
  target: string;
  method: string;
  params: Record<string, unknown>;
}

export interface UseVideoNode {
  type: 'UseVideo';
  name: string;
}

export interface ParseError {
  message: string;
  location?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface ParserResult {
  ast: ProgramNode | null;
  errors: ParseError[];
}
