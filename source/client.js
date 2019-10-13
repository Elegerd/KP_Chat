const net = require('net');
const getRandomInRange = require('./algorithm/random_number');
const basicEuclidean = require('./algorithm/algorithm_euclidean_basic');
const extendedEuclidean = require('./algorithm/algorithm_euclidean_extendend');
const modExponentiation = require('./algorithm/exponent_mod');
const testMillerRabin = require('./algorithm/test_miller_rabin');

const Server = require('./server');
let server = null;

class Client {
    constructor(name, port, address) {
        this.name = name || "Guest" + Math.floor(Math.random() * 101);
        this.socket = new net.Socket();
        this.address = address;
        this.port = port;
        this.friends = [];
        this.friendsKeys = [];
        this.p = this.getPrimeNumber(1024, 4096);
        this.q = this.getPrimeNumber(1024, 4096);
        this.n = this.p * this.q;
        this.fi = (this.p - 1) * (this.q - 1);
        let e;
        do {
            e = this.getPrimeNumber(1024, this.fi - 1);
        } while (basicEuclidean(e, this.fi) !== 1);
        this.e = e;
        let d = extendedEuclidean(this.e, this.fi)[0];
        d = d < 0 ? d + this.fi : d;
        this.d = d;
        console.log("p:",this.p, "q:", this.q, "n:", this.n, "fi:", this.fi, "e:", this.e, "d:", this.d);
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

        client.socket.on('data', (data) => {
            let obj = JSON.parse(data);
            if (obj.message) {
                let box = document.getElementById('chat-box');
                let span = document.createElement('div');
                let message = obj.message;



                span.innerHTML = obj.name + " says: " + message + " ";
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
            } else if (obj.event) {
                if (obj.event === "Step_-1" && obj.key !== undefined) {
                    client.friendsKeys.push(obj.key);
                    let box = document.getElementById('chat-friend-name1');
                    box.value = obj.key;
                    box.disabled = true;
                    let data = {
                        name: client.name,
                        friend: client.friends[1],
                        event: "Step_0"
                    };
                    client.socket.write(JSON.stringify(data));
                } else if (obj.event === "Step_0" && obj.key !== undefined) {
                    client.friendsKeys.push(obj.key);
                    let box = document.getElementById('chat-friend-name2');
                    box.value = obj.key;
                    box.disabled = true;
                    let data = {
                        name: client.name,
                        friend: client.friends[0],
                        friend2: client.friends[1],
                        event: "Start"
                    };
                    client.socket.write(JSON.stringify(data))
                } else if (obj.event === "Step_-1" || obj.event === "Step_0") {
                    let data = {
                        name: client.name,
                        friend: obj.name,
                        key: client.d,
                        event: obj.event
                    };
                    client.socket.write(JSON.stringify(data));
                } else if (obj.event === "Start") {
                    client.friends = [];
                    client.friends.push(obj.friend2);
                    console.log("...PROTOCOL START...");
                    console.log("[STEP_1]\n", client.name, "sends", obj.name);
                    let data = {
                        name: client.name,
                        trent: obj.name,
                        friend: client.friends[0],
                        event: "Step_1",
                    };
                    console.log(data);
                    client.socket.write(JSON.stringify(data));
                } else if (obj.event === "Step_1") {
                    console.log("[STEP_2]\n", client.name, "sends", obj.name);
                    console.log(obj);
                }
            }
            console.log(`Client received: ${data}`);
        });

        client.socket.on('close', () => {
            server = new Server(this.port, this.address);
            client.socket.connect(this.port, this.address);
        });

        client.socket.on('error', (err) => {
            console.error("Connection error!");
        });
    }

    // messageDecoding(arrayChar, key, flag) {
    //     let [a, b] = euclidean.extendedEuclidean(this.key_p, this.key_q);
    //     console.log("Encoded message: ", arrayChar);
    //     console.log("p: ", this.key_p, "q: ", this.key_q);
    //     console.log("a: ", a, "b: ", b);
    //     let message = "";
    //     arrayChar.forEach(c => {
    //         console.log("\nc: ", c);
    //         let r = modExponentiation(c, ((this.key_p + 1) / 4), this.key_p);
    //         let s = modExponentiation(c, ((this.key_q + 1) / 4), this.key_q);
    //         console.log("r: ", r, "s: ", s);
    //         let t1 = (a * this.key_p * s) % key;
    //         let t2 = (b * this.key_q * r) % key;
    //         console.log("t1: ", t1, "t2: ", t2);
    //         let x = (t1 + t2) % key;
    //         let y = (t1 - t2) % key;
    //         if (Math.abs(Math.abs(x) - key) < Math.abs(x))
    //             if (x > 0)
    //                 x -= key;
    //             else
    //                 x += key;
    //         if (Math.abs(Math.abs(y) - key) < Math.abs(y))
    //             if (y > 0)
    //                 y -= key;
    //             else
    //                 y += key;
    //         let result = [  x % key,
    //                         -x % key,
    //                         y % key,
    //                         -y % key].find(m => (m >= 0) && (m <= 1280));
    //         if (result === undefined)
    //             result = Math.min(r, s);
    //         console.log("x: ", x % key, "y: ", y % key, "-x: ", -x % key, "-y: ", -y % key);
    //         let m = flag ? String.fromCharCode(result) : result;
    //         console.log("m: ", m);
    //         message += m;
    //     });
    //     return message;
    // }
    //
    // sendMessage(message) {
    //     let arrayM = message.split('').map(x => x.charCodeAt(0));
    //     let arrayC = [];
    //     if (this.session_key !== 0)
    //         arrayC = arrayM.map(m => modExponentiation(m, 2, this.session_key));
    //     else
    //         arrayC = arrayM.map(m => modExponentiation(m, 2, this.public_key));
    //     console.log("m: ", arrayM);
    //     console.log("c: ", arrayC);
    //     let client = this;
    //     let data = {
    //         name: this.name,
    //         message: arrayC,
    //     };
    //     client.socket.write(JSON.stringify(data));
    // }
    //
    // linkUser(data) {
    //     let client = this;
    //     let encryptedData = {
    //         name: client.name,
    //         event: "Step_1",
    //         friend_name: data.friend_name,
    //         key: client.public_key,
    //     };
    //     client.socket.write(JSON.stringify(encryptedData));
    // }

    startProtocol(data) {
        let client = this;
        client.friends = [];
        client.friendsKeys = [];
        client.friends.push(data.friend_name1);
        client.friends.push(data.friend_name2);
        let dataFriend = {
            name : client.name,
            friend: client.friends[0],
            event: "Step_-1",
        };
        client.socket.write(JSON.stringify(dataFriend))
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