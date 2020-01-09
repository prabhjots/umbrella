import { canvas } from "@thi.ng/hdom-canvas";
import { fit, fitClamped } from "@thi.ng/math";
import {
    fromAtom,
    fromDOMEvent,
    fromRAF,
    merge,
    sidechainPartition,
    sync
} from "@thi.ng/rstream";
import { gestureStream } from "@thi.ng/rstream-gestures";
import { map, mapIndexed } from "@thi.ng/transducers";
import { updateDOM } from "@thi.ng/transducers-hdom";
import { WINDOW_LEN } from "./config";
import { gui, updateGUI } from "./gui";
import { DB } from "./state";

const main = sync<any, any>({
    src: {
        state: fromAtom(DB)
    }
});

const app = () => {
    const _canvas = {
        ...canvas,
        init(canv: HTMLCanvasElement) {
            main.add(
                merge<any, any>({
                    src: [
                        gestureStream(canv, {}).subscribe({
                            next(e) {
                                gui.setMouse(e.pos, e.buttons);
                            }
                        }),
                        fromDOMEvent(window, "resize").subscribe({
                            next() {
                                DB.resetIn("size", [
                                    window.innerWidth,
                                    window.innerHeight
                                ]);
                            }
                        })
                    ]
                })
            );
        }
    };

    return () => {
        const width = window.innerWidth;
        const height = 500;
        const iwidth = width - 10;

        updateGUI(false);
        updateGUI(true);

        return [
            _canvas,
            {
                width,
                height,
                style: { background: gui.theme.globalBg, cursor: gui.cursor },
                ...gui.attribs
            },
            gui,
            // waveform display
            [
                "polyline",
                { stroke: "red" },
                [
                    ...mapIndexed(
                        (i, y) => [
                            fit(i, 0, WINDOW_LEN - 1, 10, iwidth),
                            fitClamped(y, -1, 1, 490, 290)
                        ],
                        DB.value.wave
                    )
                ]
            ]
        ];
    };
};

main.subscribe(sidechainPartition<any, number>(fromRAF())).transform(
    map(app()),
    updateDOM()
);
