const net = require('net');

const CRLF = '\r\n\r\n';

const server = net.createServer((socket) => {
  socket.on('close', () => {
    console.log('[Socket] closed');

    socket.end();
    server.close();
  });

  socket.on('data', (data) => {
    const parsedData = parseData(data);
    console.log('[Socket] data received', parsedData);

    socket.write(
      parsedData.path === '/' ? `HTTP/1.1 200 OK${CRLF}` : `HTTP/1.1 404 Not Found${CRLF}`,
    );

    socket.end();
  });
});

/**
 * @param dataBuf {Buffer}
 */
function parseData(dataBuf) {
  const data = dataBuf.toString();
  const lines = data.split('\r\n');
  const [method, path, version] = lines[0].split(' ');

  return {
    path,
    method,
    version,
  };
}

server.listen(4221, 'localhost');
