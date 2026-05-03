const fs = require("fs");

const FILE = "results.csv";

const CONDITION_ORDER = [
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

function parseCSV(filePath) {
    const text = fs.readFileSync(filePath, "utf8").trim();
    const lines = text.split(/\r?\n/);

    return lines.slice(1).map(line => {
        const [timestamp, condition, attemptType, threshold, similarity, accepted] = line.split(",");

        return {
            timestamp,
            condition,
            attemptType,
            threshold: Number(threshold),
            similarity: Number(similarity),
            accepted: accepted.trim().toLowerCase() === "true"
        };
    });
}

function initialiseCondition(results, condition, threshold) {
    const key = `${condition}__T${threshold}`;

    if (!results[key]) {
        results[key] = {
            condition,
            threshold,
            genuine_total: 0,
            genuine_reject: 0,
            genuine_similarity_sum: 0,
            impostor_total: 0,
            impostor_accept: 0,
            impostor_similarity_sum: 0
        };
    }

    return key;
}

function calculateResults(rows) {
    const live = {};
    const dataset = {};

    for (const row of rows) {
        const isDataset = row.condition.startsWith("dataset_");
        const target = isDataset ? dataset : live;

        const key = initialiseCondition(target, row.condition, row.threshold);

        if (row.attemptType === "genuine") {
            target[key].genuine_total++;
            target[key].genuine_similarity_sum += row.similarity;

            if (!row.accepted) {
                target[key].genuine_reject++;
            }
        }

        if (row.attemptType === "impostor") {
            target[key].impostor_total++;
            target[key].impostor_similarity_sum += row.similarity;

            if (row.accepted) {
                target[key].impostor_accept++;
            }
        }
    }

    return { live, dataset };
}

function getOrderedKeys(results, isDataset = false) {
    const keys = Object.keys(results);

    const thresholds = [...new Set(keys.map(key => results[key].threshold))]
        .sort((a, b) => a - b);

    const conditionOrder = isDataset
        ? CONDITION_ORDER.map(c => `dataset_${c}`)
        : CONDITION_ORDER;

    const ordered = [];

    for (const condition of conditionOrder) {
        for (const threshold of thresholds) {
            const key = `${condition}__T${threshold}`;

            if (keys.includes(key)) {
                ordered.push(key);
            }
        }
    }

    const extra = keys.filter(key => !ordered.includes(key)).sort();

    return ordered.concat(extra);
}

function calculateMetrics(r) {
    const FAR = r.impostor_total === 0 ? 0 : r.impostor_accept / r.impostor_total;
    const FRR = r.genuine_total === 0 ? 0 : r.genuine_reject / r.genuine_total;

    const avgGenuineSimilarity =
        r.genuine_total === 0 ? 0 : r.genuine_similarity_sum / r.genuine_total;

    const avgImpostorSimilarity =
        r.impostor_total === 0 ? 0 : r.impostor_similarity_sum / r.impostor_total;

    return {
        FAR,
        FRR,
        avgGenuineSimilarity,
        avgImpostorSimilarity
    };
}

function printResults(title, results, isDataset = false) {
    console.log(`\n==============================`);
    console.log(title);
    console.log(`==============================`);

    const orderedKeys = getOrderedKeys(results, isDataset);

    for (const key of orderedKeys) {
        const r = results[key];
        const {
            FAR,
            FRR,
            avgGenuineSimilarity,
            avgImpostorSimilarity
        } = calculateMetrics(r);

        console.log(`\nCondition: ${r.condition}`);
        console.log(`Threshold: ${r.threshold}`);
        console.log(`Genuine attempts: ${r.genuine_total}`);
        console.log(`False rejections: ${r.genuine_reject}`);
        console.log(`FRR: ${(FRR * 100).toFixed(2)}%`);
        console.log(`Average genuine similarity: ${(avgGenuineSimilarity * 100).toFixed(2)}%`);

        console.log(`Impostor attempts: ${r.impostor_total}`);
        console.log(`False acceptances: ${r.impostor_accept}`);
        console.log(`FAR: ${(FAR * 100).toFixed(2)}%`);
        console.log(`Average impostor similarity: ${(avgImpostorSimilarity * 100).toFixed(2)}%`);
    }
}

function makeSummaryRows(results, isDataset = false) {
    const rows = [];
    const orderedKeys = getOrderedKeys(results, isDataset);

    for (const key of orderedKeys) {
        const r = results[key];
        const {
            FAR,
            FRR,
            avgGenuineSimilarity,
            avgImpostorSimilarity
        } = calculateMetrics(r);

        rows.push({
            condition: r.condition,
            threshold: r.threshold,
            genuine_total: r.genuine_total,
            false_rejections: r.genuine_reject,
            FRR_percent: (FRR * 100).toFixed(2),
            average_genuine_similarity_percent: (avgGenuineSimilarity * 100).toFixed(2),
            impostor_total: r.impostor_total,
            false_acceptances: r.impostor_accept,
            FAR_percent: (FAR * 100).toFixed(2),
            average_impostor_similarity_percent: (avgImpostorSimilarity * 100).toFixed(2)
        });
    }

    return rows;
}

function writeCSV(filePath, rows) {
    if (rows.length === 0) {
        fs.writeFileSync(filePath, "No data\n");
        return;
    }

    const headers = Object.keys(rows[0]);

    const csv = [
        headers.join(","),
        ...rows.map(row => headers.map(header => row[header]).join(","))
    ].join("\n");

    fs.writeFileSync(filePath, csv);
}

function main() {
    if (!fs.existsSync(FILE)) {
        console.error(`Could not find ${FILE}`);
        return;
    }

    const rows = parseCSV(FILE);
    const { live, dataset } = calculateResults(rows);

    printResults("LIVE EXPERIMENT RESULTS", live, false);
    printResults("DATASET EXPERIMENT RESULTS", dataset, true);

    const liveRows = makeSummaryRows(live, false);
    const datasetRows = makeSummaryRows(dataset, true);

    writeCSV("live_summary_results.csv", liveRows);
    writeCSV("dataset_summary_results.csv", datasetRows);

    console.log("\nSummary files created:");
    console.log("- live_summary_results.csv");
    console.log("- dataset_summary_results.csv");
}

main();