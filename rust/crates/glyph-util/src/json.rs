//! JSON, read and written as `JSON.parse` and `JSON.stringify` do.
//!
//! The JS engine has both from its platform; the Rust has neither without a
//! crate from outside the repository, and the output has to be the JS's bytes,
//! so they are written here (INTAKE-RUST-LADDER.md §9.2). An object keeps the
//! JS's property order: array-index keys first, ascending, then every other key
//! in the order it was first written. A duplicate key keeps its first place and
//! takes the last value.

/// A JSON value.
#[derive(Debug, Clone, PartialEq)]
pub enum Json {
    Null,
    Bool(bool),
    Num(f64),
    Str(String),
    Arr(Vec<Json>),
    Obj(Vec<(String, Json)>),
}

impl Json {
    pub fn get(&self, key: &str) -> Option<&Json> {
        match self {
            Json::Obj(kv) => kv.iter().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }
    pub fn str(&self) -> Option<&str> {
        if let Json::Str(s) = self { Some(s) } else { None }
    }
    pub fn arr(&self) -> Option<&[Json]> {
        if let Json::Arr(a) = self { Some(a) } else { None }
    }
    pub fn obj(&self) -> Option<&[(String, Json)]> {
        if let Json::Obj(kv) = self { Some(kv) } else { None }
    }
    pub fn num(&self) -> Option<f64> {
        if let Json::Num(n) = self { Some(*n) } else { None }
    }
}

/// Sets `key` in an object the way a JS assignment does: an existing key keeps
/// its place and takes the value; a new array-index key goes among the index
/// keys in ascending order; any other new key goes last.
pub fn set(kv: &mut Vec<(String, Json)>, key: String, value: Json) {
    if let Some(slot) = kv.iter_mut().find(|(k, _)| *k == key) {
        slot.1 = value;
        return;
    }
    match index_of(&key) {
        Some(n) => {
            let at = kv.iter().position(|(k, _)| index_of(k).is_none_or(|m| m > n)).unwrap_or(kv.len());
            kv.insert(at, (key, value));
        }
        None => kv.push((key, value)),
    }
}

/// The key as an array index, `0` to `2³² − 2`, written canonically.
fn index_of(key: &str) -> Option<u32> {
    if key != "0" && (key.starts_with('0') || key.is_empty() || !key.bytes().all(|b| b.is_ascii_digit())) {
        return None;
    }
    key.parse::<u32>().ok().filter(|&n| n != u32::MAX)
}

/// `JSON.parse`. A lone surrogate is refused rather than replaced: a Rust
/// string cannot hold one, and nothing disappears in silence.
pub fn parse(text: &str) -> Result<Json, String> {
    let mut r = Reader { b: text.as_bytes(), i: 0 };
    let v = r.value()?;
    r.ws();
    if r.i == r.b.len() { Ok(v) } else { r.fail("text after the value") }
}

struct Reader<'a> {
    b: &'a [u8],
    i: usize,
}

impl Reader<'_> {
    fn fail<T>(&self, what: &str) -> Result<T, String> {
        Err(format!("{what} at byte {}", self.i))
    }
    fn ws(&mut self) {
        while let Some(b' ' | b'\t' | b'\n' | b'\r') = self.b.get(self.i) {
            self.i += 1;
        }
    }
    fn at(&mut self, c: u8) -> bool {
        self.ws();
        if self.b.get(self.i) == Some(&c) {
            self.i += 1;
            true
        } else {
            false
        }
    }
    fn value(&mut self) -> Result<Json, String> {
        self.ws();
        match self.b.get(self.i).copied() {
            Some(b'{') => {
                self.i += 1;
                let mut kv = Vec::new();
                if self.at(b'}') {
                    return Ok(Json::Obj(kv));
                }
                loop {
                    self.ws();
                    if self.b.get(self.i) != Some(&b'"') {
                        return self.fail("a key expected");
                    }
                    let k = self.string()?;
                    if !self.at(b':') {
                        return self.fail("`:` expected");
                    }
                    let v = self.value()?;
                    set(&mut kv, k, v);
                    if self.at(b'}') {
                        return Ok(Json::Obj(kv));
                    }
                    if !self.at(b',') {
                        return self.fail("`,` or `}` expected");
                    }
                }
            }
            Some(b'[') => {
                self.i += 1;
                let mut a = Vec::new();
                if self.at(b']') {
                    return Ok(Json::Arr(a));
                }
                loop {
                    a.push(self.value()?);
                    if self.at(b']') {
                        return Ok(Json::Arr(a));
                    }
                    if !self.at(b',') {
                        return self.fail("`,` or `]` expected");
                    }
                }
            }
            Some(b'"') => self.string().map(Json::Str),
            Some(b't') => self.word("true", Json::Bool(true)),
            Some(b'f') => self.word("false", Json::Bool(false)),
            Some(b'n') => self.word("null", Json::Null),
            Some(b'-' | b'0'..=b'9') => {
                let start = self.i;
                while let Some(b'-' | b'+' | b'.' | b'e' | b'E' | b'0'..=b'9') = self.b.get(self.i) {
                    self.i += 1;
                }
                match std::str::from_utf8(&self.b[start..self.i]).ok().and_then(|t| t.parse().ok()) {
                    Some(n) => Ok(Json::Num(n)),
                    None => self.fail("a malformed number"),
                }
            }
            _ => self.fail("a value expected"),
        }
    }
    fn word(&mut self, w: &str, v: Json) -> Result<Json, String> {
        if self.b[self.i..].starts_with(w.as_bytes()) {
            self.i += w.len();
            Ok(v)
        } else {
            self.fail("a value expected")
        }
    }
    fn hex4(&mut self) -> Result<u32, String> {
        let h = self.b.get(self.i..self.i + 4)
            .and_then(|h| std::str::from_utf8(h).ok())
            .and_then(|h| u32::from_str_radix(h, 16).ok());
        match h {
            Some(u) => {
                self.i += 4;
                Ok(u)
            }
            None => self.fail("a malformed \\u escape"),
        }
    }
    fn string(&mut self) -> Result<String, String> {
        self.i += 1;
        let mut out = String::new();
        loop {
            /* a run of plain bytes ends only at an ASCII byte, so it is whole UTF-8 */
            let start = self.i;
            while let Some(&c) = self.b.get(self.i) {
                if c == b'"' || c == b'\\' {
                    break;
                }
                self.i += 1;
            }
            out.push_str(std::str::from_utf8(&self.b[start..self.i]).map_err(|e| e.to_string())?);
            match self.b.get(self.i).copied() {
                Some(b'"') => {
                    self.i += 1;
                    return Ok(out);
                }
                Some(b'\\') => {
                    let Some(&c) = self.b.get(self.i + 1) else { return self.fail("an unterminated escape") };
                    self.i += 2;
                    match c {
                        b'"' => out.push('"'),
                        b'\\' => out.push('\\'),
                        b'/' => out.push('/'),
                        b'b' => out.push('\u{8}'),
                        b'f' => out.push('\u{c}'),
                        b'n' => out.push('\n'),
                        b'r' => out.push('\r'),
                        b't' => out.push('\t'),
                        b'u' => {
                            let hi = self.hex4()?;
                            let code = if (0xD800..0xDC00).contains(&hi) {
                                if self.b.get(self.i..self.i + 2) != Some(b"\\u".as_slice()) {
                                    return self.fail("a lone surrogate");
                                }
                                self.i += 2;
                                let lo = self.hex4()?;
                                if !(0xDC00..0xE000).contains(&lo) {
                                    return self.fail("a lone surrogate");
                                }
                                0x10000 + ((hi - 0xD800) << 10) + (lo - 0xDC00)
                            } else {
                                hi
                            };
                            match char::from_u32(code) {
                                Some(ch) => out.push(ch),
                                None => return self.fail("a lone surrogate"),
                            }
                        }
                        _ => return self.fail("an unknown escape"),
                    }
                }
                _ => return self.fail("an unterminated string"),
            }
        }
    }
}

