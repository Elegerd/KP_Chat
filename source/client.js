const net = require('net');
const md5 = require('md5');
const modExponentiation = require('./algorithm/exponent_mod');
const getRandomInRange = require('./algorithm/random_number');
const basicEuclidean = require('./algorithm/algorithm_euclidean_basic');
const extendedEuclidean = require('./algorithm/algorithm_euclidean_extendend');
const testMillerRabin = require('./algorithm/test_miller_rabin');
const Server = require('./server');

let server = null;

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
            let data = {
                "name" : this.name,
            };
            //document.getElementById('chat-name').value = client.name;
            client.socket.write(JSON.stringify(data));
            console.log(`Client connected to: [${client.name}] ${client.address} :  ${client.port}`);
        });

        client.socket.on('data', (data) => {
            let obj = JSON.parse(data);
            if (obj.message) {
                console.log(obj.message)
            } else if (obj.users) {
                console.log(obj.users)
                // let box = document.getElementById('chat-box');
                // let span = document.createElement('div');
                // let text = "Chat now: ";
                // obj.users.forEach(user => {
                //     text += "[" + user + "] ";
                // });
                // span.innerHTML = text;
                // box.appendChild(span);
            }
        });

        client.socket.on('close', () => {
            server = new Server(this.port, this.address);
            client.socket.connect(this.port, this.address);
        });

        client.socket.on('error', (err) => {
            console.error("Connection error!");
        });
    }

    sendMessage(message) {
        let arrayM = message.split('').map(x => x.charCodeAt(0));
        console.log("m: ", arrayM);
        let client = this;
        let data = {
            name: this.name,
            message: arrayM,
        };
        client.socket.write(JSON.stringify(data));
    }

    startProtocol(data) {
        let client = this;
    }

    getPrimeNumber(left, right) {
        let prime, isPrimeNumber;
        do {
            prime = getRandomInRange(left, right);
            isPrimeNumber = testMillerRabin(prime, 10);
        } while (!isPrimeNumber);
        return prime;
    }
}
module.exports = Client;