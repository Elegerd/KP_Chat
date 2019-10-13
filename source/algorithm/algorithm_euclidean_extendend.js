const basicEuclidean = require('./algorithm_euclidean_basic');


const extendedEuclidean = function(a, b) {
    let q, r, x1, x2, y1, y2, x, y, d;
    if (basicEuclidean(a, b) !== 1)
        return -1;
    if (b === 0) {
        d = a;
        x = 1;
        y = 0;
        return -1;
    }
    x2 = 1; x1 = 0; y2 = 0; y1 = 1;
    while (b > 0) {
        q = Math.floor(a / b);
        r = a - (q * b);
        x = x2 - (q * x1);
        y = y2 - (q * y1);
        a = b;
        b = r;
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
    }
    d = a; x = x2; y = y2;
    return [x , y];
};
module.exports = extendedEuclidean;