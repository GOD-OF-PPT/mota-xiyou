"""Check an exact Git tree against the main branch's 100 MB file budget."""
import argparse
import collections
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ref", nargs="?", default="HEAD")
    args = parser.parse_args()
    rows = subprocess.check_output(
        ["git", "ls-tree", "-r", "-l", "-z", args.ref], cwd=ROOT
    ).split(b"\0")
    groups = collections.Counter()
    count = 0
    for row in filter(None, rows):
        metadata, path = row.split(b"\t", 1)
        mode, kind, oid, size = metadata.split()
        if kind != b"blob":
            raise ValueError(f"Non-file entry needs separate accounting: {path!r}")
        name = path.decode("utf-8")
        groups[name.split("/")[0] if "/" in name else "(root)"] += int(size)
        count += 1
    total = sum(groups.values())
    print(json.dumps({
        "ref": args.ref,
        "files": count,
        "bytes": total,
        "MB": round(total / 1_000_000, 3),
        "MiB": round(total / 1_048_576, 3),
        "limit_bytes": 100_000_000,
        "passed": total < 100_000_000,
        "groups": dict(groups.most_common()),
    }, ensure_ascii=False, indent=2))
    raise SystemExit(0 if total < 100_000_000 else 1)


if __name__ == "__main__":
    main()
