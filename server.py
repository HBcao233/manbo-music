import http.server
import socketserver
import logging


DIRECTORY = './'


class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
  allow_reuse_address = True
  
  def __init__(self, *args, **kwargs):
    super().__init__(*args, directory=DIRECTORY, **kwargs)
  
  def end_headers(self):
    # self.send_header('Cache-Control', 'no-store')
    # 或者使用 'no-cache' 来允许缓存但每次都需验证
    self.send_header('Cache-Control', 'no-cache')
    super().end_headers()

PORT = 8000
with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
  print(f"Serving at port {PORT}")
  try:
    httpd.serve_forever()
  except KeyboardInterrupt:
    print('\rKeyboardInterrupt')
  except Exception:
    logging.exception('错误:')
