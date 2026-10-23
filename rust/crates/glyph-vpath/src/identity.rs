//! The NodeID: layer 2 of `.plan` §0, EMS-002 ORD-0002.
//!
//! Every node of the index carries a NodeID, `n` and a number, given once and
//! never given again. A build carries each NodeID from the previous index to
//! the node it became, by structure alone (INTAKE-VIRTUAL-PATH §21), with five
//! rules tried in order, each over what the rules before it left unmatched:
//!
//!   1. the same path and the same text — nothing moved
//!   2. the same text, found once on each side — a section moved, a key or a
//!      block renamed, a file renamed with that node intact
//!   3. the same path — an edit in place
//!   4. the same body under a new heading, found once on each side — Markdown
//!   5. the same file renamed — more than half of an old file's nodes are in
//!      one new file again, by selector or by text: its root follows them, and
//!      what is left by selector
//!
//! The text comes before the path because a JSON index, an XML `[n]` and a
//! repeated slug are positions: an element inserted at the front shifts every
//! path after it, and the content is what moved. A node no rule reaches is
//! new; an old node no rule reaches is gone, and its NodeID with it.
//!
//! The old path of a node that moved stays as an alias of its NodeID, so a
//! path written before the move still finds it; a live path wins over an alias.

use crate::index::{Entry, Index};
use crate::join;
use std::collections::{BTreeMap, HashMap, HashSet};

/// What one build carries: the next free number and the aliases.
pub struct Carried {
    pub next: u64,
    pub aliases: Vec<(String, String)>,
}

/// Gives every node of `files` its NodeID and its parent.
pub fn carry(previous: Option<&Index>, files: &mut [Entry]) -> Carried {
    let empty = Index::default();
    let prev = previous.unwrap_or(&empty);
    let old: Vec<(usize, usize)> = prev.files.iter().enumerate()
        .flat_map(|(f, e)| (0..e.nodes.len()).map(move |n| (f, n)))
        .filter(|&(f, n)| !prev.files[f].nodes[n].id.is_empty())
        .collect();
    let old_node = |k: usize| &prev.files[old[k].0].nodes[old[k].1];
    let slots: Vec<(usize, usize)> = files.iter().enumerate().flat_map(|(f, e)| (0..e.nodes.len()).map(move |n| (f, n))).collect();
    let mut given: Vec<Option<usize>> = vec![None; slots.len()];
    let mut taken = vec![false; old.len()];

    let by_path: HashMap<(&str, &str), usize> = (0..old.len())
        .map(|k| ((prev.files[old[k].0].path.as_str(), old_node(k).selector.as_str()), k)).collect();
    let text_of = |s: usize| files[slots[s].0].nodes[slots[s].1].fingerprint.clone();
    let body_of = |s: usize| files[slots[s].0].nodes[slots[s].1].body.clone();
    let same_path = |given: &mut [Option<usize>], taken: &mut [bool], with_text: bool| {
        for (s, slot) in given.iter_mut().enumerate() {
            let (f, n) = slots[s];
            let node = &files[f].nodes[n];
            let hit = by_path.get(&(files[f].path.as_str(), node.selector.as_str())).copied()
                .filter(|&k| slot.is_none() && !taken[k] && (!with_text || old_node(k).fingerprint == node.fingerprint));
            if let Some(k) = hit {
                *slot = Some(k);
                taken[k] = true;
            }
        }
    };

    // 1. the same path and the same text
    same_path(&mut given, &mut taken, true);
    // 2. the same text, found once on each side
    once(&slots, &old, &mut given, &mut taken, |s| Some(text_of(s)), |k| Some(old_node(k).fingerprint.clone()));
    // 3. the same path
    same_path(&mut given, &mut taken, false);
    // 4. the same body, found once on each side
    let nonempty = |b: String| (!b.is_empty()).then_some(b);
    once(&slots, &old, &mut given, &mut taken, |s| nonempty(body_of(s)), |k| nonempty(old_node(k).body.clone()));
    // 5. the same file renamed: an old file whose root nothing took pairs with
    //    the new file that holds more than half of its other nodes again, by
    //    the same selector or the same text — the rule M5 measured
    for (f, e) in files.iter().enumerate() {
        let root = slots.iter().position(|&x| x == (f, 0)).expect("every file has its root");
        if given[root].is_some() {
            continue;
        }
        let mut best: Option<(usize, usize, usize)> = None;
        for (g, o) in prev.files.iter().enumerate() {
            let Some(old_root) = old.iter().position(|&x| x == (g, 0)) else { continue };
            let others = &o.nodes[1..];
            if taken[old_root] || others.is_empty() {
                continue;
            }
            let here = others.iter().filter(|n| e.nodes.iter().any(|m| m.selector == n.selector || m.fingerprint == n.fingerprint)).count();
            if here * 2 > others.len() && best.is_none_or(|(_, _, h)| here > h) {
                best = Some((g, old_root, here));
            }
        }
        let Some((g, old_root, _)) = best else { continue };
        given[root] = Some(old_root);
        taken[old_root] = true;
        let open: Vec<usize> = (0..slots.len()).filter(|&s| slots[s].0 == f && given[s].is_none()).collect();
        for s in open {
            let sel = &e.nodes[slots[s].1].selector;
            if let Some(k) = (0..old.len()).find(|&k| !taken[k] && old[k].0 == g && &old_node(k).selector == sel) {
                given[s] = Some(k);
                taken[k] = true;
            }
        }
    }

    // the NodeIDs, the new ones numbered in file and document order
    let mut next = prev.next.max(1);
    for s in 0..slots.len() {
        let id = match given[s] {
            Some(k) => old_node(k).id.clone(),
            None => { let id = format!("n{next}"); next += 1; id }
        };
        files[slots[s].0].nodes[slots[s].1].id = id;
    }
    for e in files.iter_mut() {
        parents(e);
    }

    // the aliases: the old ones whose node lives, then every path that moved
    let live: HashSet<String> = files.iter().flat_map(|e| e.nodes.iter().map(move |n| join(&e.path, &n.selector))).collect();
    let ids: HashSet<&str> = files.iter().flat_map(|e| e.nodes.iter().map(|n| n.id.as_str())).collect();
    let mut aliases: BTreeMap<String, String> = prev.aliases.iter().filter(|(_, id)| ids.contains(id.as_str())).cloned().collect();
    for &k in given.iter().flatten() {
        let was = join(&prev.files[old[k].0].path, &old_node(k).selector);
        aliases.insert(was, old_node(k).id.clone());
    }
    aliases.retain(|path, _| !live.contains(path));
    Carried { next, aliases: aliases.into_iter().collect() }
}

