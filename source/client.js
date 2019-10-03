const net = require('net');
const getRandomInRange = require('./algorithm/random_number');
const extendedEuclidean = require('./algorithm/algorithm_euclidean');
const modExponentiation = require('./algorithm/exponent_mod');
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
        if (p < q)
            [p, q] = [q, p];
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
            } else if (obj.users) {
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
        let arrayM = message.split('').map(x => x.charCodeAt(0));
        let arrayC = arrayM.map(m => modExponentiation(m, 2, this.public_key));
        console.log("m: ", arrayM);
        console.log("c: ", arrayC);
        console.log("PUBLIC: ", this.public_key);
        console.log("p: ", this.key_p, "q: ", this.key_q);
        let [a, b] = extendedEuclidean(this.key_p, this.key_q);
        console.log("a: ", a, "b: ", b);
        let r = modExponentiation(arrayC[0], Math.floor((this.key_p + 1) / 4), this.key_p);
        let s = modExponentiation(arrayC[0], Math.floor((this.key_q + 1) / 4), this.key_q);
        console.log("r: ", r, "s: ", s);
        let t1 = Math.floor(a * this.key_p * s) % this.public_key;
        let t2 = Math.floor(b * this.key_q * r) % this.public_key;
        console.log("t1: ", t1, "t2: ", t2);
        let x = (t1 + t2) % this.public_key;
        let y = (t1 - t2) % this.public_key;
        if (Math.abs(Math.abs(x) - this.public_key) < Math.abs(x))
            if (x > 0)
                x -= this.public_key;
            else
                x +=  this.public_key;
        if (Math.abs(Math.abs(y) - this.public_key) < Math.abs(y))
            if (y > 0)
                y -=  this.public_key;
            else
                y += this.public_key;
        console.log("x: ", x % this.public_key, "y: ", y % this.public_key, "-x: ", -x % this.public_key, "-y: ", -y % this.public_key);
        let client = this;
        let data = {
            "name" : this.name,
            "message": arrayC,
        };
        client.socket.write(JSON.stringify(data));
    }

    getPrimeNumber() {
        let prime, isPrimeNumber;
        do {
            prime = getRandomInRange(16, 128);
            isPrimeNumber = testMillerRabin(prime, 10);
        } while (!isPrimeNumber);
        return prime;
    }
}
module.exports = Client;