const net = require('net');

class Server {
  constructor(port, address) {
    this.port = port;
    this.address = address;
    this.connectedSockets = new Set();
    this.players = [];
    this.playersKeys = [null, null, null];
    this.playersCards = [null, null, null];
    this.statePlayers = [];
    this.init();
  }

  setPlayers(){
    let server = this;
    server.players = [];
    for (let sock of server.connectedSockets) {
      if(sock.username && server.players.length < 3)
        server.players.push(sock.username);
    }
  };

  getState() {
    return {
      "players": this.players,
      "state": this.statePlayers,
    };
  }

  readyPlayer(obj) {
    let server = this;
    let index = server.players.findIndex(player => player === obj.name);
    server.statePlayers[index] = obj.ready;
    let data = {
      state: server.statePlayers,
    };
    server.connectedSockets.broadcast(JSON.stringify(data))
  };

  endGame(obj) {
    let server = this;
    let index = server.players.findIndex(player => player === obj.name);
    server.playersCards[index] = obj.cards;
    server.playersKeys[index] = obj.keys;
    if (server.playersCards.indexOf(null) === -1) {
      let data = {
        player_cards: server.playersCards,
        keys: server.playersKeys
      };
      server.connectedSockets.broadcast(JSON.stringify(data))
    }
  };

  init() {
    let server = this;

    server.connectedSockets.broadcast = function(data) {
      for (let sock of this) {
          sock.write(data);
      }
    };

    server.connectedSockets.sendSock = function(name, data) {
      for (let sock of this) {
        if (sock.username && sock.username === name) {
          sock.write(data);
        }
      }
    };

    server.connectedSockets.sendPlayer = function(data) {
      for (let sock of this) {
        if (sock.username && server.players.includes(sock.username)) {
          sock.write(data);
        }
      }
    };

    let onClientConnected = (sock) => {
      server.connectedSockets.add(sock);
      let clientName = `${sock.remoteAddress}:${sock.remotePort}`;
      console.log(`New client connected: ${clientName}`);

      sock.on('data', (data) => {
        let obj = JSON.parse(data);
        if (sock.username === undefined) {
          sock.username = obj.name;
          server.setPlayers();
        }
        if (obj.message) {
          console.log(`${clientName} says: ${obj.message}`);
          server.connectedSockets.broadcast(data);
        } else if (obj.event) {
          if (obj.event === "END") {
            server.endGame(obj);
          } else
            server.connectedSockets.sendSock(obj.recipient, data)
        } else if (obj.ready !== undefined) {
          server.readyPlayer(obj);
        } else if (obj.end !== undefined) {
          server.playersCards = [null, null, null];
          server.connectedSockets.broadcast(data);
        } else {
          let state = server.getState();
          server.connectedSockets.broadcast(JSON.stringify(state));
        }
      });

      sock.on('close', () => {
        console.log(`Connection from ${clientName} closed`);
        let index = server.players.findIndex(player => player === sock.username);
        server.connectedSockets.delete(sock);
        if (index !== -1) {
          server.setPlayers();
          server.statePlayers = [false, false, false];
          let state = server.getState();
          server.connectedSockets.broadcast(JSON.stringify(state));
        }
        server.connectedSockets.delete(sock);
      });

      sock.on('error', (err) => {
        console.log(`Connection ${clientName} error: ${err.message}`);
        if (err.code === 'EADDRINUSE') {
          console.log('Address in use, retrying...');
          setTimeout(() => {
            server.close();
            server.listen(server.port, server.address);
          }, 1000);
        }
      });
    };

    server.connection = net.createServer(onClientConnected);

    server.connection.listen(server.port, server.address, function() {
      console.log(`Server started at: ${server.address}:${server.port}`);
    });
  }
}
module.exports = Server;