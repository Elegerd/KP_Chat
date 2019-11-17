const getRandomInRange = require('./algorithm/random_number');
const md5 = require('md5');

class Game {
    constructor(name) {
        this.name = name;
        this.index = null;
        this.stage = null;
        this.players = ["PLAYER 1", "PLAYER 2", "PLAYER 3"];
        this.playerReadiness = [false, false, false];
        this.hands = [];
    }

    isReady(client) {
        let game = this;
        if (game.playerReadiness.reduce(function(result, current) {
            return result && current
        }, true)) {
            console.log("Players are ready to play!");
            this.stage = "START";
            let name = document.getElementById(`player-name-${game.index + 1}`);
            name.style.cursor = 'pointer';
            name.onclick = null;
            game.index === 0 && game.startGame(client)
        }
    }

    shuffle(arr) {
        let j, temp;
        for(let i = arr.length - 1; i > 0; i--){
            j = Math.floor(Math.random() * (i + 1));
            temp = arr[j];
            arr[j] = arr[i];
            arr[i] = temp;
        }
        return arr;
    }

    startGame(client) {
        let game = this;
        console.log(`[STEP_2] -> ${client.name}`);
        let suit = ['diamonds', 'clubs', 'hearts', 'spades'];
        let value = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        let cards = suit.reduce(function(result, card) {
            let flush = value.map(v => `${card}-${v}`);
            return result.concat(flush);
        }, []);
        console.log("Card deck:", cards);
        let messages = game.shuffle(cards).map(card => {
           return {
               "card": card,
               "hash": md5(card)
           }
        });
        let encoded_message = messages.map(message =>
                client.encryptMessage(JSON.stringify(message), client.e, client.n)
        );
        let data = {
            name: client.name,
            recipient: game.players[1],
            event: "Step_2",
            cards: encoded_message
        };
        console.log(data);
        client.sendMessage(data);
    }

    pickUp(cards, quantity) {
        let game = this;
        for (let i = 0; i < quantity; i++) {
            let random = getRandomInRange(0, cards.length - 1);
            game.hands.push(...cards.splice(random, 1));
        }
        return cards;
    };

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
        game.index = null;
        game.stage = null;
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