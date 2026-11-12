#!/usr/bin/env python3
"""Refresh Nginx's trusted Cloudflare proxy ranges from Cloudflare's official lists."""

from ipaddress import ip_network
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.request import urlopen
import os
import subprocess


SNIPPET_DIR = Path("/etc/nginx/snippets")
SOURCES = (
    "https://www.cloudflare.com/ips-v4",
    "https://www.cloudflare.com/ips-v6",
)


def load_networks(url: str) -> list[str]:
    with urlopen(url, timeout=15) as response:
        body = response.read(64_000).decode("ascii")
    networks = [line.strip() for line in body.splitlines() if line.strip()]
    if not networks:
        raise RuntimeError(f"Cloudflare returned an empty range list: {url}")
    for value in networks:
        ip_network(value, strict=True)
    return networks


def main() -> None:
    networks = [network for source in SOURCES for network in load_networks(source)]
    real_ip_lines = [f"set_real_ip_from {network};" for network in networks]
    real_ip_lines.extend(("real_ip_header CF-Connecting-IP;", "real_ip_recursive on;"))
    allow_lines = [f"allow {network};" for network in networks]
    allow_lines.append("deny all;")
    SNIPPET_DIR.mkdir(parents=True, exist_ok=True)
    for target, lines in (
        (SNIPPET_DIR / "cloudflare-realip.conf", real_ip_lines),
        (SNIPPET_DIR / "cloudflare-allow.conf", allow_lines),
    ):
        with NamedTemporaryFile("w", encoding="ascii", dir=SNIPPET_DIR, delete=False) as temp:
            temp.write("\n".join(lines) + "\n")
            temp_path = Path(temp.name)
        os.chmod(temp_path, 0o644)
        os.replace(temp_path, target)
    subprocess.run(["nginx", "-t"], check=True)
    subprocess.run(["systemctl", "reload", "nginx"], check=True)


if __name__ == "__main__":
    main()
