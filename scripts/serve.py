"""Local preview server with byte ranges, required for seeking MP4 references."""
import argparse
import os
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.remaining = None
        requested = self.headers.get("Range")
        path = self.translate_path(self.path)
        if not requested or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", requested.strip())
        if not match or not size or not any(match.groups()):
            return self.invalid_range(size)
        first, last = match.groups()
        if first:
            start, end = int(first), min(int(last), size - 1) if last else size - 1
        else:
            start, end = max(0, size - int(last)), size - 1
        if start > end or start >= size:
            return self.invalid_range(size)
        source = open(path, "rb")
        source.seek(start)
        self.remaining = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Length", str(self.remaining))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        return source

    def invalid_range(self, size):
        self.send_response(416)
        self.send_header("Content-Range", f"bytes */{size}")
        self.send_header("Content-Length", "0")
        self.end_headers()
        return None

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def copyfile(self, source, output):
        if self.remaining is None:
            return super().copyfile(source, output)
        remaining = self.remaining
        while remaining:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            output.write(chunk)
            remaining -= len(chunk)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5187)
    parser.add_argument("--directory", default="src")
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(RangeHandler, directory=args.directory))
    print(f"Local preview: http://127.0.0.1:{args.port}", flush=True)
    server.serve_forever()
