const basicEuclidean = function(a, b) {
    while (true) {
        a = a % b;
        if (a === 0)
            return b;
        b = b % a;
        if (b === 0)
            return a;
    }
};
module.exports = basicEuclidean;