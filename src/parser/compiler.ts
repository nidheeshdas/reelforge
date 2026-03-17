import type {
  AudioNode,
  CompileOptions,
  CompileResult,
  CompositeNode,
  ExportConstNode,
  ExportTimelineNode,
  FilterNode,
  ImportNode,
  InputNode,
  ModuleResolution,
  ObjectExpressionNode,
  OverlayNode,
  ParseError,
  ProgramNode,
  QualifiedReferenceNode,
  ShaderNode,
  SourceLocation,
  StatementNode,
  TextNode,
  TimeBlockNode,
  TimeSpecNode,
  UseTimelineNode,
  ValueExpression,
  VideoLoopNode,
  VideoOpacityNode,
  VideoResizeNode,
  VideoSpeedNode,
  VideoTrimNode,
} from '@/types/vidscript';
import { parseVidscript } from './syntax';

type CompilerScalar = string | number | boolean | null;
interface CompilerObject {
  [key: string]: CompilerValue;
}
type CompilerValue = CompilerScalar | CompilerObject;

type ExportRecord =
  | { kind: 'const'; node: ExportConstNode }
  | { kind: 'timeline'; node: ExportTimelineNode };

interface ModuleRecord {
  id: string;
  ast: ProgramNode;
  imports: ImportNode[];
  exports: Map<string, ExportRecord>;
  inputNames: Set<string>;
}

interface TimelineBinding {
  module: ModuleRecord;
  timeline: ExportTimelineNode;
}

interface Scope {
  module: ModuleRecord;
  valueBindings: Map<string, () => CompilerValue>;
  timelineBindings: Map<string, TimelineBinding>;
  namespaceBindings: Map<string, ModuleRecord>;
}

interface CompilerContext {
  entryId: string;
  modules: Map<string, ModuleRecord>;
  options: CompileOptions;
  errors: ParseError[];
  visitingModules: string[];
  visitingTimelines: string[];
  constEvalStack: string[];
  constCache: Map<string, CompilerValue>;
}

function createCompilerContext(options: CompileOptions): CompilerContext {
  return {
    entryId: options.entryId || '__entry__.vid',
    modules: new Map(),
    options,
    errors: [],
    visitingModules: [],
    visitingTimelines: [],
    constEvalStack: [],
    constCache: new Map(),
  };
}

function createError(message: string, moduleId?: string, location?: SourceLocation): ParseError {
  return { message, moduleId, location };
}

function addError(context: CompilerContext, message: string, moduleId?: string, location?: SourceLocation): void {
  context.errors.push(createError(message, moduleId, location));
}

function resolveModuleSource(specifier: string, fromId: string, options: CompileOptions): ModuleResolution | null {
  if (options.moduleMap && specifier in options.moduleMap) {
    return { id: specifier, code: options.moduleMap[specifier] };
  }

  return options.resolver ? options.resolver(specifier, fromId) : null;
}

function loadModule(context: CompilerContext, id: string, code: string): ModuleRecord | null {
  if (context.visitingModules.includes(id)) {
    const cyclePath = [...context.visitingModules, id].join(' -> ');
    addError(context, `Module cycle detected: ${cyclePath}`, id);
    return null;
  }

  const cached = context.modules.get(id);
  if (cached) {
    return cached;
  }

  context.visitingModules.push(id);
  const parseResult = parseVidscript(code);
  if (!parseResult.ast) {
    for (const error of parseResult.errors) {
      addError(context, error.message, id, error.location);
    }
    context.visitingModules.pop();
    return null;
  }

  const ast = parseResult.ast;
  const exports = new Map<string, ExportRecord>();
  const imports = ast.statements.filter((statement): statement is ImportNode => statement.type === 'Import');
  const inputNames = new Set(
    ast.statements
      .filter((statement): statement is InputNode => statement.type === 'Input')
      .map((statement) => statement.name),
  );

  for (const statement of ast.statements) {
    if (statement.type === 'ExportConst' || statement.type === 'ExportTimeline') {
      if (exports.has(statement.name)) {
        addError(context, `Duplicate export '${statement.name}' in module '${id}'`, id, statement.loc);
        continue;
      }

      exports.set(statement.name, {
        kind: statement.type === 'ExportConst' ? 'const' : 'timeline',
        node: statement,
      } as ExportRecord);
    }
  }

  const moduleRecord: ModuleRecord = {
    id,
    ast,
    imports,
    exports,
    inputNames,
  };

  context.modules.set(id, moduleRecord);

  for (const statement of imports) {
    const resolved = resolveModuleSource(statement.source, id, context.options);
    if (!resolved) {
      addError(context, `Unable to resolve module '${statement.source}' from '${id}'`, id, statement.loc);
      continue;
    }

    loadModule(context, resolved.id, resolved.code);
  }

  context.visitingModules.pop();
  return moduleRecord;
}

