export default {
    pipe: (...fns) => (x) => fns.reduce((v, f) => f(v), x),
    lastItem: (array: Array<any>) => {
        return array[array.length - 1];
    },
};
