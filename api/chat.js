const fs = require("node:fs/promises");
const path = require("node:path");

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

function extractOutputText(payload) {
    const modelContent = extractModelContent(payload);
    if (!modelContent) {
        return "";
    }

    const chunks = [];

    for (const part of modelContent.parts) {
        if (typeof part.text === "string" && part.text.trim()) {
            chunks.push(part.text.trim());
        }
    }

    return chunks.join("\n").trim();
}

function extractModelContent(payload) {
    if (!Array.isArray(payload.candidates)) {
        return "";
    }

    const candidate = payload.candidates.find((item) => item && item.content && Array.isArray(item.content.parts));
    return candidate ? candidate.content : null;
}

function normalizeHistory(history) {
    if (!Array.isArray(history)) {
        return [];
    }

    return history
        .map((item) => {
            if (!item || (item.role !== "model" && item.role !== "user")) {
                return null;
            }

            if (Array.isArray(item.parts) && item.parts.length) {
                return {
                    role: item.role,
                    parts: item.parts
                        .filter((part) => part && typeof part === "object")
                        .map((part) => {
                            const nextPart = {};

                            if (typeof part.text === "string" && part.text.trim()) {
                                nextPart.text = part.text.trim();
                            }
                            if (typeof part.thoughtSignature === "string" && part.thoughtSignature.trim()) {
                                nextPart.thoughtSignature = part.thoughtSignature.trim();
                            }
                            if (part.functionCall && typeof part.functionCall === "object") {
                                nextPart.functionCall = part.functionCall;
                            }
                            if (part.functionResponse && typeof part.functionResponse === "object") {
                                nextPart.functionResponse = part.functionResponse;
                            }

                            return Object.keys(nextPart).length ? nextPart : null;
                        })
                        .filter(Boolean)
                };
            }

            if (typeof item.text === "string" && item.text.trim()) {
                return {
                    role: item.role,
                    parts: [{ text: item.text.trim() }]
                };
            }

            return null;
        })
        .filter((item) => item && item.parts.length)
        .slice(-10);
}

async function getJsonBody(req) {
    if (req.body && typeof req.body === "object") {
        return req.body;
    }

    if (typeof req.body === "string" && req.body.trim()) {
        return JSON.parse(req.body);
    }

    const buffers = [];

    for await (const chunk of req) {
        buffers.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }

    const raw = Buffer.concat(buffers).toString("utf8").trim();
    return raw ? JSON.parse(raw) : {};
}

async function loadProfileContext() {
    const filePath = path.join(process.cwd(), "data", "portfolio-profile.json");
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
}

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed." });
    }

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
            error: "GEMINI_API_KEY is missing on the server."
        });
    }

    try {
        const body = await getJsonBody(req);
        const question = typeof body.question === "string" ? body.question.trim() : "";
        const history = normalizeHistory(body.history);

        if (!question) {
            return res.status(400).json({ error: "Question is required." });
        }

        const profile = await loadProfileContext();
        const instructions = [
            "Tu es l'assistant IA officiel du portfolio d'Abdoul Aziz THIOMBIANO.",
            "Reponds en francais par defaut, sauf si le visiteur ecrit clairement dans une autre langue.",
            "Ta mission est de repondre aux questions sur son profil, ses competences, ses projets, sa formation, sa disponibilite et ses liens de contact.",
            "Base-toi uniquement sur le contexte fourni ci-dessous. Si une information n'est pas presente, dis-le clairement et propose de contacter Abdoul Aziz via les liens du portfolio.",
            "N'invente jamais d'experience, de diplome, de date, de tarif, de lien ou de competence non presente dans le contexte.",
            "Reste chaleureux, professionnel et concis. Vise 3 a 6 phrases maximum.",
            `CONTEXTE PROFIL JSON:\n${JSON.stringify(profile, null, 2)}`
        ].join("\n\n");

        const geminiResponse = await fetch(`${GEMINI_API_BASE_URL}/${DEFAULT_MODEL}:generateContent`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": process.env.GEMINI_API_KEY
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: instructions }]
                },
                contents: [
                    ...history,
                    {
                        role: "user",
                        parts: [{ text: question }]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 320,
                    responseMimeType: "text/plain",
                    thinkingConfig: {
                        thinkingLevel: "low"
                    }
                }
            })
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini error ${geminiResponse.status}: ${errorText}`);
        }

        const payload = await geminiResponse.json();
        const modelContent = extractModelContent(payload);
        const answer = extractOutputText(payload) || "Je n'ai pas pu formuler une reponse fiable pour le moment. Tu peux utiliser le formulaire de contact ou WhatsApp pour continuer l'echange.";

        return res.status(200).json({
            answer,
            parts: modelContent ? modelContent.parts : null,
            model: payload.model || DEFAULT_MODEL
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return res.status(500).json({
            error: "Le chat IA est temporairement indisponible."
        });
    }
};
