# Running btx-community.com

How a change gets from a pull request to the live site, and how to set up the server once.

## How publishing works

```
pull request ──► "Website" workflow checks content and builds the site
      │
  review, merge to main
      │
      ▼
"Website" workflow builds again and force-pushes the result to the branch site-build
      │
      ▼  (every 2 minutes, pulled by the server itself)
sync container ──► unpacks the new build next to the old one, switches over atomically
      │
      ▼
web container (Caddy) ◄── tunnel container (cloudflared) ◄── Cloudflare ◄── visitors
```

- **Nobody needs the server to publish.** A merged change is live within about two minutes,
  whether or not the server's owner is around.
- **GitHub has no access to the server.** The server fetches a public branch; it holds no
  GitHub token, and GitHub holds no SSH key or token for the server.
- **No open ports.** The tunnel is an outgoing connection to Cloudflare. The server's address is
  not published, and nothing here competes for ports 80/443 with other services on the host.
- **Content never needs a new image.** The images only change when this directory changes.
- **A broken build is not served.** If a build lacks `index.html` or `de/index.html`, the sync
  container keeps the current site and logs why. The last five builds stay on disk.

## One-time setup

### 1. GitHub (organisation admin)

Protect the branch the server serves, so that only the workflow can write it. Without this,
anyone with write access could push to `site-build` directly and skip the review on `main`.
The workflow pushes with a deploy key that only jobs on `main` can use.

1. Create a key pair on your own machine (no passphrase; it is used by the workflow):
   `ssh-keygen -t ed25519 -N "" -C "site-build publisher" -f site-build-key`
2. Settings → Deploy keys → *Add deploy key*: title `site-build publisher`, paste
   `site-build-key.pub`, tick *Allow write access*.
3. Settings → Environments → *New environment* `site-publish`:
   - Deployment branches and tags → *Selected branches and tags* → add `main`
   - Environment secrets → *Add secret* `SITE_BUILD_KEY` with the content of `site-build-key`
4. Delete both key files from your machine. If the key is ever lost or exposed, delete the
   deploy key on GitHub and repeat from step 1.
5. Settings → Rules → Rulesets → New branch ruleset `site-build`, *Active*:
   - Bypass list: *Deploy keys*, *Always allow*; nobody else
   - Target: include by pattern `site-build`
   - Rules: *Restrict creations*, *Restrict updates*, *Restrict deletions*,
     *Block force pushes*

Check after the first merge: the job "Publish to site-build" is green, and
`git push origin HEAD:site-build` from your machine is rejected.

### 2. Cloudflare

1. Zero Trust → Networks → Tunnels → *Create a tunnel* (type Cloudflared), name it
   `btx-community`. Copy the token from the install step.
2. Public hostnames of the tunnel, both with service `HTTP` and URL `web:8080`:
   - `btx-community.com`
   - `www.btx-community.com` (Caddy answers it with a 301 to the bare domain)

   Cloudflare creates the DNS records itself. Remove any older `A`/`AAAA` records for these
   names.
3. HTTPS. Visitors connect to Cloudflare, which serves its own certificate for both names
   (Universal SSL, renewed automatically). Cloudflare reaches the server only through the
   tunnel, which is encrypted itself, so the server needs no certificate; the plain HTTP
   between `cloudflared` and Caddy stays inside an internal Docker network. Set:
   - SSL/TLS → Edge Certificates → *Always Use HTTPS*: on
   - SSL/TLS → Edge Certificates → *Minimum TLS Version*: 1.2

   Caddy adds `Strict-Transport-Security`, so browsers stay on HTTPS after the first visit.
4. Turn off features that inject scripts into the page (Rocket Loader, email address
   obfuscation, automatic Web Analytics); the page's Content-Security-Policy blocks them
   anyway, and they would only produce errors.

### 3. Server

```sh
sudo git clone https://github.com/BTX-Community/btx-community.git /opt/btx-community
cd /opt/btx-community/deploy
sudo cp env.example .env && sudo chmod 600 .env
sudoedit .env                     # TUNNEL_TOKEN=<token from step 2>
sudo docker compose pull
sudo docker compose up -d
sudo docker compose logs -f sync  # "now serving <commit>" once site-build exists
```

The stack is independent of any other Compose project on the host (own project name, own
networks, own volume).

## Changing the server setup

Changes to this directory (images, Caddyfile, sync script) go through a pull request like
everything else, but they are **not** applied automatically. Whoever runs the server pulls and
restarts:

```sh
cd /opt/btx-community && sudo git pull
cd deploy && sudo docker compose pull && sudo docker compose up -d
```

## Rolling back

Revert the change on `main`; the next build replaces the site. In an emergency, on the server:

```sh
sudo docker compose exec sync ls -1t /srv/site/releases
sudo docker compose exec sync sh -c 'ln -sfn releases/<commit> /srv/site/.n && mv -T /srv/site/.n /srv/site/current'
```

The sync container switches back to the newest build when `site-build` changes again.
