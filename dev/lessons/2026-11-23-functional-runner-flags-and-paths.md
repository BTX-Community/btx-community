# Lesson: run the default functional list the way the runner expects

> Last verified: 2026-11-23 · against: btxchain/btx release-0.34.17 @ d9a94804 · owner role: lessons reviewer

**Filed:** 2026-11-23 · **Area:** functional tests (I-CI, I-RC) · **Status:** open

## What happened

Three setups make a run of the default functional list look worse than the tree is:

- `--descriptors` given to `test_runner.py` for the whole list. The runner hands it to every script, and a script that has not added the wallet options stops on an option it does not know [read: Source below].
- A long `--tmpdirprefix`. The runner's own directory names come on top of it, and model-helper Unix socket paths can go past the 108-byte limit on Linux [read: Source below].
- Many parallel jobs. A script can fail at startup on a port already in use [read: Source below].

On 22 Nov, a 24-job run of the default list on `d9a94804` (Linux x86_64) had six scripts fail at startup that passed alone. The report gives two causes: ports in use, and a long prefix that put two model-helper sockets past 108 bytes [read: #714, 22 Nov].

## What was done

The six scripts were run again alone and passed. The report on #714 counts them as setup failures and leaves them out of the result.

## The rule now

1. Never give `--descriptors` (or any other script option) to the runner for the whole list. The default list already carries `--descriptors` on the scripts that need it. To run one such script, name it to the runner: `test_runner.py wallet_send_psbt_preview.py` runs every registered variant.
2. Keep `--tmpdirprefix` short, for example `/tmp/f`, on every platform. A script that skips with "tmpdir too deep" did not pass.
3. With many `--jobs`, rerun every script that fails at startup alone before you count it as a failure. Report how many you reran and their result.
4. Say in the report which prefix and how many jobs you used.

## Source

- `test/functional/test_runner.py` at `d9a94804`:
  - `:985-996`: unknown `--` options become `passon_args`; `:1138`: they go to every script;
  - `:658-659` and `:1080-1082`: the default list, `BTX_BASE_SCRIPTS`, with its per-script `--descriptors`;
  - `:1066-1071`: a bare script name runs every registered variant; `:33`: `REQUIRE_WALLET_TYPE_SET=1`;
  - `:1013-1014`: the runner's directory name; `:1023-1031`: a short `XDG_RUNTIME_DIR` for the model helper;
  - `:1015-1021`: a port range per runner unless `TEST_RUNNER_PORT_MIN` is set; `:1317-1329`: a port seed per script [read].
- `test/functional/test_framework/test_framework.py` at `d9a94804`: `:218` (`parse_args` rejects an unknown option), `:491-504` (`add_wallet_options` adds `--descriptors`) [read].
- `test/functional/test_framework/util.py` at `d9a94804`: `:503-509` (108 bytes on Linux, 104 on macOS), `:515-531` (`unix_socket_path()`), `:364-368` and `:401-403` (ports) [read].
- The skips at `d9a94804`: `feature_modelnet_jit_remaining.py:134-135` skips under the runner; `feature_modelnet_listen.py:62-63`, `feature_modelnet_listen_sockets.py:205-206` and `feature_modelnet_proxy.py:123-124` skip only without `XDG_RUNTIME_DIR` [read].
- #714, 22 Nov: the results comment on `d9a94804` [read].

## Verified by (command, commit, platform)

```bash
git show d9a94804:test/functional/test_runner.py | sed -n 985,996p
git show d9a94804:test/functional/test_framework/util.py | sed -n 503,531p
git grep -n 'tmpdir too deep' d9a94804 -- test/functional
```

Read on 23 Nov at `d9a94804` with git on macOS; the grep prints the four skip lines named above. Not verified: the startup failures were not reproduced for this lesson; they come from the #714 report.

## Hub pages to change

- `04-build-and-test.md` §4: the bullets on `--descriptors`, the short prefix and many jobs; the §4 and §5 commands use `/tmp/f` (both done in the same PR as this lesson).
- `packs/A-WALLET.md` and `packs/A-STORES.md`: their run commands use `/tmp/f` (done in the same PR).
- `packs/I-RC-runner.md`: if a runner script there runs the whole list, check that it passes no global script option.
