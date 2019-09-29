const modExponentiation = (value, exponent, mod) => {
    value = value % mod;
    let result = 1;
    let x = value;

    while(exponent > 0){
        let leastSignificantBit = exponent % 2;
        exponent = Math.floor(exponent / 2);
        if (leastSignificantBit === 1) {
            result = result * x;
            result = result % mod;
        }
        x = x * x;
        x = x % mod;
    }
    return result;
};
module.exports = modExponentiation;