/// Matches what is left by a key found exactly once on each side.
fn once(
    slots: &[(usize, usize)],
    old: &[(usize, usize)],
    given: &mut [Option<usize>],
    taken: &mut [bool],
    new_key: impl Fn(usize) -> Option<String>,
    old_key: impl Fn(usize) -> Option<String>,
) {
    let mut olds: HashMap<String, Vec<usize>> = HashMap::new();
    for k in (0..old.len()).filter(|&k| !taken[k]) {
        if let Some(key) = old_key(k) {
            olds.entry(key).or_default().push(k);
        }
    }
    let mut news: HashMap<String, Vec<usize>> = HashMap::new();
    for s in (0..slots.len()).filter(|&s| given[s].is_none()) {
        if let Some(key) = new_key(s) {
            news.entry(key).or_default().push(s);
        }
    }
    for (s, slot) in given.iter_mut().enumerate() {
        let Some(key) = slot.is_none().then(|| new_key(s)).flatten() else { continue };
        if let (Some([k]), Some([_])) = (olds.get(&key).map(Vec::as_slice), news.get(&key).map(Vec::as_slice)) {
            *slot = Some(*k);
            taken[*k] = true;
        }
    }
}

/// The parent of each node: the nearest node before it whose range holds it.
pub fn parents(e: &mut Entry) {
    let mut stack: Vec<usize> = Vec::new();
    for i in 0..e.nodes.len() {
        while let Some(&top) = stack.last() {
            if e.nodes[top].start <= e.nodes[i].start && e.nodes[i].end <= e.nodes[top].end {
                break;
            }
            stack.pop();
        }
        e.nodes[i].parent = stack.last().map(|&t| e.nodes[t].id.clone()).unwrap_or_default();
        stack.push(i);
    }
}

/// Where a NodeID lives, and its neighbours: computed once, on load.
#[derive(Debug, Clone, PartialEq)]
pub struct Place {
    pub file: usize,
    pub node: usize,
    pub prev: Option<String>,
    pub next: Option<String>,
    pub depth: usize,
}

/// NodeID → place, for every node of the index, in O(n) once and O(1) after.
pub fn places(index: &Index) -> HashMap<String, Place> {
    let mut out: HashMap<String, Place> = HashMap::new();
    for (f, e) in index.files.iter().enumerate() {
        let mut last_child: HashMap<&str, usize> = HashMap::new();
        for (n, node) in e.nodes.iter().enumerate() {
            let depth = if node.parent.is_empty() { 0 } else { out.get(&node.parent).map_or(0, |p| p.depth + 1) };
            let prev = last_child.insert(node.parent.as_str(), n).map(|p| e.nodes[p].id.clone());
            if let Some(place) = prev.as_ref().and_then(|p| out.get_mut(p)) {
                place.next = Some(node.id.clone());
            }
            out.insert(node.id.clone(), Place { file: f, node: n, prev, next: None, depth });
        }
    }
    out
}
