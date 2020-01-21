import { TAU } from "@thi.ng/math";
import { StatelessOscillator } from "../api";

/**
 * Higher order oscillator using Discrete Summation Formula:
 *
 * `y(t) = (1-a^2) * sin(2πt) / (1 + a^2 - 2a * cos(b * 2πt))`
 *
 * @remarks
 * `alpha` should be in [0..1) interval, `beta` is used as factor for
 * the base `freq`. The default config for both params is 0.5, 1.0
 * respectively, creating a waveform similar to a bandlimited sawtooth.
 * If both are zero, the result is a pure sine.
 *
 * Note: Higher `alpha` values cause an increasing number (and
 * amplitude) of spikes in the waveform. Therefore, the higher the
 * `alpha`, the lower `amp` should be to avoid excessive out-of-range
 * values.
 *
 * References:
 * - https://www.desmos.com/calculator/klvl9oszfm
 * - https://ccrma.stanford.edu/files/papers/stanm5.pdf
 *
 * @param alpha
 * @param beta
 */
export const dsf = (alpha = 0.5, beta = 1): StatelessOscillator => {
    const aa = alpha * alpha;
    const a2 = 2 * alpha;
    return (phase, freq, amp = 1, dc = 0) => {
        phase *= TAU * freq;
        return (
            amp *
                (((1 - aa) * Math.sin(phase)) /
                    (1 + aa - a2 * Math.cos(beta * phase))) +
            dc
        );
    };
};
