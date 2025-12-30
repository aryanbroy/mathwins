import { Request, Response } from 'express';
import prisma from '../prisma';
import { generateQuestion } from '../utils/question.utils';
// import gameConfig from "../config/game.config"

type QuestionData = {
  expression: string;
  result: string;
  side: string;
  kthDigit: number;
  correctDigit: number;
  level: number;
};

export const FiftyFifty = async (req: Request, res: Response) => {
  try {
    const { soloSessionId, questionId } = req.body.params;
    console.log("50-50", req.body);
    
    if (!soloSessionId || !questionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: soloSessionId, questionId',
      });
    }
    const session = await prisma.soloSession.findUnique({
      where: { id: soloSessionId },
    });
    if (!session) {
      return res.status(400).json({ success: false });
    }

    const question = await prisma.questionAttempt.findUnique({
      where: { id: questionId },
      select: { correctDigit: true },
    });
    if (!question) {
      return res.status(404).json({ success: false });
    }

    const correctAnswer = question.correctDigit;

    const allOptions = Array.from({ length: 10 }, (_, i) => i);
    const wrongOptions = allOptions.filter(v => v !== correctAnswer);

    // shuffle
    for (let i = wrongOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wrongOptions[i], wrongOptions[j]] = [wrongOptions[j], wrongOptions[i]];
    }
    const disabledOptions = wrongOptions.slice(0, 5);

    // store lifeline in DB
    // await prisma.lifelineUsage.create({
    //   data: {
    //     soloSessionId,
    //     lifelineType: 'fifty_fifty',
    //   },
    // });

    return res.status(200).json({
      success: true,
      disabledOptions
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

export const LevelDown = async (req: Request, res: Response) => {
  try {
    const { soloSessionId, questionId } = req.body.params;
    const userId = req.body.userData.id;
    if (!soloSessionId || !questionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: soloSessionId, questionId',
      });
    }
    const session = await prisma.soloSession.findUnique({
      where: { id: soloSessionId },
      include: {
        questions: {
          orderBy: { questionIndex: 'asc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Session does not belong to this user',
      });
    }
    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: `Cannot use lifeline: Session is ${session.status}`,
      });
    }

    // Verify question exists
    const question = await prisma.questionAttempt.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }
    if (question.soloSessionId !== soloSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Question does not belong to this session',
      });
    }
    // Check if lifeline was already used
    // if (session.usedLevelDown) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Level Down lifeline has already been used',
    //   });
    // }

     const newLevel = Math.max(1, session.currentLevel - 1);

    // Generate new question at lower level
    const newGeneratedQuestion: QuestionData = await generateQuestion(newLevel);

    // Delete the current question (optional - you can keep it as skipped)
    await prisma.questionAttempt.delete({
      where: { id: questionId },
    });

    // Create new question at lower level
    const newQuestion = await prisma.questionAttempt.create({
      data: {
        soloSessionId: soloSessionId,
        questionIndex: session.questionsAnswered + 1,
        level: newGeneratedQuestion.level,
        expression: newGeneratedQuestion.expression,
        result: newGeneratedQuestion.result,
        side: newGeneratedQuestion.side,
        kthDigit: newGeneratedQuestion.kthDigit,
        correctDigit: newGeneratedQuestion.correctDigit,
      },
    });

    // Update session to mark lifeline as used
    await prisma.soloSession.update({
      where: { id: soloSessionId },
      data: {
        // usedLevelDown: true,
        currentLevel: newLevel,
      },
    });

    console.log('New question created at lower level:', newQuestion);

    // Sanitize question for frontend
    const { id, expression, kthDigit, level, side } = newQuestion;
    const sanitizedQuestion = {
      id,
      expression,
      kthDigit,
      level,
      side,
    };

    return res.status(200).json({
      success: true,
      message: `Level decreased from ${session.currentLevel} to ${newLevel}`,
      data: {
        newQuestion: sanitizedQuestion,
        newLevel: newLevel,
        oldLevel: session.currentLevel,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
}
