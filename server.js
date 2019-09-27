let net = require('net');
 
// Configuration parameters
let HOST = 'localhost';
let PORT = 3000;

// Create Server instance
let server = net.createServer(onClientConnected);

server.listen(PORT, HOST, function() {
  console.log('Server listening on %j', server.address());
});

function onClientConnected(sock) {
  let remoteAddress = sock.remoteAddress + ':' + sock.remotePort;
  console.log('New client connected: %s', remoteAddress);

  sock.on('data', function(data) {
    console.log('%s Says: %s', remoteAddress, data);
    sock.write(data);
    sock.write('Hello, client');
  });

  sock.on('close', function () {
    console.log('Connection from %s closed', remoteAddress);
  });

  sock.on('error', function (err) {
    console.log('Connection %s error: %s', remoteAddress, err.message);
  });
};