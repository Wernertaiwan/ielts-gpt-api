const writingRubrics = {
  task1: {
    taskAchievement: {
      name: 'Task Achievement',
      criteria: [
        'Addresses all key features of the visual data',
        'Presents a clear overview of main trends or differences',
        'Supports main features with relevant and accurate data',
        'No irrelevant information included',
      ],
    },
    coherenceCohesion: {
      name: 'Coherence & Cohesion',
      criteria: [
        'Information organized logically with clear progression',
        'Appropriate use of paragraphing',
        'Cohesive devices used accurately and not mechanically',
        'Clear referencing throughout',
      ],
    },
    lexicalResource: {
      name: 'Lexical Resource',
      criteria: [
        'Wide range of vocabulary used with flexibility',
        'Accurate word choice and collocation',
        'Appropriate word forms used',
        'Rare or no spelling errors',
      ],
    },
    grammaticalRangeAccuracy: {
      name: 'Grammatical Range & Accuracy',
      criteria: [
        'Wide range of structures used',
        'Majority of sentences are error-free',
        'Effective complex sentence structures',
        'Accurate punctuation',
      ],
    },
  },
  task2: {
    taskResponse: {
      name: 'Task Response',
      criteria: [
        'All parts of the task addressed',
        'Clear, relevant position maintained throughout',
        'Well-developed main ideas with supporting detail',
        'No irrelevant or repetitive content',
      ],
    },
    coherenceCohesion: {
      name: 'Coherence & Cohesion',
      criteria: [
        'Logical organization with clear progression throughout',
        'Effective introduction, body paragraphs, and conclusion',
        'Cohesive devices used accurately and not over-used',
        'Consistent referencing and substitution',
      ],
    },
    lexicalResource: {
      name: 'Lexical Resource',
      criteria: [
        'Wide range of vocabulary used fluently and flexibly',
        'Sophisticated and precise word choice',
        'Accurate collocations and word forms',
        'Rare or no spelling errors',
      ],
    },
    grammaticalRangeAccuracy: {
      name: 'Grammatical Range & Accuracy',
      criteria: [
        'Wide range of structures used with full flexibility',
        'Frequent error-free sentences',
        'Only very occasional minor errors',
        'Accurate punctuation',
      ],
    },
  },
};

const sentenceRubric = {
  grammarAccuracy: {
    name: 'Grammar Accuracy',
    criteria: [
      'Subject-verb agreement',
      'Correct tense and aspect',
      'Proper article and determiner usage',
      'Correct preposition and word order',
    ],
  },
  vocabularyRange: {
    name: 'Vocabulary Range',
    criteria: [
      'Use of varied, non-repetitive vocabulary',
      'Accurate collocations and word forms',
      'Precise and contextually appropriate word choice',
    ],
  },
  ieltsReadiness: {
    name: 'IELTS Readiness',
    criteria: [
      'Formal and academic register',
      'Avoidance of contractions and informal expressions',
      'Sentence complexity appropriate for academic writing',
      'Clear and precise academic phrasing',
    ],
  },
};

const MIN_SCORE_FOR_MODEL_ANSWER = 4.0;

module.exports = { writingRubrics, sentenceRubric, MIN_SCORE_FOR_MODEL_ANSWER };