function getExportedConst(
  context: CompilerContext,
  module: ModuleRecord,
  name: string,
): ExportConstNode | null {
  const record = module.exports.get(name);
  if (!record) {
    addError(context, `Unknown export '${name}' in module '${module.id}'`, module.id);
    return null;
  }

  if (record.kind !== 'const') {
    addError(context, `'${name}' in module '${module.id}' is not a const export`, module.id, record.node.loc);
    return null;
  }

  return record.node;
}

function getExportedTimeline(
  context: CompilerContext,
  module: ModuleRecord,
  name: string,
  location?: SourceLocation,
): ExportTimelineNode | null {
  const record = module.exports.get(name);
  if (!record) {
    addError(context, `Unknown export '${name}' in module '${module.id}'`, module.id, location);
    return null;
  }

  if (record.kind !== 'timeline') {
    addError(context, `Cannot use '${name}' from module '${module.id}' because it is not a timeline export`, module.id, location || record.node.loc);
    return null;
  }

  return record.node;
}

function createScope(
  context: CompilerContext,
  module: ModuleRecord,
  params: Map<string, CompilerValue> = new Map(),
): Scope {
  const valueBindings = new Map<string, () => CompilerValue>();
  const timelineBindings = new Map<string, TimelineBinding>();
  const namespaceBindings = new Map<string, ModuleRecord>();

  for (const [name, value] of params.entries()) {
    valueBindings.set(name, () => value);
  }

  for (const inputName of module.inputNames) {
    if (!valueBindings.has(inputName)) {
      valueBindings.set(inputName, () => inputName);
    }
  }

  for (const [name, exported] of module.exports.entries()) {
    if (exported.kind === 'const') {
      valueBindings.set(name, () => evaluateExportedConst(context, module, name));
    } else {
      timelineBindings.set(name, { module, timeline: exported.node });
    }
  }

  for (const statement of module.imports) {
    const resolved = resolveModuleSource(statement.source, module.id, context.options);
    if (!resolved) continue;

    const importedModule = context.modules.get(resolved.id);
    if (!importedModule) continue;

    if (statement.clause.type === 'NamespaceImportClause') {
      namespaceBindings.set(statement.clause.local, importedModule);
      continue;
    }

    for (const specifier of statement.clause.specifiers) {
      const exported = importedModule.exports.get(specifier.imported);
      if (!exported) {
        addError(
          context,
          `Module '${importedModule.id}' does not export '${specifier.imported}'`,
          module.id,
          statement.loc,
        );
        continue;
      }

      if (exported.kind === 'const') {
        valueBindings.set(specifier.local, () => evaluateExportedConst(context, importedModule, specifier.imported));
      } else {
        timelineBindings.set(specifier.local, { module: importedModule, timeline: exported.node });
      }
    }
  }

  return {
    module,
    valueBindings,
    timelineBindings,
    namespaceBindings,
  };
}

function evaluateExportedConst(
  context: CompilerContext,
  module: ModuleRecord,
  name: string,
): CompilerValue {
  const cacheKey = `${module.id}:${name}`;
  if (context.constCache.has(cacheKey)) {
    return context.constCache.get(cacheKey) as CompilerValue;
  }

  if (context.constEvalStack.includes(cacheKey)) {
    addError(context, `Const cycle detected while resolving '${name}' in module '${module.id}'`, module.id);
    return null;
  }

  context.constEvalStack.push(cacheKey);
  const node = getExportedConst(context, module, name);
  const scope = createScope(context, module);
  const value = node ? resolveValue(context, node.value, scope, node.loc) : null;
  context.constEvalStack.pop();
  context.constCache.set(cacheKey, value);
  return value;
}

