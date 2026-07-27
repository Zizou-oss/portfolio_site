const fs = require("node:fs/promises");
const path = require("node:path");

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

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
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .replace(/`{1,3}/g, "")
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
        .filter((item) => item && (item.role === "model" || item.role === "user") && typeof item.text === "string" && item.text.trim())
        .map((item) => ({
            role: item.role,
            parts: [{ text: item.text.trim() }]
        }))
        .slice(-6);
}

function writeSseEvent(res, event, payload) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function getDeltaText(previousText, currentText) {
    if (!currentText) {
        return "";
    }

    if (!previousText) {
        return currentText;
    }

    if (currentText.startsWith(previousText)) {
        return currentText.slice(previousText.length);
    }

    return currentText;
}

async function streamGeminiToClient(geminiResponse, res) {
    const reader = geminiResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulatedText = "";
    let emittedText = "";

    const processEventBlock = (block) => {
        if (!block.trim()) {
            return;
        }

        let rawData = "";

        for (const line of block.split("\n")) {
            if (line.startsWith("data:")) {
                rawData += `${line.slice(5).trimStart()}\n`;
            }
        }

        const data = rawData.trim();
        if (!data || data === "[DONE]") {
            return;
        }

        let payload;
        try {
            payload = JSON.parse(data);
        } catch (error) {
            return;
        }

        const nextText = extractOutputText(payload);
        const delta = getDeltaText(accumulatedText, nextText);
        accumulatedText = nextText || accumulatedText;

        if (delta) {
            const cleanDelta = delta
                .replace(/\*\*/g, "")
                .replace(/__/g, "")
                .replace(/`{1,3}/g, "");
            emittedText += cleanDelta;
            writeSseEvent(res, "chunk", { text: cleanDelta });
        }
    };

    while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        buffer = buffer.replace(/\r\n/g, "\n");

        let separatorIndex = buffer.indexOf("\n\n");
        while (separatorIndex !== -1) {
            const eventBlock = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);
            processEventBlock(eventBlock);
            separatorIndex = buffer.indexOf("\n\n");
        }

        if (done) {
            break;
        }
    }

    if (buffer.trim()) {
        processEventBlock(buffer);
    }

    return sanitizeAnswer(emittedText || accumulatedText);
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

function getGenerationConfig(model) {
    const baseConfig = {
        maxOutputTokens: 220,
        responseMimeType: "text/plain"
    };

    if (model.startsWith("gemini-2.5-")) {
        return {
            ...baseConfig,
            thinkingConfig: {
                thinkingBudget: 0
            }
        };
    }

    return {
        ...baseConfig,
        thinkingConfig: {
            thinkingLevel: "minimal"
        }
    };
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
        const wantsStream = body.stream === true;

        if (!question) {
            return res.status(400).json({ error: "Question is required." });
        }

        const profile = await loadProfileContext();
        const instructions = [
            "Tu es l'assistant IA officiel du portfolio d'Abdoul Aziz THIOMBIANO.",
            "Reponds en francais par defaut, sauf si le visiteur parle clairement une autre langue.",
            "Ta mission est de repondre sur son profil, ses competences, ses projets, sa formation, sa disponibilite et ses contacts.",
            "Sois naturel, fluide, convaincant et humain, avec un ton qui valorise un candidat serieux et prometteur pour un recruteur.",
            "Explique la valeur qu'il peut apporter a une equipe ou a un projet, pas seulement la liste des outils.",
            "Reste credible et fidele au contexte. N'invente aucune information absente.",
            "N'utilise jamais de markdown (pas d'asterisques, pas de gras).",
            "Pour structurer tes listes, utilise des tirets simples (-) et saute une ligne apres chaque element.",
            "Aere ton texte en sautant une ligne double (\\n\\n) entre chaque paragraphe. Ne colle jamais des paragraphes ou des listes de texte.",
            "Par defaut, reponds en 2 a 4 phrases courtes, sauf si la question demande plus de detail.",
            `CONTEXTE:${JSON.stringify(profile)}`
        ].join("\n");

        const route = wantsStream ? "streamGenerateContent?alt=sse" : "generateContent";

        const geminiResponse = await fetch(`${GEMINI_API_BASE_URL}/${DEFAULT_MODEL}:${route}`, {
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
                generationConfig: getGenerationConfig(DEFAULT_MODEL)
            })
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini error ${geminiResponse.status}: ${errorText}`);
        }

        if (wantsStream) {
            res.writeHead(200, {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no"
            });
            res.flushHeaders?.();

            const answer = await streamGeminiToClient(geminiResponse, res);
            writeSseEvent(res, "done", { answer });
            return res.end();
        }

        const payload = await geminiResponse.json();
        const modelContent = extractModelContent(payload);
        const answer = sanitizeAnswer(extractOutputText(payload)) || "Je n'ai pas pu formuler une reponse fiable pour le moment. Tu peux utiliser le formulaire de contact ou WhatsApp pour continuer l'echange.";

        return res.status(200).json({
            answer,
            model: payload.model || DEFAULT_MODEL
        });
    } catch (error) {
        console.error("Chat API error:", error);

        if (res.headersSent) {
            writeSseEvent(res, "error", {
                error: "Le chat IA est temporairement indisponible."
            });
            return res.end();
        }

        return res.status(500).json({
            error: "Le chat IA est temporairement indisponible."
        });
    }
};
