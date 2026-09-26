//! glyph-bundle — Port of `scripts/glyph-zip.js` — the ORD bundle's ZIP writer, method `store`.
//!
//! EMS-001 ORD-0012. The five files of an ORD, stored with no compression, as
//! `zipStore` writes them; and the moment they carry, as a JS `Date` holds it:
//! milliseconds since the epoch, read in UTC. The time of the zip is UTC, so
//! the same moment gives the same bytes in any zone and in either engine
//! (question 16 of the EMS-001 return); `std` reads no zone, and needs none.

/// CRC-32 (IEEE 802.3), the table built once.
pub fn crc32(bytes: &[u8]) -> u32 {
    static TABLE: std::sync::OnceLock<[u32; 256]> = std::sync::OnceLock::new();
    let t = TABLE.get_or_init(|| {
        let mut t = [0u32; 256];
        for (n, slot) in t.iter_mut().enumerate() {
            let mut c = n as u32;
            for _ in 0..8 {
                c = if c & 1 != 0 { 0xEDB8_8320 ^ (c >> 1) } else { c >> 1 };
            }
            *slot = c;
        }
        t
    });
    !bytes.iter().fold(!0u32, |c, &b| t[((c ^ b as u32) & 0xFF) as usize] ^ (c >> 8))
}

/// A moment's fields in UTC, as `getUTC*` answers them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Civil {
    pub year: i64,
    pub month: u32,
    pub day: u32,
    pub hour: u32,
    pub minute: u32,
    pub second: u32,
    pub milli: u32,
}

/// The UTC fields of a moment, days to a date by the proleptic Gregorian
/// calendar, as the JS `Date` counts them.
pub fn civil(ms: i64) -> Civil {
    let days = ms.div_euclid(86_400_000);
    let rest = ms.rem_euclid(86_400_000);
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let month = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    let year = yoe + era * 400 + if month <= 2 { 1 } else { 0 };
    Civil {
        year,
        month,
        day,
        hour: (rest / 3_600_000) as u32,
        minute: (rest / 60_000 % 60) as u32,
        second: (rest / 1000 % 60) as u32,
        milli: (rest % 1000) as u32,
    }
}

/// The largest moment a JS `Date` holds, either side of the epoch.
pub const MAX_MS: i64 = 8_640_000_000_000_000;

/// `Date.prototype.toISOString`; none past what a `Date` holds, where the JS
/// throws `RangeError: Invalid time value`.
pub fn iso(ms: i64) -> Option<String> {
    if ms.abs() > MAX_MS {
        return None;
    }
    let c = civil(ms);
    let year = if (0..=9999).contains(&c.year) {
        format!("{:04}", c.year)
    } else if c.year < 0 {
        format!("-{:06}", -c.year)
    } else {
        format!("+{:06}", c.year)
    };
    Some(format!(
        "{year}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        c.month, c.day, c.hour, c.minute, c.second, c.milli
    ))
}

/// Date and time as MS-DOS writes them, in UTC; seconds in steps of two.
pub fn dos(ms: i64) -> (u16, u16) {
    let c = civil(ms);
    let time = ((c.hour & 31) << 11) | ((c.minute & 63) << 5) | ((c.second / 2) & 31);
    let date = (((c.year - 1980) & 127) << 9) as u32 | ((c.month & 15) << 5) | (c.day & 31);
    (time as u16, date as u16)
}

/// `zipStore`: each entry a name, relative inside the zip, and its bytes;
/// every entry stored, its name flagged UTF-8, all at the one moment.
pub fn zip_store(entries: &[(&str, &[u8])], ms: i64) -> Vec<u8> {
    let (time, date) = dos(ms);
    let (mut out, mut central) = (Vec::new(), Vec::new());
    let w16 = |v: &mut Vec<u8>, x: u16| v.extend_from_slice(&x.to_le_bytes());
    let w32 = |v: &mut Vec<u8>, x: u32| v.extend_from_slice(&x.to_le_bytes());
    for (name, data) in entries {
        let (name, sum, size) = (name.as_bytes(), crc32(data), data.len() as u32);
        let offset = out.len() as u32;
        // the local header: 30 fixed bytes and the name
        w32(&mut out, 0x0403_4B50);
        w16(&mut out, 20);
        w16(&mut out, 0x0800);
        w16(&mut out, 0);
        w16(&mut out, time);
        w16(&mut out, date);
        w32(&mut out, sum);
        w32(&mut out, size);
        w32(&mut out, size);
        w16(&mut out, name.len() as u16);
        w16(&mut out, 0);
        out.extend_from_slice(name);
        out.extend_from_slice(data);
        // its entry in the central directory: 46 fixed bytes and the name
        w32(&mut central, 0x0201_4B50);
        w16(&mut central, 20);
        w16(&mut central, 20);
        w16(&mut central, 0x0800);
        w16(&mut central, 0);
        w16(&mut central, time);
        w16(&mut central, date);
        w32(&mut central, sum);
        w32(&mut central, size);
        w32(&mut central, size);
        w16(&mut central, name.len() as u16);
        for _ in 0..3 {
            w16(&mut central, 0);
        }
        w16(&mut central, 0);
        w32(&mut central, 0);
        w32(&mut central, offset);
        central.extend_from_slice(name);
    }
    let at = out.len() as u32;
    let size = central.len() as u32;
    out.extend_from_slice(&central);
    w32(&mut out, 0x0605_4B50);
    w16(&mut out, 0);
    w16(&mut out, 0);
    w16(&mut out, entries.len() as u16);
    w16(&mut out, entries.len() as u16);
    w32(&mut out, size);
    w32(&mut out, at);
    w16(&mut out, 0);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crc32_is_ieee() {
        assert_eq!(crc32(b""), 0);
        assert_eq!(crc32(b"123456789"), 0xCBF4_3926);
    }

    #[test]
    fn the_moment_reads_as_a_js_date_reads_it() {
        assert_eq!(iso(0).as_deref(), Some("1970-01-01T00:00:00.000Z"));
        assert_eq!(iso(1_790_386_200_000).as_deref(), Some("2026-09-26T01:30:00.000Z"));
        assert_eq!(iso(951_782_400_123).as_deref(), Some("2000-02-29T00:00:00.123Z"));
        assert_eq!(iso(-1).as_deref(), Some("1969-12-31T23:59:59.999Z"));
        assert_eq!(iso(253_402_300_800_000).as_deref(), Some("+010000-01-01T00:00:00.000Z"));
        assert_eq!(iso(MAX_MS + 1), None);
    }

    #[test]
    fn the_zip_time_is_utc() {
        assert_eq!(dos(1_790_386_200_000), ((1 << 11) | (30 << 5), ((2026 - 1980) << 9) | (9 << 5) | 26));
    }
}
