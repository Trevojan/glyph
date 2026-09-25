//! EMS-001 ORD-0010, option A: the engine serves HTTP itself — std only, a
//! thread a connection, each kept alive. `cargo run --release --example
//! protocol_http -- PORT`; POST a request, read the answer.

#[path = "common/mod.rs"]
mod common;

use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};

fn main() {
    let port = std::env::args().nth(1).unwrap_or_else(|| "8732".into());
    let listener = TcpListener::bind(format!("127.0.0.1:{port}")).expect("the port");
    println!("listening {port}");
    /* a browser holds up to six connections to one origin; each thread gets
       the main thread's stack, which the stdio engine runs on */
    for stream in listener.incoming().flatten() {
        let _ = std::thread::Builder::new().stack_size(8 << 20).spawn(move || serve(stream));
    }
}

fn serve(stream: TcpStream) {
    let mut reader = BufReader::new(stream.try_clone().expect("the stream"));
    let mut out = stream;
    let _ = out.set_nodelay(true);
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).unwrap_or(0) == 0 {
            break;
        }
        let mut len = 0;
        loop {
            let mut h = String::new();
            if reader.read_line(&mut h).unwrap_or(0) == 0 || h.trim_end().is_empty() {
                break;
            }
            if let Some((k, v)) = h.split_once(':') {
                if k.eq_ignore_ascii_case("content-length") {
                    len = v.trim().parse().unwrap_or(0);
                }
            }
        }
        let mut body = vec![0; len];
        if reader.read_exact(&mut body).is_err() {
            break;
        }
        let resp = common::answer(&String::from_utf8_lossy(&body));
        /* one write: a head and a body in two would wait on the peer's
           delayed ACK */
        let whole = format!("HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: {}\r\n\
                             Access-Control-Allow-Origin: *\r\n\r\n{resp}", resp.len());
        if out.write_all(whole.as_bytes()).is_err() {
            break;
        }
    }
}
