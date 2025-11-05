-- AlterTable
CREATE SEQUENCE questionattempt_questionindex_seq;
ALTER TABLE "QuestionAttempt" ALTER COLUMN "questionIndex" SET DEFAULT nextval('questionattempt_questionindex_seq');
ALTER SEQUENCE questionattempt_questionindex_seq OWNED BY "QuestionAttempt"."questionIndex";