function resolveQualifiedValue(
  context: CompilerContext,
  reference: QualifiedReferenceNode,
  scope: Scope,
  location?: SourceLocation,
): CompilerValue {
  const namespaceModule = scope.namespaceBindings.get(reference.object);
  if (!namespaceModule) {
    addError(context, `Unknown namespace '${reference.object}'`, scope.module.id, location || reference.loc);
    return null;
  }

  const exported = namespaceModule.exports.get(reference.property);
  if (!exported) {
    addError(
      context,
      `Module '${namespaceModule.id}' does not export '${reference.property}'`,
      scope.module.id,
      location || reference.loc,
    );
    return null;
  }

  if (exported.kind !== 'const') {
    addError(
      context,
      `Cannot use timeline export '${reference.object}.${reference.property}' as a value`,
      scope.module.id,
      location || reference.loc,
    );
    return null;
  }

  return evaluateExportedConst(context, namespaceModule, reference.property);
}

function resolveValue(
  context: CompilerContext,
  expression: ValueExpression,
  scope: Scope,
  location?: SourceLocation,
): CompilerValue {
  if (expression === null || typeof expression === 'number' || typeof expression === 'boolean') {
    return expression as CompilerScalar;
  }

  if (typeof expression === 'string') {
    const binding = scope.valueBindings.get(expression);
    return binding ? binding() : expression;
  }

  if (expression.type === 'QualifiedReference') {
    return resolveQualifiedValue(context, expression, scope, location);
  }

  const result: Record<string, CompilerValue> = {};
  for (const property of expression.properties) {
    result[property.key] = resolveValue(context, property.value, scope, location || expression.loc);
  }
  return result;
}

function resolveStringValue(
  context: CompilerContext,
  expression: ValueExpression,
  scope: Scope,
  location?: SourceLocation,
  label = 'value',
): string {
  const value = resolveValue(context, expression, scope, location);
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  addError(context, `Expected ${label} to resolve to a string`, scope.module.id, location);
  return '';
}

function resolveNumberValue(
  context: CompilerContext,
  expression: ValueExpression,
  scope: Scope,
  location?: SourceLocation,
  label = 'value',
): number {
  const value = resolveValue(context, expression, scope, location);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  addError(context, `Expected ${label} to resolve to a number`, scope.module.id, location);
  return 0;
}

function resolveTimeSpec(
  context: CompilerContext,
  spec: TimeSpecNode,
  scope: Scope,
  location?: SourceLocation,
): number {
  if (spec.isEnd) {
    return Infinity;
  }

  if (typeof spec.value === 'number' && Number.isFinite(spec.value)) {
    return spec.value;
  }

  if (spec.reference !== undefined) {
    return resolveNumberValue(context, spec.reference as ValueExpression, scope, location, 'time');
  }

  addError(context, `Expected time '${spec.raw}' to resolve to a finite number`, scope.module.id, location);
  return 0;
}

function resolveReferenceName(
  context: CompilerContext,
  name: string,
  scope: Scope,
  location?: SourceLocation,
  label = 'reference',
): string {
  const value = scope.valueBindings.get(name)?.() ?? name;
  if (typeof value === 'string') {
    return value;
  }

  addError(context, `Expected ${label} '${name}' to resolve to a string`, scope.module.id, location);
  return name;
}

function lowerTextInstruction(context: CompilerContext, instruction: TextNode, scope: Scope): TextNode {
  const params: Record<string, ValueExpression> = {};
  for (const [key, value] of Object.entries(instruction.params || {})) {
    if (key === 'size' || key === 'stroke_width') {
      params[key] = resolveNumberValue(context, value, scope, instruction.loc, `text param '${key}'`);
    } else {
      params[key] = resolveStringValue(context, value, scope, instruction.loc, `text param '${key}'`);
    }
  }

  return {
    ...instruction,
    content: resolveStringValue(context, instruction.content, scope, instruction.loc, 'text content'),
    params,
  };
}

