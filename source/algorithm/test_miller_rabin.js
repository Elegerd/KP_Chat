const randomInRange = require('./random_number');
const modExponentiation = require('./exponent_mod');

const testMillerRabin  = (n, round) => {
    if (n === 2 || n === 3)
        return true;
    if (n < 2 || n % 2 === 0)
        return false;

    let t = n - 1;
    let s = 0;

    while (t % 2 === 0) {
        t /= 2;
        s += 1;
    }

    for (let i = 0; i < round; i++) {
        // Выберем случайное целое число a в отрезке [2, n − 2]
        let a = 2 + randomInRange(2, n - 1);
        let x = modExponentiation(a, t, n);

        // If x == 1 или x == n − 1, то перейти на следующую итерацию цикла
        if (x === 1 || x === n - 1)
            continue;

        // Повторить s − 1 раз
        for (let r = 1; r < s; r++) {
            // x ← x^2 mod n
            x = modExponentiation(x, 2, n);

            // If x == 1, то вернуть "составное"
            if (x === 1)
                return false;

            // If x == n − 1, то перейти на следующую итерацию внешнего цикла
            if (x === n - 1)
                break;
        }
        // Вернуть "составное"
        if (x !== n - 1)
            return false;
    }
    // Вернуть "вероятно простое"
    return true;
};
module.exports = testMillerRabin;