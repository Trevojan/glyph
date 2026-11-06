//! JSON: the selector is a JSON Pointer (RFC 6901) — `/a/b/0`, `~1` for `/`
//! and `~0` for `~` — and resolves to exactly one value. The reader keeps
//! where each value starts and ends; the value it builds is a shape, not data.
//! A repeated key is kept twice, so a pointer through it names many nodes and
//! is refused.

use crate::Node;

pub struct Value {
    pub start: usize,
    pub end: usize,
    pub kind: Kind,
}

pub enum Kind {
    Scalar,
    Arr(Vec<Value>),
    Obj(Vec<(String, Value)>),
}

pub fn parse(text: &str) -> Result<Value, String> {
    let mut r = Reader { b: text.as_bytes(), i: 0 };
    r.ws();
    let v = r.value()?;
    r.ws();
    if r.i != r.b.len() {
        return Err(r.fail("text after the value"));
    }
    Ok(v)
}

pub fn tree(text: &str) -> Result<Vec<Node>, String> {
    let root = parse(text)?;
    let mut nodes = vec![Node::whole(text)];
    fn walk(v: &Value, pointer: &str, depth: usize, out: &mut Vec<Node>) {
        let children: Vec<(String, &Value)> = match &v.kind {
            Kind::Scalar => return,
            Kind::Arr(a) => a.iter().enumerate().map(|(i, c)| (i.to_string(), c)).collect(),
            Kind::Obj(kv) => kv.iter().map(|(k, c)| (escape(k), c)).collect(),
        };
        for (token, c) in children {
            let p = format!("{pointer}/{token}");
            out.push(Node { selector: p.clone(), start: c.start, end: c.end, depth: depth + 1 });
            walk(c, &p, depth + 1, out);
        }
    }
    walk(&root, "", 0, &mut nodes);
    Ok(nodes)
}

pub fn select(text: &str, pointer: &str) -> Result<Node, String> {
    let Some(rest) = pointer.strip_prefix('/') else {
        return Err(format!("`{pointer}` is not a JSON Pointer: it starts with `/`"));
    };
    let mut v = &parse(text)?;
    let mut depth = 0;
    for raw in rest.split('/') {
        let token = raw.replace("~1", "/").replace("~0", "~");
        v = match &v.kind {
            Kind::Obj(kv) => {
                let mut hits = kv.iter().filter(|(k, _)| *k == token);
                match (hits.next(), hits.next()) {
                    (Some((_, c)), None) => c,
                    (None, _) => return Err(format!("`{pointer}`: no key `{token}`")),
                    _ => return Err(format!("`{pointer}`: the key `{token}` appears more than once")),
                }
            }
            Kind::Arr(a) => {
                let i = token.parse::<usize>().ok().filter(|i| i.to_string() == token);
                match i.and_then(|i| a.get(i)) {
                    Some(c) => c,
                    None => return Err(format!("`{pointer}`: no index `{token}`")),
                }
            }
            Kind::Scalar => return Err(format!("`{pointer}`: `{token}` goes under a value that holds nothing")),
        };
        depth += 1;
    }
    Ok(Node { selector: pointer.to_string(), start: v.start, end: v.end, depth })
}

pub fn escape(key: &str) -> String {
    key.replace('~', "~0").replace('/', "~1")
}

struct Reader<'a> {
    b: &'a [u8],
    i: usize,
}

