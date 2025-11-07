// {
//   "leveling": {
//     "digits": { "L1": 3, "L2": 4, "L3": 5, "L4": 6, "L5": 7 },
//     "ops": { "L1": ["+"], "L2": ["+","-"], "L3": ["+","-","×"], "L4":["+","-","×","÷"], "L5": ["+","-","×","÷"] },
//     "terms": { "L1": 2, "L2": 2, "L3": 3, "L4": 3, "L5": 4 },
//     "div_policy": { "integer_only": true, "nonzero_divisor": true },
//     "ask_digit_side_weights": { "front": 0.5, "right": 0.5 },
//     "kth_digit_rules": { "min": 1, "max_from_front_pct": 70,"max_from_right_pct": 70 },
//   }
// }
export interface GeneratedQuestion {
  expression: string;
  result: string;
  side: 'front' | 'right';
  kthDigit: number;
  correctDigit: number;
  level: number;
}
interface LevelingConfig {
  digits: { [key: string]: number };
  ops: { [key: string]: string[] };
  terms: { [key: string]: number };
  div_policy: {
    integer_only: boolean;
    nonzero_divisor: boolean;
  };
  ask_digit_side_weights: {
    front: number;
    right: number;
  };
  kth_digit_rules: {
    min: number;
    max_from_front_pct: number;
    max_from_right_pct: number;
  };
}

const DEFAULT_CONFIG: LevelingConfig = {
  digits: { L1: 3, L2: 4, L3: 5, L4: 6, L5: 7 },
  ops: {
    L1: ['+'],
    L2: ['+', '-'],
    L3: ['+', '-', '×'],
    L4: ['+', '-', '×', '÷'],
    L5: ['+', '-', '×', '÷'],
  },
  terms: { L1: 2, L2: 2, L3: 3, L4: 3, L5: 4 },
  div_policy: {
    integer_only: true,
    nonzero_divisor: true,
  },
  ask_digit_side_weights: {
    front: 0.5,
    right: 0.5,
  },
  kth_digit_rules: {
    min: 1,
    max_from_front_pct: 70,
    max_from_right_pct: 70,
  },
};

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  weighted(weights: { [key: string]: number }): string {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = this.next() * total;
    
    for (const [key, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) return key;
    }
    
    return Object.keys(weights)[0];
  }
}

export const generateQuestion = async (level: number,seed?: number,config: LevelingConfig = DEFAULT_CONFIG): Promise<GeneratedQuestion> => {
  try {
    //select level
    // generate seed
    // get config for selected level

    const clampedLevel = Math.max(1, Math.min(5, level));
    const levelKey = `L${clampedLevel}`;
    const random = new SeededRandom(seed || Date.now());
    const targetDigits = config.digits[levelKey];
    const availableOps = config.ops[levelKey];
    const termCount = config.terms[levelKey];

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const question = generateQuestionAttempt(
          clampedLevel,
          targetDigits,
          availableOps,
          termCount,
          random,
          config
        );
        
        if (question) {
          return question;
        }
      } catch (err) {
        // add util.api.ApiError
        console.warn(`Attempt ${attempts} failed:`, err);
      }
    }
    return generateFallbackQuestion(clampedLevel, random);
    
  } catch (err) {
    console.error('Error generating question:', err);
    throw new Error('Failed to generate question');
  }
};
function generateQuestionAttempt(
  level: number,
  targetDigits: number,
  availableOps: string[],
  termCount: number,
  random: SeededRandom,
  config: LevelingConfig
): GeneratedQuestion | null {

  const operands: number[] = [];
  for (let i = 0; i < termCount; i++) {
    const digits = Math.max(2, targetDigits - 1);
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    operands.push(random.nextInt(min, max));
  }

  const operators: string[] = [];
  for (let i = 0; i < termCount - 1; i++) {
    operators.push(random.choice(availableOps));
  }

  let expression = `${operands[0]}`;
  let result = operands[0];
  for (let i = 0; i < operators.length; i++) {
    const op = operators[i];
    const operand = operands[i + 1];
    
    expression += ` ${op} ${operand}`;
    
    switch (op) {
      case '+':
        result += operand;
        break;
      case '-':
        result -= operand;
        break;
      case '×':
        result *= operand;
        break;
      case '÷':
        if (config.div_policy.nonzero_divisor && operand === 0) {
          return null; 
        }
        if (config.div_policy.integer_only && result % operand !== 0) {
          return null;
        }
        result = Math.floor(result / operand);
        break;
    }
  }
  result = Math.abs(result);
  if (result === 0) {
    return null;
  }
  
  const resultStr = result.toString();
  if (resultStr.length < 1) {
    return null;
  }
  
  const side = random.weighted(config.ask_digit_side_weights) as 'front' | 'right';
  const maxFromFrontDigits = Math.ceil(
    resultStr.length * (config.kth_digit_rules.max_from_front_pct / 100)
  );
  const maxFromRightDigits = Math.ceil(
    resultStr.length * (config.kth_digit_rules.max_from_right_pct / 100)
  );
  
  let kthDigit: number;
  
  if (side === 'front') {
    const maxK = Math.min(maxFromFrontDigits, resultStr.length);
    kthDigit = random.nextInt(
      config.kth_digit_rules.min,
      Math.max(config.kth_digit_rules.min, maxK)
    );
  } else {
    const maxK = Math.min(maxFromRightDigits, resultStr.length);
    kthDigit = random.nextInt(
      config.kth_digit_rules.min,
      Math.max(config.kth_digit_rules.min, maxK)
    );
  }

  let correctDigit: number;
  if (side === 'front') {
    if (kthDigit > resultStr.length) {
      return null; 
    }
    correctDigit = parseInt(resultStr[kthDigit - 1]);
  } else {
    if (kthDigit > resultStr.length) {
      return null;
    }
    correctDigit = parseInt(resultStr[resultStr.length - kthDigit]);
  }
  
  if (isNaN(correctDigit)) {
    return null;
  }
  const id = `q_${Date.now()}_${random.nextInt(1000, 9999)}`;
  
  return {
    expression,
    result: resultStr,
    side,
    kthDigit,
    correctDigit,
    level,
  };
}
function generateFallbackQuestion(
  level: number,
  random: SeededRandom
): GeneratedQuestion {
  // Simple fallback: generate addition of two numbers
  const a = random.nextInt(10, 99);
  const b = random.nextInt(10, 99);
  const result = (a + b).toString();
  const side: 'front' | 'right' = random.nextInt(0, 1) === 0 ? 'front' : 'right';
  const kthDigit = random.nextInt(1, result.length);
  
  let correctDigit: number;
  if (side === 'front') {
    correctDigit = parseInt(result[kthDigit - 1]);
  } else {
    correctDigit = parseInt(result[result.length - kthDigit]);
  }
  
  return {
    expression: `${a} + ${b}`,
    result,
    side,
    kthDigit,
    correctDigit,
    level,
  };
}
export const generateQuestions = async (
  level: number,
  count: number = 1,
  baseSeed?: number
): Promise<GeneratedQuestion[]> => {
  const questions: GeneratedQuestion[] = [];
  const seed = baseSeed || Date.now();
  
  for (let i = 0; i < count; i++) {
    const question = await generateQuestion(level, seed + i * 1000);
    questions.push(question);
  }
  
  return questions;
};
export const validateAnswer = (
  question: GeneratedQuestion,
  userAnswer: number
): boolean => {
  return question.correctDigit === userAnswer;
};
