{
  "name": "vidscript",
  "version": "1.0.0",
  "description": "VidScript DSL - Text-based video creation language"
}

{
  "peg$parser": {
    "start": "Program",
    "tracing": false,
    "cache": false,
    "output": "parser",
    "format": "ts",
    "exportNamedFunctions": false,
    "extraFile": "",
    "signature": false,
    "plugins": []
  }
}

Program
  = _ statements:Statement* _ {
      return { type: 'Program', statements: statements.filter(s => s !== null) };
    }

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
  = "output" _ "to" _ path:String _ ","? _ options:OutputOptions? {
      return { type: 'Output', path, options: options || {} };
    }

OutputOptions
  = head:OutputOption tail:(_ "," _ OutputOption)* {
      return tail.reduce((acc, item) => ({ ...acc, [item[3].key]: item[3].value }), head);
    }

OutputOption
  = key:("format" / "resolution" / "codec" / "fps" / "bitrate") _ ":" _ value:(String / Identifier / NumberLiteral) {
      return { key, value };
    }

TimeBlock
  = "[" _ start:TimeSpec _ "-" _ end:TimeSpec "]" _ "=" _ instructions:InstructionList {
      return { type: 'TimeBlock', start, end, instructions };
    }
  / "[" _ start:TimeSpec _ "-" _ "end" "]" _ "=" _ instructions:InstructionList {
      return { type: 'TimeBlock', start, end: { value: Infinity, raw: 'end' }, instructions };
    }

TimeSpec
  = value:TimeValue { return { value, raw: text(), loc: location() }; }

TimeValue
  = num:Number _ unit:TimeUnit? {
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
  / head:Instruction {
      return [head];
    }

Instruction
  = VideoInstruction
  / AudioInstruction
  / TextInstruction
  / FilterInstruction
  / ShaderInstruction
  / CompositeInstruction
  / ExpressionInstruction

ExpressionInstruction
  = target:Identifier "." method:Identifier _ "(" _ params:CallParams? _ ")" {
      return { type: 'MethodCall', target, method, params: params || {} };
    }
  / target:Identifier {
      return { type: 'UseVideo', name: target };
    }

VideoInstruction
  = target:Identifier "." "Trim" _ "(" _ params:CallParams _ ")" {
      return { type: 'VideoTrim', target, params };
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
  / "audio" _ name:Identifier {
      return { type: 'Audio', name, params: {} };
    }

AudioParams
  = head:AudioParam tail:(_ "," _ AudioParam)* {
      return tail.reduce((acc, item) => ({ ...acc, [item[3].key]: item[3].value }), head);
    }

AudioParam
  = key:("volume" / "fade_in" / "fade_out") _ ":" _ value:Number {
      return { key, value };
    }

TextInstruction
  = "text" _ content:String _ "," _ params:TextParams {
      return { type: 'Text', content, params };
    }
  / "text" _ content:String {
      return { type: 'Text', content, params: {} };
    }

TextParams
  = head:TextParam tail:(_ "," _ TextParam)* {
      return tail.reduce((acc, item) => ({ ...acc, [item[3].key]: item[3].value }), head);
    }

TextParam
  = key:("style" / "position" / "color" / "stroke" / "stroke_width" / "font" / "size" / "animation") _ ":" _ value:(String / Identifier) {
      return { key, value };
    }

FilterInstruction
  = "filter" _ name:String _ "," _ params:FilterParams {
      return { type: 'Filter', name, params };
    }
  / "filter" _ name:String {
      return { type: 'Filter', name, params: {} };
    }

FilterParams
  = head:FilterParam tail:(_ "," _ FilterParam)* {
      return tail.reduce((acc, item) => ({ ...acc, [item[3].key]: item[3].value }), head);
    }

FilterParam
  = key:Identifier _ ":" _ value:Number {
      return { key, value };
    }

ShaderInstruction
  = "shader" _ name:String _ "," _ params:ShaderParams {
      return { type: 'Shader', name, params };
    }
  / "shader" _ name:String {
      return { type: 'Shader', name, params: {} };
    }

ShaderParams
  = head:ShaderParam tail:(_ "," _ ShaderParam)* {
      return tail.reduce((acc, item) => ({ ...acc, [item[3].key]: item[3].value }), head);
    }

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
  = head:CompositeParam tail:(_ "," _ CompositeParam)* {
      return tail.reduce((acc, item) => ({ ...acc, [item[3].key]: item[3].value }), head);
    }

CompositeParam
  = key:("x" / "y" / "mode" / "opacity") _ ":" _ value:(Number / String / Identifier) {
      return { key, value };
    }

Expression
  = CallExpression
  / Identifier
  / String
  / NumberLiteral
  / BooleanLiteral

CallExpression
  = name:Identifier _ "(" _ params:CallParams? _ ")" {
      return { type: 'Call', name, params: params || {} };
    }

CallParams
  = head:ParamValue tail:(_ "," _ ParamValue)* {
      return tail.reduce((acc, item) => {
        if (typeof item[3] === 'object' && item[3].key) {
          return { ...acc, [item[3].key]: item[3].value };
        }
        return { ...acc, value: item[3] };
      }, typeof head === 'object' && head.key ? head : { value: head });
    }

ParamValue
  = key:Identifier _ ":" _ value:Value { return { key, value }; }
  / Value

Value
  = NumberLiteral
  / String
  / Identifier
  / BooleanLiteral

NumberLiteral
  = num:Number { return num; }

BinaryExpression
  = left:Expression _ op:("+" / "-") _ right:Expression {
      return { type: 'Binary', op, left, right };
    }

FunctionDef
  = "fn" _ name:Identifier _ "(" _ params:FunctionParams? _ ")" _ "{" _ body:Statement* _ "}" {
      return { type: 'Function', name, params: params || [], body: body.filter(s => s !== null) };
    }

FunctionParams
  = head:FunctionParam tail:(_ "," _ FunctionParam)* {
      return [head, ...tail.map(t => t[3])];
    }

FunctionParam
  = name:Identifier _ ":" _ type:Identifier default:(_ "=" _ Value)? {
      return { name, type, default: default ? default[3] : null };
    }

Identifier
  = name:[a-zA-Z_][a-zA-Z0-9_]* { return name.join(''); }

Number
  = num:([0-9]+ ("." [0-9]+)?) { return parseFloat(num.join('')); }

String
  = '"' chars:([^"\\] / "\\" .)* '"' { return chars.join(''); }
  / "'" chars:([^'\\] / "\\" .)* "'" { return chars.join(''); }

BooleanLiteral
  = "true" { return true; }
  / "false" { return false; }

_ "whitespace"
  = [ \t\r\n]*
