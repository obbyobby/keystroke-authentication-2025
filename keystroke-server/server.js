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
const THRESHOLD = 0.80;

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
            threshold: THRESHOLD,
            accepted: false
        });
    }


    // Compare received login feature vector against all stored training samples

const similarities = trainingData.map(sample => {
    return cosineSimilarity(testFeatures, sample);
});

// Compare login sample against all stored training samples

    similarities.sort((a, b) => a - b);

// Use median similarity to reduce effect of outliers

    const median = similarities[Math.floor(similarities.length / 2)];

// Authentication decision

    const accepted = median >= THRESHOLD;

    const timestamp = new Date().toISOString();

// Save experiment result for later analysis

    fs.appendFileSync(
        resultsFile,
        `${timestamp},${condition},${attemptType},${THRESHOLD},${median},${accepted}\n`
    );

    console.log({
        condition,
        attemptType,
        similarity: median,
        accepted
    });

    res.json({
        condition,
        attemptType,
        similarity: median,
        threshold: THRESHOLD,
        accepted
    });
});

/* Clear all stored training samples */

app.get("/reset", (req, res) => {
    trainingData = [];
    console.log("Training data cleared");
    res.json({ message: "Training data cleared" });
});

/* Start web server */

app.listen(3000, () => {
    console.log("Experiment server running at http://localhost:3000");
});