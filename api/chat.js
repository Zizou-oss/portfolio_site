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

function sanitizeAnswer(text) {
    if (typeof text !== "string") {
        return "";
    }

    return text
        .replace(/[*`_#>-]/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
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
            "Adopte un ton naturel, souple, humain et confiant, comme quelqu'un qui presente un candidat serieux, prometteur et utile a un recruteur exigeant.",
            "Ecris comme dans une vraie conversation. Evite les reponses rigides, robotiques, scolaires ou generiques.",
            "N'utilise jamais de markdown, jamais d'asterisques, jamais de gras, et evite les listes a puces sauf si le visiteur le demande clairement.",
            "Fais ressortir ses points forts avec des mots valorisants et attractifs pour un recruteur, mais reste credible et fidele au contexte. Tu peux mettre en avant sa polyvalence, sa rigueur, sa capacite d'apprentissage, sa dimension full-stack, son orientation solutions et son interet pour l'IA si c'est pertinent.",
            "Le style doit etre fluide, elegant, convaincant et professionnel, avec des mots qui donnent envie de le contacter ou de le recruter.",
            "Quand on te demande ce qu'il sait faire, ne te contente pas d'enumerer les outils: explique aussi ce que cela lui permet de construire, d'ameliorer ou d'apporter a une equipe.",
            "Quand c'est pertinent, valorise son potentiel avec des expressions comme profil solide, polyvalent, serieux, prometteur, capable de concevoir et developper, capable d'apporter de la valeur rapidement, a l'aise sur plusieurs couches d'un projet, oriente resultat, curieux et en progression rapide.",
            "Evite les formules comme 'expert' ou 'maitrise parfaitement' si le contexte ne le prouve pas clairement. Prefere des formulations fortes mais honnetes comme 'profil solide', 'polyvalent', 'capable de', 'oriente resultat', 'a l'aise avec', 'capable de concevoir et developper'.",
            "Varie les formulations pour ne pas repondre toujours de la meme maniere.",
            "Si la question porte sur son profil, ses competences ou sa valeur, cherche a donner une reponse qui puisse rassurer et attirer un recruteur.",
            "Si cela s'y prete naturellement, termine par une ouverture chaleureuse vers un echange, une collaboration ou une prise de contact.",
            "Par defaut, vise une reponse courte a moyenne, entre 3 et 6 phrases, bien fluides et agreables a lire.",
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
                    temperature: 0.7,
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
        const answer = sanitizeAnswer(extractOutputText(payload)) || "Je n'ai pas pu formuler une reponse fiable pour le moment. Tu peux utiliser le formulaire de contact ou WhatsApp pour continuer l'echange.";

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
