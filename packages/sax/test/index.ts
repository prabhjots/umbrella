import { DEFAULT, defmulti } from "@thi.ng/defmulti";
import * as tx from "@thi.ng/transducers";
import * as assert from "assert";
import { parse, ParseElement, Type } from "../src/index";

const svg = `
<?xml version="1.0"?>
<svg version="1.1" height="300" width="300" xmlns="http://www.w3.org/2000/svg">
    <g fill="yellow">
        <circle cx="50.00" cy="150.00" r="50.00" />
        <circle cx="250.00" cy="150.00" r="50.00" />
        <circle cx="150.00" cy="150.00" fill="rgba(0,255,255,0.25)" r="100.00" stroke="#ff0000" />
        <rect x="80" y="80" width="140" height="140" fill="none" stroke="black" />
    </g>
    <g fill="none" stroke="black">
        <circle cx="150.00" cy="150.00" r="50.00" />
        <circle cx="150.00" cy="150.00" r="25.00" />
    </g>
</svg>`;

describe("sax", () => {
    it("svg parse", () => {
        assert.deepEqual(
            [
                ...tx.iterator(
                    tx.comp(
                        parse({ children: true }),
                        tx.matchFirst(
                            (e) => e.type == Type.ELEM_END && e.tag == "g"
                        ),
                        tx.mapcat((e) => e.children),
                        tx.filter((e) => e.tag == "circle"),
                        tx.map((e) => [
                            e.tag,
                            {
                                ...e.attribs,
                                cx: parseFloat(e.attribs.cx),
                                cy: parseFloat(e.attribs.cy),
                                r: parseFloat(e.attribs.r),
                            },
                        ])
                    ),
                    svg
                ),
            ],
            [
                ["circle", { cx: 50, cy: 150, r: 50 }],
                ["circle", { cx: 250, cy: 150, r: 50 }],
                [
                    "circle",
                    {
                        cx: 150,
                        cy: 150,
                        fill: "rgba(0,255,255,0.25)",
                        r: 100,
                        stroke: "#ff0000",
                    },
                ],
            ]
        );
    });

    it("svg parse (defmulti)", () => {
        const numericAttribs = (e: ParseElement, ...ids: string[]) =>
            ids.reduce(
                (acc, id) => ((acc[id] = parseFloat(e.attribs[id])), acc),
                <any>{ ...e.attribs }
            );

        const parsedChildren = (e: ParseElement) =>
            tx.iterator(
                tx.comp(
                    tx.map(parseElement),
                    tx.filter((e: any) => !!e)
                ),
                e.children
            );

        // define multiple dispatch function, based on element tag name
        const parseElement = defmulti<ParseElement, any>((e) => e.tag);

        // implementations
        parseElement.add("circle", (e) => [
            e.tag,
            numericAttribs(e, "cx", "cy", "r"),
        ]);

        parseElement.add("rect", (e) => [
            e.tag,
            numericAttribs(e, "x", "y", "width", "height"),
        ]);

        parseElement.add("g", (e) => [e.tag, e.attribs, ...parsedChildren(e)]);

        parseElement.add("svg", (e) => [
            e.tag,
            numericAttribs(e, "width", "height"),
            ...parsedChildren(e),
        ]);

        // implementation for unhandled elements (just return undefined)
        parseElement.add(DEFAULT, () => undefined);

        assert.deepEqual(
            parseElement(<ParseElement>tx.transduce(parse(), tx.last(), svg)),
            [
                "svg",
                {
                    version: "1.1",
                    height: 300,
                    width: 300,
                    xmlns: "http://www.w3.org/2000/svg",
                },
                [
                    "g",
                    { fill: "yellow" },
                    ["circle", { cx: 50, cy: 150, r: 50 }],
                    ["circle", { cx: 250, cy: 150, r: 50 }],
                    [
                        "circle",
                        {
                            cx: 150,
                            cy: 150,
                            fill: "rgba(0,255,255,0.25)",
                            r: 100,
                            stroke: "#ff0000",
                        },
                    ],
                    [
                        "rect",
                        {
                            x: 80,
                            y: 80,
                            width: 140,
                            height: 140,
                            fill: "none",
                            stroke: "black",
                        },
                    ],
                ],
                [
                    "g",
                    { fill: "none", stroke: "black" },
                    ["circle", { cx: 150, cy: 150, r: 50 }],
                    ["circle", { cx: 150, cy: 150, r: 25 }],
                ],
            ]
        );
    });

    it("errors", () => {
        assert.deepEqual(
            [...parse("a")],
            [{ type: 7, body: "unexpected char: 'a' @ pos 1" }]
        );
        assert.deepEqual(
            [...parse("<a><b></c></a>")],
            [
                { type: 4, tag: "a", attribs: {} },
                { type: 4, tag: "b", attribs: {} },
                { type: 7, body: "unmatched tag: 'c' @ pos 7" },
            ]
        );
    });

    it("boolean attribs", () => {
        assert.deepEqual(
            [...parse({ boolean: true }, `<foo a b="2" c></foo>`)],
            [
                { type: 4, tag: "foo", attribs: { a: true, b: "2", c: true } },
                {
                    type: 5,
                    tag: "foo",
                    attribs: { a: true, b: "2", c: true },
                    children: [],
                },
            ],
            "no slash"
        );
        assert.deepEqual(
            [...parse({ boolean: true }, `<foo a b="2" c/>`)],
            [
                { type: 4, tag: "foo", attribs: { a: true, b: "2", c: true } },
                { type: 5, tag: "foo", attribs: { a: true, b: "2", c: true } },
            ],
            "with slash"
        );
    });
});
