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
                let message = "";
                obj.message.forEach(c => {
                    message += client.session_key !== 0 ? String.fromCharCode(c ^ client.session_key) : String.fromCharCode(c);
                });
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
                    console.log("[STEP_2]\n", client.name, "received from", obj.name);
                    client.friend_name = obj.name;
                    client.friend_key = obj.key;
                    const friendKey = document.getElementById("chat-friend-public-key");
                    const friendName = document.getElementById("chat-friend-name");
                    friendKey.value = client.friend_key;
                    friendName.value = client.friend_name;
                    friendName.disabled = true;
                    let encryptedData = {
                        name: client.name,
                        event: "Step_2",
                        key: client.public_key,
                        friend_name: client.friend_name,
                    };
                    client.socket.write(JSON.stringify(encryptedData));
                } else if (obj.event === "Step_2") {
                    console.log("[STEP_3]\n", client.name, "received from", obj.name);
                    client.friend_name = obj.name;
                    client.friend_key = obj.key;
                    const friendKey = document.getElementById("chat-friend-public-key");
                    const friendName = document.getElementById("chat-friend-name");
                    friendKey.value = client.friend_key;
                    friendName.value = client.friend_name;
                    friendName.disabled = true;
                    client.setR();
                    console.log("R1: ", client.R[2][0]);
                    let encryptedData = {
                        name: client.name,
                        event: "Step_3",
                        encrypted_message: client.R[2][0],
                        friend_key: client.friend_key,
                        friend_name: client.friend_name,
                    };
                    client.socket.write(JSON.stringify(encryptedData));
                } else if (obj.event === "Step_3") {
                    console.log("[STEP_4]\n", client.name, "received from", obj.name);
                    client.setR();
                    console.log("R1: ", client.R[2][0]);
                    client.encrypted_message = obj.encrypted_message;
                    console.log("encrypted_message", client.encrypted_message);
                    let encryptedData = {
                        name: client.name,
                        event: "Step_4",
                        encrypted_message: client.R[2][0],
                        friend_key: client.friend_key,
                        friend_name: client.friend_name,
                    };
                    client.socket.write(JSON.stringify(encryptedData));
                } else if (obj.event === "Step_4") {
                    console.log("[STEP_5]\n", client.name, "received from", obj.name);
                    client.encrypted_message = obj.encrypted_message;
                    console.log("encrypted_message", client.encrypted_message);
                    console.log("R2: ", client.R[2][1]);
                    let encryptedData = {
                        name: client.name,
                        event: "Step_5",
                        encrypted_message: client.R[2][1],
                        friend_key: client.friend_key,
                        friend_name: client.friend_name,
                    };
                    client.socket.write(JSON.stringify(encryptedData));
                } else if (obj.event === "Step_5") {
                    console.log("[STEP_6]\n", client.name, "received from", obj.name);
                    client.encrypted_message = parseInt(client.encrypted_message + obj.encrypted_message, 2);
                    client.encrypted_message = client.messageDecoding([client.encrypted_message], client.public_key, false);
                    client.session_key = client.encrypted_message ^ client.R[0];
                    document.getElementById("chat-session-key").value = client.session_key;
                    console.log("R2: ", client.R[2][1]);
                    console.log("Decoding result:", client.encrypted_message);
                    console.log("Session key:", client.session_key);
                    let encryptedData = {
                        name: client.name,
                        event: "Step_6",
                        encrypted_message: client.R[2][1],
                        friend_key: client.friend_key,
                        friend_name: client.friend_name,
                    };
                    client.socket.write(JSON.stringify(encryptedData));
                } else if (obj.event === "Step_6") {
                    console.log("[STEP_7]\n", client.name, "received from", obj.name);
                    client.encrypted_message = parseInt(client.encrypted_message + obj.encrypted_message, 2);
                    client.encrypted_message = client.messageDecoding([client.encrypted_message], client.public_key, false);
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
            console.error("Connection error!");
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
            console.log("x: ", x % key, "y: ", y % key, "-x: ", -x % key, "-y: ", -y % key);
            let m = flag ? String.fromCharCode(result) : result;
            console.log("m: ", m);
            message += m;
        });
        return message;
    }

    sendMessage(message) {
        if (this.session_key !== 0) {
            let arrayM = message.split('').map(x => x.charCodeAt(0));
            let arrayC = arrayM.map(m => m ^ this.session_key);
            console.log("m: ", arrayM);
            console.log("c: ", arrayC);
            let client = this;
            let data = {
                name: this.name,
                message: arrayC,
            };
            client.socket.write(JSON.stringify(data));
        } else {
            console.error("To send messages, set a session key!")
        }
    }

    startProtocol(data) {
        let client = this;
        console.log("...PROTOCOL START...");
        console.log("[STEP_1]");
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
        client.R[0] = getRandomInRange(128, 1024);
        client.R[1] = (modExponentiation(client.R[0], 2, client.friend_key)).toString(2);
        client.R[2] = [client.R[1].substring(0, client.R[1].length/2|0), client.R[1].substring(client.R[1].length/2|0)];
        console.log("R =", client.R[0], "R[1] =", client.R[1], "R[2] =", client.R[2]);
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