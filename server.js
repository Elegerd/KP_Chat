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
          if (obj.event === "Step_3") {
            console.log("\n[Crypto protocol start]");
            console.log(obj.event);
            console.log(obj);
            this.connectedSockets.sendSock(obj.friend_name, data);
          } else if (obj.event === "Step_4") {
            console.log(obj.event);
            console.log(obj);
            this.connectedSockets.sendSock(obj.friend_name, data)
          } else if (obj.event === "Step_5") {
            console.log(obj.event);
            console.log(obj);
            this.connectedSockets.sendSock(obj.friend_name, data)
          } else if (obj.event === "Step_6") {
            console.log(obj.event);
            console.log(obj);
            this.connectedSockets.sendSock(obj.friend_name, data)
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

    server.connection.listen(PORT, HOST, function() {
      console.log(`Server started at: ${HOST}:${PORT}`);
    });
  }
}

new Server(PORT, HOST);