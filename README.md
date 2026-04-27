# How do network impairments affect the false rejection rate and false acceptance rate of a keystroke dynamics authentication system?
## Undergraduate Dissertation Project



## Project Overview

This project investigates how network impairment affects the reliability of a keystroke dynamics authentication system.

Keystroke dynamics is a behavioural biometric that identifies users based on how they type, using timing features such as:

- Hold time (key press duration)
- Flight time (time between keystrokes)

The system evaluates authentication performance using:

- **FRR (False Rejection Rate)** – genuine users incorrectly rejected
- **FAR (False Acceptance Rate)** – impostor users incorrectly accepted

---

## Research Aim

To evaluate whether simulated network conditions such as latency, jitter and packet loss reduce the reliability of keystroke dynamics authentication.

---

## Technologies Used

- Node.js
- Express.js
- HTML
- JavaScript
- CSV logging for experiment results

---



## Project Structure

```text
keystroke-server/
├── server.js
├── index.html
├── package.json
├── package-lock.json
```

## Installation

Open a terminal inside the keystroke-server folder and run:

`npm install`

## Running the project

Start the server: 

`node server.js`

Then open a browser and visit: 

`http://localhost:3000`

## How to use

### 1. Training Phase

Type the required phrase multiple times to create training samples.
Collect at least **5** training samples

### 2. Verification Phase

Select:

- Network condition
- Attempt type (Genuine or Impostor)

Then type the phrase and submit a login attempt.

## Network Conditions Tested

### Baseline

No impairment applied.

### Latency

Constant timing delay added to features:

- Low = 50 ms
- Medium = 150 ms
- High = 300 ms

### Jitter

Random timing variation added to features:

- Low = ±5 ms
- Medium = ±20 ms
- High = ±50 ms

### Packet Loss

Random removal of timing features:

- Low = 1%
- Medium = 3%
- High = 5%

## Authentication Method

The system extracts timing features from keyboard events and compares login attempts against stored training samples using cosine similarity.

Threshold: **0.80**

Decision rule:

- Similarity ≥ 0.80 = ACCEPT
- Similarity < 0.80 = REJECT

## Output Data

Results are stored in CSV format containing:

- Timestamp
- Network condition
- Attempt type
- Similarity score
- Threshold
- Authentication decision

These results can be used to calculate:

- False Rejection Rate (FRR)
- False Acceptance Rate (FAR)

## Academic note

This project uses feature-level impairment simulation rather than packet-level network emulation. This provides a controlled and repeatable approximation of how degraded network conditions may affect timing-based authentication systems.

## Future Improvements

- Real Mininet network emulation
- Larger participant dataset
- Additional machine learning classifiers
- Multi-user authentication profiles
- Equal Error Rate (EER) analysis
