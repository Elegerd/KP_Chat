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

        this.R = 0;
        this.session_key = 0;
        this.friends = [];
        this.friendsKeys = [];
        console.log("Public key:", this.e, this.n);
        console.log("Private key:", this.d, this.n);
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
                   message += this.session_key !== 0 ? String.fromCharCode(c ^ this.session_key) : String.fromCharCode(c);
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
                if ((obj.event === "Step_0") && obj.key !== undefined) {
                    client.friendsKeys.push(obj.key);
                    let box = document.getElementById('chat-friend' + client.friendsKeys.length);
                    box.value = `${obj.name}: ${JSON.stringify(obj.key)}`;
                    box.disabled = true;
                    let key = {
                        e: client.e,
                        n: client.n
                    };
                    let data;
                    if (client.friendsKeys.length < 2)
                        data = {
                            name: client.name,
                            recipient: client.friends[1],
                            event: "Step_0",
                            public_key: key
                        };
                    else
                        data = {
                            name: client.name,
                            recipient: client.friends[0],
                            event: "Start",
                        };
                    client.socket.write(JSON.stringify(data))
                } else if (obj.event === "Step_0") {
                    let box = document.getElementById('chat-friend2');
                    box.value = `${obj.name}: ${JSON.stringify(obj.public_key)}`;
                    box.disabled = true;
                    client.friends.push(obj.name);
                    client.friendsKeys.push(obj.public_key);
                    let key = {
                        e: client.e,
                        n: client.n
                    };
                    let data = {
                        name: client.name,
                        recipient: obj.name,
                        key: key,
                        event: obj.event
                    };
                    client.socket.write(JSON.stringify(data));
                } else if (obj.event === "Start") {
                    console.log("...PROTOCOL START...");
                    console.log("[STEP_1]\n", client.name, "sends", obj.name);
                    let box = document.getElementById('chat-friend1');
                    if (box.value !== "") {
                        client.friends.push(box.value);
                        box.disabled = true;
                        let data = {
                            name: client.name,
                            recipient: obj.name,
                            friend: client.friends[0],
                            event: "Step_1",
                        };
                        console.log("My name: ", data.name, "Friend name: ", data.friend);
                        client.socket.write(JSON.stringify(data));
                    } else {
                        console.error("You did not specify a friend's name!");
                    }
                } else if (obj.event === "Step_1") {
                    console.log("[STEP_2]\n", client.name, "received from", obj.name);
                    let encrypted = {
                        friend: client.friends[1],
                        key: client.friendsKeys[1],
                    };
                    let M = JSON.stringify(encrypted);
                    let S = M.split('').map(char => modExponentiation(char.charCodeAt(0), client.d, client.n));
                    let data = {
                        name: client.name,
                        recipient: client.friends[0],
                        M: M,
                        S: S,
                        event: "Step_2",
                    };
                    client.socket.write(JSON.stringify(data));
                } else if (obj.event === "Step_2") {
                    console.log("[STEP_3]\n", client.name, "received from", obj.name);
                    let m = obj.S.map(char => String.fromCharCode(
                        modExponentiation(char, client.friendsKeys[0].e, client.friendsKeys[0].n))).join('');
                    let flag = m === obj.M;
                    console.log(m, obj.M);
                    console.info(`Verification of electronic signature: ${flag}`);
                    if (flag) {
                        client.friendsKeys.push(JSON.parse(obj.M).key);
                        document.getElementById('chat-friend1').value += `: ${client.friendsKeys[1].n}`;
                        client.R = getRandomInRange(128, 1024);
                        let R = modExponentiation(client.R, 2, client.friendsKeys[1].n);
                        console.log("R:", client.R, "encoded R:", R);
                        let data = {
                            name: client.name,
                            recipient: client.friends[1],
                            R: {value: R, hash: md5(client.R)},
                            event: "Step_3",
                        };
                        client.socket.write(JSON.stringify(data));
                    } else {
                        console.error("E-subscription is not valid");
                    }
                } else if (obj.event === "Step_3") {
                    console.log("[STEP_4]\n", client.name, "received from", obj.name);
                    client.friends.push(obj.name);
                    let box = document.getElementById('chat-friend1');
                    box.value = client.friends[1];
                    box.disabled = true;
                    client.R = client.messageDecoding([obj.R.value], [obj.R.hash], client.n, false)[0];
                    let R = modExponentiation(client.R, 2, client.friendsKeys[0].n);
                    console.log("R:", client.R, "encoded R:", R);
                    let data = {
                        name: client.name,
                        recipient: client.friends[0],
                        friend: client.friends[1],
                        R: {value: R, hash: md5(client.R)},
                        event: "Step_4"
                    };
                    client.socket.write(JSON.stringify(data));
                } else if (obj.event === "Step_4") {
                    console.log("[STEP_5]\n", client.name, "received from", obj.name);
                    client.R = client.messageDecoding([obj.R.value], [obj.R.hash], client.n, false)[0];
                    console.log("R:", client.R);
                    let M1 = JSON.stringify({key: this.friendsKeys[0]});
                    let S1 = M1.split('').map(char => modExponentiation(char.charCodeAt(0), client.d, client.n));
                    let M2 = JSON.stringify({
                        R: client.R,
                        session_key: getRandomInRange(1024, 4096),
                        A: client.friends[0],
                        B: client.friends[1]
                    });
                    let M2_encoded = M2.split('').map(m => modExponentiation(m.charCodeAt(0), 2, client.friendsKeys[1].n));
                    let S2 = M2.split('').map(char => modExponentiation(char.charCodeAt(0), client.d, client.n));
                    let S2_encoded = S2.map(m => modExponentiation(m, 2, client.friendsKeys[1].n));
                    console.log(M1, M2);
                    console.log(S2);
                    console.log(S2_encoded);
                    let data = {
                        name: client.name,
                        recipient: client.friends[1],
                        M: [M1, {value: M2_encoded, hash: M2.split('').map(e => md5(e.charCodeAt(0)))}],
                        S: [S1, {value: S2_encoded, hash: S2.map(e => md5(e))}],
                        event: "Step_5",
                    };
                    client.socket.write(JSON.stringify(data));
                } else if (obj.event === "Step_5") {
                    console.log("[STEP_6]\n", client.name, "received from", obj.name);
                    let M2_decoded = client.messageDecoding(obj.M[1].value, obj.M[1].hash, client.n, true);
                    let S2_decoded = client.messageDecoding(obj.S[1].value, obj.S[1].hash, client.n, false);
                    let m1 = obj.S[0].map(char => String.fromCharCode(
                        modExponentiation(char, client.friendsKeys[0].e, client.friendsKeys[0].n))).join('');
                    let m2 = S2_decoded.map(char => String.fromCharCode(
                        modExponentiation(char, client.friendsKeys[0].e, client.friendsKeys[0].n))).join('');
                    let flag = m1 === obj.M[0] && m2 === M2_decoded;
                    console.log(m1, obj.M[0]);
                    console.log(m2, M2_decoded);
                    console.info(`Verification of electronic signature: ${flag}`);
                    if (flag) {
                        let M1 = JSON.parse(m1);
                        let M2 = JSON.parse(m2);
                        if (client.R === M2.R) {
                            client.friendsKeys.push(M1.key);
                            document.getElementById('chat-friend1').value += `: ${client.friendsKeys[1].n}`;
                            client.session_key = M2.session_key;
                            let box = document.getElementById('chat-session-key');
                            box.value = client.session_key;
                            box.disabled = true;
                            client.R = getRandomInRange(128, 1024);
                            let M = JSON.stringify({
                                M: M2,
                                R: client.R,
                            });
                            let S = JSON.stringify({
                                S: S2_decoded,
                                R: client.R,
                            });
                            let M_encoded = M.split('').map(m => modExponentiation(m.charCodeAt(0), 2, client.friendsKeys[1].n));
                            let S_encoded = S.split('').map(s => modExponentiation(s.charCodeAt(0), 2, client.friendsKeys[1].n));
                            console.log(M, M_encoded);
                            console.log(S, S_encoded);
                            let data = {
                                name: client.name,
                                recipient: client.friends[1],
                                M: {value: M_encoded, hash: M.split('').map(e => md5(e.charCodeAt(0)))},
                                S: {value: S_encoded, hash: S.split('').map(e => md5(e.charCodeAt(0)))},
                                event: "Step_6",
                            };
                            client.socket.write(JSON.stringify(data));
                        } else {
                            console.error("Random number does not match");
                        }
                    } else {
                        console.error("E-subscription is not valid");
                    }
                } else if (obj.event === "Step_6") {
                    console.log("[STEP_7]\n", client.name, "received from", obj.name);
                    let M_decoded = client.messageDecoding(obj.M.value, obj.M.hash, client.n, true);
                    let S_decoded = client.messageDecoding(obj.S.value, obj.S.hash, client.n, true);
                    let M = JSON.parse(M_decoded);
                    let S = JSON.parse(S_decoded);
                    let m = S.S.map(char => String.fromCharCode(
                        modExponentiation(char, client.friendsKeys[0].e, client.friendsKeys[0].n))).join('');
                    console.log(M_decoded, obj.M.value);
                    console.log(S_decoded, obj.S.value);
                    let flag = m === JSON.stringify(M.M);
                    console.info(`Verification of electronic signature: ${flag}`);
                    console.log(m, JSON.stringify(M.M));
                    if (flag) {
                        if (client.R === M.M.R) {
                            client.R = M.R;
                            client.session_key = M.M.session_key;
                            let box = document.getElementById('chat-session-key');
                            box.value = client.session_key;
                            box.disabled = true;
                            let data = {
                                name: client.name,
                                recipient: client.friends[1],
                                R: client.R ^ client.session_key,
                                event: "Step_7",
                            };
                            client.socket.write(JSON.stringify(data));
                        } else {
                            console.error("Random number does not match");
                        }
                    } else {
                        console.error("E-subscription is not valid");
                    }
                } else if (obj.event === "Step_7") {
                    console.log("[STEP_8]\n", client.name, "received from", obj.name);
                    let R = obj.R ^ client.session_key;
                    if (client.R === R) {
                        console.log("...END OF PROTOCOL...");
                    } else {
                        console.error("Random number does not match");
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

    messageDecoding(encoded_message, hash, key, flag) {
        const getResult = (arr, hash) => {
            let result = arr.find(value => md5(value) === hash);
            let result_array = arr;
            while (result === undefined) {
                result_array = result_array.map(value => value + key);
                result = result_array.find(value => md5(value) === hash);
            }
            return result;
        };
        let [a, b] = extendedEuclidean(this.key_p, this.key_q);
        console.log("Encoded message: ", encoded_message);
        console.log("p: ", this.key_p, "q: ", this.key_q);
        console.log("a: ", a, "b: ", b);
        let message = flag ? "" : [];
        encoded_message.forEach((c, i) => {
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
                x = x > 0 ? x - key : x + key;
            if (Math.abs(Math.abs(y) - key) < Math.abs(y))
                y = y > 0 ? y - key : y + key;
            let result = getResult(
                [  x % key,
                    -x % key,
                    y % key,
                    -y % key
                ], hash[i]
            );
            console.log("x: ", x % key, "y: ", y % key, "-x: ", -x % key, "-y: ", -y % key);
            if (flag) {
                let m = String.fromCharCode(result);
                console.log("m: ", m);
                message += m;
            } else {
                let m = result;
                console.log("m: ", m);
                message.push(m);
            }
        });
        return message;
    }

    startProtocol(data) {
        let client = this;
        client.friends = [];
        client.friendsKeys = [];
        client.friends.push(data.friend_name1);
        client.friends.push(data.friend_name2);
        let key = {
            e: client.e,
            n: client.n
        };
        let dataFriend = {
            name : client.name,
            recipient: client.friends[0],
            event: "Step_0",
            public_key: key
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