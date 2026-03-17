{
  function node(type, props) {
    return { type, ...props, loc: location() };
  }

  function toObject(head, tail) {
    const result = { [head.key]: head.value };
    for (const item of tail) {
      const entry = item[3];
      result[entry.key] = entry.value;
    }
    return result;
  }

  function objectExpression(head, tail) {
    return node('ObjectExpression', {
      properties: [head, ...tail.map((item) => item[3])],
    });
  }

  function programFrom(head, tail) {
    const statements = [];
    if (head) statements.push(head);
    for (const item of tail) {
      if (item[1]) statements.push(item[1]);
    }
    return node('Program', { statements });
  }

  function filteredStatements(head, tail) {
    const statements = [];
    if (head) statements.push(head);
    for (const item of tail) {
      if (item[1]) statements.push(item[1]);
    }
    return statements;
  }

  function filteredTimelineStatements(head, tail) {
    const statements = [];
    if (head) statements.push(head);
    for (const item of tail) {
      if (item[1]) statements.push(item[1]);
    }
    return statements;
  }

  function timeSpecFrom(raw, value, reference, isEnd) {
    const spec = { raw, value: value == null ? null : value };
    if (reference !== undefined) spec.reference = reference;
    if (isEnd) spec.isEnd = true;
    return spec;
  }

  function qualifiedReference(object, property) {
    return node('QualifiedReference', { object, property });
  }

  function referenceRaw(reference) {
    return typeof reference === 'string'
      ? reference
      : `${reference.object}.${reference.property}`;
  }
}

Parser
  = _ head:Statement? tail:(__ Statement)* _ {
      return programFrom(head, tail);
    }

__
  = [ \t\r\n]+

_ "whitespace"
  = [ \t\r\n]*

Statement
  = Comment
  / ImportShaderStatement
  / ImportStatement
  / ExportConstStatement
  / ExportTimelineStatement
  / UseStatement
  / InputStatement
  / VariableAssignment
  / TimeBlock
  / OutputStatement
  / FunctionDef

Comment
  = "#" [^\n]* { return null; }
  / "/*" (!"*/" .)* "*/" { return null; }

ImportShaderStatement
  = "import" __ "shader" __ name:Identifier _ "from" _ path:String {
      return node('ImportShader', { name, path });
    }

ImportStatement
  = "import" __ clause:(NamedImportClause / NamespaceImportClause) _ "from" _ source:String {
      return node('Import', { clause, source });
    }

NamedImportClause
  = "{" _ head:NamedImportSpecifier tail:(_ "," _ NamedImportSpecifier)* _ ("," _)? "}" {
      return {
        type: 'NamedImportClause',
        specifiers: [head, ...tail.map((item) => item[3])],
      };
    }

NamedImportSpecifier
  = imported:Identifier alias:(_ "as" _ Identifier)? {
      return { imported, local: alias ? alias[3] : imported };
    }

NamespaceImportClause
  = "*" _ "as" _ local:Identifier {
      return { type: 'NamespaceImportClause', local };
    }

ExportConstStatement
  = "export" __ "const" __ name:Identifier _ "=" _ value:Value {
      return node('ExportConst', { name, value });
    }

ExportTimelineStatement
  = "export" __ "timeline" __ name:Identifier _ "(" _ params:FunctionParams? _ ")" _ "{" _ head:TimelineBodyStatement? tail:(__ TimelineBodyStatement)* _ "}" {
      return node('ExportTimeline', {
        name,
        params: params || [],
        body: filteredTimelineStatements(head, tail),
      });
    }

TimelineBodyStatement
  = Comment
  / UseStatement
  / TimeBlock

UseStatement
  = "use" __ timeline:Reference _ "at" _ at:TimeSpec _ "with" _ args:ObjectExpression {
      return node('UseTimeline', { timeline, at, with: args });
    }

InputStatement
  = "input" _ name:Identifier _ "=" _ path:String {
      return node('Input', { name, path });
    }

VariableAssignment
  = "let" _ name:Identifier _ "=" _ value:Value {
      return node('Variable', { name, value });
    }

OutputStatement
  = "output" _ "to" _ path:String _ options:(_ "," _ OutputOptions)? {
      return node('Output', { path, options: options ? options[3] : {} });
    }

OutputOptions
  = head:OutputOption tail:(_ "," _ OutputOption)* {
      const acc = { [head.key]: head.value };
      for (const item of tail) {
        acc[item[3].key] = item[3].value;
      }
      return acc;
    }

OutputOption
  = "resolution" _ ":" _ value:Resolution {
      return { key: 'resolution', value: String(value) };
    }
  / key:("format" / "codec" / "fps" / "bitrate") _ ":" _ value:Value {
      return { key, value };
    }

Resolution
  = width:Number "x" height:Number { return `${width}x${height}`; }
  / num:Number { return num; }

TimeBlock
  = "[" _ start:TimeSpec _ "-" _ end:EndTimeSpec "]" _ "=" _ instructions:InstructionList {
      return node('TimeBlock', { start, end, instructions });
    }

EndTimeSpec
  = "end" { return timeSpecFrom('end', Infinity, undefined, true); }
  / TimeSpec

TimeSpec
  = value:TimeLiteral {
      return timeSpecFrom(String(value), value);
    }
  / reference:Reference {
      return timeSpecFrom(referenceRaw(reference), null, reference);
    }

