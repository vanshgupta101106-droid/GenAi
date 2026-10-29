const documents = [
    "Employees receive 20 days of paid annual leave.",
    "Employees can work remotely two days per week.",
    "The company provides health insurance to full-time employees.",
    "Employees must submit leave requests to their manager.",
    "The finance department prepares the company's annual budget.",
    "Employee ID EMP-48291 belongs to the Finance department."
];

const query = "EMP-48291 Finance";

console.log("QUERY:");
console.log(query);

console.log("\nDOCUMENTS:");

for (const document of documents) {
    console.log(document);
}

function tokenize(text) {
    return text
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.replace(/[.,]/g, ""));
}

console.log("\nTOKENIZED DOCUMENTS:");

for (const document of documents) {
    console.log(tokenize(document));
}

console.log("\nTOKENIZED QUERY:");
console.log(tokenize(query));

function termFrequency(tokens, term) {
    let count = 0;

    for (const token of tokens) {
        if (token === term) {
            count++;
        }
    }

    return count;
}

const document = tokenize(
    "Employee ID EMP-48291 belongs to the Finance department."
);

console.log("\nTF TEST:");

console.log(
    "TF for emp-48291:",
    termFrequency(document, "emp-48291")
);

console.log(
    "TF for finance:",
    termFrequency(document, "finance")
);

console.log(
    "TF for employee:",
    termFrequency(document, "employee")
);

function tfScore(tf, k1 = 1.2) {
    return (tf * (k1 + 1)) / (tf + k1);
}

console.log("\nTF SATURATION:");

console.log("TF = 0:", tfScore(0));
console.log("TF = 1:", tfScore(1));
console.log("TF = 2:", tfScore(2));
console.log("TF = 5:", tfScore(5));
console.log("TF = 10:", tfScore(10));

function documentFrequency(documents, term) {
    let count = 0;

    for (const document of documents) {
        const tokens = tokenize(document);

        if (tokens.includes(term)) {
            count++;
        }
    }

    return count;
}

console.log("\nDOCUMENT FREQUENCY:");

console.log(
    "DF for emp-48291:",
    documentFrequency(documents, "emp-48291")
);

console.log(
    "DF for finance:",
    documentFrequency(documents, "finance")
);

console.log(
    "DF for employees:",
    documentFrequency(documents, "employees")
);

function inverseDocumentFrequency(documents, term) {
    const N = documents.length;

    const df = documentFrequency(documents, term);

    return Math.log(
        ((N - df + 0.5) / (df + 0.5)) + 1
    );
}

console.log("\nIDF:");

console.log(
    "IDF for emp-48291:",
    inverseDocumentFrequency(documents, "emp-48291")
);

console.log(
    "IDF for finance:",
    inverseDocumentFrequency(documents, "finance")
);

console.log(
    "IDF for employees:",
    inverseDocumentFrequency(documents, "employees")
);

function termScore(document, term) {

    const tokens = tokenize(document);

    const tf = termFrequency(tokens, term);

    const tfComponent = tfScore(tf);

    const idfComponent =
        inverseDocumentFrequency(documents, term);

    return tfComponent * idfComponent;
}

const targetDocument = documents[5];

const scoreEmp = termScore(
    targetDocument,
    "emp-48291"
);

const scoreFinance = termScore(
    targetDocument,
    "finance"
);

console.log("\nTF × IDF:");

console.log(
    "emp-48291 score:",
    scoreEmp
);

console.log(
    "finance score:",
    scoreFinance
);

console.log(
    "Combined score:",
    scoreEmp + scoreFinance
);

function documentLength(document) {
    return tokenize(document).length;
}

function averageDocumentLength(documents) {
    let totalLength = 0;

    for (const document of documents) {
        totalLength += documentLength(document);
    }

    return totalLength / documents.length;
}

console.log("\nDOCUMENT LENGTHS:");

for (const document of documents) {
    console.log(documentLength(document));
}

console.log(
    "\nAVERAGE DOCUMENT LENGTH:",
    averageDocumentLength(documents)
);

function lengthNormalization(document, documents, b = 0.75) {

    const dl = documentLength(document);

    const avgDl = averageDocumentLength(documents);

    return 1 - b + b * (dl / avgDl);
}

console.log("\nLENGTH NORMALIZATION:");

const targetDocument1 = documents[5];

console.log(
    "Document length:",
    documentLength(targetDocument1)
);

console.log(
    "Average length:",
    averageDocumentLength(documents)
);

console.log(
    "Normalization:",
    lengthNormalization(targetDocument1, documents)
);

console.log("\nLENGTH NORMALIZATION TEST:");

const shortDocument = "finance department";

const longDocument = `
The company has many different departments and employees.
The organization manages several business operations every day.
Employees work across different teams and locations.
The finance department prepares the company's annual budget.
The company also maintains financial reports and accounting records.
Employees receive benefits and follow company policies.
The organization reviews budgets every year.
`;

console.log(
    "Short document length:",
    documentLength(shortDocument)
);

console.log(
    "Short normalization:",
    lengthNormalization(
        shortDocument,
        documents
    )
);

console.log(
    "Long document length:",
    documentLength(longDocument)
);

console.log(
    "Long normalization:",
    lengthNormalization(
        longDocument,
        documents
    )
);

function bm25Score(document, query, documents, k1 = 1.2, b = 0.75) {

    const documentTokens = tokenize(document);
    const queryTokens = tokenize(query);

    const dl = documentTokens.length;
    const avgDl = averageDocumentLength(documents);

    let score = 0;

    for (const term of queryTokens) {

        const tf = termFrequency(
            documentTokens,
            term
        );

        const idf = inverseDocumentFrequency(
            documents,
            term
        );

        const denominator =
            tf +
            k1 * (
                1 - b +
                b * (dl / avgDl)
            );

        const termScore =
            idf *
            (
                (tf * (k1 + 1)) /
                denominator
            );

        score += termScore;
    }

    return score;
}

console.log("\nBM25 SCORES:");

const bm25Results = [];

for (const document of documents) {

    const score = bm25Score(
        document,
        query,
        documents
    );

    bm25Results.push({
        document,
        score
    });
}

bm25Results.sort(
    (a, b) => b.score - a.score
);

for (const result of bm25Results) {

    console.log("\nScore:", result.score);
    console.log("Document:", result.document);
}

const vectorRanking = ["D6", "D1", "D5", "D3", "D2"];

const bm25Ranking = ["D6", "D5", "D1", "D2", "D3"];

function calculateRRF(rankings, k = 60) {

    const scores = new Map();

    for (const ranking of rankings) {

        for (let i = 0; i < ranking.length; i++) {

            const documentId = ranking[i];

            const rank = i + 1;

            const score = 1 / (k + rank);

            const currentScore =
                scores.get(documentId) || 0;

            scores.set(
                documentId,
                currentScore + score
            );
        }
    }

    return scores;
}

const rrfScores = calculateRRF([
    vectorRanking,
    bm25Ranking
]);

console.log("\nRRF SCORES:");

for (const [documentId, score] of rrfScores) {
    console.log(
        documentId,
        score
    );
}

