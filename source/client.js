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
        this.key = getRandomInRange(64, 65535);
        console.log("key: ", this.key);
        this.session_key = 0;
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
                   message += String.fromCharCode(c ^ client.session_key);
                });
                if (client.session_key !== 0) {
                    span.innerHTML = obj.name + " says: " + message + " ";
                    box.appendChild(span);
                }
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
                        key: client.key,
                        event: obj.event
                    };
                    client.socket.write(JSON.stringify(data));
                } else if (obj.event === "Start") {
                    client.friends = [];
                    client.friends.push(obj.friend2);
                    console.log("...PROTOCOL START...");
                    let box = document.getElementById('chat-friend-name1');
                    document.getElementById('chat-friend-name2').disabled = true;
                    box.value = client.friends[0];
                    box.disabled = true;
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
                        return {
                            T: T ^ key,
                            L: L ^ key,
                            K: K ^ key,
                            NAME: NAME.split('').map(char => char.charCodeAt(0) ^ key),
                        }
                    };
                    let T = parseInt(new Date().getTime() / 1000) - parseInt(new Date(2019, 9, 15).getTime() / 1000);
                    let L = 5;
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
                    const decoding = (e, key) => {
                        return {
                            T: e.T ^ key,
                            L: e.L ^ key,
                            K: e.K ^ key,
                            NAME: e.NAME.map(char => String.fromCharCode(char ^ key)).join(''),
                        }
                    };
                    let decode_Eka = decoding(obj.Eka, client.key);
                    document.getElementById('chat-session-key').value = decode_Eka.K;
                    console.log("decode_Eka = ", decode_Eka);
                    let T = parseInt(new Date().getTime() / 1000) - parseInt(new Date(2019, 9, 15).getTime() / 1000);
                    if (T - decode_Eka.T <= decode_Eka.L) {
                        client.session_key = decode_Eka.K;
                        let Ek = {
                            NAME: client.name.split('').map(char => char.charCodeAt(0) ^ client.session_key),
                            T: T ^ client.session_key,
                        };
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
                    const decoding = (e, key) => {
                        return {
                            T: e.T ^ key,
                            L: e.L ^ key,
                            K: e.K ^ key,
                            NAME: e.NAME.map(char => String.fromCharCode(char ^ key)).join(''),
                        }
                    };
                    let decode_Ekb = decoding(obj.Ekb, client.key);
                    client.friends.push(decode_Ekb.NAME);
                    client.session_key = decode_Ekb.K;
                    document.getElementById('chat-session-key').value = client.session_key;
                    let box = document.getElementById('chat-friend-name2');
                    document.getElementById('chat-friend-name1').disabled = true;
                    box.value = client.friends[0];
                    box.disabled = true;
                    let decode_Ek = {
                        NAME: obj.Ek.NAME.map(char => String.fromCharCode(char ^ client.session_key)).join(''),
                        T: obj.Ek.T ^ client.session_key
                    };
                    console.log("decode_Ekb = ", decode_Ekb);
                    console.log("decode_Ek = ", decode_Ek);
                    let T = parseInt(new Date().getTime() / 1000) - parseInt(new Date(2019, 9, 15).getTime() / 1000);
                    if (T - decode_Ek.T <= decode_Ekb.L) {
                        let Ek = {
                            T: (T + 1) ^ client.session_key,
                        };
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
                    let decode_Ek = {
                        T: obj.Ek.T ^ client.session_key
                    };
                    console.log("decode_Ek = ", decode_Ek);
                    let T = parseInt(new Date().getTime() / 1000) - parseInt(new Date(2019, 9, 15).getTime() / 1000);
                    if (T - decode_Ek.T <= 5) {
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