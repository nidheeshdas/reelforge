{
  function makeNode(type, props) {
    return { type, ...props, loc: location() };
  }

  function toObjectParams(head, tail) {
    const result = {};
    const entries = [head, ...tail.map((item) => item[3])];

    for (const entry of entries) {
      if (entry && typeof entry === 'object' && entry.key) {
        result[entry.key] = entry.value;
      }
    }

    return result;
  }
}

Parser
  = statements:(Statement __)* {
      const filtered = [];
      for (let i = 0; i < statements.length; i++) {
        if (statements[i][0] !== null) filtered.push(statements[i][0]);
      }
      return { type: 'Program', statements: filtered };
    }

__
  = [ \t\r\n]+

_ "whitespace"
  = [ \t\r\n]*

Statement
  = Comment
  / ImportStatement
  / InputStatement
  / VariableAssignment
  / TimeBlock
  / OutputStatement
  / FunctionDef
  / EmptyStatement

Comment
  = "#" [^\n]* { return null; }
  / "/*" (!"*/" .)* "*/" { return null; }

EmptyStatement
  = _ { return null; }

ImportStatement
  = "import" _ "shader" _ name:Identifier _ "from" _ path:String {
      return { type: 'ImportShader', name, path };
    }

InputStatement
  = "input" _ name:Identifier _ "=" _ path:String {
      return { type: 'Input', name, path };
    }

VariableAssignment
  = "let" _ name:Identifier _ "=" _ value:Expression {
      return { type: 'Variable', name, value };
    }

OutputStatement
  = "output" _ "to" _ path:String _ options:(_ "," _ OutputOptions)? {
      return { type: 'Output', path, options: options ? options[3] : {} };
    }

OutputOptions
  = head:OutputOption tail:(_ "," _ OutputOption)* {
      const acc = head;
      for (let i = 0; i < tail.length; i++) {
        const item = tail[i][3];
        acc[item.key] = item.value;
      }
      return acc;
    }

OutputOption
  = "resolution" _ ":" _ value:Resolution {
      return { key: 'resolution', value: String(value) };
    }
  / key:("format" / "codec" / "fps" / "bitrate") _ ":" _ value:(String / Identifier / Number) {
      return { key, value: String(value) };
    }

Resolution
  = width:Number "x" height:Number { return width + "x" + height; }
  / num:Number

TimeBlock
  = "[" _ start:TimeSpec _ "-" _ end:TimeSpec "]" _ "=" _ instructions:InstructionList {
      return { type: 'TimeBlock', start, end, instructions };
    }
  / "[" _ start:TimeSpec _ "-" _ "end" "]" _ "=" _ instructions:InstructionList {
      return { type: 'TimeBlock', start, end: { value: Infinity, raw: 'end' }, instructions };
    }

TimeSpec
  = value:TimeValue { return { value, raw: String(value) }; }

TimeValue
  = num:Number unit:TimeUnit? {
      const unitMap = { s: 1, ms: 0.001, f: 1/30 };
      return num * (unitMap[unit] || 1);
    }
  / "frame" _ num:Number { return num / 30; }
  / "0:" min:Number ":" sec:Number { return min * 60 + sec; }
  / hour:Number ":" min:Number ":" sec:Number { return hour * 3600 + min * 60 + sec; }

TimeUnit
  = "s" / "ms" / "f" / "sec" / "seconds"

InstructionList
  = head:Instruction tail:(_ "\n" _ Instruction)* {
      return [head, ...tail.map(t => t[3])];
    }

Instruction
  = VideoInstruction
  / AudioInstruction
  / TextInstruction
  / FilterInstruction
  / ShaderInstruction
  / CompositeInstruction
  / Expression

VideoInstruction
  = target:Identifier "." "Trim" _ "(" _ start:Number _ "," _ end:Number _ ")" {
      return { type: 'VideoTrim', target, params: { start, end } };
    }
  / target:Identifier "." "Trim" _ "(" _ start:Number _ ")" {
      return { type: 'VideoTrim', target, params: { start } };
    }
  / target:Identifier "." "Resize" _ "(" _ width:Number _ "," _ height:Number _ ")" {
      return { type: 'VideoResize', target, width, height };
    }
  / target:Identifier "." "Speed" _ "(" _ factor:Number _ ")" {
      return { type: 'VideoSpeed', target, factor };
    }
  / target:Identifier "." "Loop" _ "(" _ count:Number _ ")" {
      return { type: 'VideoLoop', target, count };
    }
  / target:Identifier "." "Opacity" _ "(" _ value:Number _ "," _ duration:Number _ ")" {
      return { type: 'VideoOpacity', target, value, duration };
    }

