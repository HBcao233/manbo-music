from http.server import SimpleHTTPRequestHandler
from http import HTTPStatus
import http.server
import socketserver
import logging
import sys
import urllib.parse


DIRECTORY = './'


class NoCacheHTTPRequestHandler(SimpleHTTPRequestHandler):
  allow_reuse_address = True
  
  def __init__(self, *args, **kwargs):
    super().__init__(*args, directory=DIRECTORY, **kwargs)
  
  def end_headers(self):
    # self.send_header('Cache-Control', 'no-store')
    # 或者使用 'no-cache' 来允许缓存但每次都需验证
    self.send_header('Cache-Control', 'no-cache')
    super().end_headers()
  
  def log_message(self, format, *args):
    message = format % args
    sys.stderr.write(f"[{self.log_date_time_string()}] {message.translate(self._control_char_table)}\n")

  def log_request(self, code='-', size='-'):
    if isinstance(code, HTTPStatus):
      code = code.value
    path = urllib.parse.unquote(self.path)
    self.log_message(
      '"%s %s" %s %s',
      self.command,
      path, 
      str(code), 
      str(size),
    )
    

PORT = 8000
with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
  print(f"Serving at port {PORT}")
  try:
    httpd.serve_forever()
  except KeyboardInterrupt:
    print('\rKeyboardInterrupt')
  except Exception:
    logging.exception('错误:')
