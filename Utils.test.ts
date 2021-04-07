import test from "ava";
import Utils from "./Utils";

test("lastItem", (t) => {
    t.is(Utils.lastItem(["a", "b"]), "b");
    t.is(Utils.lastItem([]), undefined);
});

test("pipe", (t) => {
    t.is(
        Utils.pipe(
            (a) => a + 1,
            (b) => b * 2
        )(1),
        4
    );
});
