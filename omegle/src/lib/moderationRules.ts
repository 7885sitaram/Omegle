export type ModerationScores = {
    toxicity: number;
    insult: number;
    threat: number;
    hate: number;
    sexual: number;
};

export function evaluateModeration(scores: ModerationScores) {
    if (
        scores.toxicity > 0.7 ||
        scores.sexual > 0.6 ||
        scores.hate > 0.6 ||
        scores.threat > 0.5
    ) {
        return "BLOCK";
    }

    if (scores.insult > 0.5) {
        return "WARNING";
    }

    return "ALLOW";
}
