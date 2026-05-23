"""Tiny static server for the _publish tree. Used by validation only."""
import http.server, socketserver, os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    print(f"Serving {os.getcwd()} on :{PORT}", flush=True)
    httpd.serve_forever()
