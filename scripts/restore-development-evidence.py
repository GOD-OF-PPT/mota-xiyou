"""Restore archived development inputs without replacing different local files."""
from pathlib import Path
import tarfile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "archives/development-evidence-20261117.tar.xz"


def main():
    pending = []
    unchanged = 0
    with tarfile.open(ARCHIVE, "r:xz") as archive:
        for member in archive.getmembers():
            target = (ROOT / member.name).resolve()
            if not member.isfile() or not target.is_relative_to(ROOT):
                raise ValueError(f"Unsafe archive entry: {member.name}")
            with archive.extractfile(member) as source:
                content = source.read()
            if target.exists():
                if not target.is_file() or target.read_bytes() != content:
                    raise ValueError(f"Local file differs; nothing restored: {member.name}")
                unchanged += 1
            else:
                pending.append((target, content))
    for target, content in pending:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    print(f"Restored {len(pending)} files; {unchanged} already match the archive.")


if __name__ == "__main__":
    main()
