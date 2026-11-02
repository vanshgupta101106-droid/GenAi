const text = `
Employees receive 20 days of paid annual leave.

Employees can work remotely two days per week.

The company provides health insurance to full-time employees.

Employees must submit leave requests to their manager.
`;

const paragraphs = text
    .split("\n\n")
    .filter(paragraph => paragraph.trim() !== "");

console.log(paragraphs);