function lowerFilterInstruction(context: CompilerContext, instruction: FilterNode, scope: Scope): FilterNode {
  const params: Record<string, ValueExpression> = {};
  for (const [key, value] of Object.entries(instruction.params || {})) {
    params[key] = resolveNumberValue(context, value, scope, instruction.loc, `filter param '${key}'`);
  }
  return { ...instruction, params };
}

function lowerShaderInstruction(context: CompilerContext, instruction: ShaderNode, scope: Scope): ShaderNode {
  const params: Record<string, ValueExpression> = {};
  for (const [key, value] of Object.entries(instruction.params || {})) {
    const resolved = resolveValue(context, value, scope, instruction.loc);
    if (typeof resolved !== 'string' && typeof resolved !== 'number') {
      addError(context, `Shader param '${key}' must resolve to a string or number`, scope.module.id, instruction.loc);
      params[key] = '';
    } else {
      params[key] = resolved;
    }
  }

  return {
    ...instruction,
    name: resolveStringValue(context, instruction.name, scope, instruction.loc, 'shader name'),
    params,
  };
}

function lowerAudioInstruction(context: CompilerContext, instruction: AudioNode, scope: Scope): AudioNode {
  const params: Record<string, ValueExpression> = {};
  for (const [key, value] of Object.entries(instruction.params || {})) {
    params[key] = resolveNumberValue(context, value, scope, instruction.loc, `audio param '${key}'`);
  }
  return { ...instruction, name: resolveReferenceName(context, instruction.name, scope, instruction.loc, 'audio target'), params };
}

function lowerCompositeParams(
  context: CompilerContext,
  params: Record<string, ValueExpression>,
  scope: Scope,
  location?: SourceLocation,
): Record<string, ValueExpression> {
  const lowered: Record<string, ValueExpression> = {};
  for (const [key, value] of Object.entries(params || {})) {
    if (key === 'mode') {
      lowered[key] = resolveStringValue(context, value, scope, location, `composite param '${key}'`);
    } else {
      lowered[key] = resolveNumberValue(context, value, scope, location, `composite param '${key}'`);
    }
  }
  return lowered;
}

