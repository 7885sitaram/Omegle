import { NextResponse } from "next/server";
const { google } = require("googleapis");

const API_KEY = process.env.PERSPECTIVE_API_KEY;
const DISCOVERY_URL = "https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1";

export async function POST(req: Request): Promise<NextResponse> {
    try {
        const { message } = await req.json();

        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        try {
            const client = await google.discoverAPI(DISCOVERY_URL);
            
            // We use a promise wrapper here only for the callback-based analyze function
            const result = await new Promise<NextResponse>((resolve) => {
                client.comments.analyze({
                    key: API_KEY,
                    resource: {
                        comment: { text: message },
                        requestedAttributes: { TOXICITY: {} }
                    }
                }, (err: any, response: any) => {
                    if (err) {
                        console.error("API Error:", err);
                        resolve(NextResponse.json({ error: err.message }, { status: 500 }));
                        return;
                    }

                    const score = response.data.attributeScores.TOXICITY.summaryScore.value;

                    resolve(NextResponse.json({
                        score: score.toFixed(4),
                        status: score > 0.5 ? "Bad" : "Good",
                        toxicity: score
                    }));
                });
            });

            return result;

        } catch (err: any) {
            console.error("Discovery Error:", err);
            return NextResponse.json({ error: "Discovery failed" }, { status: 500 });
        }

    } catch (error) {
        console.error("Moderation API Error:", error);
        return NextResponse.json(
            { error: "Moderation failed" },
            { status: 500 }
        );
    }
}
