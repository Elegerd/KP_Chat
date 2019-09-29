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

    this.connectedSockets.getUsers = function(sock) {
      let data = {
        "users" : [],
      };
      for (let sock of this) {
        data.users.push(sock.username)
      }
      sock.write(JSON.stringify(data));
    };

    let onClientConnected = (sock) => {
      this.connectedSockets.add(sock);
      this.connectedSockets.getUsers(sock);
      let clientName = `${sock.remoteAddress}:${sock.remotePort}`;
      console.log(`New client connected: ${clientName}`);

      sock.on('data', (data) => {
        let obj = JSON.parse(data);
        sock.username = obj.name;
        if (obj.message) {
          console.log(`${clientName} Says: ${obj.message}`);
          this.connectedSockets.broadcast(data);
        }
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