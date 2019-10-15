const net = require('net');
const getRandomInRange = require('./algorithm/random_number');
const extendedEuclidean = require('./algorithm/algorithm_euclidean');
const modExponentiation = require('./algorithm/exponent_mod');
const testMillerRabin = require('./algorithm/test_miller_rabin');

const Server = require('./server');
let server = null;

class Client {
    constructor(name, port, address) {
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
        this.public_key = p * q;
        this.session_key = 0;
        this.encrypted_message = [];
        this.name = name || "Guest" + Math.floor(Math.random() * 101);
        this.socket = new net.Socket();
        this.address = address;
        this.port = port;
        this.R = [0, 0, 0];
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
                if (client.session_key !== 0) {
                    message = client.messageDecoding(message, client.public_key, true);
                }
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
                if (obj.event === "Step_1") {
                    console.log(obj.event);
                    console.log(client.name, "received key", obj.key);
                    client.friend_name = obj.name;
                    client.friend_key = obj.key;
                    const friendKey = document.getElementById("chat-friend-public-key");
                    const friendName = document.getElementById("chat-friend-name");
                    friendKey.value = client.friend_key;
                    friendName.value = client.friend_name;
                    friendName.disable = true;
                    let encryptedData = {
                        name: client.name,
                        event: "Step_2",
                        key: client.public_key,
                        friend_name: client.friend_name,
                    };
                    client.socket.write(JSON.stringify(encryptedData));
                } else if (obj.event === "Step_2") {
                    console.log(obj.event);
                    console.log(client.name, "received key", obj.key);
                    client.friend_name = obj.name;
                    client.friend_key = obj.key;
                    const friendKey = document.getElementById("chat-friend-public-key");
                    const friendName = document.getElementById("chat-friend-name");
                    friendKey.value = client.friend_key;
                    friendName.value = client.friend_name;
                    friendName.disable = true;
                    client.setR();
                    console.log("R: ", client.R[0]);
                    let C = modExponentiation(client.R[1], 2, client.friend_key);
                    let encryptedData = {
                        name: client.name,
                        event: "Step_3",
                        encrypted_message: C,
                        friend_key: client.friend_key,
                        friend_name: client.friend_name,
                    };
                    client.socket.write(JSON.stringify(encryptedData));
                } else if (obj.event === "Step_3") {
                    console.log(obj.event);
                    client.setR();
                    console.log("R: ", client.R[0]);
                    client.encrypted_message = obj.encrypted_message;
                    console.log("encrypted_message", client.encrypted_message);
                    let C = modExponentiation(client.R[1], 2, client.friend_key);
                    console.log("C", C);
                    let encryptedData = {
                        name: client.name,
                        event: "Step_4",
                        encrypted_message: C,
                        friend_key: client.friend_key,
                        friend_name: client.friend_name,
                    };
                    client.socket.write(JSON.stringify(encryptedData));
                } else if (obj.event === "Step_4") {
                    console.log(obj.event);
                    client.encrypted_message = obj.encrypted_message;
                    console.log("encrypted_message", client.encrypted_message);
                    let C = modExponentiation(client.R[2], 2, client.friend_key);
                    console.log("C", C);
                    let encryptedData = {
                        name: client.name,
                        event: "Step_5",
                        encrypted_message: C,
                        friend_key: client.friend_key,
                        friend_name: client.friend_name,
                    };
                    client.socket.write(JSON.stringify(encryptedData));
                } else if (obj.event === "Step_5") {
                    client.encrypted_message = client.messageDecoding([client.encrypted_message], client.public_key, false)
                        * client.messageDecoding([obj.encrypted_message], client.public_key, false);
                    client.session_key = client.encrypted_message ^ client.R[0];
                    document.getElementById("chat-session-key").value = client.session_key;
                    console.log("Decoding result:", client.encrypted_message);
                    console.log("Session key:", client.session_key);
                    let C = modExponentiation(client.R[2], 2, client.friend_key);
                    let encryptedData = {
                        name: client.name,
                        event: "Step_6",
                        encrypted_message: C,
                        friend_key: client.friend_key,
                        friend_name: client.friend_name,
                    };
                    client.socket.write(JSON.stringify(encryptedData));
                } else if (obj.event === "Step_6") {
                    client.encrypted_message = client.messageDecoding([client.encrypted_message], client.public_key, false)
                        * client.messageDecoding([obj.encrypted_message], client.public_key, false);
                    client.session_key = client.R[0] ^ client.encrypted_message;
                    document.getElementById("chat-session-key").value = client.session_key;
                    console.log("Decoding result:", client.encrypted_message);
                    console.log("Session key:", client.session_key);
                }
            }
        });

        client.socket.on('close', () => {
            server = new Server(this.port, this.address);
            client.socket.connect(this.port, this.address);
        });

        client.socket.on('error', (err) => {
            console.error(err);
        });
    }

    messageDecoding(arrayChar, key, flag) {
        let [a, b] = extendedEuclidean(this.key_p, this.key_q);
        console.log("Encoded message: ", arrayChar);
        console.log("p: ", this.key_p, "q: ", this.key_q);
        console.log("a: ", a, "b: ", b);
        let message = "";
        arrayChar.forEach(c => {
            console.log("\nc: ", c);
            let r = modExponentiation(c, ((this.key_p + 1) / 4), this.key_p);
            let s = modExponentiation(c, ((this.key_q + 1) / 4), this.key_q);
            console.log("r: ", r, "s: ", s);
            let t1 = (a * this.key_p * s) % key;
            let t2 = (b * this.key_q * r) % key;
            console.log("t1: ", t1, "t2: ", t2);
            let x = (t1 + t2) % key;
            let y = (t1 - t2) % key;
            if (Math.abs(Math.abs(x) - key) < Math.abs(x))
                if (x > 0)
                    x -= key;
                else
                    x += key;
            if (Math.abs(Math.abs(y) - key) < Math.abs(y))
                if (y > 0)
                    y -= key;
                else
                    y += key;
            let result = [  x % key,
                            -x % key,
                            y % key,
                            -y % key].find(m => (m >= 0) && (m <= 1280));
            if (result === undefined)
                result = s;
            console.log("x: ", x % key, "y: ", y % key, "-x: ", -x % key, "-y: ", -y % key);
            let m = flag ? String.fromCharCode(result) : result;
            console.log("m: ", m);
            message += m;
        });
        return message;
    }

    sendMessage(message) {
        let arrayM = message.split('').map(x => x.charCodeAt(0));
        let arrayC = [];
        if (this.session_key !== 0)
            arrayC = arrayM.map(m => modExponentiation(m, 2, this.session_key));
        else
            arrayC = arrayM.map(m => modExponentiation(m, 2, this.public_key));
        console.log("m: ", arrayM);
        console.log("c: ", arrayC);
        let client = this;
        let data = {
            name: this.name,
            message: arrayC,
        };
        client.socket.write(JSON.stringify(data));
    }

    // linkUser(data) {
    //     let client = this;
    //     client.setR();
    //     client.friend_key = data.friend_key;
    //     client.friend_name = data.friend_name;
    //     let C = modExponentiation(client.R[1], 2, client.friend_key);
    //     let encryptedData = {
    //         name: client.name,
    //         event: "Step_3",
    //         encrypted_message: C,
    //         friend_key: client.friend_key,
    //         friend_name: client.friend_name,
    //     };
    //     client.socket.write(JSON.stringify(encryptedData));
    // }

    linkUser(data) {
        let client = this;
        let encryptedData = {
            name: client.name,
            event: "Step_1",
            friend_name: data.friend_name,
            key: client.public_key,
        };
        client.socket.write(JSON.stringify(encryptedData));
    }

    setR() {
        let client = this;
        client.R[1] = this.getPrimeNumber(128, 1024);
        client.R[2] = this.getPrimeNumber(128, 1024);
        client.R[0] = client.R[1] * client.R[2];
        console.log("R = ", client.R[0]);
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