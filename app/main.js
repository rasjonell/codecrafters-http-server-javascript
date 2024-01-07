const fs = require('fs');
const net = require('net');
const path = require('path');

const CRLF = '\r\n\r\n';
const NOT_FOUND = `HTTP/1.1 404 Not Found${CRLF}`;

const DIR = process.argv.length === 4 && process.argv[2] === '--directory' ? process.argv[3] : null;

const server = net.createServer((socket) => {
  socket.on('close', () => {
    socket.end();
    server.close();
  });

  socket.on('data', (data) => {
    queueMicrotask(() => {
      const parsedData = parseData(data);
      socket.write(routeRequest(parsedData.path, parsedData));
      socket.end();
    });
  });
});

/**
 * @param {String} path
 * @param {Request} req
 *
 * @returns {String} response
 */
function routeRequest(path, req) {
  if (path === '/') {
    return `HTTP/1.1 200 OK${CRLF}`;
  }

  if (path === '/user-agent') {
    const data = req.headers['user-agent'];
    if (data) {
      return plainTextResponse(data);
    }

    return NOT_FOUND;
  }

  if (path.startsWith('/echo/')) {
    const str = path.substring(6); // starting index after `/echo/`
    return plainTextResponse(str);
  }

  if (path.indexOf('/files/') === 0) {
    const fileName = path.substring(7); // starting index after `/files/`
    return octetStreamResponse(fileName);
  }

  return NOT_FOUND;
}

/**
 * @param dataBuf {Buffer}
 *
 * @typedef {Object} Request
 * @property {String} path
 * @property {String} method
 * @property {String} version
 * @property {Object.<string, string>} headers
 *
 * @returns {Request} data
 */
function parseData(dataBuf) {
  const data = dataBuf.toString();
  const [first, ...rest] = data.split('\r\n');
  const [method, path, version] = first.split(' ');

  const headers = {};
  for (const line of rest) {
    const seperatorStart = line.indexOf(': ');
    if (seperatorStart === -1) {
      continue;
    }
    const key = line.substring(0, seperatorStart);
    const value = line.substring(key.length + 2);
    headers[key.toLowerCase()] = value;
  }

  return {
    path,
    method,
    version,
    headers,
  };
}

/**
 * @param {String} data
 * @param {String} type
 * @returns {String} response
 */
function plainTextResponse(data, type = 'text/plain') {
  return `HTTP/1.1 200 OK\r
Content-Type: ${type}\r
Content-Length: ${data.length}\r
\r
${data}\r
`;
}

/**
 * @param {String} fileName
 * @returns {String} response
 */
function octetStreamResponse(fileName) {
  if (!DIR) {
    return NOT_FOUND;
  }

  try {
    const filesContent = fs.readFileSync(path.join(DIR, fileName)).toString();
    return plainTextResponse(filesContent, 'application/octet-stream');
  } catch {
    return NOT_FOUND;
  }
}

server.listen(4221, 'localhost');
