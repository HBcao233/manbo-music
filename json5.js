(() => {
  const isString = s => Object.prototype.toString.call(s) === "[object String]";
  const isArrayLike = s => s != null && typeof s[Symbol.iterator] === 'function';
  const DIGITS = s => /[0-9]/.test(s);
  const HEX_DIGITS = s => /[0-9a-fA-F]/.test(s);
  const STRING_FLAG = (s) => /['"`]/.test(s);
  const LETTERS = (s) => /([a-zA-Z_\$&\*\+!\?-]|[^\u0000-\u007F])/.test(s);
  const LETTERS_DIGITS = (s) => /([a-zA-Z0-9_\$]|[^\u0000-\u007F])/.test(s);
  const LETTERS_SYMBOLS = (s) => /([a-zA-Z_\$&\*\+!\?-]|[^\u0000-\u007F])/.test(s);
  const LETTERS_SYMBOLS_DIGITS = (s) => /([a-zA-Z0-9_\$&\*\+!\?-]|[^\u0000-\u007F])/.test(s);
  const hex = (s) => s.charCodeAt().toString(16).padStart(4, '0');
  class Tokens {
    static EOF = 'EOF';
    static NAME = 'NAME';
    static KEYWORD = 'KEYWORD';
    static NUMBER = 'NUMBER';
    static STRING = 'STRING';
    static LSQB = 'LSQB';  // [
    static RSQB = 'RSQB';  // ]
    static COLON = 'COLON';  // :
    static COMMA = 'COMMA';  // ,
    static LBRACE = 'LBRACE';  // {
    static RBRACE = 'RBRACE';  // }
    static DOUBLESLASH = 'DOUBLESLASH';  // //
    static SLASHSTAR = 'SLASHSTAR';  // /*
    static STARSLASH = 'STARSLASH';  // */
    static HASHTAG = 'HASHTAG';  // #
  }
  
  const len = (s) => {
    return s = s + '', s.replace(/[\x00-\x7f]/g, '').length + s.replace(/[^\x00-\xff]/g, '').length / 2;
  }
  
  OP_DICT = {
    '[': Tokens.LSQB,
    ']': Tokens.RSQB,
    '{': Tokens.LBRACE,
    '}': Tokens.RBRACE,
    ',': Tokens.COMMA,
    ':': Tokens.COLON,
  }
  ESCAPE_CHAR = {
    '"': '"',
    '/': '/',
    'b': '\b',
    'f': '\f',
    'n': '\n',
    'r': '\r',
    't': '\t',
  }
  KEYWORDS = {
    'true': true,
    'false': false,
    'null': null,
    'True': true,
    'False': false,
    'None': null,
  }
  
  class Position {
    constructor(index, line, column, code) {
      this.index = index;
      this.line = line;
      this.column = column;
      this.code = code;
    }
    
    advance(char) {
      this.index += 1;
      this.column += 1;
      if (char === '\n') {
        this.column = 0;
        this.line += 1;
      }
    }
    
    copy() {
      return new Position(this.index, this.line, this.column, this.code);
    }
  }

  class _SyntaxError extends Error {
    constructor(message, pos_start, pos_end, error_pos_start, error_pos_end) {
      super(message);
      this.pos_start = pos_start;
      if (!pos_end) pos_end = pos_start.copy();
      this.pos_end = pos_end;
      this.error_pos_start = error_pos_start;
      this.error_pos_end = error_pos_end;
      this.name = 'SyntaxError';
    }
    
    toString() {
      return (
        `Line ${this.pos_end.line + 1} Column ${this.pos_end.column}\n` 
        `\n  SyntaxError: ${this.message}`
      );
    }
  }
  
  class Token {
    constructor(type, value, pos_start, pos_end) {
      this.type = type;
      this.value = value;
      this.pos_start = pos_start;
      if (pos_end === undefined) pos_end = pos_start.copy();
      this.pos_end = pos_end;
    }
    
    matches (type, values) {
      if (this.type != type) return false;
      if (!isArrayLike(values)) values = [values];
      for (const v of values) if (this.value == v) return true;
      return false
    }
  }
  
  class Lexer {
    constructor(code) {
      this.code = code;
      this.char = undefined;
      this.pos = new Position(-1, 0, -1, code);
      this.advance();
    }
    
    advance(count) {
      if (!count) count = 1;
      while (count > 0) {
        this.pos.advance(this.char)
        count--;
      }
      this.update()
    }
    
    update() {
      this.char = this.code[this.pos.index];
    }
    
    lookahead(count) {
      if (!count) count = 1;
      let index = this.pos.index + count;
      return this.code[index];
    }
    
    parse() {
      let pos_start;
      let res = [];
      let token;
      while (this.char) {
        if (this.char === '#') {
          this.skip_inline_comment();
          continue;
        }
        if (this.char === ' ' || this.char === '\n') {
          this.advance()
          continue;
        }
        if (this.char === '/') {
          if (this.lookahead(1) === '/') {
            this.advance();
            this.skip_inline_comment();
          } else if (this.lookahead(1) === '*') {
            this.advance(2);
            this.ship_block_comment();
          } else {
            pos_start = this.pos.copy()
            this.advance();
            throw new _SyntaxError(
              "expected '/' or '*'", 
              pos_start,
              this.pos.copy()
            );
          }
          continue;
        }
        if (this.char === '-' || DIGITS(this.char) || (this.char === '.' && DIGITS(this.lookahead(1))) ) {
          token = this.make_number();
        } else if (this.char in OP_DICT) {
          token = this.make_opertor()
        } else if (STRING_FLAG(this.char)) {
          token = this.make_string(this.char);
        } else if (LETTERS_SYMBOLS(this.char)) {
          token = this.make_name()
        } else {
          pos_start = this.pos.copy();
          let char = this.char;
          this.advance();
          throw new _SyntaxError(
            `invalid character '${char}' (U+${hex(this.char)})`,
            pos_start, this.pos.copy(),
          )
        }
        res.push(token);
      }
      res.push(new Token(Tokens.EOF, null, this.pos.copy(), this.pos.copy()));
      return res;
    }
    
    skip_inline_comment() {
      this.advance();
      while (this.char && this.char !== '\n') {
        this.advance();
      }
    }
    ship_block_comment() {
      let pos_start = this.pos.copy();
      while (this.char) {
        if (this.char === '*' && this.lookahead(1) === '/') {
          break;
        }
        this.advance();
      }
      if (this.char !== '*' || this.lookahead(1) !== '/') {
        throw new _SyntaxError(
          `expected '*/'`,
          pos_start,
          this.pos.copy(),
        );
      }
    }
    
    make_number() {
      let pos_start = this.pos.copy()
      let num;
      if (this.char == '0' && this.lookahead() == 'x') {
        this.advance(2);
        num = this.make_num(16);
     } else num = this.make_num(10);
     return new Token(Tokens.NUMBER, num, pos_start, this.pos.copy())
    }
    
    make_num(base=10) {
      const bases = {
        10: ['decimal', DIGITS],
        16: ['hexadecimal', HEX_DIGITS],
      }
      let num = []
      let pos_start = this.pos.copy()
      let is_float = false
      while (this.char && LETTERS_SYMBOLS_DIGITS(this.char) || this.char == '_' || this.char === '.' || this.char === '-') {
        if (this.char == '.') {
          if (base != 10) {
            this.advance()
            throw new _SyntaxError(`invalid ${bases[base][0]} literal`, pos_start, this.pos.copy());
          }
          is_float = true;
        } else if (this.char == '_') {
          this.advance();
          continue
        } else if (!bases[base][1](this.char) && this.char !== '-') {
          this.advance()
          throw new _SyntaxError(`invalid ${bases[base][0]} literal`, pos_start, this.pos.copy());
        }
        num.push(this.char);
        this.advance();
      }
      num = num.join('');
      if (num.length == 0) {
        this.advance()
        throw new _SyntaxError(`invalid ${bases[base][0]} literal`, pos_start, this.pos.copy());
      }
      if (is_float) return parseFloat(num)
      return parseInt(num, base)
    }
    
    make_opertor() {
      let pos_start = this.pos.copy()
      let type = OP_DICT[this.char]
      this.advance()
      return new Token(type, null, pos_start, this.pos.copy())
    }
    
    make_string(quotation) {
      let res = []
      let pos_start = this.pos.copy()
      let escape_character = false
      
      this.advance()
      while (this.char && (this.char != quotation || escape_character)) {
        if (!this.char || this.char == '\n') {
          throw new _SyntaxError(`unterminated string literal (expected ${quotation === "'" ? `"'"` : `'${quotation}'`})`, pos_start, this.pos.copy());
        }
        if (escape_character) {
          escape_character = false;
          if (this.char !== 'u') {
            res.push(ESCAPE_CHAR[this.char] || this.char)
            this.advance();
            continue;
          } else {
            let pos_start1 = this.pos.copy();
            this.advance();
            let u = [];
            for (let i = 0; i < 4; i++) {
              if (!('0123456789abcdefABCDEF'.includes(this.char))) {
                throw new _SyntaxError('Invalid Unicode escape sequence', pos_start1, this.pos.copy());
              }
              u.push(this.char);
              this.advance();
            }
            res.push(String.fromCharCode(parseInt(u.join(''), 16)))
          }
          continue;
        }
        if (this.char == '\\') {
          escape_character = true;
          this.advance();
          continue;
        }
        res.push(this.char)
        this.advance()
      }
      if (this.char !== quotation) {
        throw new _SyntaxError(`unterminated string literal (expected ${quotation === "'" ? `"'"` : `'${quotation}'`})`, pos_start, this.pos.copy());
      }
      this.advance();
      return new Token(Tokens.STRING, res.join(''), pos_start, this.pos.copy())
    }
    
    make_name() {
      let res = []
      let pos_start = this.pos.copy()
      res.push(this.char)
      this.advance()
      while (this.char && LETTERS_SYMBOLS_DIGITS(this.char)) {
        res.push(this.char)
        this.advance()
      }
      res = res.join('')
    
      if (res in KEYWORDS) {
        return new Token(Tokens.KEYWORD, KEYWORDS[res], pos_start, this.pos.copy())
      } 
      return new Token(Tokens.NAME, res, pos_start, this.pos.copy())
    }
  }
  
  class ASTNode {
    type;
    pos_start;
    pos_end;
    parse() {
      throw new Error('未实现的抽象方法')
    }
  }
  
  class SingleNode extends ASTNode {
    type = 'single'
    
    constructor(value) {
      super()
      this.value = value;
      this.pos_start = value.pos_start ? value.pos_start.copy() : null;
      this.pos_end = value.pos_end ? value.pos_end.copy(): null;
    }
    
    parse() {
      return this.value.value + '';
    }
  }
  class NullNode extends SingleNode {
    type = 'null'
  }
  class BooleanNode extends SingleNode {
    type = 'boolean'
  }
  class NumberNode extends SingleNode {
    type = 'number'
  }
  class StringNode extends SingleNode {
    type = 'string'
    
    parse() {
      if (isString(this.value.value)) return JSON.stringify(this.value.value);
      return '"' + this.value.value + '"';
    }
  }
  
  class WarningNode extends ASTNode {
    type = 'warning'
    
    constructor(value) {
      super()
      this.value = value;
    }
    
    parse() {
      return '';
    }
  }
  class ErrorNode extends ASTNode {
    type = 'error'
    
    constructor(value) {
      super()
      this.value = value;
    }
    
    parse() {
      return '';
    }
  }
  
  class ListNode extends ASTNode {
    type = 'list'
    
    constructor(items, pos_start, pos_end) {
      super()
      this.items = items;
      this.pos_start = this.pos_start;
      this.pos_end = pos_end;
    }
    
    parse(indent) {
      let res = [];
      for (const node of this.items) {
        if (node instanceof WarningNode || node instanceof ErrorNode) continue;
        res.push(node.parse(indent));
      }
      if (res.length === 0) return '[]';
      if (indent !== undefined && indent !== null) {
        const ind = '\n' + ' '.repeat(indent);
        const sep = ',' + ind;
        return '[' + ('\n' + res.join(',\n')).split('\n').join(ind) + '\n]';
      }
      return `[${res.join(',')}]`;
    }
  }
  
  class DictNode extends ASTNode {
    type = 'dict';
    constructor(items, pos_start, pos_end) {
      super()
      this.items = items;
      this.pos_start = this.pos_start;
      this.pos_end = pos_end;
    }
    
    parse(indent) {
      let res = [];
      const add = indent !== undefined && indent !== null ? ' ': '';
      for (const [k, v] of this.items) {
        if (k instanceof WarningNode || k instanceof ErrorNode || v instanceof WarningNode || v instanceof ErrorNode) continue;
        res.push(k.parse(indent) + ':' + add + v.parse(indent))
      }
      if (res.length === 0) return '{}';
      if (indent !== undefined && indent !== null) {
        const ind = '\n' + ' '.repeat(indent)
        const sep = ',' + ind;
        return '{' + ('\n' + res.join(',\n')).split('\n').join(ind) + '\n}'
      }
      return `{${res.join(',')}}`;
    }
  }
  
  class Parser {
    constructor(tokens) {
      this.tokens = tokens
      this.index = -1;
      this.token = undefined;
      this.advance();
    }
    
    advance(count) {
      if (!count) count = 1;
      this.index += count;
      this.update();
    }
    
    update() {
      this.token = this.tokens[this.index];
    }
     
    lookahead(count) {
      if (!count) count = 1;
      return this.tokens[this.index + count];
    }
    
    parse() {
      return this.json();
    }
    
    json() {
      if (this.token.type === Tokens.EOF) return [];
      let res = this.atom();
      if (this.token.type !== Tokens.EOF) {
        const err = new _SyntaxError(
          'the statement must not exist',
          this.token.pos_start, this.token.pos_end,
        );
        return [res, new WarningNode(new Token(Tokens.STRING, err.toString(), null, null))];
      }
      return res;
    }
    
    atom() {
      let tok = this.token;
      switch (tok.type) {
        case Tokens.KEYWORD:
        case Tokens.NUMBER:
        case Tokens.STRING:
        case Tokens.NAME:
          this.advance();
          if (tok.type === Tokens.KEYWORD) {
            if (tok.value === true) {
              return new BooleanNode(tok)
            }
            if (tok.value === false) {
              return new BooleanNode(tok)
            }
            return new NullNode(tok)
          }
          if (tok.type === Tokens.NUMBER) {
            return new NumberNode(tok);
          } 
          return new StringNode(tok);
        
        case Tokens.LSQB:
          return this.list_expr()
        case Tokens.LBRACE:
          return this.dict_expr();
        default: 
          throw new _SyntaxError(
            'invalid atom',
            tok.pos_start.copy(),
            tok.pos_end.copy(),
          )
      }
    }
    
    list_expr() {
      let pos_start = this.token.pos_start.copy();
      this.advance();
      if (this.token.type === Tokens.RSQB) {
        this.advance()
        return new ListNode([], pos_start, this.token.pos_end.copy());
      }

      let items = this.atoms();
      if (this.token.type != Tokens.RSQB) {
        items.push(new WarningNode(new Token(Tokens.STRING, 'expected "]"', null, null)))
      } else this.advance();
      return new ListNode(items, pos_start, this.token.pos_end.copy());
    }
    
    atoms() {
      let pos_start = this.token.pos_start.copy();
      let items;
      try {
        items = [this.atom()];
      } catch (e) {
        return [];
      }
      while (this.token.type === Tokens.COMMA) {
        this.advance()
        if (this.token.type === Tokens.RSQB) break;
        try {
          items.push(this.atom());
        } catch (e) {
        }
      }
      return items;
    }
    
    dict_expr() {
      let pos_start = this.token.pos_start.copy();
      this.advance();
      if (this.token.type === Tokens.RBRACE) {
        this.advance();
        return new DictNode([], pos_start, this.token.pos_end.copy());
      }
      let items = this.kvpairs()
      if (this.token.type !== Tokens.RBRACE) {
        items.push([
          new StringNode(new Token(Tokens.STRING, '', null, null)),
          new WarningNode(new Token(Tokens.STRING, 'expected "}"', null, null)), 
        ])
      } else this.advance();
      return new DictNode(items, pos_start, this.token.pos_end.copy());
    }
    
    kvpairs() {
      let items;
      items = [this.kvpair()];
      while (this.token.type == Tokens.COMMA) {
        this.advance();
        if (this.token.type == Tokens.RBRACE) break;
        items.push(this.kvpair());
      }
      return items;
    }
    
    kvpair() {
      let k;
      try {
        k = this.key();
      } catch (e) {
        return [
          new ErrorNode(new Token(Tokens.STRING, "expected a key", null, null)), 
          new StringNode(new Token(Tokens.STRING, '', null, null)),
        ]
      }
      if (this.token.type !== Tokens.COLON) {
        return [
          k,
          new ErrorNode(new Token(Tokens.STRING, 'expected ":"', null, null)), 
        ];
      }
      this.advance();
      if (this.token.type === Tokens.COMMA || this.token.type === Tokens.RSQB || this.token.type === Tokens.RBRACE) {
        return [
          k,
          new ErrorNode(new Token(Tokens.STRING, 'expected a value', null, null)), 
        ];
      }
      try {
        return [k, this.value()];
      } catch (e) {
        return [
          k,
          new ErrorNode(new Token(Tokens.STRING, "expected a value", null, null)), 
        ]
      }
    }
    
    key() {
      let tok = this.token;
      switch (tok.type) {
        case Tokens.KEYWORD:
        case Tokens.NUMBER:
        case Tokens.STRING:
        case Tokens.NAME:
          this.advance();
          return new StringNode(tok);
        default: 
          throw new _SyntaxError(
            'invalid key',
            tok.pos_start.copy(),
            tok.pos_end.copy(),
          )
      }
    }
    
    value() {
      let tok = this.token;
      switch (tok.type) {
        case Tokens.KEYWORD:
        case Tokens.NUMBER:
        case Tokens.STRING:
          this.advance();
          if (tok.type === Tokens.KEYWORD) {
            if (tok.value === true) {
              return new BooleanNode(tok)
            }
            if (tok.value === false) {
              return new BooleanNode(tok)
            }
            return new NullNode(tok)
          }
          if (tok.type === Tokens.NUMBER) {
            return new NumberNode(tok);
          } 
          return new StringNode(tok);
        
        case Tokens.LSQB:
          return this.list_expr()
        case Tokens.LBRACE:
          return this.dict_expr();
        default: 
          throw new _SyntaxError(
            'invalid value',
            tok.pos_start.copy(),
            tok.pos_end.copy(),
          )
      }
    }
  } 

  class JSON5 {
    static parse(s) {
      let lexer = new Lexer(s);
      try {
        let tokens = lexer.parse();
        let parser = new Parser(tokens);
        let node = parser.parse();
        return JSON.parse(node.parse());
      } catch (e) {
        if (!(e instanceof _SyntaxError)) {
          throw e;
        }
        return e.toString();
      }
    }
  }
  
  if ("object" == typeof exports && "object" == typeof module) {
    module.exports = JSON5;
  } else {
    if ("function" == typeof define && define.amd) {
      define("JSON5", [], JSON5);
    } else {
      if ("object" == typeof exports) {
        exports.JSON5 = JSON5;
      } else {
        window.JSON5 = JSON5;
      }
    }
  }
})();