/// `JSON.stringify(value)`.
pub fn stringify(value: &Json) -> String {
    let mut out = String::new();
    write(value, "", "", &mut out);
    out
}

/// `JSON.stringify(value, null, gap)`: each level indented by `gap` more.
pub fn stringify_indent(value: &Json, gap: &str) -> String {
    let mut out = String::new();
    write(value, gap, "", &mut out);
    out
}

fn write(value: &Json, gap: &str, indent: &str, out: &mut String) {
    match value {
        Json::Null => out.push_str("null"),
        Json::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Json::Num(n) => out.push_str(&number(*n)),
        Json::Str(s) => quote(s, out),
        Json::Arr(a) => {
            if a.is_empty() {
                out.push_str("[]");
                return;
            }
            let inner = format!("{indent}{gap}");
            out.push('[');
            for (i, v) in a.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                if !gap.is_empty() {
                    out.push('\n');
                    out.push_str(&inner);
                }
                write(v, gap, &inner, out);
            }
            if !gap.is_empty() {
                out.push('\n');
                out.push_str(indent);
            }
            out.push(']');
        }
        Json::Obj(kv) => {
            if kv.is_empty() {
                out.push_str("{}");
                return;
            }
            let inner = format!("{indent}{gap}");
            out.push('{');
            for (i, (k, v)) in kv.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                if !gap.is_empty() {
                    out.push('\n');
                    out.push_str(&inner);
                }
                quote(k, out);
                out.push(':');
                if !gap.is_empty() {
                    out.push(' ');
                }
                write(v, gap, &inner, out);
            }
            if !gap.is_empty() {
                out.push('\n');
                out.push_str(indent);
            }
            out.push('}');
        }
    }
}

/// A string as `JSON.stringify` quotes it: `"`, `\` and the control characters
/// escaped, everything else as it is.
fn quote(s: &str, out: &mut String) {
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
}

/// A number as JS writes it (`Number.prototype.toString`): the shortest digits
/// that read back the same, placed by the JS rules; `null` for what JSON cannot
/// hold.
pub fn number(n: f64) -> String {
    if !n.is_finite() {
        return "null".to_string();
    }
    if n == 0.0 {
        return "0".to_string();
    }
    /* Rust's `{:e}` gives the same shortest digits, as d.ddde±x */
    let sci = format!("{:e}", n.abs());
    let (mantissa, exp) = sci.split_once('e').unwrap();
    let digits: String = mantissa.chars().filter(|c| *c != '.').collect();
    let k = digits.len() as i32;
    let point = exp.parse::<i32>().unwrap() + 1;
    let body = if k <= point && point <= 21 {
        format!("{digits}{}", "0".repeat((point - k) as usize))
    } else if 0 < point && point <= 21 {
        format!("{}.{}", &digits[..point as usize], &digits[point as usize..])
    } else if -6 < point && point <= 0 {
        format!("0.{}{digits}", "0".repeat((-point) as usize))
    } else {
        let e = point - 1;
        let sign = if e < 0 { '-' } else { '+' };
        if k == 1 {
            format!("{digits}e{sign}{}", e.abs())
        } else {
            format!("{}.{}e{sign}{}", &digits[..1], &digits[1..], e.abs())
        }
    };
    if n < 0.0 { format!("-{body}") } else { body }
}