function lowerInstructions(
  context: CompilerContext,
  instructions: TimeBlockNode['instructions'],
  scope: Scope,
): TimeBlockNode['instructions'] {
  return instructions.map((instruction) => {
    if (typeof instruction === 'string') {
      return resolveReferenceName(context, instruction, scope, undefined, 'clip reference');
    }

    if (instruction.type === 'QualifiedReference') {
      const resolved = resolveValue(context, instruction, scope, instruction.loc);
      if (typeof resolved === 'string') {
        return resolved;
      }
      addError(context, 'Expected qualified clip reference to resolve to a string', scope.module.id, instruction.loc);
      return '';
    }

    switch (instruction.type) {
      case 'Text':
        return lowerTextInstruction(context, instruction, scope);
      case 'Filter':
        return lowerFilterInstruction(context, instruction, scope);
      case 'Shader':
        return lowerShaderInstruction(context, instruction, scope);
      case 'Audio':
        return lowerAudioInstruction(context, instruction, scope);
      case 'VideoTrim':
        return {
          ...instruction,
          target: resolveReferenceName(context, instruction.target, scope, instruction.loc, 'video target'),
          params: {
            start: instruction.params.start !== undefined
              ? resolveNumberValue(context, instruction.params.start, scope, instruction.loc, 'trim start')
              : undefined,
            end: instruction.params.end !== undefined
              ? resolveNumberValue(context, instruction.params.end, scope, instruction.loc, 'trim end')
              : undefined,
          },
        } as VideoTrimNode;
      case 'VideoResize':
        return {
          ...instruction,
          target: resolveReferenceName(context, instruction.target, scope, instruction.loc, 'video target'),
          width: resolveNumberValue(context, instruction.width, scope, instruction.loc, 'resize width'),
          height: resolveNumberValue(context, instruction.height, scope, instruction.loc, 'resize height'),
        } as VideoResizeNode;
      case 'VideoSpeed':
        return {
          ...instruction,
          target: resolveReferenceName(context, instruction.target, scope, instruction.loc, 'video target'),
          factor: resolveNumberValue(context, instruction.factor, scope, instruction.loc, 'speed factor'),
        } as VideoSpeedNode;
      case 'VideoLoop':
        return {
          ...instruction,
          target: resolveReferenceName(context, instruction.target, scope, instruction.loc, 'video target'),
          count: resolveNumberValue(context, instruction.count, scope, instruction.loc, 'loop count'),
        } as VideoLoopNode;
      case 'VideoOpacity':
        return {
          ...instruction,
          target: resolveReferenceName(context, instruction.target, scope, instruction.loc, 'video target'),
          value: resolveNumberValue(context, instruction.value, scope, instruction.loc, 'opacity value'),
          duration: resolveNumberValue(context, instruction.duration, scope, instruction.loc, 'opacity duration'),
        } as VideoOpacityNode;
      case 'Overlay':
        return {
          ...instruction,
          target: resolveReferenceName(context, instruction.target, scope, instruction.loc, 'video target'),
          overlay: resolveReferenceName(context, instruction.overlay, scope, instruction.loc, 'overlay target'),
          params: lowerCompositeParams(context, instruction.params, scope, instruction.loc),
        } as OverlayNode;
      case 'Composite':
        return {
          ...instruction,
          target: resolveReferenceName(context, instruction.target, scope, instruction.loc, 'video target'),
          other: resolveReferenceName(context, instruction.other, scope, instruction.loc, 'composite target'),
          params: lowerCompositeParams(context, instruction.params, scope, instruction.loc),
        } as CompositeNode;
      default:
        return instruction;
    }
  });
}

function lowerTimeBlock(
  context: CompilerContext,
  block: TimeBlockNode,
  scope: Scope,
  offset: number,
): TimeBlockNode {
  const startValue = resolveTimeSpec(context, block.start, scope, block.loc);
  const endValue = resolveTimeSpec(context, block.end, scope, block.loc);
  const loweredStart = startValue + offset;
  const loweredEnd = endValue === Infinity ? Infinity : endValue + offset;

  return {
    ...block,
    start: { value: loweredStart, raw: String(loweredStart) },
    end: { value: loweredEnd, raw: loweredEnd === Infinity ? 'end' : String(loweredEnd), isEnd: loweredEnd === Infinity },
    instructions: lowerInstructions(context, block.instructions, scope),
  };
}

function resolveTimelineBinding(
  context: CompilerContext,
  scope: Scope,
  reference: string | QualifiedReferenceNode,
  location?: SourceLocation,
): TimelineBinding | null {
  if (typeof reference === 'string') {
    const binding = scope.timelineBindings.get(reference);
    if (binding) {
      return binding;
    }

    addError(context, `Unknown timeline '${reference}'`, scope.module.id, location);
    return null;
  }

  const namespaceModule = scope.namespaceBindings.get(reference.object);
  if (!namespaceModule) {
    addError(context, `Unknown namespace '${reference.object}'`, scope.module.id, location || reference.loc);
    return null;
  }

  const timeline = getExportedTimeline(context, namespaceModule, reference.property, location || reference.loc);
  return timeline ? { module: namespaceModule, timeline } : null;
}

