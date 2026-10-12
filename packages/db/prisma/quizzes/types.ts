export interface QuestionSeed {
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface TopicQuizSeed {
  topicTitle: string;
  description: string;
  questions: QuestionSeed[];
}
