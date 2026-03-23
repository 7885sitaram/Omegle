import { NextResponse } from "next/server";
const { google } = require("googleapis");

const API_KEY = process.env.PERSPECTIVE_API_KEY;
const DISCOVERY_URL = "https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1";

export async function POST(req: Request) {
    try {
        const { message } = await req.json();

        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        // Wrap the discovery call in a promise for Next.js app router 
        return new Promise((resolve) => {
            google.discoverAPI(DISCOVERY_URL).then((client: any) => {
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

                    // Return both score and status consistent with the 'testing' server logic
                    resolve(NextResponse.json({
                        score: score.toFixed(4),
                        status: score > 0.5 ? "Bad" : "Good",
                        // Keep the property names expected by existing evaluateModeration if possible
                        toxicity: score
                    }));
                });
            }).catch((err: any) => {
                console.error("Discovery Error:", err);
                resolve(NextResponse.json({ error: "Discovery failed" }, { status: 500 }));
            });
        });

    } catch (error) {
        console.error("Moderation API Error:", error);
        return NextResponse.json(
            { error: "Moderation failed" },
            { status: 500 }
        );
    }
}
