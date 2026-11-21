//! The little of SVG the delivered files hold, read and written back.
//!
//! The files are what a design tool exports: elements, attributes in double
//! quotes, no text, no entities beyond what an attribute already carries. This
//! reads exactly that and refuses anything else by name, so a file the reader
//! does not understand fails the build instead of being half-copied.

/// An element: its name, its attributes in the order written, its children.
#[derive(Debug, Clone, PartialEq)]
pub struct El {
    pub name: String,
    pub attrs: Vec<(String, String)>,
    pub kids: Vec<El>,
}

impl El {
    pub fn attr(&self, key: &str) -> Option<&str> {
        self.attrs
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
    }

    pub fn remove(&mut self, key: &str) -> Option<String> {
        let i = self.attrs.iter().position(|(k, _)| k == key)?;
        Some(self.attrs.remove(i).1)
    }

    pub fn write(&self, out: &mut String) {
        out.push('<');
        out.push_str(&self.name);
        for (k, v) in &self.attrs {
            out.push_str(&format!(" {k}=\"{v}\""));
        }
        if self.kids.is_empty() {
            out.push_str("/>");
            return;
        }
        out.push('>');
        self.kids.iter().for_each(|k| k.write(out));
        out.push_str(&format!("</{}>", self.name));
    }
}

/// The root element of `text`.
pub fn parse(text: &str) -> Result<El, String> {
    let mut r = Reader {
        s: text.as_bytes(),
        i: 0,
    };
    r.skip_prolog()?;
    let root = r.element()?;
    r.space();
    if r.i != r.s.len() {
        return Err(format!("content after the root element, at byte {}", r.i));
    }
    Ok(root)
}

struct Reader<'a> {
    s: &'a [u8],
    i: usize,
}

impl Reader<'_> {
    fn space(&mut self) {
        while self.i < self.s.len() && self.s[self.i].is_ascii_whitespace() {
            self.i += 1;
        }
    }

    fn starts(&self, p: &str) -> bool {
        self.s[self.i..].starts_with(p.as_bytes())
    }

    fn skip_prolog(&mut self) -> Result<(), String> {
        loop {
            self.space();
            if self.starts("<?") || self.starts("<!--") {
                let end = if self.starts("<?") { "?>" } else { "-->" };
                let rest = &self.s[self.i..];
                let at = rest
                    .windows(end.len())
                    .position(|w| w == end.as_bytes())
                    .ok_or("an unclosed prolog")?;
                self.i += at + end.len();
            } else {
                return Ok(());
            }
        }
    }

    fn name(&mut self) -> String {
        let start = self.i;
        while self.i < self.s.len() {
            let c = self.s[self.i];
            if c.is_ascii_alphanumeric() || c == b':' || c == b'-' || c == b'_' {
                self.i += 1;
            } else {
                break;
            }
        }
        String::from_utf8_lossy(&self.s[start..self.i]).into_owned()
    }

    fn element(&mut self) -> Result<El, String> {
        if !self.starts("<") {
            return Err(format!(
                "text where an element was expected, at byte {}",
                self.i
            ));
        }
        self.i += 1;
        let name = self.name();
        if name.is_empty() {
            return Err(format!("an element with no name, at byte {}", self.i));
        }
        let mut el = El {
            name,
            attrs: Vec::new(),
            kids: Vec::new(),
        };
        loop {
            self.space();
            if self.starts("/>") {
                self.i += 2;
                return Ok(el);
            }
            if self.starts(">") {
                self.i += 1;
                break;
            }
            let key = self.name();
            self.space();
            if key.is_empty() || !self.starts("=\"") {
                return Err(format!(
                    "<{}>: an attribute not written as key=\"value\"",
                    el.name
                ));
            }
            self.i += 2;
            let start = self.i;
            while self.i < self.s.len() && self.s[self.i] != b'"' {
                self.i += 1;
            }
            if self.i == self.s.len() {
                return Err(format!("<{}>: an unclosed attribute value", el.name));
            }
            let value = String::from_utf8_lossy(&self.s[start..self.i]).into_owned();
            self.i += 1;
            el.attrs.push((key, value));
        }
        loop {
            self.space();
            if self.starts("</") {
                self.i += 2;
                let close = self.name();
                self.space();
                if close != el.name || !self.starts(">") {
                    return Err(format!("<{}> closed as </{close}>", el.name));
                }
                self.i += 1;
                return Ok(el);
            }
            if self.i == self.s.len() {
                return Err(format!("<{}> is never closed", el.name));
            }
            el.kids.push(self.element()?);
        }
    }
}

