const Client = require('../client');

let client = null;
function connectServer() {
    const HOST = 'localhost';
    const PORT = 3000;
    const name = document.getElementById("client-name").value;
    client = new Client(name, PORT, HOST);
    let auth = document.getElementById("auth");
    auth.parentNode.removeChild(auth);
    document.getElementById('chat').style.display = "inline"
}

function userLinking() {
    const friendKey = document.getElementById("chat-friend-public-key");
    const friendName = document.getElementById("chat-friend-name");
    if (friendKey.value !== "" && friendName.value !== "") {
        let data = {
            friend_key: friendKey.value,
            friend_name: friendName.value,
        };
        client.linkUser(data);
        friendKey.value = "";
        friendName.value = "";
    }
}

function send() {
    const message = document.getElementById("chat-input");
    if (message.value !== "") {
        client.sendMessage(message.value);
        message.value = ""
    }
}