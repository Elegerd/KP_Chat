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
        p = this.getPrimeNumber(556, 564);
        do {
            q = this.getPrimeNumber(556, 564);
        } while (q === p);
        if (p < q)
            [p, q] = [q, p];
        this.key_p = p;
        this.key_q = q;
        this.n = this.key_p * this.key_q;
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
            } else if (obj.event) {
                if (obj.event === "Step_2") {
                    console.log(`[STEP_3] -> ${client.name}`);
                    let cards = client.game.pickUp(obj.cards, 5);
                    let encoded_message = client.game.hands.map(message =>
                        message.map(value => modExponentiation(value, client.e, client.n))
                    );
                    let data_1 = {
                        name: client.name,
                        recipient: client.game.players[0],
                        event: "Step_3",
                        cards: encoded_message
                    };
                    console.log(data_1);
                    client.sendMessage(data_1);
                    console.log(`[STEP_4] -> ${client.name}`);
                    let data_2 = {
                        name: client.name,
                        recipient: client.game.players[2],
                        event: "Step_4",
                        cards: cards
                    };
                    console.log(data_2);
                    client.sendMessage(data_2);
                } else if (obj.event === "Step_3") {
                    client.game.Eb = obj.cards;
                } else if (obj.event === "Step_4") {
                    console.log(`[STEP_5] -> ${client.name}`);
                    client.game.cards = client.game.pickUp(obj.cards, 5);
                    let encoded_message = client.game.hands.map(message =>
                        message.map(value => modExponentiation(value, client.e, client.n))
                    );
                    let data = {
                        name: client.name,
                        recipient: client.game.players[0],
                        event: "Step_5",
                        cards: encoded_message
                    };
                    client.sendMessage(data);
                } else if (obj.event === "Step_5") {
                    console.log(`[STEP_6] -> ${client.name}`);
                    client.game.Ec = obj.cards;
                    let decoded_message_Eb = client.game.Eb.map(message =>
                        message.map(value => modExponentiation(value, client.d, client.n))
                    );
                    let decoded_message_Ec = client.game.Ec.map(message =>
                        message.map(value => modExponentiation(value, client.d, client.n))
                    );
                    client.game.Eb = client.game.Ec = null;
                    let data_1 = {
                        name: client.name,
                        recipient: client.game.players[1],
                        event: "Step_6",
                        cards: decoded_message_Eb
                    };
                    console.log(data_1);
                    client.sendMessage(data_1);
                    let data_2 = {
                        name: client.name,
                        recipient: client.game.players[2],
                        event: "Step_6",
                        cards: decoded_message_Ec
                    };
                    console.log(data_2);
                    client.sendMessage(data_2);
                } else if (obj.event === "Step_6") {
                    console.log(`[STEP_7] -> ${client.name}`);
                    let messages = [];
                    let decoded_messages = obj.cards.map(message =>
                        message.map(value => modExponentiation(value, client.d, client.n))
                    );
                    console.log(decoded_messages);
                    decoded_messages.forEach(message => {
                        let result = "";
                        message.forEach(m => {
                            result += String.fromCharCode(m);
                        });
                        messages.push(result);
                    });
                    console.log(messages);
                }
            } else if (obj.state) {
                if (obj.players)
                    for (let i = 0; i < 3; i++) {
                        let name = document.getElementById(`player-name-${i + 1}`);
                        name.innerHTML = client.game.players[i] = obj.players[i] || "PLAYER " + (i + 1);
                        if (client.game.players[i] === client.name) {
                            client.game.index = i;
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
                });
                client.game.stage == null && client.game.isReady(client);
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

    encryptMessage(message, e, n) {
        return message.split('').map(
            m => modExponentiation(m.charCodeAt(0), e, n)
        );
    }

    decryptMessage(message, d, n) {
        let result = "";
        message.forEach(m => {
           result += String.fromCharCode(modExponentiation(m, d, n));
        });
        return result;
    }

    sendMessage(data) {
        let client = this;
        client.socket.write(JSON.stringify(data));
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