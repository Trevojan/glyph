//! O4, residual 3, decided 2026-10-25 and built in the Rust only: a bare word
//! where a template parameter goes is refused by name, `fix`
//! `TemplateParamNotLiteral`, with the arguments as the author wrote them,
//! quoted. The JS lets it fall as prose in silence, or names it `[?`, until it
//! leaves; the parse oracle test names each probe that reaches it
//! (`known::BARE`).

use glyph_parse::{parse, Opts};
use glyph_stores::Context;

fn refusals(src: &str) -> Vec<String> {
    let o = Opts::new(Context::repository());
    parse(src, &o).expect("the parse").gaps.into_iter().filter(|g| g.code == "TemplateParamNotLiteral").map(|g| g.plain).collect()
}

#[test]
fn a_bare_word_where_a_parameter_goes_is_refused_by_name() {
    assert_eq!(refusals("[--germinate a,b]"), [
        "o 1º parâmetro de [--germinate recebeu a. Parâmetro de template é sempre literal: [--germinate`a`,`b`].",
        "o 2º parâmetro de [--germinate recebeu b. Parâmetro de template é sempre literal: [--germinate`a`,`b`].",
    ]);
    assert_eq!(refusals("[--reinforce rule,`why`]"), [
        "o 1º parâmetro de [--reinforce recebeu rule. Parâmetro de template é sempre literal: [--reinforce`rule`,`why`].",
    ]);
    /* written after every parameter is filled, a word is extra content, not a parameter */
    assert!(refusals("[--reinforce `r`,`w` and more]").is_empty());
    /* a displaced command keeps its message */
    assert_eq!(refusals("[--reinforce[ctx]`interprete`]"), [
        "o 1º parâmetro de [--reinforce recebeu [ctx. Parâmetro de template é sempre literal: [--reinforce`rule`,`why`].",
    ]);
}
