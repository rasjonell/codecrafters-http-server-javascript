const fs = require('fs');
const net = require('net');
const path = require('path');

const CRLF = '\r\n\r\n';
const NOT_FOUND = `HTTP/1.1 404 Not Found${CRLF}`;
const DIR = process.argv.length === 4 && process.argv[2] === '--directory' ? process.argv[3] : null;

/**
 * @param {Number} statusCode
 * @returns {String} response
 */
const OK = (statusCode = 200) => {
  return `HTTP/1.1 ${statusCode} OK${CRLF}`;
};

const server = net.createServer((socket) => {
  socket.on('close', () => {
    socket.end();
    server.close();
  });

  socket.on('data', (data) => {
    queueMicrotask(() => {
      const parsedData = parseRequestData(data);
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
    return OK();
  }

  if (path === '/user-agent') {
    const data = req.headers['user-agent'];
    if (data) {
      return responseWithBody(data);
    }

    return NOT_FOUND;
  }

  if (path.startsWith('/echo/')) {
    const str = path.substring(6); // starting index after `/echo/`
    return responseWithBody(str);
  }

  if (DIR && path.indexOf('/files/') === 0) {
    const fileName = path.substring(7); // starting index after `/files/`
    if (req.method.toLowerCase() === 'get') {
      return octetStreamResponse(fileName);
    }

    return createFileResponse(fileName, req.body);
  }

  return NOT_FOUND;
}

/**
 * @param dataBuf {Buffer}
 *
 * @typedef {Object} Request
 * @property {String} path
 * @property {String} body
 * @property {String} method
 * @property {String} version
 * @property {Object.<string, string>} headers
 *
 * @returns {Request} data
 */
function parseRequestData(dataBuf) {
  const data = dataBuf.toString();
  const [first, ...rest] = data.split('\r\n');
  const [method, path, version] = first.split(' ');

  let body = '';
  const headers = {};
  while (true) {
    const line = rest.shift();
    const seperatorStart = line.indexOf(': ');
    if (seperatorStart === -1) {
      body = rest.shift();
      break;
    }

    const key = line.substring(0, seperatorStart);
    const value = line.substring(key.length + 2);
    headers[key.toLowerCase()] = value;
  }

  return {
    path,
    body,
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
function responseWithBody(data, type = 'text/plain') {
  return `HTTP/1.1 200 OK\r
Content-Type: ${type}\r
Content-Length: ${data.length}\r
\r
${data}${CRLF}`;
}

/**
 * @param {String} fileName
 * @returns {String} response
 */
function octetStreamResponse(fileName) {
  try {
    const filesContent = fs.readFileSync(path.join(DIR, fileName)).toString();
    return responseWithBody(filesContent, 'application/octet-stream');
  } catch {
    return NOT_FOUND;
  }
}

/**
 * @param {String} fileName
 * @param {String} content
 * @returns {String} response
 */
function createFileResponse(fileName, content) {
  try {
    fs.writeFileSync(path.join(DIR, fileName), content);
    return OK(201);
  } catch (error) {
    return NOT_FOUND;
  }
}

server.listen(4221, 'localhost');
