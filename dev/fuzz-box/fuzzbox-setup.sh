#!/bin/bash
# fuzzbox-setup.sh: one-time setup of a dedicated fuzzing box (Ubuntu 24.04). Run as root.
# Creates the unprivileged user btxfuzz, installs build tools, builds OpenSSL (hash-checked)
# and clones the repository. Nothing here touches a node, a wallet or a key.
set -euo pipefail
. /etc/btxfuzz/fuzzbox.conf
D=$(cd "$(dirname "$0")" && pwd); . "$D/fuzzbox-env.sh"
unset OMP_NUM_THREADS OMP_THREAD_LIMIT   # a box-wide value must not cap the OpenSSL build (see fuzz_cpus)
[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq build-essential cmake ninja-build pkgconf git curl ca-certificates \
  python3 python3-dev python3-zmq python3-cryptography libevent-dev libboost-dev libsqlite3-dev \
  libzmq3-dev clang-18 llvm-18 libclang-rt-18-dev >/dev/null
ln -sf /usr/bin/llvm-symbolizer-18 /usr/bin/llvm-symbolizer
id btxfuzz >/dev/null 2>&1 || useradd --create-home --shell /bin/bash btxfuzz
install -d -o btxfuzz -g btxfuzz -m 0750 "$FUZZ_HOME"
install -d -o btxfuzz -g btxfuzz -m 0700 "$FUZZ_HOME/crashes"   # crash inputs: owner-only
if [ ! -f /opt/ossl35/lib/libcrypto.a ]; then
  v=$OPENSSL_VERSION; t=$(mktemp -d); cd "$t"
  u=https://github.com/openssl/openssl/releases/download/openssl-$v/openssl-$v.tar.gz
  curl -fsSLO "$u"; curl -fsSLO "$u.sha256"
  [ "$(awk '{print $1}' openssl-$v.tar.gz.sha256)" = "$(sha256sum openssl-$v.tar.gz | awk '{print $1}')" ] \
    || { echo "OpenSSL hash mismatch"; exit 1; }
  tar xzf openssl-$v.tar.gz; cd openssl-$v
  ./Configure --prefix=/opt/ossl35 --libdir=lib no-shared no-tests no-docs -fPIC >/dev/null
  make -j"$(fuzz_cpus)" >/dev/null 2>&1; make install_sw >/dev/null 2>&1
  cd /; rm -rf "$t"
fi
runuser -u btxfuzz -- bash -c "[ -d '$FUZZ_HOME/src/.git' ] || git clone -q --filter=blob:none '$REPO_URL' '$FUZZ_HOME/src'"
echo "setup done. Next, as btxfuzz: fuzzbox-build.sh, then start fuzzbox-loop.sh (see the guide)."
