---
title: "Ten HTTP requests. How many TCP connections?"
date: "2026-11-24"
slug: "ten-http-requests-how-many-tcp-connections"
status: publish
description: "Ten requests can use one connection or ten. A small Go experiment explains why, and what that means at production scale."
categories: ["Tech"]
tags: ["Go", "HTTP", "Backend Engineering"]
image: ""
---

I sent ten requests to the same server, one after another, using the same Go client. How many TCP connections would you expect?

Take a guess. Mine was one. But I was missing a detail about what happens after the response arrives.

An **HTTP request is a message**. A **TCP connection is the channel carrying it**. One channel can carry many messages. Opening another takes time; HTTPS also needs a TLS handshake to establish a secure connection.

Reusing that channel saves setup work. But with HTTP/1.1, the client must consume the current response completely before reusing it.

## What does “close the body” mean?

Imagine a health checker receiving:

```text
Status: 200 OK
Body: {"healthy": true}
```

It checks `200` and calls `resp.Body.Close()`. It doesn't need the JSON.

**EOF means we've read the body to its end. Close means we're finished using it.** Those are different things: we can stop using a response while bytes remain unread.

The Go team's [article by Nicholas Husin and Damien Neil](https://go.dev/blog/http-connection-reuse) explains the change:

- **Go 1.26:** closing an unread body causes the connection to be discarded.
- **Go 1.27:** Go tries reading and discarding the remaining bytes in the background, bounded by **256 KiB and 50 milliseconds**. If that finishes successfully, the connection can be reused. It skips draining when the response says `Connection: close`.

The application doesn't process those discarded bytes. Go consumes them to finish the response.

## Ten requests, measured

I tested a local HTTP/1.1 server on macOS/arm64: one URL, ten sequential GETs, keep-alives enabled. Each scenario reused one client and started with a fresh `Transport`, Go's connection manager. I added no pauses between requests.

Bodies were **4 KiB (4,096 bytes)** and **1 MiB (1,048,576 bytes)**, below and above the drain limit. Both had explicit lengths and no compression.

This server callback counted accepted TCP connections; `accepted` is a `sync/atomic.Int64`:

```go
ConnState: func(_ net.Conn, state http.ConnState) {
    if state == http.StateNew {
        accepted.Add(1)
    }
},
```

I measured the counter's increase for each run. Here are all five repetitions on both installed versions:

| Response handling | Go 1.26.10 | Go 1.27.2 |
| --- | --- | --- |
| 4 KiB: read to EOF, then close | 1, 1, 1, 1, 1 | 1, 1, 1, 1, 1 |
| 4 KiB: close without reading | 10, 10, 10, 10, 10 | 2, 1, 2, 1, 2 |
| 1 MiB: close without reading | 10, 10, 10, 10, 10 | 10, 10, 10, 10, 10 |

The middle row explains the improvement. Why sometimes two connections? The next request can arrive before background cleanup finishes. My results are consistent with that race. The larger unread body exceeded the budget, so reuse still failed.

## Production Impact at scale

Imagine a monitoring fleet making 10,000 checks per second against the same set of servers. If every check discards its connection, that's potentially 10,000 new connections per second. Reuse can avoid many of those handshakes, reducing setup time and CPU work on both sides.

There's real evidence for the broader idea: [Cloudflare reported](https://blog.cloudflare.com/how-we-built-pingora-the-proxy-that-connects-cloudflare-to-the-internet/) that Pingora opened one-third as many new connections as its previous proxy. That came from improved connection pooling, not a Go 1.27 upgrade.

My experiment measured connections, not production speedup. The Go change helps small unread HTTP/1 bodies; HTTP/2 handles streams differently.

For my API clients, I'll keep a shared client, always close response bodies, and read known small bodies to EOF first when I want predictable reuse across these versions.
