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

Protect the branch the server serves, so that only the workflow can write it:

- Settings → Rules → Rulesets → New branch ruleset, target `site-build`
- Rules: *Restrict updates*, *Restrict deletions*
- Bypass list: *GitHub Actions* only (it needs to force-push each new build)

Without this rule anyone with write access could push to `site-build` directly and skip the
review on `main`.

### 2. Cloudflare

1. Zero Trust → Networks → Tunnels → *Create a tunnel* (type Cloudflared), name it
   `btx-community`. Copy the token from the install step.
2. Public hostnames of the tunnel, both with service `HTTP` and URL `web:8080`:
   - `btx-community.com`
   - `www.btx-community.com` (Caddy answers it with a 301 to the bare domain)

   Cloudflare creates the DNS records itself. Remove any older `A`/`AAAA` records for these
   names.
3. SSL/TLS → *Full*. Turn off features that inject scripts into the page (Rocket Loader, email
   address obfuscation, automatic Web Analytics); the page's Content-Security-Policy blocks
   them anyway, and they would only produce errors.

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
