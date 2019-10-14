const net = require('net');

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

    this.connectedSockets.getUsers = function() {
      let data = {
        "users" : [],
      };
      for (let sock of this) {
        if(sock.username)
          data.users.push(sock.username)
      }
      return data;
    };

    this.connectedSockets.sendSock = function(name, data) {
      for (let sock of this) {
        if (sock.username && sock.username === name) {
          sock.write(data);
        }
      }
    };

    let onClientConnected = (sock) => {
      this.connectedSockets.add(sock);
      let clientName = `${sock.remoteAddress}:${sock.remotePort}`;
      console.log(`New client connected: ${clientName}`);

      sock.on('data', (data) => {
        let obj = JSON.parse(data);
        sock.username = obj.name;
        if (obj.message) {
          console.log(`${clientName} says: ${obj.message}`);
          this.connectedSockets.broadcast(data);
        } else if (obj.event) {
          if((obj.event === "Step_-1" || obj.event === "Step_0") && obj.key) {
            this.connectedSockets.sendSock(obj.friend, data)
          } else if (obj.event === "Step_-1" || obj.event === "Step_0") {
            this.connectedSockets.sendSock(obj.friend, data)
          } else if (obj.event === "Start") {
            this.connectedSockets.sendSock(obj.friend, data)
          } else if (obj.event === "Step_1") {
            this.connectedSockets.sendSock(obj.trent, data)
          } else if (obj.event === "Step_2") {
            this.connectedSockets.sendSock(obj.friend, data)
          }
        } else {
          let users = this.connectedSockets.getUsers();
          this.connectedSockets.broadcast(JSON.stringify(users))
        }
      });

      sock.on('close', () => {
        console.log(`Connection from ${clientName} closed`);
        this.connectedSockets.delete(sock);
        let users = this.connectedSockets.getUsers();
        this.connectedSockets.broadcast(JSON.stringify(users))
      });

      sock.on('error', (err) => {
        console.log(`Connection ${clientName} error: ${err.message}`);
      });
    };

    server.connection = net.createServer(onClientConnected);

    server.connection.listen(server.port, server.address, function() {
      console.log(`Server started at: ${server.address}:${server.port}`);
    });
  }
}
module.exports = Server;