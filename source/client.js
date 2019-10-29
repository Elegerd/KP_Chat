const net = require('net');
const getRandomInRange = require('./algorithm/random_number');
const testMillerRabin = require('./algorithm/test_miller_rabin');
const Server = require('./server');

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
        this.public_key = p * q;
        this.session_key = 0;
        this.friends = [];
        this.friendsKeys = [];
        this.init();
    }

    init() {
        let client = this;
        client.socket.connect(client.port, client.address, () => {
            let data = {
                "name" : this.name,
            };
            document.getElementById('chat-name').value = client.name;
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
                   message += String.fromCharCode(c);
                });
                span.innerHTML = obj.name + " says: " + message + " ";
                box.appendChild(span);
            } else if (obj.users) {
                let box = document.getElementById('chat-box');
                let span = document.createElement('div');
                let text = "Chat now: ";
                obj.users.forEach(user => {
                    text += "[" + user + "] ";
                });
                span.innerHTML = text;
                box.appendChild(span);
            } else if (obj.event) {
                if ((obj.event === "Step_0" || obj.event === "Step_-1") && obj.key !== undefined) {
                    client.friendsKeys.push(obj.key);
                    let box = document.getElementById('chat-friend' + client.friendsKeys.length);
                    box.value = JSON.stringify(obj.key);
                    box.disabled = true;
                    let data;
                    if (client.friendsKeys.length < 2)
                        data = {
                            name: client.name,
                            friend: client.friends[1],
                            event: "Step_0",
                            public_key: client.public_key
                        };
                    else
                        data = {
                            name: client.name,
                            friend: client.friends[0],
                            event: "Start",
                        };
                    client.socket.write(JSON.stringify(data))
                } else if (obj.event === "Step_0") {
                    let box = document.getElementById('chat-friend1');
                    let box2 = document.getElementById('chat-friend2');
                    box.value = client.public_key;
                    box2.value = obj.public_key;
                    client.friendsKeys.push(obj.public_key);
                    let key = {
                        public_key: client.public_key,
                        private_key: {
                            p: client.key_p,
                            q: client.key_q,
                        }
                    };
                    let data = {
                        name: client.name,
                        friend: obj.name,
                        key: key,
                        event: obj.event
                    };
                    client.socket.write(JSON.stringify(data));
                } else if (obj.event === "Start") {
                    console.log("...PROTOCOL START...");
                    let box = document.getElementById('chat-friend-name');
                    box.disabled = true;
                    box.value = client.friends[0];
                    console.log("[STEP_1]\n", client.name, "sends", obj.name);
                    let data = {
                        name: client.name,
                        trent: obj.name,
                        friend: client.friends[0],
                        event: "Step_1",
                    };
                    console.log("My name: ", data.name, "Friend name: ", data.friend);
                    client.socket.write(JSON.stringify(data));
                } else if (obj.event === "Step_1") {
                    console.log("[STEP_2]\n", client.name, "received from", obj.name);
                    console.log("Alice: ", obj.name, "Bob: ", obj.friend);
                    const encoding = (T, L, K, NAME, key) => {
                        let obj = {
                            T: T, L: L, K: K, NAME: NAME,
                        };
                        return JSON.stringify(obj).split('').map(char => char.charCodeAt(0) ^ key);
                    };
                    let T = client.getTimeStamp();
                    let L = 2000;
                    let K = getRandomInRange(64, 65535);
                    console.log("T: ", T, "L: ", L, "K: ", K);
                    let Ekb = encoding(T, L, K, client.friends[0], client.friendsKeys[1]);
                    let Eka = encoding(T, L, K, client.friends[1], client.friendsKeys[0]);
                    console.log("Ekb = ", Ekb);
                    console.log("Eka = ", Eka);
                    let data = {
                        friend: client.friends[0],
                        Ekb: Ekb,
                        Eka: Eka,
                        event: "Step_2",
                    };
                    client.socket.write(JSON.stringify(data))
                } else if (obj.event === "Step_2") {
                    console.log("[STEP_3]\n", client.name, "received");
                    console.log("Ekb = ", obj.Ekb, "Eka = ", obj.Eka);
                    const encoding = (T, NAME, key) => {
                        let obj = {
                            T: T, NAME: NAME,
                        };
                        return JSON.stringify(obj).split('').map(char => char.charCodeAt(0) ^ key);
                    };
                    let decode_Eka = client.decoding(obj.Eka, client.key);
                    document.getElementById('chat-session-key').value = decode_Eka.K;
                    console.log("decode_Eka = ", decode_Eka);
                    let T = client.getTimeStamp();
                    if (T - decode_Eka.T <= decode_Eka.L) {
                        client.session_key = decode_Eka.K;
                        let Ek = encoding(T, client.name, client.session_key);
                        let data = {
                            friend: client.friends[0],
                            Ekb: obj.Ekb,
                            Ek: Ek,
                            event: "Step_3",
                        };
                        client.socket.write(JSON.stringify(data))
                    } else {
                        console.error("Error, message expired");
                    }
                } else if (obj.event === "Step_3") {
                    console.log("[STEP_4]\n", client.name, "received");
                    console.log("Ekb = ", obj.Ekb, "Ek = ", obj.Ek);
                    const encoding = (T, key) => {
                        let obj = {
                            T: T,
                        };
                        return JSON.stringify(obj).split('').map(char => char.charCodeAt(0) ^ key);
                    };
                    let decode_Ekb = client.decoding(obj.Ekb, client.key);
                    client.friends.push(decode_Ekb.NAME);
                    client.session_key = decode_Ekb.K;
                    document.getElementById('chat-session-key').value = client.session_key;
                    let box = document.getElementById('chat-friend-name2');
                    document.getElementById('chat-friend-name1').disabled = true;
                    box.value = client.friends[0];
                    box.disabled = true;
                    let decode_Ek = client.decoding(obj.Ek, client.session_key);
                    console.log("decode_Ekb = ", decode_Ekb);
                    console.log("decode_Ek = ", decode_Ek);
                    let T = client.getTimeStamp();
                    if (T - decode_Ek.T <= decode_Ekb.L) {
                        let Ek = encoding((T + (1 * 1000)), client.session_key);
                        let data = {
                            friend: client.friends[0],
                            Ek: Ek,
                            event: "Step_4",
                        };
                        client.socket.write(JSON.stringify(data))
                    } else {
                        console.error("Error, message expired");
                    }
                } else if (obj.event === "Step_4") {
                    console.log("[STEP_5]\n", client.name, "received");
                    console.log("Ek = ", obj.Ek);
                    let decode_Ek = client.decoding(obj.Ek, client.session_key);
                    console.log("decode_Ek = ", decode_Ek);
                    let T = client.getTimeStamp();
                    if (T - decode_Ek.T <= 2000) {
                        console.log("...PROTOCOL END...");
                    } else {
                        console.error("Error, message expired");
                    }
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

    sendMessage(message) {
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
    }

    startProtocol(data) {
        let client = this;
        client.friends = [];
        client.friendsKeys = [];
        client.friends.push(data.friend_name1);
        client.friends.push(data.friend_name2);
        let dataFriend = {
            name : client.name,
            friend: client.friends[0],
            event: "Step_0",
            public_key: client.public_key
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