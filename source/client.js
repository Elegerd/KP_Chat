const net = require('net');
const modExponentiation = require('./algorithm/exponent_mod');
const getRandomInRange = require('./algorithm/random_number');
const basicEuclidean = require('./algorithm/algorithm_euclidean_basic');
const extendedEuclidean = require('./algorithm/algorithm_euclidean_extendend');
const testMillerRabin = require('./algorithm/test_miller_rabin');
const Server = require('./server');
const Game = require('./game');

let server = null;

class Client {
    constructor(name, port, address) {
        this.name = name || "Guest" + Math.floor(Math.random() * 101);
        this.socket = new net.Socket();
        this.address = address;
        this.port = port;

        let p, q;
        do {
            p = this.getPrimeNumber(128, 1024);
        } while (p % 4 !== 3);
        do {
            q = this.getPrimeNumber(128, 1024);
        } while (q % 4 !== 3);
        if (p < q)
            [p, q] = [q, p];
        this.key_p = p;
        this.key_q = q;
        this.n = p * q;
        this.fi = (this.key_p - 1) * (this.key_q - 1);
        let e;
        do {
            e = this.getPrimeNumber(128, this.fi - 1);
        } while (basicEuclidean(e, this.fi) !== 1);
        this.e = e;
        let d = extendedEuclidean(this.e, this.fi)[0];
        d = d < 0 ? d + this.fi : d;
        this.d = d;

        console.log("Public key:", this.e, this.n);
        console.log("Private key:", this.d, this.n);
        this.game = new Game(this.name);
        this.init();
    }

    connect = () => {
        let client = this;
        client.socket.connect(client.port, client.address);
        let data = {
            "name" : this.name,
        };
        client.socket.write(JSON.stringify(data));
        console.log(`Client connected to: [${client.name}] ${client.address} : ${client.port}`);
    };

    reconnect = () => {
        let client = this;
        setTimeout(() => {
            client.connect()
        }, 1000)
    };

    init() {
        let client = this;

        client.socket.connect(client.port, client.address, client.connect);

        client.socket.on('data', (data) => {
            let obj = JSON.parse(data);
            if (obj.message) {
                console.log(obj.message)
            } else if (obj.state) {
                if (obj.players)
                    for (let i = 0; i < 3; i++) {
                        let name = document.getElementById(`player-name-${i + 1}`);
                        name.innerHTML = client.game.players[i] = obj.players[i] || "PLAYER " + (i + 1);
                        if (client.game.players[i] === client.name) {
                            name.style.fontWeight = 'bold';
                            name.style.cursor = 'pointer';
                            name.onclick = () => client.game.ready(client);
                        } else {
                            name.style.fontWeight = 'normal';
                            name.style.cursor = 'default';
                            name.onclick = null;
                        }
                    }
                obj.state.forEach((state, index) => {
                    let box = document.getElementById(`player-box-${index + 1}`);
                    client.game.playerReadiness[index] = state;
                    box.style.background = state ? "green" : "#4d384b";
                })
            }
        });

        client.socket.on('close', () => {
            client.game.setDefault();
            server = new Server(client.port, client.address);
            client.socket.connect(client.port, client.address, client.reconnect);
        });

        client.socket.on('end', () => {
            console.log("Connection ended!");
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