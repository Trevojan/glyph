//! Order maintenance: layer 3 of `.plan` §0, EMS-002 ORD-0004.
//!
//! The order is the index's own: files in the order the index lists them,
//! then nodes by start, the one that holds the other first. A build
//! materialises every node with its file and its offsets, so the order is a
//! sort at load, done once; after it, `before` compares two ranks in constant
//! time, `above` searches a file's nodes by where they end, and `between`
//! is a slice of the order. Nothing new is stored: stable positions — order
//! labels by Dietz–Sleator and relative offsets — would hold still 42.0 % of
//! the rows an edit rewrites, under the 50 % declared (INTAKE-VIRTUAL-PATH
//! §25), and the order answers after an insertion, a move or a removal
//! because each build sorts it again.

use crate::index::{Index, Indexed};
use std::collections::HashMap;

/// How one node stands to another.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Relation {
    Same,
    Before,
    After,
    Holds,
    Inside,
}

impl Relation {
    pub fn word(self) -> &'static str {
        match self {
            Relation::Same => "same",
            Relation::Before => "before",
            Relation::After => "after",
            Relation::Holds => "holds",
            Relation::Inside => "inside",
        }
    }
}

pub struct Order {
    /// every node of the index, `(file, node)`, in document order
    pub seq: Vec<(usize, usize)>,
    rank: HashMap<String, usize>,
    /// per file, its nodes sorted by where they end, then where they start
    by_end: Vec<Vec<usize>>,
}

impl Order {
    pub fn of(index: &Index) -> Order {
        let mut seq = Vec::new();
        let mut by_end = Vec::new();
        for (f, e) in index.files.iter().enumerate() {
            let mut nodes: Vec<usize> = (0..e.nodes.len()).collect();
            nodes.sort_by_key(|&n| (e.nodes[n].start, std::cmp::Reverse(e.nodes[n].end), n));
            seq.extend(nodes.iter().map(|&n| (f, n)));
            let mut ends: Vec<usize> = (0..e.nodes.len()).collect();
            ends.sort_by_key(|&n| (e.nodes[n].end, e.nodes[n].start, n));
            by_end.push(ends);
        }
        let rank = seq.iter().enumerate().map(|(r, &(f, n))| (index.files[f].nodes[n].id.clone(), r)).collect();
        Order { seq, rank, by_end }
    }

    pub fn rank(&self, id: &str) -> Option<usize> {
        self.rank.get(id).copied()
    }

    fn node<'a>(&self, index: &'a Index, r: usize) -> &'a Indexed {
        let (f, n) = self.seq[r];
        &index.files[f].nodes[n]
    }

    /// How `a` stands to `b`: the same node, one before the other, or one
    /// holding the other — a range of the same file around the other's, the
    /// first in order holding when the two ranges are equal.
    pub fn relation(&self, index: &Index, a: &str, b: &str) -> Option<Relation> {
        let (ra, rb) = (self.rank(a)?, self.rank(b)?);
        if ra == rb {
            return Some(Relation::Same);
        }
        let (fa, fb) = (self.seq[ra].0, self.seq[rb].0);
        let (na, nb) = (self.node(index, ra), self.node(index, rb));
        let holds = |outer: &Indexed, inner: &Indexed| outer.start <= inner.start && inner.end <= outer.end;
        Some(match (fa == fb, ra < rb) {
            (true, true) if holds(na, nb) => Relation::Holds,
            (true, false) if holds(nb, na) => Relation::Inside,
            (_, true) => Relation::Before,
            (_, false) => Relation::After,
        })
    }

    /// The nodes of `id`'s file that end where it starts or before, nearest
    /// first: the ones that end latest, and of those the innermost.
    pub fn above(&self, index: &Index, id: &str, count: usize) -> Option<Vec<String>> {
        let (f, n) = self.seq[self.rank(id)?];
        let e = &index.files[f];
        let start = e.nodes[n].start;
        let ends = &self.by_end[f];
        let upto = ends.partition_point(|&m| e.nodes[m].end <= start);
        Some(ends[..upto].iter().rev().take(count).map(|&m| e.nodes[m].id.clone()).collect())
    }

    /// Every node from `a` to `b`, both included, in order.
    pub fn between(&self, a: &str, b: &str) -> Result<&[(usize, usize)], String> {
        let ra = self.rank(a).ok_or_else(|| format!("`{a}` is no NodeID of the index"))?;
        let rb = self.rank(b).ok_or_else(|| format!("`{b}` is no NodeID of the index"))?;
        if rb < ra {
            return Err(format!("`{b}` comes before `{a}`: between reads from the first to the second"));
        }
        Ok(&self.seq[ra..=rb])
    }
}
