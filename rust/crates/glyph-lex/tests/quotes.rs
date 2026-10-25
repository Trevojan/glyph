//! O4, residual 2, decided 2026-10-25 and built in the Rust only: inside a
//! literal only the quote that opened it closes it, a line break as well, so
//! the apostrophe reads as the backtick does and as `glyph-grammar.ebnf` gives
//! it. The JS ends an apostrophe at a line break until it leaves; the
//! tokenizer oracle test names each source that reaches it (`known::QUOTES`).

use glyph_lex::tokenize;

fn literals(src: &str) -> Vec<(String, &'static str)> {
    tokenize(src).into_iter().filter(|t| t.k == "literal")
        .map(|t| (t.v.unwrap_or_default(), t.closed_by.unwrap_or(""))).collect()
}

#[test]
fn an_apostrophe_literal_runs_past_a_line_break_to_its_own_quote() {
    assert_eq!(literals("'a\nb'"), [("a\nb".to_string(), "quote")]);
    assert_eq!(literals("[nt'one\ntwo']"), [("one\ntwo".to_string(), "quote")]);
    /* the bracket still ends it, and the end of the source */
    assert_eq!(literals("[nt'a\nb]"), [("a\nb".to_string(), "unterminated")]);
    assert_eq!(literals("don't\nstop"), [("t\nstop".to_string(), "unterminated")]);
    /* the backtick reads the same text the same way */
    assert_eq!(literals("`a\nb`"), [("a\nb".to_string(), "tick")]);
}
