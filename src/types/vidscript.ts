export interface SourceLocation {
  start: { line: number; column: number; offset?: number };
  end: { line: number; column: number; offset?: number };
}

export interface QualifiedReferenceNode {
  type: 'QualifiedReference';
  object: string;
  property: string;
  loc?: SourceLocation;
}

export interface ObjectPropertyNode {
  key: string;
  value: ValueExpression;
}

export interface ObjectExpressionNode {
  type: 'ObjectExpression';
  properties: ObjectPropertyNode[];
  loc?: SourceLocation;
}

export type ValueExpression =
  | string
  | number
  | boolean
  | null
  | QualifiedReferenceNode
  | ObjectExpressionNode;

export interface TimelineParam {
  name: string;
  type: string;
  default: ValueExpression | null;
}

export interface ImportNamedSpecifier {
  imported: string;
  local: string;
}

export interface NamedImportClause {
  type: 'NamedImportClause';
  specifiers: ImportNamedSpecifier[];
}

export interface NamespaceImportClause {
  type: 'NamespaceImportClause';
  local: string;
}

export type ImportClause = NamedImportClause | NamespaceImportClause;

export interface ProgramNode {
  type: 'Program';
  statements: StatementNode[];
  loc?: SourceLocation;
}

export interface InputNode {
  type: 'Input';
  name: string;
  path: string;
  loc?: SourceLocation;
}

export interface VariableNode {
  type: 'Variable';
  name: string;
  value: ValueExpression;
  loc?: SourceLocation;
}

export interface TimeSpecNode {
  value: number | null;
  raw: string;
  reference?: string | QualifiedReferenceNode;
  isEnd?: boolean;
}

export interface TimeBlockNode {
  type: 'TimeBlock';
  start: TimeSpecNode;
  end: TimeSpecNode;
  instructions: InstructionNode[];
  loc?: SourceLocation;
}

export interface OutputNode {
  type: 'Output';
  path: string;
  options: OutputOptions;
  loc?: SourceLocation;
}

export interface OutputOptions {
  format?: string;
  resolution?: string;
  codec?: string;
  fps?: string | number;
  bitrate?: string;
}

export interface FilterNode {
  type: 'Filter';
  name: string;
  params: Record<string, ValueExpression>;
  loc?: SourceLocation;
}

export interface ShaderNode {
  type: 'Shader';
  name: string;
  params: Record<string, ValueExpression>;
  loc?: SourceLocation;
}

export interface TextNode {
  type: 'Text';
  content: ValueExpression;
  params: Record<string, ValueExpression>;
  loc?: SourceLocation;
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
  params: Record<string, ValueExpression>;
  loc?: SourceLocation;
}

export interface AudioParams {
  volume?: number;
  fade_in?: number;
  fade_out?: number;
}

export interface VideoTrimNode {
  type: 'VideoTrim';
  target: string;
  params: { start?: ValueExpression; end?: ValueExpression };
  loc?: SourceLocation;
}

export interface VideoResizeNode {
  type: 'VideoResize';
  target: string;
  width: ValueExpression;
  height: ValueExpression;
  loc?: SourceLocation;
}

export interface VideoSpeedNode {
  type: 'VideoSpeed';
  target: string;
  factor: ValueExpression;
  loc?: SourceLocation;
}

export interface VideoLoopNode {
  type: 'VideoLoop';
  target: string;
  count: ValueExpression;
  loc?: SourceLocation;
}

export interface VideoOpacityNode {
  type: 'VideoOpacity';
  target: string;
  value: ValueExpression;
  duration: ValueExpression;
  loc?: SourceLocation;
}

export interface OverlayNode {
  type: 'Overlay';
  target: string;
  overlay: string;
  params: Record<string, ValueExpression>;
  loc?: SourceLocation;
}

export interface CompositeNode {
  type: 'Composite';
  target: string;
  other: string;
  params: Record<string, ValueExpression>;
  loc?: SourceLocation;
}

export interface ImportShaderNode {
  type: 'ImportShader';
  name: string;
  path: string;
  loc?: SourceLocation;
}

export interface ImportNode {
  type: 'Import';
  clause: ImportClause;
  source: string;
  loc?: SourceLocation;
}

export interface ExportConstNode {
  type: 'ExportConst';
  name: string;
  value: ValueExpression;
  loc?: SourceLocation;
}

export interface ExportTimelineNode {
  type: 'ExportTimeline';
  name: string;
  params: TimelineParam[];
  body: Array<TimeBlockNode | UseTimelineNode>;
  loc?: SourceLocation;
}

export interface UseTimelineNode {
  type: 'UseTimeline';
  timeline: string | QualifiedReferenceNode;
  at: TimeSpecNode;
  with: ObjectExpressionNode;
  loc?: SourceLocation;
}

export interface FunctionNode {
  type: 'Function';
  name: string;
  params: TimelineParam[];
  body: StatementNode[];
  loc?: SourceLocation;
}

export interface MethodCallNode {
  type: 'MethodCall';
  target: string;
  method: string;
  params: Record<string, unknown>;
  loc?: SourceLocation;
}

export interface UseVideoNode {
  type: 'UseVideo';
  name: string;
  loc?: SourceLocation;
}

export type InstructionNode =
  | string
  | QualifiedReferenceNode
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
  | MethodCallNode
  | UseVideoNode;

export type StatementNode =
  | InputNode
  | VariableNode
  | TimeBlockNode
  | OutputNode
  | ImportShaderNode
  | ImportNode
  | ExportConstNode
  | ExportTimelineNode
  | UseTimelineNode
  | FunctionNode;

export type ASTNode = ProgramNode | StatementNode | InstructionNode | QualifiedReferenceNode | ObjectExpressionNode;

export interface ParseError {
  message: string;
  location?: SourceLocation;
  moduleId?: string;
}

export interface ParserResult {
  ast: ProgramNode | null;
  errors: ParseError[];
}

export interface ModuleResolution {
  id: string;
  code: string;
}

export type ModuleResolver = (specifier: string, fromId: string) => ModuleResolution | null;

export interface CompileOptions {
  entryId?: string;
  resolver?: ModuleResolver;
  moduleMap?: Record<string, string>;
}

export interface CompileResult {
  ast: ProgramNode | null;
  program: ProgramNode | null;
  errors: ParseError[];
}
