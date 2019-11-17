class Game {
    constructor(name) {
        this.name = name;
        this.players = ["PLAYER 1", "PLAYER 2", "PLAYER 3"];
        this.playerReadiness = [false, false, false];
        this.init();
    }

    init() {

    }

    ready(client) {
        let game = this;
        let index = game.players.findIndex(player => player === client.name);
        if (index !== -1) {
            let box = document.getElementById(`player-box-${index + 1}`);
            game.playerReadiness[index] = !game.playerReadiness[index];
            box.style.background = box.style.background === game.playerReadiness[index] ? "#4d384b" : "green";
            let data = {
                name: client.name,
                ready: game.playerReadiness[index],
            };
            client.socket.write(JSON.stringify(data));
        }
    };

    setDefault() {
        let game = this;
        game.players = ["PLAYER 1", "PLAYER 2", "PLAYER 3"];
        game.playerReadiness = [false, false, false];
        for (let i = 0; i < 3; i++) {
            let name = document.getElementById(`player-name-${i + 1}`);
            let box = document.getElementById(`player-box-${i + 1}`);
            box.style.background = "#4d384b";
            name.innerHTML = game.players[i];
            name.style.fontWeight = 'normal';
            name.style.cursor = 'default';
            name.onclick = null;
        }
    }
}
module.exports = Game;