/// Every y a path's outline passes through, or `None` when the path is not
/// written in absolute commands only: then where it lies is not read, and the
/// caller keeps it.
pub fn path_ys(d: &str) -> Option<Vec<f64>> {
    let b = d.as_bytes();
    let mut i = 0;
    let mut cmd = 0u8;
    let mut args: Vec<f64> = Vec::new();
    let mut ys = Vec::new();
    let flush = |cmd: u8, args: &mut Vec<f64>, ys: &mut Vec<f64>| -> Option<()> {
        let (stride, at): (usize, &[usize]) = match cmd {
            b'M' | b'L' | b'T' => (2, &[1]),
            b'H' => (1, &[]),
            b'V' => (1, &[0]),
            b'C' => (6, &[1, 3, 5]),
            b'S' | b'Q' => (4, &[1, 3]),
            b'A' => (7, &[6]),
            b'Z' | 0 => (0, &[]),
            _ => return None,
        };
        if stride == 0 {
            return if args.is_empty() { Some(()) } else { None };
        }
        if !args.len().is_multiple_of(stride) {
            return None;
        }
        for group in args.chunks(stride) {
            at.iter().for_each(|&k| ys.push(group[k]));
        }
        args.clear();
        Some(())
    };
    while i < b.len() {
        let c = b[i];
        if c.is_ascii_alphabetic() && c != b'e' && c != b'E' {
            flush(cmd, &mut args, &mut ys)?;
            cmd = c;
            i += 1;
        } else if c.is_ascii_digit() || c == b'-' || c == b'+' || c == b'.' {
            let start = i;
            i += 1;
            let mut dot = c == b'.';
            while i < b.len() {
                let ch = b[i];
                if ch.is_ascii_digit() {
                    i += 1;
                } else if ch == b'.' && !dot {
                    dot = true;
                    i += 1;
                } else if (ch == b'e' || ch == b'E') && i + 1 < b.len() {
                    i += 1;
                    if b[i] == b'-' || b[i] == b'+' {
                        i += 1;
                    }
                } else {
                    break;
                }
            }
            args.push(d[start..i].parse().ok()?);
        } else {
            i += 1;
        }
    }
    flush(cmd, &mut args, &mut ys)?;
    Some(ys)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_and_writes_back() {
        let src = r#"<svg width="8" viewBox="0 0 8 8"><g clip-path="url(#a)"><path d="M0 0H1"/></g></svg>"#;
        let el = parse(src).unwrap();
        let mut out = String::new();
        el.write(&mut out);
        assert_eq!(out, src);
    }

    #[test]
    fn refuses_text_and_unclosed() {
        assert!(parse("<svg>text</svg>").is_err());
        assert!(parse("<svg><path/>").is_err());
    }

    #[test]
    fn ys_of_absolute_commands() {
        assert_eq!(
            path_ys("M1 2L3 4H5V6C1 7 2 8 3 9Z").unwrap(),
            vec![2.0, 4.0, 6.0, 7.0, 8.0, 9.0]
        );
        assert_eq!(path_ys("M4.9 4.8V1.8H5.16").unwrap(), vec![4.8, 1.8]);
        assert_eq!(path_ys("M1-2-3.5.5").unwrap(), vec![-2.0, 0.5]);
        assert!(path_ys("m1 2l3 4").is_none());
    }
}
