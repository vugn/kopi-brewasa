export const toxicWords = [
  // Indonesian Catch-all / Common
  'anj', 'anjing', 'babi', 'monyet', 'kunyuk', 'bajingan', 'asu', 'bangsat', 'kampret',
  'kontol', 'memek', 'jembut', 'peler', 'pentil', 'pepek', 'puki', 
  'ngentot', 'entot', 'ngewe', 'ewe', 'sange', 'bokep', 'porn', 'porno',
  'tolol', 'goblok', 'bego', 'bodoh', 'idiot', 'cacat', 'autis',
  'jancok', 'cok', 'jancuk',
  'pantek', 'pukimak',
  'tai', 'tahi', 'berak',
  'bunuh', 'mati', 'die', 'kill',
  'kafir', 'sesat',
  'lonte', 'pelacur', 'perek', 'ayam kampus',
  'bencong', 'banci',
  
  // English Common
  'fuck', 'shit', 'ass', 'bitch', 'bastard', 'cunt', 'dick', 'pussy', 'whore', 'slut',
  'cock', 'tit', 'boob', 'nude', 'sex', 'nigger', 'nigga',
  'stupid', 'idiot', 'moron', 'retard'
];

export const containsProfanity = (text: string): boolean => {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  // Check for exact matches or matches surrounded by non-word characters
  // This prevents false positives like "class" containing "ass" or "analisis" containing "anal"
  // But catches "anjing!" or "dasar babi"
  
  return toxicWords.some(word => {
    // Regex logic:
    // \b matches word boundary.
    // However, for Indonesian slang like 'anj' which might be part of 'anjing', we want to be careful.
    // The list above contains root words.
    
    // Simple includes check is too aggressive (e.g. 'analisis' contains 'anal').
    // So we use regex with boundaries.
    
    // Escape special regex chars if any (though our list is simple letters)
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Pattern: 
    // \bWORD\b -> matches " word "
    // But we also want to match if it's mixed with symbols like "f.u.c.k" (advanced) 
    // For now let's stick to standard word boundary overlap.
    
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
    return regex.test(lowerText);
  });
};
