/* 
Keystroke Dynamics Authentication Experiment Server

Purpose:
- Store enrolment training samples
- Simulate network impairment conditions
- Verify login attempts using cosine similarity
- Log experiment results to CSV
*/

/* Required modules */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");


/* Express server configuration */

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* Experiment configuration and in-memory training storage */

const resultsFile = "results.csv";
const THRESHOLDS = [0.80, 0.85, 0.90];

let trainingData = [];

/* Create results file with header row if it does not already exist */

if (!fs.existsSync(resultsFile)) {
    fs.writeFileSync(
        resultsFile,
        "timestamp,condition,attemptType,threshold,similarity,accepted\n"
    );
}

/* Serve client-side experiment interface */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* 
Compare two feature vectors using cosine similarity.
*/

function cosineSimilarity(a, b) {
    const length = Math.min(a.length, b.length);

    if (length === 0) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    if (magA === 0 || magB === 0) return 0;

    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function normalise(features) {
    const mean = features.reduce((a, b) => a + b, 0) / features.length;

    const std = Math.sqrt(
        features.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / features.length
    );

    // avoid divide by zero
    return features.map(x => std === 0 ? 0 : (x - mean) / std);
}

/*
Apply simulated network impairment to keystroke features.

Latency: constant additive delay
Jitter: random timing variation
Packet loss: random feature removal
*/


/* 
Store a new enrolment sample submitted by the client.
Each sample is a feature vector representing typing behaviour.
*/

app.post("/train", (req, res) => {
    const features = req.body.features;

    if (!features || !Array.isArray(features)) {
        return res.status(400).json({ error: "No valid features received" });
    }

// Add training vector to user profile

    trainingData.push(features);

    console.log("Training sample stored:", trainingData.length);

    res.json({
        message: "Training sample stored",
        count: trainingData.length
    });
});


/*
Verify a login attempt.

Steps:
1. Receive feature vector from client
2. Compare against stored training samples
3. Use median similarity score
4. Accept or reject using threshold
5. Log result to CSV
*/

app.post("/verify", (req, res) => {
    const testFeatures = req.body.features;
    const condition = req.body.condition || "baseline";
    const attemptType = req.body.attemptType || "unknown";

    if (!testFeatures || !Array.isArray(testFeatures)) {
        return res.status(400).json({ error: "No valid features received" });
    }

    if (trainingData.length === 0) {
        return res.json({
            condition,
            attemptType,
            similarity: 0,
            results: THRESHOLDS.map(threshold => ({
                threshold,
                accepted: false
            }))
        });
    }

   const similarities = trainingData.map(sample => {
    return cosineSimilarity(testFeatures, sample);
});

    similarities.sort((a, b) => a - b);

    const median = similarities[Math.floor(similarities.length / 2)];

    const resultsPerThreshold = THRESHOLDS.map(threshold => {
        return {
            threshold,
            accepted: median >= threshold
        };
    });

    const timestamp = new Date().toISOString();

    resultsPerThreshold.forEach(r => {
        fs.appendFileSync(
            resultsFile,
            `${timestamp},${condition},${attemptType},${r.threshold},${median},${r.accepted}\n`
        );
    });

    console.log({
        condition,
        attemptType,
        similarity: median,
        results: resultsPerThreshold
    });

    res.json({
        condition,
        attemptType,
        similarity: median,
        results: resultsPerThreshold
    });
});

app.get("/reset", (req, res) => {
    trainingData = [];
    console.log("Training data cleared");
    res.json({ message: "Training data cleared" });
});

/* Start web server */

app.listen(3000, () => {
    console.log("Experiment server running at http://localhost:3000");
});