function bindTimelineParams(
  context: CompilerContext,
  binding: TimelineBinding,
  callerScope: Scope,
  args: ObjectExpressionNode,
): Map<string, CompilerValue> {
  const providedArgs = new Map<string, CompilerValue>();
  const validParams = new Set(binding.timeline.params.map((param) => param.name));

  for (const property of args.properties) {
    if (!validParams.has(property.key)) {
      addError(
        context,
        `Unknown param '${property.key}' for timeline '${binding.timeline.name}'`,
        callerScope.module.id,
        binding.timeline.loc,
      );
      continue;
    }

    providedArgs.set(property.key, resolveValue(context, property.value, callerScope, binding.timeline.loc));
  }

  const bound = new Map<string, CompilerValue>();
  for (const param of binding.timeline.params) {
    if (providedArgs.has(param.name)) {
      bound.set(param.name, providedArgs.get(param.name) as CompilerValue);
      continue;
    }

    if (param.default !== null) {
      const defaultScope = createScope(context, binding.module, bound);
      bound.set(param.name, resolveValue(context, param.default, defaultScope, binding.timeline.loc));
      continue;
    }

    addError(
      context,
      `Missing required param '${param.name}' for timeline '${binding.timeline.name}'`,
      callerScope.module.id,
      binding.timeline.loc,
    );
    bound.set(param.name, null);
  }

  return bound;
}

function lowerUseStatement(
  context: CompilerContext,
  statement: UseTimelineNode,
  scope: Scope,
  baseOffset = 0,
): StatementNode[] {
  const binding = resolveTimelineBinding(context, scope, statement.timeline, statement.loc);
  if (!binding) {
    return [];
  }

  const timelineKey = `${binding.module.id}:${binding.timeline.name}`;
  if (context.visitingTimelines.includes(timelineKey)) {
    const cyclePath = [...context.visitingTimelines, timelineKey].join(' -> ');
    addError(context, `Timeline expansion cycle detected: ${cyclePath}`, scope.module.id, statement.loc);
    return [];
  }

  const offset = baseOffset + resolveTimeSpec(context, statement.at, scope, statement.loc);
  const paramBindings = bindTimelineParams(context, binding, scope, statement.with);
  const timelineScope = createScope(context, binding.module, paramBindings);
  const lowered: StatementNode[] = [];

  context.visitingTimelines.push(timelineKey);
  try {
    for (const timelineStatement of binding.timeline.body) {
      if (timelineStatement.type === 'TimeBlock') {
        lowered.push(lowerTimeBlock(context, timelineStatement, timelineScope, offset));
      } else if (timelineStatement.type === 'UseTimeline') {
        lowered.push(...lowerUseStatement(context, timelineStatement, timelineScope, offset));
      }
    }
  } finally {
    context.visitingTimelines.pop();
  }

  return lowered;
}

function validateImportedModuleStatements(context: CompilerContext, module: ModuleRecord): void {
  if (module.id === context.entryId) {
    return;
  }

  for (const statement of module.ast.statements) {
    if (
      statement.type === 'Import' ||
      statement.type === 'ImportShader' ||
      statement.type === 'ExportConst' ||
      statement.type === 'ExportTimeline'
    ) {
      continue;
    }

    addError(
      context,
      `Unsupported top-level statement '${statement.type}' in imported module '${module.id}'`,
      module.id,
      statement.loc,
    );
  }
}

function lowerProgram(context: CompilerContext, module: ModuleRecord): ProgramNode | null {
  validateImportedModuleStatements(context, module);
  const scope = createScope(context, module);
  const statements: StatementNode[] = [];

  for (const statement of module.ast.statements) {
    switch (statement.type) {
      case 'Import':
      case 'ExportConst':
      case 'ExportTimeline':
        break;
      case 'UseTimeline':
        statements.push(...lowerUseStatement(context, statement, scope));
        break;
      case 'TimeBlock':
        statements.push(lowerTimeBlock(context, statement, scope, 0));
        break;
      default:
        statements.push(statement);
        break;
    }
  }

  if (context.errors.length > 0) {
    return null;
  }

  return {
    type: 'Program',
    statements,
    loc: module.ast.loc,
  };
}

export function compileVidscript(code: string, options: CompileOptions = {}): CompileResult {
  const context = createCompilerContext(options);
  const entry = loadModule(context, context.entryId, code);

  if (!entry) {
    return {
      ast: null,
      program: null,
      errors: context.errors,
    };
  }

  for (const moduleRecord of context.modules.values()) {
    validateImportedModuleStatements(context, moduleRecord);
  }

  const lowered = lowerProgram(context, entry);
  return {
    ast: entry.ast,
    program: context.errors.length > 0 ? null : lowered,
    errors: context.errors,
  };
}