TimeLiteral
  = num:Number unit:TimeUnit? {
      const unitMap = { s: 1, ms: 0.001, f: 1 / 30, sec: 1, seconds: 1 };
      return num * (unitMap[unit] || 1);
    }
  / "frame" __ num:Number { return num / 30; }
  / "0:" min:Number ":" sec:Number { return min * 60 + sec; }
  / hour:Number ":" min:Number ":" sec:Number { return hour * 3600 + min * 60 + sec; }

TimeUnit
  = "s" / "ms" / "f" / "sec" / "seconds"

InstructionList
  = head:Instruction tail:(_ "\n" _ Instruction)* {
      return [head, ...tail.map((item) => item[3])];
    }

Instruction
  = VideoInstruction
  / AudioInstruction
  / TextInstruction
  / FilterInstruction
  / ShaderInstruction
  / CompositeInstruction
  / ReferenceInstruction

ReferenceInstruction
  = reference:Reference { return reference; }

VideoInstruction
  = target:Identifier "." "Trim" _ "(" _ start:Value _ "," _ end:Value _ ")" {
      return node('VideoTrim', { target, params: { start, end } });
    }
  / target:Identifier "." "Trim" _ "(" _ start:Value _ ")" {
      return node('VideoTrim', { target, params: { start } });
    }
  / target:Identifier "." "Resize" _ "(" _ width:Value _ "," _ height:Value _ ")" {
      return node('VideoResize', { target, width, height });
    }
  / target:Identifier "." "Speed" _ "(" _ factor:Value _ ")" {
      return node('VideoSpeed', { target, factor });
    }
  / target:Identifier "." "Loop" _ "(" _ count:Value _ ")" {
      return node('VideoLoop', { target, count });
    }
  / target:Identifier "." "Opacity" _ "(" _ value:Value _ "," _ duration:Value _ ")" {
      return node('VideoOpacity', { target, value, duration });
    }

AudioInstruction
  = "audio" __ name:Identifier _ "," _ params:AudioParams {
      return node('Audio', { name, params });
    }

AudioParams
  = head:AudioParam tail:(_ "," _ AudioParam)* { return toObject(head, tail); }

AudioParam
  = key:("volume" / "fade_in" / "fade_out") _ ":" _ value:Value {
      return { key, value };
    }

TextInstruction
  = "text" __ content:(String / Reference) _ "," _ params:TextParams {
      return node('Text', { content, params });
    }

TextParams
  = head:TextParam tail:(_ "," _ TextParam)* { return toObject(head, tail); }

TextParam
  = key:("style" / "position" / "color" / "stroke" / "stroke_width" / "font" / "size" / "animation") _ ":" _ value:Value {
      return { key, value };
    }

FilterInstruction
  = "filter" __ name:String _ "," _ params:FilterParams {
      return node('Filter', { name, params });
    }

FilterParams
  = head:FilterParam tail:(_ "," _ FilterParam)* { return toObject(head, tail); }

FilterParam
  = key:Identifier _ ":" _ value:Value {
      return { key, value };
    }

ShaderInstruction
  = "shader" __ name:(String / Identifier) _ "," _ params:ShaderParams {
      return node('Shader', { name, params });
    }

ShaderParams
  = head:ShaderParam tail:(_ "," _ ShaderParam)* { return toObject(head, tail); }

ShaderParam
  = key:Identifier _ ":" _ value:Value {
      return { key, value };
    }

CompositeInstruction
  = target:Identifier "." "Overlay" _ "(" _ overlay:Identifier _ "," _ params:CompositeParams _ ")" {
      return node('Overlay', { target, overlay, params });
    }
  / target:Identifier "." "Composite" _ "(" _ other:Identifier _ "," _ params:CompositeParams _ ")" {
      return node('Composite', { target, other, params });
    }

CompositeParams
  = head:CompositeParam tail:(_ "," _ CompositeParam)* { return toObject(head, tail); }

CompositeParam
  = key:("x" / "y" / "mode" / "opacity") _ ":" _ value:Value {
      return { key, value };
    }

ObjectExpression
  = "{" _ head:ObjectProperty tail:(_ "," _ ObjectProperty)* _ ("," _)? "}" {
      return objectExpression(head, tail);
    }
  / "{" _ "}" {
      return node('ObjectExpression', { properties: [] });
    }

ObjectProperty
  = key:Identifier _ ":" _ value:Value {
      return { key, value };
    }

FunctionDef
  = "fn" _ name:Identifier _ "(" _ params:FunctionParams? _ ")" _ "{" _ head:Statement? tail:(__ Statement)* _ "}" {
      return node('Function', {
        name,
        params: params || [],
        body: filteredStatements(head, tail),
      });
    }

FunctionParams
  = head:FunctionParam tail:(_ "," _ FunctionParam)* {
      return [head, ...tail.map((item) => item[3])];
    }

FunctionParam
  = name:Identifier _ ":" _ type:Identifier def:(_ "=" _ Value)? {
      return { name, type, default: def ? def[3] : null };
    }

Reference
  = QualifiedReference
  / Identifier

QualifiedReference
  = object:Identifier "." property:Identifier {
      return qualifiedReference(object, property);
    }

Value
  = ObjectExpression
  / QualifiedReference
  / Boolean
  / TimeLiteral
  / String
  / Identifier

Identifier "identifier"
  = name:$([a-zA-Z_][a-zA-Z0-9_]*) { return name; }

Number "number"
  = num:$([0-9]+ ("." [0-9]+)?) { return parseFloat(num); }

String "string"
  = '"' chars:$([^"\\] / "\\" .)* '"' { return chars; }
  / "'" chars:$([^'\\] / "\\" .)* "'" { return chars; }

Boolean
  = "true" { return true; }
  / "false" { return false; }
