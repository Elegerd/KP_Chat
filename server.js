const net = require('net');
const HOST = 'localhost';
const PORT = 3000;

class Server {
  constructor(port, address) {
    this.port = port;
    this.address = address;
    this.connectedSockets = new Set();
    this.init();
  }

  init() {
    let server = this;

    this.connectedSockets.broadcast = function(data) {
      for (let sock of this) {
          sock.write(data);
      }
    };

    let onClientConnected = (sock) => {
      this.connectedSockets.add(sock);
      let clientName = `${sock.remoteAddress}:${sock.remotePort}`;
      console.log(`New client connected: ${clientName}`);

      sock.on('data', (data) => {
        console.log(`${clientName} Says: ${data}`);
        this.connectedSockets.broadcast(data, sock);
      });

      sock.on('close', () => {
        console.log(`Connection from ${clientName} closed`);
        this.connectedSockets.delete(sock);
      });

      sock.on('error', (err) => {
        console.log(`Connection ${clientName} error: ${err.message}`);
      });
    };

    server.connection = net.createServer(onClientConnected);

    server.connection.listen(PORT, HOST, function() {
      console.log(`Server started at: ${HOST}:${PORT}`);
    });
  }
}

new Server(PORT, HOST);