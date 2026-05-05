/*
Dataset experiment script

Purpose:
- Load the public keystroke dynamics dataset
- Select one subject as the genuine user
- Use other subjects as impostors
- Apply simulated network impairments
- Send dataset samples to the authentication server
*/


const fs = require("fs");

const DATASET_FILE = "DSL-StrongPasswordData.csv";
const SERVER_URL = "http://localhost:3000";

// Network conditions tested for each dataset sample

const CONDITIONS = [
    "baseline",
    "latency_low",
    "latency_medium",
    "latency_high",
    "jitter_low",
    "jitter_medium",
    "jitter_high",
    "loss_low",
    "loss_medium",
    "loss_high"
];

// Read the dataset CSV file and convert each row into an object

function parseCSV(filePath) {
    const text = fs.readFileSync(filePath, "utf8").trim();
    const lines = text.split(/\r?\n/);
    const headers = lines[0].split(",");

    return lines.slice(1).map(line => {
        const values = line.split(",");
        let row = {};

        headers.forEach((header, index) => {
            row[header] = values[index];
        });

        return row;
    });
}

// Read the dataset CSV file and convert each row into an object

function extractFeatures(row) {
    return Object.keys(row)
        .filter(key => key !== "subject" && key !== "sessionIndex" && key !== "rep")
        .map(key => Number(row[key]));
}

// Apply simulated latency, jitter, or packet loss to dataset feature values

function impairFeatures(features, condition) {
    let latency = 0;
    let jitter = 0;
    let lossRate = 0;

    // Dataset timing values are in seconds.
    if (condition === "latency_low") latency = 0.05;
    else if (condition === "latency_medium") latency = 0.15;
    else if (condition === "latency_high") latency = 0.30;
    else if (condition === "jitter_low") jitter = 0.005;
    else if (condition === "jitter_medium") jitter = 0.020;
    else if (condition === "jitter_high") jitter = 0.050;
    else if (condition === "loss_low") lossRate = 0.01;
    else if (condition === "loss_medium") lossRate = 0.03;
    else if (condition === "loss_high") lossRate = 0.05;

    return features.map(value => {
        if (Math.random() < lossRate) {
            return 0;
        }

        const randomJitter = (Math.random() * 2 - 1) * jitter;
        return value + latency + randomJitter;
    });
}

// Send training or verification data to the local authentication server

async function postJSON(endpoint, data) {
    const response = await fetch(`${SERVER_URL}${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    return response.json();
}

// Clear existing training samples before running the dataset experiment

async function resetServer() {
    await fetch(`${SERVER_URL}/reset`);
}

// Run the full dataset experiment using genuine and impostor samples

async function runDatasetExperiment() {
    const rows = parseCSV(DATASET_FILE);

// Subject s002 is treated as the genuine enrolled user

    const targetSubject = "s002";

    const genuineRows = rows.filter(row => row.subject === targetSubject);
    const impostorRows = rows.filter(row => row.subject !== targetSubject);

    console.log("Total rows:", rows.length);
    console.log("Genuine rows:", genuineRows.length);
    console.log("Impostor rows:", impostorRows.length);

    await resetServer();

    // Use first 50 samples from target subject for enrolment.
    const trainingRows = genuineRows.slice(0, 50);

    for (const row of trainingRows) {
        const features = extractFeatures(row);
        await postJSON("/train", { features });
    }

    console.log("Training complete.");

    // Use next 100 samples from target subject as genuine attempts.
    const genuineTestRows = genuineRows.slice(50, 150);

    for (const row of genuineTestRows) {
        const originalFeatures = extractFeatures(row);

        for (const condition of CONDITIONS) {
            const features = impairFeatures(originalFeatures, condition);

            await postJSON("/verify", {
                features,
                condition: `dataset_${condition}`,
                attemptType: "genuine"
            });
        }
    }

    console.log("Genuine dataset testing complete.");

    // Use 100 samples from other subjects as impostor attempts.
    const impostorTestRows = impostorRows.slice(0, 100);

    for (const row of impostorTestRows) {
        const originalFeatures = extractFeatures(row);

        for (const condition of CONDITIONS) {
            const features = impairFeatures(originalFeatures, condition);

            await postJSON("/verify", {
                features,
                condition: `dataset_${condition}`,
                attemptType: "impostor"
            });
        }
    }

    console.log("Impostor dataset testing complete.");
    console.log("Dataset experiment finished. Check results.csv.");
}

runDatasetExperiment();