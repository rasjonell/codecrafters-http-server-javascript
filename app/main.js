const net = require('net');

const server = net.createServer((socket) => {
  socket.on('close', () => {
    console.log('[Socket] closed');

    socket.end();
    server.close();
  });

  socket.on('data', (data) => {
    console.log('[Socket] data received', data);
    socket.write('HTTP/1.1 200 OK\r\n\r\n');
    socket.end();
  });
});

server.listen(4221, 'localhost');