AudioInstruction
  = "audio" _ name:Identifier _ "," _ params:AudioParams {
      return { type: 'Audio', name, params };
    }

AudioParams
  = head:AudioParam tail:(_ "," _ AudioParam)* { return toObjectParams(head, tail); }

AudioParam
  = key:("volume" / "fade_in" / "fade_out") _ ":" _ value:TimeValue {
      return { key, value };
    }

TextInstruction
  = "text" _ content:String _ "," _ params:TextParams {
      return { type: 'Text', content, params };
    }

TextParams
  = head:TextParam tail:(_ "," _ TextParam)* { return toObjectParams(head, tail); }

TextParam
  = key:("style" / "position" / "color" / "stroke" / "stroke_width" / "font" / "size" / "animation") _ ":" _ value:(String / Identifier) {
      return { key, value };
    }

FilterInstruction
  = "filter" _ name:String _ "," _ params:FilterParams {
      return { type: 'Filter', name, params };
    }

FilterParams
  = head:FilterParam tail:(_ "," _ FilterParam)* { return toObjectParams(head, tail); }

FilterParam
  = key:Identifier _ ":" _ value:Number {
      return { key, value };
    }

ShaderInstruction
  = "shader" _ name:String _ "," _ params:ShaderParams {
      return { type: 'Shader', name, params };
    }

ShaderParams
  = head:ShaderParam tail:(_ "," _ ShaderParam)* { return toObjectParams(head, tail); }

ShaderParam
  = key:Identifier _ ":" _ value:(Number / String) {
      return { key, value };
    }

CompositeInstruction
  = target:Identifier "." "Overlay" _ "(" _ overlay:Identifier _ "," _ params:CompositeParams _ ")" {
      return { type: 'Overlay', target, overlay, params };
    }
  / target:Identifier "." "Composite" _ "(" _ other:Identifier _ "," _ params:CompositeParams _ ")" {
      return { type: 'Composite', target, other, params };
    }

CompositeParams
  = head:CompositeParam tail:(_ "," _ CompositeParam)* { return toObjectParams(head, tail); }

CompositeParam
  = key:("x" / "y" / "mode" / "opacity") _ ":" _ value:(Number / String / Identifier) {
      return { key, value };
    }

Expression
  = BinaryExpression

BinaryExpression
  = left:AddExpr _ op:("+" / "-") _ right:BinaryExpression {
      return { type: 'Binary', op, left, right };
    }
  / AddExpr

AddExpr
  = CallExpression
  / Identifier
  / String
  / Number
  / "(" _ expr:Expression _ ")" { return expr; }

CallExpression
  = name:Identifier _ "(" _ params:CallParams? _ ")" {
      return { type: 'Call', name, params: params || [] };
    }

CallParams
  = head:ParamValue tail:(_ "," _ ParamValue)* {
      let acc = {};
      if (head.key) {
        acc[head.key] = head.value;
      } else {
        acc = head;
      }
      for (let i = 0; i < tail.length; i++) {
        const item = tail[i][3];
        if (typeof item === 'object' && item.key) {
          acc[item.key] = item.value;
        }
      }
      return acc;
    }

ParamValue
  = key:Identifier _ ":" _ value:Value { return { key, value }; }
  / Value

Value
  = Number
  / String
  / Identifier
  / Boolean

FunctionDef
  = "fn" _ name:Identifier _ "(" _ params:FunctionParams? _ ")" _ "{" _ body:(Statement __)* _ "}" {
      const filtered = [];
      for (let i = 0; i < body.length; i++) {
        if (body[i][0] !== null) filtered.push(body[i][0]);
      }
      return { type: 'Function', name, params: params || [], body: filtered };
    }

FunctionParams
  = head:FunctionParam tail:(_ "," _ FunctionParam)* {
      return [head, ...tail.map(t => t[3])];
    }

FunctionParam
  = name:Identifier _ ":" _ type:Identifier def:(_ "=" _ Value)? {
      return { name, type, default: def ? def[3] : null };
    }

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
