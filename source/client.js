const net = require('net');
const getRandomInRange = require('./algorithm/random_number');
const testMillerRabin = require('./algorithm/test_miller_rabin');

class Client {
    constructor(name, port, address) {
        let p, q;
        do {
            p = this.getPrimeNumber();
        } while (p % 4 !== 3);
        do {
            q = this.getPrimeNumber();
        } while (q % 4 !== 3);
        this.key_p = p;
        this.key_q = q;
        this.public_key = p * q;
        this.name = name || "Guest" + Math.floor(Math.random() * 101);
        this.socket = new net.Socket();
        this.address = address;
        this.port = port;
        this.init();
    }

    init() {
        let client = this;
        client.socket.connect(client.port, client.address, () => {
            let data = {
                "name" : this.name,
            };
            document.getElementById('chat-public-key').value = this.public_key;
            client.socket.write(JSON.stringify(data));
            console.log(`Client connected to: [${client.name}] ${client.address} :  ${client.port}`);
        });

        client.socket.on('close', () => {
            console.log('Client closed');
        });

        client.socket.on('data', (data) => {
            let obj = JSON.parse(data);
            if (obj.message) {
                let box = document.getElementById('chat-box');
                let span = document.createElement('div');
                span.innerHTML = obj.name + " says: " + obj.message + " ";
                box.appendChild(span);
            }
            if (obj.users) {
                let box = document.getElementById('chat-box');
                let span = document.createElement('div');
                let text = "Chat now: ";
                obj.users.forEach(user => {
                    text+= "[" + user + "] ";
                });
                span.innerHTML = text;
                box.appendChild(span);
            }
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

    getPrimeNumber() {
        let prime, isPrimeNumber;
        do {
            prime = getRandomInRange(2, 1024);
            isPrimeNumber = testMillerRabin(prime, 10);
        } while (!isPrimeNumber);
        return prime;
    }
}
module.exports = Client;