impl Reader<'_> {
    fn fail(&self, what: &str) -> String {
        format!("JSON: {what} at byte {}", self.i)
    }

    fn ws(&mut self) {
        while self.i < self.b.len() && matches!(self.b[self.i], b' ' | b'\t' | b'\n' | b'\r') {
            self.i += 1;
        }
    }

    fn value(&mut self) -> Result<Value, String> {
        let start = self.i;
        let kind = match self.b.get(self.i) {
            Some(b'{') => self.object()?,
            Some(b'[') => self.array()?,
            Some(b'"') => { self.string()?; Kind::Scalar }
            Some(b't') => self.word("true")?,
            Some(b'f') => self.word("false")?,
            Some(b'n') => self.word("null")?,
            Some(b'-' | b'0'..=b'9') => {
                while self.i < self.b.len() && matches!(self.b[self.i], b'-' | b'+' | b'.' | b'e' | b'E' | b'0'..=b'9') {
                    self.i += 1;
                }
                Kind::Scalar
            }
            _ => return Err(self.fail("no value")),
        };
        Ok(Value { start, end: self.i, kind })
    }

    fn word(&mut self, w: &str) -> Result<Kind, String> {
        if self.b[self.i..].starts_with(w.as_bytes()) {
            self.i += w.len();
            Ok(Kind::Scalar)
        } else {
            Err(self.fail("no value"))
        }
    }

    fn object(&mut self) -> Result<Kind, String> {
        self.i += 1;
        let mut kv = Vec::new();
        self.ws();
        if self.b.get(self.i) == Some(&b'}') {
            self.i += 1;
            return Ok(Kind::Obj(kv));
        }
        loop {
            self.ws();
            if self.b.get(self.i) != Some(&b'"') {
                return Err(self.fail("no key"));
            }
            let key = self.string()?;
            self.ws();
            if self.b.get(self.i) != Some(&b':') {
                return Err(self.fail("no `:`"));
            }
            self.i += 1;
            self.ws();
            kv.push((key, self.value()?));
            self.ws();
            match self.b.get(self.i) {
                Some(b',') => self.i += 1,
                Some(b'}') => { self.i += 1; return Ok(Kind::Obj(kv)); }
                _ => return Err(self.fail("no `,` or `}`")),
            }
        }
    }

    fn array(&mut self) -> Result<Kind, String> {
        self.i += 1;
        let mut items = Vec::new();
        self.ws();
        if self.b.get(self.i) == Some(&b']') {
            self.i += 1;
            return Ok(Kind::Arr(items));
        }
        loop {
            self.ws();
            items.push(self.value()?);
            self.ws();
            match self.b.get(self.i) {
                Some(b',') => self.i += 1,
                Some(b']') => { self.i += 1; return Ok(Kind::Arr(items)); }
                _ => return Err(self.fail("no `,` or `]`")),
            }
        }
    }

    /// A string, decoded: keys are matched against pointer tokens.
    fn string(&mut self) -> Result<String, String> {
        self.i += 1;
        let mut units: Vec<u16> = Vec::new();
        let mut out = String::new();
        let flush = |units: &mut Vec<u16>, out: &mut String| -> Result<(), String> {
            if !units.is_empty() {
                out.push_str(&String::from_utf16(units).map_err(|_| "JSON: a lone surrogate".to_string())?);
                units.clear();
            }
            Ok(())
        };
        loop {
            let Some(&c) = self.b.get(self.i) else { return Err(self.fail("an unclosed string")) };
            match c {
                b'"' => {
                    self.i += 1;
                    flush(&mut units, &mut out)?;
                    return Ok(out);
                }
                b'\\' => {
                    let e = *self.b.get(self.i + 1).ok_or_else(|| self.fail("an unclosed string"))?;
                    self.i += 2;
                    if e == b'u' {
                        let hex = std::str::from_utf8(self.b.get(self.i..self.i + 4).ok_or_else(|| self.fail("a short \\u"))?)
                            .ok()
                            .and_then(|h| u16::from_str_radix(h, 16).ok())
                            .ok_or_else(|| self.fail("a bad \\u"))?;
                        self.i += 4;
                        units.push(hex);
                        continue;
                    }
                    flush(&mut units, &mut out)?;
                    out.push(match e {
                        b'n' => '\n',
                        b't' => '\t',
                        b'r' => '\r',
                        b'b' => '\u{8}',
                        b'f' => '\u{c}',
                        b'"' | b'\\' | b'/' => e as char,
                        _ => return Err(self.fail("a bad escape")),
                    });
                }
                _ => {
                    flush(&mut units, &mut out)?;
                    let len = utf8_len(c);
                    let s = std::str::from_utf8(&self.b[self.i..self.i + len]).map_err(|_| self.fail("bad UTF-8"))?;
                    out.push_str(s);
                    self.i += len;
                }
            }
        }
    }
}

fn utf8_len(lead: u8) -> usize {
    match lead {
        0xF0..=0xFF => 4,
        0xE0..=0xEF => 3,
        0xC0..=0xDF => 2,
        _ => 1,
    }
}
