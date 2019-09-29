const net = require('net');

class Client {
    constructor(name, port, address) {
        this.name = name || "Guest" + Math.floor(Math.random() * 101);
        this.socket = new net.Socket();
        this.address = address;
        this.port = port;
        this.init();
    }

    init() {
        let client = this;
        client.socket.connect(client.port, client.address, () => {
            console.log(`Client connected to: [${client.name}] ${client.address} :  ${client.port}`);
        });

        client.socket.on('close', () => {
            console.log('Client closed');
        });

        client.socket.on('data', (data) => {
            let obj = JSON.parse(data);
            let box = document.getElementById('chat-box');
            let span = document.createElement('div');
            let date = new Date();
            span.innerHTML = obj.name + " says: "  + obj.message;
            box.appendChild(span);
            console.log(`Client received: ${data}`);
        });

        client.socket.on('close', () => {
            console.log('Client closed');
        });

        client.socket.on('error', (err) => {
            console.error(err);
        });
    }

    sendMessage(message) {
        let data = {
            "name" : this.name,
            "message": message,
        };
        let client = this;
        client.socket.write(JSON.stringify(data));
    }
}
module.exports = Client;