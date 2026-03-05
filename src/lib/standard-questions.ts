const TOPICS = [
  "dharma in daily life",
  "nishkama karma (selfless action)",
  "detachment from results",
  "steadiness of mind",
  "the nature of the atman (self)",
  "the temporary body and eternal soul",
  "overcoming fear and anxiety",
  "handling grief and loss",
  "devotion (bhakti)",
  "knowledge (jnana)",
  "disciplined action (karma yoga)",
  "meditation and mind control",
  "the three gunas",
  "sattva, rajas, and tamas in behavior",
  "right decision-making under pressure",
  "leadership and responsibility",
  "ego vs humility",
  "faith and surrender",
  "purpose and meaning",
  "how to live the Gita today",
] as const;

const TEMPLATES = [
  (topic: string) => `What does the Bhagavad Gita teach about ${topic}?`,
  (topic: string) => `How does Krishna explain ${topic} to Arjuna?`,
  (topic: string) =>
    `Which chapter discusses ${topic}, and what is the core message?`,
  (topic: string) =>
    `How can I apply the Gita's teaching on ${topic} in modern life?`,
  (topic: string) =>
    `What common misunderstanding about ${topic} does the Gita clarify?`,
  (topic: string) =>
    `Can you give a practical example of ${topic} according to the Gita?`,
  (topic: string) =>
    `How is ${topic} connected to inner peace in the Bhagavad Gita?`,
  (topic: string) =>
    `What is the difference between worldly and spiritual views of ${topic} in the Gita?`,
  (topic: string) =>
    `What Sanskrit terms are most important for understanding ${topic}?`,
  (topic: string) =>
    `How can beginners start reflecting on ${topic} through the Gita?`,
] as const;

export const STANDARD_QUESTIONS = TOPICS.flatMap((topic) =>
  TEMPLATES.map((template) => template(topic))
);

if (STANDARD_QUESTIONS.length !== 200) {
  throw new Error("STANDARD_QUESTIONS must contain exactly 200 questions.");
}

export function getRandomQuestions(pool: readonly string[], count: number): string[] {
  const uniquePool = Array.from(new Set(pool.filter(Boolean)));
  const total = Math.min(count, uniquePool.length);
  const shuffled = [...uniquePool];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, total);
}
