const Client = require('../client');

let client = null;
function connectServer() {
    const HOST = 'localhost';
    const PORT = 3000;
    const name = document.getElementById("client-name").value;
    client = new Client(name, PORT, HOST);
    let auth = document.getElementById("auth");
    auth.parentNode.removeChild(auth);
    document.getElementById('poker').style.display = "flex"
}

function startProtocol() {
    // const friendName1 = document.getElementById("chat-friend1");
    // const friendName2 = document.getElementById("chat-friend2");
    // if (friendName1.value !== "" && friendName2.value !== "") {
    //     let data = {
    //         friend_name1: friendName1.value,
    //         friend_name2: friendName2.value,
    //     };
    //     client.startProtocol(data);
    // }
}