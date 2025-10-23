export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const koreanCharsPerMinute = 500;

  // Remove markdown syntax
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`[^`]+`/g, '') // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/[#*_~]/g, ''); // markdown symbols

  // Count Korean characters
  const koreanChars = (plainText.match(/[\u3131-\uD79D]/g) || []).length;

  // Count English words
  const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length;

  const koreanTime = koreanChars / koreanCharsPerMinute;
  const englishTime = englishWords / wordsPerMinute;

  return Math.ceil(koreanTime + englishTime);
}
