const Client = require('../client');

let client = null;
function connectServer() {
    const HOST = 'localhost';
    const PORT = 3000;
    const name = document.getElementById("client-name").value
    client = new Client(name, PORT, HOST)

    let auth = document.getElementById("auth");
    auth.parentNode.removeChild(auth);
    document.getElementById('chat').style.display = "inline"
}

function connect() {

}

function send() {
    const message = document.getElementById("chat-input")
    if (message.value != "") {
        client.sendMessage(message.value)
        message.value = ""
    }
}