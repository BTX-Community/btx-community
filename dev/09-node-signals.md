# Node signals for tool builders

> Last verified: 2026-11-23 · against: btxchain/btx release-0.34.17 @ d9a94804 · owner role: hub editor

This page is for people who build tools that read a `btxd` node over RPC (dashboards, monitors, alerting, explorers), and for the AI tools that help them. Every field below was read in the source at `d9a94804` (`release-0.34.17`, 22 Nov 2026). Each source is a `path:line` at that commit: read it with `git show d9a94804:<path>`.

Labels: [read] = taken from the source; [tested] = a command was run for this page; [inferred] = judgement.

Two rules first:
- The RPC help of the node you read is the reference for that build: `btx-cli help getblockchaininfo`. Field meanings can change between releases. Check them again when the node is upgraded [inferred].
- Show the node's MatMul validation tier next to anything it reports. `getblockchaininfo.matmulvalidationmode` is one of consensus, trusted, relay, economic or spv [read: `src/rpc/blockchain.cpp:1917`]. `chain_oracle` is false on a discovery relay ("Do not treat bestblockhash as MatMul authority") [read: `:1918-1919`], and only the consensus and trusted modes count as chain authority [read: `src/kernel/chainstatemanager_opts.h:73-77`].

## 1. Is the tip current? (`getblockchaininfo`)

| Field | What it means | Trap | Source |
|---|---|---|---|
| `blocks`, and `getblockcount` | The height of the connected tip [read] | The help text of `getblockcount`: the number "does not mean this node is current" [read]. `getblockcount true` returns `blocks`, `headers`, `behind_best_header`, `is_stale` and `competing_heavier_header` instead [read] | `src/rpc/blockchain.cpp:417-419` |
| `behind_best_header` | `max(0, headers - blocks)`; zero when the followed header is at or behind the tip [read] | It counts headers only. A node catching up on its own chain shows it too, with `header_extends_tip: true` [read] | `src/node/chain_staleness.h:81`; `src/rpc/blockchain.cpp:1896` |
| `header_extends_tip` | True when the followed header chain descends from the connected tip: linear catch-up, not a competing fork [read] | False means the best header is on another branch [read] | `src/node/chain_staleness.h:82`; `src/rpc/blockchain.cpp:1899` |
| `competing_heavier_header` | The raw comparison: the best header has more chainwork than the tip and is not on the tip's chain [read] | It can be true while `is_stale` is false [read]. Do not raise an alarm on this field alone [inferred] | `src/node/chain_staleness.h:112-113`, `:123`; `src/rpc/blockchain.cpp:1898` |
| `is_stale` | True when the followed header is more than 6 headers ahead of the tip, or when a heavier competing branch also passes a stricter check in the code than `competing_heavier_header` uses. Help text: "Do not credit deposits from this node's confirmations until false" [read] | Use `is_stale`, not `competing_heavier_header`, as the "do not credit" signal [inferred]. While it is true, `getblockchaininfo.warnings` carries a line that says so [read: `src/rpc/blockchain.cpp:2053`] | `src/node/chain_staleness.h:23`, `:120-125`; `src/rpc/blockchain.cpp:1897` |
| `matmul_signed_frontier` | `height`, `hash`, `on_active_chain`, `on_chain_attested_height`, and `blocks_behind = max(0, height - on_chain_attested_height)`. Help: "Zero on a healthy linear chain; large with on_active_chain=false is a stranded fork" [read] | Absent is not zero. The object appears only on a node set up for trusted attestations (which needs `-matmultrustedpubkey`, `-matmultrustedpqpubkey` or a local signer key) and only once it has stored a quorum height [read: `src/init.cpp:1896-1906`; `src/validation.cpp:12761-12768`]. `getmatmulattestedtip.hash` only sees blocks this node holds on its own chain, so it cannot tell a stranded fork from a paused signer; this object can [read] | `src/rpc/blockchain.cpp:1927-1935`, `:2015-2025` |

At `blocks_behind` of 6 or more the node also sets a warning, and it clears that warning by itself when the value drops below 6 [read: `src/validation.cpp:12840-12846`].

## 2. The `warnings` field

`getblockchaininfo.warnings` is an array; with `-deprecatedrpc=warnings` it is the latest warning as a single string [read: `src/rpc/blockchain.cpp:1959-1961`]. Some lines are added on each call from the current state, like the stale-tip line above, and go away when that state does [read: `:2052-2057`]. Show the list as the node returns it on each poll [inferred].

## 3. `-alertnotify` drops characters

`-alertnotify=<cmd>` runs the command with `%s` replaced by the alert text [read: `src/init.cpp:648`]. Before that, the text goes through `SanitizeString` with its default set, then gets wrapped in double quotes [read: `src/node/kernel_notifications.cpp:36-43`].

- The default set is letters, digits, space and `.,;-_/:?@()` [read: `src/util/strencodings.cpp:25`, `src/util/strencodings.h:63`]. Every other character is dropped, not escaped: `=`, `%`, `+`, `!`, square brackets, braces, quotes, `#` and newlines [read].
- So a `key=value` pair in an alert arrives as `keyvalue`. Parse values from the RPC, not from the notify text [inferred].
- Each alert starts its command on a detached thread, so two alerts can run your script at the same time [read: `src/node/kernel_notifications.cpp:45-46`].

## 4. JSON-RPC 1.0 returns RPC errors as HTTP errors

- A single request without `"jsonrpc": "2.0"` follows the legacy protocol. There, a failed call returns an HTTP error status: 500 for most RPC errors, 400 for an invalid request, 404 for an unknown method [read: `src/httprpc.cpp:86-104`, `:212-217`; `doc/JSON-RPC-interface.md:187-201`].
- With `"jsonrpc": "2.0"`, a failed call is HTTP 200 with the error in the body [read: same lines].
- A batch (a JSON array of requests) is always HTTP 200, whatever the version of each element: "Batches never throw HTTP errors" [read: `src/httprpc.cpp:247-266`].
- A body that is not JSON, or a request object the server cannot parse, gets an HTTP error in either version [read: `src/httprpc.cpp:190-191`, `:205`, `:286-291`].
- A client that treats every 500 as "node down" will report a down node for a wrong parameter. Send `"jsonrpc": "2.0"`, or read the body of a 500 before you decide [inferred].

## 5. Check a field yourself

```bash
git clone https://github.com/btxchain/btx.git && cd btx
git show d9a94804:src/node/chain_staleness.h | sed -n 66,130p      # is_stale and competing_heavier_header
git show d9a94804:src/rpc/blockchain.cpp | sed -n 1885,1940p       # getblockchaininfo help text
btx-cli help getblockchaininfo                                      # the build you run
```

If the code at a newer commit says something else, the code wins. Open a pull request that fixes the row and this page's "Last verified" line.

Crashes and security problems in what you read never go into a public issue, a pull request or a chat. Report them privately, by a route in btxchain/btx's `SECURITY.md` ([`03-guardrails.md`](03-guardrails.md) §8).
