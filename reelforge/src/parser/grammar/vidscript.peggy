{
  function makeNode(type, props) {
    return { type, ...props, loc: location() };
  }
  
  function parseTime(str) {
    const s = str.replace(/^\s+|\s+$/g, '');
    if (s.includes(':')) {
      const parts = s.split(':').map(p => parseInt(p, 10));
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (s.endsWith('ms')) return parseFloat(s) / 1000;
    if (s.endsWith('s')) return parseFloat(s.slice(0, -1));
    return parseFloat(s);
  }
}

Parser
  = __ statements:(Statement __)* {
      var filtered = [];
      for (var i = 0; i < statements.length; i++) {
        if (statements[i][0] !== null) filtered.push(statements[i][0]);
      }
      return { type: 'Program', statements: filtered };
    }

__
  = [ \t\r\n]+

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
  = __ { return null; }

ImportStatement
  = "import" __ "shader" __ name:Identifier __ "from" __ path:String {
      return { type: 'ImportShader', name, path };
    }

InputStatement
  = "input" __ name:Identifier __ "=" __ path:String {
      return { type: 'Input', name, path };
    }

VariableAssignment
  = "let" __ name:Identifier __ "=" __ value:Expression {
      return { type: 'Variable', name, value };
    }

OutputStatement
  = "output" __ "to" __ path:String __ ","? __ options:OutputOptions? {
      return { type: 'Output', path, options: options || {} };
    }

OutputOptions
  = head:OutputOption tail:(__ "," __ OutputOption)* {
      return tail.reduce(function(acc, item) { return { ...acc, [item[3].key]: item[3].value }; }, head);
    }

OutputOption
  = key:("format" / "resolution" / "codec" / "fps" / "bitrate") __ ":" __ value:(String / Identifier / Number) {
      return { key, value: String(value) };
    }

TimeBlock
  = "[" __ start:TimeSpec __ "-" __ end:TimeSpec "]" __ "=" __ instructions:InstructionList {
      return { type: 'TimeBlock', start, end, instructions };
    }
  / "[" __ start:TimeSpec __ "-" __ "end" "]" __ "=" __ instructions:InstructionList {
      return { type: 'TimeBlock', start, end: { value: Infinity, raw: 'end' }, instructions };
    }

TimeSpec
  = value:TimeValue { return { value, raw: text(), loc: location() }; }

TimeValue
  = num:Number __ unit:TimeUnit? {
      const unitMap = { s: 1, ms: 0.001, f: 1/30 };
      return num * (unitMap[unit] || 1);
    }
  / "frame" __ num:Number { return num / 30; }
  / "0:" min:Number ":" sec:Number { return min * 60 + sec; }
  / hour:Number ":" min:Number ":" sec:Number { return hour * 3600 + min * 60 + sec; }

TimeUnit
  = "s" / "ms" / "f" / "sec" / "seconds"

InstructionList
  = head:Instruction tail:(__ "\n" __ Instruction)* {
      return [head, ...tail.map(function(t) { return t[3]; })];
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
  = target:Identifier "." "Trim" __ "(" __ params:CallParams __ ")" {
      return { type: 'VideoTrim', target, params };
    }
  / target:Identifier "." "Resize" __ "(" __ width:Number __ "," __ height:Number __ ")" {
      return { type: 'VideoResize', target, width, height };
    }
  / target:Identifier "." "Speed" __ "(" __ factor:Number __ ")" {
      return { type: 'VideoSpeed', target, factor };
    }
  / target:Identifier "." "Loop" __ "(" __ count:Number __ ")" {
      return { type: 'VideoLoop', target, count };
    }
  / target:Identifier "." "Opacity" __ "(" __ value:Number __ "," __ duration:Number __ ")" {
      return { type: 'VideoOpacity', target, value, duration };
    }

AudioInstruction
  = "audio" __ name:Identifier __ "," __ params:AudioParams {
      return { type: 'Audio', name, params };
    }

AudioParams
  = head:AudioParam tail:(__ "," __ AudioParam)* {
      return tail.reduce(function(acc, item) { return { ...acc, [item[3].key]: item[3].value }; }, head);
    }

AudioParam
  = key:("volume" / "fade_in" / "fade_out") __ ":" __ value:Number {
      return { key, value };
    }

TextInstruction
  = "text" __ content:String __ "," __ params:TextParams {
      return { type: 'Text', content, params };
    }

TextParams
  = head:TextParam tail:(__ "," __ TextParam)* {
      return tail.reduce(function(acc, item) { return { ...acc, [item[3].key]: item[3].value }; }, head);
    }

TextParam
  = key:("style" / "position" / "color" / "stroke" / "stroke_width" / "font" / "size" / "animation") __ ":" __ value:(String / Identifier) {
      return { key, value };
    }

FilterInstruction
  = "filter" __ name:String __ "," __ params:FilterParams {
      return { type: 'Filter', name, params };
    }

FilterParams
  = head:FilterParam tail:(__ "," __ FilterParam)* {
      return tail.reduce(function(acc, item) { return { ...acc, [item[3].key]: item[3].value }; }, head);
    }

FilterParam
  = key:Identifier __ ":" __ value:Number {
      return { key, value };
    }

ShaderInstruction
  = "shader" __ name:String __ "," __ params:ShaderParams {
      return { type: 'Shader', name, params };
    }

ShaderParams
  = head:ShaderParam tail:(__ "," __ ShaderParam)* {
      return tail.reduce(function(acc, item) { return { ...acc, [item[3].key]: item[3].value }; }, head);
    }

ShaderParam
  = key:Identifier __ ":" __ value:(Number / String) {
      return { key, value };
    }

CompositeInstruction
  = target:Identifier "." "Overlay" __ "(" __ overlay:Identifier __ "," __ params:CompositeParams __ ")" {
      return { type: 'Overlay', target, overlay, params };
    }
  / target:Identifier "." "Composite" __ "(" __ other:Identifier __ "," __ params:CompositeParams __ ")" {
      return { type: 'Composite', target, other, params };
    }

CompositeParams
  = head:CompositeParam tail:(__ "," __ CompositeParam)* {
      return tail.reduce(function(acc, item) { return { ...acc, [item[3].key]: item[3].value }; }, head);
    }

CompositeParam
  = key:("x" / "y" / "mode" / "opacity") __ ":" __ value:(Number / String / Identifier) {
      return { key, value };
    }

Expression
  = BinaryExpression

BinaryExpression
  = left:AddExpr __ op:("+" / "-") __ right:BinaryExpression {
      return { type: 'Binary', op, left, right };
    }
  / AddExpr

AddExpr
  = CallExpression
  / Identifier
  / String
  / Number
  / "(" __ expr:Expression __ ")" { return expr; }

CallExpression
  = name:Identifier __ "(" __ params:CallParams? __ ")" {
      return { type: 'Call', name, params: params || [] };
    }

CallParams
  = head:ParamValue tail:(__ "," __ ParamValue)* {
      var acc = {};
      if (head.key) {
        acc[head.key] = head.value;
      } else {
        acc = head;
      }
      for (var i = 0; i < tail.length; i++) {
        var item = tail[i][3];
        if (typeof item === 'object' && item.key) {
          acc[item.key] = item.value;
        } else {
          // ignore
        }
      }
      return acc;
    }

ParamValue
  = key:Identifier __ ":" __ value:Value { return { key, value }; }
  / Value

Value
  = Number
  / String
  / Identifier
  / Boolean

FunctionDef
  = "fn" __ name:Identifier __ "(" __ params:FunctionParams? __ ")" __ "{" __ body:(Statement __)* __ "}" {
      var filtered = [];
      for (var i = 0; i < body.length; i++) {
        if (body[i][0] !== null) filtered.push(body[i][0]);
      }
      return { type: 'Function', name, params: params || [], body: filtered };
    }

FunctionParams
  = head:FunctionParam tail:(__ "," __ FunctionParam)* {
      return [head, ...tail.map(function(t) { return t[3]; })];
    }

FunctionParam
  = name:Identifier __ ":" __ type:Identifier def:(__ "=" __ Value)? {
      return { name, type, default: def ? def[3] : null };
    }

Identifier
  = name:[a-zA-Z_][a-zA-Z0-9_]* { return name.join(''); }

Number
  = num:([0-9]+ ("." [0-9]+)?) { return parseFloat(num.join('')); }

String
  = '"' chars:([^"\\] / "\\" .)* '"' { return chars.join(''); }
  / "'" chars:([^'\\] / "\\" .)* "'" { return chars.join(''); }

Boolean
  = "true" { return true; }
  / "false" { return false; }
